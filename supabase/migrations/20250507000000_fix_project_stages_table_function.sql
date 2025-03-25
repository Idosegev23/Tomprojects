-- migration_name: 20250507000000_fix_project_stages_table_function
-- description: הוספת פונקציית create_project_stages_table החסרה לסנכרון שלבים

-- פונקציה ליצירת טבלת שלבים ייחודית לפרויקט
CREATE OR REPLACE FUNCTION create_project_stages_table(project_id uuid)
RETURNS void AS $$
DECLARE
  table_name text := 'project_' || project_id::text || '_stages';
BEGIN
  -- בדיקה אם הטבלה כבר קיימת
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = table_name
  ) THEN
    RAISE NOTICE 'טבלת השלבים % כבר קיימת', table_name;
    RETURN;
  END IF;
  
  -- יצירת טבלת השלבים הייחודית לפרויקט
  EXECUTE format('
    CREATE TABLE %I (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      title text NOT NULL,
      project_id uuid NOT NULL,
      hierarchical_number text,
      due_date date,
      status text DEFAULT ''pending'',
      progress integer DEFAULT 0,
      color text,
      parent_stage_id uuid,
      dependencies jsonb,
      sort_order integer,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      CONSTRAINT %I FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )',
    table_name,
    table_name || '_project_id_fkey'
  );
  
  -- הענקת הרשאות גישה לטבלה
  EXECUTE format('
    GRANT ALL ON TABLE %I TO postgres, service_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE %I TO authenticated;
    GRANT SELECT ON TABLE %I TO anon;
  ', 
    table_name, table_name, table_name
  );
  
  -- ביטול RLS על הטבלה לאפשר גישה לכולם
  EXECUTE format('
    ALTER TABLE %I DISABLE ROW LEVEL SECURITY;
  ', table_name);
  
  -- יצירת אינדקס על שדה project_id
  EXECUTE format('
    CREATE INDEX %I ON %I (project_id);
  ', 
    table_name || '_project_id_idx',
    table_name
  );
  
  -- יצירת אינדקס על שדה parent_stage_id
  EXECUTE format('
    CREATE INDEX %I ON %I (parent_stage_id);
  ', 
    table_name || '_parent_stage_id_idx',
    table_name
  );
  
  RAISE NOTICE 'טבלת השלבים % נוצרה בהצלחה', table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- הענקת הרשאות לפונקציית יצירת טבלת שלבים
GRANT EXECUTE ON FUNCTION create_project_stages_table(uuid) TO anon, authenticated, service_role;

-- תיקון הטריגר שמפעיל את יצירת טבלת השלבים בעת יצירת פרויקט חדש
CREATE OR REPLACE FUNCTION create_project_stages_table_on_project_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- יוצר את טבלת השלבים לפרויקט החדש
  PERFORM create_project_stages_table(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- הענקת הרשאות לפונקציית הטריגר
GRANT EXECUTE ON FUNCTION create_project_stages_table_on_project_insert() TO anon, authenticated, service_role;

-- וידוא שהטריגר קיים על טבלת הפרויקטים
DROP TRIGGER IF EXISTS create_project_stages_table_trigger ON projects;
CREATE TRIGGER create_project_stages_table_trigger
AFTER INSERT ON projects
FOR EACH ROW
EXECUTE FUNCTION create_project_stages_table_on_project_insert();

-- עדכון קובץ המעקב
DO $$ 
BEGIN
  RAISE NOTICE 'המיגרציה הסתיימה בהצלחה. נוספה פונקציית create_project_stages_table שהיתה חסרה לסנכרון שלבים';
END $$; 