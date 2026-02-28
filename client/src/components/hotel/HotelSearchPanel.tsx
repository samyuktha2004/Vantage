/**
 * HotelSearchPanel — TBO-powered hotel search orchestrator
 * Flow: Country/City → Search → Select Hotel → Select Room → Confirm Booking
 */
import { useState } from "react";
import { Search, Loader2, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
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

// Fallback countries shown when TBO country API is unavailable
const FALLBACK_COUNTRIES = [
  { Code: "IN", Name: "India" },
  { Code: "AE", Name: "United Arab Emirates" },
  { Code: "GB", Name: "United Kingdom" },
  { Code: "US", Name: "United States" },
  { Code: "SG", Name: "Singapore" },
  { Code: "TH", Name: "Thailand" },
  { Code: "FR", Name: "France" },
  { Code: "DE", Name: "Germany" },
  { Code: "AU", Name: "Australia" },
  { Code: "JP", Name: "Japan" },
  { Code: "QA", Name: "Qatar" },
  { Code: "SA", Name: "Saudi Arabia" },
  { Code: "MV", Name: "Maldives" },
  { Code: "LK", Name: "Sri Lanka" },
  { Code: "NP", Name: "Nepal" },
  { Code: "BH", Name: "Bahrain" },
  { Code: "OM", Name: "Oman" },
  { Code: "MY", Name: "Malaysia" },
  { Code: "ID", Name: "Indonesia" },
  { Code: "ZA", Name: "South Africa" },
  { Code: "KE", Name: "Kenya" },
  { Code: "IT", Name: "Italy" },
  { Code: "ES", Name: "Spain" },
  { Code: "NL", Name: "Netherlands" },
  { Code: "CH", Name: "Switzerland" },
];

type Phase = "search" | "results" | "rooms" | "confirm";
type CommissionType = "amount" | "percentage";

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
  const [countryOpen, setCountryOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [hotelResults, setHotelResults] = useState<HotelResult[]>([]);
  const [selectedHotel, setSelectedHotel] = useState<HotelResult | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<RoomOption | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [commissionType, setCommissionType] = useState<CommissionType>("amount");
  const [commissionValue, setCommissionValue] = useState(0);

  const getEditedRate = (baseRate: number) => {
    if (!baseRate || baseRate <= 0) return 0;
    const commission = commissionType === "percentage"
      ? Math.round((baseRate * Math.max(commissionValue, 0)) / 100)
      : Math.max(commissionValue, 0);
    return Math.max(baseRate + commission, 0);
  };

  const {
    data: countries,
    isLoading: countriesLoading,
    error: countriesError,
  } = useTBOCountries();
  const {
    data: cities,
    isLoading: citiesLoading,
    error: citiesError,
  } = useTBOCities(selectedCountry);
  const hotelSearch = useTBOHotelSearch();
  const preBook = useTBOPrebook();

  // Merge TBO countries with fallback — if API returns data, prefer it; else show fallback
  const countryList: { Code: string; Name: string }[] = (() => {
    const apiList = (countries ?? [])
      .map((c: any) => ({ Code: c?.Code ?? c?.code ?? "", Name: c?.Name ?? c?.name ?? "" }))
      .filter((c: { Code: string; Name: string }) => c.Code && c.Name);
    return apiList.length > 0 ? apiList : FALLBACK_COUNTRIES;
  })();

  const cityList: { Code: string; Name: string }[] = (cities ?? [])
    .map((c: any) => ({ Code: c?.Code ?? c?.code ?? "", Name: c?.Name ?? c?.name ?? "" }))
    .filter((c: { Code: string; Name: string }) => c.Code && c.Name);

  const useCityTextInput = !citiesLoading && selectedCountry && (!!citiesError || cityList.length === 0);

  const handleSearch = async () => {
    if (!searchParams.cityCode || !searchParams.checkIn || !searchParams.checkOut) {
      toast({ title: "Missing fields", description: "Please fill in city, check-in and check-out dates.", variant: "destructive" });
      return;
    }
    const checkInDate = new Date(searchParams.checkIn + "T00:00:00");
    const checkOutDate = new Date(searchParams.checkOut + "T00:00:00");
    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      toast({ title: "Invalid dates", description: "Please provide valid check-in and check-out dates.", variant: "destructive" });
      return;
    }
    if (checkOutDate <= checkInDate) {
      toast({ title: "Invalid date range", description: "Check-out date must be after check-in date.", variant: "destructive" });
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

      // Validate and convert dates — append T00:00:00 to prevent UTC timezone shift
      if (!searchParams.checkIn || !searchParams.checkOut) {
        throw new Error("Check-in and check-out dates are required");
      }
      const checkInDate = new Date(searchParams.checkIn + "T00:00:00");
      const checkOutDate = new Date(searchParams.checkOut + "T00:00:00");
      if (isNaN(checkInDate.getTime())) throw new Error("Invalid check-in date");
      if (isNaN(checkOutDate.getTime())) throw new Error("Invalid check-out date");
      if (checkOutDate <= checkInDate) throw new Error("Check-out date must be after check-in date");

      // Save to DB via existing hotel-booking route with tboHotelData
      const baseRate = Number(selectedRoom?.Price?.RoomPrice ?? 0);
      const clientFacingRate = baseRate > 0 ? getEditedRate(baseRate) : null;
      const payload = {
        eventId,
        hotelName: selectedHotel.HotelName,
        checkInDate: checkInDate.toISOString(),
        checkOutDate: checkOutDate.toISOString(),
        numberOfRooms: searchParams.numberOfRooms,
        baseRate: baseRate > 0 ? baseRate : null,
        commissionType,
        commissionValue: commissionValue > 0 ? commissionValue : 0,
        clientFacingRate,
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

          {/* ── Country combobox ── */}
          <div className="space-y-1.5">
            <Label>Country</Label>
            <Popover open={countryOpen} onOpenChange={setCountryOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between font-normal"
                >
                  <span className="truncate">
                    {selectedCountry
                      ? (countryList.find(c => c.Code === selectedCountry)?.Name ?? selectedCountry)
                      : countriesLoading ? "Loading…" : "Select country"}
                  </span>
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search country…" />
                  <CommandList>
                    <CommandEmpty>No country found.</CommandEmpty>
                    <CommandGroup>
                      {countryList.map(c => (
                        <CommandItem
                          key={c.Code}
                          value={`${c.Name} ${c.Code}`}
                          onSelect={() => {
                            setSelectedCountry(c.Code);
                            setSearchParams(p => ({ ...p, countryCode: c.Code, cityCode: "" }));
                            setCountryOpen(false);
                          }}
                        >
                          <Check className={`mr-2 h-4 w-4 ${selectedCountry === c.Code ? "opacity-100" : "opacity-0"}`} />
                          {c.Name}
                          <span className="ml-auto text-xs text-muted-foreground">{c.Code}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {countriesError && (
              <p className="text-xs text-amber-600 mt-1">Showing popular destinations first</p>
            )}
          </div>

          {/* ── City combobox or text fallback ── */}
          <div className="space-y-1.5">
            <Label>City</Label>
            {useCityTextInput ? (
              <>
                <Input
                  placeholder="Enter TBO city code"
                  value={searchParams.cityCode}
                  onChange={e => setSearchParams(p => ({ ...p, cityCode: e.target.value }))}
                />
                <p className="text-xs text-amber-600">City list unavailable — enter the TBO city code directly.</p>
              </>
            ) : (
              <Popover open={cityOpen} onOpenChange={setCityOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between font-normal"
                    disabled={!selectedCountry}
                  >
                    <span className="truncate">
                      {searchParams.cityCode
                        ? (cityList.find(c => c.Code === searchParams.cityCode)?.Name ?? searchParams.cityCode)
                        : citiesLoading ? "Loading…" : selectedCountry ? "Select city" : "Select country first"}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search city…" />
                    <CommandList>
                      <CommandEmpty>No city found.</CommandEmpty>
                      <CommandGroup>
                        {cityList.map(c => (
                          <CommandItem
                            key={c.Code}
                            value={`${c.Name} ${c.Code}`}
                            onSelect={() => {
                              setSearchParams(p => ({ ...p, cityCode: c.Code }));
                              setCityOpen(false);
                            }}
                          >
                            <Check className={`mr-2 h-4 w-4 ${searchParams.cityCode === c.Code ? "opacity-100" : "opacity-0"}`} />
                            {c.Name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Check-In Date</Label>
            <Input
              type="date"
              value={searchParams.checkIn}
              onChange={(e) => {
                const nextCheckIn = e.target.value;
                setSearchParams((p) => {
                  const shouldResetCheckOut = p.checkOut && nextCheckIn && new Date(p.checkOut) <= new Date(nextCheckIn);
                  return { ...p, checkIn: nextCheckIn, checkOut: shouldResetCheckOut ? "" : p.checkOut };
                });
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Check-Out Date</Label>
            <Input
              type="date"
              min={searchParams.checkIn || undefined}
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
    const baseRate = Number(selectedRoom?.Price?.RoomPrice ?? 0);
    const editedRate = baseRate > 0 ? getEditedRate(baseRate) : 0;
    return (
      <div className="space-y-4">
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
        <div className="rounded-lg border p-4 space-y-3 bg-muted/10">
          <p className="text-sm font-medium">Client Pricing (visible to client/guest)</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Base Rate (₹)</Label>
              <Input value={baseRate > 0 ? baseRate : ""} disabled />
            </div>
            <div className="space-y-1">
              <Label>Commission Type</Label>
              <Select value={commissionType} onValueChange={(v) => setCommissionType(v as CommissionType)}>
                <SelectTrigger className="bg-white text-gray-900 border-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white text-gray-900 border-input">
                  <SelectItem className="bg-white text-gray-900 data-[highlighted]:bg-gray-100 data-[state=checked]:bg-primary/10" value="amount">Amount (₹)</SelectItem>
                  <SelectItem className="bg-white text-gray-900 data-[highlighted]:bg-gray-100 data-[state=checked]:bg-primary/10" value="percentage">Percentage (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Commission Value</Label>
              <Input
                type="number"
                min={0}
                value={commissionValue || ""}
                onChange={(e) => setCommissionValue(Number(e.target.value) || 0)}
                placeholder={commissionType === "percentage" ? "e.g. 12" : "e.g. 800"}
              />
            </div>
          </div>
          {editedRate > 0 && (
            <p className="text-xs text-primary font-medium">Edited client room rate: ₹{editedRate.toLocaleString("en-IN")}</p>
          )}
        </div>
      </div>
    );
  }

  return null;
}
