import { createFileRoute, Link } from "@tanstack/react-router";
import { AttentionList } from "@/components/BoardViews";
import { DashboardCharts } from "@/components/DashboardCharts";
import { statuses } from "@/lib/dashboard";
import { useDashboard } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview · FourZero Project Dashboard" },
      { name: "description", content: "Visualize project progress, due dates, staff workload, customers and budgets from imported data." },
      { property: "og:title", content: "Overview · FourZero Project Dashboard" },
      { property: "og:description", content: "Visualize project progress, due dates, staff workload, customers and budgets from imported data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Overview,
});

function Overview() {
  const { filteredTasks: tasks, filteredJobs: jobs, today, imports } = useDashboard();
  const stats = [
    { label: "Projects in view", value: new Set([...jobs.map((j) => j.id), ...tasks.map((t) => t.project)]).size },
    { label: "Tasks in view", value: tasks.length },
    { label: "Overdue tasks", value: tasks.filter((t) => !!t.due && t.due < today && t.progress < 100).length },
    { label: "Blocked cards", value: tasks.filter((t) => t.status === "Blocked").length },
  ];
  return (
    <>
      <p className="text-xs text-muted-foreground">
        {imports.length ? `${imports.length} imported files · Latest: ${imports[0]?.fileName}` : "Sample data · No files imported yet"}
      </p>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="panel p-5">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="mt-3 font-mono text-3xl font-semibold text-primary">{s.value}</p>
          </div>
        ))}
      </section>
      <DashboardCharts />
      <section className="panel p-5">
        <h2 className="text-lg font-semibold">Board distribution</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-5">
          {statuses.map((s) => (
            <Link key={s} to="/kanban" className="status-tile" data-status={s}>
              <p className="text-xs text-muted-foreground">{s}</p>
              <p className="mt-2 font-mono text-2xl">{tasks.filter((t) => t.status === s).length}</p>
            </Link>
          ))}
        </div>
      </section>
      <AttentionList tasks={tasks} today={today} />
    </>
  );
}
