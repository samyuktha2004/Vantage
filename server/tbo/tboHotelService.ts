/**
 * TBO Hotel API Service (B2B Holidays)
 * All calls are server-side only. Credentials never reach the client.
 *
 * Base URL: TBO_HOTEL_URL env var
 * Auth:     HTTP Basic Auth (username:password base64 encoded)
 *
 * Flow: getCountryList → getCityList → getHotelList → getHotelDetails
 *       → searchHotels → preBookHotel → bookHotel
 */

import type {
  TBOHotelSearchRequest,
  TBOHotelSearchResponse,
  TBOPreBookRequest,
  TBOPreBookResponse,
  TBOBookHotelRequest,
  TBOBookHotelResponse,
  TBOCancelHotelResponse,
  TBOHotelCountry,
  TBOHotelCity,
  TBOHotelListItem,
  TBOHotelDetails,
} from "./tboTypes.js";

function getBaseUrl(): string {
  const url = process.env.TBO_HOTEL_URL;
  if (!url) throw new Error("TBO_HOTEL_URL is not configured in .env");
  return url;
}

function getAuthHeader(): string {
  const username = process.env.TBO_HOTEL_USERNAME;
  const password = process.env.TBO_HOTEL_PASSWORD;
  if (!username || !password) {
    throw new Error("TBO_HOTEL_USERNAME or TBO_HOTEL_PASSWORD is not configured in .env");
  }
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

function hotelHeaders() {
  return {
    Authorization: getAuthHeader(),
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

async function tboHotelFetch<T>(path: string, body?: object): Promise<T> {
  const url = `${getBaseUrl()}${path}`;
  const method = body ? "POST" : "GET";
  const res = await fetch(url, {
    method,
    headers: hotelHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = (await res.json()) as any;

  if (!res.ok) {
    throw new Error(`TBO Hotel API HTTP error ${res.status} at ${path}`);
  }

  if (data?.Status?.Code && data.Status.Code !== 200) {
    throw new Error(`TBO Hotel API error: ${data.Status.Description ?? "Unknown error"}`);
  }

  return data as T;
}

// ─── Country List ─────────────────────────────────────────────────────────────

export async function getCountryList(): Promise<TBOHotelCountry[]> {
  const data = await tboHotelFetch<{ CountryList?: TBOHotelCountry[] }>("/CountryList");
  return data.CountryList ?? [];
}

// ─── City List ────────────────────────────────────────────────────────────────

export async function getCityList(countryCode: string): Promise<TBOHotelCity[]> {
  const data = await tboHotelFetch<{ CityList?: TBOHotelCity[] }>("/CityList", {
    CountryCode: countryCode,
  });
  return data.CityList ?? [];
}

// ─── Hotel Code List ──────────────────────────────────────────────────────────

export async function getHotelList(cityCode: string): Promise<TBOHotelListItem[]> {
  const data = await tboHotelFetch<{ Hotels?: TBOHotelListItem[] }>("/TBOHotelCodeList", {
    CityCode: cityCode,
    IsDetailedResponse: true,
  });
  return data.Hotels ?? [];
}

// ─── Hotel Details ────────────────────────────────────────────────────────────

export async function getHotelDetails(
  hotelCodes: string,
  language = "EN"
): Promise<TBOHotelDetails[]> {
  const data = await tboHotelFetch<{ HotelDetails?: TBOHotelDetails[] }>("/Hoteldetails", {
    Hotelcodes: hotelCodes,
    Language: language,
  });
  return data.HotelDetails ?? [];
}

// ─── Hotel Search (Availability + Rates) ─────────────────────────────────────

export async function searchHotels(
  req: TBOHotelSearchRequest
): Promise<TBOHotelSearchResponse> {
  return tboHotelFetch<TBOHotelSearchResponse>("/search", req);
}

// ─── PreBook (Rate Hold) ──────────────────────────────────────────────────────

export async function preBookHotel(
  bookingCode: string,
  paymentMode: string = "Limit"
): Promise<TBOPreBookResponse> {
  const req: TBOPreBookRequest = { BookingCode: bookingCode, PaymentMode: paymentMode };
  return tboHotelFetch<TBOPreBookResponse>("/PreBook", req);
}

// ─── Book (Confirm) ───────────────────────────────────────────────────────────

export async function bookHotel(req: TBOBookHotelRequest): Promise<TBOBookHotelResponse> {
  return tboHotelFetch<TBOBookHotelResponse>("/Book", req);
}

// ─── Booking Detail ───────────────────────────────────────────────────────────

export async function getBookingDetail(
  confirmationNumber: string,
  paymentMode: string = "Limit"
): Promise<unknown> {
  return tboHotelFetch("/BookingDetail", {
    ConfirmationNumber: confirmationNumber,
    PaymentMode: paymentMode,
  });
}

// ─── Cancel ───────────────────────────────────────────────────────────────────

export async function cancelHotel(confirmationNumber: string): Promise<TBOCancelHotelResponse> {
  return tboHotelFetch<TBOCancelHotelResponse>("/Cancel", {
    ConfirmationNumber: confirmationNumber,
  });
}
