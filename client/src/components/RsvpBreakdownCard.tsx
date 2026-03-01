import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import { getRsvpBreakdown } from "@/lib/rsvpBreakdown";

export function RsvpBreakdownCard({ guests, title = "RSVP Breakdown" }: { guests: any[]; title?: string }) {
  const breakdown = getRsvpBreakdown(guests);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="w-4 h-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2 text-sm">
          <div className="rounded-md bg-muted/30 p-2">Yes (host-managed): <span className="font-semibold">{breakdown.hostManagedYes}</span></div>
          <div className="rounded-md bg-muted/30 p-2">Yes + self-managed (partial): <span className="font-semibold">{breakdown.partialSelfManagedYes}</span></div>
          <div className="rounded-md bg-muted/30 p-2">Yes + self-managed (full): <span className="font-semibold">{breakdown.fullSelfManagedYes}</span></div>
          <div className="rounded-md bg-muted/30 p-2">Arrived: <span className="font-semibold">{breakdown.arrivedCount}</span></div>
          <div className="rounded-md bg-muted/30 p-2">No: <span className="font-semibold">{breakdown.noCount}</span></div>
          <div className="rounded-md bg-muted/30 p-2">Pending: <span className="font-semibold">{breakdown.pendingCount}</span></div>
        </div>
      </CardContent>
    </Card>
  );
}
