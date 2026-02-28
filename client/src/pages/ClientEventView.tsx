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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEvent } from "@/hooks/use-events";
import { useLabels } from "@/hooks/use-labels";
import { usePerks } from "@/hooks/use-perks";
import { useRequests } from "@/hooks/use-requests";
import { useGuests } from "@/hooks/use-guests";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Calendar, MapPin, Users, DollarSign, Tag, Gift, Inbox, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface ClientEventViewProps {
  eventId: number;
}

export default function ClientEventView({ eventId }: ClientEventViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: event, isLoading: eventLoading } = useEvent(eventId);
  const { data: labels } = useLabels(eventId);
  const { data: perks } = usePerks(eventId);
  const { data: guests } = useGuests(eventId);
  const { data: requests } = useRequests(eventId);

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

  const handleSaveBudget = async (labelId: number) => {
    const budget = budgetEdits[labelId];
    if (budget === undefined) return;
    setSavingBudget(labelId);
    try {
      const res = await fetch(`/api/events/${eventId}/labels/${labelId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ addOnBudget: budget }),
      });
      if (!res.ok) throw new Error("Failed to update budget");
      toast({ title: "Budget updated" });
      queryClient.invalidateQueries({ queryKey: ["labels", eventId] });
      queryClient.invalidateQueries({ queryKey: ["cost-breakdown", eventId] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSavingBudget(null);
    }
  };

  // Toggle perk coverage
  const [togglingPerk, setTogglingPerk] = useState<string | null>(null);

  const handleTogglePerkCoverage = async (labelId: number, perkId: number, expenseHandledByClient: boolean) => {
    const key = `${labelId}-${perkId}`;
    setTogglingPerk(key);
    try {
      const res = await fetch(`/api/labels/${labelId}/perks/${perkId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ expenseHandledByClient }),
      });
      if (!res.ok) throw new Error("Failed to update perk");
      toast({ title: expenseHandledByClient ? "Perk marked as client-covered" : "Perk coverage removed" });
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

  const confirmedGuests = (guests ?? []).filter((g: any) => g.status === "confirmed").length;
  const pendingGuests = (guests ?? []).filter((g: any) => g.status === "pending").length;
  const pendingRequests = (requests ?? []).filter((r: any) => r.status === "pending");

  return (
    <div className="space-y-8">
      {/* Event Summary */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <Calendar className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Event Date</p>
              <p className="font-semibold text-sm">{format(new Date(event.date), "PPP")}</p>
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
              <p className="font-semibold text-sm">{confirmedGuests} confirmed · {pendingGuests} pending</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost Breakdown */}
      {costBreakdown && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="w-4 h-4" />
              Budget Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
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
          </CardContent>
        </Card>
      )}

      {/* Per-Label Budget + Perk Coverage */}
      {labels && labels.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary" />
            Guest Tiers & Perk Coverage
          </h3>
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
                </CardHeader>
                {labelPerks.length > 0 && (
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground mb-3">Toggle which perks are covered by you (client-covered = guests see "Included")</p>
                    <div className="space-y-2">
                      {labelPerks.map((lp: any) => {
                        const key = `${label.id}-${lp.perkId}`;
                        return (
                          <div key={lp.id} className="flex items-center justify-between py-2 border-b last:border-0">
                            <div>
                              <p className="text-sm font-medium">{lp.perk?.name ?? `Perk #${lp.perkId}`}</p>
                              {lp.perk?.description && (
                                <p className="text-xs text-muted-foreground">{lp.perk.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs text-muted-foreground">
                                {lp.expenseHandledByClient ? "Client-covered" : "Not covered"}
                              </span>
                              <Switch
                                checked={!!lp.expenseHandledByClient}
                                disabled={togglingPerk === key}
                                onCheckedChange={(checked) => handleTogglePerkCoverage(label.id, lp.perkId, checked)}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
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
          Pending Guest Requests
          {pendingRequests.length > 0 && (
            <Badge variant="destructive" className="text-xs">{pendingRequests.length}</Badge>
          )}
        </h3>
        {pendingRequests.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed rounded-xl text-muted-foreground text-sm">
            No pending requests
          </div>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map((req: any) => (
              <Card key={req.id}>
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
                    <Badge variant="secondary">
                      <Clock className="w-3 h-3 mr-1" />
                      Pending
                    </Badge>
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
