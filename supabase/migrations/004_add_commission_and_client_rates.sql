ALTER TABLE hotel_bookings
  ADD COLUMN IF NOT EXISTS base_rate integer,
  ADD COLUMN IF NOT EXISTS commission_type text DEFAULT 'amount',
  ADD COLUMN IF NOT EXISTS commission_value integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS client_facing_rate integer;

ALTER TABLE travel_options
  ADD COLUMN IF NOT EXISTS base_fare integer,
  ADD COLUMN IF NOT EXISTS commission_type text DEFAULT 'amount',
  ADD COLUMN IF NOT EXISTS commission_value integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS client_facing_fare integer;

ALTER TABLE perks
  ADD COLUMN IF NOT EXISTS base_cost integer,
  ADD COLUMN IF NOT EXISTS commission_type text DEFAULT 'amount',
  ADD COLUMN IF NOT EXISTS commission_value integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS client_facing_rate integer;