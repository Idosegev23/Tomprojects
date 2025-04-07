-- מיגרציה להוספת פונקציית get_tasks_tree לקבלת עץ המשימות
-- תאריך: 14-07-2024

-- בדיקה והסרה של הפונקציה אם היא כבר קיימת
DROP FUNCTION IF EXISTS get_tasks_tree(project_id_param text);

-- יצירת הפונקציה החדשה שתחזיר את עץ המשימות
CREATE OR REPLACE FUNCTION get_tasks_tree(project_id_param text)
RETURNS jsonb AS $$
DECLARE
    project_table_name text := 'project_' || project_id_param || '_tasks';
    all_tasks jsonb;
    tasks_tree jsonb;
    project_exists boolean;
BEGIN
    -- בדיקה אם טבלת הפרויקט קיימת
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = project_table_name
    ) INTO project_exists;
    
    -- אם הטבלה קיימת, נשתמש בה, אחרת נשתמש בטבלה הראשית
    IF project_exists THEN
        -- שליפת משימות מהטבלה הספציפית של הפרויקט
        EXECUTE format('
            SELECT jsonb_agg(
                jsonb_build_object(
                    ''id'', id,
                    ''title'', title,
                    ''description'', description,
                    ''status'', status,
                    ''due_date'', due_date,
                    ''start_date'', start_date,
                    ''completed_date'', completed_date,
                    ''responsible'', responsible,
                    ''project_id'', project_id,
                    ''stage_id'', stage_id,
                    ''parent_task_id'', parent_task_id,
                    ''hierarchical_number'', hierarchical_number,
                    ''hierarchical_order'', hierarchical_order,
                    ''original_task_id'', original_task_id,
                    ''dropbox_folder'', dropbox_folder
                )
            ) FROM %I WHERE project_id = ''%s''',
            project_table_name, project_id_param
        ) INTO all_tasks;
    ELSE
        -- שליפת משימות מהטבלה הראשית
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', t.id,
                'title', t.title,
                'description', t.description,
                'status', t.status,
                'due_date', t.due_date,
                'start_date', t.start_date,
                'completed_date', t.completed_date,
                'responsible', t.responsible,
                'project_id', t.project_id,
                'stage_id', t.stage_id,
                'parent_task_id', t.parent_task_id,
                'hierarchical_number', t.hierarchical_number,
                'hierarchical_order', t.hierarchical_order,
                'original_task_id', t.original_task_id,
                'dropbox_folder', t.dropbox_folder
            )
        )
        FROM tasks t
        WHERE t.project_id = project_id_param
        INTO all_tasks;
    END IF;
    
    -- התמודדות עם מקרה שאין משימות
    IF all_tasks IS NULL THEN
        RETURN jsonb_build_array();
    END IF;
    
    -- בניית עץ ההיררכיה של המשימות
    WITH RECURSIVE task_tree AS (
        SELECT 
            t.*,
            0 AS depth,
            t.id::text AS path
        FROM jsonb_array_elements(all_tasks) AS t
        WHERE t->>'parent_task_id' IS NULL
        
        UNION ALL
        
        SELECT 
            c.*,
            tt.depth + 1,
            tt.path || '/' || c.id::text
        FROM task_tree tt
        JOIN jsonb_array_elements(all_tasks) AS c ON c->>'parent_task_id' = tt.id::text
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', t.id,
            'title', t.title,
            'description', t.description,
            'status', t.status,
            'due_date', t.due_date,
            'start_date', t.start_date,
            'completed_date', t.completed_date,
            'responsible', t.responsible,
            'project_id', t.project_id,
            'stage_id', t.stage_id,
            'parent_task_id', t.parent_task_id,
            'hierarchical_number', t.hierarchical_number,
            'hierarchical_order', t.hierarchical_order,
            'depth', t.depth,
            'path', t.path,
            'dropbox_folder', t.dropbox_folder,
            'children', (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', c.id,
                        'title', c.title,
                        'description', c.description,
                        'status', c.status,
                        'due_date', c.due_date,
                        'start_date', c.start_date,
                        'completed_date', c.completed_date,
                        'responsible', c.responsible,
                        'project_id', c.project_id,
                        'stage_id', c.stage_id,
                        'parent_task_id', c.parent_task_id,
                        'hierarchical_number', c.hierarchical_number,
                        'hierarchical_order', c.hierarchical_order,
                        'depth', c.depth,
                        'path', c.path,
                        'dropbox_folder', c.dropbox_folder,
                        'children', '[]'::jsonb
                    )
                )
                FROM task_tree c
                WHERE c->>'parent_task_id' = t.id::text
            )
        )
    )
    FROM task_tree t
    WHERE t->>'parent_task_id' IS NULL
    INTO tasks_tree;
    
    -- התמודדות עם מקרה שאין משימות שורש
    IF tasks_tree IS NULL THEN
        RETURN jsonb_build_array();
    END IF;
    
    RETURN tasks_tree;
END;
$$ LANGUAGE plpgsql;

-- הרשאות גישה לפונקציה
GRANT EXECUTE ON FUNCTION get_tasks_tree(text) TO anon, authenticated, service_role; 