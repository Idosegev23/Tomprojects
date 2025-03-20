-- שאיבת מבנה הטבלאות באמצעות SQL
-- ריץ זאת בממשק ה-SQL של סופהבייס

-- מבנה טבלת השלבים (stages)
SELECT 
  column_name AS "שם עמודה",
  data_type AS "סוג נתונים",
  column_default AS "ברירת מחדל",
  CASE WHEN is_nullable = 'NO' THEN 'לא' ELSE 'כן' END AS "ניתן לריק"
FROM 
  information_schema.columns 
WHERE 
  table_name = 'stages' 
ORDER BY 
  ordinal_position;

-- מבנה טבלת המשימות (tasks)
SELECT 
  column_name AS "שם עמודה",
  data_type AS "סוג נתונים",
  column_default AS "ברירת מחדל",
  CASE WHEN is_nullable = 'NO' THEN 'לא' ELSE 'כן' END AS "ניתן לריק"
FROM 
  information_schema.columns 
WHERE 
  table_name = 'tasks' 
ORDER BY 
  ordinal_position;

-- מבנה טבלת היסטוריית שלבים (stages_history)
SELECT 
  column_name AS "שם עמודה",
  data_type AS "סוג נתונים",
  column_default AS "ברירת מחדל",
  CASE WHEN is_nullable = 'NO' THEN 'לא' ELSE 'כן' END AS "ניתן לריק"
FROM 
  information_schema.columns 
WHERE 
  table_name = 'stages_history' 
ORDER BY 
  ordinal_position;

-- אינדקסים בטבלת השלבים
SELECT
  indexname AS "שם האינדקס",
  indexdef AS "הגדרת האינדקס"
FROM
  pg_indexes
WHERE
  tablename = 'stages';

-- אינדקסים בטבלת המשימות
SELECT
  indexname AS "שם האינדקס",
  indexdef AS "הגדרת האינדקס"
FROM
  pg_indexes
WHERE
  tablename = 'tasks';

-- טריגרים בטבלת השלבים
SELECT
  trigger_name AS "שם הטריגר",
  event_manipulation AS "סוג האירוע",
  action_statement AS "פעולת הטריגר"
FROM
  information_schema.triggers
WHERE
  event_object_table = 'stages';

-- טריגרים בטבלת המשימות
SELECT
  trigger_name AS "שם הטריגר",
  event_manipulation AS "סוג האירוע", 
  action_statement AS "פעולת הטריגר"
FROM
  information_schema.triggers
WHERE
  event_object_table = 'tasks';

-- פונקציות שנוצרו בבסיס הנתונים
SELECT
  proname AS "שם הפונקציה",
  prosrc AS "קוד הפונקציה"
FROM
  pg_proc
WHERE
  proname LIKE '%stages%' OR proname LIKE '%tasks%'; 