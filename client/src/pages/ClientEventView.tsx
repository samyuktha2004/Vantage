/**
 * ClientEventView — Client-role event dashboard
 * Rendered by EventDetails.tsx when user.role === "client"
 *
 * Shows:
 *  1. Event summary (read-only)
 *  2. RSVP status donut
 *  3. Per-label add-on budget settings (editable)
 *  4. Perk coverage toggles per label (editable)
 *  5. Cost breakdown
 *  6. Pending guest requests (read-only)
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEvent } from "@/hooks/use-events";
import { useHotelBookings } from "@/hooks/use-hotel-bookings";
import { useLabels } from "@/hooks/use-labels";
import { usePerks } from "@/hooks/use-perks";
import { useRequests, useUpdateRequest } from "@/hooks/use-requests";
import { useGuests, useGuestFamily } from "@/hooks/use-guests";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Calendar, MapPin, Users, DollarSign, Tag, Inbox, Clock, Plus, Upload, FileSpreadsheet, CheckCircle, XCircle, Plane, Train, Bus, Car, Ship, Building2, UserCheck, UserX, HelpCircle, Gift } from "lucide-react";
import { format, differenceInCalendarDays } from "date-fns";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { parseExcelFile, parseCSVFile } from "@/lib/excelParser";
import { api } from "@shared/routes";
import { RsvpBreakdownCard } from "@/components/RsvpBreakdownCard";

interface ClientEventViewProps {
  eventId: number;
}

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
  if (!endDate || Number.isNaN(endDate.getTime())) return format(startDate, "PPP");

  const sameDay =
    startDate.getFullYear() === endDate.getFullYear() &&
    startDate.getMonth() === endDate.getMonth() &&
    startDate.getDate() === endDate.getDate();

  return sameDay
    ? format(startDate, "PPP")
    : `${format(startDate, "PPP")} → ${format(endDate, "PPP")}`;
}

function getSelfPaidLabels(guest: any): string[] {
  const labels: string[] = [];
  const fullFlightSelfPaid = !!guest?.selfManageFlights || (!!guest?.selfManageArrival && !!guest?.selfManageDeparture);
  const hotelSelfPaid = !!guest?.selfManageHotel;

  if (fullFlightSelfPaid && hotelSelfPaid) {
    return ["Self Paid · All"];
  }

  if (fullFlightSelfPaid) {
    labels.push("Self Paid · Flight");
  } else {
    if (guest?.selfManageArrival) labels.push("Self Paid · Arrival");
    if (guest?.selfManageDeparture) labels.push("Self Paid · Departure");
  }

  if (hotelSelfPaid) {
    labels.push("Self Paid · Hotel");
  }

  return labels;
}

export default function ClientEventView({ eventId }: ClientEventViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: event, isLoading: eventLoading } = useEvent(eventId);
  const { data: labels } = useLabels(eventId);
  const { data: perks } = usePerks(eventId);
  const { data: guests } = useGuests(eventId);
  const [expandedGuests, setExpandedGuests] = useState<number[]>([]);
  const [rsvpFilter, setRsvpFilter] = useState<'all'|'confirmed'|'pending'|'declined'>('all');
  const { data: requests } = useRequests(eventId);
  const updateRequest = useUpdateRequest();
  const { data: hotelBookings } = useHotelBookings(eventId);

  function GuestFamilyList({ guestId }: { guestId: number }) {
    const { data: family } = useGuestFamily(guestId);
    if (!family || family.length === 0) return <p className="text-sm text-muted-foreground mt-2">No family members registered.</p>;
    return (
      <div className="mt-2">
        <p className="font-medium text-sm">Family Members</p>
        <ul className="text-sm space-y-1 mt-1">
          {family.map((m: any) => (
            <li key={m.id}>{m.name} · {m.relationship} {m.age ? `· ${m.age}` : ''}</li>
          ))}
        </ul>
      </div>
    );
  }

  const { data: travelOptions } = useQuery({
    queryKey: ["travel-options", eventId],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/travel-options`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load travel options");
      return res.json();
    },
    enabled: !!eventId,
    refetchInterval: 30000,
  });

  const { data: itineraryEvents = [] } = useQuery({
    queryKey: ["event-itinerary", eventId],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/itinerary`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load itinerary");
      return res.json();
    },
    enabled: !!eventId,
  });

  // Cost breakdown
  const { data: costBreakdown } = useQuery({
    queryKey: ["cost-breakdown", eventId],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/cost-breakdown`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load breakdown");
      return res.json();
    },
    enabled: !!eventId,
  });

  // Label perk assignments for this event
  const { data: labelPerksData } = useQuery({
    queryKey: ["label-perks-all", eventId],
    queryFn: async () => {
      // Fetch label-perk assignments for each label
      if (!labels || labels.length === 0) return {};
      const results: Record<number, any[]> = {};
      for (const label of labels) {
        const res = await fetch(`/api/events/${eventId}/labels/${label.id}/perks`, { credentials: "include" });
        if (res.ok) {
          results[label.id] = await res.json();
        }
      }
      return results;
    },
    enabled: !!labels && labels.length > 0,
  });

  // Budget edit state per label
  const [budgetEdits, setBudgetEdits] = useState<Record<number, number>>({});
  const [savingBudget, setSavingBudget] = useState<number | null>(null);
  const [autoPilotEnabled, setAutoPilotEnabled] = useState<Record<number, boolean>>({});
  const labelsQueryKey = [api.labels.list.path, eventId] as const;
  const inviteMediaInputRef = useRef<HTMLInputElement>(null);
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteMediaType, setInviteMediaType] = useState<"image" | "video">("image");
  const [inviteMessage, setInviteMessage] = useState("");
  const [scheduleText, setScheduleText] = useState("");
  const [contentSaving, setContentSaving] = useState(false);
  const [contentInitialized, setContentInitialized] = useState(false);

  const handleSaveBudget = async (labelId: number) => {
    const budget = budgetEdits[labelId];
    if (budget === undefined) return;
    setSavingBudget(labelId);
    try {
      const res = await fetch(`/api/labels/${labelId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ addOnBudget: budget }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Failed to update budget");
      }
      toast({ title: "Budget updated" });
      queryClient.invalidateQueries({ queryKey: labelsQueryKey });
      queryClient.invalidateQueries({ queryKey: ["cost-breakdown", eventId] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSavingBudget(null);
    }
  };

  useEffect(() => {
    if (!event || contentInitialized) return;
    setInviteUrl((event as any).coverMediaUrl ?? "");
    setInviteMediaType((event as any).coverMediaType === "video" ? "video" : "image");
    setInviteMessage((event as any).inviteMessage ?? "");
    setScheduleText((event as any).scheduleText ?? "");
    setContentInitialized(true);
  }, [event, contentInitialized]);

  const handleInviteFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      toast({ title: "Unsupported file", description: "Upload an image or video file.", variant: "destructive" });
      e.target.value = "";
      return;
    }

    const maxSizeBytes = 4 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast({ title: "File too large", description: "Please upload a file smaller than 4MB.", variant: "destructive" });
      e.target.value = "";
      return;
    }

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });

      if (!dataUrl.startsWith("data:")) throw new Error("Invalid file data");

      setInviteUrl(dataUrl);
      setInviteMediaType(isVideo ? "video" : "image");
      toast({ title: "Invite media added" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message || "Could not process file", variant: "destructive" });
    } finally {
      e.target.value = "";
    }
  };

  const handleSaveEventContent = async () => {
    setContentSaving(true);
    try {
      const patchPayload = {
        coverMediaUrl: inviteUrl.trim() || null,
        coverMediaType: inviteMediaType,
        scheduleText: scheduleText.trim() || null,
        inviteMessage: inviteMessage.trim() || null,
      };

      const res = await fetch(`/api/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(patchPayload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Failed to save event content");
      }

      toast({ title: "Event content updated" });
      queryClient.invalidateQueries({ queryKey: [api.events.get.path, eventId] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setContentSaving(false);
    }
  };

  // Guest import
  const [uploading, setUploading] = useState(false);
  const [pendingImport, setPendingImport] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClientFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      let parsed: any[] = [];
      if (file.name.endsWith('.csv')) {
        parsed = await parseCSVFile(file);
      } else {
        parsed = await parseExcelFile(file);
      }
      parsed = parsed.filter((g) => g.name && g.name.trim() !== '');
      setPendingImport(parsed);
      toast({ title: "File parsed!", description: `Found ${parsed.length} guests. Confirm to import.` });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleImportConfirm = async () => {
    setUploading(true);
    try {
      let successCount = 0;
      const failedRows: Array<{ guest: any; reason: string }> = [];

      for (const guest of pendingImport) {
        const name = String(guest.name || "").trim();
        const email = String(guest.email || "").trim();

        if (!name) {
          failedRows.push({ guest, reason: "Missing name" });
          continue;
        }

        if (!email) {
          failedRows.push({ guest, reason: "Missing email" });
          continue;
        }

        const res = await fetch(`/api/events/${eventId}/guests`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name,
            email,
            phone: guest.phone ? String(guest.phone) : undefined,
            category: guest.category,
            dietaryRestrictions: guest.dietaryRestrictions,
            specialRequests: guest.specialRequests,
          }),
        });

        if (!res.ok) {
          let bodyMsg = '';
          try {
            const json = await res.json();
            bodyMsg = json?.message || JSON.stringify(json);
          } catch (e) {
            try {
              bodyMsg = await res.text();
            } catch (e) {
              bodyMsg = '';
            }
          }

          failedRows.push({
            guest,
            reason: `${res.status} ${res.statusText}${bodyMsg ? ` - ${bodyMsg}` : ''}`,
          });
          continue;
        }

        successCount += 1;
      }

      if (successCount > 0) {
        queryClient.invalidateQueries({ queryKey: [api.guests.list.path, eventId] });
      }

      if (failedRows.length === 0) {
        toast({ title: "Guests imported!", description: `${successCount} guests added` });
        setPendingImport([]);
      } else if (successCount > 0) {
        toast({
          title: "Import partially complete",
          description: `${successCount} imported, ${failedRows.length} failed. Showing failed rows for retry.`,
          variant: "destructive",
        });
        setPendingImport(failedRows.map((row) => row.guest));
      } else {
        const firstFailure = failedRows[0]?.reason || "Unknown error";
        throw new Error(`All rows failed to import. First error: ${firstFailure}`);
      }
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  // Add Label
  const [showAddLabel, setShowAddLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [creatingLabel, setCreatingLabel] = useState(false);

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) return;
    setCreatingLabel(true);
    try {
      const res = await fetch(`/api/events/${eventId}/labels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: newLabelName.trim(), color: "#4F46E5" }),
      });
      if (!res.ok) throw new Error("Failed to create label");
      toast({ title: "Label created!", description: newLabelName.trim() });
      setNewLabelName("");
      setShowAddLabel(false);
      queryClient.invalidateQueries({ queryKey: labelsQueryKey });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCreatingLabel(false);
    }
  };

  // Toggle perk coverage or assignment (PUT is an upsert — creates if not exists)
  const [togglingPerk, setTogglingPerk] = useState<string | null>(null);

  const handleTogglePerkCoverage = async (labelId: number, perkId: number, expenseHandledByClient: boolean) => {
    const key = `${labelId}-${perkId}`;
    setTogglingPerk(key);
    try {
      const res = await fetch(`/api/labels/${labelId}/perks/${perkId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ expenseHandledByClient, isEnabled: true }),
      });
      if (!res.ok) throw new Error("Failed to update perk");
      toast({ title: expenseHandledByClient ? "Marked as client-covered" : "Changed to self-pay" });
      queryClient.invalidateQueries({ queryKey: ["label-perks-all", eventId] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setTogglingPerk(null);
    }
  };

  // Toggle whether a perk is offered to a label at all (isEnabled on/off)
  const handleTogglePerkEnabled = async (labelId: number, perkId: number, isEnabled: boolean) => {
    const key = `${labelId}-${perkId}`;
    setTogglingPerk(key);
    try {
      const res = await fetch(`/api/labels/${labelId}/perks/${perkId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isEnabled, expenseHandledByClient: isEnabled ? true : false }),
      });
      if (!res.ok) throw new Error("Failed to update perk");
      toast({ title: isEnabled ? "Perk added to this tier" : "Perk removed from this tier" });
      queryClient.invalidateQueries({ queryKey: ["label-perks-all", eventId] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setTogglingPerk(null);
    }
  };

  if (eventLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!event) return <div className="text-center py-20 text-muted-foreground">Event not found</div>;

  const allGuests = (guests ?? []) as any[];

  const offeredTravelOptions = (travelOptions ?? []) as any[];
  const offeredHotels = (hotelBookings ?? []) as any[];
  const offeredAddOns = (perks ?? []) as any[];
  // Client sees requests forwarded to them for approval
  const pendingRequests = (requests ?? []).filter((r: any) => r.status === "forwarded_to_client");

  const handleClientDecision = async (requestId: number, decision: "approved" | "rejected") => {
    try {
      await updateRequest.mutateAsync({ id: requestId, status: decision, eventId });
      toast({ title: decision === "approved" ? "Request Approved" : "Request Rejected" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-8">
      {/* Event Summary */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <Calendar className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Event Date</p>
              <p className="font-semibold text-sm">{formatEventDateRange(event.date, (event as any).endDate)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <MapPin className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Location</p>
              <p className="font-semibold text-sm">{event.location}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <Users className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">RSVP Status</p>
              <div className="flex gap-3 mt-1">
                <div>
                  <p className="text-sm font-semibold">{(allGuests ?? []).filter(g => g.status === 'confirmed').length}</p>
                  <p className="text-xs text-muted-foreground">Confirmed</p>
                </div>
                <div>
                  <p className="text-sm font-semibold">{(allGuests ?? []).filter(g => g.status === 'pending' || !g.status).length}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
                <div>
                  <p className="text-sm font-semibold">{(allGuests ?? []).filter(g => g.status === 'declined').length}</p>
                  <p className="text-xs text-muted-foreground">Declined</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <RsvpBreakdownCard guests={allGuests} title="RSVP Breakdown" />

      {/* Guests grouped by RSVP status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-4 h-4" />
            Guests by RSVP
          </CardTitle>
          <CardDescription>Quick view of attendees by RSVP status with share link</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-3 flex items-center justify-end">
            <label className="text-sm text-muted-foreground mr-2">Show</label>
            <select value={rsvpFilter} onChange={(e) => setRsvpFilter(e.target.value as any)} className="rounded border-input px-2 py-1 text-sm">
              <option value="all">All</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="declined">Declined</option>
            </select>
          </div>
          <div className="divide-y divide-border/50">
            {['confirmed', 'pending', 'declined'].map((status) => {
              if (rsvpFilter !== 'all' && rsvpFilter !== status) return null;
              return (
                <div key={status} className="p-4">
                  <p className="text-sm font-medium capitalize mb-2">{status} · {(allGuests ?? []).filter(g => (g.status ?? 'pending') === status).length}</p>
                  <div className="grid gap-2">
                    {(allGuests ?? []).filter(g => (g.status ?? 'pending') === status).slice(0, 50).map((g: any) => {
                    const isExpanded = expandedGuests.includes(g.id);
                    return (
                      <div key={g.id} className="py-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{g.name}</p>
                            <p className="text-xs text-muted-foreground">{g.email ?? g.phone ?? g.bookingRef}</p>
                            <div className="flex gap-2 mt-1 flex-wrap">
                              <Badge className="text-xs">{g.registrationSource ?? 'invited'}</Badge>
                              <Badge className="text-xs">Seats: {g.confirmedSeats ?? 0}/{g.allocatedSeats ?? 1}</Badge>
                              {g.mealPreference && <Badge className="text-xs">{g.mealPreference}</Badge>}
                              {getSelfPaidLabels(g).map((selfPaidLabel) => (
                                <Badge key={`${g.id}-${selfPaidLabel}`} className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-100">
                                  {selfPaidLabel}
                                </Badge>
                              ))}
                              {g.selectedHotelBookingId && (() => {
                                const hb = (hotelBookings || []).find((b: any) => b.id === g.selectedHotelBookingId);
                                return hb ? (
                                  <Badge className="text-xs bg-purple-100 text-purple-700 hover:bg-purple-100">
                                    🏨 {hb.hotelName}
                                  </Badge>
                                ) : null;
                              })()}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="ghost" onClick={() => {
                              const link = `${process.env.APP_URL || window.location.origin}/guest/${g.accessToken ?? g.bookingRef}`;
                              navigator.clipboard.writeText(link).then(() => toast({ title: 'Link copied', description: link }));
                            }}>Copy Link</Button>
                            <Button size="sm" onClick={() => {
                              const link = `${process.env.APP_URL || window.location.origin}/guest/${g.accessToken ?? g.bookingRef}`;
                              const wa = `https://wa.me/?text=${encodeURIComponent((g.name ? `Hi ${g.name}, ` : '') + 'Here is your event link: ' + link)}`;
                              window.open(wa, '_blank');
                            }} variant="outline">WhatsApp</Button>
                            <Button size="sm" onClick={() => {
                              setExpandedGuests((s) => s.includes(g.id) ? s.filter(x => x !== g.id) : [...s, g.id]);
                            }}>{isExpanded ? 'Hide' : 'Details'}</Button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="mt-2 ml-2 p-3 bg-muted/10 rounded">
                            <p className="text-sm"><strong>Status:</strong> {g.status ?? 'pending'}</p>
                            <p className="text-sm"><strong>Booking Ref:</strong> {g.bookingRef}</p>
                            <p className="text-sm"><strong>Access Token:</strong> {g.accessToken}</p>
                            <GuestFamilyList guestId={g.id} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Guests grouped by Label/Category */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Tag className="w-4 h-4" />
            Guests by Category
          </CardTitle>
          <CardDescription>Lists guests grouped by label/category</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            {((labels ?? []) as any[]).length > 0 ? (
              (labels as any[]).map((lbl: any) => (
                <div key={lbl.id} className="p-4">
                  <p className="text-sm font-medium">{lbl.name} · {(allGuests ?? []).filter(g => (g.labelId ?? g.category) && (g.labelId === lbl.id || (g.category && g.category.toLowerCase() === String(lbl.name).toLowerCase()))).length}</p>
                  <div className="grid gap-2 mt-2">
                    {(allGuests ?? []).filter(g => (g.labelId === lbl.id) || (g.category && g.category.toLowerCase() === String(lbl.name).toLowerCase())).slice(0,50).map((g: any) => (
                      <div key={g.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{g.name}</p>
                          <p className="text-xs text-muted-foreground">{g.email ?? g.phone ?? g.bookingRef}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="ghost" onClick={() => {
                            const link = `${process.env.APP_URL || window.location.origin}/guest/${g.accessToken ?? g.bookingRef}`;
                            navigator.clipboard.writeText(link).then(() => toast({ title: 'Link copied', description: link }));
                          }}>Copy Link</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4">
                <p className="text-sm text-muted-foreground">No labels available — use the import or labels tab to add categories.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="w-4 h-4" />
            Event Content
          </CardTitle>
          <CardDescription>Add invite media/link, fallback invite text, and schedule shown to guests</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Invite Link</Label>
            <Input
              placeholder="https://drive.google.com/... or Canva link"
              value={inviteUrl}
              onChange={(e) => setInviteUrl(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Upload Invite Media</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => inviteMediaInputRef.current?.click()}
              >
                <Upload className="w-4 h-4" />
                Upload Image/Video
              </Button>
              <input
                ref={inviteMediaInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={handleInviteFileUpload}
              />
            </div>
            {inviteUrl.startsWith("data:image/") && (
              <img src={inviteUrl} alt="Invite preview" className="w-full max-h-56 rounded-md border object-cover" />
            )}
            {inviteUrl.startsWith("data:video/") && (
              <video src={inviteUrl} controls className="w-full max-h-64 rounded-md border" />
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Fallback Invite Text</Label>
            <textarea
              className="flex min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder={`Dear {name}, you are invited to ${event.name}. We look forward to welcoming you.`}
              value={inviteMessage}
              onChange={(e) => setInviteMessage(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Event Schedule</Label>
            <textarea
              className="flex min-h-[110px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder={"Day 1 — Arrival\nDay 2 — Main program\nDay 3 — Departure"}
              value={scheduleText}
              onChange={(e) => setScheduleText(e.target.value)}
            />
          </div>

          <div className="pt-1">
            <Button onClick={handleSaveEventContent} disabled={contentSaving}>
              {contentSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save Event Content
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Offered by Agent */}
      {(offeredTravelOptions.length > 0 || offeredHotels.length > 0 || offeredAddOns.length > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Tag className="w-4 h-4" />
              Offered by Agent
            </CardTitle>
            <CardDescription>Hotel, transport, and add-on options currently configured for this event</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="secondary">Transport: {offeredTravelOptions.length}</Badge>
              <Badge variant="secondary">Hotels: {offeredHotels.length}</Badge>
              <Badge variant="secondary">Add-ons: {offeredAddOns.length}</Badge>
            </div>
            {offeredAddOns.length > 0 && (
              <div className="space-y-2">
                {offeredAddOns.map((perk: any) => (
                  <div key={perk.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40">
                    <Gift className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{perk.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {perk.type}
                        {typeof perk.clientFacingRate === "number"
                          ? ` · ₹${perk.clientFacingRate.toLocaleString('en-IN')}`
                          : typeof perk.unitCost === "number"
                            ? ` · ₹${perk.unitCost.toLocaleString('en-IN')}`
                            : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Guest List — synced from agent + client imports */}
      {guests && guests.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-4 h-4" />
              Guest List
              <Badge variant="secondary" className="ml-auto text-xs">{guests.length} total</Badge>
            </CardTitle>
            <CardDescription>All guests added by your agent or imported by you</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/50">
              {(guests as any[]).map((guest) => {
                const isConfirmed = guest.status === "confirmed";
                const isDeclined = guest.status === "declined";
                const guestHotel = guest.selectedHotelBookingId
                  ? (hotelBookings || []).find((b: any) => b.id === guest.selectedHotelBookingId)
                  : null;
                return (
                  <div key={guest.id} className="flex items-center justify-between px-5 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{guest.name}</p>
                      {guest.category && (
                        <p className="text-xs text-muted-foreground">{guest.category}</p>
                      )}
                      {guestHotel && (
                        <p className="text-xs text-purple-600 mt-0.5">🏨 {guestHotel.hotelName}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-4">
                      {isConfirmed ? (
                        <UserCheck className="w-4 h-4 text-green-600" />
                      ) : isDeclined ? (
                        <UserX className="w-4 h-4 text-red-500" />
                      ) : (
                        <HelpCircle className="w-4 h-4 text-amber-500" />
                      )}
                      <span className={`text-xs font-medium capitalize ${
                        isConfirmed ? "text-green-700" : isDeclined ? "text-red-600" : "text-amber-600"
                      }`}>
                        {guest.status ?? "pending"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Travel & Stays — arranged by agent */}
      {((travelOptions && travelOptions.length > 0) || (hotelBookings && hotelBookings.length > 0)) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Plane className="w-4 h-4" />
              Travel & Stays
            </CardTitle>
            <CardDescription>Itinerary and accommodation arranged by your agent</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(travelOptions ?? []).map((opt: any) => {
              const ModeIcon =
                opt.travelMode === "flight" ? Plane
                : opt.travelMode === "train" ? Train
                : opt.travelMode === "bus" ? Bus
                : opt.travelMode === "car" ? Car
                : opt.travelMode === "ferry" ? Ship
                : Plane;
              return (
                <div key={opt.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40">
                  <ModeIcon className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium capitalize">{opt.travelMode}</p>
                    {opt.fromLocation && opt.toLocation && (
                      <p className="text-xs text-muted-foreground">{opt.fromLocation} → {opt.toLocation}</p>
                    )}
                    {opt.departureDate && (
                      <p className="text-xs text-muted-foreground">
                        Departure: {format(new Date(opt.departureDate), "PPP")}
                        {opt.returnDate ? ` · Return: ${format(new Date(opt.returnDate), "PPP")}` : ""}
                      </p>
                    )}
                    {typeof opt.clientFacingFare === "number" && opt.clientFacingFare > 0 && (
                      <p className="text-xs text-primary font-medium">Client fare: ₹{opt.clientFacingFare.toLocaleString("en-IN")}</p>
                    )}
                  </div>
                </div>
              );
            })}
            {(hotelBookings ?? []).map((booking: any) => (
              <div key={booking.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40">
                <Building2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{booking.hotelName}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(booking.checkInDate), "PPP")} → {format(new Date(booking.checkOutDate), "PPP")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {booking.numberOfRooms} room{booking.numberOfRooms !== 1 ? "s" : ""} reserved
                  </p>
                  {typeof booking.clientFacingRate === "number" && booking.clientFacingRate > 0 && (
                    <p className="text-xs text-primary font-medium">Client room rate: ₹{booking.clientFacingRate.toLocaleString("en-IN")}</p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {itineraryEvents.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="w-4 h-4" />
              Itinerary
            </CardTitle>
            <CardDescription>Read-only schedule managed by your agent</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {[...itineraryEvents]
              .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
              .slice(0, 8)
              .map((item: any) => (
                <div key={item.id} className="rounded-lg bg-muted/40 p-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{item.title}</p>
                    {item.isMandatory && <Badge className="bg-primary/10 text-primary hover:bg-primary/10">Mandatory</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(item.startTime), "PPP p")} → {format(new Date(item.endTime), "PPP p")}
                  </p>
                  {item.location && <p className="text-xs text-muted-foreground">{item.location}</p>}
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {/* Guest Import */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSpreadsheet className="w-4 h-4" />
            Import Guests
          </CardTitle>
          <CardDescription>Upload a CSV or Excel file to add guests</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 w-fit">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-2"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Choose file
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleClientFileUpload}
              disabled={uploading}
            />
          </div>
          {pendingImport.length > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/30 text-sm">
              <span className="font-medium">{pendingImport.length} guests ready to import</span>
              <Button size="sm" onClick={handleImportConfirm} disabled={uploading}>
                {uploading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                Confirm Import
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setPendingImport([])}>Cancel</Button>
            </div>
          )}
          {pendingImport.length > 0 && (
            <div className="mt-2 border rounded-md overflow-auto max-h-44">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="p-2 text-left">Name</th>
                    <th className="p-2 text-left">Email</th>
                    <th className="p-2 text-left">Phone</th>
                    <th className="p-2 text-left">Category</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingImport.slice(0, 200).map((g, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-2">{g.name}</td>
                      <td className="p-2 text-muted-foreground">{g.email}</td>
                      <td className="p-2 text-muted-foreground">{g.phone}</td>
                      <td className="p-2 text-muted-foreground">{g.category || 'General'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cost Breakdown */}
      {costBreakdown && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="w-4 h-4" />
              Budget Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-primary/5 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Total Add-on Budget Allocated</p>
                <p className="text-2xl font-bold text-primary mt-1">₹{costBreakdown.totalAddOnBudgetAllocated.toLocaleString()}</p>
              </div>
              <div className="bg-accent/5 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Add-on Budget Used</p>
                <p className="text-2xl font-bold mt-1">₹{costBreakdown.totalAddOnBudgetUsed.toLocaleString()}</p>
              </div>
            </div>
            {costBreakdown.byLabel?.length > 0 && (
              <div className="space-y-2">
                {costBreakdown.byLabel.map((item: any) => (
                  <div key={item.name} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                    <div>
                      <span className="font-medium">{item.name}</span>
                      <span className="text-muted-foreground ml-2">· {item.guestCount} guests</span>
                    </div>
                    <div className="text-right">
                      <span className="text-muted-foreground">₹{item.addOnBudgetUsed.toLocaleString()} / ₹{item.addOnBudgetAllocated.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Estimated total across hotels, travel, and add-ons */}
            {(() => {
              const hotelTotal = (hotelBookings || []).reduce((sum: number, b: any) => {
                const rate = b.clientFacingRate ?? b.totalCost ?? 0;
                const nights = b.checkInDate && b.checkOutDate
                  ? Math.max(1, differenceInCalendarDays(new Date(b.checkOutDate), new Date(b.checkInDate)))
                  : 1;
                return sum + rate * (b.numberOfRooms ?? 1) * nights;
              }, 0);
              const flightTotal = (travelOptions || []).reduce((sum: number, t: any) => {
                return sum + (t.clientFacingFare ?? t.fare ?? 0);
              }, 0);
              const addOnTotal = costBreakdown.totalAddOnBudgetUsed ?? 0;
              const grandTotal = hotelTotal + flightTotal + addOnTotal;
              if (grandTotal === 0) return null;
              return (
                <div className="border-t pt-4 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Estimated Event Cost</p>
                  {hotelTotal > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Hotels</span>
                      <span>₹{hotelTotal.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {flightTotal > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Transport</span>
                      <span>₹{flightTotal.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {addOnTotal > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Add-ons</span>
                      <span>₹{addOnTotal.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-semibold border-t pt-2">
                    <span>Estimated Total</span>
                    <span className="text-primary">₹{grandTotal.toLocaleString('en-IN')}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">* Hotel cost = client rate × rooms × nights. Transport = sum of client fares per option. Actual invoiced amounts may vary.</p>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Per-Label Budget + Perk Coverage */}
      {/* Add Label Dialog */}
      <Dialog open={showAddLabel} onOpenChange={setShowAddLabel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Guest Tier</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="newLabelName">Label name</Label>
            <Input
              id="newLabelName"
              placeholder="e.g. Bride's Side, VIP, Family"
              value={newLabelName}
              onChange={(e) => setNewLabelName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateLabel()}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAddLabel(false)}>Cancel</Button>
            <Button onClick={handleCreateLabel} disabled={creatingLabel || !newLabelName.trim()}>
              {creatingLabel ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Create Label
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {(!labels || labels.length === 0) && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary" />
              Guest Tiers & Perk Coverage
            </h3>
            <Button size="sm" variant="outline" onClick={() => setShowAddLabel(true)}>
              <Plus className="w-3 h-3 mr-1" /> Add Label
            </Button>
          </div>
          <div className="text-center py-10 border-2 border-dashed rounded-xl text-muted-foreground text-sm">
            No guest tiers yet — add a label to get started
          </div>
        </div>
      )}

      {(labels && labels.length > 0) && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary" />
              Guest Tiers & Perk Coverage
            </h3>
            <Button size="sm" variant="outline" onClick={() => setShowAddLabel(true)}>
              <Plus className="w-3 h-3 mr-1" /> Add Label
            </Button>
          </div>
          {labels.map((label: any) => {
            const labelPerks = labelPerksData?.[label.id] ?? [];
            const currentBudget = budgetEdits[label.id] ?? label.addOnBudget ?? 0;

            return (
              <Card key={label.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <CardTitle className="text-base">{label.name}</CardTitle>
                      <CardDescription>Add-on budget per guest</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">₹</span>
                      <Input
                        type="number"
                        min={0}
                        className="w-28 h-8 text-sm"
                        value={currentBudget}
                        onChange={(e) => setBudgetEdits({ ...budgetEdits, [label.id]: Number(e.target.value) || 0 })}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8"
                        disabled={savingBudget === label.id || currentBudget === (label.addOnBudget ?? 0)}
                        onClick={() => handleSaveBudget(label.id)}
                      >
                        {savingBudget === label.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                      </Button>
                    </div>
                  </div>
                  {/* Budget Auto-Pilot */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/40">
                    <Switch
                      id={`autopilot-${label.id}`}
                      checked={autoPilotEnabled[label.id] ?? false}
                      onCheckedChange={(v) => setAutoPilotEnabled({ ...autoPilotEnabled, [label.id]: v })}
                    />
                    <label htmlFor={`autopilot-${label.id}`} className="text-xs text-muted-foreground cursor-pointer flex-1">
                      Budget Auto-Pilot — approve guest requests within budget limit without your review
                    </label>
                    {(autoPilotEnabled[label.id] ?? false) && (
                      <Badge className="bg-green-100 text-green-700 text-xs border-green-200 shrink-0">Auto-Pilot: ON</Badge>
                    )}
                  </div>
                </CardHeader>
                {offeredAddOns.length > 0 && (
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground mb-3">
                      Check a perk to offer it to this tier. Once offered, toggle the switch to mark it as host-covered — guests see "Included" at no extra cost.
                    </p>
                    <div className="space-y-2">
                      {offeredAddOns.map((perk: any) => {
                        const lp = labelPerks.find((x: any) => x.perkId === perk.id);
                        const isOffered = !!(lp?.isEnabled);
                        const isCovered = !!(lp?.expenseHandledByClient);
                        const key = `${label.id}-${perk.id}`;
                        const busy = togglingPerk === key;
                        return (
                          <div key={perk.id} className={`flex items-center gap-3 py-2.5 px-2 rounded-lg border transition-colors ${isOffered ? "border-primary/20 bg-primary/3" : "border-border/40"}`}>
                            {/* Checkbox — toggles isEnabled */}
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded accent-primary cursor-pointer shrink-0"
                              checked={isOffered}
                              disabled={busy}
                              onChange={(e) => handleTogglePerkEnabled(label.id, perk.id, e.target.checked)}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{perk.name}</p>
                              {perk.description && (
                                <p className="text-xs text-muted-foreground truncate">{perk.description}</p>
                              )}
                              {perk.unitCost > 0 && (
                                <p className="text-xs text-muted-foreground">₹{perk.unitCost.toLocaleString("en-IN")}</p>
                              )}
                            </div>
                            {/* Coverage toggle — only visible when offered */}
                            {isOffered && (
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs text-muted-foreground hidden sm:inline">
                                  {isCovered ? "Covered by you" : "Self-pay"}
                                </span>
                                <Switch
                                  checked={isCovered}
                                  disabled={busy}
                                  onCheckedChange={(checked) => handleTogglePerkCoverage(label.id, perk.id, checked)}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {offeredAddOns.length === 0 && (
                      <p className="text-xs text-center text-muted-foreground py-4">No perks configured for this event yet</p>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Pending Requests */}
      <div>
        <h3 className="text-lg font-medium flex items-center gap-2 mb-4">
          <Inbox className="w-5 h-5 text-primary" />
          Requests Awaiting Your Approval
          {pendingRequests.length > 0 && (
            <Badge variant="destructive" className="text-xs">{pendingRequests.length}</Badge>
          )}
        </h3>
        {pendingRequests.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed rounded-xl text-muted-foreground text-sm">
            No requests pending for your review
          </div>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map((req: any) => (
              <Card key={req.id} className="border-blue-200">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    {req.guest?.name && (
                      <p className="text-xs text-muted-foreground font-medium mb-0.5">{req.guest.name}</p>
                    )}
                    <p className="font-medium text-sm capitalize">{req.addonType ?? req.type}</p>
                    {req.notes && <p className="text-xs text-muted-foreground mt-0.5">{req.notes}</p>}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {req.budgetConsumed > 0 && (
                      <span className="text-sm font-semibold">₹{req.budgetConsumed.toLocaleString()}</span>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-200 text-red-700 hover:bg-red-50"
                      onClick={() => handleClientDecision(req.id, "rejected")}
                      disabled={updateRequest.isPending}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleClientDecision(req.id, "approved")}
                      disabled={updateRequest.isPending}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
