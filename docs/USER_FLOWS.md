# User Flows — Vantage

**Last Updated:** February 2026

> This document maps every user type's complete journey through the platform,
> including nuances specific to MICE vs. Wedding contexts, label transparency rules,
> and reporting flows.

---

## Critical Design Rule: Label Invisibility

**Guests must NEVER see or know their label name.**

Labels (VIP, Family, Staff, Executive, etc.) are internal classification tools used by agents and clients to configure entitlements. From the guest's perspective, they simply see what they're entitled to — not _why_ they're entitled to it.

**Example:**

- A VIP guest sees: "Airport Transfer — Included" and "Suite Upgrade — Included"
- A Standard guest sees: "Airport Transfer — Contact Agent to Book" and (no suite option visible)
- Neither guest sees the word "VIP" or "Standard" anywhere

**Implementation note:** Guest-facing UI filters perks and options based on the label assigned to them, but label names, descriptions, and the label system itself are entirely hidden from the guest portal. Even the booking reference does not reveal the tier.

---

## 1. Travel Agent

### 1.1 Event Creation Flow

```
Sign In → Dashboard → Create Event
  ↓
Enter: Event Name, Date, Location, Description, Client Name
  → System generates Event Code (e.g., RAJWED20260415)
  ↓
Step 1 — Client Details
  → Client name, address, phone
  → Guest type flags: Has VIP guests? Has Family? Has Staff?
  ↓
Step 2 — Hotel Setup (TBO-powered)
  Mode A: TBO Live Search
    → Select Country → Select City
    → Set Check-In / Check-Out / Number of Rooms / Nationality
    → [Search] → View hotel results (name, stars, price/night)
    → Select hotel → View room options (room type, meal plan, refund policy)
    → Select room → PreBook (rate hold) → Confirm Booking
    → TBO ConfirmationNumber stored; hotel name auto-populated
  Mode B: Manual Entry (fallback)
    → Enter hotel name, check-in, check-out, number of rooms manually
  ↓
Step 3 — Travel Setup (TBO-powered)
  Mode A: TBO Flight Search
    → Enter Origin, Destination, Date, Journey Type (One-Way / Return)
    → Enter Pax count (Adults / Children / Infants for the group)
    → [Search Flights] → View results (airline, times, duration, stops, price)
    → Select flight → View fare rules (cancellation policy)
    → Confirm → TBO PNR stored; flight details auto-populated
  Mode B: Manual Entry (fallback)
    → Enter travel mode, dates, from/to location manually
  ↓
Event created → Move to EventDetails
```

### 1.2 Guest Management Flow

```
EventDetails → Guests Tab
  ↓
Option A: Bulk Import
  → Download template (Excel/CSV format)
  → Fill guest data: name, email, phone, category, dietary needs
  → Upload file → Preview imported guests → Confirm Import
  → Guests created with auto-generated bookingRef and accessToken
  ↓
Option B: Manual Add
  → Fill form: name, email, phone, category, dietary, special requests
  → Assign arrival/departure dates (pre-set travel dates or custom)
  → Set seat allocation (e.g., guest + 2 companions)
  → Submit → Guest created
  ↓
After import/add:
  → Assign Labels: select VIP / Family / Staff / etc. per guest
  → Guest does NOT see their label assignment
  → Share access link (copy URL or send QR code)
  → Options: share all at once, or individually
```

### 1.3 Labels & Perks Configuration Flow

```
EventDetails → Labels Tab
  ↓
Create Labels: VIP, Family, Staff, Media, Speaker, Standard, etc.
  → Each label defines a guest tier (internal use only)
  ↓
EventDetails → Perks Tab
  ↓
Create Perks: Airport Transfer, Spa Access, Premium Meals, Gala Dinner, etc.
  → Each perk has: name, description, type (transport/meal/activity/accommodation)
  ↓
EventDetails → Label-Perk Matrix
  ↓
For each Label × Perk combination:
  Toggle 1: "Allow this perk for this label?" (Enabled / Disabled)
  Toggle 2: "Is this perk paid by the client?" (Client Pays / Guest Self-Pay)

  IF Enabled + Client Pays:
    → Guest sees perk with "Included" badge and "Confirm" button
  IF Enabled + Guest Self-Pay:
    → Guest sees perk with "Contact Agent to Book" button
    → Agent's contact details shown; guest calls/messages to arrange payment
  IF Disabled:
    → Perk is NOT visible to this label's guests at all
    → If guest requests it anyway → Request Record created → Agent reviews
```

### 1.4 Publishing & Sharing Flow

```
EventDetails → Preview Tab
  → Agent reviews full event summary (hotel, travel, itinerary, perks)
  → Adjustments if needed
  ↓
Publish Event
  → Event becomes visible to: clients (via event code) + guest portal (via token)
  → Microsite URL generated: yourdomain.com/event/RAJWED20260415
  ↓
Share with guests:
  → Copy individual guest link (contains accessToken)
  → Generate QR code per guest
  → Bulk share (download all links as CSV or copy microsite URL for broadcast)
  ↓
Share microsite URL with client for their own distribution
```

### 1.5 Monitoring & Approval Flow

```
EventDetails → Requests Tab (ongoing)
  ↓
Guest requests appear here:
  → Perk requests (out of tier entitlement)
  → Room upgrade requests
  → Custom special requests
  ↓
Agent actions per request:
  → Approve (updates guest entitlement)
  → Reject (with note to guest)
  → Forward to Client (for cost approval before actioning)
  ↓
EventDetails → Inventory Tab
  → Rooms Blocked vs Confirmed (progress bar)
  → Seats Allocated vs Confirmed
  → Alert if <10% remaining
  ↓
Download Report:
  → Excel export (6 sheets: Summary, Guests, Hotel, Labels/Perks, Requests, Extended)
```

### 1.6 Ground Team Account Creation (Agent-only)

```
EventDetails → Settings → Ground Team
  → Create ground team account: name, email, password
  → Scoped to this specific event only
  → Ground team receives sign-in link
```

---

## 2. Client — Wedding Host

**Context:** A family hosting a destination wedding. They are paying for certain guest experiences and want control over what's included.

### 2.1 Sign-in Flow

```
Landing Page → "I'm hosting an event" → Client Sign-in
  → Enter event code (received from travel agent)
  → Access granted to their specific event view
```

### 2.2 Client Event View Flow

```
Dashboard → Their Event
  ↓
Overview Tab:
  → Event name, dates, location, hotel, travel mode
  → Guest count: invited / confirmed / pending / declined
  ↓
Labels & Perks Tab (client-configurable):
  → See the label-perk matrix
  → Toggle which perks are included in the package (client-paid)
  → Client sees costs per perk type; can adjust what they're covering
  → Example: "Remove spa from VIP package" → toggle off expense coverage
  ↓
Guest List Tab (read-only for client, filtered):
  → See confirmed/pending guests
  → Cannot see label names (keeps internal tiers private even from client)
  → Can see: name, RSVP status, dietary restrictions
  ↓
Requests Tab:
  → Forwarded requests appear here for client approval
  → Client can approve or reject with budget rationale
  ↓
Reports Tab:
  → Download guest list (no financial details)
  → View itinerary summary
```

---

## 3. Client — MICE (Corporate Event)

**Context:** A corporate client running a conference or incentive trip. Multiple departments have different entitlements (Executives vs. Staff vs. Speakers).

**Key differences from Wedding:**

- Labels map to job hierarchy (C-Suite, Manager, Staff, External Speaker)
- Expense control is tighter; CFO approval often required for upgrades
- Bulk guest import from HR system (Excel)
- Bleisure extensions are common (employees extending the trip personally)
- Self-manage toggle important (some senior staff prefer own bookings)

### 3.1 MICE-Specific Label Structure Example

| Label            | Perks Included                                                      | Self-Pay Options              |
| ---------------- | ------------------------------------------------------------------- | ----------------------------- |
| C-Suite          | Suite upgrade, Airport Limousine, Spa, Gala Dinner, Business Lounge | None                          |
| Manager          | Standard Room, Airport Transfer, Gala Dinner                        | Spa, Room Upgrade             |
| Staff            | Standard Room, Shuttle Bus                                          | Airport Transfer, Gala Dinner |
| External Speaker | Standard Room, Airport Transfer                                     | Spa, Meals                    |

Guest experience on the portal is silently differentiated — they see only what's relevant to them.

### 3.2 CFO / Finance Approval Flow

```
CFO receives view-only report link from agent
  ↓
Dashboard → Financial Summary:
  → Total rooms blocked × rate = hotel cost
  → Flights booked × fare = travel cost
  → Per-perk inclusions total
  → Outstanding self-pay amounts (not client's responsibility)
  ↓
Downloadable: Cost breakdown Excel / PDF
  → By label tier
  → By individual guest
  → Summary vs itemized view
```

---

## 4. Guest Flow

**Important Design Rules:**

- Guest never logs in — authentication is via unique tokenized URL
- Guest never sees their label name
- Guest sees only the perks relevant to their label (others hidden)
- Travel details are read-only (set by agent; guest cannot modify group bookings)
- Guest can self-manage only if the agent enables the self-manage toggle for them

### 4.1 First Entry — Via Microsite

```
Guest receives microsite URL (e.g., events.vantage.com/event/RAJWED20260415)
  ↓
Microsite:
  → Sees event overview (name, date, location, hotel info, itinerary highlights)
  → Two paths:
    Path A: "I have a booking reference"
      → Enters booking ref (format: GPXXXXXX)
      → System looks up guest → redirects to /guest/:accessToken
    Path B: "Register as a new attendee"
      → Fills: name, email, phone
      → Creates pending guest → agent notified
      → Confirmation: "Your request has been received. You'll get a personalized link shortly."
```

### 4.2 Guest Portal Pages (token-based, no login)

#### Page 1: Dashboard

```
→ Welcome by name
→ Event overview card (dates, location, hotel name)
→ Navigation to all portal sections
→ Completion checklist (RSVP, travel details viewed, itinerary selected, ID uploaded)
```

#### Page 2: RSVP

```
→ See allocated seats (e.g., "Reserved for you + 1")
→ Confirm or decline attendance
→ Add companions: name, relationship, age (for rooming list)
→ Seat count auto-calculates room requirements
→ Dietary restrictions entry
→ Special requests text field
```

#### Page 3: Travel Details (Read-only)

```
→ Arrival: date, time, travel mode (Flight/Train)
→ Departure: date, time
→ Flight details if applicable: airline, flight number, route (read-only)
→ Rooming list: guest name + companions
→ Self-manage toggle (if enabled by agent):
    → "I'd prefer to arrange my own flights/hotel" checkbox
    → If checked, guest is removed from group block and manages independently
→ Bleisure option (if applicable):
    → "Extend your stay?" → Bleisure calendar
```

#### Page 4: Bleisure Extension (Self-Pay)

```
→ Agent-defined host stay dates shown (e.g., April 15–18)
→ Calendar to select pre-arrival extension (e.g., arrive April 13)
→ Calendar to select post-event extension (e.g., depart April 21)
→ Rate shown: live TBO hotel rate (or agent-configured flat rate)
→ Confirmation: "Your extension dates will be forwarded to the hotel"
→ Note: Self-pay; not covered by event package
```

#### Page 5: Concierge (Perks)

```
For each perk visible to this guest's label:
  IF Client Pays:
    → Perk name + description + "Included" badge
    → [Confirm] button
  IF Self-Pay:
    → Perk name + description + "Optional — self-pay"
    → [Contact Agent] button → Shows agent phone/WhatsApp/email

Perks outside this guest's tier: completely hidden (no "locked" or "upgrade" messaging)
No mention of labels, tiers, or "VIP" status anywhere on this page
```

#### Page 6: Itinerary

```
→ Day-by-day timeline of event activities
→ Mandatory events shown with lock icon (cannot opt out)
→ Optional events shown with toggle (register/unregister)
→ Conflict detection: if two selected events overlap, warning shown
→ Capacity display for each optional event (e.g., "12 of 30 spots left")
```

#### Page 7: ID Vault

```
→ Upload passport / national ID photo
→ Status: pending verification / verified / failed
→ Verification note: "Required for hotel check-in and flight boarding"
→ Privacy note: "Your document is stored securely and only accessible to the organizer"
```

#### Page 8: Room Upgrade

```
→ Current room type shown
→ Available upgrades listed (based on hotel availability)
→ [Request Upgrade] → Creates request → Agent reviews
→ Self-pay upgrade note (if not included in tier)
```

---

## 5. Ground Team / Event Coordinator

**Context:** On-site staff at the event venue, managing day-of check-in and logistics.

### 5.1 Sign-in Flow

```
Ground team receives: sign-in URL + credentials (issued by agent)
  → Credentials are scoped to ONE specific event
  ↓
Sign In → Mobile-optimized Check-in Dashboard
```

### 5.2 Check-in Flow

```
Dashboard → Guest Search
  ↓
Method A: Type name or booking ref
  → Guest card appears: name, label icon (visible to staff, NOT shown to guest)
  → Dietary restrictions badge (if any)
  → Special requests note
  → Room number (if hotel check-in already completed)
  ↓
Method B: Scan QR code (from guest's phone)
  → Camera opens → Scans guest's QR → Guest card loads
  ↓
Verify identity → [Mark Arrived] button
  → Status updates to "arrived" in real-time
  → Arrival counter updates on dashboard (e.g., "47 / 120 arrived")
  ↓
Rooming List view:
  → Sorted by room type, then name
  → Download as PDF for physical copy
  ↓
Live stats panel:
  → Total guests / Arrived / Confirmed not yet arrived / Pending (no RSVP)
  → Refresh every 30 seconds
```

### 5.3 Nuances for Ground Team

- Ground team sees guest labels for operational reasons (e.g., VIP needs limousine bay, not shuttle)
- Label names shown as icon/color on staff dashboard, never on guest-facing screens
- Ground team cannot edit guest data, only mark arrived / add notes
- Ground team account expires after the event end date

---

## 6. CFO / Reporting-Only User

**Context:** A finance officer or senior executive who needs cost visibility but not operational access.

### 6.1 Report Access Flow

```
Agent sends a read-only report link to CFO
  ↓
CFO opens link → Sees financial summary:
  → Hotel costs (rooms blocked × rate × nights)
  → Flight costs (seats booked × fare per person)
  → Per-perk inclusion costs
  → Total event cost
  → Outstanding self-pay amounts (tracked separately)
  ↓
Downloadable formats:
  → Excel: itemized by guest and by label tier
  → Summary: total cost by category
```

**Note:** CFO view is read-only. No ability to modify event data, guest data, or approvals.

---

## 7. Key Nuances Across All Flows

### Label Transparency Rules

| Who Can See Label Names | Yes / No                                                              |
| ----------------------- | --------------------------------------------------------------------- |
| Agent                   | ✅ Yes — manages labels                                               |
| Client (Event Host)     | ❌ No — sees guest data but not label names                           |
| Ground Team             | ✅ Yes — operational need (e.g., route VIP to dedicated area)         |
| CFO / Reporting         | ✅ Yes — label names appear in cost breakdown reports                 |
| Guest                   | ❌ Never — labels are entirely invisible from the guest's perspective |

### MICE vs. Wedding Differences

| Aspect        | MICE                                            | Wedding                                         |
| ------------- | ----------------------------------------------- | ----------------------------------------------- |
| Guest labels  | Job title-based (C-Suite, Manager, Staff)       | Relationship-based (Family, Friend, VIP, Staff) |
| Self-manage   | Common (senior staff often prefer own bookings) | Rare                                            |
| Bleisure      | Very common (extend for tourism)                | Rare                                            |
| Group flight  | Often single group flight                       | Mix of individual flights                       |
| Reporting     | CFO-level financial reports required            | Simple guest list sufficient                    |
| Approval flow | Multi-level (client → CFO)                      | Single level (host family)                      |
| Scale         | 50–500 guests typical                           | 20–200 guests typical                           |

### Guest Self-Manage Toggle

When an agent enables self-manage for a guest:

- Guest sees "Manage my own [flights/hotel]" toggle in Travel Details page
- If toggled ON: guest is flagged as self-managing in agent dashboard
- Agent manually removes them from group hotel block / flight manifest
- Guest is still part of the event; just not in the group travel arrangement
- Useful for: guests flying from different cities, guests who want different hotel

### Waitlist Logic

- When all seats/rooms are at capacity, new guests go to waitlist
- Waitlist priority determined by label tier (VIP = highest priority)
- When a confirmed guest declines → system automatically notifies next waitlist guest
- Agent manually confirms waitlist promotion (no auto-booking yet — V1 feature)