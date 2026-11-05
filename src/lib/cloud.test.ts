import { describe, expect, it } from "vitest";
import { importFromRow, isScreenView, jobFromRow, screenFromRow, taskFromRow, writeFailure } from "./cloud";

describe("database rows", () => {
  it("turns numeric text columns into numbers and leaves missing costs missing", () => {
    const job = jobFromRow({ id: "J1", name: "N", customer: "C", source: "S", budget: "42000.00", actual_cost: null, currency: "EUR" });
    expect(job.budget).toBe(42000);
    expect("actualCost" in job).toBe(false);
  });

  it("falls back to To Do when a stored status is not on the board", () => {
    const task = taskFromRow({ id: "T", project: "J", title: "x", assignee: "a", due: null, progress: 40, status: "Wibble", source: null });
    expect(task.status).toBe("To Do");
  });

  it("clamps progress into 0-100 and blanks a missing due date", () => {
    const task = taskFromRow({ id: "T", project: "J", title: "x", assignee: "a", due: null, progress: 120, status: "Done", source: null });
    expect(task.progress).toBe(100);
    expect(task.due).toBe("");
    expect(task.source).toBe("");
  });

  it("reads screen views it knows and ignores ones it doesn't", () => {
    const known = screenFromRow({ id: "screen-1", name: "S1", view: "kanban", active: true, sort: 2, from_time: "08:00:00", to_time: null });
    expect(known.view).toBe("kanban");
    expect(known.fromTime).toBe("08:00");
    expect(known.toTime).toBe("");
    const unknown = screenFromRow({ id: "screen-1", name: "S1", view: "pizza", active: true, sort: null, from_time: "08:00:00", to_time: null });
    expect(unknown.view).toBe("overview");
    expect(unknown.sort).toBe(0);
  });

  it("only accepts real screen views", () => {
    expect(isScreenView("attention")).toBe(true);
    expect(isScreenView("quad")).toBe(true);
    expect(isScreenView("pizza")).toBe(false);
  });

  it("fills a quad screen with four valid views, dropping unknowns and quad itself", () => {
    const row = { id: "screen-1", name: "S1", view: "quad", active: true, sort: 1, from_time: null, to_time: null };
    expect(screenFromRow({ ...row, quad_views: ["jobs", "pizza", "quad"] }).quadViews).toEqual(["jobs", "overview", "kanban", "jobs"]);
    expect(screenFromRow({ ...row, quad_views: null }).quadViews).toEqual(["overview", "kanban", "jobs", "staff"]);
    expect(screenFromRow({ ...row, quad_views: ["staff", "attention", "jobs", "kanban"] }).quadViews).toEqual(["staff", "attention", "jobs", "kanban"]);
  });

  it("reads import history rows, treating missing counts as zero", () => {
    const rec = importFromRow({ id: "u", file_name: "f.xlsx", imported_at: "2026-11-04T10:00:00Z", jobs: 2, tasks: 3, skipped: null, warnings: ["a"] });
    expect(rec.fileName).toBe("f.xlsx");
    expect(rec.skipped).toBe(0);
    expect(rec.warnings).toEqual(["a"]);
    expect(importFromRow({ id: "u", file_name: "f.xlsx", imported_at: "x", jobs: 0, tasks: 0, skipped: 0, warnings: null }).warnings).toEqual([]);
  });

  it("asks for a sign-in when a write is refused", () => {
    expect(writeFailure(new Error("new row violates row-level security policy for table tasks"))).toBe("Sign in to make changes.");
    expect(writeFailure(new Error("connection timeout"))).toBe("connection timeout");
  });
});
