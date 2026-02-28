# Progress Tracker — Vantage

**Last Updated:** February 2026

---

## Current Status: MVP Build — Phase 2 (TBO API Integration)

---

## Completed Features

### Core Platform

| Feature                        | Notes                                                             |
| ------------------------------ | ----------------------------------------------------------------- |
| Agent sign-up / sign-in        | Session-based, bcrypt hashed passwords                            |
| Client sign-up / sign-in       | Session-based, event code required post-signup                    |
| Event CRUD                     | Create/edit/delete/publish with auto event codes                  |
| Auto event code generation     | Format: `CLIENTEVENTyearMMDD` with uniqueness check               |
| Event preview page             | Agent reviews before publishing                                   |
| Label management               | Create/edit labels (VIP, Family, Staff, etc.) per event           |
| Perk management                | Create perks with type (transport/meal/activity) per event        |
| Label-Perk matrix              | Toggle enabled/disabled + expense coverage per label              |
| Guest CRUD                     | Create/edit/delete with full detail fields                        |
| Bulk guest import              | Excel (.xlsx) and CSV parsing via Papa Parse + XLSX               |
| Unique guest access tokens     | UUID-based, stored in `guests.accessToken`                        |
| Human-readable booking refs    | Format: `BOOK-XXXX`, stored in `guests.bookingRef`                |
| Guest QR code + shareable link | Generated from access token, agent-copyable                       |
| Seat allocation per guest      | `allocatedSeats` + `confirmedSeats` fields                        |
| Waitlist system                | Priority-based (VIP=1, Family=2, etc.)                            |
| Capacity monitoring            | Rooms vs. guests with Critical/Warning/Over-capacity alerts       |
| Request approval workflow      | Guest requests → agent reviews → approve/reject with notes        |
| Excel report generation        | 6-sheet: Summary, Guests, Hotel, Labels/Perks, Requests, Extended |

### Guest Portal (8 Pages)

| Page         | Route                        | Notes                                               |
| ------------ | ---------------------------- | --------------------------------------------------- |
| Lookup       | `/guest`                     | Search by booking ref → redirects to portal         |
| Dashboard    | `/guest/:token`              | Event overview + navigation                         |
| RSVP         | `/guest/:token` (inline)     | Confirm seats, accept/decline                       |
| Travel       | `/guest/:token/travel`       | Read-only confirmed travel details                  |
| Concierge    | `/guest/:token/concierge`    | Perks confirmation / contact agent                  |
| Itinerary    | `/guest/:token/itinerary`    | Activity selection with conflict detection          |
| Bleisure     | `/guest/:token/bleisure`     | Stay extension calendar (hardcoded $250/night rate) |
| ID Vault     | `/guest/:token/idvault`      | Document upload                                     |
| Room Upgrade | `/guest/:token/room-upgrade` | Upgrade request form                                |

---

## In Progress (Current Session)

| Task                         | Phase   | Status         |
| ---------------------------- | ------- | -------------- |
| PRD documentation            | Phase 0 | ✅ Done        |
| Roadmap documentation        | Phase 0 | ✅ Done        |
| Progress tracker (this file) | Phase 0 | ✅ Done        |
| TBO API Integration Guide    | Phase 0 | 🔄 In progress |
| TBO API Setup Guide          | Phase 0 | 🔄 In progress |
| Update .env + .env.example   | Phase 1 | ⏳ Pending     |
| Schema update (schema.ts)    | Phase 1 | ⏳ Pending     |
| Storage layer extension      | Phase 1 | ⏳ Pending     |
| TBO type definitions         | Phase 2 | ⏳ Pending     |
| TBO Hotel service layer      | Phase 2 | ⏳ Pending     |
| TBO Flight service layer     | Phase 2 | ⏳ Pending     |
| TBO Hotel Express routes     | Phase 2 | ⏳ Pending     |
| TBO Flight Express routes    | Phase 2 | ⏳ Pending     |
| Hotel search UI components   | Phase 3 | ⏳ Pending     |
| Flight search UI components  | Phase 4 | ⏳ Pending     |
| Event microsite page         | Phase 5 | ⏳ Pending     |
| Ground team check-in         | Phase 6 | ⏳ Pending     |
| Inventory dashboard tab      | Phase 7 | ⏳ Pending     |

---

## Known Issues & Technical Debt

| Issue                                                                            | File                 | Severity | Notes                                                                                              |
| -------------------------------------------------------------------------------- | -------------------- | -------- | -------------------------------------------------------------------------------------------------- |
| Bug: `travelSchedules` Drizzle relation references non-existent `eventId` column | `server/storage.ts`  | Medium   | Logic error; `eq(travelSchedules.eventId, travelOptionId)` — `eventId` doesn't exist on this table |
| Hardcoded `$250/night` bleisure rate                                             | `GuestBleisure.tsx`  | Medium   | Must connect to live TBO hotel rate in V1                                                          |
| No `arrived` status for guests                                                   | `shared/schema.ts`   | High     | Ground team check-in requires this status value                                                    |
| TBO Air token management missing                                                 | N/A                  | Critical | No auth flow exists; will be added in Phase 2                                                      |
| No CORS protection on TBO endpoints                                              | N/A                  | High     | Will add server-side-only enforcement in Phase 2                                                   |
| Guest portal `GuestTravel.tsx` references undefined `ref` variable               | `GuestTravel.tsx:83` | Low      | `ref` used in `setLocation` call but not defined                                                   |
| `EventDetails.tsx` has many console.log debug statements                         | `EventDetails.tsx`   | Low      | Should be removed before production                                                                |

---

## Database Schema (Current State)

### Tables (Supabase PostgreSQL)

- `users` — agents + clients (+ ground team after Phase 1)
- `events` — MICE events / weddings
- `client_details` — host client info per event
- `hotel_bookings` — hotel blocks (manual only; TBO data column added in Phase 1)
- `travel_options` — travel modes per event (manual only; TBO data column added in Phase 1)
- `travel_schedules` — flight/train schedule details
- `labels` — guest tier definitions per event
- `perks` — service add-ons per event
- `label_perks` — junction table (label × perk × expense toggle)
- `guests` — all attendees with access tokens
- `guest_family` — family members for rooming
- `guest_requests` — guest perk requests for agent approval
- `itinerary_events` — scheduled event activities
- `guest_itinerary` — guest activity selections
- `group_inventory` — _(added in Phase 1)_ inventory tracking

### Pending Schema Changes (Phase 1)

- Add `tbo_hotel_data JSONB` to `hotel_bookings`
- Add `tbo_flight_data JSONB` to `travel_options`
- Create `group_inventory` table
- Add `groundTeam` to user role enum

---

## API Routes (Current State)

### Auth

- `POST /api/auth/signup`
- `POST /api/auth/signin`
- `GET /api/user`
- `POST /api/auth/logout`
- `POST /api/user/event-code`

### Events

- `GET /api/events` — list by agent or event code
- `POST /api/events` — create
- `GET /api/events/:id` — get one
- `PUT /api/events/:id` — update
- `DELETE /api/events/:id` — delete
- `POST /api/events/:id/publish`

### Event Setup

- `POST/GET /api/events/:id/client-details`
- `POST/GET /api/events/:id/hotel-booking(s)`
- `POST/GET /api/events/:id/travel-options`

### Labels / Perks

- `GET/POST /api/events/:eventId/labels`
- `PUT /api/events/:eventId/labels/:id`
- `GET/POST /api/events/:eventId/perks`
- `PUT /api/events/:eventId/perks/:id`
- `GET/PUT /api/events/:eventId/labels/:labelId/perks/:perkId`

### Guests

- `GET/POST /api/events/:eventId/guests`
- `GET/PUT/DELETE /api/guests/:id`
- `GET /api/guests/lookup?ref=XXXX`

### Guest Portal

- `GET /api/guest/portal/:token`
- `POST /api/guest/:token/rsvp`
- `POST /api/guest/:token/family`
- `GET/POST /api/guest/:token/itinerary`
- `POST /api/guest/:token/request`
- `PUT /api/guest/:token/bleisure`
- `PUT /api/guest/:token/id-upload`

### Pending Routes (Phases 2–7)

- `GET /api/tbo/hotel/countries`
- `GET /api/tbo/hotel/cities`
- `GET /api/tbo/hotel/list`
- `POST /api/tbo/hotel/search`
- `POST /api/tbo/hotel/prebook`
- `POST /api/tbo/hotel/book`
- `GET /api/tbo/hotel/booking/:id`
- `POST /api/tbo/hotel/cancel`
- `POST /api/tbo/flight/search`
- `POST /api/tbo/flight/farequote`
- `POST /api/tbo/flight/farerule`
- `POST /api/tbo/flight/book`
- `POST /api/tbo/flight/ticket`
- `GET /api/events/:id/inventory`
- `GET /api/microsite/:eventCode`
- `POST /api/microsite/:eventCode/register`
- `POST /api/groundteam/checkin/:guestId`
