import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function SelectEvent() {
  const [, navigate] = useLocation();
  const [events, setEvents] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/groundteam/my-event", { credentials: "include" })
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then((data) => {
        if (Array.isArray(data)) setEvents(data);
        else if (data?.id) setEvents([data]);
        else setEvents([]);
      })
      .catch(async (err) => {
        try {
          const body = await err.json();
          setError(body?.message ?? "Failed to load events");
        } catch {
          setError("Failed to load events");
        }
      });
  }, []);

  if (error) return <div className="p-6">{error}</div>;
  if (!events) return <div className="p-6">Loading…</div>;
  if (events.length === 0) return <div className="p-6">No events assigned to this account.</div>;

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-xl font-semibold mb-4">Select Event</h2>
      <div className="space-y-3">
        {events.map(ev => (
          <div key={ev.id} className="flex items-center justify-between border rounded p-3">
            <div>
              <div className="font-medium">{ev.name}</div>
              <div className="text-xs text-muted-foreground">Code: {ev.eventCode}</div>
            </div>
            <div>
              <Button onClick={() => navigate(`/groundteam/${ev.id}/checkin`)}>Open</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
