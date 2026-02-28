# Vantage — VoyageHack 3.0 Submission

## One-line pitch

Vantage is an event-hospitality operating system for MICE and destination events: guest onboarding, travel coordination, approvals, and live capacity tracking in one workflow.

## Problem

Group travel operations are still fragmented across spreadsheets, calls, and manual follow-ups. This causes inventory leakage, delayed confirmations, and poor guest experience.

## Solution

Vantage connects agent operations and guest self-service:

- Agent side: event setup, guest import, label/perk policy, approvals, and reporting.
- Guest side: token-based access link, RSVP and preferences, travel visibility, and request workflow.
- Integration side: TBO hotel and flight proxy routes for live search and booking orchestration.

## What is in the MVP

- Bulk guest import (Excel/CSV) and event-level guest lifecycle management.
- Token-based guest portal (`/guest/:token`) without password friction.
- TBO-backed hotel and flight flow coverage through server-side integrations.
- Capacity alerts and operational dashboards for event control.
- Request approval and downloadable reports for execution teams.

## Judge review path

1. Start the app via [QUICKSTART.md](./QUICKSTART.md).
2. Create an event and import a guest list.
3. Run hotel/flight search from event setup (with TBO credentials).
4. Open guest portal via token link and complete RSVP/request flow.

Technical references:

- Integration setup: [TBO_API_SETUP.md](./TBO_API_SETUP.md)
- API deep reference: [API_INTEGRATION.md](./API_INTEGRATION.md)
- Documentation map: [README.md](./README.md)

## Why this is competitive

- Clear end-to-end operator workflow (plan → assign → confirm → monitor).
- Strong travel context with practical TBO integration boundaries.
- Guest UX optimized for conversion (no account creation, direct action routes).
- Real operational value: reduced manual coordination and better inventory control.

## MVP improvements (Judge + Travel Mentor Assessment)

Top priorities to improve scoring and pilot-readiness:

1. **Rate integrity guardrails (High impact / Medium effort)**
   - Add pre-confirmation reprice checks for hotel/air.
   - Display fare/rate change warnings before final confirmation.

2. **Inventory reliability layer (High / Medium)**
   - Reserve-hold timeout handling with clear expiry UX.
   - Atomic seat/room decrement logic to avoid over-allocation in concurrent actions.

3. **Operational communication baseline (High / Low)**
   - Add essential notifications: RSVP pending, booking confirmed, request approved/declined.
   - Keep channels simple first: email templates + resend action.

4. **Failure transparency for TBO calls (High / Low)**
   - Normalize upstream errors into user-safe messages.
   - Add retry hints and fallback to manual entry where supported.

5. **Commercial visibility for agents (Medium / Medium)**
   - Add per-event margin/cost view (blocked vs confirmed vs expected).
   - Surface self-pay exposure and outstanding approvals.

6. **Compliance hardening for document handling (Medium / Medium)**
   - Enforce upload retention window and secure deletion process.
   - Add explicit consent and access audit trail for ID document actions.

## Submission note

Credentials are intentionally excluded from the repository. Use `.env.example` placeholders and your own test credentials for live verification.

---

Prepared for VoyageHack 3.0 (TBO).
