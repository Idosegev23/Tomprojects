-- migration_name: 20250402000012_fix_stages_copy
-- description: הוספת פונקציה להעתקת שלבים מטבלה כללית לטבלה ייחודית לפרויקט

-- פונקציה להעתקת שלבים מטבלת stages הכללית לטבלת השלבים הייחודית של הפרויקט
CREATE OR REPLACE FUNCTION copy_stages_to_project_table(project_id uuid)
RETURNS void AS $$
DECLARE
  stages_table_name text := 'project_' || project_id::text || '_stages';
  stage_rec record;
BEGIN
  -- בדיקה אם טבלת השלבים הייחודית קיימת
  IF check_stages_table_exists(stages_table_name) THEN
    -- מעבר על כל השלבים בטבלה הכללית שמשויכים לפרויקט זה או שאינם משויכים לפרויקט כלל (שלבים כלליים)
    FOR stage_rec IN SELECT * FROM stages WHERE project_id IS NULL OR project_id = copy_stages_to_project_table.project_id
    LOOP
      -- הוספת השלב לטבלה הייחודית
      EXECUTE format('
        INSERT INTO %I (
          id, title, hierarchical_number, due_date, status, progress, 
          color, parent_stage_id, dependencies, sort_order, 
          created_at, updated_at, project_id
        ) VALUES (
          %L, %L, %L, %L, %L, %L,
          %L, %L, %L, %L,
          %L, %L, %L
        )
        ON CONFLICT (id) DO NOTHING',
        stages_table_name,
        stage_rec.id,
        stage_rec.title,
        stage_rec.hierarchical_number,
        stage_rec.due_date,
        stage_rec.status,
        stage_rec.progress,
        stage_rec.color,
        stage_rec.parent_stage_id,
        stage_rec.dependencies,
        stage_rec.sort_order,
        stage_rec.created_at,
        stage_rec.updated_at,
        copy_stages_to_project_table.project_id
      );
    END LOOP;
    
    RAISE NOTICE 'שלבים הועתקו בהצלחה לטבלה %', stages_table_name;
  ELSE
    RAISE EXCEPTION 'טבלת השלבים % לא קיימת', stages_table_name;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- עדכון הטריגר של יצירת הפרויקט כך שיעתיק גם את השלבים
CREATE OR REPLACE FUNCTION create_project_stages_table_on_project_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- יצירת טבלת השלבים הייחודית
  PERFORM create_project_stages_table(NEW.id);
  
  -- העתקת השלבים הכלליים לטבלה הייחודית
  PERFORM copy_stages_to_project_table(NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- עדכון הטריגר
DROP TRIGGER IF EXISTS create_project_stages_table_trigger ON projects;
CREATE TRIGGER create_project_stages_table_trigger
AFTER INSERT ON projects
FOR EACH ROW
EXECUTE FUNCTION create_project_stages_table_on_project_insert();

-- הוספת טריגר גם על טבלת השלבים הכללית כדי שיעדכן את הטבלאות הייחודיות
CREATE OR REPLACE FUNCTION sync_stages_on_change()
RETURNS TRIGGER AS $$
DECLARE
  project_id uuid;
BEGIN
  -- קביעת מזהה הפרויקט לפי סוג הפעולה
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    project_id := NEW.project_id;
  ELSIF TG_OP = 'DELETE' THEN
    project_id := OLD.project_id;
  END IF;
  
  -- אם מזהה הפרויקט אינו NULL, יש לעדכן את הטבלה הייחודית
  IF project_id IS NOT NULL THEN
    PERFORM copy_stages_to_project_table(project_id);
  ELSE
    -- אם זהו שלב כללי (ללא פרויקט), יש להעתיק אותו לכל טבלאות השלבים הייחודיות
    FOR project_id IN SELECT id FROM projects
    LOOP
      PERFORM copy_stages_to_project_table(project_id);
    END LOOP;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- הגדרת הטריגר על טבלת stages
DROP TRIGGER IF EXISTS sync_stages_trigger ON stages;
CREATE TRIGGER sync_stages_trigger
AFTER INSERT OR UPDATE OR DELETE ON stages
FOR EACH ROW
EXECUTE FUNCTION sync_stages_on_change();

-- עדכון פונקציית אתחול של טבלאות הפרויקט
CREATE OR REPLACE FUNCTION init_project_tables_and_data(
  project_id uuid,
  create_default_stages boolean DEFAULT true,
  create_default_tasks boolean DEFAULT true,
  selected_task_ids uuid[] DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- יצירת טבלאות הפרויקט
  PERFORM create_project_tables(project_id);
  
  -- העתקת השלבים מהטבלה הכללית אם קיימים
  PERFORM copy_stages_to_project_table(project_id);
  
  -- המשך הפונקציה כרגיל...
  
  RAISE NOTICE 'טבלאות ונתוני הפרויקט אותחלו בהצלחה';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- הענקת הרשאות לפונקציות
GRANT EXECUTE ON FUNCTION copy_stages_to_project_table(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION create_project_stages_table_on_project_insert() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION init_project_tables_and_data(uuid, boolean, boolean, uuid[]) TO anon, authenticated, service_role;

-- פונקציה להעתקת כל השלבים הקיימים לטבלאות הפרויקטים הייחודיות כדי לתקן את המצב הקיים
CREATE OR REPLACE FUNCTION copy_existing_stages_to_project_tables()
RETURNS void AS $$
DECLARE
  project_rec record;
BEGIN
  FOR project_rec IN SELECT id FROM projects
  LOOP
    BEGIN
      PERFORM copy_stages_to_project_table(project_rec.id);
      RAISE NOTICE 'שלבים הועתקו בהצלחה לפרויקט %', project_rec.id;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'שגיאה בהעתקת שלבים לפרויקט %: %', project_rec.id, SQLERRM;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- הענקת הרשאות
GRANT EXECUTE ON FUNCTION copy_existing_stages_to_project_tables() TO anon, authenticated, service_role;

-- הפעלת הפונקציה להעתקת כל השלבים הקיימים
SELECT copy_existing_stages_to_project_tables(); 