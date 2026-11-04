import { formatDate, isOverdue, statuses, type Job, type Task } from "./dashboard";

export function summarizeDashboard(tasks: Task[], jobs: Job[], today: string) {
  const projectIds = [...new Set([...jobs.map((j) => j.id), ...tasks.map((t) => t.project)])];
  const projects = projectIds.map((id) => {
    const items = tasks.filter((t) => t.project === id);
    return { name: id, label: jobs.find((j) => j.id === id)?.name ?? id, tasks: items.length, progress: items.length ? Math.round(items.reduce((sum, t) => sum + t.progress, 0) / items.length) : null };
  });
  const workload = [...new Set(tasks.map((t) => t.assignee))].sort().map((name) => {
    const items = tasks.filter((t) => t.assignee === name);
    return { name, active: items.filter((t) => t.status !== "Done").length, done: items.filter((t) => t.status === "Done").length, overdue: items.filter((t) => isOverdue(t, today)).length };
  });
  const dueDates = [...new Set(tasks.filter((t) => t.due).map((t) => t.due))].sort().map((date) => {
    const items = tasks.filter((t) => t.due === date);
    return { date, name: formatDate(date), incomplete: items.filter((t) => t.progress < 100).length, complete: items.filter((t) => t.progress >= 100).length };
  });
  const currencies = [...new Set(jobs.filter((j) => j.budget !== undefined || j.actualCost !== undefined).map((j) => j.currency || "Unspecified"))].sort();
  const customers = [...new Set(jobs.map((j) => j.customer))].map((name) => ({ name, jobs: jobs.filter((j) => j.customer === name).length }));
  return { projects, workload, dueDates, currencies, customers, distribution: statuses.map((name) => ({ name, count: tasks.filter((t) => t.status === name).length })), undated: tasks.filter((t) => !t.due).length };
}

export function financialRows(jobs: Job[], currency: string) {
  return jobs.filter((j) => (j.currency || "Unspecified") === currency && (j.budget !== undefined || j.actualCost !== undefined)).map((j) => ({ name: j.id, label: j.name, budget: j.budget ?? null, actualCost: j.actualCost ?? null }));
}