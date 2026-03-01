import { Hotel, CheckCircle2, Loader2, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { HotelResult } from "./HotelResultsList";
import type { RoomSelection } from "./HotelRoomSelector";
import { format } from "date-fns";

interface Props {
  hotel: HotelResult;
  roomSelections: RoomSelection[];
  checkIn: string;
  checkOut: string;
  onConfirm: () => void;
  onBack: () => void;
  isLoading: boolean;
}

export function HotelBookingConfirmCard({
  hotel, roomSelections, checkIn, checkOut, onConfirm, onBack, isLoading,
}: Props) {
  const nights =
    checkIn && checkOut
      ? Math.round(
          (new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 1;

  const currency = roomSelections[0]?.room.Price.CurrencyCode ?? "INR";
  const totalCost = roomSelections.reduce(
    (sum, { room, quantity }) => sum + room.Price.RoomPrice * quantity * nights,
    0
  );
  const totalRooms = roomSelections.reduce((s, x) => s + x.quantity, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Confirm Hotel Booking</h3>
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← Change rooms
        </Button>
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Hotel className="w-4 h-4 text-primary" />
            {hotel.HotelName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Dates */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs flex items-center gap-1">
                <CalendarDays className="w-3 h-3" /> Check-In
              </p>
              <p className="font-medium">{checkIn ? format(new Date(checkIn), "MMM d, yyyy") : "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs flex items-center gap-1">
                <CalendarDays className="w-3 h-3" /> Check-Out
              </p>
              <p className="font-medium">{checkOut ? format(new Date(checkOut), "MMM d, yyyy") : "—"}</p>
            </div>
          </div>

          <Separator />

          {/* Room breakdown */}
          <div className="space-y-2">
            {roomSelections.map(({ room, quantity }) => (
              <div key={room.BookingCode} className="flex items-start justify-between text-sm">
                <div>
                  <p className="font-medium">{room.RoomTypeName}</p>
                  <p className="text-xs text-muted-foreground">{room.MealType ?? "Room Only"}</p>
                  <Badge
                    variant={room.IsRefundable ? "outline" : "secondary"}
                    className={`mt-1 text-xs ${room.IsRefundable ? "text-green-700 border-green-300" : ""}`}
                  >
                    {room.IsRefundable ? "Refundable" : "Non-refundable"}
                  </Badge>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="font-semibold">{quantity} room{quantity !== 1 ? "s" : ""}</p>
                  <p className="text-xs text-muted-foreground">
                    {currency} {room.Price.RoomPrice.toLocaleString()} × {quantity} × {nights}n
                  </p>
                  <p className="font-bold text-primary text-sm">
                    {currency} {(room.Price.RoomPrice * quantity * nights).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <Separator />

          {/* Total */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Estimated Total — {totalRooms} rooms, {nights} nights</p>
              <p className="text-lg font-bold text-primary">
                {currency} {totalCost.toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button
        className="w-full"
        size="lg"
        onClick={onConfirm}
        disabled={isLoading}
      >
        {isLoading ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Confirming booking…</>
        ) : (
          <><CheckCircle2 className="w-4 h-4 mr-2" /> Confirm & Block {totalRooms} Room{totalRooms !== 1 ? "s" : ""}</>
        )}
      </Button>
    </div>
  );
}
