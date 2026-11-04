export const statuses = ["To Do", "In Progress", "Blocked", "Review", "Done"] as const;
export type Status = (typeof statuses)[number];

export interface Task {
  id: string;
  project: string;
  title: string;
  assignee: string;
  due: string; // YYYY-MM-DD or ""
  progress: number; // 0-100
  status: Status;
  source: string;
}

export interface Job {
  id: string;
  name: string;
  customer: string;
  source: string;
  budget?: number;
  actualCost?: number;
  currency?: string;
}

export interface ImportRecord {
  id: string;
  fileName: string;
  importedAt: string;
  jobs: number;
  tasks: number;
  skipped: number;
  warnings: string[];
}

export const demoTasks: Task[] = [
  { id: "T-101", project: "JOB-001", title: "Confirm installation schedule", assignee: "Alex Morgan", due: "2026-11-04", progress: 0, status: "To Do", source: "Sample data" },
  { id: "T-102", project: "JOB-001", title: "Prepare site drawings", assignee: "Sam Taylor", due: "2026-11-02", progress: 55, status: "In Progress", source: "Sample data" },
  { id: "T-103", project: "JOB-002", title: "Approve equipment order", assignee: "Jamie Lee", due: "2026-10-29", progress: 30, status: "Blocked", source: "Sample data" },
  { id: "T-104", project: "JOB-002", title: "Review handover checklist", assignee: "Alex Morgan", due: "2026-11-01", progress: 100, status: "Review", source: "Sample data" },
  { id: "T-105", project: "JOB-003", title: "Complete initial survey", assignee: "Sam Taylor", due: "2026-10-28", progress: 100, status: "Done", source: "Sample data" },
  { id: "T-106", project: "JOB-003", title: "Resolve access requirements", assignee: "Jamie Lee", due: "2026-10-30", progress: 20, status: "In Progress", source: "Sample data" },
];

export const demoJobs: Job[] = [
  { id: "JOB-001", name: "North site installation", customer: "Sample Customer A", source: "Sample data" },
  { id: "JOB-002", name: "Workshop upgrade", customer: "Sample Customer B", source: "Sample data" },
  { id: "JOB-003", name: "Service programme", customer: "Sample Customer C", source: "Sample data" },
];

export function todayISO(now = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

export function isOverdue(task: Task, today: string) {
  return !!task.due && task.due < today && task.progress < 100;
}

export function formatDate(value: string) {
  if (!value) return "—";
  const [y, m, d] = value.split("-");
  return `${d}/${m}/${y}`;
}

/* ---------- Spreadsheet parsing ---------- */

type Row = Record<string, unknown>;

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

const aliases = {
  taskId: ["taskid", "id", "taskref", "ref", "reference", "uniqueid"],
  title: ["title", "task", "taskname", "name", "description"],
  project: ["project", "job", "jobid", "jobref", "projectid", "jobnumber"],
  assignee: ["assignee", "assignedto", "owner", "staff", "resource", "resourcenames"],
  due: ["due", "duedate", "finish", "finishdate", "end", "enddate", "deadline"],
  progress: ["progress", "complete", "percentcomplete", "pctcomplete", "done"],
  status: ["status", "boardstatus", "state", "stage"],
  jobId: ["jobid", "id", "job", "jobref", "reference", "ref", "jobnumber", "project"],
  jobName: ["jobname", "name", "title", "projectname", "description"],
  customer: ["customer", "client", "customername", "account"],
  budget: ["budget", "projectbudget", "plannedcost", "budgetcost"],
  actualCost: ["actualcost", "actualspend", "spent", "cost"],
  currency: ["currency", "currencycode"],
};

function pick(row: Row, keys: string[]): unknown {
  const map = new Map(Object.keys(row).map((k) => [norm(k), k]));
  for (const k of keys) {
    const real = map.get(k);
    if (real !== undefined && row[real] !== "" && row[real] != null) return row[real];
  }
  return undefined;
}

const str = (v: unknown) => (v == null ? "" : String(v).trim());

export function parseMoney(value: unknown): number | undefined {
  if (value == null || String(value).trim() === "") return undefined;
  const n = typeof value === "number" ? value : Number(String(value).trim().replace(/,/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export function parseDate(v: unknown): string {
  if (v == null || v === "") return "";
  if (v instanceof Date && !isNaN(v.getTime())) return todayISO(v);
  if (typeof v === "number") {
    // Excel serial date
    const d = new Date(Math.round((v - 25569) * 86400000));
    return d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2]?.padStart(2, "0")}-${m[3]?.padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/); // DD/MM/YYYY
  if (m) return `${m[3]}-${m[2]?.padStart(2, "0")}-${m[1]?.padStart(2, "0")}`;
  return "";
}

export function parseProgress(v: unknown): number {
  if (v == null || v === "") return 0;
  let n = typeof v === "number" ? v : parseFloat(String(v).replace("%", ""));
  if (isNaN(n)) return 0;
  if (typeof v === "number" && n > 0 && n <= 1) n = n * 100; // Excel percent cell
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function parseStatus(v: unknown, progress: number): Status {
  const s = norm(str(v));
  const found = statuses.find((st) => norm(st) === s);
  if (found) return found;
  if (s === "todo" || s === "notstarted" || s === "open") return "To Do";
  if (s === "complete" || s === "completed" || s === "closed") return "Done";
  if (s === "onhold") return "Blocked";
  if (progress >= 100) return "Done";
  if (progress > 0) return "In Progress";
  return "To Do";
}

export interface ParsedSheet {
  jobs: Job[];
  tasks: Task[];
  skipped: number;
  warnings: string[];
}

/** Decide per sheet whether it holds tasks or jobs, then convert rows. */
export function parseSheets(sheets: { name: string; rows: Row[] }[], fileName: string): ParsedSheet {
  const out: ParsedSheet = { jobs: [], tasks: [], skipped: 0, warnings: [] };
  for (const { name, rows } of sheets) {
    if (rows.length === 0) continue;
    const headers = new Set(rows.flatMap((r) => Object.keys(r).map(norm)));
    const has = (keys: string[]) => keys.some((k) => headers.has(k));
    const looksLikeTasks = has(aliases.assignee) || has(aliases.due) || has(aliases.progress) || /task/i.test(name);
    const looksLikeJobs = has(aliases.customer) || has(aliases.budget) || has(aliases.actualCost) || /job|project/i.test(name);
    const source = `${fileName} › ${name}`;

    if (looksLikeTasks) {
      rows.forEach((r, i) => {
        const title = str(pick(r, aliases.title));
        if (!title) return void out.skipped++;
        const progress = parseProgress(pick(r, aliases.progress));
        out.tasks.push({
          id: str(pick(r, aliases.taskId)) || `${name}-${i + 2}`,
          project: str(pick(r, aliases.project)) || "Unassigned",
          title,
          assignee: str(pick(r, aliases.assignee)) || "Unassigned",
          due: parseDate(pick(r, aliases.due)),
          progress,
          status: parseStatus(pick(r, aliases.status), progress),
          source,
        });
      });
    } else if (looksLikeJobs) {
      rows.forEach((r) => {
        const id = str(pick(r, aliases.jobId));
        if (!id) return void out.skipped++;
        const budget = parseMoney(pick(r, aliases.budget));
        const actualCost = parseMoney(pick(r, aliases.actualCost));
        const currency = str(pick(r, aliases.currency)).toUpperCase();
        out.jobs.push({ id, name: str(pick(r, aliases.jobName)) || id, customer: str(pick(r, aliases.customer)) || "—", source, ...(budget !== undefined ? { budget } : {}), ...(actualCost !== undefined ? { actualCost } : {}), currency });
        if ((budget !== undefined || actualCost !== undefined) && !currency) out.warnings.push(`Job "${id}" has costs without a currency; shown separately as unspecified.`);
      });
    } else {
      out.warnings.push(`Sheet "${name}" was skipped: no task or job columns recognised.`);
    }
  }
  return out;
}

export function mergeById<T extends { id: string }>(current: T[], incoming: T[]): T[] {
  const map = new Map(current.map((x) => [x.id, x]));
  for (const x of incoming) map.set(x.id, x);
  return [...map.values()];
}

/** Overdue or blocked tasks, soonest due first; tasks without a due date come last. */
export function attentionTasks(tasks: Task[], today: string): Task[] {
  return tasks
    .filter((t) => isOverdue(t, today) || t.status === "Blocked")
    .sort((a, b) => {
      const ad = a.due || "9999-12-31";
      const bd = b.due || "9999-12-31";
      if (ad !== bd) return ad < bd ? -1 : 1;
      return a.title.localeCompare(b.title);
    });
}
