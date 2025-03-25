-- סקריפט לבדיקת תקינות פונקציית init_project_tables_and_data

-- 1. יצירת פרויקט חדש לבדיקה 
INSERT INTO projects (
  id, name, owner, status, priority, progress
)
VALUES (
  '12345678-1234-1234-1234-123456789abc', -- מזהה קבוע לצורכי בדיקה
  'פרויקט בדיקה',
  'בודק מערכת',
  'planning',
  'medium',
  0
)
ON CONFLICT (id) DO UPDATE SET
  name = 'פרויקט בדיקה מעודכן',
  updated_at = now()
RETURNING id;

-- 2. הפעלת הפונקציה המתוקנת עם פרמטר project_id_param
SELECT init_project_tables_and_data(
  project_id_param := '12345678-1234-1234-1234-123456789abc',
  create_default_stages := true,
  create_default_tasks := true
);

-- 3. בדיקה אם הטבלאות נוצרו כראוי
DO $$
DECLARE
  tasks_table_name text := 'project_12345678-1234-1234-1234-123456789abc_tasks';
  stages_table_name text := 'project_12345678-1234-1234-1234-123456789abc_stages';
  tasks_exist boolean;
  stages_exist boolean;
  task_count int;
  stage_count int;
BEGIN
  -- בדיקת קיום טבלאות
  SELECT check_table_exists(tasks_table_name) INTO tasks_exist;
  SELECT check_table_exists(stages_table_name) INTO stages_exist;
  
  -- ספירת רשומות
  IF tasks_exist THEN
    EXECUTE format('SELECT COUNT(*) FROM %I', tasks_table_name) INTO task_count;
  ELSE
    task_count := 0;
  END IF;
  
  IF stages_exist THEN
    EXECUTE format('SELECT COUNT(*) FROM %I', stages_table_name) INTO stage_count;
  ELSE
    stage_count := 0;
  END IF;
  
  -- הצגת תוצאות הבדיקה
  RAISE NOTICE 'תוצאות בדיקה:';
  RAISE NOTICE '- טבלת משימות: % (% רשומות)', tasks_exist, task_count;
  RAISE NOTICE '- טבלת שלבים: % (% רשומות)', stages_exist, stage_count;
END $$; 