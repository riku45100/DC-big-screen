import { createFileRoute } from "@tanstack/react-router";
import { StaffBoard } from "@/components/BoardViews";
import { useDashboard } from "@/lib/store";

export const Route = createFileRoute("/staff")({
  head: () => ({
    meta: [
      { title: "Staff · FourZero Project Dashboard" },
      { name: "description", content: "Who is assigned to which tasks across every job." },
      { property: "og:title", content: "Staff · FourZero Project Dashboard" },
      { property: "og:description", content: "Who is assigned to which tasks across every job." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Staff,
});

function Staff() {
  const { filteredTasks: tasks, today } = useDashboard();
  return <StaffBoard tasks={tasks} today={today} />;
}
