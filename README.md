# מערכת ניהול פרויקטים לתום הרוש

מערכת ניהול פרויקטים של נדל"ן המיועדת למשרד הראשי, המאפשרת לראות, להוסיף ולערוך פרויקטים ומשימות (כולל תתי‑משימות) בצורה פשוטה.

## תכונות עיקריות

- **ניהול פרויקטים** - יצירה, עריכה וצפייה בפרויקטי נדל"ן
- **ניהול משימות** - יצירה, עריכה וצפייה במשימות ותתי-משימות
- **תצוגות מרובות** - לוח קנבן, עץ היררכי, גאנט ורשימה
- **תבניות** - יצירת פרויקטים מבוססי תבניות עם משימות מוגדרות מראש

## טכנולוגיות

- **Frontend**: Next.js, React, Tailwind CSS, Chakra UI
- **Backend**: Supabase (PostgreSQL)
- **ניהול מצב**: React Query
- **גרירה ושחרור**: react-beautiful-dnd
- **לוח זמנים**: FullCalendar

## התקנה והפעלה

### דרישות מקדימות

- Node.js (גרסה 16 ומעלה)
- Yarn או npm
- חשבון Supabase

### התקנה

1. שכפל את המאגר:
```bash
git clone <repository-url>
cd tom-project
```

2. התקן את התלויות:
```bash
yarn install
# או
npm install
```

3. הגדר את משתני הסביבה:
   - צור קובץ `.env.local` בתיקייה הראשית
   - הוסף את המשתנים הבאים:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://orgkbmxecoegyjojoqmh.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yZ2tibXhlY29lZ3lqb2pvcW1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg4NjMyODYsImV4cCI6MjA1NDQzOTI4Nn0.jK13G36VU7eLVQsxsXLhlYLKafISrh9j8QIWIQH7TVs
   ```

4. הפעל את השרת:
```bash
yarn dev
# או
npm run dev
```

5. פתח את הדפדפן בכתובת [http://localhost:3000](http://localhost:3000)

## כלים ותסריטים

### עדכון סכמת מסד הנתונים

הפרויקט כולל סקריפט אוטומטי לעדכון ותיעוד סכמת מסד הנתונים:

```bash
./scripts/update_schema.sh
```

הסקריפט מייצר קובץ `database_schema.md` עם תיעוד מלא של מבנה מסד הנתונים, כולל:
- רשימת טבלאות
- עמודות וסוגי נתונים
- מפתחות ראשיים וזרים
- אילוצים

**הערה**: יש להריץ את הסקריפט בכל פעם שיש שינוי בסכמת מסד הנתונים.

#### עדכון אוטומטי

הפרויקט כולל גם git hook שמעדכן את סכמת מסד הנתונים באופן אוטומטי בכל פעם שיש commit עם שינויים בקבצי SQL או בקבצים הקשורים למסד הנתונים. ה-hook נמצא בנתיב `.git/hooks/pre-commit`.

אם ברצונך להפעיל את ה-hook באופן ידני, הרץ:

```bash
.git/hooks/pre-commit
```

### פונקציות SQL

הפרויקט כולל גם קובץ SQL עם פונקציות RPC שיכולות לשמש לקבלת מידע על הסכמה:

```bash
# התקנת פונקציות ה-RPC בסופהבייס (דורש Docker)
supabase db execute -f scripts/create_rpc_functions.sql
```

## מבנה הפרויקט

- `src/pages/` - דפי האפליקציה
- `src/components/` - קומפוננטות React
- `src/services/` - שירותים לתקשורת עם Supabase
- `src/types/` - טיפוסי TypeScript
- `src/utils/` - פונקציות עזר
- `scripts/` - סקריפטים שימושיים
- `supabase/` - הגדרות Supabase

## תיעוד נוסף

- [מסמך אפיון](build_tracking.md) - אפיון מפורט של המערכת
- [סכמת מסד הנתונים](database_schema.md) - תיעוד מבנה מסד הנתונים

## כללי עבודה

ראה [כללי עבודה](rule.mdc) לפרטים על כללי העבודה בפרויקט.

## רישיון

כל הזכויות שמורות © תום הרוש 