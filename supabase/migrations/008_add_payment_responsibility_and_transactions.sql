-- 008_add_payment_responsibility_and_transactions.sql
-- Add payment_responsibility columns to booking tables and create payment_transactions
BEGIN;

ALTER TABLE IF EXISTS hotel_bookings
  ADD COLUMN IF NOT EXISTS payment_responsibility text;

ALTER TABLE IF EXISTS travel_options
  ADD COLUMN IF NOT EXISTS payment_responsibility text;

CREATE TABLE IF NOT EXISTS payment_transactions (
  id serial PRIMARY KEY,
  event_id integer NOT NULL REFERENCES events(id),
  booking_type text,
  booking_id integer,
  guest_id integer REFERENCES guests(id),
  payer text NOT NULL,
  amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  transaction_ref text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_transactions_event_idx ON payment_transactions(event_id);

COMMIT;
