/**
 * TBO Air Flight API Proxy Routes
 * All routes require an authenticated agent session.
 * Token auth with TBO is handled transparently by tboFlightService (cached).
 *
 * Mount in server/routes.ts: app.use(tboFlightRoutes);
 *
 * CRITICAL FLOW for caller:
 *   1. POST /api/tbo/flight/search  → save TraceId + ResultIndex in state
 *   2. POST /api/tbo/flight/farequote (pass TraceId + ResultIndex)
 *   3. POST /api/tbo/flight/farerule (pass TraceId + ResultIndex) — optional
 *   4. POST /api/tbo/flight/book (pass TraceId + ResultIndex + passengers + fare)
 *   5. POST /api/tbo/flight/ticket (pass TraceId + ResultIndex + PNR + passengers + fare)
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

// POST /api/tbo/flight/search
// Body: { origin, destination, departureDate, returnDate?, journeyType, adults, children, infants, directFlight, cabinClass? }
// Returns: { traceId, results[] } — save traceId in state for subsequent calls
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
      ResultFareType: "RegularFare",
    });

    res.json(result);
  } catch (err: any) {
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
// Returns: fare rule text (cancellation/change policies)
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

// POST /api/tbo/flight/book
// Body: { traceId, resultIndex, passengers[], fare }
// Returns: PNR + BookingId
tboFlightRoutes.post("/api/tbo/flight/book", async (req, res) => {
  if (!requireAgent(req, res)) return;
  const { traceId, resultIndex, passengers, fare } = req.body;
  if (!traceId || !resultIndex || !passengers || !fare) {
    return res.status(400).json({ message: "traceId, resultIndex, passengers, fare required" });
  }
  try {
    const result = await flightService.bookFlight({ TraceId: traceId, ResultIndex: resultIndex, Passengers: passengers, Fare: fare });
    res.json(result);
  } catch (err: any) {
    console.error("[TBO Flight] bookFlight error:", err.message);
    res.status(502).json({ message: err.message ?? "TBO Flight booking failed" });
  }
});

// POST /api/tbo/flight/ticket
// Body: { traceId, resultIndex, passengers[], fare, pnr }
// Returns: issued ticket numbers
tboFlightRoutes.post("/api/tbo/flight/ticket", async (req, res) => {
  if (!requireAgent(req, res)) return;
  const { traceId, resultIndex, passengers, fare, pnr } = req.body;
  if (!traceId || !resultIndex || !passengers || !fare || !pnr) {
    return res.status(400).json({ message: "traceId, resultIndex, passengers, fare, pnr required" });
  }
  try {
    const result = await flightService.issueTicket(traceId, resultIndex, passengers, fare, pnr);
    res.json(result);
  } catch (err: any) {
    console.error("[TBO Flight] issueTicket error:", err.message);
    res.status(502).json({ message: err.message ?? "TBO ticket issuance failed" });
  }
});

export default tboFlightRoutes;
