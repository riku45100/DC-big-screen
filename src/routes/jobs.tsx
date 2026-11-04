import { createFileRoute } from "@tanstack/react-router";
import { JobsTable } from "@/components/BoardViews";
import { useDashboard } from "@/lib/store";

export const Route = createFileRoute("/jobs")({
  head: () => ({
    meta: [
      { title: "Jobs · FourZero Project Dashboard" },
      { name: "description", content: "Directory of jobs with customers, task counts and data sources." },
      { property: "og:title", content: "Jobs · FourZero Project Dashboard" },
      { property: "og:description", content: "Directory of jobs with customers, task counts and data sources." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Jobs,
});

function Jobs() {
  const { filteredJobs: jobs, tasks } = useDashboard();
  return <JobsTable jobs={jobs} tasks={tasks} />;
}
