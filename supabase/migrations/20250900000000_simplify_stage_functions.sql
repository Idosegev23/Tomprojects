-- migration_name: 20250900000000_simplify_stage_functions
-- description: פישוט ואיחוד פונקציות טיפול בטבלאות שלבים למניעת כפילויות

DO $$ 
BEGIN
  RAISE NOTICE '----- התחלת פישוט פונקציות טבלאות שלבים -----';
END $$;

-- ========================================================
-- מחיקת הפונקציות הכפולות לפני יצירת הפונקציה המאוחדת
-- ========================================================
DROP FUNCTION IF EXISTS fix_specific_project_stages_table(uuid);
DROP FUNCTION IF EXISTS fix_project_stages_table(uuid);
DROP FUNCTION IF EXISTS create_project_stages_table(uuid);

-- ========================================================
-- פונקציה מאוחדת ליצירה ותיקון של טבלת שלבים לפרויקט
-- ========================================================
CREATE OR REPLACE FUNCTION manage_project_stages_table(project_id_param uuid)
RETURNS boolean AS $$
DECLARE
  table_name text := 'project_' || project_id_param::text || '_stages';
  cols_info record;
  has_dependencies boolean := false;
  has_sort_order boolean := false;
  has_order_num boolean := false;
  has_hierarchical_number boolean := false;
  dependencies_type text;
  table_exists boolean;
BEGIN
  -- בדיקה אם הטבלה קיימת
  SELECT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = table_name
  ) INTO table_exists;

  -- חלק 1: יצירת הטבלה אם היא לא קיימת
  IF NOT table_exists THEN
    RAISE NOTICE 'יוצר טבלת שלבים חדשה: %', table_name;
    
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
        dependencies text[],
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
    
    -- יצירת אינדקסים
    EXECUTE format('
      CREATE INDEX %I ON %I (project_id);
      CREATE INDEX %I ON %I (parent_stage_id);
      CREATE INDEX %I ON %I (hierarchical_number);
    ', 
      table_name || '_project_id_idx', table_name,
      table_name || '_parent_stage_id_idx', table_name,
      table_name || '_hierarchical_number_idx', table_name
    );
    
    RAISE NOTICE 'טבלת השלבים % נוצרה בהצלחה', table_name;
    RETURN true;
  END IF;

  -- חלק 2: תיקון מבנה הטבלה אם היא כבר קיימת
  RAISE NOTICE 'בודק ומתקן מבנה טבלת שלבים קיימת: %', table_name;
  
  -- בדיקת קיום עמודות ספציפיות
  FOR cols_info IN 
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = table_name
  LOOP
    IF cols_info.column_name = 'dependencies' THEN
      has_dependencies := true;
      dependencies_type := cols_info.data_type;
    ELSIF cols_info.column_name = 'sort_order' THEN
      has_sort_order := true;
    ELSIF cols_info.column_name = 'order_num' THEN
      has_order_num := true;
    ELSIF cols_info.column_name = 'hierarchical_number' THEN
      has_hierarchical_number := true;
    END IF;
  END LOOP;

  -- וידוא שיש עמודת dependencies מסוג מערך טקסט
  IF NOT has_dependencies THEN
    BEGIN
      EXECUTE format('ALTER TABLE %I ADD COLUMN dependencies text[]', table_name);
      RAISE NOTICE 'הוספת עמודת dependencies לטבלה %', table_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'שגיאה בהוספת עמודת dependencies לטבלה %: %', table_name, SQLERRM;
    END;
  ELSIF dependencies_type <> 'ARRAY' THEN
    -- התאמת סוג הנתונים של dependencies
    BEGIN
      EXECUTE format('ALTER TABLE %I ALTER COLUMN dependencies TYPE text[] USING NULL', table_name);
      RAISE NOTICE 'שינוי סוג עמודת dependencies ל-text[] בטבלה %', table_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'שגיאה בשינוי סוג עמודת dependencies בטבלה %: %', table_name, SQLERRM;
    END;
  END IF;

  -- וידוא שיש עמודת hierarchical_number
  IF NOT has_hierarchical_number THEN
    BEGIN
      EXECUTE format('ALTER TABLE %I ADD COLUMN hierarchical_number text', table_name);
      RAISE NOTICE 'הוספת עמודת hierarchical_number לטבלה %', table_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'שגיאה בהוספת עמודת hierarchical_number לטבלה %: %', table_name, SQLERRM;
    END;

    -- יצירת אינדקס על שדה hierarchical_number אם העמודה נוספה
    BEGIN
      EXECUTE format('
        CREATE INDEX %I ON %I (hierarchical_number);
      ', 
        table_name || '_hierarchical_number_idx', table_name
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'שגיאה ביצירת אינדקס על hierarchical_number: %', SQLERRM;
    END;
  END IF;

  -- וידוא שיש עמודת sort_order
  IF NOT has_sort_order THEN
    IF has_order_num THEN
      -- שינוי שם העמודה מ-order_num ל-sort_order
      BEGIN
        EXECUTE format('ALTER TABLE %I RENAME COLUMN order_num TO sort_order', table_name);
        RAISE NOTICE 'שינוי שם עמודה מ-order_num ל-sort_order בטבלה %', table_name;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'שגיאה בשינוי שם עמודה מ-order_num ל-sort_order בטבלה %: %', table_name, SQLERRM;
      END;
    ELSE
      -- הוספת עמודת sort_order
      BEGIN
        EXECUTE format('ALTER TABLE %I ADD COLUMN sort_order integer', table_name);
        RAISE NOTICE 'הוספת עמודת sort_order לטבלה %', table_name;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'שגיאה בהוספת עמודת sort_order לטבלה %: %', table_name, SQLERRM;
      END;
    END IF;
  END IF;
  
  -- רענון הקאש של הסכימה
  BEGIN
    NOTIFY pgrst, 'reload schema';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'שגיאה ברענון קאש סכימה: %', SQLERRM;
  END;

  RAISE NOTICE 'תיקון טבלת השלבים % הושלם בהצלחה', table_name;
  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'שגיאה בטיפול בטבלת השלבים %: %', table_name, SQLERRM;
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- הענקת הרשאות לפונקציה המאוחדת
GRANT EXECUTE ON FUNCTION manage_project_stages_table(uuid) TO anon, authenticated, service_role;

-- ========================================================
-- יצירת פונקציות מעטפת ליישום לאחור
-- (כדי לא לשבור קריאות קיימות בקוד)
-- ========================================================
CREATE OR REPLACE FUNCTION create_project_stages_table(project_id uuid)
RETURNS void AS $$
BEGIN
  PERFORM manage_project_stages_table(project_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION fix_project_stages_table(project_id_param uuid)
RETURNS boolean AS $$
BEGIN
  RETURN manage_project_stages_table(project_id_param);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION fix_specific_project_stages_table(project_id_param uuid)
RETURNS boolean AS $$
BEGIN
  RETURN manage_project_stages_table(project_id_param);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- הענקת הרשאות לפונקציות המעטפת
GRANT EXECUTE ON FUNCTION create_project_stages_table(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION fix_project_stages_table(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION fix_specific_project_stages_table(uuid) TO anon, authenticated, service_role;

-- ========================================================
-- עדכון הטריגר לשימוש בפונקציה החדשה
-- ========================================================
CREATE OR REPLACE FUNCTION create_project_stages_table_on_project_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- יוצר את טבלת השלבים לפרויקט החדש
  PERFORM manage_project_stages_table(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- וידוא שהטריגר קיים על טבלת הפרויקטים
DROP TRIGGER IF EXISTS create_project_stages_table_trigger ON projects;
CREATE TRIGGER create_project_stages_table_trigger
AFTER INSERT ON projects
FOR EACH ROW
EXECUTE FUNCTION create_project_stages_table_on_project_insert();

-- הענקת הרשאות לפונקציית הטריגר
GRANT EXECUTE ON FUNCTION create_project_stages_table_on_project_insert() TO anon, authenticated, service_role;

-- ========================================================
-- תיקון של כל טבלאות השלבים הקיימות עם הפונקציה החדשה
-- ========================================================
DO $$ 
DECLARE
  project_rec record;
  fixed_count integer := 0;
  failed_count integer := 0;
BEGIN
  RAISE NOTICE 'מתחיל תיקון של כל טבלאות השלבים הקיימות...';
  
  FOR project_rec IN SELECT id FROM projects
  LOOP
    IF manage_project_stages_table(project_rec.id) THEN
      fixed_count := fixed_count + 1;
    ELSE
      failed_count := failed_count + 1;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'סיום תיקון טבלאות שלבים. הצלחות: %, כשלונות: %', fixed_count, failed_count;
END $$;

-- ========================================================
-- עדכון קובץ המעקב
-- ========================================================
DO $$ 
BEGIN
  RAISE NOTICE '----- המיגרציה הסתיימה בהצלחה -----';
  RAISE NOTICE 'נוצרה פונקציה מאוחדת manage_project_stages_table והוגדרו פונקציות מעטפת לתאימות';
END $$;

-- עדכון לקובץ build_tracking
INSERT INTO build_tracking (version, description, details)
VALUES (
  '20250900000000',
  'פישוט פונקציות טבלאות שלבים',
  jsonb_build_object(
    'summary', 'איחוד הפונקציות fix_project_stages_table, fix_specific_project_stages_table, create_project_stages_table לפונקציה אחת manage_project_stages_table עם הגדרת פונקציות מעטפת לשימור התאימות לאחור',
    'changes', jsonb_build_array(
      'הוספת פונקציית manage_project_stages_table',
      'יצירת פונקציות מעטפת להבטחת תאימות לאחור',
      'עדכון הטריגר create_project_stages_table_on_project_insert',
      'תיקון כל טבלאות השלבים הקיימות'
    )
  )
); 