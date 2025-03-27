# פתרון בעיות בטבלאות שלבים 

## בעיות נפוצות

הבעיה הנפוצה ביותר היא כאשר חסרות עמודות בטבלת שלבים ספציפית לפרויקט, כגון: 
- `hierarchical_number`
- `dependencies`
- `sort_order`
- `parent_stage_id`

שגיאות אופייניות:
```
שגיאה ביצירת שלב בטבלה project_XXX_stages: 
{code: 'PGRST204', details: null, hint: null, message: "Could not find the 'hierarchical_number' column of project_XXX_stages in the schema cache"}
```

## פתרון באמצעות SQL

אם אתה נתקל בבעיה עם טבלת שלבים ספציפית, יש שתי אפשרויות לתיקון:

### 1. תיקון טבלה ספציפית

```sql
-- החלף את ה-ID של הפרויקט בהתאם
SELECT fix_specific_project_stages_table('ID-של-הפרויקט-הבעייתי');
```

### 2. תיקון כל טבלאות השלבים

אם אתה רוצה לתקן את כל טבלאות השלבים הקיימות, הרץ:

```sql
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

## פתרון באמצעות API

אם אתה מפתח ואין לך גישה ישירה ל-SQL, ניתן להשתמש ב-API להפעלת הפונקציות:

```typescript
// תיקון טבלת שלבים לפרויקט ספציפי
const fixSpecificTable = async (projectId: string) => {
  const { data, error } = await supabase.rpc('fix_specific_project_stages_table', {
    project_id_param: projectId
  });
  
  if (error) {
    console.error('שגיאה בתיקון טבלת שלבים:', error);
    return false;
  }
  
  return true;
};

// תיקון כל טבלאות השלבים
const fixAllStagesTables = async () => {
  // קבלת כל הפרויקטים
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id');
    
  if (projectsError) {
    console.error('שגיאה בקבלת רשימת פרויקטים:', projectsError);
    return;
  }
  
  // עיבוד כל פרויקט
  for (const project of projects || []) {
    console.log(`מתקן טבלת שלבים עבור פרויקט ${project.id}...`);
    await fixSpecificTable(project.id);
  }
  
  console.log('תיקון טבלאות שלבים הסתיים');
};
```

## הוספת עמודות חסרות באופן ידני

אם שום פתרון אוטומטי לא עוזר, ניתן להוסיף את העמודות החסרות באופן ידני:

```sql
-- החלף את שם הטבלה בהתאם
ALTER TABLE project_XXXX_stages ADD COLUMN IF NOT EXISTS hierarchical_number text;
ALTER TABLE project_XXXX_stages ADD COLUMN IF NOT EXISTS dependencies text[];
ALTER TABLE project_XXXX_stages ADD COLUMN IF NOT EXISTS sort_order integer;
ALTER TABLE project_XXXX_stages ADD COLUMN IF NOT EXISTS parent_stage_id uuid;
```

## מניעת בעיות בעתיד

כדי למנוע בעיות דומות בעתיד:

1. **בדיקת מיגרציה**: ודא שקובץ מיגרציה `20250507000000_fix_project_stages_table_function.sql` הוחל על מסד הנתונים.

2. **בעת יצירת פרויקט חדש**: ודא שהפונקציה `create_project_stages_table` מופעלת עם טריגר בעת יצירת פרויקט חדש.

3. **עדכון קוד**: ודא שהגרסה האחרונה של `stageService.ts` נמצאת בשימוש, הכוללת את מנגנוני התיקון האוטומטיים. 