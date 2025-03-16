# 📝 אפיון מערכת ניהול פרויקטים לתום הרוש

## 📋 אפיון MVP

להלן אפיון MVP מפורט עבור המערכת, מערכת ניהול פרויקטים של נדל"ן שמיועדת למשרד הראשי בלבד, המאפשרת לראות, להוסיף ולערוך פרויקטים ומשימות (כולל תתי‑משימות) בצורה פשוטה. הקונספט אינו כולל ניהול הרשאות מורכב או הקצאות משתמשים; כל הפעולות נעשות על ידי המשתמש הראשי (המשרד הראשי).

---

## 1. מבוא

### 1.1. מטרת המערכת  
- לספק ממשק פשוט ונוח למשרד הראשי שיציג את כל פרויקטי הנדל"ן של המשרד.
- לאפשר צפייה בפרויקטים עם תצוגות שונות (לוח קנבן, עץ היררכי, גאנט).
- לאפשר יצירה, עריכה וניהול פרויקטים – כולל אפשרות ליצירת פרויקט "מבוסס תבנית" שממלא אוטומטית את כל המשימות הקבועות מראש.
- לאפשר הוספה ועריכה של משימות ותתי‑משימות בתוך כל פרויקט, כולל סימון (צ׳קבוקס) של משימות קיימות לצורך ניהול וארגון.

### 1.2. קהל היעד  
- משרד ראשי – המשתמש יהיה בעל שליטה מלאה על כל הפרויקטים והמשימות הקשורות בהם.

---

## 2. רכיבי המערכת

### 2.1. ניהול פרויקטים  
- **יצירה ועריכה:**  
  - ממשק ליצירת פרויקט נדל"ן חדש הכולל שדות: שם, בעלים, תאריכים (יצירה, עדכון, תאריכי התחלה/סיום מתוכננים ופעילים), סטטוס, תקציב כולל, עדיפות, התקדמות, מזהה מנהל פרויקט.
  - אפשרות לעריכת פרויקט קיים.
  - בעת יצירת פרויקט – ישנה אפשרות "תבנית" אשר תייבא אוטומטית את רשימת המשימות הקבועה (למשל, שלבים בסיסיים בפרויקט נדל"ן כגון רכישת קרקע, תכנון, היתרים, בנייה, שיווק וכו׳).

- **תצוגת רשימת פרויקטים:**  
  - דשבורד ראשי המציג את כל הפרויקטים, עם אפשרות סינון וחיפוש (לפי שם, סטטוס, תאריכים, עדיפות וכו׳).

### 2.2. ניהול משימות ותתי‑משימות  
- **ניהול משימות:**  
  - ממשק בתוך כל פרויקט המציג את כל המשימות הקשורות אליו.
  - כל משימה תכלול שדות: כותרת, תיאור, סטטוס (למשל: "todo", "in progress", "done"), עדיפות, אחראי (למרות שלא מנהלים הרשאות בשלב ה-MVP), תאריך התחלה, תאריך יעד, שעת ביצוע (מוערכת ואמיתית), תקציב, ועוד.
  - תמיכה בהוספת תתי‑משימות על ידי שימוש בשדה `parent_task_id`.

- **תצוגות משימות:**  
  - **לוח קנבן:** תצוגה גרפית שמחלקת את המשימות לקטגוריות לפי סטטוס, עם אפשרות לגרירה ושחרור (bulk פעולות באמצעות צ׳קבוקס לשינוי סטטוס או העברה).
  - **עץ היררכי:** תצוגה הממחישה את מבנה המשימות ותתי‑המשימות בפרויקט.
  - **גאנט:** תצוגת לו"ז המשימות, המציגה תלות בין משימות, תאריכי התחלה ויעד, למעקב אחר התקדמות.

### 2.3. תבניות פרויקטים  
- בעת יצירת פרויקט נדל"ן חדש, המשתמש יכול לבחור באפשרות "מבוסס תבנית" שתייבא מראש קבוצת משימות קבועה.
- ניתן לסמן באמצעות צ׳קבוקס משימות קיימות בתבנית (למשל, לסמן כ"לא רלוונטי" או להסיר משימות מסוימות) לפני יצירת הפרויקט.

---

## 3. ארכיטקטורה וטכנולוגיות מומלצות

### 3.1. Frontend  
- **Framework:** Next.js (React)  
  - מאפשר Server Side Rendering ותמיכה ב-PWA.
- **ספריות UI:** Tailwind CSS + Chakra UI  
  - לבניית ממשק מודרני, נקי ורספונסיבי.
- **ספריות נוספות:**  
  - **react-beautiful-dnd** – ללוח קנבן עם גרירה ושחרור.
  - **FullCalendar** – להצגת גאנט.
  - **React Hook Form** – לניהול טפסים.
  - **@tanstack/react-query** - לניהול מצב הנתונים והבקשות.

### 3.2. Backend  
- **בסיס נתונים:** Supabase (PostgreSQL)  
  - נתונים יישמרו בטבלאות לפי המבנה שסופק.
- **API:**  
  - שימוש ב-Supabase JavaScript Client לביצוע פעולות CRUD.
- **Realtime:**  
  - שימוש ב-Supabase Realtime לעדכונים בזמן אמת (לדוגמה, עדכון לוח קנבן).

### 3.3. אינטגרציות  
- בשלב ה-MVP אין צורך באינטגרציות חיצוניות כמו מייל או וואטסאפ – ניתן להוסיף placeholders לעתיד.

---

## 4. מבנה מסד הנתונים

### פרטי Supabase  
- **Project ID:** `orgkbmxecoegyjojoqmh`
- **Project URL:** `https://orgkbmxecoegyjojoqmh.supabase.co`
- **anon/public API Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yZ2tibXhlY29lZ3lqb2pvcW1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg4NjMyODYsImV4cCI6MjA1NDQzOTI4Nn0.jK13G36VU7eLVQsxsXLhlYLKafISrh9j8QIWIQH7TVs`
- **Service Role Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yZ2tibXhlY29lZ3lqb2pvcW1oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczODg2MzI4NiwiZXhwIjoyMDU0NDM5Mjg2fQ.2RoxeZAwgG3sD3JussNHgRpTKHbeas1nsGzuUkmkPHw`
- **JWT Secret:** `EBVabbAgrKcn+cvpKnXVXyw0Vds58GJXx/MhQO5UdOAerD88Iz2807ZJxL8fna5I0TQL0rkVD4KJPVY9ODSItw==`
- **Database Password:** `DV55b2XoiUy3nQ4X`
- **Database Host:** `aws-0-eu-central-1.pooler.supabase.com`
- **Database User:** `postgres.orgkbmxecoegyjojoqmh`
- **Database Name:** `postgres`

### טבלאות עיקריות
#### projects
```json
[
  {
    "table_name": "projects",
    "column_name": "name",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "projects",
    "column_name": "owner",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "projects",
    "column_name": "created_at",
    "data_type": "timestamp without time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_name": "projects",
    "column_name": "updated_at",
    "data_type": "timestamp without time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_name": "projects",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "projects",
    "column_name": "status",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": "'planning'::text"
  },
  {
    "table_name": "projects",
    "column_name": "total_budget",
    "data_type": "numeric",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "projects",
    "column_name": "planned_start_date",
    "data_type": "date",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "projects",
    "column_name": "planned_end_date",
    "data_type": "date",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "projects",
    "column_name": "actual_start_date",
    "data_type": "date",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "projects",
    "column_name": "actual_end_date",
    "data_type": "date",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "projects",
    "column_name": "project_manager_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "projects",
    "column_name": "priority",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": "'medium'::text"
  },
  {
    "table_name": "projects",
    "column_name": "progress",
    "data_type": "integer",
    "is_nullable": "YES",
    "column_default": "0"
  },
  {
    "table_name": "projects",
    "column_name": "entrepreneur",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  }
]
```

#### stages
```json
[
  {
    "table_name": "stages",
    "column_name": "title",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "stages",
    "column_name": "description",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "stages",
    "column_name": "created_at",
    "data_type": "timestamp without time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_name": "stages",
    "column_name": "updated_at",
    "data_type": "timestamp without time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_name": "stages",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "stages",
    "column_name": "project_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  }
]
```

#### tasks
```json
[
  {
    "table_name": "tasks",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "uuid_generate_v4()"
  },
  {
    "table_name": "tasks",
    "column_name": "project_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "tasks",
    "column_name": "stage_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "tasks",
    "column_name": "title",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "tasks",
    "column_name": "description",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "tasks",
    "column_name": "category",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "tasks",
    "column_name": "status",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": "'todo'::text"
  },
  {
    "table_name": "tasks",
    "column_name": "priority",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": "'medium'::text"
  },
  {
    "table_name": "tasks",
    "column_name": "responsible",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "tasks",
    "column_name": "estimated_hours",
    "data_type": "numeric",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "tasks",
    "column_name": "actual_hours",
    "data_type": "numeric",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "tasks",
    "column_name": "start_date",
    "data_type": "date",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "tasks",
    "column_name": "due_date",
    "data_type": "date",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "tasks",
    "column_name": "completed_date",
    "data_type": "date",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "tasks",
    "column_name": "budget",
    "data_type": "numeric",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "tasks",
    "column_name": "dependencies",
    "data_type": "ARRAY",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "tasks",
    "column_name": "assignees",
    "data_type": "ARRAY",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "tasks",
    "column_name": "watchers",
    "data_type": "ARRAY",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "tasks",
    "column_name": "labels",
    "data_type": "ARRAY",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "tasks",
    "column_name": "deleted",
    "data_type": "boolean",
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "table_name": "tasks",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_name": "tasks",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_name": "tasks",
    "column_name": "hierarchical_number",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "tasks",
    "column_name": "parent_task_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  }
]
```

---

## 5. זרימת עבודה (Workflow)

1. **יצירת פרויקט נדל"ן:**  
   - המשתמש בוחר באפשרות "צור פרויקט חדש" ממסך הדשבורד.
   - ישנה אפשרות לייבא פרויקט מתבנית – כאשר תבנית זו מכילה רשימת משימות מוגדרת מראש המותאמת לפרויקטי נדל"ן.
   - הפרויקט נשמר בטבלת **projects**.

2. **ניהול משימות בתוך פרויקט:**  
   - המשתמש עובר לדף הפרויקט לצפייה בכל המשימות.
   - יכול להוסיף משימה חדשה או תת‑משימה (באמצעות טופס פשוט).
   - ניתן לערוך משימות קיימות (עדכון סטטוס, תאריכים, תיאורים וכו׳).
   - תצוגות:  
     - לוח קנבן – לשינוי מהיר של סטטוסים.
     - עץ היררכי – להצגת מבנה המשימות.
     - גאנט – למעקב אחר לו"ז ותלות בין משימות.

3. **בקרה ומעקב:**  
   - דשבורד ראשי מציג סקירה של כל הפרויקטים והמשימות (כמות משימות "בפעולה", משימות שהושלמו, התקדמות כללי).
   - אפשרות לסינון וחיפוש לפי פרמטרים כמו סטטוס, תאריך יעד, עדיפות וכו׳.

---

## 6. התקדמות הפרויקט

### 🚀 שלב 1: איפוס והתחלה מחדש (10/03/2024)
- ✅ איפוס הפרויקט והגדרה מחדש של כל הקבצים
- ✅ יצירת מבנה תיקיות ראשוני
- ✅ הגדרת פרויקט Next.js עם Tailwind ו-Chakra UI

### 🚀 שלב 2: חיבור ל-Supabase
- ✅ הגדרת התחברות לשרת Supabase
- ✅ יצירת שכבת שירות לניהול מידע והתחברות
- ✅ יישום טיפוסי TypeScript למודלים
- ✅ קישור CLI של Supabase לפרויקט
- ✅ עדכון טיפוסי TypeScript לפי מבנה הטבלאות האמיתי

### 🚀 שלב 3: בניית דפי בסיס
- ✅ דף דשבורד ראשי
- ✅ דף רשימת פרויקטי נדל"ן 
- ✅ דף פרטי פרויקט
- ✅ קומפוננטת משימות ורכיבי UI משותפים

### 🚀 שלב 4: יישום תצוגות משימות
- ✅ לוח קנבן (חלקי - התחלנו אבל צריך להשלים)
- ✅ עץ היררכי
- ✅ גאנט

### 🚀 שלב 5: יישום טפסים
- ✅ טופס יצירת/עריכת פרויקט נדל"ן
- ✅ טופס יצירת/עריכת משימה
- ⬜️ תבניות פרויקטים מותאמות לנדל"ן (לא הושלם)

### 🚀 שלב 6: בדיקות ושיפורים
- ⬜️ בדיקת כל הפונקציונליות
- ⬜️ שיפורי UX/UI 
- ⬜️ אופטימיזציה וביצועים

### 🚀 שלב 7: משימות נוספות להשלמה
- ✅ השלמת תצוגת קנבן עם גרירה ושחרור
- ✅ יישום תצוגת עץ היררכי למשימות ותתי-משימות
- ✅ יישום תצוגת גאנט עם תלויות בין משימות
- ⬜️ יישום מערכת תבניות לפרויקטי נדל"ן
- ⬜️ שיפור ממשק המשתמש והוספת אנימציות
- ⬜️ הוספת פילטרים מתקדמים לחיפוש פרויקטים ומשימות
- ⬜️ יישום דשבורד אנליטיקה עם נתונים סטטיסטיים
- ⬜️ אופטימיזציה לטעינת דפים ובקשות API

### 🚀 שלב 8: עדכונים ותיקונים (11/03/2024)
- ✅ התקנת חבילות הפרויקט
- ✅ עדכון טיפוסי TypeScript לפי מבנה הטבלאות האמיתי בסופהבייס
- ✅ עדכון שירותי הפרויקט, השלבים והמשימות לעבודה עם המבנה החדש
- ✅ יישום מספרים היררכיים למשימות
- ✅ יישום תצוגת עץ משימות
- ✅ יישום תצוגת גאנט
- ✅ תיקון שגיאות בדף רשימת הפרויקטים
- ✅ התקנת חבילת @chakra-ui/icons החסרה
- ✅ הוספת אפשרות לשיוך משימות קיימות לפרויקט
- ✅ תיקון שגיאת אילוץ בעדכון סטטוס משימות (tasks_status_check)
- ✅ הוספת אפשרות ליצירת משימות ברירת מחדל בעת יצירת פרויקט חדש
- ✅ הוספת אפשרות ליצירת משימות ברירת מחדל גם בפרויקטים קיימים
- ✅ תיקון המרת סטטוס לאותיות קטנות בכל הקומפוננטות (TaskKanban, דף משימות, דף פרויקטים, דף משימה בודדת)
- ✅ תיקון ערכי הסטטוס בכל הקומפוננטות (שינוי מ-'to do', 'in progress', 'in review', 'completed' ל-'todo', 'in_progress', 'review', 'done')
- ✅ תיקון עדכון המשימה המקומית בדף המשימה הבודדת (שימוש בערך המנורמל של הסטטוס)
- ⬜️ שיפור ממשק המשתמש והוספת אנימציות
- ⬜️ הוספת פילטרים מתקדמים לחיפוש פרויקטים ומשימות
- ⬜️ יישום דשבורד אנליטיקה עם נתונים סטטיסטיים
- ⬜️ אופטימיזציה לטעינת דפים ובקשות API

### 🚀 שלב 9: שיפורים נוספים (12/03/2024)
- ✅ הוספת אפשרות לשיוך משימות קיימות לפרויקט
- ✅ יישום תצוגת קנבן מלאה עם גרירה ושחרור
- ✅ שיפור סנכרון בין תצוגות המשימות השונות (רשימה, קנבן, עץ, גאנט)
- ✅ תיקון פונקציונליות גרירה בלוח הקנבן
- ✅ שיפור תצוגת העץ ההיררכי עם קבוצות לפי שלבים ומספרים סידוריים
- ✅ תיקון שגיאת אילוץ בעדכון סטטוס משימות (tasks_status_check)
- ✅ הוספת אפשרות ליצירת משימות ברירת מחדל בעת יצירת פרויקט חדש
- ✅ הוספת אפשרות ליצירת משימות ברירת מחדל גם בפרויקטים קיימים
- ✅ תיקון המרת סטטוס לאותיות קטנות בכל הקומפוננטות (TaskKanban, דף משימות, דף פרויקטים, דף משימה בודדת)
- ✅ תיקון ערכי הסטטוס בכל הקומפוננטות (שינוי מ-'to do', 'in progress', 'in review', 'completed' ל-'todo', 'in_progress', 'review', 'done')
- ✅ תיקון עדכון המשימה המקומית בדף המשימה הבודדת (שימוש בערך המנורמל של הסטטוס)
- ⬜️ שיפור ממשק המשתמש והוספת אנימציות
- ⬜️ הוספת פילטרים מתקדמים לחיפוש פרויקטים ומשימות
- ⬜️ יישום דשבורד אנליטיקה עם נתונים סטטיסטיים
- ⬜️ אופטימיזציה לטעינת דפים ובקשות API

### 🚀 שלב 10: תיעוד ומעקב (13/03/2024)
- ✅ יצירת סקריפט אוטומטי לעדכון סכמת מסד הנתונים
- ✅ יצירת קובץ database_schema.md עם תיעוד מלא של מבנה מסד הנתונים
- ✅ עדכון כללי העבודה בפרויקט (rule.mdc) לכלול הנחיות לעדכון הסכמה
- ✅ שיפור תהליך התיעוד והמעקב אחר שינויים במסד הנתונים
- ✅ הוספת קובץ README.md עם הוראות הפעלה מפורטות
- ✅ יצירת git hook לעדכון אוטומטי של סכמת מסד הנתונים בעת commit
- ✅ הוספת פונקציות SQL לקבלת מידע על הסכמה (לשימוש עתידי)

## 🔑 פרמטרים חשובים
### Supabase
- Project Reference: `orgkbmxecoegyjojoqmh`
- Database Password: `DV55b2XoiUy3nQ4X`
- Database Host: `aws-0-eu-central-1.pooler.supabase.com`
- Database User: `postgres.orgkbmxecoegyjojoqmh`
- Database Name: `postgres`

### מידע מערכת
- OS Version: `darwin 23.4.0`
- Workspace Path: `/Users/idosegev/Downloads/TriRoars/TomHarush/tom-project`
- Shell: `/bin/zsh`

## עדכונים אחרונים

### 2024-07-XX - תיקון בעיית כפילות משימות בעת יצירת פרויקט חדש

- תוקנה בעיה שבה יצירת פרויקט חדש הייתה מכפילה את המשימות שנבחרו
- עודכנה הפונקציה `cloneTasksToProject` בקובץ `src/lib/services/taskService.ts` כך שתבדוק אם המשימות כבר קיימות בפרויקט לפני שהיא משכפלת אותן
- עודכנה הפונקציה `createDefaultTasksForRealEstateProject` בקובץ `src/lib/services/taskService.ts` כך שתבדוק אם כבר יש משימות בפרויקט לפני שהיא יוצרת משימות ברירת מחדל
- עודכנה הפונקציה `getProjectSpecificTasks` בקובץ `src/lib/services/taskService.ts` כדי לשפר את הטיפול בשגיאות ולמנוע כפילויות בהצגת המשימות

השינויים הללו מבטיחים שמשימות לא יוכפלו בעת יצירת פרויקט חדש, גם אם המשתמש בוחר גם משימות ברירת מחדל וגם משימות מותאמות אישית.

### 2024-07-XX - תיקון שגיאה בקריאה לפונקציית get_project_tasks

- נוספה פונקציה חדשה `get_tasks_tree` בקובץ `sql/project_tables.sql` שמחזירה את המשימות בצורה היררכית
- עודכנה הפונקציה `getProjectSpecificTasks` בקובץ `src/lib/services/taskService.ts` כך שתנסה קודם להשתמש בפונקציה `get_tasks_tree`, אם זו לא קיימת תנסה להשתמש ב-`get_project_tasks`, ואם גם זו לא קיימת תיפול חזרה לטבלה הראשית
- הטיפול בשגיאות שופר כך שהמערכת תמשיך לעבוד גם אם אחת הפונקציות לא קיימת

השינויים הללו מאפשרים למערכת לעבוד גם אם הפונקציה `get_project_tasks` לא קיימת או לא מוגדרת נכון בבסיס הנתונים.

### 2024-07-XX - שיפור סנכרון אוטומטי של משימות לטבלאות ספציפיות של פרויקטים

- עודכנה הפונקציה `assignTasksToProject` כך שתסנכרן אוטומטית את המשימות המשויכות לטבלה הספציפית של הפרויקט
- עודכנה הפונקציה `cloneTasksToProject` כך שתסנכרן אוטומטית את המשימות המשוכפלות לטבלה הספציפית של הפרויקט
- עודכנה הפונקציה `updateTaskHierarchy` כך שתסנכרן אוטומטית את המשימה המעודכנת לטבלה הספציפית של הפרויקט
- עודכנה הפונקציה `updateSubtaskHierarchicalNumbers` כך שתסנכרן אוטומטית את תתי-המשימות המעודכנות לטבלה הספציפית של הפרויקט
- עודכנה הפונקציה `createDefaultTasksForRealEstateProject` כך שתסנכרן אוטומטית את המשימות החדשות לטבלה הספציפית של הפרויקט

השינויים הללו מבטיחים שכל פעולה שמשנה משימות (יצירה, עדכון, מחיקה, שיוך, שכפול, שינוי היררכיה) תגרום לסנכרון אוטומטי של הטבלאות הספציפיות של הפרויקטים, כך שלא יהיה צורך להשתמש ב-API endpoint של `sync-projects` באופן שוטף.

### 2024-03-13 - שיפור פונקציות SQL לניהול טבלאות ספציפיות של פרויקטים

- נוספה פונקציה `copy_task_to_project_table` להעתקת משימה בודדת מהטבלה הראשית לטבלה הספציפית של הפרויקט
- נוספה פונקציה `copy_tasks_to_project_table` להעתקת מספר משימות מהטבלה הראשית לטבלה הספציפית של הפרויקט
- נוספה פונקציה `add_tasks_to_project_table` להוספת משימות חדשות ישירות לטבלה הספציפית של הפרויקט
- נוספה פונקציה `sync_project_tasks` לסנכרון כל המשימות מהטבלה הראשית לטבלה הספציפית
- נוספה פונקציה `get_project_tasks` לקבלת כל המשימות מהטבלה הספציפית של הפרויקט
- נוספה פונקציה `update_task_in_project_table` לעדכון משימה בטבלה הספציפית של הפרויקט
- נוספה פונקציה `delete_task_from_project_table` למחיקת משימה מהטבלה הספציפית של הפרויקט

שיפורים אלה מאפשרים:
1. הוספת משימות שנבחרו בדף יצירת הפרויקט ישירות לטבלה הספציפית של הפרויקט
2. סנכרון אוטומטי של משימות בין הטבלה הראשית לטבלאות הספציפיות של הפרויקטים
3. ניהול מלא של משימות בטבלאות הספציפיות של הפרויקטים (הוספה, עדכון, מחיקה)
4. שיפור ביצועים בקריאת משימות של פרויקט ספציפי

הפונקציות החדשות מאפשרות לנהל את המשימות בטבלאות הספציפיות של הפרויקטים באופן יעיל ומסונכרן עם הטבלה הראשית.

### 2023-03-16: הוספת שדה יזם לפרויקטים

- נוסף שדה `entrepreneur` לטבלת `projects` בבסיס הנתונים
- עודכנו הטיפוסים ב-TypeScript
- נוסף שדה יזם לדף יצירת פרויקט חדש
- נוסף שדה יזם לדף עריכת פרויקט
- נוסף שדה יזם לכרטיס פרויקט בדף הפרויקטים
- נוספה אפשרות לסינון לפי יזם בדף הפרויקטים
- נוספה אפשרות לסינון לפי יזם בדף המשימות

### 2023-03-17: הרחבת תצוגת היזם ושיפור הדשבורד

- נוסף שדה יזם לדף הפרויקט הבודד
- שודרג דף הדשבורד עם אפשרות לסינון לפי יזם
- נוספה סטטיסטיקה של פרויקטים ומשימות לפי יזם בדשבורד
- נוספה תצוגת פרויקטים אחרונים עם עמודת יזם
- נוספה תצוגת משימות דחופות עם קישור לפרויקט

### 2023-03-18: הוספת דף יזמים לסרגל הניווט

- נוסף קישור ליזמים בסרגל הניווט הראשי
- נוצר דף יזמים חדש המציג את כל היזמים במערכת
- נוספה אפשרות להוספת יזמים חדשים
- נוספה תצוגת פרויקטים לכל יזם
- נוספה אפשרות לצפייה בדשבורד מסונן לפי יזם ספציפי

### 2023-03-19: הוספת דף אבני דרך

- נוסף קישור לאבני דרך בסרגל הניווט הראשי
- נוצר דף אבני דרך חדש המציג את כל אבני הדרך במערכת
- נוספה אפשרות לסינון אבני דרך לפי פרויקט ולפי סטטוס
- נוספה תצוגת רשימה ותצוגת כרטיסיות לאבני דרך
- נוספה תצוגת משימות לכל אבן דרך
- נוספה אפשרות לצפייה בהתקדמות של כל אבן דרך

### 2023-03-20: הוספת שדה מילסטונים לדף הוספת משימה

- נוסף שדה מילסטונים (שלבים) לדף הוספת משימה חדשה
- נוספה טעינה אוטומטית של מילסטונים לפי הפרויקט שנבחר
- נוספה וולידציה לשדה המילסטונים
- עודכן הלוגיקה כך שהמילסטון שנבחר משמש כשלב (stage_id) של המשימה
- שופר ממשק המשתמש לבחירת מילסטון בעת יצירת משימה חדשה

### 2023-03-21: הוספת שדה מילסטונים לפופאפ יצירת משימה חדשה

- נוסף שדה מילסטונים (שלבים) לפופאפ יצירת משימה חדשה
- נוספה טעינה אוטומטית של מילסטונים לפי הפרויקט שנבחר בפופאפ
- נוספה וולידציה לשדה המילסטונים בפופאפ
- עודכן הלוגיקה כך שהמילסטון שנבחר משמש כשלב (stage_id) של המשימה גם בפופאפ
- שופר ממשק המשתמש לבחירת מילסטון בעת יצירת משימה חדשה מתוך פופאפ
- נוסף שדה מילסטון גם לתתי-משימות שנוצרות מתוך הפופאפ

### 2023-03-22: שיפור הקשר בין משימות לשלבים (stages)

- עודכן הממשק כך שיהיה ברור שמילסטון ושלב (stage) הם אותו דבר
- שופרה הלוגיקה של שיוך משימות לשלבים בפרויקט
- נוספה אפשרות לסינון משימות לפי שלב בתצוגות השונות
- שופרה תצוגת הקנבן כך שתציג משימות לפי שלבים בצורה ברורה יותר
- עודכנה הוולידציה בטפסי יצירת ועריכת משימות לגבי שדה השלב
- שופרה חווית המשתמש בבחירת שלב למשימה

### 2023-03-23: הוספת חתך משימות לפי קטגוריה

- נוסף שדה קטגוריה לטופס יצירת משימה חדשה
- נוסף שדה קטגוריה לפופאפ עריכת משימה
- נוספה אפשרות לסינון משימות לפי קטגוריה בדף המשימות
- נוספה אפשרות לקיבוץ משימות לפי קטגוריה בתצוגת הקנבן
- נוספה אפשרות לסינון משימות לפי קטגוריה בדף הפרויקט
- עודכן שירות המשימות לתמיכה בסינון לפי קטגוריה

### 23 במרץ, 2023 - הוספת סינון וקיבוץ משימות לפי קטגוריה

- הוספת שדה קטגוריה לטופס יצירת משימה חדשה
- הוספת שדה קטגוריה לחלונית עריכת משימה
- עדכון שירות המשימות לתמיכה בסינון לפי קטגוריה
- הוספת אפשרות לסנן משימות לפי קטגוריה ברשימת המשימות
- הוספת אפשרות לקבץ משימות לפי קטגוריה בתצוגת קנבן
- הוספת פונקציית עזר `groupTasksByCategory` לקיבוץ משימות לפי קטגוריה

השינויים מאפשרים למשתמשים לארגן ולסנן את המשימות שלהם לפי קטגוריות שונות, כגון פיתוח, עיצוב, תוכן, שיווק ותשתיות. הדבר מקל על ניהול פרויקטים מורכבים עם סוגים שונים של משימות.
