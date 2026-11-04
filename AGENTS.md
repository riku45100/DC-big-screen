<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project dashboard
- Dashboard data (jobs, tasks, import history, screen settings) lives in Lovable Cloud tables and is read by `src/lib/store.tsx` for every page and TV display; row mappers, reads and writes sit in `src/lib/cloud.ts`.
- Writes need a signed-in editor. Row policies silently drop a visitor's write, so every write asks for the rows it changed and fails loudly when none came back — never trust a bare `error` being null as "saved".
- Spreadsheet parsing rules are pure functions in `src/lib/dashboard.ts` (tested in `dashboard.test.ts`); the `xlsx` library is only dynamically imported in the browser to keep it out of SSR.
- Each dashboard section is its own route; the shared shell (`AppShell`) wraps `<Outlet />` in `__root.tsx`, except `/screen/*` which renders bare for wall displays. Board renderers are shared between the dashboard and the screens in `src/components/BoardViews.tsx` (passing no status handler makes them read-only).
- Visualization aggregations live in a pure tested module; charts consume the shared filtered store, and financial series are separated by currency to avoid misleading totals.
