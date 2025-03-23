-- ====================================================================
-- פונקציה ליצירת טבלת שלבים ייחודית לפרויקט (stages)
-- ====================================================================

-- פונקציה לבדיקה אם טבלה קיימת (אם אינה קיימת כבר)
CREATE OR REPLACE FUNCTION check_stages_table_exists(table_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name = check_stages_table_exists.table_name
  );
END;
$$ LANGUAGE plpgsql;

-- פונקציה ליצירת טבלת שלבים ספציפית לפרויקט
CREATE OR REPLACE FUNCTION create_project_stages_table(project_id uuid)
RETURNS void AS $$
DECLARE
  table_name text := 'project_' || project_id::text || '_stages';
  constraint_name text := 'proj_' || replace(project_id::text, '-', '') || '_stages_fkey';
BEGIN
  -- בדיקה אם הטבלה כבר קיימת
  IF NOT check_stages_table_exists(table_name) THEN
    -- יצירת טבלה חדשה עם אותו מבנה כמו טבלת stages
    EXECUTE format('
      CREATE TABLE %I (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        title text NOT NULL,
        description text,
        color text,
        status text DEFAULT ''active'',
        progress numeric DEFAULT 0,
        order_num integer,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      )', table_name);

    -- הוספת אילוץ חוץ בנפרד (עם שם אילוץ מקוצר ובטוח יותר)
    EXECUTE format('
      ALTER TABLE %I 
      ADD CONSTRAINT %I 
      FOREIGN KEY (project_id) 
      REFERENCES projects(id) 
      ON DELETE CASCADE
    ', table_name, constraint_name);

    -- הגדרת הרשאות
    EXECUTE format('
      ALTER TABLE %I ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY select_policy
      ON %I
      FOR SELECT
      USING (true);
      
      CREATE POLICY insert_policy
      ON %I
      FOR INSERT
      WITH CHECK (project_id = %L);
      
      CREATE POLICY update_policy
      ON %I
      FOR UPDATE
      USING (project_id = %L)
      WITH CHECK (project_id = %L);
      
      CREATE POLICY delete_policy
      ON %I
      FOR DELETE
      USING (project_id = %L);
    ', 
      table_name, 
      table_name, 
      table_name, project_id,
      table_name, project_id, project_id,
      table_name, project_id
    );

    -- יצירת אינדקסים
    EXECUTE format('CREATE INDEX %I ON %I (project_id)', table_name || '_project_id_idx', table_name);
    EXECUTE format('CREATE INDEX %I ON %I (status)', table_name || '_status_idx', table_name);
    EXECUTE format('CREATE INDEX %I ON %I (order_num)', table_name || '_order_idx', table_name);
    
    -- יצירת טריגר לעדכון שדה updated_at
    EXECUTE format('
      CREATE TRIGGER set_%I_updated_at
      BEFORE UPDATE ON %I
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at()', table_name, table_name);
  END IF;

  RAISE NOTICE 'Stages table % created successfully', table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- טריגר שיפעיל את הפונקציה באופן אוטומטי כאשר נוצר פרויקט חדש
CREATE OR REPLACE FUNCTION create_project_stages_table_on_project_insert()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_project_stages_table(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- הגדרת הטריגר על טבלת projects
DROP TRIGGER IF EXISTS create_project_stages_table_trigger ON projects;
CREATE TRIGGER create_project_stages_table_trigger
AFTER INSERT ON projects
FOR EACH ROW
EXECUTE FUNCTION create_project_stages_table_on_project_insert();

-- ============================================================
-- פונקציה להעתקת שלבים מהטבלה הכללית לטבלה הייחודית של הפרויקט
-- ============================================================
CREATE OR REPLACE FUNCTION clone_stages_to_project_table(project_id uuid)
RETURNS void AS $$
DECLARE
  target_table text := 'project_' || project_id::text || '_stages';
  stage_rec record;
BEGIN
  -- וידוא שהטבלה הייעודית קיימת
  PERFORM create_project_stages_table(project_id);
  
  -- מעבר על כל השלבים בפרויקט ושכפולם לטבלה הייעודית
  FOR stage_rec IN 
    SELECT * FROM stages 
    WHERE project_id = clone_stages_to_project_table.project_id
    AND id IS NOT NULL
  LOOP
    -- הוספת השלב לטבלה הייעודית
    EXECUTE format('
      INSERT INTO %I (
        id, project_id, title, description, color, status, progress, order_num, created_at, updated_at
      ) VALUES (
        %L, %L, %L, %L, %L, %L, %L, %L, %L, %L
      )
      ON CONFLICT (id) DO NOTHING;
    ', 
      target_table,
      stage_rec.id, stage_rec.project_id, stage_rec.title, stage_rec.description, 
      stage_rec.color, stage_rec.status, stage_rec.progress, stage_rec.order_num,
      stage_rec.created_at, stage_rec.updated_at
    );
  END LOOP;
  
  RAISE NOTICE 'All stages copied to project-specific table %', target_table;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- פונקציה לסנכרון שלבים בין הטבלה הכללית והטבלה הייחודית
-- ============================================================
CREATE OR REPLACE FUNCTION sync_project_stages(project_id uuid)
RETURNS void AS $$
BEGIN
  -- 1. יצירת הטבלה הייעודית אם אינה קיימת
  PERFORM create_project_stages_table(project_id);
  
  -- 2. העתקת השלבים לטבלה הייעודית
  PERFORM clone_stages_to_project_table(project_id);
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- טריגר לסנכרון שלבים בכל פעם שיש שינוי בטבלת השלבים הכללית
-- ================================================================
CREATE OR REPLACE FUNCTION sync_stages_on_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM sync_project_stages(NEW.project_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- בעת מחיקת שלב, אין צורך לעשות פעולה בטבלה הייעודית
    -- כיוון שיש אילוץ ON DELETE CASCADE
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- הגדרת הטריגר על טבלת stages
DROP TRIGGER IF EXISTS sync_stages_trigger ON stages;
CREATE TRIGGER sync_stages_trigger
AFTER INSERT OR UPDATE OR DELETE ON stages
FOR EACH ROW
EXECUTE FUNCTION sync_stages_on_change();

-- טריגר לסנכרון כל הטבלאות הייעודיות כאשר פרויקט נוצר
CREATE OR REPLACE FUNCTION sync_all_project_tables_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- יצירת טבלת משימות ייעודית
  PERFORM create_project_table(NEW.id);
  
  -- יצירת טבלת שלבים ייעודית
  PERFORM create_project_stages_table(NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- הגדרת הטריגר על טבלת projects
DROP TRIGGER IF EXISTS sync_all_project_tables_trigger ON projects;
CREATE TRIGGER sync_all_project_tables_trigger
AFTER INSERT ON projects
FOR EACH ROW
EXECUTE FUNCTION sync_all_project_tables_on_insert(); 