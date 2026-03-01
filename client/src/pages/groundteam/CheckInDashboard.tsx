/**
 * CheckInDashboard — Mobile-optimised on-site check-in for ground team
 * Route: /groundteam/:eventId/checkin
 *
 * Ground team signs in with agent-issued credentials (scoped to one event).
 * They see a live guest list, can search by name/ref, and mark guests as arrived.
 */
import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  CheckCircle2,
  Users,
  Clock,
  Loader2,
  QrCode,
  AlertCircle,
  Utensils,
  StickyNote,
  RefreshCw,
  MapPin,
  X,
  UserPlus,
  Plane,
  UserX,
  LayoutDashboard,
  LogOut,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Html5Qrcode } from "html5-qrcode";

function flightStatusBorderClass(status?: string | null): string {
  switch (status) {
    case "landed":    return "border-l-4 border-l-green-500";
    case "on_time":   return "border-l-4 border-l-blue-500";
    case "delayed":   return "border-l-4 border-l-amber-500";
    case "cancelled": return "border-l-4 border-l-red-500";
    default:          return "";
  }
}

function flightStatusBadgeClass(status?: string | null): string {
  switch (status) {
    case "landed":    return "bg-green-100 text-green-700";
    case "on_time":   return "bg-blue-100 text-blue-700";
    case "delayed":   return "bg-amber-100 text-amber-700";
    case "cancelled": return "bg-red-100 text-red-700";
    default:          return "bg-muted text-muted-foreground";
  }
}

function flightStatusLabel(status?: string | null): string {
  switch (status) {
    case "landed":    return "Landed";
    case "on_time":   return "On time";
    case "delayed":   return "Delayed";
    case "cancelled": return "Cancelled";
    default:          return "Unknown";
  }
}

async function fetchCheckinStats(eventId: string) {
  const res = await fetch(`/api/events/${eventId}/checkin-stats`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load stats");
  return res.json();
}

async function fetchGuests(eventId: string) {
  const res = await fetch(`/api/events/${eventId}/guests`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load guests");
  return res.json();
}

async function fetchItinerary(eventId: string) {
  const res = await fetch(`/api/events/${eventId}/itinerary`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load itinerary");
  return res.json();
}

async function fetchEvent(eventId: string) {
  const res = await fetch(`/api/events/${eventId}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load event");
  return res.json();
}

async function markArrived(guestId: number) {
  const res = await fetch(`/api/groundteam/checkin/${guestId}`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to mark arrived");
  return res.json();
}

export default function CheckInDashboard() {
  const [match, params] = useRoute("/groundteam/:eventId/checkin");
  const [, navigate] = useLocation();
  const eventId = params?.eventId ?? "";
  const { user, logout, isLoggingOut } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [qrScannerError, setQrScannerError] = useState("");
  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const qrDivId = "qr-reader";

  // Walk-in registration
  const [showWalkInForm, setShowWalkInForm] = useState(false);
  const [walkInName, setWalkInName] = useState("");
  const [walkInEmail, setWalkInEmail] = useState("");
  const [walkInPhone, setWalkInPhone] = useState("");
  const [walkInMeal, setWalkInMeal] = useState("standard");

  const handleLogout = () => {
    logout();
  };

  const handleDashboardClick = () => {
    if (user?.role === "groundTeam") {
      navigate(`/groundteam/${eventId}/checkin`);
      return;
    }
    navigate("/dashboard");
  };

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ["checkin-stats", eventId],
    queryFn: () => fetchCheckinStats(eventId),
    enabled: !!eventId,
    refetchInterval: autoRefresh ? 30000 : false,
  });

  const { data: guests = [], isLoading: guestsLoading, refetch: refetchGuests } = useQuery({
    queryKey: ["guests-checkin", eventId],
    queryFn: () => fetchGuests(eventId),
    enabled: !!eventId,
    refetchInterval: autoRefresh ? 30000 : false,
  });

  const { data: itinerary = [] } = useQuery({
    queryKey: ["ground-itinerary", eventId],
    queryFn: () => fetchItinerary(eventId),
    enabled: !!eventId,
    refetchInterval: autoRefresh ? 60000 : false,
  });

  const { data: event } = useQuery({
    queryKey: ["ground-event", eventId],
    queryFn: () => fetchEvent(eventId),
    enabled: !!eventId,
    staleTime: 60000,
  });

  const arrivedMutation = useMutation({
    mutationFn: markArrived,
    onSuccess: () => {
      toast({ title: "Guest marked as arrived" });
      queryClient.invalidateQueries({ queryKey: ["guests-checkin", eventId] });
      queryClient.invalidateQueries({ queryKey: ["checkin-stats", eventId] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const noShowMutation = useMutation({
    mutationFn: async (guestId: number) => {
      const res = await fetch(`/api/groundteam/no-show/${guestId}`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("Failed to mark no-show");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Marked as no-show" });
      queryClient.invalidateQueries({ queryKey: ["guests-checkin", eventId] });
      queryClient.invalidateQueries({ queryKey: ["checkin-stats", eventId] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const walkInMutation = useMutation({
    mutationFn: async (data: { name: string; email?: string; phone?: string; mealPreference: string }) => {
      const res = await fetch(`/api/events/${eventId}/on-spot-register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to register walk-in guest");
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: `${walkInName} registered!`,
        description: `Booking ref: ${data.guest?.bookingRef}`,
      });
      setShowWalkInForm(false);
      setWalkInName(""); setWalkInEmail(""); setWalkInPhone(""); setWalkInMeal("standard");
      queryClient.invalidateQueries({ queryKey: ["guests-checkin", eventId] });
      queryClient.invalidateQueries({ queryKey: ["checkin-stats", eventId] });
    },
    onError: (err: Error) => {
      toast({ title: "Registration failed", description: err.message, variant: "destructive" });
    },
  });

  const flightStatusMutation = useMutation({
    mutationFn: async ({ guestId, flightStatus }: { guestId: number; flightStatus: string }) => {
      const res = await fetch(`/api/events/${eventId}/guests/${guestId}/flight-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ flightStatus }),
      });
      if (!res.ok) throw new Error("Failed to update flight status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guests-checkin", eventId] });
    },
    onError: (err: Error) => {
      toast({ title: "Error updating flight status", description: err.message, variant: "destructive" });
    },
  });

  // QR scanner: start/stop based on showQrScanner flag
  useEffect(() => {
    if (!showQrScanner) {
      if (qrScannerRef.current) {
        qrScannerRef.current.stop().catch(() => {}).finally(() => {
          qrScannerRef.current = null;
        });
      }
      return;
    }

    // Slight delay to let the DOM element mount
    const timer = setTimeout(async () => {
      setQrScannerError("");
      try {
        const scanner = new Html5Qrcode(qrDivId);
        qrScannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            // QR code encodes /guest/:token URL — extract the token
            const tokenMatch = decodedText.match(/\/guest\/([^/?#]+)/);
            const token = tokenMatch?.[1] ?? decodedText;
            // Find guest by accessToken
            const found = (guests as any[]).find(
              (g: any) => g.accessToken === token || g.bookingRef === token
            );
            if (found) {
              setSearch(found.name ?? token);
              setShowQrScanner(false);
              if (found.status !== "arrived") {
                toast({ title: `Found: ${found.name}`, description: "Tap Arrived to check in." });
              } else {
                toast({ title: `${found.name} already checked in`, variant: "default" });
              }
            } else {
              toast({ title: "Guest not found", description: `Token: ${token}`, variant: "destructive" });
              setShowQrScanner(false);
            }
          },
          () => {} // ignore per-frame decode errors
        );
      } catch (err: any) {
        setQrScannerError(err.message ?? "Could not start camera. Allow camera access and try again.");
        setShowQrScanner(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [showQrScanner, guests]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      qrScannerRef.current?.stop().catch(() => {});
    };
  }, []);

  const filtered = (guests as any[]).filter((g: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      g.name?.toLowerCase().includes(q) ||
      g.email?.toLowerCase().includes(q) ||
      g.bookingRef?.toLowerCase().includes(q)
    );
  });

  const arrived = stats?.arrived ?? 0;
  const total = stats?.total ?? guests.length;
  const confirmed = stats?.confirmed ?? 0;
  const pending = stats?.pending ?? 0;
  const noShow = stats?.noShow ?? 0;
  const pct = total > 0 ? Math.round((arrived / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="font-serif font-bold text-xl">Check-in</h1>
              <p className="text-xs text-primary-foreground/80 mt-0.5 truncate max-w-[220px]">
                {event?.name ?? "Current Event"}
                {event?.eventCode ? ` · ${event.eventCode}` : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
                onClick={() => { refetchStats(); refetchGuests(); }}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
                onClick={() => setShowQrScanner(true)}
              >
                <QrCode className="w-4 h-4 mr-1" /> Scan
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
                onClick={() => setShowWalkInForm(true)}
              >
                <UserPlus className="w-4 h-4 mr-1" /> Walk-in
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
                onClick={() => navigate(`/groundteam/${eventId}/rooming`)}
              >
                <MapPin className="w-4 h-4 mr-1" /> Rooms
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
                onClick={handleDashboardClick}
              >
                <LayoutDashboard className="w-4 h-4 mr-1" /> Dashboard
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
                disabled={isLoggingOut}
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-1" /> Logout
              </Button>
            </div>
          </div>

          {/* Live stats */}
          <div className="grid grid-cols-5 gap-1.5 text-center text-xs">
            <div className="bg-primary-foreground/10 rounded p-2">
              <p className="font-bold text-lg">{arrived}</p>
              <p className="text-primary-foreground/70">Arrived</p>
            </div>
            <div className="bg-primary-foreground/10 rounded p-2">
              <p className="font-bold text-lg">{confirmed}</p>
              <p className="text-primary-foreground/70">Confirmed</p>
            </div>
            <div className="bg-primary-foreground/10 rounded p-2">
              <p className="font-bold text-lg">{pending}</p>
              <p className="text-primary-foreground/70">Pending</p>
            </div>
            <div className="bg-red-500/20 rounded p-2">
              <p className="font-bold text-lg">{noShow}</p>
              <p className="text-primary-foreground/70">No-show</p>
            </div>
            <div className="bg-primary-foreground/10 rounded p-2">
              <p className="font-bold text-lg">{total}</p>
              <p className="text-primary-foreground/70">Total</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-primary-foreground/70 mb-1">
              <span>Arrival progress</span>
              <span>{pct}%</span>
            </div>
            <div className="w-full bg-primary-foreground/20 rounded-full h-2">
              <div
                className="bg-primary-foreground rounded-full h-2 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-4">
        <Card>
          <CardContent className="pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Upcoming Itinerary</p>
              <p className="text-xs text-muted-foreground">{itinerary.length} total</p>
            </div>
            {itinerary.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No itinerary events configured yet. Ask your planner to add sessions in Event Setup.
              </p>
            ) : (
              [...(itinerary as any[])]
                .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                .slice(0, 3)
                .map((item: any) => (
                  <div key={item.id} className="rounded border px-2.5 py-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{item.title}</p>
                      {item.isMandatory && (
                        <Badge className="bg-primary/10 text-primary border border-primary/20">Mandatory</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.startTime).toLocaleString()} → {new Date(item.endTime).toLocaleString()}
                    </p>
                  </div>
                ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* QR Scanner Overlay */}
      {showQrScanner && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4">
          <div className="bg-card rounded-xl p-4 w-full max-w-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <QrCode className="w-4 h-4" /> Scan Guest QR Code
              </h3>
              <button
                onClick={() => setShowQrScanner(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Point the camera at the guest's QR code from their invitation link.
            </p>
            <div id={qrDivId} className="w-full rounded overflow-hidden" />
            {qrScannerError && (
              <p className="text-xs text-destructive">{qrScannerError}</p>
            )}
          </div>
        </div>
      )}

      {/* Walk-in Registration Form */}
      {showWalkInForm && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4">
          <div className="bg-card rounded-xl p-5 w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <UserPlus className="w-4 h-4" /> Walk-in Registration
              </h3>
              <button onClick={() => setShowWalkInForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="wi-name">Name *</Label>
                <Input
                  id="wi-name"
                  placeholder="Full name"
                  value={walkInName}
                  onChange={(e) => setWalkInName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wi-email">Email</Label>
                <Input
                  id="wi-email"
                  type="email"
                  placeholder="email@example.com"
                  value={walkInEmail}
                  onChange={(e) => setWalkInEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wi-phone">Phone</Label>
                <Input
                  id="wi-phone"
                  type="tel"
                  placeholder="+91 9000000000"
                  value={walkInPhone}
                  onChange={(e) => setWalkInPhone(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wi-meal">Meal Preference</Label>
                <Select value={walkInMeal} onValueChange={setWalkInMeal}>
                  <SelectTrigger id="wi-meal">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="vegetarian">Vegetarian</SelectItem>
                    <SelectItem value="vegan">Vegan</SelectItem>
                    <SelectItem value="halal">Halal</SelectItem>
                    <SelectItem value="kosher">Kosher</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={() => walkInMutation.mutate({ name: walkInName, email: walkInEmail || undefined, phone: walkInPhone || undefined, mealPreference: walkInMeal })}
              disabled={!walkInName.trim() || walkInMutation.isPending}
            >
              {walkInMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
              Register & Check In
            </Button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="max-w-lg mx-auto px-4 py-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or booking ref…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Guest list */}
      <div className="max-w-lg mx-auto px-4 pb-8 space-y-3">
        {guestsLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!guestsLoading && filtered.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {search
              ? "No guests match your search. Try name, email, or booking ref."
              : "No guests found for this event yet. Use Walk-in to register on spot or ask the planner to import guests."}
          </div>
        )}

        {filtered.map((guest: any) => {
          const isArrived = guest.status === "arrived";
          const isNoShow = guest.status === "no_show";
          const isConfirmed = guest.status === "confirmed" || guest.rsvpStatus === "confirmed";

          return (
            <Card key={guest.id} className={`border ${isArrived ? "border-green-300 bg-green-50/30" : isNoShow ? "border-red-300 bg-red-50/20 opacity-60" : flightStatusBorderClass(guest.flightStatus)}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold truncate">{guest.name}</p>
                      {guest.registrationSource === "on_spot" && (
                        <Badge className="bg-purple-100 text-purple-700 border-purple-300 text-xs">
                          <UserPlus className="w-3 h-3 mr-1" /> Walk-in
                        </Badge>
                      )}
                      {isArrived && (
                        <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Arrived
                        </Badge>
                      )}
                      {isNoShow && (
                        <Badge className="bg-red-100 text-red-700 border-red-300 text-xs">
                          <UserX className="w-3 h-3 mr-1" /> No-show
                        </Badge>
                      )}
                      {!isArrived && !isNoShow && isConfirmed && (
                        <Badge variant="secondary" className="text-xs">Confirmed</Badge>
                      )}
                      {!isArrived && !isNoShow && !isConfirmed && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">Pending RSVP</Badge>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      {guest.bookingRef ?? "—"}
                    </p>

                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                      {(guest.mealPreference && guest.mealPreference !== "standard") && (
                        <span className="flex items-center gap-1 capitalize">
                          <Utensils className="w-3 h-3" />
                          {guest.mealPreference}
                        </span>
                      )}
                      {guest.dietaryRestrictions && !guest.mealPreference && (
                        <span className="flex items-center gap-1">
                          <Utensils className="w-3 h-3" />
                          {guest.dietaryRestrictions}
                        </span>
                      )}
                      {guest.arrivalPnr && (
                        <span className="flex items-center gap-1 font-mono">
                          <Plane className="w-3 h-3" />
                          {guest.arrivalPnr}
                          {guest.flightStatus && guest.flightStatus !== "unknown" && (
                            <span className={`ml-0.5 text-xs px-1.5 py-0.5 rounded-full font-sans font-medium ${flightStatusBadgeClass(guest.flightStatus)}`}>
                              {flightStatusLabel(guest.flightStatus)}
                            </span>
                          )}
                        </span>
                      )}
                      {guest.specialRequests && (
                        <span className="flex items-center gap-1">
                          <StickyNote className="w-3 h-3" />
                          {guest.specialRequests}
                        </span>
                      )}
                      {guest.seatAllocation && guest.seatAllocation > 1 && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          Party of {guest.seatAllocation}
                        </span>
                      )}
                      {guest.emergencyContactName && (
                        <span className="flex items-center gap-1 text-red-600 font-medium">
                          <AlertCircle className="w-3 h-3" />
                          SOS: {guest.emergencyContactName}{guest.emergencyContactPhone ? ` · ${guest.emergencyContactPhone}` : ""}
                        </span>
                      )}
                    </div>

                    {/* Flight status control — only when guest has a PNR (flying in) */}
                    {guest.arrivalPnr && (
                      <div className="mt-2 flex items-center gap-2">
                        <Plane className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground">Flight:</span>
                        <Select
                          value={guest.flightStatus ?? "unknown"}
                          onValueChange={(val) =>
                            flightStatusMutation.mutate({ guestId: guest.id, flightStatus: val })
                          }
                        >
                          <SelectTrigger className="h-6 text-xs w-32 py-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unknown">Unknown</SelectItem>
                            <SelectItem value="on_time">On time</SelectItem>
                            <SelectItem value="delayed">Delayed</SelectItem>
                            <SelectItem value="landed">Landed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {!isArrived && !isNoShow && (
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => arrivedMutation.mutate(guest.id)}
                        disabled={arrivedMutation.isPending}
                      >
                        {arrivedMutation.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Arrived</>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full border-red-200 text-red-600 hover:bg-red-50 text-xs"
                        onClick={() => noShowMutation.mutate(guest.id)}
                        disabled={noShowMutation.isPending}
                      >
                        <UserX className="w-3 h-3 mr-1" /> No-show
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Auto-refresh indicator */}
      <div className="fixed bottom-4 right-4">
        <button
          onClick={() => setAutoRefresh(!autoRefresh)}
          className={`text-xs flex items-center gap-1 px-2 py-1 rounded-full border ${
            autoRefresh ? "bg-green-50 border-green-300 text-green-700" : "bg-muted border-border text-muted-foreground"
          }`}
        >
          <Clock className="w-3 h-3" />
          {autoRefresh ? "Auto-refresh on" : "Auto-refresh off"}
        </button>
      </div>
    </div>
  );
}
