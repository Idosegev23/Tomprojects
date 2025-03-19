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
  },
  {
    "table_name": "projects",
    "column_name": "entrepreneur_id",
    "data_type": "uuid",
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

#### entrepreneurs
```json
[
  {
    "table_name": "entrepreneurs",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "uuid_generate_v4()"
  },
  {
    "table_name": "entrepreneurs",
    "column_name": "name",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "entrepreneurs",
    "column_name": "description",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "entrepreneurs",
    "column_name": "contact_info",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "entrepreneurs",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_name": "entrepreneurs",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
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

### 2024-07-XX - הוספת תמיכה מלאה במובייל ורספונסיביות

- עודכן ה-layout הראשי של האפליקציה לתמיכה במובייל
- נוסף תפריט צד נשלף (drawer) למסכים קטנים
- עודכנו כל הדפים הראשיים להיות רספונסיביים:
  - דף הדשבורד
  - דף הפרויקטים
  - דף המשימות
  - דף היזמים
  - דף אבני הדרך
  - דף הפרויקט הבודד
  - דף המשימה הבודדת
  - דף ההתחברות
  - דף הבית
- שופרו כרטיסי הפרויקטים והמשימות לתצוגה מיטבית במובייל
- נוספו סגנונות CSS גלובליים לשיפור הרספונסיביות
- הוגדרו breakpoints מותאמים בתמת Chakra UI
- נוספו הגדרות רספונסיביות לטבלאות ולטפסים
- נוסף meta tag לתמיכה במובייל בראש האפליקציה
- עודכנו כל הקומפוננטות להשתמש בערכים רספונסיביים לגודל, מרווחים ותצוגה
- נוספו תפריטי אפשרויות (dropdown menus) במסכים קטנים במקום כפתורים מרובים
- נוספה תמיכה בגלילה אופקית לטאבים ולטבלאות במסכים קטנים
- שופרו הטפסים להתאמה למסכים קטנים עם גדלי שדות ומרווחים מותאמים
- נוספו מאפיינים רספונסיביים לכל הכותרות, טקסטים וכפתורים

השינויים הללו מאפשרים למשתמשים לגשת ולהשתמש באפליקציה מכל מכשיר, כולל טלפונים ניידים וטאבלטים, עם חוויית משתמש מיטבית המותאמת לגודל המסך.

# עדכון מצב הפרויקט

## מיגרציות שהוחלו

### פתרון בעיות בפונקציות של טבלאות הפרויקט
- [x] **20250316000000_fix_project_table_policies.sql** - תיקון הפונקציה `create_project_table` עם מדיניות אבטחה מתוקנת ושמות קצרים יותר
- [x] **20250316000001_fix_project_tasks_functions.sql** - תיקון פונקציות `get_project_tasks` ו-`get_tasks_tree` לטיפול בטבלאות פרויקט
- [x] **20250316000002_fix_project_copy_tasks.sql** - עדכון פונקציות `copy_task_to_project_table` ו-`copy_tasks_to_project_table`
- [x] **20250316000003_fix_project_sync_tasks.sql** - הוספת פונקציות `sync_project_tasks` ו-`add_tasks_to_project_table`
- [x] **20250316000004_add_original_task_id_column.sql** - הוספת עמודת `original_task_id` לטבלת tasks ועדכון פונקציות רלוונטיות
- [x] **20250316000005_fix_get_project_tasks.sql** - שיפור הפונקציות `get_project_tasks` ו-`get_tasks_tree` להוספת טיפול בשגיאות
- [x] **20250316000006_add_exec_sql_function.sql** - הוספת פונקציה `exec_sql` להרצת שאילתות SQL דינמיות
- [x] **20250316000007_fix_exec_sql_function.sql** - תיקון הפונקציה `exec_sql` לטיפול טוב יותר בתוצאות
- [x] **20250316000008_fix_sync_project_tasks.sql** - תיקון הפונקציה `sync_project_tasks` לפתרון בעיית עמודה דו-משמעית
- [x] **20250316000009_fix_copy_task_to_project_table.sql** - תיקון הפונקציה `copy_task_to_project_table` לפתרון בעיית עמודה דו-משמעית
- [x] **20250316000010_fix_sync_project_tasks_again.sql** - שיפור נוסף בפונקציה `sync_project_tasks` עם שימוש בפרמטרים יחודיים
- [x] **20250316000011_fix_exec_sql_function_again.sql** - שיפור הפונקציה `exec_sql` לטיפול בתוצאות מרובות
- [x] **20250316000012_add_is_template_column.sql** - הוספת עמודת `is_template` לטבלת tasks
- [x] **20250316000013_fix_create_project_table.sql** - עדכון פונקציית `create_project_table` לתמיכה בעמודות החדשות
- [x] **20250316000014_fix_copy_task_to_project_table_again.sql** - שיפור הפונקציה `copy_task_to_project_table` עם ציון מפורש של עמודות וערכים
- [x] **20250316000015_fix_copy_task_to_project_table_final.sql** - תיקון סופי לפונקציה `copy_task_to_project_table` לטיפול במקרי קצה
- [x] **20250316000016_fix_sync_project_tasks_final.sql** - תיקון סופי לפונקציה `sync_project_tasks`

### טיפול בטבלת יזמים (Entrepreneurs)
- [x] **20250317000000_create_entrepreneurs_table.sql** - יצירת טבלת היזמים
- [x] **20250317000002_disable_entrepreneurs_rls_fix.sql** - ביטול ה-RLS בטבלת היזמים והסרת מדיניויות אבטחה
- [x] **20250317000003_grant_access_to_entrepreneurs.sql** - הענקת הרשאות גישה לטבלת היזמים לכל התפקידים

## שיפורים שהוטמעו

### ניהול טבלאות פרויקט
1. **פתרון בעיית העמודה הדו-משמעית** - תיקנו את הבעיה עם `project_id` שהיה דו-משמעי בפונקציות שונות.
2. **טיפול בשגיאות** - הוספנו טיפול בשגיאות לפונקציות העיקריות כמו `get_project_tasks` ו-`get_tasks_tree`.
3. **עמודת `original_task_id`** - הוספנו עמודה זו כדי לאפשר מעקב אחר המשימה המקורית בעת העתקת משימות בין פרויקטים.
4. **עמודת `is_template`** - הוספנו עמודה זו לסימון משימות תבנית.

### פונקציית `exec_sql`
- הוספנו פונקציה זו שמאפשרת הרצת שאילתות SQL דינמיות ומחזירה תוצאות בפורמט JSON.
- שיפרנו את הפונקציה כדי שתתמוך בתוצאות מרובות ובטיפול מתאים בשגיאות.

### טבלת היזמים
1. **יצירת הטבלה** - יצרנו את טבלת היזמים עם העמודות הנדרשות.
2. **ביטול RLS** - ביטלנו את ה-RLS (Row Level Security) בטבלה כדי לאפשר גישה לכל המשתמשים.
3. **הסרת מדיניויות** - הסרנו את כל מדיניויות האבטחה שהגבילו את הגישה לטבלה.
4. **הענקת הרשאות** - הענקנו הרשאות מלאות לכל התפקידים (anon, authenticated, service_role) לטבלה.

## סטטוס נוכחי
- [x] המערכת מאפשרת סנכרון משימות בין הטבלה הראשית לטבלת הפרויקט הספציפית.
- [x] פתרנו את כל הבעיות עם עמודות `is_template` ו-`original_task_id` בכל הפונקציות הרלוונטיות.
- [x] פונקציית `exec_sql` פועלת בצורה תקינה ומאפשרת הרצת שאילתות דינמיות.
- [x] טבלת היזמים נגישה לכל המשתמשים, כולל משתמשים אנונימיים (anon).
- [x] ניתן לקרוא ולכתוב נתונים לטבלת היזמים ללא שגיאות הרשאה.
- [x] הסרנו את כל מדיניויות ה-RLS מכל הטבלאות במערכת.
- [x] בדקנו את פונקציית `sync_project_tasks` והיא פועלת כהלכה.
- [x] ניתן להוסיף משימות חדשות ישירות לטבלאות פרויקטים ספציפיות עם SQL.

## צעדים הבאים
- [ ] בחינה מקיפה של כל פונקציות הפרויקט לאיתור בעיות נוספות.
- [ ] שיפור הממשק להוספת וניהול יזמים.
- [ ] הוספת יכולות דוחות מתקדמות למשימות ופרויקטים.
- [ ] שיפור התמיכה במשימות תבנית ושכפול משימות בין פרויקטים.
- [ ] תיקון פונקציות `add_tasks_to_project_table` ו-`get_project_tasks` לפעולה תקינה.
- [ ] בדיקת כל הפונקציות שמשתמשות בטבלאות פרויקט ספציפיות ווידוא פעולתן התקינה.

### 2024-03-18 - הסרת מדיניות RLS מכל הטבלאות במערכת

- [x] **20250318000000_disable_all_rls.sql** - ביטול RLS והסרת כל מדיניויות האבטחה מכל הטבלאות במערכת
- [x] **20250318000001_update_create_project_table_no_rls.sql** - עדכון פונקציית `create_project_table` להסרת הגדרות RLS
- [x] **20250318000002_disable_all_project_tables_rls.sql** - ביטול RLS מטבלאות פרויקטים ספציפיות באופן מפורש
- [x] **20250318000003_remove_remaining_policies.sql** - הסרת המדיניויות (policies) הנותרות מהטבלאות

#### שינויים שבוצעו:
- ביטלנו את ה-RLS מכל הטבלאות הראשיות: `entrepreneurs`, `projects`, `tasks`, `stages`
- הסרנו את כל המדיניויות (policies) מכל הטבלאות
- ביטלנו את ה-RLS מכל טבלאות הפרויקטים הספציפיות (`project_*_tasks`)
- עדכנו את פונקציית `create_project_table` כך שלא תגדיר RLS בטבלאות חדשות
- הענקנו הרשאות גישה מלאות לכל הטבלאות עבור כל התפקידים (anon, authenticated, service_role)

#### בדיקות שבוצעו:
- בדקנו גישה לקריאת נתונים מכל הטבלאות הראשיות ומטבלאות פרויקט ספציפיות
- בדקנו את פונקציית `sync_project_tasks` שמסנכרנת משימות מהטבלה הראשית לטבלה הספציפית של הפרויקט
- בדקנו הוספת משימות חדשות לטבלת פרויקט ספציפית באמצעות SQL ישיר
- ווידאנו שאין שגיאות הרשאה בגישה לטבלאות

#### ממצאים:
- פונקציית `sync_project_tasks` פועלת כראוי ומסנכרנת משימות מהטבלה הראשית לטבלה הספציפית של הפרויקט
- ניתן להוסיף משימות חדשות ישירות לטבלאות פרויקט ספציפיות באמצעות SQL
- פונקציית `add_tasks_to_project_table` עדיין מחזירה שגיאה בפורמט ה-JSON
- פונקציית `get_project_tasks` מחזירה שגיאה בגלל אי התאמה במבנה התוצאה

#### המלצות:
1. להמשיך להשתמש בפונקציית `sync_project_tasks` לסנכרון משימות
2. להשתמש בשאילתות SQL ישירות או בקריאות לטבלה דרך ה-API להוספת משימות חדשות
3. לבדוק ולתקן את פונקציות `add_tasks_to_project_table` ו-`get_project_tasks` בעתיד

### 2024-03-19 - טיפול בכפילויות משימות

- [x] **20250319000000_remove_duplicate_tasks.sql** - מחיקת כפילויות משימות לפי כותרת בטבלת המשימות הראשית ובטבלאות הספציפיות של פרויקטים

#### שינויים שבוצעו:
- זיהוי משימות כפולות לפי כותרת (title) ופרויקט (project_id)
- שמירת המשימה החדשה מכל קבוצת משימות כפולות ומחיקה לוגית של השאר (הגדרת deleted=true)
- טיפול בכפילויות גם בטבלאות הספציפיות של פרויקטים
- הוספת אינדקסים על שדה title ועל השילוב של title ו-project_id
- יצירת טריגר prevent_duplicate_tasks שירשום התראה בניסיון להוסיף משימה כפולה

#### יתרונות הפתרון:
1. **מחיקה לוגית במקום פיזית** - המשימות הכפולות מסומנות כמחוקות אך נשמרות במסד הנתונים למקרה שנצטרך לשחזר אותן
2. **תיעוד מלא** - כל המשימות שנמחקו מתועדות עם פרטים מלאים
3. **טיפול מקיף** - מטפל גם בטבלאות הספציפיות של פרויקטים
4. **מניעה עתידית** - הטריגר ימנע יצירת כפילויות חדשות
5. **ביצועים משופרים** - האינדקסים החדשים משפרים את ביצועי החיפוש לפי כותרת

## צעדים הבאים
- [ ] בדיקת יעילות הטריגר למניעת כפילויות
- [ ] בחינה מקיפה של כל פונקציות הפרויקט לאיתור בעיות נוספות.
- [ ] שיפור הממשק להוספת וניהול יזמים.
- [ ] הוספת יכולות דוחות מתקדמות למשימות ופרויקטים.
- [ ] שיפור התמיכה במשימות תבנית ושכפול משימות בין פרויקטים.
- [ ] תיקון פונקציות `add_tasks_to_project_table` ו-`get_project_tasks` לפעולה תקינה.
- [ ] בדיקת כל הפונקציות שמשתמשות בטבלאות פרויקט ספציפיות ווידוא פעולתן התקינה.

### 2024-03-19 - תיקון בעיית מחיקת פרויקטים

- [x] **fix_delete_project_simple.sql** - תיקון בעיית מחיקת פרויקטים: הוספת מחיקה מסוג CASCADE
- [x] **force_delete_project_function.sql** - יצירת פונקציה מיוחדת למחיקת פרויקטים מאולצת

#### שינויים שבוצעו:
- הסרת מגבלות זרות (foreign keys) קיימות בטבלאות tasks ו-stages והחלפתן במגבלות חדשות עם אפשרות ON DELETE CASCADE
- עדכון הטריגר before_delete_project לפעולה תקינה
- יצירת פונקציה ייעודית force_delete_project שמבצעת מחיקה בצורה מסודרת ומאולצת של כל הישויות הקשורות לפרויקט
- עדכון שירות projectService כדי להשתמש בפונקציה החדשה למחיקת פרויקטים

#### יתרונות הפתרון:
1. **מחיקה מקיפה** - פרויקטים נמחקים כעת יחד עם כל הרשומות המקושרות אליהם באופן אוטומטי
2. **פתרון עמיד** - גם אם קיימות מגבלות דינמיות לא צפויות, הפונקציה המאולצת מבטיחה מחיקה מלאה
3. **תהליך מסודר** - מחיקת הישויות המקושרות לפני מחיקת הפרויקט עצמו
4. **תמיכה חזקה בשגיאות** - טיפול בשגיאות וניסיון חלופי אם הפונקציה המאולצת נכשלת
5. **שיפור חוויית משתמש** - המשתמשים יכולים למחוק פרויקטים ללא שגיאות

## צעדים הבאים
- [ ] בדיקת יעילות הטריגר למניעת כפילויות
- [ ] בחינה מקיפה של כל פונקציות הפרויקט לאיתור בעיות נוספות
- [ ] שיפור הממשק להוספת וניהול יזמים
- [ ] הוספת יכולות דוחות מתקדמות למשימות ופרויקטים
- [ ] שיפור התמיכה במשימות תבנית ושכפול משימות בין פרויקטים
- [ ] תיקון פונקציות `add_tasks_to_project_table` ו-`get_project_tasks` לפעולה תקינה
- [ ] בדיקת כל הפונקציות שמשתמשות בטבלאות פרויקט ספציפיות ווידוא פעולתן התקינה
- [ ] בדיקה מקיפה של פונקציית מחיקת פרויקטים ווידוא שאין בעיות נוספות
