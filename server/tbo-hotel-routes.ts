/**
 * TBO Hotel API Proxy Routes
 * All routes require an authenticated agent session.
 * Credentials are injected server-side — never exposed to the browser.
 *
 * Mount in server/routes.ts: app.use(tboHotelRoutes);
 */

import { Router } from "express";
import * as hotelService from "./tbo/tboHotelService.js";

const tboHotelRoutes = Router();

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
    res.status(403).json({ message: "Only agents can access TBO hotel data" });
    return false;
  }
  return true;
}

// GET /api/tbo/hotel/countries
// Returns list of all TBO countries for the country dropdown
tboHotelRoutes.get("/api/tbo/hotel/countries", async (req, res) => {
  if (!requireAgent(req, res)) return;
  try {
    const countries = await hotelService.getCountryList();
    res.json(countries);
  } catch (err: any) {
    console.error("[TBO Hotel] getCountryList error:", err.message);
    res.status(502).json({ message: err.message ?? "TBO Hotel API unavailable" });
  }
});

// GET /api/tbo/hotel/cities?countryCode=IN
// Returns cities for a given country
tboHotelRoutes.get("/api/tbo/hotel/cities", async (req, res) => {
  if (!requireAgent(req, res)) return;
  const { countryCode } = req.query as { countryCode: string };
  if (!countryCode) {
    return res.status(400).json({ message: "countryCode query param required" });
  }
  try {
    const cities = await hotelService.getCityList(countryCode);
    res.json(cities);
  } catch (err: any) {
    console.error("[TBO Hotel] getCityList error:", err.message);
    res.status(502).json({ message: err.message ?? "TBO Hotel API unavailable" });
  }
});

// GET /api/tbo/hotel/list?cityCode=DEL
// Returns hotel codes and names for a given city
tboHotelRoutes.get("/api/tbo/hotel/list", async (req, res) => {
  if (!requireAgent(req, res)) return;
  const { cityCode } = req.query as { cityCode: string };
  if (!cityCode) {
    return res.status(400).json({ message: "cityCode query param required" });
  }
  try {
    const hotels = await hotelService.getHotelList(cityCode);
    res.json(hotels);
  } catch (err: any) {
    console.error("[TBO Hotel] getHotelList error:", err.message);
    res.status(502).json({ message: err.message ?? "TBO Hotel API unavailable" });
  }
});

// POST /api/tbo/hotel/details
// Returns full hotel details (amenities, description, images) for given hotel codes
tboHotelRoutes.post("/api/tbo/hotel/details", async (req, res) => {
  if (!requireAgent(req, res)) return;
  const { hotelCodes, language } = req.body;
  if (!hotelCodes) {
    return res.status(400).json({ message: "hotelCodes required" });
  }
  try {
    const details = await hotelService.getHotelDetails(hotelCodes, language);
    res.json(details);
  } catch (err: any) {
    console.error("[TBO Hotel] getHotelDetails error:", err.message);
    res.status(502).json({ message: err.message ?? "TBO Hotel API unavailable" });
  }
});

// POST /api/tbo/hotel/search
// Search hotel availability and rates for given city/dates/rooms
tboHotelRoutes.post("/api/tbo/hotel/search", async (req, res) => {
  if (!requireAgent(req, res)) return;
  try {
    const result = await hotelService.searchHotels(req.body);
    res.json(result);
  } catch (err: any) {
    console.error("[TBO Hotel] searchHotels error:", err.message);
    res.status(502).json({ message: err.message ?? "TBO Hotel search failed" });
  }
});

// POST /api/tbo/hotel/prebook
// Hold a room rate (returns updated BookingCode)
// Body: { bookingCode: string, paymentMode?: string }
tboHotelRoutes.post("/api/tbo/hotel/prebook", async (req, res) => {
  if (!requireAgent(req, res)) return;
  const { bookingCode, paymentMode } = req.body;
  if (!bookingCode) {
    return res.status(400).json({ message: "bookingCode required" });
  }
  try {
    const result = await hotelService.preBookHotel(bookingCode, paymentMode);
    res.json(result);
  } catch (err: any) {
    console.error("[TBO Hotel] preBookHotel error:", err.message);
    res.status(502).json({ message: err.message ?? "TBO Hotel PreBook failed" });
  }
});

// POST /api/tbo/hotel/book
// Confirm booking — returns ConfirmationNumber
// Body: full TBOBookHotelRequest
tboHotelRoutes.post("/api/tbo/hotel/book", async (req, res) => {
  if (!requireAgent(req, res)) return;
  try {
    const result = await hotelService.bookHotel(req.body);
    res.json(result);
  } catch (err: any) {
    console.error("[TBO Hotel] bookHotel error:", err.message);
    res.status(502).json({ message: err.message ?? "TBO Hotel Book failed" });
  }
});

// GET /api/tbo/hotel/booking/:confirmationNumber
// Retrieve booking detail for a given confirmation number
tboHotelRoutes.get("/api/tbo/hotel/booking/:confirmationNumber", async (req, res) => {
  if (!requireAgent(req, res)) return;
  try {
    const result = await hotelService.getBookingDetail(req.params.confirmationNumber);
    res.json(result);
  } catch (err: any) {
    console.error("[TBO Hotel] getBookingDetail error:", err.message);
    res.status(502).json({ message: err.message ?? "TBO Hotel BookingDetail failed" });
  }
});

// POST /api/tbo/hotel/cancel
// Cancel a booking
// Body: { confirmationNumber: string }
tboHotelRoutes.post("/api/tbo/hotel/cancel", async (req, res) => {
  if (!requireAgent(req, res)) return;
  const { confirmationNumber } = req.body;
  if (!confirmationNumber) {
    return res.status(400).json({ message: "confirmationNumber required" });
  }
  try {
    const result = await hotelService.cancelHotel(confirmationNumber);
    res.json(result);
  } catch (err: any) {
    console.error("[TBO Hotel] cancelHotel error:", err.message);
    res.status(502).json({ message: err.message ?? "TBO Hotel Cancel failed" });
  }
});

export default tboHotelRoutes;
