/**
 * TBO Air Flight API Proxy Routes
 * All routes require an authenticated agent session.
 * Token auth with TBO is handled transparently by tboFlightService (cached).
 *
 * Mount in server/routes.ts: app.use(tboFlightRoutes);
 *
 * Pre-booking flow:
 *   1. GET  /api/tbo/flight/airline-sectors   → filter invalid airline+route combos
 *   2. POST /api/tbo/flight/search            → save TraceId + ResultIndex in state
 *   3. POST /api/tbo/flight/farequote         → confirm fare, check MiniFareRules
 *   3b. POST /api/tbo/flight/farerule         → cancellation policy text (optional)
 *   4. POST /api/tbo/flight/ssr               → get meal/baggage/seat options
 *   5. POST /api/tbo/flight/book              → Non-LCC only: get PNR + BookingId
 *   6. POST /api/tbo/flight/ticket            → issue ticket (LCC or Non-LCC shape)
 *
 * Post-booking flow:
 *   POST /api/tbo/flight/booking-details      → verify TicketStatus
 *   POST /api/tbo/flight/cancellation-charges → get charges before cancel (GDS/NDC)
 *   POST /api/tbo/flight/cancel               → online cancellation
 *   POST /api/tbo/flight/reissue              → online re-issuance / date change
 *   POST /api/tbo/flight/ancillary            → add meals/baggage/seats post-booking
 *
 * Utility:
 *   POST /api/tbo/flight/logout               → invalidate token on agent sign-out
 *   POST /api/tbo/flight/release-pnr          → release hold before ticket (Non-LCC)
 */

import { Router } from "express";
import * as flightService from "./tbo/tboFlightService.js";

const tboFlightRoutes = Router();

function getUser(req: any) {
  return req.session?.user;
}

function requireAgent(req: any, res: any): boolean {
  const user = getUser(req);
  if (!user) {
    res.status(401).json({ message: "Not authenticated" });
    return false;
  }
  if (user.role !== "agent") {
    res.status(403).json({ message: "Only agents can access TBO flight data" });
    return false;
  }
  return true;
}

// ─── Pre-booking ──────────────────────────────────────────────────────────────

// GET /api/tbo/flight/airline-sectors
// Returns valid airline-sector combinations for the agent's account.
// Use before flight search to avoid "No Result Found" errors.
// Optional query params: traceId, agencyId
tboFlightRoutes.get("/api/tbo/flight/airline-sectors", async (req, res) => {
  if (!requireAgent(req, res)) return;
  const { traceId, agencyId } = req.query;
  try {
    const result = await flightService.getAirlineSectorList(
      traceId as string | undefined,
      agencyId ? Number(agencyId) : undefined
    );
    res.json(result);
  } catch (err: any) {
    console.error("[TBO Flight] getAirlineSectorList error:", err.message);
    res.status(502).json({ message: err.message ?? "TBO Airline Sector List failed" });
  }
});

// POST /api/tbo/flight/search
// Body: { origin, destination, departureDate, returnDate?, journeyType, adults, children, infants, directFlight, cabinClass? }
// Returns: { Response: { TraceId, Results: FlightResult[][] } } — save TraceId in state
tboFlightRoutes.post("/api/tbo/flight/search", async (req, res) => {
  if (!requireAgent(req, res)) return;

  const { origin, destination, departureDate, returnDate, journeyType = "1",
    adults = 1, children = 0, infants = 0, directFlight = false, cabinClass = "2" } = req.body;

  if (!origin || !destination || !departureDate) {
    return res.status(400).json({ message: "origin, destination, departureDate required" });
  }

  try {
    const segments: any[] = [
      {
        Origin: origin.toUpperCase(),
        Destination: destination.toUpperCase(),
        FlightCabinClass: cabinClass,
        PreferredDepartureTime: `${departureDate}T00:00:00`,
        PreferredArrivalTime: `${departureDate}T00:00:00`,
      },
    ];

    if (journeyType === "2" && returnDate) {
      segments.push({
        Origin: destination.toUpperCase(),
        Destination: origin.toUpperCase(),
        FlightCabinClass: cabinClass,
        PreferredDepartureTime: `${returnDate}T00:00:00`,
        PreferredArrivalTime: `${returnDate}T00:00:00`,
      });
    }

    const result = await flightService.searchFlights({
      AdultCount: Number(adults),
      ChildCount: Number(children),
      InfantCount: Number(infants),
      DirectFlight: Boolean(directFlight),
      OneStopFlight: false,
      JourneyType: journeyType,
      PreferredAirlines: null,
      Sources: null,
      Segments: segments,
    });

    res.json(result);
  } catch (err: any) {
    // "No result found" is TBO's normal empty-inventory response — return empty results
    // so the UI can display "No flights found" rather than an unavailable error.
    if (/no result/i.test(err.message ?? "")) {
      return res.json({ Response: { TraceId: "", Results: [], Error: { ErrorCode: 0, ErrorMessage: "" } } });
    }
    console.error("[TBO Flight] searchFlights error:", err.message);
    res.status(502).json({ message: err.message ?? "TBO Flight search failed" });
  }
});

// POST /api/tbo/flight/farequote
// Body: { traceId, resultIndex }
// Returns: confirmed fare + LastTicketDate + MiniFareRules
tboFlightRoutes.post("/api/tbo/flight/farequote", async (req, res) => {
  if (!requireAgent(req, res)) return;
  const { traceId, resultIndex } = req.body;
  if (!traceId || !resultIndex) {
    return res.status(400).json({ message: "traceId and resultIndex required" });
  }
  try {
    const result = await flightService.fareQuote(traceId, resultIndex);
    res.json(result);
  } catch (err: any) {
    console.error("[TBO Flight] fareQuote error:", err.message);
    res.status(502).json({ message: err.message ?? "TBO FareQuote failed" });
  }
});

// POST /api/tbo/flight/farerule
// Body: { traceId, resultIndex }
// Returns: fare rule text (cancellation/change policies) — optional, display only
tboFlightRoutes.post("/api/tbo/flight/farerule", async (req, res) => {
  if (!requireAgent(req, res)) return;
  const { traceId, resultIndex } = req.body;
  if (!traceId || !resultIndex) {
    return res.status(400).json({ message: "traceId and resultIndex required" });
  }
  try {
    const result = await flightService.fareRule(traceId, resultIndex);
    res.json(result);
  } catch (err: any) {
    console.error("[TBO Flight] fareRule error:", err.message);
    res.status(502).json({ message: err.message ?? "TBO FareRule failed" });
  }
});

// POST /api/tbo/flight/ssr
// Body: { traceId, resultIndex }
// Returns: available meal, baggage, seat options (LCC flights)
// Call after fareQuote, before book/ticket
tboFlightRoutes.post("/api/tbo/flight/ssr", async (req, res) => {
  if (!requireAgent(req, res)) return;
  const { traceId, resultIndex } = req.body;
  if (!traceId || !resultIndex) {
    return res.status(400).json({ message: "traceId and resultIndex required" });
  }
  try {
    const result = await flightService.getSSR(traceId, resultIndex);
    res.json(result);
  } catch (err: any) {
    console.error("[TBO Flight] getSSR error:", err.message);
    res.status(502).json({ message: err.message ?? "TBO SSR failed" });
  }
});

// POST /api/tbo/flight/book
// Body: { traceId, resultIndex, passengers[], fare }
// Non-LCC only — returns PNR + BookingId, then call /ticket
tboFlightRoutes.post("/api/tbo/flight/book", async (req, res) => {
  if (!requireAgent(req, res)) return;
  const { traceId, resultIndex, passengers, fare } = req.body;
  if (!traceId || !resultIndex || !passengers || !fare) {
    return res.status(400).json({ message: "traceId, resultIndex, passengers, fare required" });
  }
  try {
    const result = await flightService.bookFlight({
      TraceId: traceId,
      ResultIndex: resultIndex,
      Passengers: passengers,
      Fare: fare,
    });
    res.json(result);
  } catch (err: any) {
    console.error("[TBO Flight] bookFlight error:", err.message);
    res.status(502).json({ message: err.message ?? "TBO Flight booking failed" });
  }
});

// POST /api/tbo/flight/ticket
// LCC  body:     { traceId, resultIndex, passengers[], fare }
// Non-LCC body:  { traceId, pnr, bookingId }
// Route detects which flow based on presence of pnr+bookingId vs resultIndex+passengers
tboFlightRoutes.post("/api/tbo/flight/ticket", async (req, res) => {
  if (!requireAgent(req, res)) return;
  const { traceId, resultIndex, passengers, fare, pnr, bookingId } = req.body;

  if (!traceId) {
    return res.status(400).json({ message: "traceId required" });
  }

  const isGDSFlow = pnr && bookingId;
  const isLCCFlow = resultIndex && passengers;

  if (!isGDSFlow && !isLCCFlow) {
    return res.status(400).json({
      message: "Provide either (resultIndex + passengers) for LCC, or (pnr + bookingId) for GDS",
    });
  }

  try {
    let result;
    if (isGDSFlow) {
      result = await flightService.issueTicketGDS(traceId, pnr, Number(bookingId));
    } else {
      if (!fare) {
        return res.status(400).json({ message: "fare required for LCC ticket" });
      }
      result = await flightService.issueTicketLCC(traceId, resultIndex, passengers, fare);
    }
    res.json(result);
  } catch (err: any) {
    console.error("[TBO Flight] issueTicket error:", err.message);
    res.status(502).json({ message: err.message ?? "TBO ticket issuance failed" });
  }
});

// ─── Post-booking ─────────────────────────────────────────────────────────────

// POST /api/tbo/flight/booking-details
// Body: { bookingId, pnr? }
// Returns full itinerary + TicketStatus — use to verify after Book/Ticket
tboFlightRoutes.post("/api/tbo/flight/booking-details", async (req, res) => {
  if (!requireAgent(req, res)) return;
  const { bookingId, pnr } = req.body;
  if (!bookingId) {
    return res.status(400).json({ message: "bookingId required" });
  }
  try {
    const result = await flightService.getBookingDetails(Number(bookingId), pnr);
    res.json(result);
  } catch (err: any) {
    console.error("[TBO Flight] getBookingDetails error:", err.message);
    res.status(502).json({ message: err.message ?? "TBO GetBookingDetails failed" });
  }
});

// POST /api/tbo/flight/cancellation-charges
// Body: { bookingId }
// Returns RefundAmount, CancellationCharge, Currency
// MUST call before /cancel for GDS/NDC bookings
tboFlightRoutes.post("/api/tbo/flight/cancellation-charges", async (req, res) => {
  if (!requireAgent(req, res)) return;
  const { bookingId } = req.body;
  if (!bookingId) {
    return res.status(400).json({ message: "bookingId required" });
  }
  try {
    const result = await flightService.getCancellationCharges(Number(bookingId));
    res.json(result);
  } catch (err: any) {
    console.error("[TBO Flight] getCancellationCharges error:", err.message);
    res.status(502).json({ message: err.message ?? "TBO GetCancellationCharges failed" });
  }
});

// POST /api/tbo/flight/cancel
// Body: { bookingId, remarks, sectors?, ticketIds? }
// Full cancellation (omit sectors/ticketIds) or partial (include them)
tboFlightRoutes.post("/api/tbo/flight/cancel", async (req, res) => {
  if (!requireAgent(req, res)) return;
  const { bookingId, remarks = "Cancellation requested", sectors, ticketIds } = req.body;
  if (!bookingId) {
    return res.status(400).json({ message: "bookingId required" });
  }
  try {
    const result = await flightService.cancelBooking(
      Number(bookingId),
      remarks,
      sectors,
      ticketIds
    );
    res.json(result);
  } catch (err: any) {
    console.error("[TBO Flight] cancelBooking error:", err.message);
    res.status(502).json({ message: err.message ?? "TBO Cancel failed" });
  }
});

// POST /api/tbo/flight/reissue
// Body: { bookingId, remarks }
// Online re-issuance / date change for issued tickets
tboFlightRoutes.post("/api/tbo/flight/reissue", async (req, res) => {
  if (!requireAgent(req, res)) return;
  const { bookingId, remarks = "Reissue requested" } = req.body;
  if (!bookingId) {
    return res.status(400).json({ message: "bookingId required" });
  }
  try {
    const result = await flightService.reissueTicket(Number(bookingId), remarks);
    res.json(result);
  } catch (err: any) {
    console.error("[TBO Flight] reissueTicket error:", err.message);
    res.status(502).json({ message: err.message ?? "TBO Reissue failed" });
  }
});

// POST /api/tbo/flight/ancillary
// Body: { traceId, resultIndex }
// Returns add-on options (meals/baggage/seats) for post-booking modification
tboFlightRoutes.post("/api/tbo/flight/ancillary", async (req, res) => {
  if (!requireAgent(req, res)) return;
  const { traceId, resultIndex } = req.body;
  if (!traceId || !resultIndex) {
    return res.status(400).json({ message: "traceId and resultIndex required" });
  }
  try {
    const result = await flightService.getAncillary(traceId, resultIndex);
    res.json(result);
  } catch (err: any) {
    console.error("[TBO Flight] getAncillary error:", err.message);
    res.status(502).json({ message: err.message ?? "TBO Ancillary failed" });
  }
});

// ─── Utility ──────────────────────────────────────────────────────────────────

// POST /api/tbo/flight/logout
// No body required — invalidates the cached TBO token and calls TBO Logout API
// Call when agent signs out
tboFlightRoutes.post("/api/tbo/flight/logout", async (req, res) => {
  if (!requireAgent(req, res)) return;
  try {
    await flightService.logout();
    res.json({ message: "TBO token invalidated" });
  } catch (err: any) {
    console.error("[TBO Flight] logout error:", err.message);
    res.status(502).json({ message: err.message ?? "TBO Logout failed" });
  }
});

// POST /api/tbo/flight/release-pnr
// Body: { bookingId, source? }
// Releases a hold booking before Ticket is issued (Non-LCC only)
// source: 1 = GDS (default)
tboFlightRoutes.post("/api/tbo/flight/release-pnr", async (req, res) => {
  if (!requireAgent(req, res)) return;
  const { bookingId, source = 1 } = req.body;
  if (!bookingId) {
    return res.status(400).json({ message: "bookingId required" });
  }
  try {
    const result = await flightService.releasePNR(Number(bookingId), Number(source));
    res.json(result);
  } catch (err: any) {
    console.error("[TBO Flight] releasePNR error:", err.message);
    res.status(502).json({ message: err.message ?? "TBO ReleasePNR failed" });
  }
});

export default tboFlightRoutes;
