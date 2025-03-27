# הוראות לפישוט ידני של פונקציות טבלאות השלבים

מסמך זה מכיל הוראות לביצוע ידני של פישוט פונקציות הטיפול בטבלאות השלבים דרך ממשק ה-Dashboard של Supabase.

## צעד 1: העתקת תוכן הפונקציה החדשה

העתק את כל תוכן הקובץ `supabase/migrations/20250900000000_simplify_stage_functions.sql`, שמכיל את הפונקציה המאוחדת והפונקציות מעטפת.

## צעד 2: כניסה לממשק ניהול SQL של Supabase

1. התחבר לחשבון ה-Supabase שלך
2. בחר את הפרויקט הרלוונטי
3. לחץ על כרטיסיית ה-SQL בתפריט הצד
4. לחץ על "New Query" כדי ליצור שאילתה חדשה

## צעד 3: הפעלת קוד ה-SQL

1. הדבק את קוד ה-SQL שהעתקת בצעד 1 לחלון השאילתה
2. לחץ על "Run" כדי להפעיל את הקוד
3. ודא שאין שגיאות בפלט

## צעד 4: וידוא שהפונקציות נוצרו

כדי לוודא שהפונקציות נוצרו בהצלחה, הרץ את השאילתה הבאה:

```sql
SELECT proname, pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname IN ('manage_project_stages_table', 'create_project_stages_table', 'fix_project_stages_table', 'fix_specific_project_stages_table')
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
```

וודא שכל ארבע הפונקציות מופיעות בתוצאות.

## צעד 5: תיקון כל טבלאות השלבים הקיימות

כדי להפעיל את הפונקציה החדשה על כל טבלאות השלבים הקיימות, הרץ את הקוד הבא:

```sql
DO $$ 
DECLARE
  project_rec record;
  fixed_count integer := 0;
  failed_count integer := 0;
BEGIN
  RAISE NOTICE 'מתחיל תיקון של כל טבלאות השלבים הקיימות...';
  
  FOR project_rec IN SELECT id FROM projects
  LOOP
    IF manage_project_stages_table(project_rec.id) THEN
      fixed_count := fixed_count + 1;
    ELSE
      failed_count := failed_count + 1;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'סיום תיקון טבלאות שלבים. הצלחות: %, כשלונות: %', fixed_count, failed_count;
END $$;
```

## צעד 6: רענון סכימת PostgREST

כדי לוודא שה-API ישקף את השינויים שביצעת, הרץ:

```sql
NOTIFY pgrst, 'reload schema';
```

## צעד 7: עדכון קוד ה-TypeScript

אחרי שהשינויים בבסיס הנתונים הושלמו, עדכן את קוד ה-TypeScript בקובץ `stageService.ts` לפי ההנחיות בקובץ `simplify_client_code.md`.

הנה דוגמה לשינוי עיקרי בקוד (פונקציית `createStage`):

```typescript
// לפני נסיון יצירת השלב, נוודא שהטבלה קיימת ושהמבנה שלה תקין
try {
  console.log(`מוודא שטבלת ${tableName} קיימת ותקינה...`);
  const { data: result, error } = await supabase.rpc('manage_project_stages_table', {
    project_id_param: projectId
  });
  
  if (error) {
    console.error(`שגיאה בהכנת טבלת השלבים ${tableName}:`, error);
    // ממשיכים בכל זאת, ייתכן שהטבלה תקינה למרות השגיאה
  } else {
    console.log(`טבלת השלבים ${tableName} מוכנה:`, result);
  }
} catch (error) {
  console.error(`שגיאה לא צפויה בהכנת טבלת השלבים ${tableName}:`, error);
  // ממשיכים בכל זאת
}
```

במקום להשתמש ב-`fix_project_stages_table` ו-`fix_specific_project_stages_table`. 