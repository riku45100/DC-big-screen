import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDashboard } from "@/lib/store";

const nav = [
  { to: "/", label: "Overview" },
  { to: "/kanban", label: "Kanban" },
  { to: "/jobs", label: "Jobs" },
  { to: "/staff", label: "Staff" },
  { to: "/imports", label: "Imports" },
  { to: "/screens", label: "Screens" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { search, setSearch, project, setProject, jobs, tasks, resetDemo, canEdit, email } = useDashboard();
  const title = nav.find((n) => n.to === path)?.label ?? "Dashboard";
  const projects = [...new Set([...jobs.map((j) => j.id), ...tasks.map((t) => t.project)])].sort();

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-border bg-sidebar p-5 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-3">
          <span aria-hidden className="grid size-10 place-items-center rounded-xl border border-primary/40 bg-primary/10 font-mono font-bold text-primary">FZ</span>
          <div>
            <p className="font-semibold tracking-wide">FourZero</p>
            <p className="text-xs text-muted-foreground">Project workspace</p>
          </div>
        </div>
        <nav aria-label="Main navigation" className="mt-7 flex flex-wrap gap-2 lg:flex-col">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} className="nav-link" activeProps={{ className: "nav-link-active" }} activeOptions={{ exact: true }}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-7 border-t border-border pt-5 text-xs">
          {email ? (
            <div className="space-y-2">
              <p className="truncate text-muted-foreground">{email}</p>
              {!canEdit && <p className="text-warning">View only — ask an editor for access.</p>}
              <button type="button" className="field w-full hover:border-primary" onClick={() => supabase.auth.signOut()}>
                Sign out
              </button>
            </div>
          ) : (
            <Link to="/auth" search={{ next: "/" }} className="btn-primary block text-center">
              Sign in to edit
            </Link>
          )}
        </div>
      </aside>
      <div className="min-w-0">
        <header className="border-b border-border px-5 py-5 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Operations workspace</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h1>
            </div>
            <Link to="/imports" className="btn-primary">Import Excel</Link>
          </div>
        </header>
        <main className="space-y-6 p-5 sm:p-8">
          {path !== "/imports" && (
            <div className="panel flex flex-wrap items-end gap-4 p-4">
              <label className="min-w-0 flex-1 text-xs text-muted-foreground">
                Search tasks, jobs or staff
                <input className="field mt-2 w-full" type="search" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </label>
              <label className="text-xs text-muted-foreground">
                Project
                <select className="field mt-2 block w-full sm:w-48" value={project} onChange={(e) => setProject(e.target.value)}>
                  <option value="all">All projects</option>
                  {projects.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
              <button type="button" className="field hover:border-primary" onClick={() => confirm("Clear all data and restore the sample records?") && resetDemo()}>
                Reset to sample data
              </button>
            </div>
          )}
          {children}
          <footer className="border-t border-border pt-5 text-xs text-muted-foreground">
            FourZero Project Dashboard · Data is stored centrally, so TVs and every open page follow along
          </footer>
        </main>
      </div>
    </div>
  );
}
