-- סקריפט לבדיקת ההתקנה של הפונקציות
-- העתק והדבק את הקוד הזה לממשק SQL של סופאבייס

-- בדיקת הפונקציה get_project_tasks
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'get_project_tasks' AND pg_function_is_visible(oid);

-- בדיקת הפונקציה get_tasks_tree
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'get_tasks_tree' AND pg_function_is_visible(oid);

-- בדיקת ההגדרה של טבלת tasks
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'tasks'
ORDER BY ordinal_position;

-- בדיקת טריגר ליצירת טבלאות ספציפיות לפרויקט
SELECT tgname, tgrelid::regclass, proname AS triggerfunc, tgenabled
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid::regclass::text = 'projects'; 