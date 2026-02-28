import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useGuestPortal, useUpdateTravelPrefs, useUpdateBleisure } from "@/hooks/use-guest-portal";
import { GuestLayout } from "@/components/GuestLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Plane, Hotel, ArrowRight, AlertTriangle, Train, Bus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format, differenceInCalendarDays } from "date-fns";

type TransportMode = "group_flight" | "own_flight" | "train" | "other";

const TRANSPORT_OPTIONS: { value: TransportMode; label: string; icon: React.ReactNode; pnrLabel?: string }[] = [
  { value: "group_flight", label: "Group transport", icon: <Plane className="w-4 h-4" /> },
  { value: "own_flight",   label: "Own flight",       icon: <Plane className="w-4 h-4" />, pnrLabel: "Flight PNR / Booking ref" },
  { value: "train",        label: "Train",             icon: <Train className="w-4 h-4" />, pnrLabel: "Train PNR / Booking no." },
  { value: "other",        label: "Other (bus / car / cab)", icon: <Bus className="w-4 h-4" /> },
];

export default function GuestTravelPrefs({ token }: { token: string }) {
  const { data: guestData, isLoading } = useGuestPortal(token);
  const updateTravelPrefs = useUpdateTravelPrefs(token);
  const updateBleisure = useUpdateBleisure(token);
  const [, navigate] = useLocation();

  // Arrival
  const [arrivalMode, setArrivalMode] = useState<TransportMode>("group_flight");
  const [arrivalPnr, setArrivalPnr] = useState("");
  const [originCity, setOriginCity] = useState("");
  const [arrivalNotes, setArrivalNotes] = useState("");

  // Departure
  const [departureMode, setDepartureMode] = useState<TransportMode>("group_flight");
  const [departurePnr, setDeparturePnr] = useState("");
  const [departureNotes, setDepartureNotes] = useState("");

  // Hotel
  const [hotelMode, setHotelMode] = useState<"group" | "own" | "partial">("group");
  const [partialCheckIn, setPartialCheckIn] = useState("");
  const [partialCheckOut, setPartialCheckOut] = useState("");

  useEffect(() => {
    if (guestData) {
      if (guestData.arrivalMode) setArrivalMode(guestData.arrivalMode as TransportMode);
      else if (guestData.selfManageArrival) setArrivalMode("own_flight");

      if (guestData.departureMode) setDepartureMode(guestData.departureMode as TransportMode);
      else if (guestData.selfManageDeparture) setDepartureMode("own_flight");

      if (guestData.arrivalPnr) setArrivalPnr(guestData.arrivalPnr);
      if (guestData.departurePnr) setDeparturePnr(guestData.departurePnr);
      if (guestData.originCity) setOriginCity(guestData.originCity);
      if (guestData.specialRequests) {
        // journey notes for "other" mode are stored in specialRequests
        setArrivalNotes(guestData.specialRequests);
      }

      if (guestData.extendedCheckIn || guestData.extendedCheckOut) {
        setHotelMode("partial");
        if (guestData.extendedCheckIn) {
          setPartialCheckIn(format(new Date(guestData.extendedCheckIn), "yyyy-MM-dd"));
        }
        if (guestData.extendedCheckOut) {
          setPartialCheckOut(format(new Date(guestData.extendedCheckOut), "yyyy-MM-dd"));
        }
      }
    }
  }, [guestData]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin text-primary w-8 h-8" />
      </div>
    );
  }

  if (!guestData) {
    return <div className="p-10 text-center">Invalid access link</div>;
  }

  const event = guestData.event;
  const hostCheckIn = event?.hostCheckIn ? new Date(event.hostCheckIn) : null;
  const hostCheckOut = event?.hostCheckOut ? new Date(event.hostCheckOut) : null;
  const bleisureRate = guestData.bleisureRatePerNight ?? 250;
  const bleisureRateEstimated = !guestData.bleisureRatePerNight;

  let extraNightsCost = 0;
  let preNights = 0;
  let postNights = 0;
  if (hotelMode === "partial" && partialCheckIn && partialCheckOut && hostCheckIn && hostCheckOut) {
    const pci = new Date(partialCheckIn);
    const pco = new Date(partialCheckOut);
    preNights = Math.max(0, differenceInCalendarDays(hostCheckIn, pci));
    postNights = Math.max(0, differenceInCalendarDays(pco, hostCheckOut));
    extraNightsCost = (preNights + postNights) * bleisureRate;
  }

  const isArrivalSelfManaged = arrivalMode !== "group_flight";
  const isDepartureSelfManaged = departureMode !== "group_flight";

  const handleSave = async () => {
    try {
      await updateTravelPrefs.mutateAsync({
        selfManageArrival: isArrivalSelfManaged,
        selfManageDeparture: isDepartureSelfManaged,
        arrivalMode,
        departureMode,
        arrivalPnr: (arrivalMode === "own_flight" || arrivalMode === "train") ? arrivalPnr : undefined,
        departurePnr: (departureMode === "own_flight" || departureMode === "train") ? departurePnr : undefined,
        originCity: originCity || undefined,
        journeyNotes: arrivalMode === "other" ? arrivalNotes : (departureMode === "other" ? departureNotes : undefined),
      });

      if (hotelMode === "partial" && partialCheckIn && partialCheckOut) {
        await updateBleisure.mutateAsync({
          extendedCheckIn: new Date(partialCheckIn),
          extendedCheckOut: new Date(partialCheckOut),
        });
      } else if (hotelMode !== "partial") {
        await updateBleisure.mutateAsync({
          extendedCheckIn: undefined,
          extendedCheckOut: undefined,
        });
      }

      toast({ title: "Travel preferences saved!" });
      navigate(`/guest/${token}/summary`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save preferences",
        variant: "destructive",
      });
    }
  };

  const isSaving = updateTravelPrefs.isPending || updateBleisure.isPending;

  function TransportSelector({
    value,
    onChange,
    id,
    groupLabel,
    groupSubtext,
    pnr,
    onPnrChange,
    notes,
    onNotesChange,
    city,
    onCityChange,
    showCity,
  }: {
    value: TransportMode;
    onChange: (v: TransportMode) => void;
    id: string;
    groupLabel?: React.ReactNode;
    groupSubtext?: string;
    pnr: string;
    onPnrChange: (v: string) => void;
    notes: string;
    onNotesChange: (v: string) => void;
    city?: string;
    onCityChange?: (v: string) => void;
    showCity?: boolean;
  }) {
    const selected = TRANSPORT_OPTIONS.find((o) => o.value === value);
    return (
      <>
        <RadioGroup
          value={value}
          onValueChange={(v) => onChange(v as TransportMode)}
          className="space-y-2"
        >
          {/* Group transport option */}
          <div className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${value === "group_flight" ? "border-primary bg-primary/5" : "border-border"}`}>
            <RadioGroupItem value="group_flight" id={`${id}-group`} className="mt-0.5" />
            <label htmlFor={`${id}-group`} className="cursor-pointer flex-1">
              <div className="font-medium flex items-center gap-2">
                <Plane className="w-4 h-4" /> Group transport
              </div>
              {groupSubtext ? (
                <div className="text-sm text-muted-foreground mt-1">{groupSubtext}</div>
              ) : (
                <div className="text-sm text-muted-foreground mt-1">Group travel details will be shared by the event team</div>
              )}
              {groupLabel}
            </label>
          </div>

          {/* Own flight */}
          <div className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${value === "own_flight" ? "border-primary bg-primary/5" : "border-border"}`}>
            <RadioGroupItem value="own_flight" id={`${id}-own_flight`} className="mt-0.5" />
            <label htmlFor={`${id}-own_flight`} className="cursor-pointer flex-1">
              <div className="font-medium flex items-center gap-2">
                <Plane className="w-4 h-4" /> Own flight
              </div>
              <div className="text-sm text-muted-foreground mt-1">Self-pay — you manage your own flight</div>
            </label>
          </div>

          {/* Train */}
          <div className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${value === "train" ? "border-primary bg-primary/5" : "border-border"}`}>
            <RadioGroupItem value="train" id={`${id}-train`} className="mt-0.5" />
            <label htmlFor={`${id}-train`} className="cursor-pointer flex-1">
              <div className="font-medium flex items-center gap-2">
                <Train className="w-4 h-4" /> Train
              </div>
              <div className="text-sm text-muted-foreground mt-1">Self-pay — travelling by rail</div>
            </label>
          </div>

          {/* Other */}
          <div className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${value === "other" ? "border-primary bg-primary/5" : "border-border"}`}>
            <RadioGroupItem value="other" id={`${id}-other`} className="mt-0.5" />
            <label htmlFor={`${id}-other`} className="cursor-pointer flex-1">
              <div className="font-medium flex items-center gap-2">
                <Bus className="w-4 h-4" /> Other (bus / car / cab)
              </div>
              <div className="text-sm text-muted-foreground mt-1">Self-pay — you arrange your own transport</div>
            </label>
          </div>
        </RadioGroup>

        {/* Context fields based on mode */}
        {(value === "own_flight" || value === "train") && (
          <div className="pt-2 space-y-3">
            {showCity && onCityChange && (
              <div className="space-y-2">
                <Label>Your departure city / airport</Label>
                <Input
                  placeholder="e.g., Mumbai, BOM"
                  value={city ?? ""}
                  onChange={(e) => onCityChange(e.target.value)}
                  className="max-w-xs"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>{selected?.pnrLabel ?? "PNR / Booking Reference"} (optional)</Label>
              <Input
                placeholder="e.g., ABC123"
                value={pnr}
                onChange={(e) => onPnrChange(e.target.value)}
                className="max-w-xs"
              />
              <p className="text-xs text-muted-foreground">Share your reference so the ground team can coordinate</p>
            </div>
          </div>
        )}

        {value === "group_flight" && showCity && onCityChange && (
          <div className="pt-2 space-y-2">
            <Label>Your departure city / airport</Label>
            <Input
              placeholder="e.g., Mumbai, BOM"
              value={city ?? ""}
              onChange={(e) => onCityChange(e.target.value)}
              className="max-w-xs"
            />
            <p className="text-xs text-muted-foreground">Helps the team coordinate the right group flight for you</p>
          </div>
        )}

        {value === "other" && (
          <div className="pt-2 space-y-2">
            <Label>Journey notes (optional)</Label>
            <Textarea
              placeholder="e.g., taking a bus from Pune, arriving around 2pm"
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              rows={2}
              className="max-w-sm"
            />
          </div>
        )}
      </>
    );
  }

  return (
    <GuestLayout step={2} token={token}>
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-serif text-primary mb-2">Travel Preferences</h1>
          <p className="text-muted-foreground">Let us know how you'd like to get there</p>
        </div>

        {/* Arrival */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plane className="w-5 h-5 text-primary" />
              Arrival
            </CardTitle>
            <CardDescription>How are you arriving?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <TransportSelector
              value={arrivalMode}
              onChange={setArrivalMode}
              id="arrival"
              groupSubtext={
                event?.arrivalFlight
                  ? `${event.arrivalFlight}${guestData.arrivalDate ? ` · ${format(new Date(guestData.arrivalDate), "MMM dd, h:mm a")}` : ""}`
                  : undefined
              }
              groupLabel={<Badge variant="secondary" className="mt-2 text-xs">Host covered</Badge>}
              pnr={arrivalPnr}
              onPnrChange={setArrivalPnr}
              notes={arrivalNotes}
              onNotesChange={setArrivalNotes}
              city={originCity}
              onCityChange={setOriginCity}
              showCity
            />
          </CardContent>
        </Card>

        {/* Departure */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plane className="w-5 h-5 text-primary rotate-180" />
              Departure
            </CardTitle>
            <CardDescription>How are you heading back?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <TransportSelector
              value={departureMode}
              onChange={setDepartureMode}
              id="departure"
              groupSubtext={
                event?.departureFlight
                  ? `${event.departureFlight}${guestData.departureDate ? ` · ${format(new Date(guestData.departureDate), "MMM dd, h:mm a")}` : ""}`
                  : undefined
              }
              groupLabel={<Badge variant="secondary" className="mt-2 text-xs">Host covered</Badge>}
              pnr={departurePnr}
              onPnrChange={setDeparturePnr}
              notes={departureNotes}
              onNotesChange={setDepartureNotes}
              showCity={false}
            />
            {isDepartureSelfManaged && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-800">
                  Your return differs from the group. You can also search and book a return flight in the Add-ons step.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hotel Stay */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hotel className="w-5 h-5 text-primary" />
              Hotel Stay
            </CardTitle>
            <CardDescription>
              {hostCheckIn && hostCheckOut
                ? `Group stay: ${format(hostCheckIn, "MMM dd")} – ${format(hostCheckOut, "MMM dd, yyyy")}`
                : "Group hotel details to be confirmed"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup
              value={hotelMode}
              onValueChange={(v) => setHotelMode(v as "group" | "own" | "partial")}
              className="space-y-3"
            >
              <div className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${hotelMode === "group" ? "border-primary bg-primary/5" : "border-border"}`}>
                <RadioGroupItem value="group" id="hotel-group" className="mt-0.5" />
                <label htmlFor="hotel-group" className="cursor-pointer flex-1">
                  <div className="font-medium">Use the group hotel</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {hostCheckIn && hostCheckOut
                      ? `${format(hostCheckIn, "MMM dd")} – ${format(hostCheckOut, "MMM dd")}`
                      : "Dates to be confirmed"}
                  </div>
                  <Badge variant="secondary" className="mt-2 text-xs">Host covered</Badge>
                </label>
              </div>

              <div className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${hotelMode === "partial" ? "border-primary bg-primary/5" : "border-border"}`}>
                <RadioGroupItem value="partial" id="hotel-partial" className="mt-0.5" />
                <label htmlFor="hotel-partial" className="cursor-pointer flex-1">
                  <div className="font-medium">Extend my stay</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Arrive early or stay later — ₹{bleisureRate.toLocaleString('en-IN')}/night{bleisureRateEstimated ? " (est.)" : ""} · Self-pay
                  </div>
                </label>
              </div>

              <div className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${hotelMode === "own" ? "border-primary bg-primary/5" : "border-border"}`}>
                <RadioGroupItem value="own" id="hotel-own" className="mt-0.5" />
                <label htmlFor="hotel-own" className="cursor-pointer flex-1">
                  <div className="font-medium">I'll book my own hotel</div>
                  <div className="text-sm text-muted-foreground mt-1">Self-pay — you arrange your own accommodation</div>
                </label>
              </div>
            </RadioGroup>

            {hotelMode === "partial" && (
              <div className="space-y-4 pt-2 p-4 bg-muted/30 rounded-lg border">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="partialCheckIn">My check-in date</Label>
                    <Input
                      id="partialCheckIn"
                      type="date"
                      value={partialCheckIn}
                      max={hostCheckIn ? format(hostCheckIn, "yyyy-MM-dd") : undefined}
                      onChange={(e) => setPartialCheckIn(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">On or before {hostCheckIn ? format(hostCheckIn, "MMM dd") : "group check-in"}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="partialCheckOut">My check-out date</Label>
                    <Input
                      id="partialCheckOut"
                      type="date"
                      value={partialCheckOut}
                      min={hostCheckOut ? format(hostCheckOut, "yyyy-MM-dd") : undefined}
                      onChange={(e) => setPartialCheckOut(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">On or after {hostCheckOut ? format(hostCheckOut, "MMM dd") : "group check-out"}</p>
                  </div>
                </div>

                {extraNightsCost > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <span className="font-medium">{preNights + postNights} extra night{preNights + postNights !== 1 ? "s" : ""}</span>
                        <span className="text-muted-foreground"> × ₹{bleisureRate.toLocaleString('en-IN')}{bleisureRateEstimated ? " (est.)" : ""}</span>
                      </div>
                      <div className="font-semibold text-amber-800">
                        ₹{extraNightsCost.toLocaleString('en-IN')}{bleisureRateEstimated ? "*" : ""}
                      </div>
                    </div>
                    {bleisureRateEstimated && (
                      <p className="text-xs text-muted-foreground">* Estimated — your event coordinator will confirm the final rate</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Save & Continue */}
        <div className="flex justify-between items-center pt-4 pb-8">
          <Button variant="outline" onClick={() => navigate(`/guest/${token}/rsvp`)}>
            ← Back
          </Button>
          <Button
            size="lg"
            className="px-10"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <><Loader2 className="animate-spin mr-2 w-4 h-4" />Saving...</>
            ) : (
              <>Review My Booking <ArrowRight className="w-4 h-4 ml-2" /></>
            )}
          </Button>
        </div>
      </div>
    </GuestLayout>
  );
}
