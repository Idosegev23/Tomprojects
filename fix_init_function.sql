-- תיקון לפונקציית init_project_tables_and_data כדי שתעבוד רק עם המשימות הנבחרות

-- מחיקת הפונקציה הקיימת
DROP FUNCTION IF EXISTS init_project_tables_and_data(uuid, boolean, boolean, uuid[]);

-- יצירת פונקציה מתוקנת שמתייחסת באופן נכון למערך המשימות הנבחרות
CREATE OR REPLACE FUNCTION init_project_tables_and_data(
  project_id_param uuid,
  create_default_stages boolean DEFAULT true,
  create_default_tasks boolean DEFAULT true,
  selected_task_ids uuid[] DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  tasks_table_name text := 'project_' || project_id_param::text || '_tasks';
  task_id uuid;
  has_selected_tasks boolean := selected_task_ids IS NOT NULL AND array_length(selected_task_ids, 1) > 0;
BEGIN
  -- 1. וודא שטבלאות הפרויקט קיימות
  PERFORM create_project_table(project_id_param);
  PERFORM create_project_stages_table(project_id_param);
  
  -- 2. העתק שלבים (אם ביקשו)
  IF create_default_stages THEN
    PERFORM copy_stages_to_project_table(project_id_param);
  END IF;
  
  -- 3. טיפול במשימות
  IF has_selected_tasks THEN
    -- יש משימות נבחרות - נעתיק רק אותן
    RAISE NOTICE 'העתקת % משימות נבחרות לפרויקט %', array_length(selected_task_ids, 1), project_id_param;
    
    FOREACH task_id IN ARRAY selected_task_ids
    LOOP
      BEGIN
        RAISE NOTICE 'מעתיק משימה %', task_id;
        PERFORM copy_task_to_project_table(task_id, project_id_param);
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'שגיאה בהעתקת משימה % לפרויקט %: %', task_id, project_id_param, SQLERRM;
      END;
    END LOOP;
    
  ELSIF create_default_tasks THEN
    -- אין משימות נבחרות ומותר ליצור משימות ברירת מחדל
    RAISE NOTICE 'יצירת משימות ברירת מחדל לפרויקט %', project_id_param;
    
    EXECUTE format('
      INSERT INTO %I (id, project_id, title, status, created_at, updated_at)
      VALUES 
        (uuid_generate_v4(), %L, ''משימה ראשונה'', ''todo'', now(), now()),
        (uuid_generate_v4(), %L, ''משימה שנייה'', ''todo'', now(), now())
      ON CONFLICT DO NOTHING
    ', tasks_table_name, project_id_param, project_id_param);
  ELSE
    RAISE NOTICE 'לא נבחרו משימות ולא מאפשרים יצירת משימות ברירת מחדל - לא יוצרים משימות';
  END IF;
  
  RAISE NOTICE 'אתחול טבלאות ונתונים לפרויקט % הושלם בהצלחה', project_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- הענקת הרשאות
GRANT EXECUTE ON FUNCTION init_project_tables_and_data(uuid, boolean, boolean, uuid[]) TO anon, authenticated, service_role;

-- תיקון טריגר כך שלא ייצור משימות ברירת מחדל (רק שלבים)
DROP FUNCTION IF EXISTS project_after_insert_trigger() CASCADE;
CREATE OR REPLACE FUNCTION project_after_insert_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- קריאה לפונקציה שיוצרת את טבלאות הפרויקט
  -- שינוי: מעבירים false עבור create_default_tasks כדי למנוע יצירת
  -- משימות ברירת מחדל כשהטריגר מופעל אוטומטית
  PERFORM init_project_tables_and_data(NEW.id, true, false, NULL);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- יצירת הטריגר מחדש
DROP TRIGGER IF EXISTS project_after_insert_trigger ON projects;
CREATE TRIGGER project_after_insert_trigger
AFTER INSERT ON projects
FOR EACH ROW
EXECUTE FUNCTION project_after_insert_trigger();

-- הענקת הרשאה לפונקציית הטריגר
GRANT EXECUTE ON FUNCTION project_after_insert_trigger() TO anon, authenticated, service_role; 