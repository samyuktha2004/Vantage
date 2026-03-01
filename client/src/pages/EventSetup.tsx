interface HotelBookingItem {
  id: number;
  hotelName: string;
  numberOfRooms: number;
  checkInDate?: string;
  checkOutDate?: string;
  baseRate?: number | null;
  commissionType?: CommissionType | null;
  commissionValue?: number | null;
  clientFacingRate?: number | null;
  tboHotelData?: unknown;
}

interface BookingLabelInclusionItem {
  id: number;
  eventId: number;
  labelId: number;
  bookingType: "hotel" | "flight";
  bookingId: number;
  isIncluded: boolean;
  inclusions?: string | null;
}
import { useState, useEffect, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DashboardLayout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useLabels, useCreateLabel } from "@/hooks/use-labels";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Check, Loader2, Zap, PenLine, CheckCircle2, Plus, X, Plane, TrainFront, Car, Bus, Ship, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { HotelSearchPanel } from "@/components/hotel/HotelSearchPanel";
import { FlightSearchPanel } from "@/components/flight/FlightSearchPanel";
import NotFound from "@/pages/not-found";

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
type CommissionType = "amount" | "percentage";
type HotelBookingSource = "tbo" | "mock" | "manual" | null;
type BookingInclusionType = "hotel" | "flight";

interface HotelBookingItem {
  id: number;
  hotelName: string;
  numberOfRooms: number;
  checkInDate?: string;
  checkOutDate?: string;
  baseRate?: number | null;
  commissionType?: CommissionType | null;
  commissionValue?: number | null;
  clientFacingRate?: number | null;
  tboHotelData?: unknown;
}

export default function EventSetup() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [eventData, setEventData] = useState<any>(null);
  const { toast } = useToast();

  // Step 1 — invite URL (writes to events.coverMediaUrl via PATCH)
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteMediaType, setInviteMediaType] = useState<"image" | "video">("image");
  const [isInviteUploading, setIsInviteUploading] = useState(false);
  const [scheduleText, setScheduleText] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  // TBO vs Manual mode for hotel step
  const [hotelMode, setHotelMode] = useState<HotelMode>("tbo");
  const [hotelBooked, setHotelBooked] = useState(false);
  const [hotelBookingSource, setHotelBookingSource] = useState<HotelBookingSource>(null);
  const [hotelBookings, setHotelBookings] = useState<HotelBookingItem[]>([]);
  const [hotelAddPanelOpen, setHotelAddPanelOpen] = useState(true);
  const [hotelBaseRate, setHotelBaseRate] = useState(0);
  const [hotelCommissionType, setHotelCommissionType] = useState<CommissionType>("amount");
  const [hotelCommissionValue, setHotelCommissionValue] = useState(0);
  const [editingHotelId, setEditingHotelId] = useState<number | null>(null);
  const [editHotelBaseRate, setEditHotelBaseRate] = useState(0);
  const [editHotelCommissionType, setEditHotelCommissionType] = useState<CommissionType>("amount");
  const [editHotelCommissionValue, setEditHotelCommissionValue] = useState(0);

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
  const [manualBaseFare, setManualBaseFare] = useState(0);
  const [manualCommissionType, setManualCommissionType] = useState<CommissionType>("amount");
  const [manualCommissionValue, setManualCommissionValue] = useState(0);
  const [isSavingManual, setIsSavingManual] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);

  const computeClientRate = (base: number, commissionType: CommissionType, commissionValue: number) => {
    if (!base || base <= 0) return 0;
    const commission = commissionType === "percentage"
      ? Math.round((base * Math.max(commissionValue, 0)) / 100)
      : Math.max(commissionValue, 0);
    return Math.max(base + commission, 0);
  };

  const detectMockHotelBooking = (tboHotelData: unknown): boolean => {
    if (!tboHotelData) return false;
    if (typeof tboHotelData === "object") {
      return Boolean((tboHotelData as any)?.isMockFallback);
    }
    if (typeof tboHotelData === "string") {
      try {
        const parsed = JSON.parse(tboHotelData);
        return Boolean(parsed?.isMockFallback);
      } catch {
        return tboHotelData.includes('"isMockFallback":true');
      }
    }
    return false;
  };

  const parseTboHotelData = (tboHotelData: unknown): any => {
    if (!tboHotelData) return null;
    if (typeof tboHotelData === "object") return tboHotelData;
    if (typeof tboHotelData === "string") {
      try {
        return JSON.parse(tboHotelData);
      } catch {
        return null;
      }
    }
    return null;
  };

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

  const { data: labels } = useLabels(Number(id));
  const createLabel = useCreateLabel();
  const [newLabelName, setNewLabelName] = useState("");
  const [isAddingLabel, setIsAddingLabel] = useState(false);
  const [showAddLabelInput, setShowAddLabelInput] = useState(false);
  const [clientDetailsExists, setClientDetailsExists] = useState<boolean | null>(null);
  const [guestCategorySelections, setGuestCategorySelections] = useState<Record<number, boolean>>({});
  const [bookingLabelInclusions, setBookingLabelInclusions] = useState<BookingLabelInclusionItem[]>([]);
  const [inclusionDrafts, setInclusionDrafts] = useState<Record<string, string>>({});
  const [inclusionChecks, setInclusionChecks] = useState<Record<string, boolean>>({});
  const [savingInclusionKey, setSavingInclusionKey] = useState<string | null>(null);

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

  const handleInviteFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      toast({
        title: "Unsupported file",
        description: "Upload an image or video file.",
        variant: "destructive",
      });
      return;
    }

    const maxSizeBytes = 4 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 4MB.",
        variant: "destructive",
      });
      return;
    }

    setIsInviteUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });

      if (!dataUrl.startsWith("data:")) {
        throw new Error("Invalid file data");
      }

      setInviteUrl(dataUrl);
      setInviteMediaType(isVideo ? "video" : "image");
      toast({ title: "Invite media added" });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error?.message || "Could not process selected file",
        variant: "destructive",
      });
    } finally {
      setIsInviteUploading(false);
      event.target.value = "";
    }
  };

  const fetchEventData = async () => {
    if (!id) return;
    setIsDataLoading(true);
    const prefillClientName = (new URLSearchParams(window.location.search).get("clientName") || "").trim();
    try {
      const [eventRes, travelRes, hotelRes, clientRes, inclusionsRes] = await Promise.all([
        fetch(`/api/events/${id}`, { credentials: "include" }),
        fetch(`/api/events/${id}/travel-options`, { credentials: "include" }),
        fetch(`/api/events/${id}/hotel-bookings`, { credentials: "include" }),
        fetch(`/api/events/${id}/client-details`, { credentials: "include" }),
        fetch(`/api/events/${id}/booking-label-inclusions`, { credentials: "include" }),
      ]);

      if (eventRes.ok) {
        const data = await eventRes.json();
        setEventData(data);
        if (data.coverMediaUrl) setInviteUrl(data.coverMediaUrl);
        if (data.coverMediaType === "video") setInviteMediaType("video");
        if (data.scheduleText) setScheduleText(data.scheduleText);
        if (data.inviteMessage) setInviteMessage(data.inviteMessage);
        if (data.contactPhone) setContactPhone(data.contactPhone);
        if (data.contactEmail) setContactEmail(data.contactEmail);
      }

      if (travelRes.ok) {
        const options = await travelRes.json();
        if (Array.isArray(options) && options.length > 0) {
          setBookedTransports(options.map((opt: any) => ({
            id: String(opt.id),
            mode: opt.travelMode ?? "flight",
            from: opt.fromLocation ?? "",
            to: opt.toLocation ?? "",
            date: opt.departureDate ? new Date(opt.departureDate).toLocaleDateString() : "",
            source: opt.tboFlightData ? "tbo" : "manual",
          })));
        }
      }

      if (hotelRes.ok) {
        const bookings = await hotelRes.json();
        if (Array.isArray(bookings) && bookings.length > 0) {
          setHotelBookings(bookings);
          setHotelAddPanelOpen(false);
          const latest = bookings[bookings.length - 1];
          const hasTboData = Boolean(latest?.tboHotelData);
          const isMockFallback = detectMockHotelBooking(latest?.tboHotelData);
          setHotelBooked(true);
          setHotelBookingSource(isMockFallback ? "mock" : hasTboData ? "tbo" : "manual");
        } else {
          setHotelBookings([]);
          setHotelAddPanelOpen(true);
          setHotelBooked(false);
          setHotelBookingSource(null);
        }
      }

      if (inclusionsRes.ok) {
        const rows = await inclusionsRes.json();
        if (Array.isArray(rows)) {
          setBookingLabelInclusions(rows);
        }
      }

      // Prefill client details form when editing an existing event
      if (clientRes.ok) {
        const cd = await clientRes.json();
        clientForm.reset({
          clientName: cd.clientName ?? "",
          address: cd.address ?? "",
          phone: cd.phone ?? "",
          hasVipGuests: cd.hasVipGuests ?? false,
          hasFriends: cd.hasFriends ?? false,
          hasFamily: cd.hasFamily ?? false,
        });
          setClientDetailsExists(true);
          // initialize guest category selections for known labels if any
          if (labels && labels.length > 0) {
            const initial: Record<number, boolean> = {};
            for (const lbl of labels) {
              const name = String(lbl.name || "").toLowerCase();
              if (name === "vip") initial[lbl.id] = Boolean(cd.hasVipGuests);
              else if (name === "friends") initial[lbl.id] = Boolean(cd.hasFriends);
              else if (name === "family") initial[lbl.id] = Boolean(cd.hasFamily);
              else initial[lbl.id] = false;
            }
            setGuestCategorySelections(initial);
          }
        } else if (prefillClientName) {
        clientForm.setValue("clientName", prefillClientName, { shouldDirty: false });
          setClientDetailsExists(false);
      }
    } catch (error) {
      console.error("Failed to fetch event data", error);
    } finally {
      setIsDataLoading(false);
    }
  };

  const getInclusionRecord = (bookingType: BookingInclusionType, bookingId: number, labelId: number) => {
    return bookingLabelInclusions.find(
      (row) => row.bookingType === bookingType && row.bookingId === bookingId && row.labelId === labelId,
    );
  };

  const handleSaveBookingLabelInclusion = async (
    bookingType: BookingInclusionType,
    bookingId: number,
    labelId: number,
    isIncluded: boolean,
    inclusions: string,
  ) => {
    const key = `${bookingType}-${bookingId}-${labelId}`;
    try {
      setSavingInclusionKey(key);
      const res = await fetch(`/api/events/${id}/booking-label-inclusions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ bookingType, bookingId, labelId, isIncluded, inclusions }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Failed to save label inclusion");
      }

      const saved = await res.json();
      setBookingLabelInclusions((prev) => {
        const next = prev.filter(
          (row) => !(row.bookingType === bookingType && row.bookingId === bookingId && row.labelId === labelId),
        );
        next.push(saved);
        return next;
      });
      toast({ title: "Inclusion updated" });
    } catch (error: any) {
      toast({ title: "Failed to update inclusion", description: error?.message || "", variant: "destructive" });
    } finally {
      setSavingInclusionKey(null);
    }
  };

  const onClientDetailsSubmit = async (data: ClientDetailsFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/events/${id}/client-details`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save client details");
      }

      // Persist invite URL, schedule, and invite message to event via PATCH
      const patchPayload: Record<string, string | null> = {};
      if (inviteUrl.trim()) {
        patchPayload.coverMediaUrl = inviteUrl.trim();
        patchPayload.coverMediaType = inviteMediaType;
      }
      if (scheduleText.trim()) patchPayload.scheduleText = scheduleText.trim();
      if (inviteMessage.trim()) patchPayload.inviteMessage = inviteMessage.trim();
      if (contactPhone.trim()) patchPayload.contactPhone = contactPhone.trim();
      if (contactEmail.trim()) patchPayload.contactEmail = contactEmail.trim();
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
      if (checkOutDate <= checkInDate) {
        throw new Error("Check-out date must be after check-in date");
      }

      const payload = {
        hotelName: data.hotelName,
        numberOfRooms: data.numberOfRooms,
        eventId: Number(id),
        checkInDate: checkInDate.toISOString(),
        checkOutDate: checkOutDate.toISOString(),
        baseRate: hotelBaseRate > 0 ? hotelBaseRate : null,
        commissionType: hotelCommissionType,
        commissionValue: hotelCommissionValue > 0 ? hotelCommissionValue : 0,
        clientFacingRate: hotelBaseRate > 0
          ? computeClientRate(hotelBaseRate, hotelCommissionType, hotelCommissionValue)
          : null,
      };

      const response = await fetch(`/api/events/${id}/hotel-booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
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
      setHotelBooked(true);
      setHotelBookingSource("manual");
      setHotelAddPanelOpen(false);
      hotelForm.reset({
        hotelName: "",
        numberOfRooms: 1,
        checkInDate: "",
        checkOutDate: "",
      });
      await fetchEventData();
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
      const depDate = new Date(manualDate + "T00:00:00");
      if (isNaN(depDate.getTime())) {
        toast({ title: "Invalid departure date", variant: "destructive" });
        setIsSavingManual(false);
        return;
      }
      const payload: any = {
        eventId: Number(id),
        travelMode: manualMode,
        fromLocation: manualFrom,
        toLocation: manualTo,
        departureDate: depDate.toISOString(),
        baseFare: manualBaseFare > 0 ? manualBaseFare : null,
        commissionType: manualCommissionType,
        commissionValue: manualCommissionValue > 0 ? manualCommissionValue : 0,
        clientFacingFare: manualBaseFare > 0
          ? computeClientRate(manualBaseFare, manualCommissionType, manualCommissionValue)
          : null,
      };
      if (manualReturn) {
        const retDate = new Date(manualReturn + "T00:00:00");
        if (!isNaN(retDate.getTime())) payload.returnDate = retDate.toISOString();
      }

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
      await fetchEventData();
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

  if (isDataLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!id) return <NotFound />;

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
            {eventData?.name ? `Event Setup: ${eventData.name}` : "Event Setup"}
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
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*,video/*"
                        onChange={handleInviteFileUpload}
                        disabled={isInviteUploading}
                      />
                      {isInviteUploading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                    </div>
                    {inviteUrl.startsWith("data:image/") && (
                      <img src={inviteUrl} alt="Invite preview" className="w-full max-h-48 object-cover rounded-md border" />
                    )}
                    {inviteUrl.startsWith("data:video/") && (
                      <video src={inviteUrl} controls className="w-full max-h-56 rounded-md border" />
                    )}
                    <p className="text-xs text-muted-foreground">
                      Paste a Google Drive/Canva URL, or upload an image/video invite file.
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

                  {/* Guest concierge contact info */}
                  <div className="space-y-3">
                    <FormLabel>Guest Support Contact <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        placeholder="+91 98765 43210"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        type="tel"
                      />
                      <Input
                        placeholder="support@yourcompany.com"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        type="email"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Shown on guests' Concierge page so they can reach your team directly.
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
                    {labels && labels.length > 0 ? (
                      <div className="grid grid-cols-1 gap-2">
                        {labels.map((lbl: any) => (
                          <div key={lbl.id} className="flex items-center space-x-2">
                            <input
                              id={`label-${lbl.id}`}
                              type="checkbox"
                              checked={Boolean(guestCategorySelections[lbl.id])}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setGuestCategorySelections((s) => ({ ...s, [lbl.id]: checked }));
                                // Map common tiers to existing boolean fields so they persist
                                const name = String(lbl.name || "").toLowerCase();
                                if (name === "vip") clientForm.setValue("hasVipGuests", checked);
                                if (name === "friends") clientForm.setValue("hasFriends", checked);
                                if (name === "family") clientForm.setValue("hasFamily", checked);
                              }}
                              className="w-4 h-4 rounded"
                            />
                            <label htmlFor={`label-${lbl.id}`} className="font-normal cursor-pointer">
                              {lbl.name}
                            </label>
                          </div>
                        ))}
                        <p className="text-xs text-muted-foreground">These are the custom guest categories imported for this event.</p>

                        {/* Add category control at the bottom-right of the list */}
                        <div className="flex justify-end mt-2">
                          {showAddLabelInput ? (
                            <div className="flex items-center space-x-2">
                              <input
                                placeholder="New category name"
                                value={newLabelName}
                                onChange={(e) => setNewLabelName(e.target.value)}
                                className="px-2 py-1 rounded border border-input bg-background text-sm"
                              />
                              <Button
                                size="sm"
                                onClick={async () => {
                                  if (!newLabelName || !newLabelName.trim()) return;
                                  try {
                                    setIsAddingLabel(true);
                                    await createLabel.mutateAsync({ eventId: Number(id), name: newLabelName.trim() });
                                    setNewLabelName("");
                                    setShowAddLabelInput(false);
                                    toast({ title: "Category created" });
                                  } catch (e: any) {
                                    toast({ title: "Failed to create", description: e?.message || "", variant: "destructive" });
                                  } finally {
                                    setIsAddingLabel(false);
                                  }
                                }}
                              >
                                {isAddingLabel ? "Creating..." : "Add"}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => { setShowAddLabelInput(false); setNewLabelName(""); }}>
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="ghost" onClick={() => setShowAddLabelInput(true)}>
                              <Plus className="w-4 h-4 mr-2" /> Add Category
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-muted-foreground">No custom categories found — use the fields below.</p>
                        <div className="mt-2 space-y-2">
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
                      </div>
                    )}
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
                    <CheckCircle2 className="w-3 h-3" />
                    {hotelBookingSource === "mock"
                      ? "Booked via TBO"
                      : hotelBookingSource === "manual"
                      ? "Booked manually"
                      : "Booked via TBO"}
                  </Badge>
                )}
              </div>

              {(hotelBookings.length === 0 || hotelAddPanelOpen) && (
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
              )}
            </CardHeader>

            <CardContent>
              {hotelBookings.length > 0 && (
                <div className="mb-4 rounded-lg border bg-muted/20 p-3 space-y-2">
                  <p className="text-sm font-medium">Booked hotel blocks ({hotelBookings.length})</p>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {hotelBookings.map((booking) => {
                      const parsed = parseTboHotelData(booking.tboHotelData);
                      const roomType = parsed?.roomTypeName || parsed?.originalRoom?.RoomTypeName;
                      const sourceLabel = parsed ? "TBO" : "Manual";
                      const computedClientRate =
                        booking.baseRate && booking.baseRate > 0
                          ? computeClientRate(
                              Number(booking.baseRate),
                              (booking.commissionType as CommissionType) || "amount",
                              Number(booking.commissionValue || 0)
                            )
                          : null;
                      return (
                        <div key={booking.id} className="rounded-md border bg-background px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium truncate">{booking.hotelName}</p>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">{sourceLabel}</Badge>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingHotelId(booking.id);
                                  setEditHotelBaseRate(Number(booking.baseRate || 0));
                                  setEditHotelCommissionType((booking.commissionType as CommissionType) || "amount");
                                  setEditHotelCommissionValue(Number(booking.commissionValue || 0));
                                }}
                              >
                                Edit Pricing
                              </Button>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {booking.numberOfRooms} rooms{roomType ? ` • ${roomType}` : ""}
                            {booking.checkInDate && booking.checkOutDate
                              ? ` • ${new Date(booking.checkInDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} - ${new Date(booking.checkOutDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
                              : ""}
                          </p>
                          {computedClientRate !== null && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Pricing: Base ₹{Number(booking.baseRate || 0).toLocaleString("en-IN")} • Commission {booking.commissionType === "percentage" ? `${Number(booking.commissionValue || 0)}%` : `₹${Number(booking.commissionValue || 0).toLocaleString("en-IN")}`} • Client ₹{computedClientRate.toLocaleString("en-IN")}
                            </p>
                          )}
                          {!!labels?.length && (
                            <div className="mt-3 rounded-md border bg-muted/10 p-3 space-y-2">
                              <p className="text-xs font-medium">Hotel inclusions by label</p>
                              {labels.map((lbl: any) => {
                                const key = `hotel-${booking.id}-${lbl.id}`;
                                const saved = getInclusionRecord("hotel", booking.id, lbl.id);
                                const checked = inclusionChecks[key] ?? Boolean(saved?.isIncluded);
                                const textValue = inclusionDrafts[key] ?? (saved?.inclusions || "");
                                return (
                                  <div key={lbl.id} className="grid grid-cols-1 md:grid-cols-[140px_1fr_auto] gap-2 items-center">
                                    <label className="text-xs font-medium">{lbl.name}</label>
                                    <Input
                                      value={textValue}
                                      onChange={(e) => setInclusionDrafts((prev) => ({ ...prev, [key]: e.target.value }))}
                                      placeholder="E.g. breakfast, airport transfer"
                                    />
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded"
                                        checked={checked}
                                        onChange={(e) => setInclusionChecks((prev) => ({ ...prev, [key]: e.target.checked }))}
                                      />
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        disabled={savingInclusionKey === key}
                                        onClick={() => handleSaveBookingLabelInclusion("hotel", booking.id, lbl.id, checked, textValue)}
                                      >
                                        {savingInclusionKey === key ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {editingHotelId === booking.id && (
                            <div className="mt-3 rounded-md border p-3 space-y-3 bg-muted/10">
                              <p className="text-xs font-medium">Edit hotel pricing</p>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="space-y-1.5">
                                  <Label>Base Rate (₹)</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={editHotelBaseRate || ""}
                                    onChange={(e) => setEditHotelBaseRate(Number(e.target.value) || 0)}
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label>Commission Type</Label>
                                  <Select value={editHotelCommissionType} onValueChange={(v) => setEditHotelCommissionType(v as CommissionType)}>
                                    <SelectTrigger className="bg-white text-gray-900 border-input">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white text-gray-900 border-input">
                                      <SelectItem className="bg-white text-gray-900 data-[highlighted]:bg-gray-100 data-[state=checked]:bg-primary/10" value="amount">Amount (₹)</SelectItem>
                                      <SelectItem className="bg-white text-gray-900 data-[highlighted]:bg-gray-100 data-[state=checked]:bg-primary/10" value="percentage">Percentage (%)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1.5">
                                  <Label>Commission Value</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={editHotelCommissionValue || ""}
                                    onChange={(e) => setEditHotelCommissionValue(Number(e.target.value) || 0)}
                                    placeholder={editHotelCommissionType === "percentage" ? "e.g. 12" : "e.g. 800"}
                                  />
                                </div>
                              </div>
                              {editHotelBaseRate > 0 && (
                                <p className="text-xs text-muted-foreground">
                                  Client-facing rate: ₹{computeClientRate(editHotelBaseRate, editHotelCommissionType, editHotelCommissionValue).toLocaleString("en-IN")}
                                </p>
                              )}
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      const payload = {
                                        baseRate: editHotelBaseRate > 0 ? editHotelBaseRate : null,
                                        commissionType: editHotelCommissionType,
                                        commissionValue: editHotelCommissionValue > 0 ? editHotelCommissionValue : 0,
                                        clientFacingRate: editHotelBaseRate > 0
                                          ? computeClientRate(editHotelBaseRate, editHotelCommissionType, editHotelCommissionValue)
                                          : null,
                                      };
                                      const res = await fetch(`/api/events/${id}/hotel-booking/${booking.id}`, {
                                        method: "PUT",
                                        headers: { "Content-Type": "application/json" },
                                        credentials: "include",
                                        body: JSON.stringify(payload),
                                      });
                                      if (!res.ok) {
                                        const err = await res.json().catch(() => ({}));
                                        throw new Error(err?.message || "Failed to update hotel pricing");
                                      }
                                      toast({ title: "Hotel pricing updated" });
                                      setEditingHotelId(null);
                                      fetchEventData();
                                    } catch (e: any) {
                                      toast({ title: "Update failed", description: e?.message || "", variant: "destructive" });
                                    }
                                  }}
                                >
                                  Save Pricing
                                </Button>
                                <Button type="button" size="sm" variant="outline" onClick={() => setEditingHotelId(null)}>
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {hotelBookings.length > 0 && !hotelAddPanelOpen && (
                <div className="space-y-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setHotelAddPanelOpen(true)}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Add More Hotels
                  </Button>

                  <div className="flex justify-between pt-2 border-t">
                    <Button type="button" variant="outline" onClick={() => setCurrentStep(1)}>
                      <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                    <Button type="button" onClick={() => setCurrentStep(3)}>
                      Next: Travel Options <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {(hotelBookings.length === 0 || hotelAddPanelOpen) && hotelMode === "tbo" && (
                <>
                  <HotelSearchPanel
                    eventId={Number(id)}
                    onBooked={(booking) => {
                      const isMockFallback = Boolean((booking as any)?.tboHotelData?.isMockFallback);
                      setHotelBooked(true);
                      setHotelBookingSource(isMockFallback ? "mock" : "tbo");
                      setHotelAddPanelOpen(false);
                      fetchEventData();
                    }}
                  />
                  <div className="flex justify-between mt-4 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={() => setCurrentStep(1)}>
                      <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                    <Button type="button" onClick={() => setCurrentStep(3)}>
                      Next: Travel Options <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </>
              )}

              {(hotelBookings.length === 0 || hotelAddPanelOpen) && hotelMode === "manual" && (
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
                            <FormControl>
                              <Input
                                type="date"
                                {...field}
                                onChange={(e) => {
                                  const nextCheckIn = e.target.value;
                                  field.onChange(nextCheckIn);
                                  const currentCheckOut = hotelForm.getValues("checkOutDate");
                                  if (currentCheckOut && nextCheckIn && new Date(currentCheckOut) <= new Date(nextCheckIn)) {
                                    hotelForm.setValue("checkOutDate", "");
                                  }
                                }}
                              />
                            </FormControl>
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
                            <FormControl>
                              <Input
                                type="date"
                                min={hotelForm.watch("checkInDate") || undefined}
                                {...field}
                              />
                            </FormControl>
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label>Base Rate (₹)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={hotelBaseRate || ""}
                          onChange={(e) => setHotelBaseRate(Number(e.target.value) || 0)}
                          placeholder="e.g. 7000"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Commission Type</Label>
                        <Select value={hotelCommissionType} onValueChange={(v) => setHotelCommissionType(v as CommissionType)}>
                          <SelectTrigger className="bg-white text-gray-900 border-input">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white text-gray-900 border-input">
                            <SelectItem className="bg-white text-gray-900 data-[highlighted]:bg-gray-100 data-[state=checked]:bg-primary/10" value="amount">Amount (₹)</SelectItem>
                            <SelectItem className="bg-white text-gray-900 data-[highlighted]:bg-gray-100 data-[state=checked]:bg-primary/10" value="percentage">Percentage (%)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Commission Value</Label>
                        <Input
                          type="number"
                          min="0"
                          value={hotelCommissionValue || ""}
                          onChange={(e) => setHotelCommissionValue(Number(e.target.value) || 0)}
                          placeholder={hotelCommissionType === "percentage" ? "e.g. 12" : "e.g. 800"}
                        />
                      </div>
                    </div>
                    {hotelBaseRate > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Client-facing rate: ₹{computeClientRate(hotelBaseRate, hotelCommissionType, hotelCommissionValue).toLocaleString("en-IN")}
                      </p>
                    )}
                    <div className="flex justify-between">
                      <Button type="button" variant="outline" onClick={() => setCurrentStep(1)}>
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back
                      </Button>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={() => setCurrentStep(3)}>
                          Next: Travel Options <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <>Save Hotel Booking</>}
                        </Button>
                      </div>
                    </div>
                  </form>
                </Form>
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
                    const parsedBookingId = Number(t.id);
                    const hasSavedBookingId = Number.isInteger(parsedBookingId) && parsedBookingId > 0;
                    return (
                      <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                        <div className="flex-1 min-w-0">
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

                          {t.mode === "flight" && !!labels?.length && (
                            <div className="mt-3 rounded-md border bg-muted/10 p-3 space-y-2">
                              <p className="text-xs font-medium">Flight inclusions by label</p>
                              {!hasSavedBookingId && (
                                <p className="text-xs text-muted-foreground">Save/reload this flight booking to attach label inclusions.</p>
                              )}
                              {hasSavedBookingId && labels.map((lbl: any) => {
                                const key = `flight-${parsedBookingId}-${lbl.id}`;
                                const saved = getInclusionRecord("flight", parsedBookingId, lbl.id);
                                const checked = inclusionChecks[key] ?? Boolean(saved?.isIncluded);
                                const textValue = inclusionDrafts[key] ?? (saved?.inclusions || "");
                                return (
                                  <div key={lbl.id} className="grid grid-cols-1 md:grid-cols-[140px_1fr_auto] gap-2 items-center">
                                    <label className="text-xs font-medium">{lbl.name}</label>
                                    <Input
                                      value={textValue}
                                      onChange={(e) => setInclusionDrafts((prev) => ({ ...prev, [key]: e.target.value }))}
                                      placeholder="E.g. priority boarding, lounge access"
                                    />
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded"
                                        checked={checked}
                                        onChange={(e) => setInclusionChecks((prev) => ({ ...prev, [key]: e.target.checked }))}
                                      />
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        disabled={savingInclusionKey === key}
                                        onClick={() => handleSaveBookingLabelInclusion("flight", parsedBookingId, lbl.id, checked, textValue)}
                                      >
                                        {savingInclusionKey === key ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
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
                          fetchEventData();
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

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <Label>Base Fare (₹)</Label>
                          <Input
                            type="number"
                            min="0"
                            value={manualBaseFare || ""}
                            onChange={(e) => setManualBaseFare(Number(e.target.value) || 0)}
                            placeholder="e.g. 5500"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Commission Type</Label>
                          <Select value={manualCommissionType} onValueChange={(v) => setManualCommissionType(v as CommissionType)}>
                            <SelectTrigger className="bg-white text-gray-900 border-input">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white text-gray-900 border-input">
                              <SelectItem className="bg-white text-gray-900 data-[highlighted]:bg-gray-100 data-[state=checked]:bg-primary/10" value="amount">Amount (₹)</SelectItem>
                              <SelectItem className="bg-white text-gray-900 data-[highlighted]:bg-gray-100 data-[state=checked]:bg-primary/10" value="percentage">Percentage (%)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Commission Value</Label>
                          <Input
                            type="number"
                            min="0"
                            value={manualCommissionValue || ""}
                            onChange={(e) => setManualCommissionValue(Number(e.target.value) || 0)}
                            placeholder={manualCommissionType === "percentage" ? "e.g. 10" : "e.g. 500"}
                          />
                        </div>
                      </div>
                      {manualBaseFare > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Client-facing fare: ₹{computeClientRate(manualBaseFare, manualCommissionType, manualCommissionValue).toLocaleString("en-IN")}
                        </p>
                      )}

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
