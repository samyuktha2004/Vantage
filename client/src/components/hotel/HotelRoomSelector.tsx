import { CheckCircle2, RefreshCw, Utensils } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { HotelResult, RoomOption } from "./HotelResultsList";
import { format } from "date-fns";

interface Props {
  hotel: HotelResult;
  onSelectRoom: (room: RoomOption) => void;
  onBack: () => void;
}

export function HotelRoomSelector({ hotel, onSelectRoom, onBack }: Props) {
  const rooms = hotel.Rooms ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">{hotel.HotelName}</h3>
          <p className="text-sm text-muted-foreground">{rooms.length} room types available</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← Back to hotels
        </Button>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
        {rooms.map((room, idx) => {
          const cancellationDate = room.LastCancellationDate
            ? new Date(room.LastCancellationDate)
            : null;

          return (
            <Card
              key={room.BookingCode ?? idx}
              className="border hover:border-primary/60 transition-colors"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{room.RoomTypeName}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {room.MealType && (
                        <Badge variant="secondary" className="text-xs flex items-center gap-1">
                          <Utensils className="w-3 h-3" />
                          {room.MealType}
                        </Badge>
                      )}
                      {room.IsRefundable ? (
                        <Badge variant="outline" className="text-xs text-green-600 border-green-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Refundable
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-destructive border-destructive/30">
                          Non-refundable
                        </Badge>
                      )}
                    </div>
                    {cancellationDate && room.IsRefundable && (
                      <p className="text-xs text-muted-foreground mt-1.5">
                        <RefreshCw className="w-3 h-3 inline mr-1" />
                        Free cancellation until {format(cancellationDate, "MMM d, yyyy")}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-primary">
                      {room.Price.CurrencyCode} {room.Price.RoomPrice.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">per night</p>
                    <Button
                      size="sm"
                      className="mt-2"
                      onClick={() => onSelectRoom(room)}
                    >
                      Select Room
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
