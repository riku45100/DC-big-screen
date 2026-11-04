-- Optional time-of-day window per screen: outside the window the screen shows a paused panel.
-- NULL on both columns means the screen is always on.

alter table public.screens
  add column from_time time,
  add column to_time time;