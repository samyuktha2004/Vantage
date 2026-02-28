import { Star, MapPin, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface HotelResult {
  HotelCode: string;
  HotelName: string;
  StarRating?: number;
  HotelAddress?: string;
  Rooms: RoomOption[];
}

export interface RoomOption {
  BookingCode: string;
  RoomTypeName: string;
  MealType?: string;
  Price: { RoomPrice: number; CurrencyCode: string };
  IsRefundable?: boolean;
  LastCancellationDate?: string;
}

interface Props {
  hotels: HotelResult[];
  onSelectHotel: (hotel: HotelResult) => void;
}

export function HotelResultsList({ hotels, onSelectHotel }: Props) {
  if (!hotels || hotels.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        No hotels found. Try adjusting your search.
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
      {hotels.map((hotel) => {
        const lowestRoom = hotel.Rooms?.reduce(
          (min, r) => (r.Price.RoomPrice < min.Price.RoomPrice ? r : min),
          hotel.Rooms[0]
        );
        const currency = lowestRoom?.Price.CurrencyCode ?? "INR";
        const price = lowestRoom?.Price.RoomPrice;

        return (
          <Card
            key={hotel.HotelCode}
            className="border hover:border-primary/60 transition-colors cursor-pointer"
            onClick={() => onSelectHotel(hotel)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground truncate">
                      {hotel.HotelName}
                    </h3>
                    {hotel.StarRating ? (
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: hotel.StarRating }).map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    ) : null}
                  </div>
                  {hotel.HotelAddress && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{hotel.HotelAddress}</span>
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {hotel.Rooms?.length ?? 0} room options
                    </Badge>
                    {lowestRoom?.IsRefundable && (
                      <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Refundable
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {price != null && (
                    <div>
                      <p className="text-xs text-muted-foreground">from</p>
                      <p className="font-bold text-primary">
                        {currency} {price.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">/ night</p>
                    </div>
                  )}
                  <Button size="sm" className="mt-2" onClick={(e) => { e.stopPropagation(); onSelectHotel(hotel); }}>
                    Select
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
