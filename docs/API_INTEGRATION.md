# TBO API Integration Guide — Technical Reference

**Platform:** Vantage
**Last Updated:** February 2026

---

## Architecture

```
Browser (React)
      │
      │  Internal REST calls (/api/tbo/*)
      ▼
Express Server (Node.js)           ◄── session auth check (getUser)
      │
      ├──► server/tbo/tboHotelService.ts ──► TBO Hotel API (Basic Auth)
      │         http://api.tbotechnology.in/TBOHolidays_HotelAPI/
      │
      └──► server/tbo/tboFlightService.ts ──► TBO Air API (Token-based)
                https://api.tbotech.com/...
```

**Rule:** TBO credentials (`TBO_HOTEL_*`, `TBO_AIR_*`) are ONLY read in `server/tbo/*.ts`. They are never imported by any client-side file.

---

## File Structure

```
server/
  tbo/
    tboTypes.ts          ← All TypeScript interfaces for TBO requests/responses
    tboHotelService.ts   ← Hotel API functions (countries, cities, search, book)
    tboFlightService.ts  ← Flight API functions (auth token, search, fareQuote, book)
  tbo-hotel-routes.ts    ← Express routes: /api/tbo/hotel/*
  tbo-flight-routes.ts   ← Express routes: /api/tbo/flight/*

client/src/
  hooks/
    use-tbo-hotels.ts    ← TanStack Query hooks for hotel operations
    use-tbo-flights.ts   ← TanStack Query hooks for flight operations
  components/
    hotel/
      HotelSearchPanel.tsx      ← Orchestrator (multi-phase state machine)
      HotelResultsList.tsx      ← Hotel cards with name/stars/price
      HotelRoomSelector.tsx     ← Room type picker with rates
      HotelBookingConfirmCard.tsx ← Booking summary before confirmation
    flight/
      FlightSearchPanel.tsx     ← Orchestrator
      FlightResultsList.tsx     ← Flight cards with times/price/stops
      FlightDetailCard.tsx      ← Expanded view + fare rules
      FlightBookingConfirmCard.tsx ← Booking summary before confirm
```

---

## TBO Hotel API

### Base URL

`http://api.tbotechnology.in/TBOHolidays_HotelAPI`

### Authentication

All requests use **HTTP Basic Auth**:

```
Authorization: Basic base64(TBO_HOTEL_USERNAME:TBO_HOTEL_PASSWORD)
```

Built in `tboHotelService.ts`:

```typescript
const auth = Buffer.from(
  `${process.env.TBO_HOTEL_USERNAME}:${process.env.TBO_HOTEL_PASSWORD}`,
).toString("base64");
const headers = {
  Authorization: `Basic ${auth}`,
  "Content-Type": "application/json",
};
```

---

### Endpoint 1: Country List

```
GET /CountryList
No body required.
```

**Response:**

```json
{
  "Status": { "Code": 200, "Description": "Successful" },
  "CountryList": [
    { "Code": "IN", "Name": "India" },
    { "Code": "AE", "Name": "United Arab Emirates" }
  ]
}
```

---

### Endpoint 2: City List

```
POST /CityList
Body: { "CountryCode": "IN" }
```

**Response:**

```json
{
  "Status": { "Code": 200 },
  "CityList": [
    { "Code": "DEL", "Name": "New Delhi" },
    { "Code": "BOM", "Name": "Mumbai" }
  ]
}
```

---

### Endpoint 3: Hotel Code List

```
POST /TBOHotelCodeList
Body: { "CityCode": "DEL", "IsDetailedResponse": true }
```

**Response:**

```json
{
  "Status": { "Code": 200 },
  "Hotels": [
    {
      "HotelCode": "376565",
      "HotelName": "The Imperial New Delhi",
      "HotelAddress": "..."
    }
  ]
}
```

---

### Endpoint 4: Hotel Details

```
POST /Hoteldetails
Body: { "Hotelcodes": "376565,1345318", "Language": "EN" }
```

**Response:** Full hotel details including amenities, images, descriptions, star rating, address.

---

### Endpoint 5: Search (Availability + Rates)

```
POST /search
Body:
{
  "CheckIn": "2026-04-15",
  "CheckOut": "2026-04-18",
  "HotelCodes": "376565",
  "GuestNationality": "IN",
  "PaxRooms": [
    { "Adults": 2, "Children": 0, "ChildrenAges": [] }
  ],
  "ResponseTime": 23,
  "IsDetailedResponse": true,
  "Filters": {
    "Refundable": false,
    "NoOfRooms": 0,
    "MealType": "All",
    "OrderBy": "Price",
    "StarRating": 0,
    "HotelName": ""
  }
}
```

**Response:**

```json
{
  "Status": { "Code": 200 },
  "HotelResult": [{
    "HotelCode": "376565",
    "HotelName": "The Imperial New Delhi",
    "StarRating": 5,
    "HotelRooms": [{
      "Name": ["Deluxe Room"],
      "Inclusion": ["Breakfast", "WiFi"],
      "MealType": "Breakfast",
      "IsRefundable": true,
      "TotalFare": 15000,
      "TotalTax": 2700,
      "BookingCode": "ABC123XYZ",
      "CancellationPolicies": [...]
    }]
  }]
}
```

**Key field:** `BookingCode` — pass this to PreBook/Book.

---

### Endpoint 6: PreBook

```
POST /PreBook
Body: { "BookingCode": "ABC123XYZ", "PaymentMode": "Limit" }
```

**Response:** Confirms rate is held. Returns updated `BookingCode` and `TotalFare`.

---

### Endpoint 7: Book

```
POST /Book
Body:
{
  "BookingCode": "ABC123XYZ",
  "CustomerDetails": [
    {
      "CustomerNames": [{
        "Title": "Mr",
        "FirstName": "John",
        "LastName": "Smith",
        "Type": "Adult"
      }]
    }
  ],
  "ClientReferenceId": "VV-EVT001-HOTEL",
  "BookingReferenceId": "VV-EVT001-HOTEL",
  "TotalFare": 15000,
  "EmailId": "john@example.com",
  "PhoneNumber": "9876543210",
  "BookingType": "Voucher",
  "PaymentMode": "Limit"
}
```

**Response:**

```json
{
  "Status": { "Code": 200 },
  "ConfirmationNumber": "TBO123456789",
  "BookingDetails": { ... }
}
```

**Key field:** `ConfirmationNumber` — store in `hotel_bookings.tbo_hotel_data`.

---

### Endpoint 8: Cancel

```
POST /Cancel
Body: { "ConfirmationNumber": "TBO123456789" }
```

**Response:** Cancellation confirmation + applicable refund amount.

---

## TBO Air (Flight) API

### Base URL

Set via `TBO_AIR_URL` environment variable.

### Authentication — Token Cache

TBO Air uses a session token obtained from `ValidateAgency`. The token expires (typically 60 minutes). The server caches it:

```typescript
// server/tbo/tboFlightService.ts
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getFlightToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }
  const res = await fetch(
    `${process.env.TBO_AIR_URL}/Authenticate/ValidateAgency`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ClientId: process.env.TBO_AIR_CLIENT_ID,
        UserName: process.env.TBO_AIR_CLIENT_ID,
        Password: process.env.TBO_AIR_PASSWORD,
        EndUserIp: process.env.TBO_AIR_SERVER_IP || "127.0.0.1",
        BookingMode: "API",
      }),
    },
  );
  const data = await res.json();
  cachedToken = {
    token: data.TokenId,
    expiresAt: Date.now() + 55 * 60 * 1000, // 55 min
  };
  return data.TokenId;
}
```

---

### Endpoint 1: Search

```
POST /Search/
Body:
{
  "EndUserIp": "127.0.0.1",
  "TokenId": "auto-injected-by-service",
  "AdultCount": 10,
  "ChildCount": 0,
  "InfantCount": 0,
  "DirectFlight": false,
  "OneStopFlight": false,
  "JourneyType": "1",         // "1"=OneWay, "2"=Return
  "PreferredAirlines": null,
  "Sources": null,
  "Segments": [{
    "Origin": "DEL",
    "Destination": "DXB",
    "FlightCabinClass": "2",  // 1=All, 2=Economy, 3=PremiumEconomy, 4=Business
    "PreferredDepartureTime": "2026-04-15T00:00:00",
    "PreferredArrivalTime": "2026-04-15T00:00:00"
  }],
  "ResultFareType": "RegularFare"
}
```

**Response:**

```json
{
  "Response": {
    "TraceId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "Results": [
      [
        {
          "ResultIndex": "OB1",
          "Source": 1,
          "IsLCC": false,
          "IsRefundable": true,
          "AirlineRemark": "",
          "Fare": {
            "Currency": "INR",
            "BaseFare": 45000,
            "Tax": 9000,
            "TotalFare": 54000,
            "OtherCharges": 0
          },
          "Segments": [
            [
              {
                "Airline": {
                  "AirlineCode": "EK",
                  "AirlineName": "Emirates",
                  "FlightNumber": "EK511"
                },
                "Origin": {
                  "Airport": { "AirportCode": "DEL", "CityName": "New Delhi" },
                  "DepTime": "2026-04-15T03:40:00"
                },
                "Destination": {
                  "Airport": { "AirportCode": "DXB", "CityName": "Dubai" },
                  "ArrTime": "2026-04-15T06:05:00"
                }
              }
            ]
          ],
          "FareClassification": "..."
        }
      ]
    ]
  }
}
```

**Key fields:** `TraceId` (cache in React state), `ResultIndex` (per result, pass to FareQuote/Book).

---

### Endpoint 2: Fare Quote

```
POST /FareQuote/
Body:
{
  "EndUserIp": "127.0.0.1",
  "TokenId": "auto-injected",
  "TraceId": "from-search-response",
  "ResultIndex": "OB1"
}
```

**Response:** Confirmed fare (may differ from search), `LastTicketDate`, `MiniFareRules`.

---

### Endpoint 3: Fare Rule

```
POST /FareRule/
Body: { "EndUserIp": "...", "TokenId": "...", "TraceId": "...", "ResultIndex": "OB1" }
```

**Response:** Text-based fare rules (cancellation charges, date change penalties, no-show policy).

---

### Endpoint 4: SSR (Seat/Baggage Options)

```
POST /SSR/
Body: { "EndUserIp": "...", "TokenId": "...", "TraceId": "...", "ResultIndex": "OB1" }
```

**Response:** Available seats with pricing, baggage add-on options.

---

### Endpoint 5: Book

```
POST /Booking/Book
Body:
{
  "EndUserIp": "127.0.0.1",
  "TokenId": "auto-injected",
  "TraceId": "...",
  "ResultIndex": "OB1",
  "Passengers": [{
    "Title": "Mr",
    "FirstName": "John",
    "LastName": "Smith",
    "PaxType": 1,          // 1=Adult, 2=Child, 3=Infant
    "DateOfBirth": "1985-05-20T00:00:00",
    "Gender": "Male",
    "PassportNo": "X1234567",
    "PassportExpiry": "2030-01-01T00:00:00",
    "Nationality": "IN",
    "Email": "john@example.com",
    "ContactNo": "9876543210",
    "AddressLine1": "123 Main St",
    "City": "Delhi",
    "CountryCode": "IN"
  }],
  "Fare": { ...fareQuoteResponseFare }
}
```

**Response:**

```json
{
  "Response": {
    "PNR": "ABCDEF",
    "BookingId": 12345,
    "Itinerary": { ... }
  }
}
```

---

### Endpoint 6: Ticket

```
POST /Booking/Ticket
Body: { same as Book + existing PNR }
```

**Response:** Ticket numbers (e-ticket references per passenger).

---

## Data Flow in Vantage

### Hotel Booking in EventSetup

```
Agent UI (HotelSearchPanel)
  → GET /api/tbo/hotel/countries           → tboHotelService.getCountryList()
  → GET /api/tbo/hotel/cities?countryCode= → tboHotelService.getCityList()
  → GET /api/tbo/hotel/list?cityCode=      → tboHotelService.getHotelList()
  → POST /api/tbo/hotel/search             → tboHotelService.searchHotels()
  → POST /api/tbo/hotel/prebook            → tboHotelService.preBookHotel()
  → POST /api/tbo/hotel/book               → tboHotelService.bookHotel()
  → POST /api/events/:id/hotel-booking     → storage.createHotelBooking({ ...data, tboHotelData })
```

### Flight Booking in EventSetup

```
Agent UI (FlightSearchPanel)
  → POST /api/tbo/flight/search            → tboFlightService.searchFlights()  [returns TraceId]
  → POST /api/tbo/flight/farequote         → tboFlightService.fareQuote(traceId, resultIndex)
  → POST /api/tbo/flight/farerule          → tboFlightService.fareRule(traceId, resultIndex)
  → POST /api/tbo/flight/book              → tboFlightService.bookFlight()  [returns PNR]
  → POST /api/tbo/flight/ticket            → tboFlightService.issueTicket()
  → POST /api/events/:id/travel-options    → storage.createTravelOption({ ...data, tboFlightData })
```

---

## Error Handling

TBO APIs return errors in different formats. The service layer normalizes them:

```typescript
// In tboHotelService.ts
if (data.Status?.Code !== 200) {
  throw new Error(
    `TBO Hotel API error: ${data.Status?.Description || "Unknown error"}`,
  );
}

// In tboFlightService.ts
if (data.Response?.Error?.ErrorCode !== 0) {
  throw new Error(`TBO Air API error: ${data.Response.Error.ErrorMessage}`);
}
```

Express route handlers catch these and return:

```json
{ "message": "TBO Hotel API error: No hotels available for selected dates" }
```

---

## Rate Limits & Best Practices

- Do NOT call `ValidateAgency` on every flight search — the token is cached for 55 minutes
- Do NOT call `/search` repeatedly for the same route/date without user action — TBO may throttle
- Hotel `PreBook` holds the rate briefly — proceed to `Book` within a few minutes
- Store raw TBO responses in `tbo_hotel_data` / `tbo_flight_data` JSONB columns for debugging and forward compatibility
- The microsite endpoint (`/api/microsite/:eventCode`) NEVER exposes `BookingCode`, `ConfirmationNumber`, `PNR`, or credentials
