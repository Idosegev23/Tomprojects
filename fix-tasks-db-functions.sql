-- פונקציות SQL לתיקון כפילויות בטבלאות tasks

-- פונקציה שבודקת אם טבלה מסוימת קיימת
CREATE OR REPLACE FUNCTION public.check_table_exists(table_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  table_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name = $1
  ) INTO table_exists;
  
  RETURN table_exists;
END;
$$;

-- פונקציה ליצירת טבלה ספציפית לפרויקט
CREATE OR REPLACE FUNCTION public.create_project_table(project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  table_name text := 'project_' || project_id || '_tasks';
BEGIN
  -- בדיקה אם הטבלה קיימת כבר
  IF (SELECT public.check_table_exists(table_name)) THEN
    RETURN;
  END IF;

  -- יצירת טבלה חדשה עם אותו מבנה כמו טבלת tasks
  EXECUTE format('
    CREATE TABLE public.%I (
      LIKE public.tasks INCLUDING ALL
    );
    
    -- הוספת אילוץ שכל המשימות בטבלה זו שייכות לפרויקט הספציפי
    ALTER TABLE public.%I 
      ADD CONSTRAINT %I CHECK (project_id = %L);
      
    -- תוספת RLS כמו בטבלת המשימות הראשית
    ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;
    
    -- יצירת פוליסות RLS
    CREATE POLICY "משתמשים מאומתים יכולים לראות את המשימות" 
      ON public.%I FOR SELECT 
      USING (auth.role() = ''authenticated'');
      
    CREATE POLICY "משתמשים מאומתים יכולים להוסיף משימות" 
      ON public.%I FOR INSERT 
      WITH CHECK (auth.role() = ''authenticated'');
      
    CREATE POLICY "משתמשים מאומתים יכולים לעדכן משימות" 
      ON public.%I FOR UPDATE 
      USING (auth.role() = ''authenticated'') 
      WITH CHECK (auth.role() = ''authenticated'');
      
    CREATE POLICY "משתמשים מאומתים יכולים למחוק משימות" 
      ON public.%I FOR DELETE 
      USING (auth.role() = ''authenticated'');
    
    -- מתן הרשאות
    GRANT ALL ON public.%I TO authenticated;
    GRANT ALL ON public.%I TO service_role;
    GRANT ALL ON public.%I TO anon;
  ', 
  table_name, -- טבלה
  table_name, format('%s_project_check', table_name), project_id, -- אילוץ
  table_name, -- אבטחה
  table_name, -- פוליסת צפייה
  table_name, -- פוליסת הוספה
  table_name, -- פוליסת עדכון
  table_name, -- פוליסת מחיקה
  table_name, table_name, table_name -- הרשאות
  );
END;
$$;

-- פונקציה לסנכרון משימות מטבלת tasks לטבלה ספציפית של פרויקט
CREATE OR REPLACE FUNCTION public.sync_project_tasks(project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  project_table_name text := 'project_' || project_id || '_tasks';
  task_count int;
  synced_count int;
BEGIN
  -- בדיקה אם הטבלה קיימת
  IF NOT (SELECT public.check_table_exists(project_table_name)) THEN
    -- אם הטבלה לא קיימת, ניצור אותה
    PERFORM public.create_project_table(project_id);
  END IF;
  
  -- בדיקת כמות המשימות בטבלת tasks השייכות לפרויקט זה
  SELECT COUNT(*) INTO task_count
  FROM public.tasks
  WHERE project_id = $1;
  
  -- העתקת משימות שקיימות בטבלת tasks אבל לא קיימות בטבלה הספציפית של הפרויקט
  EXECUTE format('
    INSERT INTO public.%I
    SELECT t.*
    FROM public.tasks t
    LEFT JOIN public.%I pt ON t.id = pt.id
    WHERE t.project_id = %L
    AND pt.id IS NULL
  ', project_table_name, project_table_name, project_id);
  
  -- עדכון משימות שקיימות בשתי הטבלאות (רק אם יש הבדל)
  EXECUTE format('
    UPDATE public.%I pt
    SET 
      title = t.title,
      description = t.description,
      status = t.status,
      due_date = t.due_date,
      priority = t.priority,
      assignee = t.assignee,
      tags = t.tags,
      created_at = t.created_at,
      updated_at = t.updated_at,
      is_global_template = t.is_global_template,
      original_task_id = t.original_task_id,
      position = t.position
    FROM public.tasks t
    WHERE pt.id = t.id
    AND t.project_id = %L
    AND (
      pt.title != t.title OR
      pt.description IS DISTINCT FROM t.description OR
      pt.status != t.status OR
      pt.due_date IS DISTINCT FROM t.due_date OR
      pt.priority IS DISTINCT FROM t.priority OR
      pt.assignee IS DISTINCT FROM t.assignee OR
      pt.tags IS DISTINCT FROM t.tags OR
      pt.created_at != t.created_at OR
      pt.updated_at != t.updated_at OR
      pt.is_global_template IS DISTINCT FROM t.is_global_template OR
      pt.original_task_id IS DISTINCT FROM t.original_task_id OR
      pt.position IS DISTINCT FROM t.position
    )
  ', project_table_name, project_id);
  
  -- ספירת המשימות בטבלה הספציפית אחרי הסנכרון
  EXECUTE format('
    SELECT COUNT(*) FROM public.%I WHERE project_id = %L
  ', project_table_name, project_id) INTO synced_count;
  
  -- רישום לlog (ניתן להוסיף שורה זו לטבלת לוגים ייעודית במידת הצורך)
  RAISE NOTICE 'סונכרנו % משימות לטבלה % (מתוך % משימות בטבלה הראשית)', 
    synced_count, project_table_name, task_count;
END;
$$;

-- פונקציה להעברת משימות לטבלה הספציפית של הפרויקט
CREATE OR REPLACE FUNCTION public.add_tasks_to_project_table(project_id uuid, tasks jsonb[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  project_table_name text := 'project_' || project_id || '_tasks';
  task jsonb;
  inserted_count int := 0;
BEGIN
  -- בדיקה אם הטבלה קיימת
  IF NOT (SELECT public.check_table_exists(project_table_name)) THEN
    -- אם הטבלה לא קיימת, ניצור אותה
    PERFORM public.create_project_table(project_id);
  END IF;
  
  -- מעבר על כל משימה והוספה לטבלה
  FOR i IN 1..array_length(tasks, 1) LOOP
    task := tasks[i];
    
    -- הוספת המשימה לטבלה הספציפית
    BEGIN
      EXECUTE format('
        INSERT INTO public.%I (
          id, title, description, status, due_date, priority, assignee, 
          tags, project_id, created_at, updated_at, is_global_template, 
          original_task_id, position
        ) VALUES (
          %L, %L, %L, %L, %L::timestamptz, %L, %L, 
          %L::jsonb, %L, %L::timestamptz, %L::timestamptz, %L, 
          %L, %L
        )
        ON CONFLICT (id) DO NOTHING
      ',
        project_table_name,
        task->>'id',
        task->>'title',
        COALESCE(task->>'description', NULL),
        task->>'status',
        COALESCE(task->>'due_date', NULL),
        COALESCE(task->>'priority', NULL),
        COALESCE(task->>'assignee', NULL),
        COALESCE(task->>'tags', '[]'),
        project_id,
        COALESCE(task->>'created_at', now()),
        COALESCE(task->>'updated_at', now()),
        COALESCE((task->>'is_global_template')::boolean, false),
        COALESCE(task->>'original_task_id', NULL),
        COALESCE((task->>'position')::int, 0)
      );
      
      inserted_count := inserted_count + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'לא ניתן להוסיף משימה % לטבלה %: %', task->>'id', project_table_name, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'הוספו % משימות לטבלה %', inserted_count, project_table_name;
END;
$$; 