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
/* Board status names shortened so all five fit under a quarter-sized chart. */
const shortStatus: Record<string, string> = { "To Do": "Todo", "In Progress": "Prog", "Blocked": "Blk", "Review": "Rev" };

function Plot({ title, note, empty, compact, children }: { title: string; note: string; empty?: boolean; compact: boolean; children: ReactNode }) {
  return <section className={`min-w-0 border-t border-border ${compact ? "pt-1" : "pt-5"}`} aria-label={title}>
    <h2 className={compact ? "text-sm font-semibold" : "text-lg font-semibold"}>{title}</h2>
    {!compact && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
    {empty ? <p className={`flex items-center text-muted-foreground ${compact ? "h-24 text-xs" : "h-64 text-sm"}`}>No matching data.</p> : children}
  </section>;
}

/**
 * The chart wall. `compact` shrinks every plot so the six of them fit one
 * quarter of the master screen instead of running past the bottom of a TV.
 */
export function DashboardCharts({ compact = false }: { compact?: boolean }) {
  const { filteredTasks: tasks, filteredJobs: jobs, today } = useDashboard();
  const summary = summarizeDashboard(tasks, jobs, today);
  const [selectedCurrency, setSelectedCurrency] = useState("");
  const currency = summary.currencies.includes(selectedCurrency) ? selectedCurrency : summary.currencies[0] ?? "";
  const costs = financialRows(jobs, currency);
  const base = compact ? 120 : 260;
  return <div className={compact ? "grid min-w-0 gap-x-4 gap-y-2 xl:grid-cols-3" : "grid min-w-0 gap-x-8 gap-y-8 xl:grid-cols-2"}>
    <Plot title="Project progress" note="Average task schedule completion · %" empty={!summary.projects.length} compact={compact}>
      <div className={compact ? "max-h-32 overflow-y-auto" : "max-h-96 overflow-y-auto"}>
        <ChartContainer config={config} className="mt-2 w-full aspect-auto" style={{ height: Math.max(base, summary.projects.length * (compact ? 22 : 42)) }}>
          <BarChart accessibilityLayer data={summary.projects} layout="vertical" margin={{ left: 0, right: compact ? 8 : 24 }}>
            <CartesianGrid horizontal={false} /><XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
            <YAxis type="category" dataKey="name" width={compact ? 78 : 86} tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, payload) => payload[0]?.payload.label} />} />
            <Bar dataKey="progress" fill="var(--color-progress)" radius={3} isAnimationActive={false} />
          </BarChart>
        </ChartContainer>
      </div>
      {!compact && summary.projects.some((p) => p.progress === null) && <p className="mt-2 text-xs text-muted-foreground">Jobs without tasks have no progress value.</p>}
    </Plot>
    <Plot title="Board status" note="Task count by current board status" empty={!tasks.length} compact={compact}>
      <ChartContainer config={config} className="mt-2 w-full aspect-auto" style={{ height: compact ? 120 : 256 }}>
        <BarChart accessibilityLayer data={summary.distribution}>
          <CartesianGrid vertical={false} /><XAxis dataKey="name" tickLine={false} interval={0} tick={{ fontSize: compact ? 10 : 12 }} tickFormatter={(s) => compact ? (shortStatus[s] ?? s) : (s === "In Progress" ? "In prog." : s)} /><YAxis allowDecimals={false} width={compact ? 22 : 32} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="count" radius={3} isAnimationActive={false}>{summary.distribution.map((s, i) => <Cell key={s.name} fill={statusColors[i]} />)}</Bar>
        </BarChart>
      </ChartContainer>
    </Plot>
    <Plot title="Schedule due dates" note={`Tasks by due date · ${summary.undated} without a due date`} empty={!summary.dueDates.length} compact={compact}>
      <div className="overflow-x-auto">
        <ChartContainer config={config} className="mt-2 w-full aspect-auto" style={{ height: compact ? 120 : 288, minWidth: Math.max(compact ? 200 : 320, summary.dueDates.length * (compact ? 46 : 85)) }}>
          <BarChart accessibilityLayer data={summary.dueDates}>
            <CartesianGrid vertical={false} /><XAxis dataKey="name" tickLine={false} /><YAxis allowDecimals={false} width={compact ? 22 : 32} />
            <ChartTooltip content={<ChartTooltipContent />} />{!compact && <ChartLegend content={<ChartLegendContent />} />}
            <Bar dataKey="incomplete" stackId="due" fill="var(--color-incomplete)" isAnimationActive={false} />
            <Bar dataKey="complete" stackId="due" fill="var(--color-complete)" isAnimationActive={false} />
          </BarChart>
        </ChartContainer>
      </div>
    </Plot>
    <Plot title="Staff workload" note="Assignments by person · board status" empty={!summary.workload.length} compact={compact}>
      <div className={compact ? "max-h-32 overflow-y-auto" : "max-h-96 overflow-y-auto"}>
        <ChartContainer config={config} className="mt-2 w-full aspect-auto" style={{ height: Math.max(compact ? 120 : 288, summary.workload.length * (compact ? 26 : 48)) }}>
          <BarChart accessibilityLayer data={summary.workload} layout="vertical">
            <CartesianGrid horizontal={false} /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="name" width={compact ? 72 : 100} tickLine={false} axisLine={false} tickFormatter={(v: string) => v.length > 15 ? `${v.slice(0, 14)}…` : v} />
            <ChartTooltip content={<ChartTooltipContent />} />{!compact && <ChartLegend content={<ChartLegendContent />} />}
            <Bar dataKey="active" stackId="staff" fill="var(--color-active)" isAnimationActive={false} /><Bar dataKey="done" stackId="staff" fill="var(--color-done)" isAnimationActive={false} />
          </BarChart>
        </ChartContainer>
      </div>
    </Plot>
    <Plot title="Jobs by customer" note="Job count by customer" empty={!jobs.length} compact={compact}>
      <div className={compact ? "max-h-32 overflow-y-auto" : "max-h-96 overflow-y-auto"}>
        <ChartContainer config={config} className="mt-2 w-full aspect-auto" style={{ height: Math.max(base, summary.customers.length * (compact ? 26 : 48)) }}>
          <BarChart accessibilityLayer data={summary.customers} layout="vertical">
            <CartesianGrid horizontal={false} /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="name" width={compact ? 82 : 110} tickFormatter={(v: string) => v.length > 16 ? `${v.slice(0, 15)}…` : v} />
            <ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="jobs" fill="var(--color-jobs)" radius={3} isAnimationActive={false} />
          </BarChart>
        </ChartContainer>
      </div>
    </Plot>
    <Plot title="Budget vs actual cost" note={currency ? `Amounts in ${currency} · missing values omitted` : "No financial data imported yet"} compact={compact}>
      {summary.currencies.length > 0 ? <>
        {!compact && <label className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">Currency
          <select aria-label="Financial currency" className="field" value={currency} onChange={(e) => setSelectedCurrency(e.target.value)}>{summary.currencies.map((c) => <option key={c}>{c}</option>)}</select>
        </label>}
        <div className="overflow-x-auto">
          <ChartContainer config={config} className="mt-2 w-full aspect-auto" style={{ height: compact ? 120 : 256, minWidth: Math.max(compact ? 200 : 320, costs.length * (compact ? 46 : 90)) }}>
            <BarChart accessibilityLayer data={costs}>
              <CartesianGrid vertical={false} /><XAxis dataKey="name" /><YAxis width={compact ? 54 : 64} tickFormatter={(v: number) => v.toLocaleString()} />
              <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, payload) => payload[0]?.payload.label} />} />{!compact && <ChartLegend content={<ChartLegendContent />} />}
              <Bar dataKey="budget" fill="var(--color-budget)" radius={3} isAnimationActive={false} /><Bar dataKey="actualCost" fill="var(--color-actualCost)" radius={3} isAnimationActive={false} />
            </BarChart>
          </ChartContainer>
        </div>
        {!compact && <p className="mt-3 text-xs text-muted-foreground">{jobs.length - costs.length} jobs outside this currency or without financial values.</p>}
      </> : <div className={`flex items-center border-b border-dashed border-border text-muted-foreground ${compact ? "h-24 text-xs" : "h-64 text-sm"}`}>Budget and actual cost are not available in the current data.</div>}
    </Plot>
  </div>;
}
