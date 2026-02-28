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

export function useTBOTicket() {
  return useMutation({
    mutationFn: (body: {
      traceId: string;
      resultIndex: string;
      passengers: unknown[];
      fare: unknown;
      pnr: string;
    }) => apiFetch("/api/tbo/flight/ticket", body as Record<string, unknown>),
  });
}
