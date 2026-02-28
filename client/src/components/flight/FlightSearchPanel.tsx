/**
 * FlightSearchPanel — TBO-powered flight search orchestrator
 * Flow: Search form → Results → Detail + FareQuote → Confirm Booking
 * TraceId is preserved in component state through all phases.
 */
import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  useTBOFlightSearch,
  useTBOFareQuote,
  useTBOBookFlight,
} from "@/hooks/use-tbo-flights";
import { FlightResultsList, type FlightResult } from "./FlightResultsList";
import { FlightDetailCard } from "./FlightDetailCard";
import { FlightBookingConfirmCard } from "./FlightBookingConfirmCard";

type Phase = "search" | "results" | "detail" | "confirm";

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
  const [selectedFlight, setSelectedFlight] = useState<FlightResult | null>(null);
  const [fareQuoteData, setFareQuoteData] = useState<any>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const flightSearch = useTBOFlightSearch();
  const fareQuote = useTBOFareQuote();
  const bookFlight = useTBOBookFlight();

  const handleSearch = async () => {
    if (!searchParams.origin || !searchParams.destination || !searchParams.departureDate) {
      toast({ title: "Missing fields", description: "Origin, destination and departure date are required.", variant: "destructive" });
      return;
    }
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

      const tid = result?.traceId ?? result?.TraceId ?? "";
      const results: FlightResult[] = result?.results ?? result?.Results ?? [];
      setTraceId(tid);
      setFlightResults(results);
      setPhase("results");
    } catch (err: any) {
      toast({ title: "Search failed", description: err.message, variant: "destructive" });
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
      // For group booking, we book with a placeholder agent passenger
      // Actual guest details are collected via guest portal
      const placeholderPassenger = {
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
        ContactNo: "9999999999",
        Email: "group@booking.com",
        IsLeadPax: true,
        Fare: fareQuoteData?.Fare ?? selectedFlight.Fare,
      };

      const bookResult = await bookFlight.mutateAsync({
        traceId,
        resultIndex: selectedFlight.ResultIndex,
        passengers: Array.from({ length: searchParams.adults }, (_, i) => ({
          ...placeholderPassenger,
          IsLeadPax: i === 0,
        })),
        fare: fareQuoteData?.Fare ?? selectedFlight.Fare,
      });

      const pnr = bookResult?.Response?.PNR ?? bookResult?.PNR ?? "PENDING";

      // Save to DB via existing travel-options route with tboFlightData
      const payload = {
        eventId,
        travelMode: "flight",
        fromLocation: searchParams.origin,
        toLocation: searchParams.destination,
        departureDate: new Date(searchParams.departureDate).toISOString(),
        returnDate: searchParams.returnDate ? new Date(searchParams.returnDate).toISOString() : undefined,
        tboFlightData: {
          traceId,
          resultIndex: selectedFlight.ResultIndex,
          pnr,
          bookingResponse: bookResult,
          fareQuote: fareQuoteData,
          flight: selectedFlight,
        },
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
        tboFlightData: payload.tboFlightData,
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
            <Label>Origin (IATA code)</Label>
            <Input
              placeholder="DEL"
              maxLength={3}
              value={searchParams.origin}
              onChange={(e) => set("origin", e.target.value.toUpperCase())}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Destination (IATA code)</Label>
            <Input
              placeholder="DXB"
              maxLength={3}
              value={searchParams.destination}
              onChange={(e) => set("destination", e.target.value.toUpperCase())}
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
      </div>
    );
  }

  if (phase === "results") {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {flightResults.length} flights found
          </p>
          <Button variant="ghost" size="sm" onClick={() => setPhase("search")}>
            ← Modify search
          </Button>
        </div>
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
    return (
      <FlightBookingConfirmCard
        flight={selectedFlight}
        traceId={traceId}
        adults={searchParams.adults}
        children={searchParams.children}
        infants={searchParams.infants}
        onConfirm={handleConfirmBooking}
        onBack={() => setPhase("detail")}
        isLoading={isConfirming}
      />
    );
  }

  return null;
}
