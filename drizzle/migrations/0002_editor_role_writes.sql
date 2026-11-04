CREATE TYPE public.app_role AS ENUM ('editor');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- The very first account becomes the editor; later accounts must be granted access.
CREATE OR REPLACE FUNCTION public.assign_first_editor()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'editor') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'editor') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created_assign_editor AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.assign_first_editor();

INSERT INTO public.user_roles (user_id, role) SELECT id, 'editor' FROM auth.users ON CONFLICT DO NOTHING;

DROP POLICY "Signed-in users can add jobs" ON public.jobs;
DROP POLICY "Signed-in users can change jobs" ON public.jobs;
DROP POLICY "Signed-in users can remove jobs" ON public.jobs;
CREATE POLICY "Editors can add jobs" ON public.jobs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'editor'));
CREATE POLICY "Editors can change jobs" ON public.jobs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'editor')) WITH CHECK (public.has_role(auth.uid(), 'editor'));
CREATE POLICY "Editors can remove jobs" ON public.jobs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'editor'));

DROP POLICY "Signed-in users can add tasks" ON public.tasks;
DROP POLICY "Signed-in users can change tasks" ON public.tasks;
DROP POLICY "Signed-in users can remove tasks" ON public.tasks;
CREATE POLICY "Editors can add tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'editor'));
CREATE POLICY "Editors can change tasks" ON public.tasks FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'editor')) WITH CHECK (public.has_role(auth.uid(), 'editor'));
CREATE POLICY "Editors can remove tasks" ON public.tasks FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'editor'));

DROP POLICY "Signed-in users can add screens" ON public.screens;
DROP POLICY "Signed-in users can change screens" ON public.screens;
DROP POLICY "Signed-in users can remove screens" ON public.screens;
CREATE POLICY "Editors can add screens" ON public.screens FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'editor'));
CREATE POLICY "Editors can change screens" ON public.screens FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'editor')) WITH CHECK (public.has_role(auth.uid(), 'editor'));
CREATE POLICY "Editors can remove screens" ON public.screens FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'editor'));

DROP POLICY "Signed-in users can record imports" ON public.imports;
DROP POLICY "Signed-in users can view import history" ON public.imports;
CREATE POLICY "Editors can record imports" ON public.imports FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'editor'));
CREATE POLICY "Editors can view import history" ON public.imports FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'editor'));