import type React from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { todayISO, type ImportRecord, type Job, type Status, type Task } from "./dashboard";
import {
  fetchCloudData,
  recordImport,
  replaceAll,
  restoreSampleData,
  saveJobs,
  saveScreen,
  saveTasks,
  setTaskStatus,
  writeFailure,
  type CloudData,
  type ScreenConfig,
} from "./cloud";

interface Store {
  tasks: Task[];
  jobs: Job[];
  imports: ImportRecord[];
  screens: ScreenConfig[];
  today: string;
  search: string;
  project: string;
  loading: boolean;
  error: string;
  /** A signed-in user can change data; anyone can view it. */
  canEdit: boolean;
  email: string;
  setSearch: (s: string) => void;
  setProject: (s: string) => void;
  setStatus: (id: string, status: Status) => void;
  applyImport: (rec: ImportRecord, jobs: Job[], tasks: Task[], replace: boolean) => void;
  resetDemo: () => void;
  updateScreen: (id: string, patch: Partial<ScreenConfig>) => void;
  refresh: () => void;
  filteredTasks: Task[];
  filteredJobs: Job[];
}

// Keep one context instance across hot reloads so provider and consumers always match.
const g = globalThis as unknown as { __pdDashboardCtx?: React.Context<Store | null> };
const Ctx = (g.__pdDashboardCtx ??= createContext<Store | null>(null));

/** How often every open page (including TVs) re-reads the central data. */
const REFRESH_MS = 10_000;

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<CloudData>({ jobs: [], tasks: [], imports: [], screens: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [today, setToday] = useState(todayISO());
  const [search, setSearch] = useState("");
  const [project, setProject] = useState("all");
  const [canEdit, setCanEdit] = useState(false);
  const [email, setEmail] = useState("");

  const dataRef = useRef(data);
  dataRef.current = data;

  const load = useCallback(async () => {
    try {
      const next = await fetchCloudData();
      setData(next);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "The data could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Who is signed in? Signed-in people can change data; everyone can view it.
  useEffect(() => {
    let active = true;
    const apply = async (session: { user?: { id?: string; email?: string } } | null) => {
      if (!active) return;
      setEmail(session?.user?.email ?? "");
      const uid = session?.user?.id;
      if (!uid) {
        setCanEdit(false);
        return;
      }
      // Only accounts with the editor role can change data (enforced by the database too).
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", uid).eq("role", "editor");
      if (active) setCanEdit((roles ?? []).length > 0);
      load();
    };
    supabase.auth.getSession().then(({ data: s }) => apply(s.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => apply(session));
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Keep the date current and re-read the central data so TVs follow along.
  useEffect(() => {
    const timer = setInterval(() => {
      setToday(todayISO());
      if (!document.hidden) load();
    }, REFRESH_MS);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  const setStatus = useCallback(
    (id: string, status: Status) => {
      setData((cur) => ({ ...cur, tasks: cur.tasks.map((t) => (t.id === id ? { ...t, status } : t)) }));
      setTaskStatus(id, status).catch((e) => {
        toast.error(writeFailure(e));
        load();
      });
    },
    [load],
  );

  const applyImport = useCallback(
    async (rec: ImportRecord, incomingJobs: Job[], incomingTasks: Task[], replace: boolean) => {
      if (!canEdit) {
        toast.error("Sign in to save imports.");
        return;
      }
      try {
        if (replace) await replaceAll(incomingJobs, incomingTasks);
        else {
          await saveJobs(incomingJobs);
          await saveTasks(incomingTasks);
        }
        await recordImport(rec);
        await load();
        toast.success(`Imported ${rec.jobs} jobs and ${rec.tasks} tasks.`);
      } catch (e) {
        toast.error(writeFailure(e));
      }
    },
    [canEdit, load],
  );

  const resetDemo = useCallback(async () => {
    if (!canEdit) {
      toast.error("Sign in to restore sample data.");
      return;
    }
    try {
      await restoreSampleData();
      await load();
      toast.success("Sample data restored.");
    } catch (e) {
      toast.error(writeFailure(e));
    }
  }, [canEdit, load]);

  const updateScreen = useCallback(
    (id: string, patch: Partial<ScreenConfig>) => {
      if (!canEdit) {
        toast.error("Sign in to change screens.");
        return;
      }
      const current = dataRef.current.screens.find((s) => s.id === id);
      if (!current) return;
      const next = { ...current, ...patch };
      setData((cur) => ({ ...cur, screens: cur.screens.map((s) => (s.id === id ? next : s)) }));
      saveScreen(next).catch((e) => {
        toast.error(writeFailure(e));
        load();
      });
    },
    [canEdit, load],
  );

  const value = useMemo<Store>(() => {
    const q = search.trim().toLowerCase();
    const inProject = (id: string) => project === "all" || project === id;
    return {
      tasks: data.tasks,
      jobs: data.jobs,
      imports: data.imports,
      screens: data.screens,
      today,
      search,
      project,
      loading,
      error,
      canEdit,
      email,
      setSearch,
      setProject,
      setStatus,
      applyImport,
      resetDemo,
      updateScreen,
      refresh: load,
      filteredTasks: data.tasks.filter((t) => inProject(t.project) && `${t.title} ${t.assignee} ${t.id} ${t.project}`.toLowerCase().includes(q)),
      filteredJobs: data.jobs.filter((j) => inProject(j.id) && `${j.id} ${j.name} ${j.customer}`.toLowerCase().includes(q)),
    };
  }, [data, today, search, project, loading, error, canEdit, email, setStatus, applyImport, resetDemo, updateScreen, load]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDashboard() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useDashboard must be used inside DashboardProvider");
  return c;
}
