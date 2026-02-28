import { Plane, Users, CheckCircle2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import type { FlightResult } from "./FlightResultsList";
import { format } from "date-fns";

interface Props {
  flight: FlightResult;
  traceId: string;
  adults: number;
  children: number;
  infants: number;
  onConfirm: () => void;
  onBack: () => void;
  isLoading: boolean;
}

export function FlightBookingConfirmCard({
  flight, traceId, adults, children, infants, onConfirm, onBack, isLoading,
}: Props) {
  const outbound = flight.Segments?.[0]?.[0];
  const lastSeg = flight.Segments?.[0]?.[flight.Segments[0].length - 1];
  const paxCount = adults + children + infants;
  const totalFare = flight.Fare.TotalFare * adults +
    flight.Fare.TotalFare * 0.75 * children +
    flight.Fare.TotalFare * 0.1 * infants;

  const formatDT = (dt: string) => {
    try { return format(new Date(dt), "HH:mm, MMM d yyyy"); } catch { return dt; }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Confirm Flight Booking</h3>
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← Back
        </Button>
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Plane className="w-4 h-4 text-primary" />
            {outbound?.Airline?.AirlineName ?? "Flight"}
            <span className="text-muted-foreground font-normal text-sm">
              {outbound?.Airline?.AirlineCode}{outbound?.Airline?.FlightNumber}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Departure</p>
              <p className="font-medium">
                {outbound ? `${outbound.Origin.Airport.CityName} (${outbound.Origin.Airport.AirportCode})` : "—"}
              </p>
              <p className="text-xs text-muted-foreground">{outbound ? formatDT(outbound.DepartureTime) : "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Arrival</p>
              <p className="font-medium">
                {lastSeg ? `${lastSeg.Destination.Airport.CityName} (${lastSeg.Destination.Airport.AirportCode})` : "—"}
              </p>
              <p className="text-xs text-muted-foreground">{lastSeg ? formatDT(lastSeg.ArrivalTime) : "—"}</p>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span>{adults} Adult{adults > 1 ? "s" : ""}</span>
              {children > 0 && <span>+ {children} Child{children > 1 ? "ren" : ""}</span>}
              {infants > 0 && <span>+ {infants} Infant{infants > 1 ? "s" : ""}</span>}
            </div>
            <Badge variant={flight.IsRefundable ? "outline" : "secondary"} className={flight.IsRefundable ? "text-green-700 border-green-300" : ""}>
              {flight.IsRefundable ? "Refundable" : "Non-refundable"}
            </Badge>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Estimated Group Fare</p>
              <p className="text-lg font-bold text-primary">
                {flight.Fare.Currency} {totalFare.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
            <p className="text-xs text-muted-foreground text-right">
              {flight.Fare.Currency} {flight.Fare.TotalFare.toLocaleString()} per adult × {adults}
            </p>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Note: Agent passenger details will be used as placeholder for group booking. Individual guest details are collected via the guest portal.
      </p>

      <Button className="w-full" size="lg" onClick={onConfirm} disabled={isLoading}>
        {isLoading ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Booking flight…</>
        ) : (
          <><CheckCircle2 className="w-4 h-4 mr-2" /> Confirm & Book Flight</>
        )}
      </Button>
    </div>
  );
}
