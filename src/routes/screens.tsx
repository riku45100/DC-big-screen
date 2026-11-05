import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { quadSlotViews, screenViews, type QuadSlotView, type ScreenConfig, type ScreenView } from "@/lib/cloud";
import { screenScheduleLabel } from "@/lib/screens";
import { useDashboard } from "@/lib/store";

export const Route = createFileRoute("/screens")({
  head: () => ({
    meta: [
      { title: "Screens · FourZero Project Dashboard" },
      { name: "description", content: "Give each TV its own address, choose what it shows and when." },
      { property: "og:title", content: "Screens · FourZero Project Dashboard" },
      { property: "og:description", content: "Give each TV its own address, choose what it shows and when." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screens,
});

const viewLabels: Record<ScreenView, string> = {
  overview: "Overview",
  kanban: "Kanban board",
  jobs: "Jobs",
  staff: "Staff",
  attention: "Needs attention",
  quad: "Four views (2×2)",
};

const quadSlotLabels = ["Top left", "Top right", "Bottom left", "Bottom right"];

function addressOf(id: string) {
  return `${window.location.origin}/screen/${id}`;
}

function ScreenRow({ screen }: { screen: ScreenConfig }) {
  const { updateScreen, canEdit } = useDashboard();
  const [name, setName] = useState(screen.name);

  async function copy() {
    try {
      await navigator.clipboard.writeText(addressOf(screen.id));
      toast.success("Screen address copied.");
    } catch {
      toast.error("Copy failed — the address is shown next to the screen.");
    }
  }

  return (
    <div className="grid gap-4 border-t border-border p-5 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto] lg:items-end">
      <div className="min-w-0">
        <label className="block text-xs text-muted-foreground">
          Screen name
          <input
            className="field mt-2 w-full"
            value={name}
            disabled={!canEdit}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name.trim() && name !== screen.name && updateScreen(screen.id, { name: name.trim() })}
          />
        </label>
        <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{addressOf(screen.id)}</p>
        {screen.view === "quad" && (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {quadSlotLabels.map((label, i) => (
              <label key={label} className="block text-xs text-muted-foreground">
                {label}
                <select
                  className="field mt-1 w-full"
                  value={screen.quadViews[i] ?? "overview"}
                  disabled={!canEdit}
                  onChange={(e) => {
                    const quadViews = [...screen.quadViews] as QuadSlotView[];
                    quadViews[i] = e.target.value as QuadSlotView;
                    updateScreen(screen.id, { quadViews });
                  }}
                >
                  {quadSlotViews.map((v) => (
                    <option key={v} value={v}>
                      {viewLabels[v]}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        )}
      </div>

      <label className="block text-xs text-muted-foreground">
        Shows
        <select
          className="field mt-2 w-full sm:w-44"
          value={screen.view}
          disabled={!canEdit}
          onChange={(e) => updateScreen(screen.id, { view: e.target.value as ScreenView })}
        >
          {screenViews.map((v) => (
            <option key={v} value={v}>
              {viewLabels[v]}
            </option>
          ))}
        </select>
      </label>

      <div className="text-xs text-muted-foreground">
        <span>On between</span>
        <div className="mt-2 flex items-center gap-2">
          <input
            className="field"
            type="time"
            aria-label={`${screen.name} start time`}
            value={screen.fromTime}
            disabled={!canEdit}
            onChange={(e) => updateScreen(screen.id, { fromTime: e.target.value })}
          />
          <span>and</span>
          <input
            className="field"
            type="time"
            aria-label={`${screen.name} end time`}
            value={screen.toTime}
            disabled={!canEdit}
            onChange={(e) => updateScreen(screen.id, { toTime: e.target.value })}
          />
        </div>
        <p className="mt-1 text-[11px]">{screenScheduleLabel(screen)}</p>
      </div>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={screen.active}
            disabled={!canEdit}
            onChange={(e) => updateScreen(screen.id, { active: e.target.checked })}
          />
          On
        </label>
        <a className="field hover:border-primary" href={addressOf(screen.id)} target="_blank" rel="noreferrer">
          Open
        </a>
        <button type="button" className="field hover:border-primary" onClick={copy}>
          Copy
        </button>
      </div>
    </div>
  );
}

function Screens() {
  const { screens, canEdit } = useDashboard();
  return (
    <>
      <section className="panel p-6">
        <h2 className="text-lg font-semibold">TV screens</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Every screen has its own web address. Open that address on a TV, laptop or phone and it shows the view you
          choose here, re-reading the data every few seconds — so it follows along from anywhere with an internet
          connection.
        </p>
        {!canEdit && (
          <p className="mt-4 text-sm text-warning">
            <a className="underline" href="/auth?next=%2Fscreens">
              Sign in
            </a>{" "}
            to change what a screen shows.
          </p>
        )}
      </section>

      <section className="panel overflow-hidden">
        {screens.map((s) => (
          <ScreenRow key={s.id} screen={s} />
        ))}
        {screens.length === 0 && <p className="p-5 text-sm text-muted-foreground">No screens yet.</p>}
      </section>

      <section className="panel p-6">
        <h2 className="text-lg font-semibold">Putting it on a TV</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
          <li>Plug a cheap streaming stick into the TV, or use the TV's own browser.</li>
          <li>Open the screen's address (the Copy button above).</li>
          <li>For a clean full-screen display, use a kiosk browser such as Fully Kiosk Browser and point it at that address.</li>
          <li>Set the screen's "On between" times if it should only show content during working hours.</li>
        </ol>
      </section>
    </>
  );
}
