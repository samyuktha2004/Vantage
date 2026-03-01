# Demo Data — Vantage

Two pre-built guest lists for demo video recording.

## Files

| File                       | Event                       | Guests                                     |
| -------------------------- | --------------------------- | ------------------------------------------ |
| `Verma_wedding_guests.csv` | Verma Wedding — Udaipur     | 50 (5 VIP, 15 Family, 30 Friends)          |
| `techsummit_delegates.csv` | TechSummit 2026 — Bengaluru | 70 (10 Executive, 50 Standard, 10 Speaker) |

## How to Use

1. Create the event in Vantage (Dashboard → + New Event)
2. Go to EventDetails → Guests tab
3. Click "Import Guest List" → select the `.csv` file
4. Review the preview → click Confirm Import

## Category → Label Mapping

The `Category` column must match the label names you create:

**Wedding:**

- Create labels: `VIP`, `Family`, `Friends`
- Labels are auto-matched (case-insensitive) on import

**MICE:**

- Create labels: `Executive`, `Standard`, `Speaker`

## EWS Demo Tip

To trigger the EWS Critical alert during demo:

- Wedding: Set hotel to 40 rooms, 38 guests will confirm → 95% → Critical badge
- MICE: Set hotel to 120 rooms, import all 70 → manually boost to ~110 via edit → EWS triggers

## Waitlist Demo Tip

1. Set hotel rooms to a number less than confirmed guests (e.g., 45 rooms, 50 guests)
2. One guest joins waitlist automatically when hotel is full
3. Another guest declines → waitlisted guest is auto-promoted
