import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DashboardLayout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Check, Loader2, Zap, PenLine, CheckCircle2, Plus, X, Plane, TrainFront, Car, Bus, Ship } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { HotelSearchPanel } from "@/components/hotel/HotelSearchPanel";
import { FlightSearchPanel } from "@/components/flight/FlightSearchPanel";

// Step 1: Client Details
const clientDetailsSchema = z.object({
  clientName: z.string().min(1, "Client name is required"),
  address: z.string().min(1, "Address is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  hasVipGuests: z.boolean().default(false),
  hasFriends: z.boolean().default(false),
  hasFamily: z.boolean().default(false),
});

// Step 2: Hotel Booking
const hotelBookingSchema = z.object({
  hotelName: z.string().min(1, "Hotel name is required"),
  checkInDate: z.string().min(1, "Check-in date is required"),
  checkOutDate: z.string().min(1, "Check-out date is required"),
  numberOfRooms: z.number().min(1, "At least 1 room is required"),
});

type ClientDetailsFormValues = z.infer<typeof clientDetailsSchema>;
type HotelBookingFormValues = z.infer<typeof hotelBookingSchema>;

type HotelMode = "tbo" | "manual";

export default function EventSetup() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [eventData, setEventData] = useState<any>(null);
  const { toast } = useToast();

  // Step 1 — invite URL (writes to events.coverMediaUrl via PATCH)
  const [inviteUrl, setInviteUrl] = useState("");
  const [scheduleText, setScheduleText] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");

  // TBO vs Manual mode for hotel step
  const [hotelMode, setHotelMode] = useState<HotelMode>("tbo");
  const [hotelBooked, setHotelBooked] = useState(false);

  // Step 3 — multi-transport state
  interface BookedTransport {
    id: string;
    mode: string;
    from: string;
    to: string;
    date: string;
    source: "tbo" | "manual";
  }
  const [bookedTransports, setBookedTransports] = useState<BookedTransport[]>([]);
  const [addPanelOpen, setAddPanelOpen] = useState(false);
  const [addType, setAddType] = useState<"tbo" | "manual" | null>(null);
  // Manual transport form state
  const [manualMode, setManualMode] = useState("flight");
  const [manualFrom, setManualFrom] = useState("");
  const [manualTo, setManualTo] = useState("");
  const [manualDate, setManualDate] = useState("");
  const [manualReturn, setManualReturn] = useState("");
  const [isSavingManual, setIsSavingManual] = useState(false);

  const clientForm = useForm<ClientDetailsFormValues>({
    resolver: zodResolver(clientDetailsSchema),
    defaultValues: {
      clientName: "",
      address: "",
      phone: "",
      hasVipGuests: false,
      hasFriends: false,
      hasFamily: false,
    },
  });

  const hotelForm = useForm<HotelBookingFormValues>({
    resolver: zodResolver(hotelBookingSchema),
    defaultValues: {
      hotelName: "",
      numberOfRooms: 1,
      checkInDate: "",
      checkOutDate: "",
    },
  });

  useEffect(() => {
    fetchEventData();
  }, [id]);

  const fetchEventData = async () => {
    try {
      const response = await fetch(`/api/events/${id}`);
      if (response.ok) {
        const data = await response.json();
        setEventData(data);
        // Hydrate invite fields from existing event data
        if (data.coverMediaUrl) setInviteUrl(data.coverMediaUrl);
        if (data.scheduleText) setScheduleText(data.scheduleText);
        if (data.inviteMessage) setInviteMessage(data.inviteMessage);
      }
    } catch (error) {
      console.error("Failed to fetch event data", error);
    }
  };

  const onClientDetailsSubmit = async (data: ClientDetailsFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/events/${id}/client-details`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save client details");
      }

      // Persist invite URL, schedule, and invite message to event via PATCH
      const patchPayload: Record<string, string | null> = {};
      if (inviteUrl.trim()) patchPayload.coverMediaUrl = inviteUrl.trim();
      if (scheduleText.trim()) patchPayload.scheduleText = scheduleText.trim();
      if (inviteMessage.trim()) patchPayload.inviteMessage = inviteMessage.trim();
      if (Object.keys(patchPayload).length > 0) {
        await fetch(`/api/events/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(patchPayload),
        });
      }

      toast({
        title: "Success",
        description: "Client details saved successfully"
      });
      setCurrentStep(2);
    } catch (error: any) {
      console.error("Error saving client details:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save client details",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onHotelBookingSubmit = async (data: HotelBookingFormValues) => {
    setIsSubmitting(true);
    try {
      // Validate dates
      const checkInDate = data.checkInDate ? new Date(data.checkInDate) : null;
      const checkOutDate = data.checkOutDate ? new Date(data.checkOutDate) : null;

      if (!checkInDate || isNaN(checkInDate.getTime())) {
        throw new Error("Invalid check-in date");
      }
      if (!checkOutDate || isNaN(checkOutDate.getTime())) {
        throw new Error("Invalid check-out date");
      }

      const payload = {
        hotelName: data.hotelName,
        numberOfRooms: data.numberOfRooms,
        eventId: Number(id),
        checkInDate: checkInDate.toISOString(),
        checkOutDate: checkOutDate.toISOString(),
      };

      const response = await fetch(`/api/events/${id}/hotel-booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save hotel booking");
      }
      
      toast({
        title: "Success",
        description: "Hotel booking saved successfully"
      });
      setCurrentStep(3);
    } catch (error: any) {
      console.error("Error saving hotel booking:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save hotel booking",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  const TRANSPORT_MODES = [
    { value: "flight", label: "Flight", Icon: Plane },
    { value: "train", label: "Train", Icon: TrainFront },
    { value: "bus", label: "Bus", Icon: Bus },
    { value: "car", label: "Car / Cab", Icon: Car },
    { value: "ferry", label: "Ferry / Cruise", Icon: Ship },
  ];

  const handleSaveManualTransport = async () => {
    if (!manualFrom || !manualTo || !manualDate) {
      toast({ title: "Missing fields", description: "From, To and date are required.", variant: "destructive" });
      return;
    }
    setIsSavingManual(true);
    try {
      const payload: any = {
        eventId: Number(id),
        travelMode: manualMode,
        fromLocation: manualFrom,
        toLocation: manualTo,
        departureDate: new Date(manualDate).toISOString(),
      };
      if (manualReturn) payload.returnDate = new Date(manualReturn).toISOString();

      const res = await fetch(`/api/events/${id}/travel-options`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? "Failed to save transport");
      }
      setBookedTransports((prev) => [
        ...prev,
        { id: `manual-${Date.now()}`, mode: manualMode, from: manualFrom, to: manualTo, date: manualDate, source: "manual" },
      ]);
      setManualFrom(""); setManualTo(""); setManualDate(""); setManualReturn("");
      setAddPanelOpen(false); setAddType(null);
      toast({ title: "Transport added", description: `${manualMode} from ${manualFrom} → ${manualTo}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSavingManual(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8 space-x-2">
      {[1, 2, 3].map((step) => (
        <div key={step} className="flex items-center">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
              currentStep >= step
                ? "bg-primary text-white"
                : "bg-gray-200 text-gray-500"
            }`}
          >
            {currentStep > step ? <Check className="w-5 h-5" /> : step}
          </div>
          {step < 3 && (
            <div
              className={`w-16 h-1 ${
                currentStep > step ? "bg-primary" : "bg-gray-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => currentStep > 1 ? setCurrentStep(currentStep - 1) : navigate("/dashboard")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <h1 className="text-3xl font-serif text-primary mb-2">
            Event Setup: {eventData?.name}
          </h1>
          <p className="text-muted-foreground">
            Complete the client details, hotel, and travel information
          </p>
        </div>

        {renderStepIndicator()}

        {/* Step 1: Client Details */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-serif">Client Details</CardTitle>
              <CardDescription>
                Enter the client's contact information and guest categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...clientForm}>
                <form onSubmit={clientForm.handleSubmit(onClientDetailsSubmit)} className="space-y-6">
                  <FormField
                    control={clientForm.control}
                    name="clientName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={clientForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input placeholder="123 Main St, City, State, ZIP" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={clientForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 (555) 123-4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Invite URL — optional, stored in events.coverMediaUrl */}
                  <div className="space-y-1.5">
                    <FormLabel>Invite Link <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                    <Input
                      placeholder="https://drive.google.com/... or Canva link"
                      value={inviteUrl}
                      onChange={(e) => setInviteUrl(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Paste a Google Drive, Canva, or any URL to a PDF, image, or video invite — shown to guests as "View Invite"
                    </p>
                  </div>

                  {/* Schedule — optional rich-text / plain-text */}
                  <div className="space-y-1.5">
                    <FormLabel>Event Schedule <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                    <textarea
                      className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      placeholder={"Day 1 — Arrival & Welcome dinner\nDay 2 — Conference sessions\nDay 3 — Team activities & departure"}
                      value={scheduleText}
                      onChange={(e) => setScheduleText(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Paste or type the event schedule — guests see this in their portal
                    </p>
                  </div>

                  {/* Fallback invite message — when no media URL is provided */}
                  {!inviteUrl.trim() && (
                    <div className="space-y-1.5 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <FormLabel>Personalised Invite Message <span className="text-muted-foreground font-normal">(fallback)</span></FormLabel>
                      <textarea
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        placeholder={`Dear Guest,\n\nYou are cordially invited to ${eventData?.name || 'our event'}. We look forward to welcoming you!`}
                        value={inviteMessage}
                        onChange={(e) => setInviteMessage(e.target.value)}
                      />
                      <p className="text-xs text-amber-700">
                        No invite link? This text message will be shown to guests instead. Their name is added automatically.
                      </p>
                    </div>
                  )}

                  <div className="space-y-4">
                    <FormLabel>Guest Categories</FormLabel>
                    <FormField
                      control={clientForm.control}
                      name="hasVipGuests"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">
                            VIP Guests
                          </FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={clientForm.control}
                      name="hasFriends"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">
                            Friends
                          </FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={clientForm.control}
                      name="hasFamily"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">
                            Family
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          Next: Hotel Booking <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Hotel Booking */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="font-serif">Hotel Booking</CardTitle>
                  <CardDescription>Search live rates via TBO or enter details manually</CardDescription>
                </div>
                {hotelBooked && (
                  <Badge className="bg-green-100 text-green-700 border-green-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Booked via TBO
                  </Badge>
                )}
              </div>

              {/* Mode tabs */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setHotelMode("tbo")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium border transition-colors ${
                    hotelMode === "tbo"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-input text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" /> Live TBO Search
                </button>
                <button
                  onClick={() => setHotelMode("manual")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium border transition-colors ${
                    hotelMode === "manual"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-input text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  <PenLine className="w-3.5 h-3.5" /> Enter Manually
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {hotelMode === "tbo" && !hotelBooked && (
                <HotelSearchPanel
                  eventId={Number(id)}
                  onBooked={() => {
                    setHotelBooked(true);
                    setCurrentStep(3);
                  }}
                />
              )}

              {hotelMode === "tbo" && hotelBooked && (
                <div className="text-center py-6 space-y-3">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
                  <p className="font-semibold text-green-700">Hotel blocked successfully via TBO</p>
                  <p className="text-sm text-muted-foreground">Rooms are rate-held. Proceed to travel setup.</p>
                  <Button onClick={() => setCurrentStep(3)}>
                    Next: Travel Options <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}

              {hotelMode === "manual" && (
                <Form {...hotelForm}>
                  <form onSubmit={hotelForm.handleSubmit(onHotelBookingSubmit)} className="space-y-6">
                    <FormField
                      control={hotelForm.control}
                      name="hotelName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hotel Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Grand Hotel" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={hotelForm.control}
                        name="checkInDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Check-in Date</FormLabel>
                            <FormControl><Input type="date" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={hotelForm.control}
                        name="checkOutDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Check-out Date</FormLabel>
                            <FormControl><Input type="date" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={hotelForm.control}
                      name="numberOfRooms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number of Rooms</FormLabel>
                          <FormControl>
                            <Input type="number" min="1" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-between">
                      <Button type="button" variant="outline" onClick={() => setCurrentStep(1)}>
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <>Next: Travel Options <ArrowRight className="w-4 h-4 ml-2" /></>}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}

              {hotelMode === "tbo" && !hotelBooked && (
                <div className="flex justify-between mt-4 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setCurrentStep(1)}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                  <Button variant="ghost" onClick={() => setCurrentStep(3)}>
                    Skip hotel for now
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Travel Options — multi-transport add pattern */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-serif">Travel Options</CardTitle>
              <CardDescription>
                Add one or more transport legs for the group — flights via TBO live booking or any mode manually.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">

              {/* ── Booked transport list ── */}
              {bookedTransports.length > 0 && (
                <div className="space-y-2">
                  {bookedTransports.map((t) => {
                    const ModeIcon = TRANSPORT_MODES.find((m) => m.value === t.mode)?.Icon ?? Plane;
                    return (
                      <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                        <div className="flex items-center gap-3">
                          <ModeIcon className="w-4 h-4 text-primary" />
                          <div>
                            <p className="text-sm font-medium capitalize">
                              {t.mode} — {t.from} → {t.to}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {t.date} · {t.source === "tbo" ? "TBO booked" : "Manual"}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setBookedTransports((prev) => prev.filter((x) => x.id !== t.id))}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Add panel ── */}
              {addPanelOpen ? (
                <div className="border rounded-lg p-4 space-y-4 bg-muted/10">
                  {/* Type selector */}
                  {!addType && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium">How would you like to add this transport?</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setAddType("tbo")}
                          className="flex items-center gap-1.5 px-3 py-2 rounded text-sm font-medium border border-primary bg-primary text-primary-foreground"
                        >
                          <Zap className="w-3.5 h-3.5" /> Live TBO Flight
                        </button>
                        <button
                          onClick={() => setAddType("manual")}
                          className="flex items-center gap-1.5 px-3 py-2 rounded text-sm font-medium border hover:border-primary/50"
                        >
                          <PenLine className="w-3.5 h-3.5" /> Enter Manually
                        </button>
                        <button
                          onClick={() => { setAddPanelOpen(false); setAddType(null); }}
                          className="ml-auto flex items-center gap-1 px-2 py-1 text-sm text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-3.5 h-3.5" /> Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TBO flight search */}
                  {addType === "tbo" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-primary" /> TBO Live Flight Search</p>
                        <button onClick={() => { setAddPanelOpen(false); setAddType(null); }} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"><X className="w-3 h-3" /> Cancel</button>
                      </div>
                      <FlightSearchPanel
                        eventId={Number(id)}
                        onBooked={(data) => {
                          setBookedTransports((prev) => [
                            ...prev,
                            {
                              id: `tbo-${Date.now()}`,
                              mode: "flight",
                              from: data.fromLocation,
                              to: data.toLocation,
                              date: data.departureDate,
                              source: "tbo",
                            },
                          ]);
                          setAddPanelOpen(false);
                          setAddType(null);
                          toast({ title: "Flight booked!", description: `${data.fromLocation} → ${data.toLocation} via TBO` });
                        }}
                      />
                    </div>
                  )}

                  {/* Manual transport form */}
                  {addType === "manual" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium flex items-center gap-1.5"><PenLine className="w-3.5 h-3.5" /> Manual Transport</p>
                        <button onClick={() => { setAddPanelOpen(false); setAddType(null); }} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"><X className="w-3 h-3" /> Cancel</button>
                      </div>

                      {/* Mode selector */}
                      <div className="flex flex-wrap gap-2">
                        {TRANSPORT_MODES.map(({ value, label, Icon }) => (
                          <button
                            key={value}
                            onClick={() => setManualMode(value)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm border transition-colors ${
                              manualMode === value
                                ? "bg-primary text-primary-foreground border-primary"
                                : "border-input text-muted-foreground hover:border-primary/50"
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" /> {label}
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label>From</Label>
                          <Input placeholder="Mumbai" value={manualFrom} onChange={(e) => setManualFrom(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>To</Label>
                          <Input placeholder="Dubai" value={manualTo} onChange={(e) => setManualTo(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Departure Date</Label>
                          <Input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Return Date <span className="text-muted-foreground font-normal">(optional)</span></Label>
                          <Input type="date" value={manualReturn} onChange={(e) => setManualReturn(e.target.value)} />
                        </div>
                      </div>

                      <Button onClick={handleSaveManualTransport} disabled={isSavingManual} className="w-full">
                        {isSavingManual ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : "Add Transport"}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                /* ── + Add Transport button ── */
                <Button
                  variant="outline"
                  className="w-full border-dashed"
                  onClick={() => { setAddPanelOpen(true); setAddType(null); }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {bookedTransports.length === 0 ? "Add Transport Option" : "Add Another Transport Leg"}
                </Button>
              )}

              {/* ── Footer actions ── */}
              <div className="flex justify-between pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setCurrentStep(2)}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => navigate(`/events/${id}/preview`)}>
                    Skip & Preview
                  </Button>
                  <Button onClick={() => navigate(`/events/${id}/preview`)} disabled={bookedTransports.length === 0}>
                    Complete Setup <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>

            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
