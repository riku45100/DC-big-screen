import { useState } from "react";
import { TaskCard } from "@/components/TaskCard";
import { attentionTasks, formatDate, isOverdue, statuses, type Job, type Status, type Task } from "@/lib/dashboard";

/**
 * Shared board renderers. The dashboard pages pass a status handler so cards can
 * be moved; TV screens omit it and the same board becomes read-only.
 */
export function KanbanBoard({
  tasks,
  today,
  onStatus,
}: {
  tasks: Task[];
  today: string;
  onStatus?: (id: string, s: Status) => void;
}) {
  const [over, setOver] = useState<Status | null>(null);
  return (
    <section aria-label="Kanban board">
      {onStatus && (
        <p className="mb-4 text-sm text-muted-foreground">
          Drag cards between columns, or use each card's selector. Board status is separate from schedule progress.
        </p>
      )}
      <div className="overflow-x-auto pb-4">
        <div className="grid min-w-[1400px] grid-cols-5 gap-4">
          {statuses.map((s) => {
            const col = tasks.filter((t) => t.status === s);
            return (
              <section
                key={s}
                aria-label={s}
                data-status={s}
                data-over={over === s || undefined}
                className="kanban-col"
                onDragOver={(e) => {
                  if (!onStatus) return;
                  e.preventDefault();
                  setOver(s);
                }}
                onDragLeave={() => setOver(null)}
                onDrop={(e) => {
                  if (!onStatus) return;
                  e.preventDefault();
                  setOver(null);
                  onStatus(e.dataTransfer.getData("text/plain"), s);
                }}
              >
                <h2 className="mb-4 flex items-center justify-between px-1 text-sm font-semibold">
                  {s}
                  <span className="rounded-md bg-muted px-2 py-1 font-mono text-xs">{col.length}</span>
                </h2>
                <div className="space-y-3">
                  {col.map((t) => (
                    <TaskCard key={t.id} task={t} today={today} onStatus={onStatus} />
                  ))}
                  {col.length === 0 && (
                    <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                      {onStatus ? "Drop tasks here" : "No tasks"}
                    </p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function JobsTable({ jobs, tasks }: { jobs: Job[]; tasks: Task[] }) {
  return (
    <section className="panel overflow-hidden">
      <h2 className="p-5 text-lg font-semibold">Jobs directory</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              {["Reference", "Job", "Customer", "Tasks", "Source"].map((l) => (
                <th key={l} className="whitespace-nowrap px-5 py-3 font-medium">
                  {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id} className="border-t border-border">
                <td className="px-5 py-4 font-mono text-primary">{j.id}</td>
                <td className="px-5 py-4">{j.name}</td>
                <td className="px-5 py-4 text-muted-foreground">{j.customer}</td>
                <td className="px-5 py-4 font-mono">{tasks.filter((t) => t.project === j.id).length}</td>
                <td className="px-5 py-4 text-muted-foreground">{j.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {jobs.length === 0 && <p className="p-5 text-sm text-muted-foreground">No matching jobs.</p>}
    </section>
  );
}

export function StaffBoard({ tasks, today }: { tasks: Task[]; today: string }) {
  const people = [...new Set(tasks.map((t) => t.assignee))]
    .sort()
    .map((name) => ({ name, items: tasks.filter((t) => t.assignee === name) }));
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {people.map((p) => (
        <article key={p.name} className="panel p-5">
          <h2 className="font-semibold">{p.name}</h2>
          <p className="mt-2 text-sm text-primary">
            {p.items.length} assignments
            {p.items.some((t) => isOverdue(t, today)) && (
              <span className="ml-2 badge-danger">{p.items.filter((t) => isOverdue(t, today)).length} overdue</span>
            )}
          </p>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            {p.items.map((t) => (
              <li key={t.id}>
                {t.project} · {t.title} <span className="text-xs">({t.status})</span>
              </li>
            ))}
          </ul>
        </article>
      ))}
      {people.length === 0 && <p className="text-sm text-muted-foreground">No matching staff assignments.</p>}
    </section>
  );
}

export function AttentionList({ tasks, today }: { tasks: Task[]; today: string }) {
  const attention = attentionTasks(tasks, today);
  return (
    <section className="panel p-5">
      <h2 className="text-lg font-semibold">Needs attention</h2>
      <p className="mt-1 text-sm text-muted-foreground">Overdue (due before today, under 100%) or blocked.</p>
      <div className="mt-4 space-y-3">
        {attention.map((t) => (
          <div key={t.id} className="flex flex-wrap justify-between gap-2 rounded-lg border border-border p-3 text-sm">
            <span>
              {t.project} · {t.title} <span className="text-muted-foreground">— {t.assignee}</span>
            </span>
            <span className="text-warning">
              {t.status} · Due {formatDate(t.due)}
            </span>
          </div>
        ))}
        {attention.length === 0 && <p className="text-sm text-muted-foreground">Nothing needs attention.</p>}
      </div>
    </section>
  );
}
