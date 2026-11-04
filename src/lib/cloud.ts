import { supabase } from "@/integrations/supabase/client";
import { demoJobs, demoTasks, statuses, type ImportRecord, type Job, type Status, type Task } from "./dashboard";

/* ---------- Screen configuration ---------- */

export const screenViews = ["overview", "kanban", "jobs", "staff", "attention"] as const;
export type ScreenView = (typeof screenViews)[number];

export interface ScreenConfig {
  id: string;
  name: string;
  view: ScreenView;
  active: boolean;
  sort: number;
  /** "HH:MM" or "" when the screen has no start time. */
  fromTime: string;
  /** "HH:MM" or "" when the screen has no end time. */
  toTime: string;
}

export const screenPath = (id: string) => `/screen/${id}`;

export function isScreenView(value: string): value is ScreenView {
  return (screenViews as readonly string[]).includes(value);
}

/* ---------- Row mapping (database shape <-> app shape) ---------- */

type JobRow = {
  id: string;
  name: string;
  customer: string;
  source: string;
  budget: number | string | null;
  actual_cost: number | string | null;
  currency: string | null;
};

type TaskRow = {
  id: string;
  project: string;
  title: string;
  assignee: string;
  due: string | null;
  progress: number | null;
  status: string;
  source: string | null;
};

type ImportRow = {
  id: string;
  file_name: string;
  imported_at: string;
  jobs: number | null;
  tasks: number | null;
  skipped: number | null;
  warnings: unknown;
};

type ScreenRow = {
  id: string;
  name: string;
  view: string;
  active: boolean;
  sort: number | null;
  from_time: string | null;
  to_time: string | null;
};

/** Postgres numeric columns arrive as strings, so convert before using them. */
function toNumber(value: number | string | null | undefined): number | undefined {
  if (value == null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function toTime(value: string | null): string {
  if (!value) return "";
  const m = /^(\d{1,2}):(\d{2})/.exec(value.trim());
  if (!m) return "";
  const [, hours = "", minutes = ""] = m;
  return `${hours.padStart(2, "0")}:${minutes}`;
}

export function jobFromRow(row: JobRow): Job {
  const budget = toNumber(row.budget);
  const actualCost = toNumber(row.actual_cost);
  return {
    id: row.id,
    name: row.name,
    customer: row.customer,
    source: row.source,
    ...(budget !== undefined ? { budget } : {}),
    ...(actualCost !== undefined ? { actualCost } : {}),
    currency: row.currency ?? "",
  };
}

export function jobToRow(job: Job) {
  return {
    id: job.id,
    name: job.name,
    customer: job.customer,
    source: job.source,
    budget: job.budget ?? null,
    actual_cost: job.actualCost ?? null,
    currency: job.currency ?? "",
  };
}

export function taskFromRow(row: TaskRow): Task {
  const status = (statuses as readonly string[]).includes(row.status) ? (row.status as Status) : "To Do";
  return {
    id: row.id,
    project: row.project,
    title: row.title,
    assignee: row.assignee,
    due: row.due ?? "",
    progress: Math.max(0, Math.min(100, row.progress ?? 0)),
    status,
    source: row.source ?? "",
  };
}

export function taskToRow(task: Task) {
  return {
    id: task.id,
    project: task.project,
    title: task.title,
    assignee: task.assignee,
    due: task.due,
    progress: task.progress,
    status: task.status,
    source: task.source,
  };
}

export function importFromRow(row: ImportRow): ImportRecord {
  return {
    id: row.id,
    fileName: row.file_name,
    importedAt: row.imported_at,
    jobs: row.jobs ?? 0,
    tasks: row.tasks ?? 0,
    skipped: row.skipped ?? 0,
    warnings: Array.isArray(row.warnings) ? row.warnings.map((w) => String(w)) : [],
  };
}

export function screenFromRow(row: ScreenRow): ScreenConfig {
  return {
    id: row.id,
    name: row.name,
    view: isScreenView(row.view) ? row.view : "overview",
    active: row.active,
    sort: row.sort ?? 0,
    fromTime: toTime(row.from_time),
    toTime: toTime(row.to_time),
  };
}

/* ---------- Reads ---------- */

export interface CloudData {
  jobs: Job[];
  tasks: Task[];
  imports: ImportRecord[];
  screens: ScreenConfig[];
}

export async function fetchCloudData(): Promise<CloudData> {
  const [jobs, tasks, screens, imports] = await Promise.all([
    supabase.from("jobs").select("*").order("id"),
    supabase.from("tasks").select("*").order("id"),
    supabase.from("screens").select("*").order("sort"),
    supabase.from("imports").select("*").order("imported_at", { ascending: false }).limit(50),
  ]);
  if (jobs.error) throw new Error(jobs.error.message);
  if (tasks.error) throw new Error(tasks.error.message);
  if (screens.error) throw new Error(screens.error.message);
  // Import history is signed-in only, so an anonymous screen gets an empty list.
  const importRows: ImportRow[] = imports.error ? [] : ((imports.data ?? []) as ImportRow[]);
  return {
    jobs: ((jobs.data ?? []) as JobRow[]).map(jobFromRow),
    tasks: ((tasks.data ?? []) as TaskRow[]).map(taskFromRow),
    screens: ((screens.data ?? []) as ScreenRow[]).map(screenFromRow),
    imports: importRows.map(importFromRow),
  };
}

/* ---------- Writes (a signed-in editor only) ---------- */

const CHUNK = 500;
const SIGN_IN_REQUIRED = "Sign in to make changes.";

type WriteOutcome = { data: unknown; error: { message: string } | null };

/**
 * A visitor's write is filtered out by the row policies without an error, so
 * every write asks for the rows it changed and complains when none came back.
 */
async function write(
  _table: "jobs" | "tasks" | "screens" | "imports",
  run: () => PromiseLike<WriteOutcome>,
  expected: number,
) {
  const { data, error } = await run();
  if (error) throw new Error(error.message);
  const rows = Array.isArray(data) ? data : data ? [data] : [];
  if (rows.length < expected) throw new Error(SIGN_IN_REQUIRED);
}

async function upsertJobs(jobs: Job[]) {
  for (let i = 0; i < jobs.length; i += CHUNK) {
    const chunk = jobs.slice(i, i + CHUNK).map(jobToRow);
    if (chunk.length === 0) continue;
    await write("jobs", () => supabase.from("jobs").upsert(chunk).select("id"), chunk.length);
  }
}

async function upsertTasks(tasks: Task[]) {
  for (let i = 0; i < tasks.length; i += CHUNK) {
    const chunk = tasks.slice(i, i + CHUNK).map(taskToRow);
    if (chunk.length === 0) continue;
    await write("tasks", () => supabase.from("tasks").upsert(chunk).select("id"), chunk.length);
  }
}

export const saveJobs = upsertJobs;
export const saveTasks = upsertTasks;

export async function clearAll() {
  for (const table of ["tasks", "jobs"] as const) {
    const { error } = await supabase.from(table).delete().not("id", "is", null);
    if (error) throw new Error(error.message);
  }
}

export async function replaceAll(jobs: Job[], tasks: Task[]) {
  await clearAll();
  await saveJobs(jobs);
  await saveTasks(tasks);
}

export async function setTaskStatus(id: string, status: Status) {
  await write("tasks", () => supabase.from("tasks").update({ status }).eq("id", id).select("id"), 1);
}

export async function recordImport(rec: ImportRecord) {
  await write(
    "imports",
    () =>
      supabase
        .from("imports")
        .insert({
          file_name: rec.fileName,
          imported_at: rec.importedAt,
          jobs: rec.jobs,
          tasks: rec.tasks,
          skipped: rec.skipped,
          warnings: rec.warnings,
        })
        .select("id"),
    1,
  );
}

export async function saveScreen(screen: ScreenConfig) {
  await write(
    "screens",
    () =>
      supabase
        .from("screens")
        .update({
          name: screen.name,
          view: screen.view,
          active: screen.active,
          sort: screen.sort,
          from_time: screen.fromTime || null,
          to_time: screen.toTime || null,
        })
        .eq("id", screen.id)
        .select("id"),
    1,
  );
}

export async function restoreSampleData() {
  await clearAll();
  await saveJobs(demoJobs);
  await saveTasks(demoTasks);
}

/** Turn a failed write into something a person can act on. */
export function writeFailure(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message === SIGN_IN_REQUIRED || /row-level security|permission denied|not authorized|JWT/i.test(message)) {
    return SIGN_IN_REQUIRED;
  }
  return message || "The change could not be saved.";
}
