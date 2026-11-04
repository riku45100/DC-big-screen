import { describe, expect, it } from "vitest";
import { screenIsOnNow, screenScheduleLabel } from "./screens";

/** A date on 4 Nov 2026 at the given local "HH:MM". */
const at = (hhmm: string) => new Date(2026, 10, 4, Number(hhmm.slice(0, 2)), Number(hhmm.slice(3)));
const screen = (o: Partial<{ active: boolean; fromTime: string; toTime: string }> = {}) => ({
  active: true,
  fromTime: "",
  toTime: "",
  ...o,
});

describe("screen schedule windows", () => {
  it("shows a screen with no times at any hour", () => {
    expect(screenIsOnNow(screen(), at("03:00"))).toBe(true);
  });

  it("hides a switched-off screen", () => {
    expect(screenIsOnNow(screen({ active: false }), at("12:00"))).toBe(false);
  });

  it("keeps a screen on inside its window and off outside it", () => {
    const s = screen({ fromTime: "08:00", toTime: "17:00" });
    expect(screenIsOnNow(s, at("08:00"))).toBe(true);
    expect(screenIsOnNow(s, at("17:00"))).toBe(true);
    expect(screenIsOnNow(s, at("07:59"))).toBe(false);
    expect(screenIsOnNow(s, at("17:01"))).toBe(false);
  });

  it("handles a window that runs past midnight", () => {
    const s = screen({ fromTime: "22:00", toTime: "06:00" });
    expect(screenIsOnNow(s, at("23:30"))).toBe(true);
    expect(screenIsOnNow(s, at("02:00"))).toBe(true);
    expect(screenIsOnNow(s, at("12:00"))).toBe(false);
  });

  it("ignores malformed times instead of switching the screen off", () => {
    expect(screenIsOnNow(screen({ fromTime: "25:00", toTime: "" }), at("00:00"))).toBe(true);
    expect(screenIsOnNow(screen({ fromTime: "", toTime: "8am" }), at("00:00"))).toBe(true);
  });

  it("labels the schedule for the settings page", () => {
    expect(screenScheduleLabel(screen())).toBe("Always on");
    expect(screenScheduleLabel(screen({ fromTime: "08:00", toTime: "17:00" }))).toBe("08:00 – 17:00");
    expect(screenScheduleLabel(screen({ fromTime: "08:00" }))).toBe("From 08:00");
    expect(screenScheduleLabel(screen({ toTime: "17:00" }))).toBe("Until 17:00");
  });
});
