ALTER TABLE public.screens DROP CONSTRAINT screens_view_check;

ALTER TABLE public.screens ADD CONSTRAINT screens_view_check CHECK (view IN ('overview', 'kanban', 'jobs', 'staff', 'attention', 'quad'));