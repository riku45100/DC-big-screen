import { describe, expect, it } from "vitest";
import { parseSheets, type Task } from "./dashboard";
import { financialRows, summarizeDashboard } from "./visualizations";

const tasks: Task[] = [
  { id: "T1", project: "J1", title: "A", assignee: "Sam", due: "2026-11-03", progress: 50, status: "Blocked", source: "test" },
  { id: "T2", project: "J1", title: "B", assignee: "Sam", due: "2026-11-04", progress: 100, status: "Review", source: "test" },
];
describe("dashboard visualization data", () => {
  it("uses schedule progress independently of board status", () => {
    const s = summarizeDashboard(tasks, [], "2026-11-04");
    expect(s.projects[0]?.progress).toBe(75);
    expect(s.workload[0]).toMatchObject({ active: 2, done: 0, overdue: 1 });
    expect(s.dueDates[1]).toMatchObject({ complete: 1, incomplete: 0 });
  });
  it("keeps jobs without tasks visible without claiming zero progress", () => {
    const s = summarizeDashboard([], [{ id: "J2", name: "Empty", customer: "C", source: "test" }], "2026-11-04");
    expect(s.projects[0]).toMatchObject({ name: "J2", progress: null, tasks: 0 });
  });
  it("imports financial values and preserves missing costs instead of inventing zero", () => {
    const parsed = parseSheets([{ name: "Jobs", rows: [{ "Job ID": "J1", Budget: "1,200", "Actual cost": 950, Currency: "eur" }, { "Job ID": "J2", Budget: 0 }] }], "costs.xlsx");
    expect(parsed.jobs[0]).toMatchObject({ budget: 1200, actualCost: 950, currency: "EUR" });
    expect(parsed.jobs[1]?.actualCost).toBeUndefined();
    expect(financialRows(parsed.jobs, "EUR")).toHaveLength(1);
    expect(financialRows(parsed.jobs, "Unspecified")[0]).toMatchObject({ budget: 0, actualCost: null });
  });
});