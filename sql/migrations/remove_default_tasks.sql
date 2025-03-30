-- מיגרציה להסרת יצירת משימות ברירת מחדל ("משימה ראשונה" ו"משימה שנייה") בעת יצירת פרויקט חדש
-- יש להריץ סקריפט זה על מסד הנתונים Supabase/PostgreSQL

-- עדכון פונקציית init_project_tables_and_data כך שלא תיצור משימות ברירת מחדל
CREATE OR REPLACE FUNCTION init_project_tables_and_data(
  project_id_param uuid,
  create_default_stages boolean DEFAULT true,
  create_default_tasks boolean DEFAULT true,
  selected_task_ids uuid[] DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  tasks_table_name text := 'project_' || project_id_param::text || '_tasks';
  stages_table_name text := 'project_' || project_id_param::text || '_stages';
  task_id uuid;
  has_selected_tasks boolean := selected_task_ids IS NOT NULL AND array_length(selected_task_ids, 1) > 0;
BEGIN
  -- יומן מפורט יותר לצורכי דיבוג
  RAISE NOTICE 'Starting init_project_tables_and_data for project %', project_id_param;
  RAISE NOTICE 'Parameters: create_default_stages=%, create_default_tasks=%, has_selected_tasks=%', 
               create_default_stages, create_default_tasks, has_selected_tasks;
  
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
    
    -- נשתמש בפונקציה שמטפלת במערך שלם של משימות ביעילות
    PERFORM copy_tasks_to_project_table(selected_task_ids, project_id_param);
  END IF;
  
  -- 4. נבנה שלבים בהתאם למשימות שנבחרו
  PERFORM build_stages_for_tasks(project_id_param);
  
  RAISE NOTICE 'Project % tables and data initialized successfully', project_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- הענקת הרשאות לפונקציה המעודכנת
GRANT EXECUTE ON FUNCTION init_project_tables_and_data(uuid, boolean, boolean, uuid[]) TO anon, authenticated, service_role; 