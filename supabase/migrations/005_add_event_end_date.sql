alter table if exists public.events
  add column if not exists end_date timestamp;
