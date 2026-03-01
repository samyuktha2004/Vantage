CREATE TABLE IF NOT EXISTS booking_label_inclusions (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id),
  label_id INTEGER NOT NULL REFERENCES labels(id),
  booking_type TEXT NOT NULL,
  booking_id INTEGER NOT NULL,
  is_included BOOLEAN NOT NULL DEFAULT FALSE,
  inclusions TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS booking_label_unique_idx
  ON booking_label_inclusions (booking_type, booking_id, label_id);
