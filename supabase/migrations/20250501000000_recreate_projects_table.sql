-- קובץ ליצירה מחדש של טבלת projects בסופרבייס
-- 20250501000000_recreate_projects_table.sql

-- בדיקה אם טבלת פרויקטים לא קיימת
DO $recreate_projects$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'projects') THEN
    -- יצירת טבלת פרויקטים מחדש
    CREATE TABLE public.projects (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      name text NOT NULL,
      description text,
      owner text, -- עמודת בעלים שחסרה
      entrepreneur_id uuid REFERENCES entrepreneurs(id),
      status text DEFAULT 'planning',
      priority text DEFAULT 'medium',
      department text, -- מחלקה
      responsible uuid, -- אחראי
      total_budget numeric,
      planned_start_date date,
      planned_end_date date,
      actual_start_date date,
      actual_end_date date,
      progress integer DEFAULT 0,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );

    -- יצירת אינדקסים
    CREATE INDEX IF NOT EXISTS projects_entrepreneur_id_idx ON public.projects (entrepreneur_id);
    CREATE INDEX IF NOT EXISTS projects_status_idx ON public.projects (status);
    CREATE INDEX IF NOT EXISTS projects_priority_idx ON public.projects (priority);
    CREATE INDEX IF NOT EXISTS projects_owner_idx ON public.projects (owner);

    -- יצירת פונקציה לעדכון שדה updated_at אם אינה קיימת
    IF NOT EXISTS (SELECT FROM pg_proc WHERE proname = 'set_updated_at') THEN
      CREATE FUNCTION set_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    END IF;

    -- יצירת טריגר לעדכון שדה updated_at בעת עדכון פרויקטים
    DROP TRIGGER IF EXISTS set_projects_updated_at ON public.projects;
    CREATE TRIGGER set_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

    -- הענקת הרשאות גישה מלאות לכל התפקידים
    GRANT ALL PRIVILEGES ON TABLE public.projects TO anon;
    GRANT ALL PRIVILEGES ON TABLE public.projects TO authenticated;
    GRANT ALL PRIVILEGES ON TABLE public.projects TO service_role;
    
    -- ביטול RLS אם קיים
    ALTER TABLE IF EXISTS public.projects DISABLE ROW LEVEL SECURITY;
    
    RAISE NOTICE 'טבלת הפרויקטים נוצרה מחדש בהצלחה';
  ELSE
    -- אם הטבלה כבר קיימת, נבדוק אם חסרה העמודה owner ונוסיף אותה אם צריך
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'owner'
    ) THEN
      ALTER TABLE public.projects ADD COLUMN owner text;
      CREATE INDEX IF NOT EXISTS projects_owner_idx ON public.projects (owner);
      RAISE NOTICE 'העמודה owner נוספה לטבלת projects';
    ELSE
      RAISE NOTICE 'העמודה owner כבר קיימת בטבלה';
    END IF;
    
    RAISE NOTICE 'טבלת הפרויקטים כבר קיימת';
  END IF;
END $recreate_projects$; 