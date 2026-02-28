-- Add schedule text and fallback invite message to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS schedule_text TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS invite_message TEXT;
