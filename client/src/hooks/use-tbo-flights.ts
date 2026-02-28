import { useMutation } from "@tanstack/react-query";

async function apiFetch(url: string, body: Record<string, unknown>) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? "TBO Flight API error");
  }
  return res.json();
}

// ─── Pre-booking hooks ────────────────────────────────────────────────────────

export function useTBOFlightSearch() {
  return useMutation({
    mutationFn: (body: {
      origin: string;
      destination: string;
      departureDate: string;
      returnDate?: string;
      journeyType?: string;
      adults?: number;
      children?: number;
      infants?: number;
      directFlight?: boolean;
      cabinClass?: string;
    }) => apiFetch("/api/tbo/flight/search", body as Record<string, unknown>),
  });
}

export function useTBOFareQuote() {
  return useMutation({
    mutationFn: ({ traceId, resultIndex }: { traceId: string; resultIndex: string }) =>
      apiFetch("/api/tbo/flight/farequote", { traceId, resultIndex }),
  });
}

export function useTBOFareRule() {
  return useMutation({
    mutationFn: ({ traceId, resultIndex }: { traceId: string; resultIndex: string }) =>
      apiFetch("/api/tbo/flight/farerule", { traceId, resultIndex }),
  });
}

export function useTBOSSR() {
  return useMutation({
    mutationFn: ({ traceId, resultIndex }: { traceId: string; resultIndex: string }) =>
      apiFetch("/api/tbo/flight/ssr", { traceId, resultIndex }),
  });
}

export function useTBOBookFlight() {
  return useMutation({
    mutationFn: (body: {
      traceId: string;
      resultIndex: string;
      passengers: unknown[];
      fare: unknown;
    }) => apiFetch("/api/tbo/flight/book", body as Record<string, unknown>),
  });
}

// Ticket accepts two shapes — the route detects which flow based on fields present:
//   LCC:     { traceId, resultIndex, passengers, fare }
//   Non-LCC: { traceId, pnr, bookingId }
export function useTBOTicket() {
  return useMutation({
    mutationFn: (body:
      | { traceId: string; resultIndex: string; passengers: unknown[]; fare: unknown }
      | { traceId: string; pnr: string; bookingId: number }
    ) => apiFetch("/api/tbo/flight/ticket", body as Record<string, unknown>),
  });
}

// ─── Post-booking hooks ───────────────────────────────────────────────────────

export function useTBOBookingDetails() {
  return useMutation({
    mutationFn: ({ bookingId, pnr }: { bookingId: number; pnr?: string }) =>
      apiFetch("/api/tbo/flight/booking-details", {
        bookingId,
        ...(pnr ? { pnr } : {}),
      }),
  });
}

export function useTBOCancellationCharges() {
  return useMutation({
    mutationFn: ({ bookingId }: { bookingId: number }) =>
      apiFetch("/api/tbo/flight/cancellation-charges", { bookingId }),
  });
}

export function useTBOCancelFlight() {
  return useMutation({
    mutationFn: (body: {
      bookingId: number;
      remarks?: string;
      sectors?: unknown[];
      ticketIds?: unknown[];
    }) => apiFetch("/api/tbo/flight/cancel", body as Record<string, unknown>),
  });
}

export function useTBOReissue() {
  return useMutation({
    mutationFn: ({ bookingId, remarks }: { bookingId: number; remarks?: string }) =>
      apiFetch("/api/tbo/flight/reissue", { bookingId, remarks }),
  });
}

export function useTBOAncillary() {
  return useMutation({
    mutationFn: ({ traceId, resultIndex }: { traceId: string; resultIndex: string }) =>
      apiFetch("/api/tbo/flight/ancillary", { traceId, resultIndex }),
  });
}

// ─── Utility hooks ────────────────────────────────────────────────────────────

export function useTBOReleasePNR() {
  return useMutation({
    mutationFn: ({ bookingId, source = 1 }: { bookingId: number; source?: number }) =>
      apiFetch("/api/tbo/flight/release-pnr", { bookingId, source }),
  });
}
