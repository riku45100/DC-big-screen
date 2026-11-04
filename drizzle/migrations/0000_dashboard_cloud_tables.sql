-- Project dashboard central storage: jobs, tasks, import history and TV screen assignments.
-- Screens (TVs) read anonymously; changes require a signed-in editor.

create table public.jobs (
  id text primary key,
  name text not null default '',
  customer text not null default '',
  source text not null default '',
  budget numeric(14, 2),
  actual_cost numeric(14, 2),
  currency text not null default ''
);

create table public.tasks (
  id text primary key,
  project text not null default 'Unassigned',
  title text not null default '',
  assignee text not null default 'Unassigned',
  due text not null default '',
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  status text not null default 'To Do',
  source text not null default ''
);

create table public.imports (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  imported_at timestamptz not null default now(),
  jobs integer not null default 0,
  tasks integer not null default 0,
  skipped integer not null default 0,
  warnings jsonb not null default '[]'::jsonb
);

create table public.screens (
  id text primary key,
  name text not null,
  view text not null default 'overview' check (view in ('overview', 'kanban', 'jobs', 'staff', 'attention')),
  active boolean not null default true,
  sort integer not null default 0
);

grant select on public.jobs to anon;
grant select, insert, update, delete on public.jobs to authenticated;
grant all on public.jobs to service_role;

grant select on public.tasks to anon;
grant select, insert, update, delete on public.tasks to authenticated;
grant all on public.tasks to service_role;

grant select on public.screens to anon;
grant select, insert, update, delete on public.screens to authenticated;
grant all on public.screens to service_role;

grant select, insert on public.imports to authenticated;
grant all on public.imports to service_role;

alter table public.jobs enable row level security;
alter table public.tasks enable row level security;
alter table public.screens enable row level security;
alter table public.imports enable row level security;

create policy "Anyone can view jobs" on public.jobs
  for select to anon, authenticated using (true);
create policy "Signed-in users can add jobs" on public.jobs
  for insert to authenticated with check (true);
create policy "Signed-in users can change jobs" on public.jobs
  for update to authenticated using (true) with check (true);
create policy "Signed-in users can remove jobs" on public.jobs
  for delete to authenticated using (true);

create policy "Anyone can view tasks" on public.tasks
  for select to anon, authenticated using (true);
create policy "Signed-in users can add tasks" on public.tasks
  for insert to authenticated with check (true);
create policy "Signed-in users can change tasks" on public.tasks
  for update to authenticated using (true) with check (true);
create policy "Signed-in users can remove tasks" on public.tasks
  for delete to authenticated using (true);

create policy "Anyone can view screens" on public.screens
  for select to anon, authenticated using (true);
create policy "Signed-in users can add screens" on public.screens
  for insert to authenticated with check (true);
create policy "Signed-in users can change screens" on public.screens
  for update to authenticated using (true) with check (true);
create policy "Signed-in users can remove screens" on public.screens
  for delete to authenticated using (true);

create policy "Signed-in users can view import history" on public.imports
  for select to authenticated using (true);
create policy "Signed-in users can record imports" on public.imports
  for insert to authenticated with check (true);

-- Seed records so the dashboard and every screen show data on first load.
insert into public.jobs (id, name, customer, source, budget, actual_cost, currency) values
  ('JOB-001', 'North site installation', 'Sample Customer A', 'Sample data', 42000, 28450, 'EUR'),
  ('JOB-002', 'Workshop upgrade', 'Sample Customer B', 'Sample data', 18500, 19200, 'EUR'),
  ('JOB-003', 'Service programme', 'Sample Customer C', 'Sample data', 9600, 4100, 'EUR');

insert into public.tasks (id, project, title, assignee, due, progress, status, source) values
  ('T-101', 'JOB-001', 'Confirm installation schedule', 'Alex Morgan', '2026-11-04', 0, 'To Do', 'Sample data'),
  ('T-102', 'JOB-001', 'Prepare site drawings', 'Sam Taylor', '2026-11-02', 55, 'In Progress', 'Sample data'),
  ('T-103', 'JOB-002', 'Approve equipment order', 'Jamie Lee', '2026-10-29', 30, 'Blocked', 'Sample data'),
  ('T-104', 'JOB-002', 'Review handover checklist', 'Alex Morgan', '2026-11-01', 100, 'Review', 'Sample data'),
  ('T-105', 'JOB-003', 'Complete initial survey', 'Sam Taylor', '2026-10-28', 100, 'Done', 'Sample data'),
  ('T-106', 'JOB-003', 'Resolve access requirements', 'Jamie Lee', '2026-10-30', 20, 'In Progress', 'Sample data');

insert into public.screens (id, name, view, active, sort) values
  ('screen-1', 'Screen 1', 'overview', true, 1),
  ('screen-2', 'Screen 2', 'kanban', true, 2),
  ('screen-3', 'Screen 3', 'jobs', true, 3),
  ('screen-4', 'Screen 4', 'staff', true, 4),
  ('screen-5', 'Screen 5', 'attention', true, 5),
  ('screen-6', 'Screen 6', 'overview', false, 6),
  ('screen-7', 'Screen 7', 'kanban', false, 7),
  ('screen-8', 'Screen 8', 'jobs', false, 8),
  ('screen-9', 'Screen 9', 'staff', false, 9),
  ('screen-10', 'Screen 10', 'attention', false, 10);