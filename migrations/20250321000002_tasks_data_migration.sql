-- מיגרציה להעברת נתונים מטבלת הגיבוי לטבלת המשימות החדשה (אופציונלי)
-- תאריך: 2025-03-21

-- הערה: מיגרציה זו נשארת במקומה למקרה שנרצה בעתיד לשחזר נתונים מהגיבוי
-- אבל כרגע היא לא מבצעת העברת נתונים, כיוון שאנחנו מתחילים מחדש

-- נוכל להפעיל את הקוד הזה בעתיד אם נרצה להחזיר נתונים מהגיבוי
/*
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tasks_backup') THEN
    -- העברת נתונים מטבלת הגיבוי לטבלה החדשה
    INSERT INTO tasks (
      id,
      title,
      description,
      project_id,
      stage_id,
      parent_task_id,
      hierarchical_number,
      due_date,
      status,
      priority,
      category,
      responsible,
      dropbox_folder,
      created_at,
      updated_at
    )
    SELECT 
      id,
      title,
      description,
      project_id,
      stage_id,
      parent_task_id,
      hierarchical_number,
      due_date,
      status,
      priority,
      category,
      responsible,
      NULL, -- dropbox_folder (שדה חדש)
      created_at,
      updated_at
    FROM tasks_backup
    -- נייבא רק משימות שלא מחוקות (אם יש שדה deleted בטבלת הגיבוי)
    WHERE 
      (deleted IS NULL OR deleted = false)
      AND title IS NOT NULL -- וידוא שיש כותרת (חובה)
    ON CONFLICT (id) DO NOTHING;

    -- רשימת כמות השורות שהועברו
    RAISE NOTICE 'הועברו % שורות מטבלת הגיבוי לטבלה החדשה', (SELECT count(*) FROM tasks);
  ELSE
    RAISE NOTICE 'טבלת הגיבוי tasks_backup לא נמצאה, דילוג על העברת נתונים';
  END IF;
END
$$;
*/

-- הערה: במקום לנסות לחשב מספרים היררכיים מהנתונים הקיימים, המספרים יחושבו אוטומטית
-- כאשר יוכנסו משימות חדשות באמצעות הטריגר שנוצר

-- הערות נוספות:
-- 1. כיוון שהתחלנו מחדש, לא נדרש להעביר נתונים מהטבלה הקודמת.
-- 2. הפונקציה וטריגר generate_tasks_hierarchical_number כבר נוצרו במיגרציה הקודמת.
-- 3. עדכון כל הרפרנסים במערכת לטבלת המשימות צריך להתבצע במקומות נוספים בקוד. 

-- הערה: אם בעתיד נחליט לשחזר את הנתונים, זה הקוד שצריך להשתמש בו לעדכון מספרים היררכיים
/*
UPDATE tasks t
SET hierarchical_number = calculate_hierarchical_number(t.id, t.parent_task_id, t.stage_id)
WHERE hierarchical_number IS NULL;
*/ 