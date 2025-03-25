# פתרון בעיות 404 בפונקציות RPC

## הבעיה
במהלך הפיתוח התגלו שגיאות 404 בגישה לפונקציות RPC הבאות:
- `create_project_stages_table`
- `copy_stages_to_project`
- `check_table_exists`
- `init_project_tables_and_data`
- `get_project_tasks`
- `get_tasks_tree`

בנוסף, התגלו גם שגיאות SQL:
- `column reference "project_id" is ambiguous` בפונקציית `init_project_tables_and_data`
- שם פרמטר לא נכון בפונקציית `check_table_exists`
- בעיה בפונקציית `check_stages_table_exists` עם שם פרמטר

אלו פונקציות חיוניות לסנכרון נתונים בין טבלת השלבים הכללית וטבלאות השלבים הספציפיות של כל פרויקט.

## הפתרון
נוספו מספר מיגרציות שמכילות את הפונקציות החסרות ומתקנות את הבעיות:

1. **מיגרציה `20250507000000_fix_project_stages_table_function.sql`**
   - הוספת פונקציית `create_project_stages_table` שהייתה חסרה ובשימוש
   - עדכון פונקציית הטריגר `create_project_stages_table_on_project_insert`
   - וידוא קיום הטריגר `create_project_stages_table_trigger` על טבלת הפרויקטים

2. **מיגרציה `20250508000000_fix_all_missing_functions.sql`**
   - הוספת כל הפונקציות החסרות לסנכרון שלבים ומשימות
   - תיקון פונקציית `check_table_exists`
   - הוספת פונקציות `get_project_tasks` ו-`get_tasks_tree`

3. **מיגרציה `20250509000000_fix_ambiguous_column_reference.sql`**
   - תיקון שגיאת `column reference "project_id" is ambiguous` בפונקציית `init_project_tables_and_data`
   - עדכון פונקציית `get_tasks_tree` עם הפניות מדויקות לעמודות
   - תיקון פונקציית `check_table_exists` כדי שתתמוך בפרמטר בשם `table_name_param`

4. **מיגרציה `20250510000000_override_all_problematic_functions.sql`**
   - תיקון מקיף המבצע DROP לכל הפונקציות הבעייתיות ויצירתן מחדש
   - פתרון בעיית שם הפרמטר ב-`check_stages_table_exists` 
   - תיקון מקיף לכל הפונקציות תוך שימוש ב-DROP FUNCTION לפני כל הגדרה
   - החזרת כל ההרשאות לכל הפונקציות

5. **מיגרציה `20250511000000_fix_remaining_ambiguous_issues.sql`**
   - תיקון בעיות `project_id is ambiguous` שנותרו במספר פונקציות
   - שינוי שם הפרמטרים בפונקציות `init_project_tables_and_data` ו-`get_tasks_tree` ל-`project_id_param`
   - הוספת פונקציית `copy_stages_to_project` למקרה שהיא לא קיימת
   - תיקון סופי לבעיות האמביגואליות שנותרו

## אנדפוינט API חדש
נוסף אנדפוינט API חדש בכתובת `src/app/api/projects/sync-stages/route.ts` שמבצע:
- קריאה לפונקציית RPC `copy_stages_to_project`
- לוגיקת נפילה חזרה (fallback) אם הפונקציה החדשה לא קיימת
- החזרת מידע מפורט על תהליך הסנכרון

## יישום הפתרון
כדי ליישם את הפתרון, הרץ את הסקריפט הבא:

```bash
./apply-migrations.sh
```

או בצע את הפעולות הבאות באופן ידני:

1. קישור הפרויקט המקומי לפרויקט Supabase:
   ```bash
   npx supabase link --project-ref orgkbmxecoegyjojoqmh
   ```

2. דחיפת המיגרציות לבסיס הנתונים:
   ```bash
   npx supabase db push
   ```

## פתרון בעיות נפוצות

אם עדיין יש שגיאות לאחר דחיפת המיגרציות:

1. רענן את הדף במלואו בדפדפן (Ctrl+F5)
2. פתח את כלי המפתח (F12) וודא שאין שגיאות 404 בקונסול
3. בדוק את הלוגים ב-API endpoint: `src/app/api/projects/sync-stages/route.ts`
4. וודא שהמשתמש מחובר לפני ניסיון לגשת לפונקציות RPC
5. אם יש בעיות עם שמות פרמטרים, ייתכן שתצטרך להשתמש במיגרציה האחרונה שנוספה (20250511000000)
6. שים לב לשינוי שמות הפרמטרים בפונקציות. למשל, בפונקציית `get_tasks_tree` צריך להשתמש ב-`project_id_param` ולא ב-`project_id`
7. אם יש עדיין בעיות ב-`init_project_tables_and_data`, בדוק אם נשארו בעיות אמביגואליות בקוד שלה

## הוראות בדיקה

לאחר יישום התיקונים, יש לבדוק:
1. יצירת פרויקט חדש - האם טבלאות הפרויקט נוצרות בהצלחה
2. סנכרון שלבים בפרויקט קיים - האם השלבים מועתקים לטבלה הייחודית
3. הצגת משימות פרויקט - האם המשימות מוצגות בהצלחה
4. גישה לעץ המשימות - האם עץ המשימות נטען בהצלחה, שים לב להשתמש בפרמטר `project_id_param`

## נושאים קשורים
- טיפול בטבלאות ייחודיות לפרויקט
- סנכרון שלבים בין טבלה כללית לטבלה ייחודית
- יצירת טבלאות דינמיות באמצעות SQL ו-Supabase
- טיפול בשגיאות SQL וHint לפתרון

## תיעוד
השינויים מתועדים בקובץ `build_tracking.md` בפרויקט. 