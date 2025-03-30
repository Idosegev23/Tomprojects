-- מיגרציה להחלפת העמודה assignees בעמודה assignees_info בפונקציית create_project_table
-- תאריך: 30/04/2024

-- יצירת פונקציית create_project_table מחדש עם שדה assignees_info במקום assignees
DROP FUNCTION IF EXISTS create_project_table(uuid);

CREATE OR REPLACE FUNCTION create_project_table(project_id uuid)
RETURNS void AS $$
DECLARE
  table_name text := 'project_' || project_id::text || '_tasks';
  constraint_name text := 'proj_' || replace(project_id::text, '-', '') || '_fkey';
BEGIN
  -- בדיקה אם הטבלה כבר קיימת
  IF NOT check_table_exists(table_name) THEN
    -- יצירת טבלה חדשה עם המבנה המלא הנדרש
    EXECUTE format('
      CREATE TABLE %I (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        title text NOT NULL,
        description text,
        project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        stage_id uuid REFERENCES stages(id) ON DELETE SET NULL,
        parent_task_id uuid,
        hierarchical_number text,
        due_date date,
        status text DEFAULT ''todo'',
        priority text DEFAULT ''medium'',
        category text,
        responsible text,
        dropbox_folder text,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        
        -- שדות נוספים
        estimated_hours numeric,
        actual_hours numeric, 
        start_date date,
        completed_date date,
        budget numeric,
        dependencies text[],
        assignees_info text[], -- שדה משופר שמחליף את assignees
        watchers text[],
        labels text[],
        deleted boolean DEFAULT false,
        is_template boolean DEFAULT false,
        is_global_template boolean DEFAULT false,
        original_task_id uuid
      )', table_name);

    -- הוספת אילוץ חוץ בנפרד (עם שם אילוץ מקוצר ובטוח יותר)
    EXECUTE format('
      ALTER TABLE %I 
      ADD CONSTRAINT %I 
      FOREIGN KEY (project_id) 
      REFERENCES projects(id) 
      ON DELETE CASCADE
    ', table_name, constraint_name);

    -- הענקת הרשאות גישה מלאות לכל התפקידים
    EXECUTE format('
      GRANT ALL PRIVILEGES ON TABLE %I TO anon;
      GRANT ALL PRIVILEGES ON TABLE %I TO authenticated;
      GRANT ALL PRIVILEGES ON TABLE %I TO service_role;
    ', table_name, table_name, table_name);

    -- יצירת אינדקסים
    EXECUTE format('CREATE INDEX %I ON %I (project_id)', table_name || '_project_id_idx', table_name);
    EXECUTE format('CREATE INDEX %I ON %I (stage_id)', table_name || '_stage_id_idx', table_name);
    EXECUTE format('CREATE INDEX %I ON %I (status)', table_name || '_status_idx', table_name);
    EXECUTE format('CREATE INDEX %I ON %I (priority)', table_name || '_priority_idx', table_name);
    EXECUTE format('CREATE INDEX %I ON %I (hierarchical_number)', table_name || '_hierarchical_number_idx', table_name);
  END IF;

  RAISE NOTICE 'Table % created successfully', table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- הענקת הרשאות לפונקציה
GRANT EXECUTE ON FUNCTION create_project_table(uuid) TO anon, authenticated, service_role;

-- מיגרציה לעדכון טבלאות קיימות
-- פונקציה זו תוסיף עמודת assignees_info לטבלאות משימות ספציפיות קיימות אם היא חסרה
CREATE OR REPLACE FUNCTION migrate_task_tables_to_assignees_info()
RETURNS void AS $$
DECLARE
  table_rec record;
  has_assignees_info boolean;
  has_assignees boolean;
  column_exists boolean;
BEGIN
  -- מעבר על כל הטבלאות שמתחילות ב-project_ ומסתיימות ב-_tasks
  FOR table_rec IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_name LIKE 'project_%_tasks' 
    AND table_schema = 'public'
  LOOP
    -- בדיקה אם העמודה assignees_info קיימת
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = table_rec.table_name
      AND column_name = 'assignees_info'
      AND table_schema = 'public'
    ) INTO has_assignees_info;
    
    -- בדיקה אם העמודה assignees קיימת
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = table_rec.table_name
      AND column_name = 'assignees'
      AND table_schema = 'public'
    ) INTO has_assignees;
    
    -- אם העמודה assignees_info לא קיימת, נוסיף אותה
    IF NOT has_assignees_info THEN
      RAISE NOTICE 'הוספת עמודת assignees_info לטבלה %', table_rec.table_name;
      EXECUTE format('ALTER TABLE %I ADD COLUMN assignees_info text[]', table_rec.table_name);
      
      -- אם העמודה assignees קיימת, נעתיק את הערכים שלה לעמודה החדשה
      IF has_assignees THEN
        RAISE NOTICE 'העתקת ערכים מעמודת assignees לעמודת assignees_info בטבלה %', table_rec.table_name;
        EXECUTE format('UPDATE %I SET assignees_info = assignees', table_rec.table_name);
        
        -- לא מוחקים את העמודה הישנה כדי לשמור על תאימות לאחור
        -- אבל אפשר גם להוסיף מחיקה לפי הצורך
        -- EXECUTE format('ALTER TABLE %I DROP COLUMN assignees', table_rec.table_name);
      END IF;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'סיום תהליך המיגרציה של עמודת assignees_info';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- הרצת פונקציית המיגרציה
SELECT migrate_task_tables_to_assignees_info();

-- מחיקת פונקציית המיגרציה (לא חייבים, אך מומלץ לאחר סיום השימוש)
DROP FUNCTION migrate_task_tables_to_assignees_info(); 