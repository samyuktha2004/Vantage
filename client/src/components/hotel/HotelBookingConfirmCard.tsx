import { Hotel, CheckCircle2, Loader2, CalendarDays, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { HotelResult, RoomOption } from "./HotelResultsList";
import { format } from "date-fns";

interface Props {
  hotel: HotelResult;
  room: RoomOption;
  checkIn: string;
  checkOut: string;
  numberOfRooms: number;
  onConfirm: () => void;
  onBack: () => void;
  isLoading: boolean;
}

export function HotelBookingConfirmCard({
  hotel, room, checkIn, checkOut, numberOfRooms, onConfirm, onBack, isLoading,
}: Props) {
  const nights =
    checkIn && checkOut
      ? Math.round(
          (new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 1;

  const totalCost = room.Price.RoomPrice * numberOfRooms * nights;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Confirm Hotel Booking</h3>
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← Change room
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
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Room Type</p>
              <p className="font-medium">{room.RoomTypeName}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Meal Plan</p>
              <p className="font-medium">{room.MealType ?? "Room Only"}</p>
            </div>
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
            <div>
              <p className="text-muted-foreground text-xs flex items-center gap-1">
                <Users className="w-3 h-3" /> Rooms Blocked
              </p>
              <p className="font-medium">{numberOfRooms} rooms × {nights} nights</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Cancellation</p>
              <Badge
                variant={room.IsRefundable ? "outline" : "secondary"}
                className={room.IsRefundable ? "text-green-700 border-green-300" : ""}
              >
                {room.IsRefundable ? "Refundable" : "Non-refundable"}
              </Badge>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Estimated Total (group rate)</p>
              <p className="text-lg font-bold text-primary">
                {room.Price.CurrencyCode} {totalCost.toLocaleString()}
              </p>
            </div>
            <p className="text-xs text-muted-foreground text-right">
              {room.Price.CurrencyCode} {room.Price.RoomPrice.toLocaleString()} × {numberOfRooms} rooms × {nights} nights
            </p>
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
          <><CheckCircle2 className="w-4 h-4 mr-2" /> Confirm & Block Rooms</>
        )}
      </Button>
    </div>
  );
}
