-- 009_add_selected_hotel_booking_id.sql
-- Add nullable selected_hotel_booking_id to guests table
BEGIN;

ALTER TABLE IF EXISTS guests
  ADD COLUMN IF NOT EXISTS selected_hotel_booking_id integer REFERENCES hotel_bookings(id);

COMMIT;
