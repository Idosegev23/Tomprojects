# הוראות התקנה ותיקון בעיות טבלת שלבים

## הקדמה

קובץ זה מכיל הוראות להתקנת המיגרציות הדרושות כדי לתקן את בעיית העמודות החסרות בטבלאות השלבים הספציפיות לפרויקט, ובפרט את בעיית העמודה `hierarchical_number`.

## 1. התקנת המיגרציות הדרושות

יש להתקין את המיגרציות הבאות בסדר המצוין:

1. **המיגרציה שמוסיפה את פונקציית create_project_stages_table המעודכנת**:
   ```bash
   cd /path/to/project
   supabase db reset --linked
   # או לחלופין:
   supabase db push --linked
   ```

   **אפשרות נוספת - דחיפת כל המיגרציות**:
   ```bash
   # דחיפת כל המיגרציות כולל אלו שטרם הוחלו
   supabase db push --linked --include-all
   ```

2. **וידוא התקנת המיגרציות**:
   ```bash
   supabase db lint --linked
   # ודא שהמיגרציה 20250507000000_fix_project_stages_table_function.sql מופיעה ברשימה
   ```

## 2. תיקון טבלאות קיימות

אם יש לך טבלאות שלבים קיימות שחסרות בהן עמודות, ניתן לתקן אותן באמצעות הפעלת הפונקציה החדשה:

```sql
-- בממשק ה-SQL של Supabase

-- תיקון טבלה ספציפית
SELECT fix_specific_project_stages_table('PROJECT_ID');

-- או תיקון כל הטבלאות
DO $$
DECLARE
  project_rec record;
BEGIN
  FOR project_rec IN SELECT id::text FROM projects
  LOOP
    PERFORM fix_specific_project_stages_table(project_rec.id);
  END LOOP;
END $$;
```

## 3. וידוא התיקון

לאחר התקנת המיגרציות והפעלת הפונקציות לתיקון, ניתן לוודא שהתיקון עבד:

```sql
-- בדיקת מבנה טבלה ספציפית (החלף את PROJECT_ID)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'project_PROJECT_ID_stages';

-- וידוא קיום העמודה hierarchical_number בטבלה ספציפית
SELECT EXISTS (
  SELECT FROM information_schema.columns 
  WHERE table_schema = 'public' 
  AND table_name = 'project_PROJECT_ID_stages'
  AND column_name = 'hierarchical_number'
) AS has_hierarchical_number;
```

## 4. טיפול בשגיאות שעדיין מופיעות

אם עדיין מופיעות שגיאות לאחר התקנת המיגרציות ותיקון הטבלאות:

1. **מחיקת טבלאות שגויות** (זהירות - פעולה זו תמחק נתונים):
   ```sql
   DROP TABLE IF EXISTS project_PROBLEM_ID_stages;
   ```

2. **יצירה מחדש של טבלאות שלבים באמצעות הפונקציה המעודכנת**:
   ```sql
   SELECT create_project_stages_table('PROJECT_ID');
   ```

3. **עדכון ה-cache של PostgREST**:
   ```sql
   NOTIFY pgrst, 'reload schema';
   ```

## הוראות נוספות ופתרון בעיות

למידע נוסף ופתרונות מפורטים יותר, ראה את הקבצים הבאים:
- `README-fix-stages-tables.md` - מידע מפורט על פתרון בעיות בטבלאות שלבים
- `build_tracking.md` - תיעוד השינויים והתיקונים שנעשו במערכת

במקרה של בעיות נוספות, צור קשר עם צוות הפיתוח. 