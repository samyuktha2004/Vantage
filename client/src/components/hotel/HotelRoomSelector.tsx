import { useState } from "react";
import { CheckCircle2, RefreshCw, Utensils, Minus, Plus, ShoppingCart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { HotelResult, RoomOption } from "./HotelResultsList";
import { format } from "date-fns";

export interface RoomSelection {
  room: RoomOption;
  quantity: number;
}

interface Props {
  hotel: HotelResult;
  onSelectRooms: (selections: RoomSelection[]) => void;
  onBack: () => void;
}

export function HotelRoomSelector({ hotel, onSelectRooms, onBack }: Props) {
  const rooms = hotel.Rooms ?? [];
  const [quantities, setQuantities] = useState<Record<string, number>>(
    Object.fromEntries(rooms.map((r) => [r.BookingCode, 0]))
  );

  const setQty = (bookingCode: string, delta: number) => {
    setQuantities((prev) => ({
      ...prev,
      [bookingCode]: Math.max(0, (prev[bookingCode] ?? 0) + delta),
    }));
  };

  const selections: RoomSelection[] = rooms
    .filter((r) => (quantities[r.BookingCode] ?? 0) > 0)
    .map((r) => ({ room: r, quantity: quantities[r.BookingCode]! }));

  const totalRooms = selections.reduce((s, x) => s + x.quantity, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">{hotel.HotelName}</h3>
          <p className="text-sm text-muted-foreground">
            {rooms.length} room types — set quantities then confirm
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← Back to hotels
        </Button>
      </div>

      <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
        {rooms.map((room, idx) => {
          const qty = quantities[room.BookingCode] ?? 0;
          const cancellationDate = room.LastCancellationDate
            ? new Date(room.LastCancellationDate)
            : null;

          return (
            <Card
              key={room.BookingCode ?? idx}
              className={`border transition-colors ${qty > 0 ? "border-primary/60 bg-primary/5" : "hover:border-primary/40"}`}
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

                  <div className="text-right shrink-0 space-y-2">
                    <p className="font-bold text-primary">
                      {room.Price.CurrencyCode} {room.Price.RoomPrice.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">per night</p>

                    {/* Quantity stepper */}
                    <div className="flex items-center gap-2 justify-end">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-7 w-7"
                        onClick={() => setQty(room.BookingCode, -1)}
                        disabled={qty === 0}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-6 text-center text-sm font-semibold tabular-nums">{qty}</span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-7 w-7"
                        onClick={() => setQty(room.BookingCode, 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Cart summary */}
      {selections.length > 0 && (
        <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <ShoppingCart className="w-3 h-3" /> Selection Summary
          </p>
          {selections.map(({ room, quantity }) => (
            <div key={room.BookingCode} className="flex justify-between text-sm">
              <span>{room.RoomTypeName} × {quantity}</span>
              <span className="font-medium">
                {room.Price.CurrencyCode} {(room.Price.RoomPrice * quantity).toLocaleString()}
                <span className="text-muted-foreground font-normal"> /night</span>
              </span>
            </div>
          ))}
        </div>
      )}

      <Button
        className="w-full"
        disabled={totalRooms === 0}
        onClick={() => onSelectRooms(selections)}
      >
        Confirm Selection — {totalRooms} room{totalRooms !== 1 ? "s" : ""} selected
      </Button>
    </div>
  );
}
