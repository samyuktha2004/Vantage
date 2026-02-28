/**
 * HotelSearchPanel — TBO-powered hotel search orchestrator
 * Flow: Country/City → Search → Select Hotel → Select Room → Confirm Booking
 */
import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  useTBOCountries,
  useTBOCities,
  useTBOHotelSearch,
  useTBOPrebook,
} from "@/hooks/use-tbo-hotels";
import { HotelResultsList, type HotelResult, type RoomOption } from "./HotelResultsList";
import { HotelRoomSelector } from "./HotelRoomSelector";
import { HotelBookingConfirmCard } from "./HotelBookingConfirmCard";

type Phase = "search" | "results" | "rooms" | "confirm";

interface SearchParams {
  countryCode: string;
  cityCode: string;
  checkIn: string;
  checkOut: string;
  numberOfRooms: number;
  nationality: string;
}

interface Props {
  eventId: number;
  onBooked: (data: {
    hotelName: string;
    checkInDate: string;
    checkOutDate: string;
    numberOfRooms: number;
    confirmationNumber?: string;
    tboHotelData: unknown;
  }) => void;
}

export function HotelSearchPanel({ eventId, onBooked }: Props) {
  const { toast } = useToast();
  const [phase, setPhase] = useState<Phase>("search");
  const [searchParams, setSearchParams] = useState<SearchParams>({
    countryCode: "",
    cityCode: "",
    checkIn: "",
    checkOut: "",
    numberOfRooms: 1,
    nationality: "IN",
  });
  const [selectedCountry, setSelectedCountry] = useState("");
  const [hotelResults, setHotelResults] = useState<HotelResult[]>([]);
  const [selectedHotel, setSelectedHotel] = useState<HotelResult | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<RoomOption | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const { data: countries, isLoading: countriesLoading } = useTBOCountries();
  const { data: cities, isLoading: citiesLoading } = useTBOCities(selectedCountry);
  const hotelSearch = useTBOHotelSearch();
  const preBook = useTBOPrebook();

  const handleSearch = async () => {
    if (!searchParams.cityCode || !searchParams.checkIn || !searchParams.checkOut) {
      toast({ title: "Missing fields", description: "Please fill in city, check-in and check-out dates.", variant: "destructive" });
      return;
    }
    try {
      const result = await hotelSearch.mutateAsync({
        CityCode: searchParams.cityCode,
        CheckInDate: searchParams.checkIn,
        CheckOutDate: searchParams.checkOut,
        RoomGuests: [{ NoOfAdults: 2, NoOfChild: 0, ChildAge: [] }],
        NoOfRooms: searchParams.numberOfRooms,
        Nationality: searchParams.nationality,
        CountryOfResidence: searchParams.nationality,
        GuestNationality: searchParams.nationality,
        MaxRating: 5,
        MinRating: 0,
        ReviewScore: null,
        IsNearBySearchAllowed: false,
      });

      const hotels: HotelResult[] = result?.HotelResults ?? [];
      setHotelResults(hotels);
      setPhase("results");
    } catch (err: any) {
      toast({ title: "Search failed", description: err.message, variant: "destructive" });
    }
  };

  const handleSelectHotel = (hotel: HotelResult) => {
    setSelectedHotel(hotel);
    setPhase("rooms");
  };

  const handleSelectRoom = (room: RoomOption) => {
    setSelectedRoom(room);
    setPhase("confirm");
  };

  const handleConfirmBooking = async () => {
    if (!selectedHotel || !selectedRoom) return;
    setIsConfirming(true);
    try {
      // PreBook to hold the rate
      const preBookResult = await preBook.mutateAsync({
        bookingCode: selectedRoom.BookingCode,
        paymentMode: "Limit",
      });

      // Save to DB via existing hotel-booking route with tboHotelData
      const payload = {
        eventId,
        hotelName: selectedHotel.HotelName,
        checkInDate: new Date(searchParams.checkIn).toISOString(),
        checkOutDate: new Date(searchParams.checkOut).toISOString(),
        numberOfRooms: searchParams.numberOfRooms,
        tboHotelData: {
          hotelCode: selectedHotel.HotelCode,
          roomTypeName: selectedRoom.RoomTypeName,
          bookingCode: preBookResult?.BookingCode ?? selectedRoom.BookingCode,
          preBookResponse: preBookResult,
          originalRoom: selectedRoom,
          hotel: selectedHotel,
        },
      };

      const res = await fetch(`/api/events/${eventId}/hotel-booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? "Failed to save hotel booking");
      }

      const saved = await res.json();
      toast({ title: "Hotel blocked!", description: `${selectedHotel.HotelName} — ${searchParams.numberOfRooms} rooms reserved.` });
      onBooked({
        hotelName: selectedHotel.HotelName,
        checkInDate: searchParams.checkIn,
        checkOutDate: searchParams.checkOut,
        numberOfRooms: searchParams.numberOfRooms,
        tboHotelData: payload.tboHotelData,
      });
    } catch (err: any) {
      toast({ title: "Booking failed", description: err.message, variant: "destructive" });
    } finally {
      setIsConfirming(false);
    }
  };

  // ── Phase: Search form ──
  if (phase === "search") {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Country</Label>
            <Select
              onValueChange={(v) => {
                setSelectedCountry(v);
                setSearchParams((p) => ({ ...p, countryCode: v, cityCode: "" }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={countriesLoading ? "Loading…" : "Select country"} />
              </SelectTrigger>
              <SelectContent>
                {(countries ?? []).map((c: any) => (
                  <SelectItem key={c.Code} value={c.Code}>
                    {c.Name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>City</Label>
            <Select
              disabled={!selectedCountry}
              onValueChange={(v) => setSearchParams((p) => ({ ...p, cityCode: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder={citiesLoading ? "Loading…" : selectedCountry ? "Select city" : "Select country first"} />
              </SelectTrigger>
              <SelectContent>
                {(cities ?? []).map((c: any) => (
                  <SelectItem key={c.Code} value={c.Code}>
                    {c.Name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Check-In Date</Label>
            <Input
              type="date"
              value={searchParams.checkIn}
              onChange={(e) => setSearchParams((p) => ({ ...p, checkIn: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Check-Out Date</Label>
            <Input
              type="date"
              value={searchParams.checkOut}
              onChange={(e) => setSearchParams((p) => ({ ...p, checkOut: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Number of Rooms</Label>
            <Input
              type="number"
              min={1}
              value={searchParams.numberOfRooms}
              onChange={(e) => setSearchParams((p) => ({ ...p, numberOfRooms: Number(e.target.value) }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Guest Nationality</Label>
            <Input
              placeholder="IN"
              value={searchParams.nationality}
              maxLength={2}
              onChange={(e) => setSearchParams((p) => ({ ...p, nationality: e.target.value.toUpperCase() }))}
            />
          </div>
        </div>

        <Button
          className="w-full"
          onClick={handleSearch}
          disabled={hotelSearch.isPending}
        >
          {hotelSearch.isPending ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Searching hotels…</>
          ) : (
            <><Search className="w-4 h-4 mr-2" /> Search Hotels</>
          )}
        </Button>
      </div>
    );
  }

  if (phase === "results") {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {hotelResults.length} hotels found
          </p>
          <Button variant="ghost" size="sm" onClick={() => setPhase("search")}>
            ← Modify search
          </Button>
        </div>
        <HotelResultsList hotels={hotelResults} onSelectHotel={handleSelectHotel} />
      </div>
    );
  }

  if (phase === "rooms" && selectedHotel) {
    return (
      <HotelRoomSelector
        hotel={selectedHotel}
        onSelectRoom={handleSelectRoom}
        onBack={() => setPhase("results")}
      />
    );
  }

  if (phase === "confirm" && selectedHotel && selectedRoom) {
    return (
      <HotelBookingConfirmCard
        hotel={selectedHotel}
        room={selectedRoom}
        checkIn={searchParams.checkIn}
        checkOut={searchParams.checkOut}
        numberOfRooms={searchParams.numberOfRooms}
        onConfirm={handleConfirmBooking}
        onBack={() => setPhase("rooms")}
        isLoading={isConfirming}
      />
    );
  }

  return null;
}
