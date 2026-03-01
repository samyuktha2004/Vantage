-- Add optional capacity column to events
ALTER TABLE events
ADD COLUMN IF NOT EXISTS capacity integer;
