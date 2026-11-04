import { useState, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from "@/components/ui/chart";
import { useDashboard } from "@/lib/store";
import { financialRows, summarizeDashboard } from "@/lib/visualizations";

const config = {
  progress: { label: "Average schedule progress (%)", color: "var(--primary)" },
  count: { label: "Tasks", color: "var(--primary)" },
  jobs: { label: "Jobs", color: "var(--warning)" },
  active: { label: "Open board tasks", color: "var(--primary)" },
  done: { label: "Done board tasks", color: "var(--success)" },
  incomplete: { label: "Under 100%", color: "var(--warning)" },
  complete: { label: "100% complete", color: "var(--success)" },
  budget: { label: "Budget", color: "var(--primary)" },
  actualCost: { label: "Actual cost", color: "var(--warning)" },
} satisfies ChartConfig;
const statusColors = ["var(--status-todo)", "var(--status-progress)", "var(--status-blocked)", "var(--status-review)", "var(--status-done)"];

function Plot({ title, note, empty, children }: { title: string; note: string; empty?: boolean; children: ReactNode }) {
  return <section className="min-w-0 border-t border-border pt-5" aria-label={title}>
    <h2 className="text-lg font-semibold">{title}</h2>
    <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    {empty ? <p className="flex h-64 items-center text-sm text-muted-foreground">No matching data.</p> : children}
  </section>;
}

export function DashboardCharts() {
  const { filteredTasks: tasks, filteredJobs: jobs, today } = useDashboard();
  const summary = summarizeDashboard(tasks, jobs, today);
  const [selectedCurrency, setSelectedCurrency] = useState("");
  const currency = summary.currencies.includes(selectedCurrency) ? selectedCurrency : summary.currencies[0] ?? "";
  const costs = financialRows(jobs, currency);
  return <div className="grid min-w-0 gap-x-8 gap-y-8 xl:grid-cols-2">
    <Plot title="Project progress" note="Average task schedule completion · %" empty={!summary.projects.length}>
      <div className="max-h-96 overflow-y-auto">
        <ChartContainer config={config} className="mt-4 w-full aspect-auto" style={{ height: Math.max(260, summary.projects.length * 42) }}>
          <BarChart accessibilityLayer data={summary.projects} layout="vertical" margin={{ left: 0, right: 24 }}>
            <CartesianGrid horizontal={false} /><XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
            <YAxis type="category" dataKey="name" width={86} tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, payload) => payload[0]?.payload.label} />} />
            <Bar dataKey="progress" fill="var(--color-progress)" radius={3} isAnimationActive={false} />
          </BarChart>
        </ChartContainer>
      </div>
      {summary.projects.some((p) => p.progress === null) && <p className="mt-2 text-xs text-muted-foreground">Jobs without tasks have no progress value.</p>}
    </Plot>
    <Plot title="Board status" note="Task count by current board status" empty={!tasks.length}>
      <ChartContainer config={config} className="mt-4 h-64 w-full aspect-auto">
        <BarChart accessibilityLayer data={summary.distribution}>
          <CartesianGrid vertical={false} /><XAxis dataKey="name" tickLine={false} interval={0} tickFormatter={(s) => s === "In Progress" ? "In prog." : s} /><YAxis allowDecimals={false} width={32} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="count" radius={3} isAnimationActive={false}>{summary.distribution.map((s, i) => <Cell key={s.name} fill={statusColors[i]} />)}</Bar>
        </BarChart>
      </ChartContainer>
    </Plot>
    <Plot title="Schedule due dates" note={`Tasks by due date · ${summary.undated} without a due date`} empty={!summary.dueDates.length}>
      <div className="overflow-x-auto">
        <ChartContainer config={config} className="mt-4 h-72 w-full min-w-80 aspect-auto" style={{ minWidth: Math.max(320, summary.dueDates.length * 85) }}>
          <BarChart accessibilityLayer data={summary.dueDates}>
            <CartesianGrid vertical={false} /><XAxis dataKey="name" tickLine={false} /><YAxis allowDecimals={false} width={32} />
            <ChartTooltip content={<ChartTooltipContent />} /><ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="incomplete" stackId="due" fill="var(--color-incomplete)" isAnimationActive={false} />
            <Bar dataKey="complete" stackId="due" fill="var(--color-complete)" isAnimationActive={false} />
          </BarChart>
        </ChartContainer>
      </div>
    </Plot>
    <Plot title="Staff workload" note="Assignments by person · board status" empty={!summary.workload.length}>
      <div className="max-h-96 overflow-y-auto">
        <ChartContainer config={config} className="mt-4 w-full aspect-auto" style={{ height: Math.max(288, summary.workload.length * 48) }}>
          <BarChart accessibilityLayer data={summary.workload} layout="vertical">
            <CartesianGrid horizontal={false} /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="name" width={100} tickLine={false} axisLine={false} tickFormatter={(v: string) => v.length > 15 ? `${v.slice(0, 14)}…` : v} />
            <ChartTooltip content={<ChartTooltipContent />} /><ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="active" stackId="staff" fill="var(--color-active)" isAnimationActive={false} /><Bar dataKey="done" stackId="staff" fill="var(--color-done)" isAnimationActive={false} />
          </BarChart>
        </ChartContainer>
      </div>
    </Plot>
    <Plot title="Jobs by customer" note="Job count by customer" empty={!jobs.length}>
      <div className="max-h-96 overflow-y-auto">
        <ChartContainer config={config} className="mt-4 w-full aspect-auto" style={{ height: Math.max(260, summary.customers.length * 48) }}>
          <BarChart accessibilityLayer data={summary.customers} layout="vertical">
            <CartesianGrid horizontal={false} /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="name" width={110} tickFormatter={(v: string) => v.length > 16 ? `${v.slice(0, 15)}…` : v} />
            <ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="jobs" fill="var(--color-jobs)" radius={3} isAnimationActive={false} />
          </BarChart>
        </ChartContainer>
      </div>
    </Plot>
    <Plot title="Budget vs actual cost" note={currency ? `Amounts in ${currency} · missing values omitted` : "No financial data imported yet"}>
      {summary.currencies.length > 0 ? <>
        <label className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">Currency
          <select aria-label="Financial currency" className="field" value={currency} onChange={(e) => setSelectedCurrency(e.target.value)}>{summary.currencies.map((c) => <option key={c}>{c}</option>)}</select>
        </label>
        <div className="overflow-x-auto">
          <ChartContainer config={config} className="mt-4 h-64 w-full aspect-auto" style={{ minWidth: Math.max(320, costs.length * 90) }}>
            <BarChart accessibilityLayer data={costs}>
              <CartesianGrid vertical={false} /><XAxis dataKey="name" /><YAxis width={64} tickFormatter={(v: number) => v.toLocaleString()} />
              <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, payload) => payload[0]?.payload.label} />} /><ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="budget" fill="var(--color-budget)" radius={3} isAnimationActive={false} /><Bar dataKey="actualCost" fill="var(--color-actualCost)" radius={3} isAnimationActive={false} />
            </BarChart>
          </ChartContainer>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{jobs.length - costs.length} jobs outside this currency or without financial values.</p>
      </> : <div className="flex h-64 items-center border-b border-dashed border-border text-sm text-muted-foreground">Budget and actual cost are not available in the current data.</div>}
    </Plot>
  </div>;
}