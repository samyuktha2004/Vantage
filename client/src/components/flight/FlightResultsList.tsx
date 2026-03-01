import { Plane, Clock, ArrowRight, Wifi } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export interface FlightSegment {
  Origin: { Airport: { AirportCode: string; AirportName: string; CityName: string } };
  Destination: { Airport: { AirportCode: string; AirportName: string; CityName: string } };
  Airline: { AirlineCode: string; AirlineName: string; FlightNumber: string };
  DepartureTime: string;
  ArrivalTime: string;
  Duration: string;
  StopOver?: number;
}

export interface FlightResult {
  ResultIndex: string;
  IsRefundable: boolean;
  Fare: { BaseFare: number; Tax: number; TotalFare: number; Currency: string };
  Segments: FlightSegment[][];
  AirlineCode?: string;
}

interface Props {
  traceId: string;
  results: FlightResult[];
  onSelect: (flight: FlightResult) => void;
}

function parseDuration(dur: string): string {
  // TBO returns duration like "P0DT2H10M" but some providers may return numbers or other shapes.
  if (dur === undefined || dur === null) return "—";
  if (typeof dur === "number") {
    const hrs = Math.floor(dur / 60);
    const mins = Math.round(dur % 60);
    return `${hrs}h ${mins}m`;
  }
  const s = String(dur);
  const match = s.match(/(\d+)H(\d+)M/);
  if (match) return `${match[1]}h ${match[2]}m`;
  // Fallback: extract digits and interpret as total minutes when sensible
  const digits = (s.replace(/\D/g, "") || "");
  if (digits) {
    const num = parseInt(digits, 10);
    if (!isNaN(num)) {
      const hrs = Math.floor(num / 60);
      const mins = num % 60;
      return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
    }
  }
  return s || "—";
}

function formatTime(dt: string): string {
  try { return format(new Date(dt), "HH:mm"); } catch { return dt; }
}

export function FlightResultsList({ traceId, results, onSelect }: Props) {
  if (!results || results.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        No flights found. Try different dates or airports.
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
      {results.map((flight) => {
        const outbound = flight.Segments?.[0]?.[0];
        if (!outbound) return null;

        const stops = flight.Segments[0].length - 1;
        const totalDuration = flight.Segments[0].reduce((acc, seg) => {
          const raw = seg.Duration;
          let mins = 0;
          if (typeof raw === "number") {
            mins = Math.round(raw);
          } else if (raw) {
            const digits = String(raw).replace(/\D/g, "");
            mins = digits ? parseInt(digits, 10) : 0;
            if (Number.isNaN(mins)) mins = 0;
          }
          return acc + mins;
        }, 0);

        return (
          <Card
            key={flight.ResultIndex}
            className="border hover:border-primary/60 transition-colors cursor-pointer"
            onClick={() => onSelect(flight)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                {/* Airline */}
                <div className="w-20 shrink-0">
                  <p className="font-semibold text-sm text-foreground">
                    {outbound.Airline?.AirlineName ?? outbound.Airline?.AirlineCode}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {outbound.Airline?.AirlineCode} {outbound.Airline?.FlightNumber}
                  </p>
                </div>

                {/* Route */}
                <div className="flex-1 flex items-center gap-2">
                  <div className="text-center">
                    <p className="font-bold text-sm">{formatTime(outbound.DepartureTime)}</p>
                    <p className="text-xs text-muted-foreground">{outbound.Origin.Airport.AirportCode}</p>
                  </div>
                  <div className="flex-1 flex flex-col items-center">
                    <p className="text-xs text-muted-foreground">{parseDuration(outbound.Duration)}</p>
                    <div className="flex items-center w-full gap-1 my-0.5">
                      <div className="flex-1 border-t border-muted-foreground/30" />
                      <Plane className="w-3 h-3 text-muted-foreground" />
                      <div className="flex-1 border-t border-muted-foreground/30" />
                    </div>
                    {stops === 0 ? (
                      <p className="text-xs text-green-600 font-medium">Non-stop</p>
                    ) : (
                      <p className="text-xs text-amber-600 font-medium">{stops} stop{stops > 1 ? "s" : ""}</p>
                    )}
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-sm">
                      {formatTime(flight.Segments[0][flight.Segments[0].length - 1].ArrivalTime)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {flight.Segments[0][flight.Segments[0].length - 1].Destination.Airport.AirportCode}
                    </p>
                  </div>
                </div>

                {/* Price */}
                <div className="text-right shrink-0">
                  <p className="font-bold text-primary">
                    {flight.Fare.Currency} {flight.Fare.TotalFare.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">per person</p>
                  <div className="flex flex-col gap-1 mt-1.5">
                    {flight.IsRefundable && (
                      <Badge variant="outline" className="text-xs text-green-600 border-green-300">Refundable</Badge>
                    )}
                    <Button size="sm" onClick={(e) => { e.stopPropagation(); onSelect(flight); }}>
                      Select
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
