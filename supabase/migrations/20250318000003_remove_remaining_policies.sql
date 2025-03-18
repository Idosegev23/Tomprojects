-- הסרת מדיניויות (policies) נותרות

-- הסרת מדיניויות מטבלת projects
DROP POLICY IF EXISTS "Allow all users to read projects" ON public.projects;
DROP POLICY IF EXISTS "projects_policy" ON public.projects;

-- הסרת מדיניויות מטבלת stages
DROP POLICY IF EXISTS "authenticated_access" ON public.stages; 