import { describe, expect, it } from "vitest";
import { isOverdue, mergeById, parseDate, parseProgress, parseSheets, type Task } from "./dashboard";

const t = (o: Partial<Task>): Task => ({ id: "1", project: "J", title: "x", assignee: "a", due: "2026-11-01", progress: 0, status: "To Do", source: "", ...o });

describe("dashboard rules", () => {
  it("overdue means due before today and under 100%", () => {
    expect(isOverdue(t({ due: "2026-11-01", progress: 50 }), "2026-11-02")).toBe(true);
    expect(isOverdue(t({ due: "2026-11-01", progress: 100 }), "2026-11-02")).toBe(false);
    expect(isOverdue(t({ due: "2026-11-02" }), "2026-11-02")).toBe(false);
  });
  it("reads DD/MM/YYYY dates", () => expect(parseDate("04/11/2026")).toBe("2026-11-04"));
  it("reads Excel percent cells and text percentages", () => {
    expect(parseProgress(0.55)).toBe(55);
    expect(parseProgress("40%")).toBe(40);
  });
  it("splits sheets into jobs and tasks", () => {
    const r = parseSheets([
      { name: "Jobs", rows: [{ "Job ID": "J1", "Job name": "A", Customer: "C" }] },
      { name: "Tasks", rows: [{ "Task ID": "T1", Job: "J1", Task: "Do it", Assignee: "Sam", "% Complete": 1 }, { Assignee: "x" }] },
    ], "f.xlsx");
    expect(r.jobs).toHaveLength(1);
    expect(r.tasks[0]!).toMatchObject({ id: "T1", project: "J1", status: "Done", progress: 100 });
    expect(r.skipped).toBe(1);
  });
  it("import merge updates matching IDs", () => {
    expect(mergeById([t({ id: "a", title: "old" })], [t({ id: "a", title: "new" })])[0]!.title).toBe("new");
  });
});
