-- הוספת שדה יזם לטבלת הפרויקטים
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS entrepreneur text;

-- עדכון הערה בקובץ build_tracking.md
-- יש להוסיף את השורה הבאה לקובץ build_tracking.md:
-- | entrepreneur | text | null | YES |

COMMENT ON COLUMN projects.entrepreneur IS 'שם היזם של הפרויקט';

-- עדכון פונקציות קיימות שמשתמשות בטבלת הפרויקטים
-- אם יש פונקציות שמחזירות את כל השדות של הפרויקטים, יש לעדכן אותן 