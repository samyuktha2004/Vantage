# API Status — What Works, What Doesn't

**Last updated:** March 2026
**Purpose:** Quick reference for demo prep — shows exactly which API-dependent features are live vs mock vs broken.

---

## TL;DR for Demo

| Category | Status | Workaround |
|----------|--------|------------|
| All guest portal flows | ✅ **Fully working** | No credentials needed |
| All agent event management | ✅ **Fully working** | No credentials needed |
| All client management | ✅ **Fully working** | No credentials needed |
| Ground team check-in | ✅ **Fully working** | No credentials needed |
| TBO Hotel search (EventSetup) | ⚠️ **Fails silently** | Use Manual Entry mode |
| TBO Flight search (EventSetup) | ⚠️ **Fails silently** | Use Manual Transport entry |
| Email notifications (waitlist, invite) | ❌ **Not wired up** | No workaround — stub only |

---

## 1. Internal APIs — All Working ✅

These are Vantage's own Express endpoints backed by Supabase. They require no TBO credentials and work on any environment.

### Guest Portal (`/api/guest/*`)

| Endpoint | Method | What it does | Status |
|----------|--------|--------------|--------|
| `/api/guest/portal/:token` | GET | Load all guest data (event, perks, hotels, itinerary, waitlist status) | ✅ Works |
| `/api/guest/:token/rsvp` | PUT | Confirm/decline RSVP + family members | ✅ Works |
| `/api/guest/:token/travel-prefs` | PUT | Save arrival/departure mode, origin city, journey notes | ✅ Works |
| `/api/guest/:token/hotel-selection` | PUT | Guest picks preferred hotel when multiple options exist | ✅ Works (run `db:push` first) |
| `/api/guest/:token/bleisure` | PUT | Set early check-in / late check-out extension dates | ✅ Works |
| `/api/guest/:token/profile` | PUT | Update meal preference, emergency contact | ✅ Works |
| `/api/guest/:token/id-upload` | POST | Mark ID as uploaded + verified | ✅ Works (simulated OCR, no real scan) |
| `/api/guest/:token/request` | POST | Submit perk/add-on request | ✅ Works (auto-approves within budget) |
| `/api/guest/:token/join-waitlist` | POST | Join hotel waitlist | ✅ Works |
| `/api/guest/:token/itinerary/:eventId/register` | POST | Register for itinerary event (with conflict check) | ✅ Works |
| `/api/guest/:token/itinerary/:eventId/unregister` | DELETE | Unregister from itinerary event | ✅ Works |

### Event Management (`/api/events/*`)

| Endpoint | What it does | Status |
|----------|--------------|--------|
| Create / update / delete event | Agent CRUD for events | ✅ Works |
| Import guests (CSV/XLSX) | Bulk import with label auto-match | ✅ Works |
| Labels CRUD | Create/update/delete tiers | ✅ Works |
| Perks CRUD | Create/update/delete add-ons | ✅ Works |
| Label-perk assignment | Assign perk to label + toggle coverage | ✅ Works |
| Guest requests approval | Agent/client approve or reject | ✅ Works |
| Inventory tracking | EWS progress bars for hotel/flight utilisation | ✅ Works |
| Microsite publish | Set theme, cover image, invite text | ✅ Works |
| Hotel bookings (manual entry) | Add hotel with manual name/dates/rooms | ✅ Works |
| Travel options (manual entry) | Add transport option manually | ✅ Works |

### Ground Team (`/api/groundteam/*` and `/api/guests/:id/checkin`)

| Feature | Status |
|---------|--------|
| Guest list with QR codes | ✅ Works |
| Mark arrived / check-in | ✅ Works |
| Walk-in registration | ✅ Works |
| Flight status update | ✅ Works |
| Rooming list export (Excel) | ✅ Works |

---

## 2. TBO Hotel API — Credentials Required ⚠️

### What it does
Used in **EventSetup Step 2** — the `HotelSearchPanel` component. Lets the agent search for hotels by city, pick a room type, and book it. The result is stored in `hotel_bookings.tboHotelData`.

### Why it fails
TBO Hotel API uses HTTP Basic Auth (`TBO_HOTEL_USERNAME:TBO_HOTEL_PASSWORD`). If credentials are not set or are invalid, every call returns a 401 or `"Login Failed for Member"` response.

### What happens in the app when it fails
- `GET /api/tbo/hotel/countries` → returns 502 to UI
- `GET /api/tbo/hotel/cities` → returns 502 to UI
- `POST /api/tbo/hotel/search` → returns 502 to UI
- The `HotelSearchPanel` shows an error toast: _"TBO Hotel API unavailable"_
- **No mock fallback** — the search UI shows nothing

### Workaround for demo ✅
Click **"Manual Entry"** in EventSetup Step 2. This completely bypasses TBO:
- Type the hotel name, check-in/out dates, number of rooms, and rate directly
- The hotel is saved identically to TBO-booked hotels
- All guest portal features (hotel name display, selection, waitlist) work the same

### Affected features when TBO Hotel creds are missing
| Feature | Impact |
|---------|--------|
| Hotel search in EventSetup | ❌ Broken — use Manual Entry |
| Hotel selection in HotelRoomSelector | ❌ Broken — use Manual Entry |
| Manual hotel entry | ✅ Works perfectly |
| Guest sees hotel name | ✅ Works (pulls from `hotel_bookings` table regardless of how it was added) |
| Waitlist system | ✅ Works (not TBO-dependent) |

---

## 3. TBO Air (Flight) API — Credentials Required ⚠️

### What it does
Used in **EventSetup Step 3** — the `FlightSearchPanel`. Lets the agent search flights, see fares, and book group seats. Result stored in `travel_options.tboFlightData`.

### Auth flow
1. Server calls `ValidateAgency` (TekTravels `Sharedapi` endpoint) with username+password → gets `TokenId`
2. Token is cached in server memory until midnight
3. All subsequent flight calls (`/Search/`, `/FareQuote/`, `/Book`, `/Ticket`) include the token

### Why it fails
- `TBO_AIR_USERNAME` / `TBO_AIR_PASSWORD` are blank → `getFlightToken()` throws immediately
- The token endpoint URL is `https://Sharedapi.tektravels.com/SharedData.svc/rest/Authenticate`
- Without valid credentials: 502 returned to UI

### What happens in the app when it fails
- `POST /api/tbo/flight/search` → 502 or `{ Results: [] }` (the "no result" path returns empty)
- FlightSearchPanel shows "No flights found"
- **No mock fallback** — you see an empty state

### Workaround for demo ✅
Use **Manual Transport Entry** in EventSetup Step 3:
- Select mode (Flight / Train / Bus)
- Enter from/to city, departure date, optional flight number
- This creates a `travel_options` record without TBO data
- Guests see it as a "Group transport" option with the `Host covered` badge

### Affected features when TBO Air creds are missing
| Feature | Impact |
|---------|--------|
| Flight search in EventSetup | ❌ Broken — use Manual Entry |
| Fare quote / fare rules display | ❌ Broken |
| Flight booking / PNR generation | ❌ Broken |
| Manual transport option | ✅ Works perfectly |
| Guest travel prefs (group flight selection) | ✅ Works (uses manually entered option) |
| Flight status tracking by ground team | ✅ Works (manual status update regardless of TBO) |

---

## 4. Email Notifications — Not Wired Up ❌

### What it does (intended)
Send guests an email when:
- Their invitation is sent
- They are promoted off the waitlist
- Their booking is confirmed

### Current state
`sendGuestInvitationEmail()` in `server/guest-routes.ts` is a stub:
```typescript
// TODO: integrate email service
console.log(`[Email] Would send invitation to ${guest.email}`);
```
It does nothing. No email is ever sent.

### Impact on demo
- Waitlist promotion happens server-side correctly, but the promoted guest won't get an email
- The in-session **"Room Confirmed! 🎉"** banner (added to GuestDashboard) shows the promotion if they're looking at their portal tab when it happens
- For demo: agent can verbally say "Rahul would get an email in production"

### How to fix for production (10 min)
Install Resend: `npm install resend`

Add `RESEND_API_KEY=re_...` to `.env`

Replace the stub in `guest-routes.ts`:
```typescript
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

// Inside waitlist promotion block:
await resend.emails.send({
  from: 'noreply@yourdomain.com',
  to: nextOnWaitlist.email,
  subject: `Room Confirmed — ${event.name}`,
  html: `<p>Hi ${nextOnWaitlist.name}, a room has opened up and you've been moved off the waitlist!</p>`,
});
```

---

## 5. OCR / ID Verification — Future Implementation 🔮

### Current state
`GuestIDVault.tsx` has a complete UI (camera capture, file upload, name extraction display, match confirmation). The OCR processing step is a simulated 2-second delay — it always returns "verified" with the guest's booking name. No actual document scanning happens.

### What's ready
- Full upload flow (camera / file pick) — functional
- `idVerificationStatus`, `idDocumentUrl`, `idVerifiedName` fields on the guest record — schema ready
- Backend endpoint `/api/guest/:token/id-upload` — functional
- Ground team dashboard reads the `idVerificationStatus` field — functional

### Not demoing
This feature is not included in the demo recording. The ID upload card remains visible in the guest portal but is not part of the demo flow.

### How to wire up for production (integration points)
Replace the `setTimeout` mock in `GuestIDVault.tsx` with a real OCR call:
- **AWS Textract:** `DetectDocumentText` API — extracts text from passport/Aadhaar images
- **Google Document AI:** `batchProcessDocuments` — structured extraction for identity documents
- **Onfido SDK:** Full identity verification with liveness check — recommended for production KYC

---

## 6. Payment Processing — Not Implemented ❌

No payment gateway is integrated. Perk costs (`unitCost`, `clientFacingRate`) are tracked in the DB as numbers, but no actual charge is made.

This is intentional for the hackathon scope. Integration point: Razorpay (`npm install razorpay`) for INR payments.

---

## Summary Table

| Feature | Works? | Notes |
|---------|--------|-------|
| Guest RSVP + family | ✅ | |
| Guest travel prefs + hotel pick | ✅ | Requires `db:push` for hotel selection |
| Guest add-ons + auto-approval | ✅ | |
| Guest itinerary + conflict check | ✅ | |
| Guest ID upload | 🔮 Future | Code ready; OCR not wired |
| Guest waitlist join | ✅ | |
| Waitlist auto-promotion | ✅ | No email; in-session banner only |
| Agent event creation | ✅ | |
| Excel guest import | ✅ | |
| Labels + perks + coverage | ✅ | |
| Client perk checklist | ✅ | |
| EWS inventory alerts | ✅ | |
| Auto Top-Up toggle | ✅ (UI only) | No actual TBO pull yet |
| WhatsApp share | ✅ | |
| Ground team QR check-in | ✅ | |
| Walk-in registration | ✅ | |
| Rooming list export | ✅ | |
| TBO Hotel search | ❌ → Manual | Use Manual Entry in EventSetup |
| TBO Flight search | ❌ → Manual | Use Manual Transport in EventSetup |
| Email notifications | ❌ | Stub only; 10-min fix with Resend |
| Payment processing | ❌ | Out of scope |
| Real OCR / ID verification | 🔮 Future | UI + schema ready; OCR service not wired |
