-- מיגרציה להוספת שדות היררכיים לטבלאות tasks ו-stages
-- תאריך: 20-03-2025

-- הוספת שדה hierarchical_number לטבלת stages אם הוא לא קיים
ALTER TABLE stages ADD COLUMN IF NOT EXISTS hierarchical_number TEXT;

-- בדיקה אם השדה hierarchical_number קיים בטבלת tasks
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'tasks'
        AND column_name = 'hierarchical_number'
    ) THEN
        -- הוספת שדה hierarchical_number לטבלת tasks אם הוא לא קיים
        ALTER TABLE tasks ADD COLUMN hierarchical_number TEXT;
    END IF;
END $$;

-- בדיקה אם השדה parent_task_id קיים בטבלת tasks
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'tasks'
        AND column_name = 'parent_task_id'
    ) THEN
        -- הוספת שדה parent_task_id לטבלת tasks אם הוא לא קיים
        ALTER TABLE tasks ADD COLUMN parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;
    END IF;
END $$;

-- יצירת אינדקסים על השדות החדשים
CREATE INDEX IF NOT EXISTS stages_hierarchical_number_idx ON stages (hierarchical_number);
CREATE INDEX IF NOT EXISTS tasks_hierarchical_number_idx ON tasks (hierarchical_number);
CREATE INDEX IF NOT EXISTS tasks_parent_task_id_idx ON tasks (parent_task_id);

-- הוספת אילוץ זרות לשדה parent_task_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'tasks'
        AND ccu.column_name = 'id'
        AND ccu.table_name = 'tasks'
        AND tc.constraint_name LIKE '%parent_task_id%'
    ) THEN
        -- הוספת אילוץ זרות אם הוא לא קיים
        ALTER TABLE tasks 
        ADD CONSTRAINT tasks_parent_task_id_fkey 
        FOREIGN KEY (parent_task_id) 
        REFERENCES tasks(id) 
        ON DELETE SET NULL;
    END IF;
END $$; 