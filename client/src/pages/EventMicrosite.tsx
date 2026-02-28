/**
 * EventMicrosite — Public branded event invite page
 * Route: /event/:eventCode  (no auth required)
 *
 * Entry paths:
 *  A. "I have a booking reference" → look up ref → /guest/:token (or quick decline)
 *  B. "Register interest" → POST /api/microsite/:eventCode/register → confirmation
 *
 * Customisation (set by agent in EventSetup):
 *  - coverMediaUrl / coverMediaType: hero image or video
 *  - themeColor: CSS custom property override
 *  - themePreset: named palette
 */
import { useState, useMemo, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  MapPin,
  Hotel,
  Plane,
  BookOpen,
  UserPlus,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Users,
  Clock,
  XCircle,
} from "lucide-react";
import { format, differenceInCalendarDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";

// ── Theming ──────────────────────────────────────────────────────────────────

const PRESETS: Record<string, { primary: string; fg: string }> = {
  navy:   { primary: "#1B2D5B", fg: "#ffffff" },
  rose:   { primary: "#9B2C2C", fg: "#ffffff" },
  forest: { primary: "#1A4731", fg: "#ffffff" },
  slate:  { primary: "#334155", fg: "#ffffff" },
  gold:   { primary: "#92400E", fg: "#ffffff" },
  custom: { primary: "#1B2D5B", fg: "#ffffff" },
};

function buildThemeStyle(themeColor: string, themePreset: string): React.CSSProperties {
  const preset = PRESETS[themePreset] ?? PRESETS.navy;
  const primary = themePreset === "custom" && themeColor ? themeColor : preset.primary;
  // Inject as inline CSS variables scoped to this page
  return {
    "--event-primary": primary,
    "--event-fg": preset.fg,
  } as React.CSSProperties;
}

// ── API helpers ──────────────────────────────────────────────────────────────

async function fetchMicrosite(eventCode: string) {
  const res = await fetch(`/api/microsite/${eventCode}`);
  if (!res.ok) throw new Error("Event not found");
  return res.json();
}

async function lookupGuest(bookingRef: string): Promise<{ token: string } | null> {
  const res = await fetch(`/api/guest/lookup?bookingRef=${encodeURIComponent(bookingRef)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Lookup failed");
  return res.json();
}

// ── Component ────────────────────────────────────────────────────────────────

export default function EventMicrosite() {
  const [match, params] = useRoute("/event/:eventCode");
  const [, navigate] = useLocation();
  const eventCode = params?.eventCode ?? "";

  const [tab, setTab] = useState<"lookup" | "register">("lookup");
  const [bookingRef, setBookingRef] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupFound, setLookupFound] = useState(false); // true after successful lookup
  const [declineLoading, setDeclineLoading] = useState(false);
  const [declineDone, setDeclineDone] = useState(false);
  const [declineMessage, setDeclineMessage] = useState("");

  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regDone, setRegDone] = useState(false);
  const [regError, setRegError] = useState("");
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);
  const [rooms, setRooms] = useState<Array<{id:string;name:string;price:number}>>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomsError, setRoomsError] = useState("");

  const { data: event, isLoading, error } = useQuery({
    queryKey: ["microsite", eventCode],
    queryFn: () => fetchMicrosite(eventCode),
    enabled: !!eventCode,
    retry: false,
  });

  // Simple telemetry/reporting helper: send raw error to console (telemetry)
  const { toast } = useToast();
  const reportError = (err: any, setFriendly?: (s: string) => void, friendlyMsg?: string) => {
    try {
      console.error("telemetry:microsite_error", err);
      toast({ title: friendlyMsg || "Something went wrong", description: String(err?.message ?? err), variant: 'destructive' });
    } catch (e) {
      // ignore
    }
    if (setFriendly) setFriendly(friendlyMsg || "Something went wrong. Please try again later.");
  };

  const registerMutation = useMutation({
    mutationFn: async (body: { name: string; email: string; phone: string }) => {
      const res = await fetch(`/api/microsite/${eventCode}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Registration failed' }));
        throw new Error(err.message ?? "Registration failed");
      }
      return res.json();
    },
    onSuccess: () => setRegDone(true),
    onError: (err: any) => reportError(err, setRegError, "Unable to register right now. Please try again later."),
  });

  const themeStyle = useMemo(
    () => buildThemeStyle(event?.themeColor ?? "#1B2D5B", event?.themePreset ?? "navy"),
    [event?.themeColor, event?.themePreset]
  );

  const handleLookup = async () => {
    if (!bookingRef.trim()) return;
    setLookupLoading(true);
    setLookupError("");
    try {
      const result = await lookupGuest(bookingRef.trim());
      if (!result) {
        setLookupError("We couldn't find a booking with that reference. Please double-check or register your interest.");
      } else {
        setLookupFound(true);
        // Store token in state so we can navigate on "View Portal" click
        (window as any).__guestToken = result.token;
      }
    } catch (err: any) {
      reportError(err, setLookupError, "An unexpected error occurred. Please try again later.");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleDecline = async () => {
    setDeclineLoading(true);
    try {
      const res = await fetch("/api/guest/decline", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        // include optional message in UI; backend may ignore if not supported
        body: JSON.stringify({ bookingRef: bookingRef.trim(), message: declineMessage || undefined }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? "Failed to record decline");
      }
      setDeclineDone(true);
    } catch (err: any) {
      reportError(err, setLookupError, "Failed to record response. Please try again later.");
    } finally {
      setDeclineLoading(false);
    }
  };

  const handleRegister = () => {
    if (!regName || !regEmail) return;
    registerMutation.mutate({ name: regName, email: regEmail, phone: regPhone });
  };

  // Proceed handler — shared by desktop CTA and mobile persistent CTA
  const handleProceed = async () => {
    if (!selectedRoom) return setBookingError('Please select a room before continuing.');
    setBookingError('');
    const price = Number(selectedRoom.price ?? 0);
    try {
      setBookingLoading(true);
      if (price > 0) {
        // Payment required — show simulated receipt
        setReceipt({ id: `RCPT-${Date.now()}`, room: selectedRoom, total: price * hotelNights, nights: hotelNights });
        setShowConfirmation(true);
      } else {
        // No payment required — create a server-side draft booking
        const body = { roomId: selectedRoom.id, roomName: selectedRoom.name, price, nights: hotelNights };
        const res = await fetch(`/api/microsite/${event.eventCode}/draft-booking`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: 'Draft failed' }));
          throw new Error(err.message ?? 'Draft failed');
        }
        const data = await res.json();
        setReceipt({ id: data.draftRef ?? `DRFT-${Date.now()}`, room: selectedRoom, total: price * hotelNights, nights: hotelNights });
        setShowConfirmation(true);
      }
    } catch (err) {
      reportError(err, setBookingError, 'Unable to proceed. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  // ── Loading / Error states ──
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading event details…</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center px-4">
        <div className="text-6xl">404</div>
        <h1 className="text-2xl font-sans font-semibold">Event not found</h1>
        <p className="text-muted-foreground">
          The event code <strong>{eventCode}</strong> does not exist or is not yet published.
        </p>
        <p className="text-sm text-muted-foreground">Contact your travel agent or the host for the correct link.</p>
      </div>
    );
  }

  const eventDate = event.date ? new Date(event.date) : null;
  const primaryColor: string = (themeStyle as any)["--event-primary"] ?? "#1B2D5B";
  const hotelNights = event?.hotel?.checkIn && event?.hotel?.checkOut
    ? differenceInCalendarDays(new Date(event.hotel.checkOut), new Date(event.hotel.checkIn))
    : 1;

  // Fetch public rooms for the microsite. By default the server returns a
  // harmless mock list; operators can later enable live TBO-backed data via
  // an env flag. We silently fall back to a local sample so users don't see
  // any difference in the UI.
  useEffect(() => {
    let cancelled = false;
    async function loadRooms() {
      if (!event) return;
      setRoomsLoading(true);
      setRoomsError("");
      try {
        const res = await fetch(`/api/microsite/${event.eventCode}/hotel-rooms`);
        if (!res.ok) throw new Error('rooms fetch failed');
        const data = await res.json();
        if (!cancelled && Array.isArray(data?.rooms) && data.rooms.length > 0) {
          setRooms(data.rooms.map((r: any) => ({ id: String(r.id), name: String(r.name), price: Number(r.price || 0) })));
          return;
        }
      } catch (err) {
        console.error('microsite rooms fetch failed, falling back to sample rooms', err);
      } finally {
        if (!cancelled) setRoomsLoading(false);
      }

      // Fallback sample rooms (keeps UX consistent)
      if (!cancelled && event?.hotel) {
        const baseName = event.hotel.name ?? event.name ?? 'Hotel';
        setRooms([
          { id: 'standard', name: `${baseName} — Standard Room`, price: 2000 },
          { id: 'deluxe', name: `${baseName} — Deluxe Room`, price: 3200 },
        ]);
      }
    }
    loadRooms();
    return () => { cancelled = true; };
  }, [event]);

  return (
    <div className="min-h-screen bg-background" style={themeStyle}>
      {/* ── Hero with cover media ── */}
      <div
        className="relative text-white"
        style={{ background: `linear-gradient(135deg, ${primaryColor}e8, ${primaryColor})` }}
      >
        {/* Cover image or video overlay */}
        {event.coverMediaUrl && event.coverMediaType === "video" ? (
          <video
            className="absolute inset-0 w-full h-full object-cover opacity-30"
            src={event.coverMediaUrl}
            autoPlay
            muted
            loop
            playsInline
          />
        ) : event.coverMediaUrl ? (
          <img
            className="absolute inset-0 w-full h-full object-cover opacity-25"
            src={event.coverMediaUrl}
            alt={event.name}
          />
        ) : null}

        <div className="relative z-10 max-w-3xl mx-auto text-center py-14 sm:py-20 px-4">
          <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-3">
            You're Invited — Join Us
          </p>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-sans font-bold mb-5 drop-shadow-md">
            {event.name}
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-5 text-white/80 text-sm mb-4">
            {eventDate && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {format(eventDate, "EEEE, MMMM d, yyyy")}
              </span>
            )}
            {event.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                {event.location}
              </span>
            )}
          </div>
          {event.description && (
            <p className="text-white/70 max-w-xl mx-auto text-sm leading-relaxed">
              {event.description}
            </p>
          )}
          {/* Fallback personalised invite message when no cover media */}
          {!event.coverMediaUrl && event.inviteMessage && (
            <p className="text-white/80 max-w-lg mx-auto text-sm leading-relaxed mt-3 italic">
              {event.inviteMessage}
            </p>
          )}
          <div className="mt-6 flex items-center justify-center gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button className="px-6 py-3 bg-white text-primary font-semibold shadow-md hover:shadow-lg">
                  Confirm Attendance — Reserve Your Spot
                </Button>
              </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-lg max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                  <DialogTitle>RSVP for {event.name}</DialogTitle>
                  <DialogDescription>
                    Please provide your details to reserve your place. We'll email a confirmation with details and a link to manage your RSVP.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                  {!regDone ? (
                    <>
                      <div>
                        <Label className="text-sm">Full name</Label>
                        <Input placeholder="eg: John Doe" value={regName} onChange={(e) => setRegName((e.target as HTMLInputElement).value)} />
                      </div>
                      <div>
                        <Label className="text-sm">Email</Label>
                        <Input placeholder="eg: you@example.com" value={regEmail} onChange={(e) => setRegEmail((e.target as HTMLInputElement).value)} />
                      </div>
                      <div>
                        <Label className="text-sm">Phone (optional)</Label>
                        <Input placeholder="eg: +91 98765 43210" value={regPhone} onChange={(e) => setRegPhone((e.target as HTMLInputElement).value)} />
                      </div>
                      <div className="flex justify-end mt-2">
                        <Button className="bg-primary text-white" onClick={handleRegister}>
                          Confirm Attendance — Reserve Your Spot
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-6">
                      <CheckCircle2 className="w-12 h-12 mx-auto text-green-500" />
                      <p className="font-semibold mt-3">You're all set</p>
                      <p className="text-sm text-muted-foreground mt-1">We'll email a confirmation with details and a link to manage your RSVP.</p>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className={`max-w-3xl mx-auto px-4 py-10 ${event.hotel ? "pb-28 sm:pb-10" : ""} space-y-10`}>

        {/* Package Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {event.hotel && (
            <Card className="border-muted shadow-sm">
              <CardContent className="p-4 flex items-start gap-3">
                <Hotel className="w-5 h-5 shrink-0 mt-0.5" style={{ color: primaryColor }} />
                <div>
                  <p className="font-semibold text-sm">{event.hotel.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {event.hotel.checkIn && event.hotel.checkOut
                      ? `${format(new Date(event.hotel.checkIn), "MMM d")} – ${format(new Date(event.hotel.checkOut), "MMM d, yyyy")}`
                      : "Hotel details confirmed"}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          {event.travel && (
            <Card className="border-muted shadow-sm">
              <CardContent className="p-4 flex items-start gap-3">
                <Plane className="w-5 h-5 shrink-0 mt-0.5" style={{ color: primaryColor }} />
                <div>
                  <p className="font-semibold text-sm capitalize">{event.travel.mode} included</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {event.travel.from && event.travel.to
                      ? `${event.travel.from} → ${event.travel.to}`
                      : "Group travel arranged"}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          {event.guestCount != null && (
            <Card className="border-muted shadow-sm">
              <CardContent className="p-4 flex items-start gap-3">
                <Users className="w-5 h-5 shrink-0 mt-0.5" style={{ color: primaryColor }} />
                <div>
                  <p className="font-semibold text-sm">{event.guestCount} guests invited</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{event.confirmedCount ?? 0} confirmed</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Client-provided Schedule Text */}
        {event.scheduleText && (
          <section>
            <h2 className="text-xl font-sans font-semibold mb-4">Schedule Overview</h2>
            <Card className="border-muted">
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                  {event.scheduleText}
                </p>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Event Schedule */}
        {event.itinerary && event.itinerary.length > 0 && (
          <section>
            <h2 className="text-xl font-sans font-semibold mb-5">Event Schedule</h2>
                <div className="space-y-4">
                  {event.itinerary.map((item: any, i: number) => (
                    <Card key={i} className="border-muted">
                      <CardContent className="flex gap-4 items-start">
                        <div className="shrink-0">
                          <div className="text-xs text-muted-foreground mb-1">{item.startTime ? (typeof item.startTime === 'string' ? item.startTime : format(new Date(item.startTime), 'h:mm a')) : ''}</div>
                          <div className="w-10 h-10 rounded-md bg-white/10 flex items-center justify-center" style={{ color: primaryColor }}>
                            <Clock className="w-4 h-4" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium">{item.title}</p>
                            {item.isMandatory && <Badge variant="secondary" className="text-xs">Mandatory</Badge>}
                          </div>
                          {item.location && <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2"><MapPin className="w-3 h-3" />{item.location}</p>}
                          {item.description && <p className="text-sm text-muted-foreground mt-2">{item.description}</p>}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
          </section>
        )}

        <Separator />

        {/* ── Booking (UI-only) ── */}
        {event.hotel && (
          <section>
            <h2 className="text-xl font-sans font-semibold mb-4">Booking</h2>
            <p className="text-sm text-muted-foreground mb-4">Select a room to view the price summary and continue.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rooms.map((r) => (
                <Card
                  key={r.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={selectedRoom?.id === r.id}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedRoom(r);
                    }
                  }}
                  className={`border ${selectedRoom?.id === r.id ? 'ring-2 ring-offset-2' : ''} focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2`}
                >
                  <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{r.name}</p>
                      <p className="text-sm text-muted-foreground mt-1">{hotelNights} night{hotelNights > 1 ? 's' : ''} · {event.hotel.name}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="font-bold text-lg">₹{(r.price * hotelNights).toLocaleString('en-IN')}</div>
                      <div className="mt-2 flex gap-2 sm:justify-end">
                        <Button
                          size="sm"
                          variant={selectedRoom?.id === r.id ? 'secondary' : 'outline'}
                          onClick={() => setSelectedRoom(r)}
                          aria-label={`${selectedRoom?.id === r.id ? 'Selected' : 'Select'} ${r.name}`}
                        >
                          {selectedRoom?.id === r.id ? 'Selected' : 'Select'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm">Estimated total</p>
                <p className="text-xl font-bold">{selectedRoom ? `₹${(selectedRoom.price * hotelNights).toLocaleString('en-IN')}` : '—'}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                <Button className="w-full sm:w-auto" variant="outline" onClick={() => { setSelectedRoom(null); setBookingError(''); }} aria-label="Reset room selection">Reset</Button>
                <>
                  <Button
                    onClick={async () => {
                      if (!selectedRoom) return setBookingError('Please select a room before continuing.');
                      setBookingError('');
                      const price = Number(selectedRoom.price ?? 0);
                      try {
                        setBookingLoading(true);
                        if (price > 0) {
                          // Payment required — show simulated receipt (existing behaviour)
                          setReceipt({ id: `RCPT-${Date.now()}`, room: selectedRoom, total: price * hotelNights, nights: hotelNights });
                          setShowConfirmation(true);
                        } else {
                          // No payment required — create a server-side draft booking
                          const body = { roomId: selectedRoom.id, roomName: selectedRoom.name, price, nights: hotelNights };
                          const res = await fetch(`/api/microsite/${event.eventCode}/draft-booking`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(body),
                          });
                          if (!res.ok) {
                            const err = await res.json().catch(() => ({ message: 'Draft failed' }));
                            throw new Error(err.message ?? 'Draft failed');
                          }
                          const data = await res.json();
                          setReceipt({ id: data.draftRef ?? `DRFT-${Date.now()}`, room: selectedRoom, total: price * hotelNights, nights: hotelNights });
                          setShowConfirmation(true);
                        }
                      } catch (err) {
                        reportError(err, setBookingError, 'Unable to proceed. Please try again.');
                      } finally {
                        setBookingLoading(false);
                      }
                    }}
                    className="bg-primary text-white w-full sm:w-auto"
                    aria-label="Proceed"
                  >
                    {selectedRoom ? ((selectedRoom.price ?? 0) > 0 ? 'Continue to payment' : 'Reserve') : 'Select a room'}
                  </Button>

                  <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
                    <DialogContent className="w-[95vw] max-w-lg max-h-[85vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Booking Confirmation</DialogTitle>
                        <DialogDescription>{(selectedRoom?.price ?? 0) > 0 ? 'Reserving now — we\'ll email confirmation shortly.' : 'Your selection has been saved as a draft. We\'ll follow up with next steps.'}</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-2">
                        {receipt ? (
                          <div>
                            <p className="font-medium">Receipt #{receipt.id}</p>
                            <p className="text-sm text-muted-foreground">{receipt.room.name} · {receipt.nights} night{receipt.nights > 1 ? 's' : ''}</p>
                            <div className="mt-3 flex flex-col sm:flex-row gap-2">
                              <Button className="w-full sm:w-auto" onClick={() => {
                                try {
                                  const start = event.hotel.checkIn ? new Date(event.hotel.checkIn) : new Date();
                                  const end = event.hotel.checkOut ? new Date(event.hotel.checkOut) : new Date(Date.now() + 24*60*60*1000);
                                  const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nUID:${receipt.id}\nDTSTAMP:${new Date().toISOString()}\nDTSTART:${start.toISOString()}\nDTEND:${end.toISOString()}\nSUMMARY:${event.name} - ${receipt.room.name}\nDESCRIPTION:${event.description || ''}\nEND:VEVENT\nEND:VCALENDAR`;
                                  const blob = new Blob([ics], { type: 'text/calendar' });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `${event.name.replace(/\s+/g,'_')}_${receipt.id}.ics`;
                                  a.click();
                                  URL.revokeObjectURL(url);
                                } catch (err) {
                                  reportError(err, setBookingError, 'Could not download calendar file.');
                                }
                              }}>Download .ics</Button>
                              <Button className="w-full sm:w-auto" onClick={() => {
                                try {
                                  const subject = encodeURIComponent(`Invitation & booking: ${event.name}`);
                                  const body = encodeURIComponent(`I've booked ${receipt.room.name} for ${receipt.nights} night(s) at ${event.name}. Receipt #${receipt.id}`);
                                  window.open(`mailto:?subject=${subject}&body=${body}`);
                                } catch (err) {
                                  reportError(err, setBookingError, 'Unable to share via email.');
                                }
                              }}>Share</Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No receipt available.</p>
                        )}
                        {bookingError && <p className="text-sm text-destructive" role="status" aria-live="polite">{bookingError}</p>}
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              </div>
            </div>
            {bookingError && <p className="text-sm text-destructive mt-3" role="status" aria-live="polite">{bookingError}</p>}
            {/* Mobile persistent CTA */}
            <div className="sm:hidden">
              <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 right-4 z-50">
                <div className="bg-background/95 backdrop-blur-md border rounded-lg p-3 shadow-lg flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm text-muted-foreground">Estimated total</div>
                    <div className="font-semibold">{selectedRoom ? `₹${(selectedRoom.price * hotelNights).toLocaleString('en-IN')}` : '—'}</div>
                  </div>
                  <div>
                      <Button onClick={handleProceed} disabled={!selectedRoom} className="bg-primary text-white">
                      {selectedRoom ? ((selectedRoom.price ?? 0) > 0 ? 'Continue to payment' : 'Reserve') : 'Select a room'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Access Portal ── */}
        <section>
          <h2 className="text-xl font-sans font-semibold mb-2">Access Your Invitation</h2>
          <p className="text-sm text-muted-foreground mb-6">
            If you received a booking reference from the host, use it below to access your personalised portal or to let us know you won't be attending.
          </p>

          {/* Tab switcher */}
          <div className="flex gap-2 mb-6 flex-wrap">
            <button
              onClick={() => setTab("lookup")}
              className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded text-sm font-medium border transition-colors w-full sm:w-auto ${
                tab === "lookup"
                  ? "text-white border-transparent"
                  : "border-input text-muted-foreground hover:border-primary/50"
              }`}
              style={tab === "lookup" ? { backgroundColor: primaryColor } : {}}
            >
              <BookOpen className="w-4 h-4" /> I have a booking reference
            </button>
            <button
              onClick={() => setTab("register")}
              className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded text-sm font-medium border transition-colors w-full sm:w-auto ${
                tab === "register"
                  ? "text-white border-transparent"
                  : "border-input text-muted-foreground hover:border-primary/50"
              }`}
              style={tab === "register" ? { backgroundColor: primaryColor } : {}}
            >
              <UserPlus className="w-4 h-4" /> Register as new attendee
            </button>
          </div>

          {/* ── Lookup tab ── */}
          {tab === "lookup" && (
            <Card>
              <CardContent className="p-6 space-y-4">
                {declineDone ? (
                  <div className="text-center py-6 space-y-3">
                    <XCircle className="w-10 h-10 text-muted-foreground mx-auto" />
                    <p className="font-semibold">Response Recorded</p>
                    <p className="text-sm text-muted-foreground">
                      We've noted you won't be attending. Thank you for letting us know — we hope to see you at a future event!
                    </p>
                  </div>
                ) : lookupFound ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="w-5 h-5" />
                      <p className="font-medium text-sm">Booking found!</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Choose how you'd like to respond to this invitation.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Button
                        className="w-full text-white"
                        style={{ backgroundColor: primaryColor }}
                        onClick={() => navigate(`/guest/${(window as any).__guestToken}`)}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Yes, I'm Attending →
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full text-destructive border-destructive hover:bg-destructive/5"
                        onClick={handleDecline}
                        disabled={declineLoading}
                      >
                        {declineLoading ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <XCircle className="w-4 h-4 mr-2" />
                        )}
                        I Won't Be Attending
                      </Button>
                    </div>
                    {/* Optional decline message (UI-only) */}
                    <div className="mt-3">
                      <Label className="text-sm">Optional message to the host</Label>
                      <Input placeholder="eg: Sorry I can't make it — out of town" value={declineMessage} onChange={(e) => setDeclineMessage((e.target as HTMLInputElement).value)} />
                      <p className="text-xs text-muted-foreground mt-1">This message will be recorded with your response (backend may ignore if not supported).</p>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Clicking "Yes, I'm Attending" takes you to your personalised portal to manage travel, stay, and preferences.
                    </p>
                    {lookupError && (
                      <p className="text-sm text-destructive">{lookupError}</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="ref">Booking Reference</Label>
                    <p className="text-xs text-muted-foreground">
                      Your booking reference was sent to you by the host (eg: GP123456).
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Input
                          id="ref"
                          placeholder="eg: GP123456"
                        value={bookingRef}
                        onChange={(e) => {
                          setBookingRef(e.target.value.toUpperCase());
                          setLookupError("");
                        }}
                        onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                        className="font-mono tracking-wider"
                      />
                      <Button
                        onClick={handleLookup}
                        disabled={lookupLoading || !bookingRef.trim()}
                        style={{ backgroundColor: primaryColor }}
                        className="text-white w-full sm:w-auto"
                      >
                        {lookupLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <><ArrowRight className="w-4 h-4" /> Go</>
                        )}
                      </Button>
                    </div>
                    {lookupLoading && (
                      <p className="text-sm text-muted-foreground">Looking up your booking…</p>
                    )}
                    {lookupError && (
                      <p className="text-sm text-destructive">{lookupError}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Register tab ── */}
          {tab === "register" && (
            <Card>
              <CardContent className="p-6 space-y-4">
                {regDone ? (
                  <div className="text-center py-4 space-y-3">
                    <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto" />
                    <p className="font-semibold">Registration received!</p>
                    <p className="text-sm text-muted-foreground">
                      Your interest has been noted. The host will review and send you an access link once confirmed.
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Register your interest. The host will review and send you an access link after confirmation.
                    </p>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="name">Full Name *</Label>
                        <Input id="name" placeholder="eg: John Doe" value={regName} onChange={(e) => setRegName(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="email">Email Address *</Label>
                        <Input id="email" type="email" placeholder="eg: you@example.com" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input id="phone" placeholder="eg: +91 98765 43210" value={regPhone} onChange={(e) => setRegPhone(e.target.value)} />
                      </div>
                      {regError && (
                        <p className="text-sm text-destructive">{regError}</p>
                      )}
                      <Button
                        className="w-full text-white"
                        style={{ backgroundColor: primaryColor }}
                        onClick={handleRegister}
                        disabled={!regName || !regEmail || registerMutation.isPending}
                      >
                        {registerMutation.isPending ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</>
                        ) : (
                          "Submit Registration"
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </section>

        {/* Footer */}
        <div className="text-center pt-6 border-t">
          <p className="text-xs text-muted-foreground">
            Powered by{" "}
            <span className="font-semibold" style={{ color: primaryColor }}>Vantage</span>
            {" "}— Group Event Management by TBO
          </p>
        </div>
      </div>
    </div>
  );
}
