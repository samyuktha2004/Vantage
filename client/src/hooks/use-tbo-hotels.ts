import { useQuery, useMutation } from "@tanstack/react-query";

async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, { credentials: "include", ...options });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? "TBO Hotel API error");
  }
  return res.json();
}

export function useTBOCountries() {
  return useQuery({
    queryKey: ["tbo-hotel-countries"],
    queryFn: () => apiFetch("/api/tbo/hotel/countries"),
    staleTime: 1000 * 60 * 60, // 1 hour
    retry: 0, // Show fallback countries immediately if TBO is unavailable
  });
}

export function useTBOCities(countryCode: string) {
  return useQuery({
    queryKey: ["tbo-hotel-cities", countryCode],
    queryFn: () => apiFetch(`/api/tbo/hotel/cities?countryCode=${countryCode}`),
    enabled: !!countryCode,
    staleTime: 1000 * 60 * 60,
    retry: 0, // Show text input fallback immediately if TBO is unavailable
  });
}

export function useTBOHotelList(cityCode: string) {
  return useQuery({
    queryKey: ["tbo-hotel-list", cityCode],
    queryFn: () => apiFetch(`/api/tbo/hotel/list?cityCode=${cityCode}`),
    enabled: !!cityCode,
    staleTime: 1000 * 60 * 30,
  });
}

export function useTBOHotelSearch() {
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch("/api/tbo/hotel/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
  });
}

export function useTBOPrebook() {
  return useMutation({
    mutationFn: ({ bookingCode, paymentMode }: { bookingCode: string; paymentMode?: string }) =>
      apiFetch("/api/tbo/hotel/prebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingCode, paymentMode }),
      }),
  });
}

export function useTBOBookHotel() {
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch("/api/tbo/hotel/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
  });
}
