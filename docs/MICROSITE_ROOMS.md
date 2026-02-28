# Microsite Hotel Rooms API

This document describes the public microsite rooms endpoint used by the event microsite UI.

## Endpoint

- GET `/api/microsite/:eventCode/hotel-rooms`

Returns a JSON object with a `rooms` array containing display-only room options suitable for a public microsite.

Example response:

```json
{
  "rooms": [
    { "id": "standard", "name": "Grand Plaza — Standard Room", "price": 2000 },
    { "id": "deluxe", "name": "Grand Plaza — Deluxe Room", "price": 3200 }
  ]
}
```

Notes:

- The endpoint is intentionally safe for public consumption and does not expose PII, booking codes, confirmation numbers, or any TBO-specific tokens.
- The default behaviour is a mocked, display-only list (the "fallback"). This keeps the microsite fully functional for demos and MVPs.

## Enabling live TBO-backed rooms (future)

To switch to live room data from the TBO Hotel API, set the following environment variable on the server:

```
ENABLE_TBO_MICROSITE_ROOMS=true
```

When enabled, the route will attempt to call internal TBO helpers (server-side only) and map the response into the sanitized `rooms` array. This switch is gated to avoid accidentally exposing credentials or unstable behaviour on the public microsite.

Important security considerations when enabling live data:

- Keep all TBO credentials in server-side environment variables only (do not send them to the client).
- Sanitize any TBO response before returning to the public endpoint: remove PNRs, confirmation numbers, booking codes, rate keys, supplier IDs, and any internal vendor tokens.
- Rate-limit and cache responses to avoid hitting TBO rate limits or leaking upstream errors to end users.

## Implementation notes / future tasks

- Implement a small mapping function `mapTboHotelResponseToRooms(tboResp)` that extracts only display fields (room name, occupancy, nightly rate estimate).
- If the event has an associated `hotelBooking` record with `tboHotelData` (search params), prefer deriving the search request from that data.
- Add a `POST /api/microsite/:eventCode/draft-booking` endpoint to create a lightweight server-side draft (no payment). The draft should store minimal info and return a non-sensitive `draftId` that the client can show on the confirmation screen.
- Add an agent toggle in `EventSetup` to enable or disable public booking (feature flag), and require explicit agent opt-in for production.

## Quick checklist for switching to live:

1. Implement `mapTboHotelResponseToRooms` in `server/tbo`.
2. Wire the live branch in `GET /api/microsite/:eventCode/hotel-rooms` to call `searchHotels` with derived params.
3. Add caching and rate-limiting.
4. Implement `draft-booking` endpoint and confirm that `GuestBooking` records do not include PII in publicly returned payloads.

---

Document created for the MVP fallback implementation. Replace or extend when live integration is required.
