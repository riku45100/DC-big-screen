import { formatDate, isOverdue, statuses, type Status, type Task } from "@/lib/dashboard";

export function TaskCard({
  task,
  today,
  onStatus,
}: {
  task: Task;
  today: string;
  onStatus?: ((id: string, s: Status) => void) | undefined;
}) {
  return (
    <article
      draggable={!!onStatus}
      onDragStart={(e) => e.dataTransfer.setData("text/plain", task.id)}
      className={`rounded-xl border border-border bg-card p-4 ${onStatus ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      <div className="flex items-center justify-between gap-2 font-mono text-xs text-muted-foreground">
        <span>{task.project}</span>
        <span>{task.id}</span>
      </div>
      <h3 className="mt-3 font-medium">{task.title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{task.assignee}</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground">Due {formatDate(task.due)}</span>
        {isOverdue(task, today) && <span className="badge-danger">Overdue</span>}
      </div>
      <label className="mt-4 block text-xs text-muted-foreground">
        Schedule progress: {task.progress}%
        <span className="mt-2 block h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <span className="block h-full bg-primary" style={{ width: `${task.progress}%` }} />
        </span>
      </label>
      {onStatus && (
        <label className="mt-4 block text-xs text-muted-foreground">
          Board status
          <select className="field mt-1 w-full" value={task.status} onChange={(e) => onStatus(task.id, e.target.value as Status)}>
            {statuses.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
      )}
      <p className="mt-3 truncate text-xs text-muted-foreground/70">{task.source}</p>
    </article>
  );
}
