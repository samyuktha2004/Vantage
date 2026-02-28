# COPY SUGGESTIONS

## Tone & voice rules

- Use second person (`you`). Keep sentences short and active.
- Be warm and reassuring: use words like "We'll", "You can", "Thanks".
- Avoid jargon: prefer "hold rate" or "reserve now" instead of "prebook".
- Surface next steps whenever we take an action for the user.
- Do not expose raw technical errors to users; log details internally.

## RSVP

- Header: "You're Invited — Join Us"
- Subhead: "We'd love to see you at {event.name} — {date}."
- Primary CTAs:
  - Confirm: "Confirm Attendance — Reserve Your Spot"
  - Decline: "Decline — Notify Host"
- Confirmation messages:
  - On accept: "You're all set! Let's get started with booking your travel arrangements!", "We'll email a confirmation with details and a link to manage your RSVP."
  - On decline: "We're sorry you can't make it — we'll notify the host."
- Microcopy: "Need to change later? You can update your RSVP with this link."


## Booking confirmation (Flight / Hotel)

- Benefit-focused CTAs:
  - Flight: "Book flight"
  - Hotel: "Block rooms"
- Loading / feedback:
  - "Reserving now — we'll email confirmation shortly."
- Post-booking checklist (short bullets shown after success):
  - "What happens next"
    - "Confirmation email sent to you"
    - "Links to manage or change bookings"
    - "Support contact: support@example.com"

## Search validation & toasts

- Replace terse toasts with field-aware guidance.
  - Toast (general): "Please complete the required fields to search."
  - Field-specific inline hints (placed under the empty field):
    - Origin missing: "Where are you flying from? Enter a city or airport code (eg: BOM)."
    - Destination missing: "Where are you flying to? Try a city or airport code (eg: DEL)."
    - Departure date missing: "Please select a departure date."
    - Return date missing for round-trip: "Add a return date for round-trip searches."
- Helpful tooltip: "Round-trip? Add a return date to search for return fares."

## Error messages and technical details

- User-facing generic error: "Something went wrong — we're on it. Please try again in a few moments."
- If retry is helpful: "We couldn't complete the search. Try again or contact support."
- Keep raw `err.message` in logs/telemetry only. Example user toast:
  - Title: "Search failed"
  - Description: "We couldn't complete the search. Please try again in a few moments."

## Placeholders & field hints (start with "eg:")

- Email: "eg: client@example.com"
- Password: "eg: ••••••••"
- Booking reference / lookup: "eg: ABC123"
- Airport / city fields: "eg: BOM (Mumbai)"
- Passport number: "eg: A1234567"
- Phone: "eg: +91 98765 43210"

## Short help snippets for uncommon flows

- Guest lookup: "Find your booking: enter the booking reference from your invitation or confirmation email (eg: ABC123). If you can't find it, contact the agent at: ."

## Microcopy snippets (copy-and-paste)

- CTA: "Block rooms"
- CTA: "Book flight"
- Search toast: "We couldn't complete the search. Please try again in a few moments."
- Field hint (departure): "Please select a departure date"
- Placeholder email: "eg: client@example.com"


## Implementation notes

- Show inline field hints next to the specific empty field in addition to a short toast.
- Replace `err.message` in UI with a friendly message; send the raw error to telemetry.
- Prefix all example placeholders with "eg:" to avoid confusion.