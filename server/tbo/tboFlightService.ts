/**
 * TBO Air API Service (B2C/GDS)
 * All calls are server-side only. Credentials never reach the client.
 *
 * Base URL: TBO_AIR_URL env var
 * Auth:     Token-based via ValidateAgency endpoint
 *           Token is cached in-memory for 55 minutes.
 *
 * Flow: (auto-auth) → searchFlights → fareQuote → fareRule
 *       → bookFlight → issueTicket
 *
 * CRITICAL: TraceId from searchFlights must be preserved in caller state
 *           and passed back to fareQuote/fareRule/bookFlight.
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

async function getFlightToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const clientId = process.env.TBO_AIR_CLIENT_ID;
  const password = process.env.TBO_AIR_PASSWORD;
  const endUserIp = process.env.TBO_AIR_SERVER_IP ?? "127.0.0.1";

  if (!clientId || !password) {
    throw new Error("TBO_AIR_CLIENT_ID or TBO_AIR_PASSWORD is not configured in .env");
  }

  const res = await fetch(`${getBaseUrl()}/Authenticate/ValidateAgency`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      BookingMode: "API",
      UserName: clientId,
      Password: password,
      IPAddress: endUserIp,
    }),
  });

  const data = (await res.json()) as TBOAuthResponse;

  if (!data.TokenId) {
    throw new Error(
      `TBO Air auth failed: ${data.Error?.ErrorMessage ?? "No token returned"}`
    );
  }

  // Cache for 55 minutes (TBO tokens typically valid for 60 min)
  cachedToken = {
    token: data.TokenId,
    expiresAt: Date.now() + 55 * 60 * 1000,
  };

  console.log("[TBO Air] Token refreshed, valid for 55 minutes");
  return data.TokenId;
}

function getEndUserIp(): string {
  return process.env.TBO_AIR_SERVER_IP ?? "127.0.0.1";
}

async function tboAirFetch<T>(path: string, body: object): Promise<T> {
  const tokenId = await getFlightToken();
  const url = `${getBaseUrl()}${path}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...body,
      TokenId: tokenId,
      EndUserIp: getEndUserIp(),
    }),
  });

  if (!res.ok) {
    throw new Error(`TBO Air API HTTP error ${res.status} at ${path}`);
  }

  const data = (await res.json()) as any;

  if (data?.Response?.Error?.ErrorCode && data.Response.Error.ErrorCode !== 0) {
    throw new Error(`TBO Air API error: ${data.Response.Error.ErrorMessage}`);
  }

  return data as T;
}

// ─── Flight Search ────────────────────────────────────────────────────────────

export async function searchFlights(
  req: TBOFlightSearchRequest
): Promise<TBOFlightSearchResponse> {
  return tboAirFetch<TBOFlightSearchResponse>("/Search/", req);
}

// ─── Fare Quote ───────────────────────────────────────────────────────────────

export async function fareQuote(
  traceId: string,
  resultIndex: string
): Promise<TBOFareQuoteResponse> {
  return tboAirFetch<TBOFareQuoteResponse>("/FareQuote/", {
    TraceId: traceId,
    ResultIndex: resultIndex,
  });
}

// ─── Fare Rule ────────────────────────────────────────────────────────────────

export async function fareRule(
  traceId: string,
  resultIndex: string
): Promise<TBOFareRuleResponse> {
  return tboAirFetch<TBOFareRuleResponse>("/FareRule/", {
    TraceId: traceId,
    ResultIndex: resultIndex,
  });
}

// ─── Book Flight ──────────────────────────────────────────────────────────────

export async function bookFlight(
  req: TBOBookFlightRequest
): Promise<TBOBookFlightResponse> {
  return tboAirFetch<TBOBookFlightResponse>("/Booking/Book", req);
}

// ─── Issue Ticket ─────────────────────────────────────────────────────────────

export async function issueTicket(
  traceId: string,
  resultIndex: string,
  passengers: TBOPassenger[],
  fare: TBOFare,
  pnr: string
): Promise<TBOTicketResponse> {
  return tboAirFetch<TBOTicketResponse>("/Booking/Ticket", {
    TraceId: traceId,
    ResultIndex: resultIndex,
    Passengers: passengers,
    Fare: fare,
    PNR: pnr,
  });
}

// ─── Utility: Invalidate Token (for testing / forced refresh) ─────────────────

export function invalidateToken(): void {
  cachedToken = null;
}
