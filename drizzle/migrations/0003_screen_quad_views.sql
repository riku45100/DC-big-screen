ALTER TABLE public.screens ADD COLUMN quad_views text[] NOT NULL DEFAULT '{overview,kanban,jobs,staff}';

COMMENT ON COLUMN public.screens.quad_views IS 'The four views shown in the 2x2 grid when the screen view is quad, in reading order (top-left, top-right, bottom-left, bottom-right).';