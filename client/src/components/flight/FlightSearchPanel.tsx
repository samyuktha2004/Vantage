/**
 * FlightSearchPanel — TBO-powered flight search orchestrator
 * Flow: Search form → Results → Detail + FareQuote → Confirm Booking
 * TraceId is preserved in component state through all phases.
 */
import { useState } from "react";
import { Search, Loader2, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import {
  useTBOFlightSearch,
  useTBOFareQuote,
  useTBOBookFlight,
  useTBOTicket,
} from "@/hooks/use-tbo-flights";
import { FlightResultsList, type FlightResult } from "./FlightResultsList";
import { FlightDetailCard } from "./FlightDetailCard";
import { FlightBookingConfirmCard } from "./FlightBookingConfirmCard";
import {
  generateMockFlights,
  isMockFlightResult,
} from "@/lib/uat-mock-generators";

// Common airports — covers most Indian and international group travel routes
const AIRPORTS = [
  { code: "DEL", name: "Indira Gandhi Intl — New Delhi" },
  { code: "BOM", name: "Chhatrapati Shivaji — Mumbai" },
  { code: "BLR", name: "Kempegowda Intl — Bengaluru" },
  { code: "MAA", name: "Chennai International" },
  { code: "CCU", name: "Netaji Subhash Chandra Bose — Kolkata" },
  { code: "HYD", name: "Rajiv Gandhi Intl — Hyderabad" },
  { code: "GOI", name: "Dabolim — Goa" },
  { code: "AMD", name: "Sardar Vallabhbhai Patel — Ahmedabad" },
  { code: "COK", name: "Cochin International — Kochi" },
  { code: "PNQ", name: "Pune International" },
  { code: "JAI", name: "Jaipur International" },
  { code: "IXC", name: "Shaheed Bhagat Singh — Chandigarh" },
  { code: "NAG", name: "Dr. Babasaheb Ambedkar — Nagpur" },
  { code: "BBI", name: "Biju Patnaik — Bhubaneswar" },
  { code: "GAU", name: "Lokpriya Gopinath Bordoloi — Guwahati" },
  { code: "DXB", name: "Dubai International" },
  { code: "AUH", name: "Abu Dhabi International" },
  { code: "SHJ", name: "Sharjah International" },
  { code: "DOH", name: "Hamad International — Doha" },
  { code: "BAH", name: "Bahrain International" },
  { code: "MCT", name: "Muscat International" },
  { code: "RUH", name: "King Khalid — Riyadh" },
  { code: "JED", name: "King Abdulaziz — Jeddah" },
  { code: "KWI", name: "Kuwait International" },
  { code: "SIN", name: "Changi — Singapore" },
  { code: "KUL", name: "Kuala Lumpur International" },
  { code: "BKK", name: "Suvarnabhumi — Bangkok" },
  { code: "HKG", name: "Hong Kong International" },
  { code: "NRT", name: "Narita — Tokyo" },
  { code: "ICN", name: "Incheon — Seoul" },
  { code: "PEK", name: "Capital — Beijing" },
  { code: "PVG", name: "Pudong — Shanghai" },
  { code: "SYD", name: "Kingsford Smith — Sydney" },
  { code: "MEL", name: "Tullamarine — Melbourne" },
  { code: "LHR", name: "Heathrow — London" },
  { code: "LGW", name: "Gatwick — London" },
  { code: "CDG", name: "Charles de Gaulle — Paris" },
  { code: "FRA", name: "Frankfurt International" },
  { code: "AMS", name: "Schiphol — Amsterdam" },
  { code: "ZUR", name: "Zurich International" },
  { code: "MXP", name: "Malpensa — Milan" },
  { code: "JFK", name: "John F. Kennedy — New York" },
  { code: "LAX", name: "Los Angeles International" },
  { code: "ORD", name: "O'Hare — Chicago" },
  { code: "SFO", name: "San Francisco International" },
  { code: "CMB", name: "Bandaranaike — Colombo" },
  { code: "DAC", name: "Hazrat Shahjalal — Dhaka" },
  { code: "KTM", name: "Tribhuvan — Kathmandu" },
  { code: "MLE", name: "Velana International — Malé" },
  { code: "NBO", name: "Jomo Kenyatta — Nairobi" },
  { code: "JNB", name: "OR Tambo — Johannesburg" },
  { code: "CAI", name: "Cairo International" },
];

/** Searchable airport combobox — filters by code or city name */
function AirportCombobox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (code: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const selectedAirport = AIRPORTS.find(a => a.code === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
          <span className="truncate">
            {selectedAirport
              ? <><span className="font-mono font-semibold">{selectedAirport.code}</span> — {selectedAirport.name.split(" — ")[1] ?? selectedAirport.name}</>
              : value
                ? <span className="font-mono font-semibold">{value}</span>
                : <span className="text-muted-foreground">{placeholder}</span>}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search by city or code…" />
          <CommandList>
            <CommandEmpty>
              <div className="py-3 px-2 text-center">
                <p className="text-sm text-muted-foreground mb-2">Airport not in list.</p>
                <Input
                  placeholder="Enter IATA code (e.g. DEL)"
                  maxLength={3}
                  className="text-center font-mono uppercase"
                  value={value}
                  onChange={e => onChange(e.target.value.toUpperCase())}
                  onKeyDown={e => { if (e.key === "Enter") setOpen(false); }}
                />
              </div>
            </CommandEmpty>
            <CommandGroup heading="Common Airports">
              {AIRPORTS.map(a => (
                <CommandItem
                  key={a.code}
                  value={`${a.code} ${a.name}`}
                  onSelect={() => {
                    onChange(a.code);
                    setOpen(false);
                  }}
                >
                  <Check className={`mr-2 h-4 w-4 ${value === a.code ? "opacity-100" : "opacity-0"}`} />
                  <span className="font-mono font-medium w-10 shrink-0">{a.code}</span>
                  <span className="text-sm text-muted-foreground truncate">{a.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

type Phase = "search" | "results" | "detail" | "confirm";
type CommissionType = "amount" | "percentage";

interface SearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  journeyType: "1" | "2"; // 1=one-way, 2=return
  adults: number;
  children: number;
  infants: number;
  directFlight: boolean;
  cabinClass: string;
}

interface Props {
  eventId: number;
  onBooked: (data: {
    travelMode: string;
    fromLocation: string;
    toLocation: string;
    departureDate: string;
    returnDate?: string;
    tboFlightData: unknown;
  }) => void;
}

export function FlightSearchPanel({ eventId, onBooked }: Props) {
  const { toast } = useToast();
  const [phase, setPhase] = useState<Phase>("search");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useState<SearchParams>({
    origin: "",
    destination: "",
    departureDate: "",
    returnDate: "",
    journeyType: "1",
    adults: 1,
    children: 0,
    infants: 0,
    directFlight: false,
    cabinClass: "2",
  });

  // State that persists across phases
  const [traceId, setTraceId] = useState("");
  const [flightResults, setFlightResults] = useState<FlightResult[]>([]);
  const [isLiveResult, setIsLiveResult] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState<FlightResult | null>(null);
  const [fareQuoteData, setFareQuoteData] = useState<any>(null);
    const [commissionType, setCommissionType] = useState<CommissionType>("amount");
    const [commissionValue, setCommissionValue] = useState(0);
  const [isConfirming, setIsConfirming] = useState(false);

  const flightSearch = useTBOFlightSearch();
  const fareQuote = useTBOFareQuote();
  const bookFlight = useTBOBookFlight();
  const issueTicket = useTBOTicket();

  const getEditedFare = (baseFare: number) => {
    if (!baseFare || baseFare <= 0) return 0;
    const commission = commissionType === "percentage"
      ? Math.round((baseFare * Math.max(commissionValue, 0)) / 100)
      : Math.max(commissionValue, 0);
    return Math.max(baseFare + commission, 0);
  };

  const handleSearch = async () => {
    if (!searchParams.origin || !searchParams.destination || !searchParams.departureDate) {
      toast({ title: "Missing fields", description: "Origin, destination and departure date are required.", variant: "destructive" });
      return;
    }
    setSearchError(null);
    try {
      const result = await flightSearch.mutateAsync({
        origin: searchParams.origin.toUpperCase(),
        destination: searchParams.destination.toUpperCase(),
        departureDate: searchParams.departureDate,
        returnDate: searchParams.journeyType === "2" ? searchParams.returnDate : undefined,
        journeyType: searchParams.journeyType,
        adults: searchParams.adults,
        children: searchParams.children,
        infants: searchParams.infants,
        directFlight: searchParams.directFlight,
        cabinClass: searchParams.cabinClass,
      });

      // TBO wraps all responses in a "Response" envelope
      const tid: string = result?.Response?.TraceId ?? "";
      // Results is FlightResult[][] — take the first flight from each group
      const rawResults: any[][] = result?.Response?.Results ?? [];
      let results: FlightResult[] = rawResults
        .map((group: any[]) => group[0])
        .filter(Boolean);

      const gotLive = results.length > 0;
      if (results.length === 0) {
        results = generateMockFlights({
          origin: searchParams.origin,
          destination: searchParams.destination,
          departureDate: searchParams.departureDate,
        });
      }

      setIsLiveResult(gotLive);
      setTraceId(tid);
      setFlightResults(results);
      setPhase("results");
    } catch (err: any) {
      const msg: string = err.message ?? "TBO unavailable";
      setSearchError(msg);
      toast({ title: "Search failed", description: msg, variant: "destructive" });
    }
  };

  const handleSelectFlight = async (flight: FlightResult) => {
    setSelectedFlight(flight);
    setPhase("detail");
    // Fetch fare quote in parallel
    try {
      const fq = await fareQuote.mutateAsync({ traceId, resultIndex: flight.ResultIndex });
      setFareQuoteData(fq?.Response ?? fq);
    } catch {
      // Fare quote is non-blocking — continue without it
    }
  };

  const handleConfirmBooking = async () => {
    if (!selectedFlight) return;
    setIsConfirming(true);
    try {
      const isMockFlight = isMockFlightResult(selectedFlight.ResultIndex);
      const fare = fareQuoteData?.Fare ?? selectedFlight.Fare;
      const isLCC: boolean = isMockFlight ? true : (selectedFlight as any).IsLCC === true;

      // Placeholder passenger — real guest details collected via guest portal
      const buildPassengers = (count: number, isLead = true) =>
        Array.from({ length: count }, (_, i) => ({
          Title: "Mr",
          FirstName: "Group",
          LastName: "Booking",
          PaxType: 1,
          DateOfBirth: "1990-01-01T00:00:00",
          Gender: "1",
          PassportNo: "",
          PassportExpiry: "",
          AddressLine1: "Group Booking",
          City: "City",
          CountryCode: "IN",
          CountryName: "India",
          Nationality: "IN",
          ContactNo: "124-4998999",
          Email: "group@booking.com",
          IsLeadPax: i === 0 && isLead,
          Fare: fare,
          // LCC requires SSR stubs (TBO rejects ticket without them)
          Baggage: [],
          MealDynamic: [],
          SeatDynamic: [],
        }));

      let pnr = "PENDING";
      let bookingId: number | undefined;
      let ticketResult: any;

      if (isMockFlight) {
        pnr = `MOCK-${Date.now().toString().slice(-6)}`;
        ticketResult = { status: "mock-ticketed", source: "uat-fallback" };
      } else if (isLCC) {
        // LCC flow: Ticket directly (no Book step)
        ticketResult = await issueTicket.mutateAsync({
          traceId,
          resultIndex: selectedFlight.ResultIndex,
          passengers: buildPassengers(searchParams.adults),
          fare,
        });
        pnr = ticketResult?.Response?.PNR ?? ticketResult?.PNR ?? "PENDING";
      } else {
        // Non-LCC/GDS flow: Book → get PNR+BookingId → Ticket
        const bookResult = await bookFlight.mutateAsync({
          traceId,
          resultIndex: selectedFlight.ResultIndex,
          passengers: buildPassengers(searchParams.adults),
          fare,
        });
        pnr = bookResult?.Response?.PNR ?? bookResult?.PNR ?? "PENDING";
        bookingId = bookResult?.Response?.BookingId ?? bookResult?.BookingId;

        ticketResult = await issueTicket.mutateAsync({
          traceId,
          pnr,
          bookingId: bookingId!,
        });
      }

      // Validate and convert dates — append T00:00:00 to prevent UTC timezone shift
      if (!searchParams.departureDate) throw new Error("Departure date is required");
      const departureDate = new Date(searchParams.departureDate + "T00:00:00");
      const returnDate = searchParams.returnDate
        ? new Date(searchParams.returnDate + "T00:00:00")
        : undefined;
      if (isNaN(departureDate.getTime())) throw new Error("Invalid departure date");
      if (returnDate && isNaN(returnDate.getTime())) throw new Error("Invalid return date");

      // Save to DB via existing travel-options route
      const tboFlightData = {
        traceId,
        resultIndex: selectedFlight.ResultIndex,
        isLCC,
        isMockFallback: isMockFlight,
        pnr,
        bookingId,
        ticketResponse: ticketResult,
        fareQuote: fareQuoteData,
        flight: selectedFlight,
      };

      const payload = {
        eventId,
        travelMode: "flight",
        fromLocation: searchParams.origin,
        toLocation: searchParams.destination,
        departureDate: departureDate.toISOString(),
        returnDate: returnDate?.toISOString(),
        baseFare: Number(fare?.TotalFare ?? 0) || null,
        commissionType,
        commissionValue: commissionValue > 0 ? commissionValue : 0,
        clientFacingFare: Number(fare?.TotalFare ?? 0) > 0 ? getEditedFare(Number(fare.TotalFare)) : null,
        tboFlightData,
      };

      const res = await fetch(`/api/events/${eventId}/travel-options`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? "Failed to save flight booking");
      }

      toast({
        title: "Flight booked!",
        description: `PNR: ${pnr} — ${searchParams.origin} → ${searchParams.destination}`,
      });
      onBooked({
        travelMode: "flight",
        fromLocation: searchParams.origin,
        toLocation: searchParams.destination,
        departureDate: searchParams.departureDate,
        returnDate: searchParams.returnDate,
        tboFlightData,
      });
    } catch (err: any) {
      toast({ title: "Booking failed", description: err.message, variant: "destructive" });
    } finally {
      setIsConfirming(false);
    }
  };

  const set = (key: keyof SearchParams, value: any) =>
    setSearchParams((p) => ({ ...p, [key]: value }));

  // ── Phase: Search form ──
  if (phase === "search") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Label className="min-w-fit">Journey Type</Label>
          <div className="flex gap-3">
            {[{ v: "1", l: "One-Way" }, { v: "2", l: "Round-Trip" }].map(({ v, l }) => (
              <button
                key={v}
                onClick={() => set("journeyType", v as "1" | "2")}
                className={`px-3 py-1 rounded text-sm border transition-colors ${
                  searchParams.journeyType === v
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-input text-muted-foreground hover:border-primary/50"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Origin</Label>
            <AirportCombobox
              value={searchParams.origin}
              onChange={(v) => set("origin", v)}
              placeholder="Select origin airport"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Destination</Label>
            <AirportCombobox
              value={searchParams.destination}
              onChange={(v) => set("destination", v)}
              placeholder="Select destination airport"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Departure Date</Label>
            <Input
              type="date"
              value={searchParams.departureDate}
              onChange={(e) => set("departureDate", e.target.value)}
            />
          </div>
          {searchParams.journeyType === "2" && (
            <div className="space-y-1.5">
              <Label>Return Date</Label>
              <Input
                type="date"
                value={searchParams.returnDate}
                onChange={(e) => set("returnDate", e.target.value)}
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Adults</Label>
            <Input type="number" min={1} max={9} value={searchParams.adults} onChange={(e) => set("adults", Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label>Children (2–12)</Label>
            <Input type="number" min={0} max={9} value={searchParams.children} onChange={(e) => set("children", Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label>Infants (&lt;2)</Label>
            <Input type="number" min={0} max={4} value={searchParams.infants} onChange={(e) => set("infants", Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label>Cabin Class</Label>
            <Select value={searchParams.cabinClass} onValueChange={(v) => set("cabinClass", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">All</SelectItem>
                <SelectItem value="2">Economy</SelectItem>
                <SelectItem value="3">Premium Economy</SelectItem>
                <SelectItem value="4">Business</SelectItem>
                <SelectItem value="6">First</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="direct"
            checked={searchParams.directFlight}
            onCheckedChange={(v) => set("directFlight", v)}
          />
          <Label htmlFor="direct">Direct flights only</Label>
        </div>

        <Button className="w-full" onClick={handleSearch} disabled={flightSearch.isPending}>
          {flightSearch.isPending ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Searching flights…</>
          ) : (
            <><Search className="w-4 h-4 mr-2" /> Search Flights</>
          )}
        </Button>

        {searchError && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p className="font-medium mb-1">TBO flight search unavailable</p>
            <p className="text-xs text-amber-700">{searchError}</p>
            <p className="text-xs mt-1 text-amber-700">Use the <strong>Enter Manually</strong> option to add this transport leg without live booking.</p>
          </div>
        )}
      </div>
    );
  }

  if (phase === "results") {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">{flightResults.length} flights found</p>
            {isLiveResult ? (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-300">Live — TBO</span>
            ) : (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300">Demo Fallback</span>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setPhase("search")}>
            ← Modify search
          </Button>
        </div>
        {!isLiveResult && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            TBO returned no inventory for this route. Showing demo options — booking will be saved as a placeholder.
          </p>
        )}
        <FlightResultsList
          traceId={traceId}
          results={flightResults}
          onSelect={handleSelectFlight}
        />
      </div>
    );
  }

  if (phase === "detail" && selectedFlight) {
    return (
      <FlightDetailCard
        flight={selectedFlight}
        fareQuote={fareQuoteData}
        fareQuoteLoading={fareQuote.isPending}
        onConfirm={() => setPhase("confirm")}
        onBack={() => setPhase("results")}
      />
    );
  }

  if (phase === "confirm" && selectedFlight) {
    const fare = fareQuoteData?.Fare ?? selectedFlight.Fare;
    const baseFare = Number(fare?.TotalFare ?? 0);
    const editedFare = baseFare > 0 ? getEditedFare(baseFare) : 0;
    return (
      <div className="space-y-4">
        <FlightBookingConfirmCard
          flight={selectedFlight}
          traceId={traceId}
          adults={searchParams.adults}
          children={searchParams.children}
          infants={searchParams.infants}
          onConfirm={handleConfirmBooking}
          onBack={() => setPhase("detail")}
          isLoading={isConfirming || bookFlight.isPending || issueTicket.isPending}
        />
        <div className="rounded-lg border p-4 space-y-3 bg-muted/10">
          <p className="text-sm font-medium">Client Pricing (visible to client/guest)</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Base Fare (₹)</Label>
              <Input value={baseFare > 0 ? baseFare : ""} disabled />
            </div>
            <div className="space-y-1">
              <Label>Commission Type</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-white text-gray-900 px-3 py-2 text-sm"
                value={commissionType}
                onChange={(e) => setCommissionType(e.target.value as CommissionType)}
              >
                <option value="amount">Amount (₹)</option>
                <option value="percentage">Percentage (%)</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Commission Value</Label>
              <Input
                type="number"
                min={0}
                value={commissionValue || ""}
                onChange={(e) => setCommissionValue(Number(e.target.value) || 0)}
                placeholder={commissionType === "percentage" ? "e.g. 10" : "e.g. 500"}
              />
            </div>
          </div>
          {editedFare > 0 && (
            <p className="text-xs text-primary font-medium">Edited client fare: ₹{editedFare.toLocaleString("en-IN")}</p>
          )}
        </div>
      </div>
    );
  }

  return null;
}
