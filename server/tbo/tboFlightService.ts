/**
 * TBO Air API Service (B2C/GDS)
 * All calls are server-side only. Credentials never reach the client.
 *
 * Base URL: TBO_AIR_URL env var
 *   → http://api.tektravels.com/BookingEngineService_Air/AirService.svc/rest
 * Auth:     Token-based via Sharedapi.tektravels.com/SharedData.svc/rest/Authenticate
 *           Token is cached in-memory until midnight.
 *
 * Flow (LCC):     auth → search → fareQuote → SSR → issueTicketLCC
 * Flow (Non-LCC): auth → search → fareQuote → SSR → bookFlight → issueTicketGDS
 * Post-booking:   getBookingDetails → cancellationCharges → cancel | reissue | ancillary
 *
 * CRITICAL: TraceId from searchFlights must be preserved in caller state
 *           and passed to every subsequent call.
 */

import type {
  TBOFlightSearchRequest,
  TBOFlightSearchResponse,
  TBOFareQuoteResponse,
  TBOFareRuleResponse,
  TBOBookFlightRequest,
  TBOBookFlightResponse,
  TBOTicketResponse,
  TBOAuthResponse,
  TBOFare,
  TBOPassenger,
} from "./tboTypes.js";

// ─── Token Cache ──────────────────────────────────────────────────────────────

interface TokenCache {
  token: string;
  expiresAt: number; // epoch ms
}

let cachedToken: TokenCache | null = null;

function getBaseUrl(): string {
  const url = process.env.TBO_AIR_URL;
  if (!url) throw new Error("TBO_AIR_URL is not configured in .env");
  return url;
}

function getAuthBaseUrl(): string {
  return (
    process.env.TBO_AIR_AUTH_URL ??
    "https://Sharedapi.tektravels.com/SharedData.svc/rest"
  );
}

async function getFlightToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const userName = process.env.TBO_AIR_USERNAME;
  const password = process.env.TBO_AIR_PASSWORD;
  const endUserIp = process.env.TBO_AIR_SERVER_IP ?? "127.0.0.1";

  if (!userName || !password) {
    throw new Error("TBO_AIR_USERNAME or TBO_AIR_PASSWORD is not configured in .env");
  }

  const res = await fetch(`${getAuthBaseUrl()}/Authenticate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept-Encoding": "gzip",
    },
    body: JSON.stringify({
      ClientId: "ApiIntegrationNew",
      UserName: userName,
      Password: password,
      EndUserIp: endUserIp,
      BookingMode: "API",
    }),
    signal: AbortSignal.timeout(15000),
  });

  const rawAuth = await res.text();
  let data: TBOAuthResponse;
  try {
    data = JSON.parse(rawAuth) as TBOAuthResponse;
  } catch {
    throw new Error(`TBO Air auth returned non-JSON: ${rawAuth.slice(0, 200)}`);
  }

  if (!data.TokenId) {
    throw new Error(
      `TBO Air auth failed: ${data.Error?.ErrorMessage ?? "No token returned"}`
    );
  }

  // Cache until 2 minutes past midnight (tokens valid for the calendar day 00:00–23:59)
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 2, 0);

  cachedToken = {
    token: data.TokenId,
    expiresAt: midnight.getTime(),
  };

  console.log("[TBO Air] Token refreshed, valid until midnight");
  return data.TokenId;
}

function getEndUserIp(): string {
  return process.env.TBO_AIR_SERVER_IP ?? "127.0.0.1";
}

async function tboAirFetch<T>(path: string, body: object, _retried = false): Promise<T> {
  const tokenId = await getFlightToken();
  const url = `${getBaseUrl()}${path}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept-Encoding": "gzip",
    },
    body: JSON.stringify({
      ...body,
      TokenId: tokenId,
      EndUserIp: getEndUserIp(),
    }),
  });

  const rawText = await res.text();
  if (!res.ok) {
    throw new Error(`TBO Air API HTTP error ${res.status} at ${path}: ${rawText.slice(0, 200)}`);
  }

  let data: any;
  try {
    data = JSON.parse(rawText);
  } catch {
    throw new Error(`TBO Air API returned non-JSON at ${path}: ${rawText.slice(0, 200)}`);
  }

  const errorCode: number | undefined = data?.Response?.Error?.ErrorCode;
  const errorMsg: string = data?.Response?.Error?.ErrorMessage ?? "";

  // If TBO says the token is invalid/expired and we haven't retried, clear cache and retry once
  if (!_retried && errorCode && errorCode !== 0 && /token|auth|session|invalid/i.test(errorMsg)) {
    cachedToken = null;
    console.log("[TBO Air] Token rejected by server — refreshing and retrying");
    return tboAirFetch<T>(path, body, true);
  }

  if (errorCode && errorCode !== 0) {
    throw new Error(`TBO Air API error: ${errorMsg}`);
  }

  return data as T;
}

// ─── Flight Search ────────────────────────────────────────────────────────────

export async function searchFlights(
  req: TBOFlightSearchRequest
): Promise<TBOFlightSearchResponse> {
  // TBO WCF expects numeric/boolean fields serialized as strings (confirmed by Staging Postman collection)
  const tboBody = {
    ...req,
    AdultCount: String(req.AdultCount),
    ChildCount: String(req.ChildCount),
    InfantCount: String(req.InfantCount),
    DirectFlight: String(req.DirectFlight),
    OneStopFlight: String(req.OneStopFlight),
    Segments: req.Segments.map((s) => ({
      ...s,
      FlightCabinClass: String(s.FlightCabinClass),
    })),
    ResultFareType: undefined, // not present in Staging collection — omit to avoid 400
  };
  return tboAirFetch<TBOFlightSearchResponse>("/Search", tboBody);
}

// ─── Fare Quote ───────────────────────────────────────────────────────────────

export async function fareQuote(
  traceId: string,
  resultIndex: string
): Promise<TBOFareQuoteResponse> {
  return tboAirFetch<TBOFareQuoteResponse>("/FareQuote", {
    TraceId: traceId,
    ResultIndex: resultIndex,
  });
}

// ─── Fare Rule ────────────────────────────────────────────────────────────────

export async function fareRule(
  traceId: string,
  resultIndex: string
): Promise<TBOFareRuleResponse> {
  return tboAirFetch<TBOFareRuleResponse>("/FareRule", {
    TraceId: traceId,
    ResultIndex: resultIndex,
  });
}

// ─── Book Flight ──────────────────────────────────────────────────────────────

export async function bookFlight(
  req: TBOBookFlightRequest
): Promise<TBOBookFlightResponse> {
  return tboAirFetch<TBOBookFlightResponse>("/Book", req);
}

// ─── SSR (Special Service Requests) ──────────────────────────────────────────
// Returns available meal, baggage, and seat options for LCC flights.
// Call after fareQuote, before book/ticket.

export async function getSSR(
  traceId: string,
  resultIndex: string
): Promise<unknown> {
  return tboAirFetch("/SSR", { TraceId: traceId, ResultIndex: resultIndex });
}

// ─── Issue Ticket — LCC ───────────────────────────────────────────────────────
// LCC (IndiGo 6E, SpiceJet SG, Akasa QP, FlyDubai FZ…): Ticket directly,
// no Book step. Request shape: { TraceId, ResultIndex, Passengers[], Fare? }

export async function issueTicketLCC(
  traceId: string,
  resultIndex: string,
  passengers: TBOPassenger[],
  fare: TBOFare
): Promise<TBOTicketResponse> {
  return tboAirFetch<TBOTicketResponse>("/Ticket", {
    TraceId: traceId,
    ResultIndex: resultIndex,
    Passengers: passengers,
    Fare: fare,
  });
}

// ─── Issue Ticket — GDS/Non-LCC ───────────────────────────────────────────────
// Non-LCC (Air India AI, Lufthansa LH, Emirates EK…): After Book, call Ticket
// with only PNR + BookingId. Request shape: { TraceId, PNR, BookingId }

export async function issueTicketGDS(
  traceId: string,
  pnr: string,
  bookingId: number
): Promise<TBOTicketResponse> {
  return tboAirFetch<TBOTicketResponse>("/Ticket", {
    TraceId: traceId,
    PNR: pnr,
    BookingId: bookingId,
  });
}

// ─── Get Booking Details ───────────────────────────────────────────────────────
// Call after Book or Ticket to verify status. BookingId is the primary key.

export async function getBookingDetails(
  bookingId: number,
  pnr?: string
): Promise<unknown> {
  return tboAirFetch("/GetBookingDetails", {
    BookingId: bookingId,
    ...(pnr ? { PNR: pnr } : {}),
  });
}

// ─── Release PNR ──────────────────────────────────────────────────────────────
// Releases a hold booking before Ticket is issued. Source = 1 for GDS.

export async function releasePNR(
  bookingId: number,
  source: number
): Promise<unknown> {
  return tboAirFetch("/ReleasePNRRequest", {
    BookingId: bookingId,
    Source: source,
  });
}

// ─── Get Cancellation Charges ─────────────────────────────────────────────────
// MUST call before SendChangeRequest for GDS/NDC bookings.
// Returns RefundAmount, CancellationCharge, Currency.

export async function getCancellationCharges(
  bookingId: number
): Promise<unknown> {
  return tboAirFetch("/GetCancellationCharges", {
    BookingId: bookingId,
    RequestType: 1,   // 1 = Cancellation
    BookingMode: 5,
  });
}

// ─── Cancel Booking ───────────────────────────────────────────────────────────
// SendChangeRequest with RequestType=1 (cancel). For partial cancellation,
// pass Sectors[] and TicketId[].

export async function cancelBooking(
  bookingId: number,
  remarks: string,
  sectors?: unknown[],
  ticketIds?: unknown[]
): Promise<unknown> {
  return tboAirFetch("/SendChangeRequest", {
    BookingId: bookingId,
    RequestType: 1,
    CancellationType: 3,
    Remarks: remarks,
    ...(sectors ? { Sectors: sectors } : {}),
    ...(ticketIds ? { TicketId: ticketIds } : {}),
  });
}

// ─── Reissue Ticket ───────────────────────────────────────────────────────────
// SendChangeRequest with RequestType=3 (reissue / date change).

export async function reissueTicket(
  bookingId: number,
  remarks: string
): Promise<unknown> {
  return tboAirFetch("/SendChangeRequest", {
    BookingId: bookingId,
    RequestType: 3,
    CancellationType: 3,
    Remarks: remarks,
  });
}

// ─── Ancillary ────────────────────────────────────────────────────────────────
// Returns available ancillary services (meals/baggage/seats) post-booking.

export async function getAncillary(
  traceId: string,
  resultIndex: string
): Promise<unknown> {
  return tboAirFetch("/GetAncillary", {
    TraceId: traceId,
    ResultIndex: resultIndex,
  });
}

// ─── Logout ───────────────────────────────────────────────────────────────────
// Invalidates the current token on TBO servers and clears local cache.
// Call on agent sign-out.

export async function logout(): Promise<void> {
  const tokenId = cachedToken?.token;
  cachedToken = null; // clear cache regardless of API result
  if (!tokenId) return;

  await fetch(`${getAuthBaseUrl()}/Logout`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept-Encoding": "gzip" },
    body: JSON.stringify({ TokenId: tokenId, EndUserIp: getEndUserIp() }),
  }).catch(() => {}); // best-effort — don't throw on logout failure
}

// ─── Utility: Invalidate Token (for testing / forced refresh) ─────────────────

export function invalidateToken(): void {
  cachedToken = null;
}

// ─── Airline Sector List (2025) ───────────────────────────────────────────────
// NOTE: This endpoint lives on a completely different base URL from the main TBO
// Air API. Do NOT route through tboAirFetch (which prepends TBO_AIR_URL).
// Official URL: https://tboapi.travelboutiqueonline.com/AirAPI_V10/AirService.svc/rest/GetAirlineSectorList
// @see https://apidoc.tektravels.com/flight/NewReleases2025.aspx

const SECTOR_LIST_URL =
  (process.env.TBO_AIR_SECTOR_URL ??
    "https://tboapi.travelboutiqueonline.com/AirAPI_V10/AirService.svc/rest") +
  "/GetAirlineSectorList";

export async function getAirlineSectorList(
  traceId?: string,
  agencyId?: number
): Promise<unknown> {
  const tokenId = await getFlightToken();

  const body: Record<string, unknown> = {
    TokenId: tokenId,
    EndUserIp: getEndUserIp(),
  };
  if (traceId) body.TraceId = traceId;
  if (agencyId !== undefined) body.AgencyId = agencyId;

  const res = await fetch(SECTOR_LIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`TBO Airline Sector List HTTP error ${res.status}`);
  }

  return res.json();
}
