-- פונקציה ליצירת טבלה ייחודית לפרויקט
CREATE OR REPLACE FUNCTION create_project_table(table_name text, project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- בדיקה אם הטבלה כבר קיימת
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = $1
  ) THEN
    RAISE NOTICE 'Table % already exists', table_name;
    RETURN;
  END IF;

  -- יצירת טבלה חדשה עם אותו מבנה כמו טבלת tasks
  EXECUTE format('
    CREATE TABLE public.%I (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
      stage_id uuid REFERENCES public.stages(id) ON DELETE SET NULL,
      title text NOT NULL,
      description text,
      category text,
      status text DEFAULT ''todo''::text,
      priority text DEFAULT ''medium''::text,
      responsible uuid,
      estimated_hours numeric,
      actual_hours numeric,
      start_date date,
      due_date date,
      completed_date date,
      budget numeric,
      dependencies text[],
      assignees text[],
      watchers text[],
      labels text[],
      deleted boolean DEFAULT false,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      hierarchical_number text,
      parent_task_id uuid,
      is_template boolean DEFAULT false,
      original_task_id uuid,
      CONSTRAINT %I_project_id_fkey FOREIGN KEY (project_id) 
        REFERENCES public.projects(id) ON DELETE CASCADE
    )', table_name, table_name);

  -- הגדרת הרשאות
  EXECUTE format('
    ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "%I_select_policy"
    ON public.%I
    FOR SELECT
    USING (true);
    
    CREATE POLICY "%I_insert_policy"
    ON public.%I
    FOR INSERT
    WITH CHECK (project_id = %L);
    
    CREATE POLICY "%I_update_policy"
    ON public.%I
    FOR UPDATE
    USING (project_id = %L)
    WITH CHECK (project_id = %L);
    
    CREATE POLICY "%I_delete_policy"
    ON public.%I
    FOR DELETE
    USING (project_id = %L);
  ', 
    table_name, 
    table_name, table_name, 
    table_name, table_name, project_id,
    table_name, table_name, project_id, project_id,
    table_name, table_name, project_id
  );

  -- יצירת אינדקסים
  EXECUTE format('
    CREATE INDEX %I_project_id_idx ON public.%I (project_id);
    CREATE INDEX %I_stage_id_idx ON public.%I (stage_id);
    CREATE INDEX %I_status_idx ON public.%I (status);
    CREATE INDEX %I_priority_idx ON public.%I (priority);
    CREATE INDEX %I_hierarchical_number_idx ON public.%I (hierarchical_number);
  ', 
    table_name, table_name,
    table_name, table_name,
    table_name, table_name,
    table_name, table_name,
    table_name, table_name
  );

  RAISE NOTICE 'Table % created successfully', table_name;
END;
$$;

-- פונקציה לבדיקה אם טבלה קיימת
CREATE OR REPLACE FUNCTION check_table_exists(table_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  exists_val boolean;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = $1
  ) INTO exists_val;
  
  RETURN exists_val;
END;
$$;

-- פונקציה למחיקת טבלה של פרויקט
CREATE OR REPLACE FUNCTION delete_project_table(project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  table_name text;
BEGIN
  table_name := 'project_tasks_' || replace(project_id::text, '-', '_');
  
  -- בדיקה אם הטבלה קיימת
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND information_schema.tables.table_name = table_name
  ) THEN
    RAISE NOTICE 'Table % does not exist', table_name;
    RETURN;
  END IF;

  -- מחיקת הטבלה
  EXECUTE format('DROP TABLE public.%I', table_name);
  
  RAISE NOTICE 'Table % deleted successfully', table_name;
END;
$$;

-- טריגר למחיקת טבלת פרויקט כאשר הפרויקט נמחק
CREATE OR REPLACE FUNCTION delete_project_table_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM delete_project_table(OLD.id);
  RETURN OLD;
END;
$$;

-- הוספת הטריגר לטבלת projects
DROP TRIGGER IF EXISTS before_delete_project ON public.projects;
CREATE TRIGGER before_delete_project
  BEFORE DELETE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION delete_project_table_trigger(); 