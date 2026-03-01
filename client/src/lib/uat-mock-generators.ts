import type { FlightResult } from "@/components/flight/FlightResultsList";
import type { HotelResult } from "@/components/hotel/HotelResultsList";

const UAT_FLIGHT_COMBOS = new Set([
  "DEL-BOM",
  "DEL-BLR",
  "BLR-BOM",
  "DEL-DXB",
  "DEL-BKK",
]);

const UAT_HOTEL_DESTINATIONS = new Set(["BOM", "BLR", "DXB", "BKK"]);

export function isUatFlightCombo(origin: string, destination: string): boolean {
  const route = `${origin.trim().toUpperCase()}-${destination.trim().toUpperCase()}`;
  return UAT_FLIGHT_COMBOS.has(route);
}

export function isUatHotelCityCode(cityCode: string): boolean {
  return UAT_HOTEL_DESTINATIONS.has(cityCode.trim().toUpperCase());
}

// International airport codes (non-exhaustive) — used to estimate fare range
const INTL_CODES = new Set([
  "DXB","AUH","SHJ","DOH","BAH","MCT","RUH","JED","KWI",
  "SIN","KUL","BKK","HKG","NRT","ICN","PEK","PVG",
  "SYD","MEL","LHR","LGW","CDG","FRA","AMS","ZUR","MXP",
  "JFK","LAX","ORD","SFO","CMB","DAC","KTM","MLE","NBO","JNB","CAI",
]);

function buildMockFlight(
  routeKey: string,
  suffix: string,
  departureDate: string,
  offsetMinutes: number,
  airlineCode: string,
  airlineName: string,
  flightNumber: string,
  totalFare: number,
): FlightResult {
  const [origin, destination] = routeKey.split("-");
  const departure = new Date(`${departureDate}T00:00:00`);
  departure.setHours(6 + Math.floor(offsetMinutes / 60), offsetMinutes % 60, 0, 0);
  // Duration: ~2h20m for short haul, ~3h for medium, ~8h for long — rough estimate
  const isLong = INTL_CODES.has(origin!) || INTL_CODES.has(destination!);
  const durationMs = (isLong ? 480 : 140) * 60 * 1000;
  const arrival = new Date(departure.getTime() + durationMs);
  const durationHrs = Math.floor(durationMs / 3600000);
  const durationMins = Math.round((durationMs % 3600000) / 60000);

  return {
    ResultIndex: `MOCK_${routeKey}_${suffix}`,
    IsRefundable: suffix === "A" || suffix === "C",
    Fare: {
      BaseFare: Math.round(totalFare * 0.78),
      Tax: Math.round(totalFare * 0.22),
      TotalFare: totalFare,
      Currency: "INR",
    },
    Segments: [
      [
        {
          Origin: {
            Airport: {
              AirportCode: origin,
              AirportName: `${origin} Airport`,
              CityName: origin,
            },
          },
          Destination: {
            Airport: {
              AirportCode: destination,
              AirportName: `${destination} Airport`,
              CityName: destination,
            },
          },
          Airline: {
            AirlineCode: airlineCode,
            AirlineName: airlineName,
            FlightNumber: flightNumber,
          },
          DepartureTime: departure.toISOString(),
          ArrivalTime: arrival.toISOString(),
          Duration: `P0DT${durationHrs}H${durationMins}M`,
          StopOver: 0,
        },
      ],
    ],
    AirlineCode: airlineCode,
  };
}

export function generateMockFlights(params: {
  origin: string;
  destination: string;
  departureDate: string;
}): FlightResult[] {
  const origin = params.origin.trim().toUpperCase();
  const destination = params.destination.trim().toUpperCase();
  const routeKey = `${origin}-${destination}`;

  // Known UAT fares; estimate for everything else
  const knownFares: Record<string, number> = {
    "DEL-BOM": 7200,
    "DEL-BLR": 7900,
    "BLR-BOM": 6100,
    "DEL-DXB": 18400,
    "DEL-BKK": 20100,
  };

  const isIntl = INTL_CODES.has(origin) || INTL_CODES.has(destination);
  const baseFare = knownFares[routeKey] ?? (isIntl ? 22000 : 7500);

  return [
    buildMockFlight(routeKey, "A", params.departureDate, 15,  "6E", "IndiGo",    "412",  baseFare),
    buildMockFlight(routeKey, "B", params.departureDate, 120, "AI", "Air India",  "827",  baseFare + 1400),
    buildMockFlight(routeKey, "C", params.departureDate, 255, "SG", "SpiceJet",   "318",  baseFare - 800),
    buildMockFlight(routeKey, "D", params.departureDate, 360, "UK", "Vistara",    "945",  baseFare + 2200),
  ];
}

// ─── Hotel Mock Generator ─────────────────────────────────────────────────────

function buildHotelResult(
  codePrefix: string,
  hotelName: string,
  address: string,
  starRating: number,
  roomPrice: number,
  currencyCode = "INR",
): HotelResult {
  const slug = hotelName.replace(/\s+/g, "_").toUpperCase();
  return {
    HotelCode: `MOCK_${codePrefix}_${slug}`,
    HotelName: hotelName,
    StarRating: starRating,
    HotelAddress: address,
    Rooms: [
      {
        BookingCode: `MOCK_BKG_${codePrefix}_${slug}_SUITE`,
        RoomTypeName: "Executive Suite",
        MealType: "Breakfast + Dinner",
        Price: { RoomPrice: Math.round(roomPrice * 2.2), CurrencyCode: currencyCode },
        IsRefundable: true,
      },
      {
        BookingCode: `MOCK_BKG_${codePrefix}_${slug}_DLX`,
        RoomTypeName: "Deluxe Room",
        MealType: "Breakfast Included",
        Price: { RoomPrice: roomPrice, CurrencyCode: currencyCode },
        IsRefundable: true,
      },
      {
        BookingCode: `MOCK_BKG_${codePrefix}_${slug}_STD`,
        RoomTypeName: "Standard Room",
        MealType: "Room Only",
        Price: { RoomPrice: Math.round(roomPrice * 0.72), CurrencyCode: currencyCode },
        IsRefundable: false,
      },
    ],
  };
}

export function generateMockHotelsForCity(cityCode: string): HotelResult[] {
  const code = cityCode.trim().toUpperCase();

  if (code === "BOM") {
    return [
      buildHotelResult("BOM", "Harbor Crest Mumbai",        "Bandra Kurla Complex, Mumbai",  5, 8600),
      buildHotelResult("BOM", "Marine Gateway Residency",   "Marine Drive, Mumbai",          4, 6900),
      buildHotelResult("BOM", "Colaba Business Inn",        "Colaba, Mumbai",                3, 4200),
    ];
  }

  if (code === "BLR") {
    return [
      buildHotelResult("BLR", "Garden City Grand",          "MG Road, Bengaluru",            5, 7800),
      buildHotelResult("BLR", "Tech Park Suites",           "Whitefield, Bengaluru",         4, 6200),
      buildHotelResult("BLR", "Airport Gateway Hotel",      "Devanahalli, Bengaluru",        3, 3900),
    ];
  }

  if (code === "DXB") {
    return [
      buildHotelResult("DXB", "Creekline Dubai Hotel",      "Deira, Dubai",                  5, 520, "AED"),
      buildHotelResult("DXB", "Palm View Business Bay",     "Business Bay, Dubai",           4, 420, "AED"),
      buildHotelResult("DXB", "Dubai Airport Inn",          "Al Garhoud, Dubai",             3, 280, "AED"),
    ];
  }

  if (code === "BKK") {
    return [
      buildHotelResult("BKK", "Sukhumvit Crown Hotel",      "Sukhumvit, Bangkok",            5, 4100),
      buildHotelResult("BKK", "Riverside Orchid Stay",      "Chao Phraya Riverside, Bangkok",4, 3400),
      buildHotelResult("BKK", "Siam Budget Suites",         "Siam Square, Bangkok",          3, 2100),
    ];
  }

  // DEL
  if (code === "DEL") {
    return [
      buildHotelResult("DEL", "Imperial New Delhi",         "Janpath, New Delhi",            5, 9200),
      buildHotelResult("DEL", "Connaught Plaza Hotel",      "Connaught Place, New Delhi",    4, 7100),
      buildHotelResult("DEL", "Aerocity Business Stay",     "Aerocity, New Delhi",           3, 4500),
    ];
  }

  // Generic fallback for any other city code
  return [
    buildHotelResult(code, `${code} Grand Hotel`,       `City Centre, ${code}`,          5, 9500),
    buildHotelResult(code, `${code} Business Suites`,   `Business District, ${code}`,    4, 7200),
    buildHotelResult(code, `${code} Economy Stay`,      `Near Airport, ${code}`,         3, 4100),
  ];
}

export function isMockFlightResult(resultIndex?: unknown): boolean {
  try {
    return String(resultIndex ?? "").startsWith("MOCK_");
  } catch {
    return false;
  }
}

export function isMockHotelSelection(bookingCode?: string, hotelCode?: string): boolean {
  return (bookingCode ?? "").startsWith("MOCK_") || (hotelCode ?? "").startsWith("MOCK_");
}
