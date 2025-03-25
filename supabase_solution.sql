-- פתרון לבעיית העתקת משימות נבחרות ושלבים מתאימים לפרויקט חדש
-- מותאם לעבודה עם ממשק משתמש גרפי (צ'קבוקסים)
-- להעתקה והרצה בעורך SQL של סופאבייס

-- ======================================================================================
-- חלק 1: פונקציות בסיס
-- ======================================================================================

-- פונקציה 1: עדכון הפונקציה המרכזית לאתחול טבלאות פרויקט - טיפול נכון במשימות נבחרות
DROP FUNCTION IF EXISTS init_project_tables_and_data(uuid, boolean, boolean, uuid[]);
CREATE OR REPLACE FUNCTION init_project_tables_and_data(
  project_id_param uuid,
  create_default_stages boolean DEFAULT true,
  create_default_tasks boolean DEFAULT true,
  selected_task_ids uuid[] DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  tasks_table_name text := 'project_' || project_id_param::text || '_tasks';
  stages_table_name text := 'project_' || project_id_param::text || '_stages';
  task_id uuid;
  has_selected_tasks boolean := selected_task_ids IS NOT NULL AND array_length(selected_task_ids, 1) > 0;
BEGIN
  -- 1. וודא שטבלאות הפרויקט קיימות
  -- יצירת טבלת משימות ייחודית לפרויקט
  IF NOT check_table_exists(tasks_table_name) THEN
    PERFORM create_project_table(project_id_param);
  END IF;
  
  -- יצירת טבלת שלבים ייחודית לפרויקט
  IF NOT check_table_exists(stages_table_name) THEN
    PERFORM create_project_stages_table(project_id_param);
  END IF;
  
  -- 2. העתקת נתונים:
  -- A. אם נבחרו משימות ספציפיות (דרך צ'קבוקסים):
  IF has_selected_tasks THEN
    -- העתקת המשימות הנבחרות
    FOREACH task_id IN ARRAY selected_task_ids
    LOOP
      BEGIN
        PERFORM copy_task_to_project_table(task_id, project_id_param);
      EXCEPTION WHEN OTHERS THEN
        -- המשך גם אם נכשל
        NULL;
      END;
    END LOOP;
    
    -- בניית שלבים רק מהמשימות שנבחרו
    PERFORM build_stages_from_selected_tasks(project_id_param);
  
  -- B. אם לא נבחרו משימות ויש ליצור ברירות מחדל:
  ELSIF create_default_tasks THEN
    -- יצירת משימות ברירת מחדל
    EXECUTE format('
      INSERT INTO %I (id, project_id, title, status, created_at, updated_at)
      VALUES 
        (uuid_generate_v4(), %L, ''משימה ראשונה'', ''todo'', now(), now()),
        (uuid_generate_v4(), %L, ''משימה שנייה'', ''todo'', now(), now())
      ON CONFLICT DO NOTHING
    ', tasks_table_name, project_id_param, project_id_param);
    
    -- יצירת שלבים ברירת מחדל
    IF create_default_stages THEN
      PERFORM copy_stages_to_project_table(project_id_param);
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ======================================================================================
-- חלק 2: פונקציית עזר לבניית שלבים רק מהמשימות שנבחרו
-- ======================================================================================

-- פונקציה זו בונה את טבלת השלבים הייחודית לפרויקט רק מהשלבים הקשורים למשימות שנבחרו
CREATE OR REPLACE FUNCTION build_stages_from_selected_tasks(project_id_param uuid)
RETURNS void AS $$
DECLARE
  tasks_table_name text := 'project_' || project_id_param::text || '_tasks';
  stages_table_name text := 'project_' || project_id_param::text || '_stages';
  stage_record record;
  stage_ids uuid[];
BEGIN
  -- אם טבלת השלבים לא קיימת, צור אותה
  IF NOT check_table_exists(stages_table_name) THEN
    PERFORM create_project_stages_table(project_id_param);
  END IF;
  
  -- 1. מצא את כל השלבים הקשורים למשימות שכבר נמצאות בטבלת המשימות של הפרויקט
  EXECUTE format('
    SELECT array_agg(DISTINCT stage_id) FROM %I 
    WHERE stage_id IS NOT NULL
  ', tasks_table_name) INTO stage_ids;
  
  -- אם יש שלבים שקשורים למשימות:
  IF stage_ids IS NOT NULL THEN
    -- 2. העתק את השלבים הרלוונטיים מטבלת stages הכללית לטבלת השלבים של הפרויקט
    FOR stage_record IN 
      SELECT * FROM stages 
      WHERE id = ANY(stage_ids)
    LOOP
      -- העתקת השלב הספציפי לטבלת השלבים של הפרויקט
      BEGIN
        EXECUTE format('
          INSERT INTO %I (
            id, project_id, title, description, color, status, 
            progress, order_num, created_at, updated_at
          ) VALUES (
            %L, %L, %L, %L, %L, %L, 
            %L, %L, %L, %L
          )
          ON CONFLICT (id) DO NOTHING
        ', 
          stages_table_name,
          stage_record.id,
          project_id_param,
          stage_record.title,
          stage_record.description,
          stage_record.color,
          stage_record.status,
          stage_record.progress,
          stage_record.order_num,
          stage_record.created_at,
          stage_record.updated_at
        );
      EXCEPTION WHEN OTHERS THEN
        NULL; -- התעלם משגיאות
      END;
    END LOOP;
  END IF;
  
  -- 3. אם אין אף שלב בטבלת השלבים של הפרויקט, צור שלב ברירת מחדל אחד
  EXECUTE format('
    INSERT INTO %I (id, project_id, title, color, status, created_at, updated_at)
    SELECT 
      uuid_generate_v4(), %L, ''שלב ראשון'', ''#3182CE'', ''active'', now(), now()
    WHERE NOT EXISTS (SELECT 1 FROM %I)
  ', stages_table_name, project_id_param, stages_table_name);
  
  -- 4. עדכן את משימות הפרויקט שאין להן שלב להשתמש בשלב הראשון שקיים בטבלה
  EXECUTE format('
    WITH first_stage AS (
      SELECT id FROM %I ORDER BY order_num, created_at LIMIT 1
    )
    UPDATE %I t
    SET stage_id = (SELECT id FROM first_stage)
    WHERE t.stage_id IS NULL
  ', stages_table_name, tasks_table_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ======================================================================================
-- חלק 3: עדכון הטריגר כך שלא ייצור משימות ברירת מחדל באופן אוטומטי
-- ======================================================================================

-- פונקצית הטריגר - מתעדכנת כך שלא תיצור משימות ברירת מחדל
CREATE OR REPLACE FUNCTION project_after_insert_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- קריאה לפונקציה שיוצרת את טבלאות הפרויקט 
  -- create_default_tasks=false מונע יצירת משימות ברירת מחדל באופן אוטומטי
  -- אבל create_default_stages=true עדיין יוצר שלבים ברירת מחדל בשלב הראשוני
  PERFORM init_project_tables_and_data(NEW.id, true, false, NULL);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- עדכון/יצירה של הטריגר
DROP TRIGGER IF EXISTS project_after_insert_trigger ON projects;
CREATE TRIGGER project_after_insert_trigger
AFTER INSERT ON projects
FOR EACH ROW
EXECUTE FUNCTION project_after_insert_trigger();

-- ======================================================================================
-- חלק 4: פונקציית ממשק נוחה להעתקת משימות נבחרות
-- ======================================================================================

-- פונקציה שמתאימה לקריאה ישירה מ-JavaScript עם Supabase RPC
CREATE OR REPLACE FUNCTION init_project_with_selected_tasks(
  project_id_param uuid,
  selected_task_ids uuid[]
)
RETURNS jsonb AS $$
DECLARE
  tasks_count integer;
  stages_count integer;
  result jsonb;
BEGIN
  -- 1. בדיקה שהפרויקט קיים
  IF NOT EXISTS (SELECT 1 FROM projects WHERE id = project_id_param) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'פרויקט לא קיים'
    );
  END IF;
  
  -- 2. אם אין משימות נבחרות, החזר שגיאה
  IF selected_task_ids IS NULL OR array_length(selected_task_ids, 1) = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'לא נבחרו משימות'
    );
  END IF;
  
  -- 3. אתחול טבלאות הפרויקט עם המשימות הנבחרות
  PERFORM init_project_tables_and_data(
    project_id_param,
    true,  -- יצירת שלבים ברירת מחדל
    true,  -- לאפשר משימות ברירת מחדל (לא ישפיע כי יש משימות נבחרות)
    selected_task_ids
  );
  
  -- 4. ספירת התוצאות - כמה משימות ושלבים נוצרו
  EXECUTE format('SELECT COUNT(*) FROM project_%s_tasks', project_id_param) INTO tasks_count;
  EXECUTE format('SELECT COUNT(*) FROM project_%s_stages', project_id_param) INTO stages_count;
  
  -- 5. בניית תשובה בפורמט JSON
  result := jsonb_build_object(
    'success', true,
    'project_id', project_id_param,
    'tasks_count', tasks_count,
    'stages_count', stages_count,
    'message', 'הפרויקט אותחל בהצלחה עם ' || tasks_count || ' משימות ו-' || stages_count || ' שלבים'
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ======================================================================================
-- חלק 5: הענקת הרשאות
-- ======================================================================================

GRANT EXECUTE ON FUNCTION init_project_tables_and_data(uuid, boolean, boolean, uuid[]) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION build_stages_from_selected_tasks(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION project_after_insert_trigger() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION init_project_with_selected_tasks(uuid, uuid[]) TO anon, authenticated, service_role;

-- ======================================================================================
-- חלק 6: בדיקת הפתרון באמצעות SQL (לדוגמה בלבד)
-- ======================================================================================

-- להלן דוגמה לשימוש בפונקציות שנוצרו:
/*
-- 1. יצירת פרויקט חדש
INSERT INTO projects (
  name, description, status, priority, progress, owner
)
VALUES (
  'פרויקט חדש עם משימות נבחרות',
  'פרויקט לבדיקת העתקת משימות והשלבים שלהן',
  'planning',
  'medium',
  0,
  '{"name": "משתמש בדיקה"}'
) RETURNING id;
-- נניח שהפרויקט קיבל את המזהה: 00000000-0000-0000-0000-000000000000

-- 2. העתקת משימות נבחרות וקבלת תוצאה בפורמט JSON
SELECT init_project_with_selected_tasks(
  '00000000-0000-0000-0000-000000000000',  -- מזהה הפרויקט שנוצר
  ARRAY[  -- מערך המשימות שנבחרו בצ'קבוקסים
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333'
  ]
);
*/

-- ======================================================================================
-- חלק 7: הנחיות לאינטגרציה עם הקוד בצד הלקוח
-- ======================================================================================

/*
// דוגמת קוד JavaScript לשימוש בפתרון מצד הלקוח:

// 1. יצירת פרויקט חדש
async function createProjectWithSelectedTasks(projectData, selectedTaskIds) {
  try {
    // יצירת הפרויקט
    const { data: project, error } = await supabase
      .from('projects')
      .insert([projectData])
      .select()
      .single();
      
    if (error) throw error;
    
    // העתקת המשימות הנבחרות
    const { data, error: taskError } = await supabase.rpc(
      'init_project_with_selected_tasks',
      {
        project_id_param: project.id,
        selected_task_ids: selectedTaskIds
      }
    );
    
    if (taskError) throw taskError;
    
    return {
      success: true,
      project,
      initResult: data
    };
  } catch (err) {
    console.error('שגיאה ביצירת הפרויקט:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

// 2. בקומפוננטת React שלך:
function CreateProjectForm() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // טעינת כל המשימות להצגה בצ'קבוקסים
  useEffect(() => {
    async function loadTasks() {
      const { data } = await supabase
        .from('tasks')
        .select('id, title, description')
        .order('title');
      
      setAllTasks(data || []);
    }
    
    loadTasks();
  }, []);
  
  // הגשת הטופס
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const result = await createProjectWithSelectedTasks(
      {
        name,
        description,
        status: 'planning',
        priority: 'medium',
        progress: 0
      },
      selectedTasks
    );
    
    setIsSubmitting(false);
    
    if (result.success) {
      // נווט לעמוד הפרויקט החדש
      router.push(`/projects/${result.project.id}`);
    } else {
      alert('אירעה שגיאה: ' + result.error);
    }
  };
  
  // שינוי בחירת משימה
  const handleTaskSelection = (taskId) => {
    setSelectedTasks(prev => 
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* שדות הפרויקט */}
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="שם הפרויקט"
        required
      />
      
      <textarea
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="תיאור"
      />
      
      {/* רשימת משימות עם צ'קבוקסים */}
      <div className="tasks-selector">
        <h3>בחר משימות לפרויקט</h3>
        
        {allTasks.map(task => (
          <div key={task.id} className="task-checkbox">
            <input
              type="checkbox"
              id={`task-${task.id}`}
              checked={selectedTasks.includes(task.id)}
              onChange={() => handleTaskSelection(task.id)}
            />
            <label htmlFor={`task-${task.id}`}>{task.title}</label>
          </div>
        ))}
      </div>
      
      <button 
        type="submit" 
        disabled={isSubmitting || !name || selectedTasks.length === 0}
      >
        {isSubmitting ? 'מעבד...' : 'צור פרויקט'}
      </button>
    </form>
  );
}
*/ 