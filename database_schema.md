# סכמת מסד הנתונים

**עודכן לאחרונה:** 2025-03-13 17:10:04

## טבלאות במסד הנתונים

### טבלה: projects

| עמודה | סוג נתונים | ברירת מחדל | ניתן להיות ריק |
|-------|------------|-------------|-----------------|
| name | text | null | NO |
| owner | text | null | YES |
| created_at | timestamp without time zone | now() | YES |
| updated_at | timestamp without time zone | now() | YES |
| id | uuid | null | NO |
| status | text | 'planning'::text | YES |
| total_budget | numeric | null | YES |
| planned_start_date | date | null | YES |
| planned_end_date | date | null | YES |
| actual_start_date | date | null | YES |
| actual_end_date | date | null | YES |
| project_manager_id | uuid | null | YES |
| priority | text | 'medium'::text | YES |
| progress | integer | 0 | YES |

#### מפתחות ואילוצים

**מפתח ראשי:** id

---

### טבלה: stages

| עמודה | סוג נתונים | ברירת מחדל | ניתן להיות ריק |
|-------|------------|-------------|-----------------|
| title | text | null | NO |
| description | text | null | YES |
| created_at | timestamp without time zone | now() | YES |
| updated_at | timestamp without time zone | now() | YES |
| id | uuid | null | NO |
| project_id | uuid | null | YES |

#### מפתחות ואילוצים

**מפתח ראשי:** id

**מפתחות זרים:**
- project_id -> projects(id)

---

### טבלה: tasks

| עמודה | סוג נתונים | ברירת מחדל | ניתן להיות ריק |
|-------|------------|-------------|-----------------|
| id | uuid | uuid_generate_v4() | NO |
| project_id | uuid | null | YES |
| stage_id | uuid | null | YES |
| title | text | null | NO |
| description | text | null | YES |
| category | text | null | YES |
| status | text | 'todo'::text | YES |
| priority | text | 'medium'::text | YES |
| responsible | uuid | null | YES |
| estimated_hours | numeric | null | YES |
| actual_hours | numeric | null | YES |
| start_date | date | null | YES |
| due_date | date | null | YES |
| completed_date | date | null | YES |
| budget | numeric | null | YES |
| dependencies | ARRAY | null | YES |
| assignees | ARRAY | null | YES |
| watchers | ARRAY | null | YES |
| labels | ARRAY | null | YES |
| deleted | boolean | false | YES |
| created_at | timestamp with time zone | now() | YES |
| updated_at | timestamp with time zone | now() | YES |
| hierarchical_number | text | null | YES |
| parent_task_id | uuid | null | YES |

#### מפתחות ואילוצים

**מפתח ראשי:** id

**מפתחות זרים:**
- project_id -> projects(id)
- stage_id -> stages(id)
- parent_task_id -> tasks(id)

---

## הערות נוספות

- הסכמה הזו נוצרה אוטומטית באמצעות סקריפט `update_schema.sh`
- כדי לעדכן את הסכמה, הרץ את הסקריפט שוב
- הסקריפט משתמש במידע מהמסמך `build_tracking.md`
- כדי לעדכן את הסכמה באופן אוטומטי בעת שינויים, ניתן להוסיף את הסקריפט לתהליך ה-CI/CD
