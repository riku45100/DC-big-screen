import { createFileRoute } from "@tanstack/react-router";
import { KanbanBoard } from "@/components/BoardViews";
import { useDashboard } from "@/lib/store";

export const Route = createFileRoute("/kanban")({
  head: () => ({
    meta: [
      { title: "Kanban · FourZero Project Dashboard" },
      { name: "description", content: "Drag tasks between To Do, In Progress, Blocked, Review and Done." },
      { property: "og:title", content: "Kanban · FourZero Project Dashboard" },
      { property: "og:description", content: "Drag tasks between To Do, In Progress, Blocked, Review and Done." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Kanban,
});

function Kanban() {
  const { filteredTasks: tasks, today, setStatus } = useDashboard();
  return <KanbanBoard tasks={tasks} today={today} onStatus={setStatus} />;
}
