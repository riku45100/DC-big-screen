import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { parseSheets, type ParsedSheet } from "@/lib/dashboard";
import { useDashboard } from "@/lib/store";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/imports")({
  head: () => ({
    meta: [
      { title: "Imports · FourZero Project Dashboard" },
      { name: "description", content: "Import jobs and tasks from Excel workbooks and review import history." },
      { property: "og:title", content: "Imports · FourZero Project Dashboard" },
      { property: "og:description", content: "Import jobs and tasks from Excel workbooks and review import history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Imports,
});

async function readWorkbook(file: File) {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true });
  return wb.SheetNames.flatMap((name) => {
    const sheet = wb.Sheets[name];
    return sheet ? [{ name, rows: XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" }) }] : [];
  });
}

async function downloadTemplate() {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ "Job ID": "JOB-101", "Job name": "Example job", Customer: "Example customer", Budget: "", "Actual cost": "", Currency: "" }]), "Jobs");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ "Task ID": "T-1", Job: "JOB-101", Task: "Example task", Assignee: "Alex Morgan", "Due date": "15/12/2026", "% Complete": 25, Status: "In Progress" }]), "Tasks");
  XLSX.writeFile(wb, "dashboard-import-template.xlsx");
}

function Imports() {
  const { imports, applyImport } = useDashboard();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<(ParsedSheet & { fileName: string }) | null>(null);
  const [error, setError] = useState("");
  const [replace, setReplace] = useState(false);

  async function onFile(file?: File) {
    setError(""); setPreview(null);
    if (!file) return;
    try {
      const parsed = parseSheets(await readWorkbook(file), file.name);
      if (!parsed.jobs.length && !parsed.tasks.length) setError("No jobs or tasks were recognised. Check the column headings — download the template for an example.");
      else setPreview({ ...parsed, fileName: file.name });
    } catch {
      setError("That file couldn't be read. Please upload an .xlsx, .xls or .csv file.");
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  function confirmImport() {
    if (!preview) return;
    applyImport(
      { id: crypto.randomUUID(), fileName: preview.fileName, importedAt: new Date().toISOString(), jobs: preview.jobs.length, tasks: preview.tasks.length, skipped: preview.skipped, warnings: preview.warnings },
      preview.jobs, preview.tasks, replace,
    );
    setPreview(null);
  }

  return (
    <>
      <section className="grid gap-4 md:grid-cols-2">
        <div className="panel p-6">
          <h2 className="text-lg font-semibold">Excel workbook</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Sheets with columns like <em>Assignee, Due date, % Complete</em> become tasks. Sheets with <em>Job ID, Customer</em> become jobs. Matching IDs are updated.
          </p>
          <label
            className="dropzone mt-5"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files[0]); }}
          >
            <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
            <span className="font-medium">Drop a file or click to choose</span>
            <span className="text-xs text-muted-foreground">.xlsx, .xls or .csv</span>
          </label>
          <p className="mt-3 text-xs text-muted-foreground">Optional job columns: Budget, Actual cost, Currency (e.g. EUR).</p>
          <Button type="button" variant="link" className="mt-3 px-0" onClick={downloadTemplate}>Download template</Button>
          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        </div>
        <div className="panel border-dashed p-6">
          <h2 className="text-lg font-semibold">Microsoft Project · .mpp</h2>
          <p className="mt-2 text-sm text-muted-foreground">Not available yet. Until then, export the schedule from Project as Excel (File › Save As › Excel Workbook) and import it here.</p>
          <h2 className="mt-6 text-lg font-semibold">Other data sources</h2>
          <p className="mt-2 text-sm text-muted-foreground">Excel and CSV exports supported. Direct source connections are not configured.</p>
        </div>
      </section>

      {preview && (
        <section className="panel p-6">
          <h2 className="text-lg font-semibold">Ready to import “{preview.fileName}”</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {preview.jobs.length} jobs · {preview.tasks.length} tasks{preview.skipped ? ` · ${preview.skipped} rows skipped (missing name or ID)` : ""}
          </p>
          {preview.warnings.map((w) => <p key={w} className="mt-1 text-sm text-warning">{w}</p>)}
          {preview.tasks.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-muted-foreground"><tr>{["ID", "Job", "Task", "Assignee", "Due", "%", "Status"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
                <tbody>
                  {preview.tasks.slice(0, 8).map((t) => (
                    <tr key={t.id} className="border-t border-border">
                      <td className="px-3 py-2 font-mono">{t.id}</td><td className="px-3 py-2">{t.project}</td><td className="px-3 py-2">{t.title}</td>
                      <td className="px-3 py-2">{t.assignee}</td><td className="px-3 py-2">{t.due || "—"}</td><td className="px-3 py-2">{t.progress}</td><td className="px-3 py-2">{t.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.tasks.length > 8 && <p className="mt-2 text-xs text-muted-foreground">…and {preview.tasks.length - 8} more</p>}
            </div>
          )}
          <label className="mt-4 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} />
            Replace all existing jobs and tasks (otherwise merge)
          </label>
          <div className="mt-4 flex gap-3">
            <Button type="button" onClick={confirmImport}>Import</Button>
            <Button type="button" variant="outline" onClick={() => setPreview(null)}>Cancel</Button>
          </div>
        </section>
      )}

      <section className="panel p-6">
        <h2 className="text-lg font-semibold">Import history</h2>
        <div className="mt-4 space-y-2">
          {imports.map((i) => (
            <div key={i.id} className="flex flex-wrap justify-between gap-2 rounded-lg border border-border p-3 text-sm">
              <span className="font-medium">{i.fileName}</span>
              <span className="text-muted-foreground">{i.jobs} jobs · {i.tasks} tasks{i.skipped ? ` · ${i.skipped} skipped` : ""} · {new Date(i.importedAt).toLocaleString("en-GB")}</span>
            </div>
          ))}
          {imports.length === 0 && <p className="text-sm text-muted-foreground">No imports yet.</p>}
        </div>
      </section>
    </>
  );
}
