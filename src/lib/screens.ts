import type { ScreenConfig } from "./cloud";

/** "HH:MM" -> minutes after midnight, or null when the value is missing or malformed. */
function toMinutes(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/**
 * Is this screen showing content right now?
 * Off when disabled, or outside its time-of-day window. A window whose start is
 * later than its end (22:00 -> 06:00) runs across midnight.
 */
export function screenIsOnNow(screen: Pick<ScreenConfig, "active" | "fromTime" | "toTime">, now = new Date()): boolean {
  if (!screen.active) return false;
  const from = toMinutes(screen.fromTime);
  const to = toMinutes(screen.toTime);
  if (from === null && to === null) return true;
  const current = now.getHours() * 60 + now.getMinutes();
  if (from === null) return current <= (to as number);
  if (to === null) return current >= from;
  if (from <= to) return current >= from && current <= to;
  return current >= from || current <= to;
}

/** Human label for a screen's schedule, e.g. "08:00 – 17:00" or "Always on". */
export function screenScheduleLabel(screen: Pick<ScreenConfig, "fromTime" | "toTime">): string {
  const from = toMinutes(screen.fromTime) !== null ? screen.fromTime.trim() : "";
  const to = toMinutes(screen.toTime) !== null ? screen.toTime.trim() : "";
  if (!from && !to) return "Always on";
  if (from && !to) return `From ${from}`;
  if (!from && to) return `Until ${to}`;
  return `${from} – ${to}`;
}
