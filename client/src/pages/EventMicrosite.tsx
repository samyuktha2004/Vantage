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
import { useState, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { format } from "date-fns";

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

  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regDone, setRegDone] = useState(false);

  const { data: event, isLoading, error } = useQuery({
    queryKey: ["microsite", eventCode],
    queryFn: () => fetchMicrosite(eventCode),
    enabled: !!eventCode,
    retry: false,
  });

  const registerMutation = useMutation({
    mutationFn: async (body: { name: string; email: string; phone: string }) => {
      const res = await fetch(`/api/microsite/${eventCode}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? "Registration failed");
      }
      return res.json();
    },
    onSuccess: () => setRegDone(true),
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
        setLookupError("No booking found with that reference. Please check and try again.");
      } else {
        setLookupFound(true);
        // Store token in state so we can navigate on "View Portal" click
        (window as any).__guestToken = result.token;
      }
    } catch (err: any) {
      setLookupError(err.message);
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
        body: JSON.stringify({ bookingRef: bookingRef.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? "Failed to record decline");
      }
      setDeclineDone(true);
    } catch (err: any) {
      setLookupError(err.message);
    } finally {
      setDeclineLoading(false);
    }
  };

  const handleRegister = () => {
    if (!regName || !regEmail) return;
    registerMutation.mutate({ name: regName, email: regEmail, phone: regPhone });
  };

  // ── Loading / Error states ──
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center px-4">
        <div className="text-6xl">404</div>
        <h1 className="text-2xl font-serif font-semibold">Event not found</h1>
        <p className="text-muted-foreground">
          The event code <strong>{eventCode}</strong> does not exist or is not yet published.
        </p>
        <p className="text-sm text-muted-foreground">Contact your travel agent or event organiser for the correct link.</p>
      </div>
    );
  }

  const eventDate = event.date ? new Date(event.date) : null;
  const primaryColor: string = (themeStyle as any)["--event-primary"] ?? "#1B2D5B";

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

        <div className="relative z-10 max-w-3xl mx-auto text-center py-20 px-4">
          <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-3">
            You are invited
          </p>
          <h1 className="text-4xl md:text-6xl font-serif font-bold mb-5 drop-shadow-md">
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
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-10">

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

        {/* Event Schedule */}
        {event.itinerary && event.itinerary.length > 0 && (
          <section>
            <h2 className="text-xl font-serif font-semibold mb-5">Event Schedule</h2>
            <div className="space-y-0">
              {event.itinerary.map((item: any, i: number) => (
                <div key={i} className="flex gap-4 items-start">
                  {/* Timeline stem */}
                  <div className="flex flex-col items-center shrink-0">
                    <div
                      className="w-3 h-3 rounded-full mt-1.5 ring-2 ring-offset-2"
                      style={{ backgroundColor: primaryColor, "--tw-ring-color": `${primaryColor}40` } as any}
                    />
                    {i < event.itinerary.length - 1 && (
                      <div className="w-px flex-1 bg-border mt-1 min-h-[32px]" />
                    )}
                  </div>
                  {/* Content */}
                  <div className="pb-5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{item.title}</p>
                      {item.isMandatory && (
                        <Badge variant="secondary" className="text-xs">Mandatory</Badge>
                      )}
                    </div>
                    {(item.startTime || item.location) && (
                      <div className="flex flex-wrap gap-3 mt-0.5">
                        {item.startTime && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {typeof item.startTime === "string"
                              ? item.startTime
                              : format(new Date(item.startTime), "h:mm a")}
                            {item.endTime
                              ? ` – ${typeof item.endTime === "string" ? item.endTime : format(new Date(item.endTime), "h:mm a")}`
                              : ""}
                          </p>
                        )}
                        {item.location && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {item.location}
                          </p>
                        )}
                      </div>
                    )}
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <Separator />

        {/* ── Access Portal ── */}
        <section>
          <h2 className="text-xl font-serif font-semibold mb-2">Access Your Invitation</h2>
          <p className="text-sm text-muted-foreground mb-6">
            If you received a booking reference from the organiser, use it below to access your personalised portal or to let us know you won't be attending.
          </p>

          {/* Tab switcher */}
          <div className="flex gap-2 mb-6 flex-wrap">
            <button
              onClick={() => setTab("lookup")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium border transition-colors ${
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
              className={`flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium border transition-colors ${
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
                      Your booking reference was sent to you by the organiser (e.g. GP123456).
                    </p>
                    <div className="flex gap-2">
                      <Input
                        id="ref"
                        placeholder="GP123456"
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
                        className="text-white"
                      >
                        {lookupLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <><ArrowRight className="w-4 h-4" /> Go</>
                        )}
                      </Button>
                    </div>
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
                      Your interest has been noted. The organiser will review and send you a personalised link once confirmed.
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Register your interest. The organiser will send you a personalised access link after confirmation.
                    </p>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="name">Full Name *</Label>
                        <Input id="name" placeholder="Your name" value={regName} onChange={(e) => setRegName(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="email">Email Address *</Label>
                        <Input id="email" type="email" placeholder="you@example.com" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input id="phone" placeholder="+91 98765 43210" value={regPhone} onChange={(e) => setRegPhone(e.target.value)} />
                      </div>
                      {registerMutation.error && (
                        <p className="text-sm text-destructive">
                          {(registerMutation.error as Error).message}
                        </p>
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
