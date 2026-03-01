import { useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useGuestPortal } from "@/hooks/use-guest-portal";
import { GuestLayout } from "@/components/GuestLayout";
import { WaitlistBell } from "@/components/WaitlistBell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  CheckCircle2,
  Calendar,
  Hotel,
  Plane,
  MapPin,
  Users,
  Shield,
  ChevronRight,
  AlertCircle,
  Sparkles,
  Edit,
  ExternalLink,
  FileText,
  ClipboardList,
  PartyPopper,
} from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

function formatEventDateRange(startValue: unknown, endValue?: unknown): string {
  const startDate = startValue instanceof Date
    ? startValue
    : typeof startValue === "string" && startValue
      ? new Date(startValue)
      : null;
  const endDate = endValue instanceof Date
    ? endValue
    : typeof endValue === "string" && endValue
      ? new Date(endValue)
      : null;

  if (!startDate || Number.isNaN(startDate.getTime())) return "TBD";
  if (!endDate || Number.isNaN(endDate.getTime())) return format(startDate, "MMMM dd, yyyy");

  const sameDay =
    startDate.getFullYear() === endDate.getFullYear() &&
    startDate.getMonth() === endDate.getMonth() &&
    startDate.getDate() === endDate.getDate();

  return sameDay
    ? format(startDate, "MMMM dd, yyyy")
    : `${format(startDate, "MMM dd, yyyy")} → ${format(endDate, "MMM dd, yyyy")}`;
}

export default function GuestDashboard() {
  const [match, params] = useRoute("/guest/:token");
  const [, navigate] = useLocation();
  const token = params?.token || "";

  const { data: guestData, isLoading } = useGuestPortal(token);
  const wasOnWaitlistRef = useRef<boolean | null>(null);

  // Detect waitlist promotion: was on waitlist last load, now off it
  const justPromoted =
    wasOnWaitlistRef.current === true && guestData?.isOnWaitlist === false;

  useEffect(() => {
    if (guestData) {
      wasOnWaitlistRef.current = guestData.isOnWaitlist ?? false;
    }
  }, [guestData?.isOnWaitlist]);

  // Redirect pending guests directly into the wizard
  useEffect(() => {
    if (guestData && guestData.status === "pending") {
      navigate(`/guest/${token}/rsvp`, { replace: true });
    }
  }, [guestData, token, navigate]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin text-primary w-8 h-8" />
      </div>
    );
  }

  if (!guestData) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto" />
          <h2 className="text-2xl font-serif">Invalid Access Link</h2>
          <p className="text-muted-foreground">Please check your invitation for the correct link</p>
        </div>
      </div>
    );
  }

  // While we determine redirect for pending guests
  if (guestData.status === "pending") {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin text-primary w-8 h-8" />
      </div>
    );
  }

  // --- Confirmed booking receipt page ---
  const event = guestData.event;
  const isWalkIn = guestData.registrationSource === "on_spot";
  const hasTravel = (
    guestData.selfManageArrival !== undefined ||
    !!(guestData.arrivalPnr || guestData.departurePnr || guestData.extendedCheckIn)
  );
  const dietarySummary = guestData.mealPreference && guestData.mealPreference !== "standard"
    ? guestData.mealPreference
    : guestData.dietaryRestrictions;

  return (
    <GuestLayout step={1} token={token}>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Confirmation Banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3 py-6"
        >
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-serif text-primary">You're booked in!</h1>
          <p className="text-muted-foreground">
            {isWalkIn
              ? `Walk-in registration completed for ${event?.name}`
              : `${guestData.confirmedSeats || 1} seat${(guestData.confirmedSeats || 1) > 1 ? "s" : ""} confirmed for ${event?.name}`}
          </p>
          <div className="flex flex-wrap justify-center gap-3 text-sm text-muted-foreground">
            {event?.date && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formatEventDateRange(event.date, (event as any).endDate)}
              </span>
            )}
            {event?.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {event.location}
              </span>
            )}
          </div>
          <Badge variant="outline" className="text-xs border-primary/30 text-primary">
            Booking Ref: {guestData.bookingRef}
          </Badge>
          {event?.coverMediaUrl && (
            <a
              href={event.coverMediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary underline underline-offset-2 hover:opacity-80"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View Invite
            </a>
          )}
          {/* Fallback text invite when no media URL is provided */}
          {!event?.coverMediaUrl && (event?.inviteMessage || event?.name) && (
            <div className="mt-2 p-4 bg-primary/5 border border-primary/10 rounded-lg text-sm text-center max-w-md mx-auto">
              <FileText className="w-5 h-5 text-primary mx-auto mb-2" />
              <p className="text-primary/80 whitespace-pre-line">
                {event.inviteMessage
                  ? event.inviteMessage.replace(/\{name\}/gi, guestData.name || 'Guest')
                  : `Dear ${guestData.name || 'Guest'},\n\nYou are cordially invited to ${event.name}. We look forward to welcoming you!`}
              </p>
            </div>
          )}
        </motion.div>

        {/* Quick edit cards */}
        <div className="space-y-3">
          {/* Event Schedule (if provided) */}
          {event?.scheduleText && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <ClipboardList className="w-5 h-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-sm mb-2">Event Schedule</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                      {event.scheduleText}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 1 — RSVP */}
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="pt-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-sm">RSVP & Guest Details</p>
                  <p className="text-xs text-muted-foreground">
                    {isWalkIn
                      ? "Walk-in registration completed"
                      : `${guestData.confirmedSeats || 1} seat${(guestData.confirmedSeats || 1) > 1 ? "s" : ""} confirmed`}
                  </p>
                  {dietarySummary && (
                    <p className="text-xs text-muted-foreground capitalize">Meal/Dietary: {dietarySummary}</p>
                  )}
                </div>
              </div>
              {!isWalkIn && (
                <Button variant="ghost" size="sm" onClick={() => navigate(`/guest/${token}/rsvp`)}>
                  <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Step 2 — Travel Prefs */}
          <Card className={hasTravel ? "border-green-200 bg-green-50/50" : "border-amber-200 bg-amber-50/30"}>
            <CardContent className="pt-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {hasTravel
                  ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                  : <Plane className="w-5 h-5 text-amber-600" />
                }
                <div>
                  <p className="font-medium text-sm">Travel Preferences</p>
                  <p className="text-xs text-muted-foreground">
                    {isWalkIn
                      ? (hasTravel
                        ? (guestData.selfManageArrival ? "Self-arranged arrival" : "Group flight")
                        : "Set return/interim travel if needed")
                      : hasTravel
                      ? (guestData.selfManageArrival ? "Self-arranged arrival" : "Group flight")
                      : "Not set yet"}
                  </p>
                </div>
              </div>
              <Button
                variant={hasTravel ? "ghost" : "outline"}
                size="sm"
                onClick={() => navigate(`/guest/${token}/travel-prefs`)}
              >
                {hasTravel ? <><Edit className="w-3.5 h-3.5 mr-1" /> Edit</> : "Set up"}
                {!hasTravel && <ChevronRight className="w-3.5 h-3.5 ml-1" />}
              </Button>
            </CardContent>
          </Card>

          {/* Step 3 — Summary */}
          <Card>
            <CardContent className="pt-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Hotel className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">Booking Summary</p>
                  <p className="text-xs text-muted-foreground">Review your hotel & flight details</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate(`/guest/${token}/summary`)}>
                View <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </CardContent>
          </Card>

          {/* Step 4 — Add-ons */}
          <Card>
            <CardContent className="pt-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">Add-ons & Perks</p>
                  <p className="text-xs text-muted-foreground">
                    {(guestData.availablePerks?.filter((p: any) => p.isEnabled)?.length ?? 0) > 0
                      ? `${guestData.availablePerks.filter((p: any) => p.isEnabled).length} available`
                      : "Browse available extras"}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate(`/guest/${token}/addons`)}>
                View <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </CardContent>
          </Card>

          {/* ID Vault */}
          <Card>
            <CardContent className="pt-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">Travel Documents</p>
                  <p className="text-xs text-muted-foreground">
                    {guestData.idVerificationStatus === "verified"
                      ? "Verified"
                      : "Upload your ID documents"}
                  </p>
                </div>
              </div>
              {guestData.idVerificationStatus === "verified"
                ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                : (
                  <Button variant="outline" size="sm" onClick={() => navigate(`/guest/${token}/idvault`)}>
                    Upload
                  </Button>
                )
              }
            </CardContent>
          </Card>
        </div>

        {/* Promoted off waitlist — celebration banner */}
        {justPromoted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl bg-green-50 border border-green-200 p-5 text-center"
          >
            <PartyPopper className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="font-semibold text-green-800">Room Confirmed!</p>
            <p className="text-sm text-green-700 mt-1">
              A room just opened up and you've been automatically moved off the waitlist. Your booking is now confirmed.
            </p>
          </motion.div>
        )}

        {/* Waitlist: show when on waitlist OR when hotel is full and can still join */}
        {(guestData.isOnWaitlist || guestData.isHotelFull) && !justPromoted && (
          <WaitlistBell token={token} className="mt-2" />
        )}
      </div>
    </GuestLayout>
  );
}
