-- מיגרציית נתונים מהמבנה הישן למבנה החדש

-- העברת נתוני פרויקטים מהטבלה הישנה לחדשה
INSERT INTO projects (
    id, 
    name, 
    description, 
    entrepreneur_id,
    status,
    priority,
    total_budget,
    planned_start_date,
    planned_end_date,
    actual_start_date,
    actual_end_date,
    progress,
    created_at,
    updated_at
)
SELECT 
    id,
    name,
    description,
    entrepreneur_id,
    status,
    priority,
    total_budget,
    planned_start_date,
    planned_end_date,
    actual_start_date,
    actual_end_date,
    progress,
    created_at,
    updated_at
FROM projects_old
ON CONFLICT (id) DO NOTHING;

-- העברת נתונים מטבלת stages (שלבים) לטבלת milestones (אבני דרך)
INSERT INTO milestones (
    id,
    title,
    description,
    project_id,
    created_at,
    updated_at,
    sort_order
)
SELECT 
    id,
    title,
    description,
    project_id,
    created_at,
    updated_at,
    ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at) as sort_order
FROM stages_old
ON CONFLICT (id) DO NOTHING;

-- העברת נתונים מטבלת tasks הישנה לטבלת tasks החדשה
INSERT INTO tasks (
    id,
    title,
    description,
    project_id,
    milestone_id, -- במקום stage_id
    parent_task_id,
    hierarchical_number,
    status,
    priority,
    category,
    responsible,
    estimated_hours,
    actual_hours,
    planned_start_date, -- במקום start_date
    planned_end_date, -- במקום due_date
    completed_date,
    budget,
    deleted,
    created_at,
    updated_at,
    task_level -- חישוב רמת המשימה
)
SELECT 
    id,
    title,
    description,
    project_id,
    stage_id, -- שימוש בשדה stage_id הקיים כמפתח זר למטבלת milestones
    parent_task_id,
    hierarchical_number,
    status,
    priority,
    category,
    responsible,
    estimated_hours,
    actual_hours,
    start_date,
    due_date,
    completed_date,
    budget,
    deleted,
    created_at,
    updated_at,
    CASE 
        WHEN parent_task_id IS NULL THEN 1 -- משימה ראשית
        WHEN EXISTS (
            SELECT 1 
            FROM tasks_old t2 
            WHERE t2.parent_task_id = tasks_old.id
        ) THEN 2 -- תת משימה שיש לה תתי משימות
        ELSE 3 -- תת תת משימה
    END as task_level
FROM tasks_old
ON CONFLICT (id) DO NOTHING;

-- עדכון task_level למשימות שלא התעדכנו נכון
UPDATE tasks
SET task_level = 2
WHERE id IN (
    SELECT parent_task_id 
    FROM tasks 
    WHERE parent_task_id IS NOT NULL
) 
AND task_level = 1;

-- עדכון task_level למשימות רמה 3
UPDATE tasks
SET task_level = 3
WHERE parent_task_id IN (
    SELECT id 
    FROM tasks 
    WHERE task_level = 2
);

-- עדכון שדה is_planned 
UPDATE tasks
SET is_planned = (task_level < 3); -- משימות רמה 1 ו-2 הן מתוכננות, רמה 3 הן אד-הוק 