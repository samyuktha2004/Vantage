# Vantage — Demo Recording Script

**Duration:** ~14 min total (10 min Wedding + 4 min MICE)
**Format:** Screen recording, 4 browser tabs open simultaneously
**Roles:** Agent → Client → Guest → Ground Team

---

## Pre-Recording Setup (do before hitting record)

1. Run server: `npm run dev` → confirm http://localhost:5000 loads
2. Apply schema (once only): `npm run db:push`
3. SQL reset: paste `supabase/migrations/002_clear_data.sql` into Supabase SQL Editor → Run
4. Open 4 browser tabs:
   - **Tab 1 (Agent):** `/auth/agent/signin`
   - **Tab 2 (Client):** `/auth/client/signin`
   - **Tab 3 (Guest):** will open specific link during Scene 6
   - **Tab 4 (Ground Team):** `/auth/groundteam/signin`
5. Have on desktop: `demo/Verma_wedding_guests.csv` and `demo/techsummit_delegates.csv`

---

## PART 1 — Verma WEDDING, UDAIPUR (~10 min)

---

### Scene 1 · Agent Creates the Event (~60s)

**[Tab 1 — Agent]**

1. Sign in → Dashboard → click **+ New Event**
2. **Step 1 – Basics.** Fill in:
   - **Event name:** `Verma Wedding — Palace on Wheels, Udaipur`
   - **Date:** `12 April 2026`
   - **Location:** `Taj Lake Palace, Pichola Lake, Udaipur, Rajasthan`
   - **Client name:** `Verma Family`
   - **Invite message:** `Dear {name}, you are cordially invited to celebrate the wedding of Arjun & Sanjana. Join us for a magical celebration at the Lake Palace, Udaipur.`
   - **Schedule:** `10 Apr — Welcome Mehendi · 11 Apr — Sangeet Night · 12 Apr — Wedding Ceremony · 13 Apr — Farewell Brunch`
3. Click **Next** / Save
4. Skip hotel and transport for now — agent will add these after the client sets up labels
5. EventDetails opens → note the **Event Code** displayed (e.g. `Verma2026`)
6. Copy event code → _"I'll share this with the Verma family so they can manage their guest list."_

---

### Scene 2 · Client Sets Up Guest List + Labels (~90s)

**[Tab 2 — Client]**

> _"Mr. Verma logs in and enters the event code to access his dashboard."_

1. Sign in as client → enter event code `Verma2026` → **ClientEventView** opens
2. **Guests tab** → click **Import Guest List** → drag-drop `Verma_wedding_guests.csv`
3. Preview dialog: 5 rows with auto-mapped columns → click **Confirm Import**
   - Toast: "50 guests imported" · VIP / Family / Friends auto-matched from Category column
4. **Labels tab** → labels already created from import
5. Set budgets:
   - **VIP:** `₹8,000` · toggle **Auto-Pilot → ON**
   - **Family:** `₹5,000` · toggle **Auto-Pilot → ON**
   - **Friends:** `₹2,000` · toggle **Auto-Pilot → ON**
6. > _"Client sets the rules once. Auto-Pilot means no phone calls — requests within budget are approved instantly."_

---

### Scene 3 · Agent Adds Hotels + Transport + Perks (~90s)

**[Tab 1 — Agent → EventDetails]**

> _"Back to the agent — now adding accommodation and travel."_

**Hotels:**
1. Add Hotel → **Manual Entry**:
   - Name: `Taj Lake Palace` · Check-in: `10 Apr` · Check-out: `14 Apr`
   - Rooms: `40` · Rate: `₹8,500/night` → Save
2. Add Hotel → **Manual Entry**:
   - Name: `Fateh Prakash Palace` · Check-in: `10 Apr` · Check-out: `14 Apr`
   - Rooms: `15` · Rate: `₹5,500/night` → Save
3. > _"Two hotels — VIPs get Taj Lake Palace, Friends tier gets Fateh Prakash."_

**Transport:**
4. Add Transport → **Manual Entry**:
   - Mode: `Flight` · Carrier: `IndiGo` · Number: `6E-401`
   - From: `Delhi (DEL)` → To: `Udaipur (UDR)` · Date: `10 Apr 2026` → Save

**Perks (Perks tab):**
5. Add perk: `Airport Transfer` · `₹0` · Type: included
6. Add perk: `Palace Suite Upgrade` · `₹6,000` · Type: self-pay
7. Add perk: `Rajasthan Boat Tour` · `₹2,500` · Type: self-pay

---

### Scene 4 · Client Sets Perk Coverage (~30s)

**[Tab 2 — Client → Labels tab]**

1. **VIP** label → perk checklist:
   - ☑ **Airport Transfer** → toggle **Client covered** → badge: "Covered by you ✓"
   - ☑ **Palace Suite Upgrade** → leave as self-pay (₹6,000 shown)
2. **Family** label:
   - ☑ **Airport Transfer** → Client covered ✓
3. > _"Client decides what they cover. Everything else is self-pay — no surprises."_

---

### Scene 5 · Agent Publishes + Sends Invites (~45s)

**[Tab 1 — Agent → Microsite tab]**

1. Theme: **Rose Gold** · Upload/confirm cover image
2. Click **Publish** → microsite live
3. **Guests tab** → find **Ramesh Verma** (VIP) → click **Share Link**
4. GuestLinkManager opens → click **WhatsApp**
   - Browser opens `wa.me/?text=...` with personalised invite pre-filled
5. > _"One click. Personalised invite to WhatsApp. Ramesh gets it on his phone."_

---

### Scene 6 · Guest: Full Journey (~3 min)

**[Tab 3 — open guest portal link, simulate mobile browser]**

> _"Uncle Ramesh receives the WhatsApp. He opens the link on his phone."_

**Smart Check**
1. GuestLookup → enter booking ref
2. Smart Check screen: **Name: Ramesh Verma · Event: Verma Wedding · 12 Apr 2026 · Udaipur**
3. > _"Confirms he's at the right portal before filling anything."_ → click **Yes, that's me → Continue**

**RSVP**
4. Confirm attendance · Seats: `2` · Meal: `Vegetarian`
5. Add family member: Name `Sunita Verma` · Relationship: `Spouse`
6. Click **Confirm RSVP**

**Travel Preferences**
7. **Hotel pick** — 2 options shown:
   - ● **Taj Lake Palace** · 40 rooms · Host covered
   - ○ Fateh Prakash Palace · 15 rooms · Host covered
   - Select **Taj Lake Palace**
8. **Extend stay (Bleisure):**
   - Early arrival: `9 Apr` (₹8,500 · self-pay)
   - Late departure: `15 Apr` (₹8,500 · self-pay)
   - Cost shown: **₹17,000 · Self-pay**
9. **Arrival:** Group flight IndiGo 6E-401 · Delhi → Udaipur · **Host covered · ₹0**

**Booking Summary**
10. Split shown clearly:
    - Host covers: 4 nights (10–14 Apr) + group flight
    - Self-pay: 2 bleisure nights = **₹17,000**
11. > _"Crystal clear. What the host pays, what Ramesh pays."_

**Add-ons**
12. **Airport Transfer** → badge: **Included · Host covered** → one-tap ✓
13. **Palace Suite Upgrade ₹6,000** → click **Request**
    - Within ₹8,000 VIP budget → Auto-Pilot fires → **Approved ✓** toast instantly
    - > _"Auto-Pilot. No agent call. Done."_

**Itinerary**
14. Register: **Mehendi (10 Apr 3pm)** ✓ + **Sangeet (11 Apr 7pm)** ✓
15. Try to add a session clashing with Wedding Ceremony (12 Apr 12pm–4pm)
    - Toast: _"This clashes with Wedding Ceremony (12:00–16:00)"_
    - > _"Conflict-aware scheduling — no double-booking."_

---

### Scene 7 · EWS Alert + Auto Top-Up (~30s)

**[Tab 1 — Agent → Dashboard]**

1. Event card: red **⚠ Critical** badge → click → **Inventory tab**
2. Hotel bar: **38/40 rooms · 95%** · red progress · "Less than 10% remaining"
3. **Auto Top-Up toggle** → enable → badge: **Auto Top-Up: ON**
4. > _"When the block exhausts, Vantage automatically pulls live TBO retail inventory at a preset markup. Zero manual intervention."_

---

### Scene 8 · Waitlist Promotion (~45s)

**[Tab 1 — Agent → Guests tab]**

> _"A VIP guest cancels last minute."_

1. Find confirmed VIP guest → click row → mark RSVP as **Declined**
   - Room freed → server auto-promotes highest-priority waitlisted guest

**[Tab 3 — second guest portal tab, waitlisted Friend's link]**

2. Dashboard auto-refreshes → **"Room Confirmed! 🎉"** celebration banner appears
3. > _"Priority-based auto-promotion. VIP cancels → next guest in queue gets the room instantly."_

---

### Scene 9 · Ground Team — Check-in Day (~60s)

**[Tab 4 — Ground Team]**

> _"It's wedding day. Ananya at the entrance has the check-in dashboard."_

1. Sign in → check-in dashboard
2. Live stats: **42 confirmed · 18 arrived · 24 pending**
3. **QR Scan** → scan guest QR from phone screen → **"Ramesh Verma ✓ Arrived"** green flash
4. **Walk-in** — cousin shows up unregistered:
   - Click **Register Walk-in** → Name: `Kavya Verma` · Phone: `98765-43210` → Save
   - Instant booking ref + QR generated
5. Flight status: IndiGo 6E-401 → mark **Landed** → all on-flight guests updated
6. **Export Rooming List** → Excel downloads
7. > _"Full venue operations in any phone browser. No app download."_

---

## PART 2 — TECHSUMMIT 2026, BENGALURU (~4 min)

> _"Same platform. Completely different use case — 70-delegate corporate conference. Event is already configured — let me show you what changes at MICE scale."_

---

### Cut 1 · Pre-configured event overview (~20s)

**[Tab 1 — Agent → TechSummit 2026 in EventDetails]**

- `TechSummit 2026 — Bengaluru` · 4–5 Mar 2026 · 70 delegates
- Hotel: `Marriott MG Road` · 4–8 Jun · 120 rooms · ₹5,500/night
- Labels: Executive / Standard / Speaker
- > _"Imported 70 delegates, three tiers, hotel ready. Let me show what the client does differently here."_

---

### Cut 2 · Client: MICE-specific perk rules (~30s)

**[Tab 2 — Client → TechSummit → Labels tab]**

1. **Speaker** label → all perks covered → all toggled **Client covered**
2. **Standard** label → perks:
   - ☑ Airport Transfer → self-pay (₹800)
   - ☑ Pre-conf Workshop → self-pay (₹3,500)
   - Budget: `₹2,000` · **Auto-Pilot: ON**
3. > _"Speakers get everything covered. Standard delegates work within a ₹2,000 cap."_

---

### Cut 3 · Budget cap exceeded → manual approval (~45s)

**[Tab 3 — Standard delegate Ravi Kumar's guest portal]**

1. Add-ons → **Pre-conf Workshop ₹3,500** → click **Request**
   - Exceeds ₹2,000 cap → status: _"Forwarded to your host for review"_

**[Tab 2 — Client → Requests tab]**

2. Pre-conf Workshop request from Ravi Kumar → click **Approve**

**[Tab 3 — guest portal reload]**

3. **Approved ✓**
4. > _"Auto-Pilot handles the routine. Human stays in the loop for exceptions."_

---

### Cut 4 · Itinerary conflict (~20s)

**[Tab 3 — Guest → Itinerary]**

1. Register: **Pre-conf Workshop · 9:00–11:00** ✓
2. Try: **Morning Networking · 10:00–11:30** → same window
3. Toast: _"Clashes with Pre-conf Workshop (9:00–11:00)"_
4. > _"Conflict-aware itinerary. No double-booking."_

---

### Cut 5 · EWS at MICE scale (~15s)

**[Tab 1 — Agent → Inventory tab]**

- **115/120 rooms · 96%** · Critical badge · Auto Top-Up: ON
- > _"Same EWS logic. 120 rooms, 96% booked, auto-escalation ready."_

---

### Cut 6 · Ground team mass check-in (~20s)

**[Tab 4 — Ground Team → TechSummit]**

- Live stats: 62/70 confirmed · 30s polling
- **Export Manifest** → Excel
- > _"Rooming list, attendance sheet, sponsor manifest — one click."_

---

## Closing Q&A Cheat Sheet

| Question | Answer |
|---------|--------|
| "Is this Next.js?" | No — Vite + React SPA + Express. Stateful sessions, no serverless limits. |
| "Mobile performance?" | Mobile-first Tailwind. Any phone browser. No app install. |
| "Scale to 5,000 delegates?" | Same code. Swap MemoryStore → connect-pg-simple. Express behind a load balancer. |
| "What's TBO doing here?" | Hotel + flight group block management. EWS triggers Auto Top-Up from live TBO retail inventory. |
| "How does waitlist priority work?" | Label priority (VIP=1, Family=2…). Server sorts by priority, then first-come within tier. |
| "Payments?" | Out of scope for hackathon. Perk costs tracked in DB. Integration point: Razorpay / Stripe. |
| "ID verification?" | Architecture ready — integration point is AWS Textract or Onfido. Shipping post-hackathon. |

---

## Demo Reset

After recording, wipe demo data:

```sql
-- Paste supabase/migrations/002_clear_data.sql into Supabase SQL Editor
```

Or nuke specific events only:

```sql
DELETE FROM events WHERE name ILIKE '%Verma%' OR name ILIKE '%TechSummit%';
```
