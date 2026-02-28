import { Plane, Clock, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { format } from "date-fns";
import type { FlightResult, FlightSegment } from "./FlightResultsList";

interface FareQuoteData {
  Fare: { BaseFare: number; Tax: number; TotalFare: number; Currency: string };
  LastTicketDate?: string;
  MiniFareRules?: Array<{ Desc: string }>;
}

interface Props {
  flight: FlightResult;
  fareQuote?: FareQuoteData;
  fareQuoteLoading?: boolean;
  onConfirm: () => void;
  onBack: () => void;
}

function formatTime(dt: string): string {
  try { return format(new Date(dt), "HH:mm, MMM d"); } catch { return dt; }
}

function parseDuration(dur: string): string {
  const match = dur?.match(/(\d+)H(\d+)M/);
  if (match) return `${match[1]}h ${match[2]}m`;
  return dur ?? "—";
}

export function FlightDetailCard({ flight, fareQuote, fareQuoteLoading, onConfirm, onBack }: Props) {
  const [showFareRules, setShowFareRules] = useState(false);

  const fare = fareQuote?.Fare ?? flight.Fare;
  const outboundSegments: FlightSegment[] = flight.Segments?.[0] ?? [];
  const inboundSegments: FlightSegment[] = flight.Segments?.[1] ?? [];

  const renderSegments = (segments: FlightSegment[], label: string) => (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
      {segments.map((seg, i) => (
        <div key={i} className="flex items-start gap-3 text-sm">
          <div className="flex flex-col items-center pt-1">
            <div className="w-2 h-2 rounded-full bg-primary" />
            {i < segments.length - 1 && <div className="w-px h-8 bg-border mt-1" />}
          </div>
          <div className="flex-1 pb-2">
            <p className="font-medium">
              {seg.Airline?.AirlineName} {seg.Airline?.FlightNumber}
            </p>
            <div className="flex items-center gap-2 text-muted-foreground text-xs mt-0.5">
              <span>{seg.Origin.Airport.CityName} ({seg.Origin.Airport.AirportCode})</span>
              <span>{formatTime(seg.DepartureTime)}</span>
              <span>→</span>
              <span>{seg.Destination.Airport.CityName} ({seg.Destination.Airport.AirportCode})</span>
              <span>{formatTime(seg.ArrivalTime)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Duration: {parseDuration(seg.Duration)}
              {seg.StopOver ? ` | Stopover: ${seg.StopOver}min` : ""}
            </p>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Flight Details</h3>
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← Back to results
        </Button>
      </div>

      <Card className="border-primary/30">
        <CardContent className="p-4 space-y-4">
          {renderSegments(outboundSegments, "Outbound")}
          {inboundSegments.length > 0 && (
            <>
              <Separator />
              {renderSegments(inboundSegments, "Return")}
            </>
          )}

          <Separator />

          {/* Fare breakdown */}
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Base Fare</p>
              <p className="font-medium">{fare.Currency} {fare.BaseFare.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tax & Fees</p>
              <p className="font-medium">{fare.Currency} {fare.Tax.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total / Person</p>
              <p className="font-bold text-primary">{fare.Currency} {fare.TotalFare.toLocaleString()}</p>
            </div>
          </div>

          {fareQuote?.LastTicketDate && (
            <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded">
              <AlertCircle className="w-3 h-3" />
              Book before {format(new Date(fareQuote.LastTicketDate), "MMM d, yyyy HH:mm")}
            </div>
          )}

          {/* Fare rules accordion */}
          {fareQuote?.MiniFareRules && fareQuote.MiniFareRules.length > 0 && (
            <div>
              <button
                className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                onClick={() => setShowFareRules(!showFareRules)}
              >
                Cancellation & change policy
                {showFareRules ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {showFareRules && (
                <div className="mt-2 text-xs text-muted-foreground space-y-1 bg-muted/30 p-3 rounded">
                  {fareQuote.MiniFareRules.map((rule, i) => (
                    <p key={i}>{rule.Desc}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Badge variant={flight.IsRefundable ? "outline" : "secondary"} className={flight.IsRefundable ? "text-green-700 border-green-300" : ""}>
          {flight.IsRefundable ? "Refundable" : "Non-refundable"}
        </Badge>
      </div>

      <Button className="w-full" size="lg" onClick={onConfirm} disabled={fareQuoteLoading}>
        {fareQuoteLoading ? "Verifying fare…" : "Confirm & Proceed to Book"}
      </Button>
    </div>
  );
}
