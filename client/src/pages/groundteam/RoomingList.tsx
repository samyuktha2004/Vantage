/**
 * RoomingList — Ground team view for room assignments
 * Route: /groundteam/:eventId/rooming
 */
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Users, Utensils, Printer, Plane, Train, Bus, UserPlus, Download, LayoutDashboard, LogOut } from "lucide-react";
import { exportManifestToExcel } from "@/lib/excelParser";
import { useAuth } from "@/hooks/use-auth";

async function fetchGuests(eventId: string) {
  const res = await fetch(`/api/events/${eventId}/guests`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

async function fetchEvent(eventId: string) {
  const res = await fetch(`/api/events/${eventId}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

function TransportIcon({ mode }: { mode?: string }) {
  if (mode === "train") return <Train className="w-3 h-3" />;
  if (mode === "other") return <Bus className="w-3 h-3" />;
  return <Plane className="w-3 h-3" />;
}

export default function RoomingList() {
  const [match, params] = useRoute("/groundteam/:eventId/rooming");
  const [, navigate] = useLocation();
  const eventId = params?.eventId ?? "";
  const { user, logout, isLoggingOut } = useAuth();

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

  const { data: guests = [], isLoading } = useQuery({
    queryKey: ["guests-rooming", eventId],
    queryFn: () => fetchGuests(eventId),
    enabled: !!eventId,
  });

  const { data: event } = useQuery({
    queryKey: ["ground-event", eventId],
    queryFn: () => fetchEvent(eventId),
    enabled: !!eventId,
    staleTime: 60000,
  });

  // Group by arrival date (simplified)
  const confirmed = (guests as any[]).filter(
    (g: any) => g.rsvpStatus === "confirmed" || g.status === "confirmed" || g.status === "arrived"
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
            onClick={() => navigate(`/groundteam/${eventId}/checkin`)}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="font-serif font-bold text-xl">Rooming List</h1>
            <p className="text-xs text-primary-foreground/80 mt-0.5 truncate max-w-[220px]">
              {event?.name ?? "Current Event"}
              {event?.eventCode ? ` · ${event.eventCode}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
            onClick={() => exportManifestToExcel(confirmed, "Rooming List")}
          >
            <Download className="w-4 h-4 mr-1" /> Export
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
            onClick={() => window.print()}
          >
            <Printer className="w-4 h-4 mr-1" /> Print
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

      <div className="max-w-lg mx-auto px-4 py-6 space-y-3">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{confirmed.length} confirmed guests</span>
          <Badge variant="secondary">{guests.length} total</Badge>
        </div>

        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && confirmed.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No confirmed guests yet. Check the live Check-in page for walk-ins, or wait for RSVP confirmations.
          </div>
        )}

        {confirmed.map((guest: any, i: number) => (
          <Card key={guest.id} className="border">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground font-mono w-6">{i + 1}.</span>
                    <p className="font-semibold">{guest.name}</p>
                    {guest.registrationSource === "on_spot" && (
                      <Badge className="bg-purple-100 text-purple-700 border-purple-300 text-xs">
                        <UserPlus className="w-3 h-3 mr-1" /> Walk-in
                      </Badge>
                    )}
                    {guest.status === "arrived" && (
                      <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">✓ Arrived</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground ml-8 mt-0.5">{guest.bookingRef ?? "—"}</p>

                  <div className="ml-8 mt-2 space-y-1">
                    {(guest.mealPreference && guest.mealPreference !== "standard") && (
                      <p className="text-xs text-amber-700 flex items-center gap-1 capitalize">
                        <Utensils className="w-3 h-3" />
                        {guest.mealPreference}
                      </p>
                    )}
                    {!guest.mealPreference && guest.dietaryRestrictions && (
                      <p className="text-xs text-amber-700 flex items-center gap-1">
                        <Utensils className="w-3 h-3" />
                        {guest.dietaryRestrictions}
                      </p>
                    )}
                    {guest.arrivalPnr && (
                      <p className="text-xs text-blue-700 flex items-center gap-1 font-mono">
                        <TransportIcon mode={guest.arrivalMode} />
                        {guest.arrivalMode === "train" ? "Train PNR:" : "Arrival PNR:"} {guest.arrivalPnr}
                        {guest.originCity && <span className="text-muted-foreground font-sans">(from {guest.originCity})</span>}
                      </p>
                    )}
                    {!guest.arrivalPnr && guest.originCity && (
                      <p className="text-xs text-blue-700 flex items-center gap-1">
                        <TransportIcon mode={guest.arrivalMode} />
                        From: {guest.originCity}
                      </p>
                    )}
                    {guest.departurePnr && (
                      <p className="text-xs text-blue-700 flex items-center gap-1 font-mono">
                        <TransportIcon mode={guest.departureMode} />
                        {guest.departureMode === "train" ? "Train PNR (dep):" : "Departure PNR:"} {guest.departurePnr}
                      </p>
                    )}
                    {guest.seatAllocation && guest.seatAllocation > 1 && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        Party of {guest.seatAllocation}
                      </p>
                    )}
                    {guest.specialRequests && (
                      <p className="text-xs text-muted-foreground italic">
                        Note: {guest.specialRequests}
                      </p>
                    )}
                  </div>
                </div>

                {guest.arrivalDate && (
                  <div className="text-right text-xs text-muted-foreground shrink-0">
                    <p>Arrives</p>
                    <p className="font-medium">{new Date(guest.arrivalDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
