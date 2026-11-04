import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AttentionList, JobsTable, KanbanBoard, StaffBoard } from "@/components/BoardViews";
import { DashboardCharts } from "@/components/DashboardCharts";
import { screenIsOnNow, screenScheduleLabel } from "@/lib/screens";
import { useDashboard } from "@/lib/store";
import type { ScreenConfig, ScreenView } from "@/lib/cloud";
import type { Job, Task } from "@/lib/dashboard";

export const Route = createFileRoute("/screen/$screenId")({
  head: () => ({
    meta: [
      { title: "TV screen · FourZero Project Dashboard" },
      { name: "description", content: "A full-screen view of project schedules, jobs and staff for a wall display." },
      { property: "og:title", content: "TV screen · FourZero Project Dashboard" },
      { property: "og:description", content: "A full-screen view of project schedules, jobs and staff for a wall display." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ScreenPage,
});

const heading: Record<ScreenView, string> = {
  overview: "Overview",
  kanban: "Kanban board",
  jobs: "Jobs",
  staff: "Staff",
  attention: "Needs attention",
};

function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return <p className="font-mono text-3xl text-foreground">{now ? now.toLocaleTimeString("en-GB") : ""}</p>;
}

function Paused({ screen }: { screen: ScreenConfig }) {
  return (
    <div className="panel grid min-h-[60vh] place-items-center p-10 text-center">
      <div>
        <p className="eyebrow">{screen.name}</p>
        <h2 className="mt-3 text-3xl font-semibold">{screen.active ? "Outside its hours" : "Switched off"}</h2>
        <p className="mt-3 text-muted-foreground">
          {screen.active ? `Shows the ${heading[screen.view].toLowerCase()} ${screenScheduleLabel(screen).toLowerCase()}.` : "Ask someone to switch this screen on."}
        </p>
      </div>
    </div>
  );
}

function ScreenBody({ view, jobs, tasks, today }: { view: ScreenView; jobs: Job[]; tasks: Task[]; today: string }) {
  if (view === "kanban") return <KanbanBoard tasks={tasks} today={today} />;
  if (view === "jobs") return <JobsTable jobs={jobs} tasks={tasks} />;
  if (view === "staff") return <StaffBoard tasks={tasks} today={today} />;
  if (view === "attention") return <AttentionList tasks={tasks} today={today} />;
  return (
    <>
      <DashboardCharts />
      <AttentionList tasks={tasks} today={today} />
    </>
  );
}

function ScreenPage() {
  const { screenId } = Route.useParams();
  const { screens, jobs, tasks, today, loading, error } = useDashboard();
  const screen = screens.find((s) => s.id === screenId);
  const on = screen ? screenIsOnNow(screen) : false;

  // Bigger text everywhere so the display can be read across a room.
  useEffect(() => {
    document.documentElement.classList.add("tv-mode");
    return () => document.documentElement.classList.remove("tv-mode");
  }, []);

  return (
    <div className="min-h-screen bg-background p-6 sm:p-10">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div>
          <p className="eyebrow">FourZero · {screen?.name ?? screenId}</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">{screen ? heading[screen.view] : "Unknown screen"}</h1>
        </div>
        <div className="text-right">
          <Clock />
          <p className="mt-1 text-sm text-muted-foreground">{screen ? screenScheduleLabel(screen) : ""}</p>
        </div>
      </header>

      <main className="mt-6 space-y-6">
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!loading && !screen && (
          <div className="panel grid min-h-[60vh] place-items-center p-10 text-center">
            <div>
              <h2 className="text-2xl font-semibold">This screen isn't set up yet</h2>
              <p className="mt-3 text-muted-foreground">
                "{screenId}" is not one of the screen addresses. Pick one on the Screens page of the dashboard.
              </p>
            </div>
          </div>
        )}
        {screen && !on && <Paused screen={screen} />}
        {screen && on && <ScreenBody view={screen.view} jobs={jobs} tasks={tasks} today={today} />}
      </main>
    </div>
  );
}
