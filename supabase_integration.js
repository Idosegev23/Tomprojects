// קובץ דוגמה לאינטגרציה עם Supabase ויצירת פרויקטים עם משימות נבחרות
// צד לקוח - React / Next.js

import { createClient } from '@supabase/supabase-js';

// יצירת לקוח Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * פונקציה ליצירת פרויקט חדש והעתקת משימות נבחרות אליו
 * @param {Object} projectData - נתוני הפרויקט החדש (שם, תיאור וכו')
 * @param {Array<string>} selectedTaskIds - מערך של מזהי המשימות שנבחרו
 * @returns {Promise<Object>} - אובייקט המכיל את הפרויקט שנוצר
 */
export async function createProjectWithSelectedTasks(projectData, selectedTaskIds = []) {
  try {
    // הוספת האם יש לבצע זריקת שגיאה כאשר אירעה שגיאה
    const throwOnError = true;
    
    // 1. יצירת פרויקט חדש
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert([projectData])
      .select()
      .single();
    
    if (projectError) {
      console.error('שגיאה ביצירת הפרויקט:', projectError);
      if (throwOnError) throw projectError;
      return { error: projectError };
    }
    
    console.log('פרויקט נוצר בהצלחה:', project);
    
    // 2. אם יש משימות נבחרות - העתקת המשימות לפרויקט החדש
    if (selectedTaskIds && selectedTaskIds.length > 0) {
      const { error } = await supabase.rpc('init_project_with_selected_tasks', {
        project_id_param: project.id,
        selected_task_ids: selectedTaskIds
      });
      
      if (error) {
        console.error('שגיאה בהעתקת משימות לפרויקט:', error);
        if (throwOnError) throw error;
        return { project, error };
      }
      
      console.log('המשימות הנבחרות הועתקו בהצלחה לפרויקט');
    } else {
      console.log('לא נבחרו משימות להעתקה');
    }
    
    return { project };
    
  } catch (error) {
    console.error('שגיאה בתהליך יצירת הפרויקט עם המשימות:', error);
    throw error;
  }
}

/**
 * קומפוננטת React לדוגמה המציגה טופס יצירת פרויקט עם בחירת משימות
 * @returns {JSX.Element}
 */
export function CreateProjectForm() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tasks, setTasks] = useState([]);
  
  // טעינת המשימות הקיימות
  useEffect(() => {
    async function fetchTasks() {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, description')
        .order('title');
        
      if (!error && data) {
        setTasks(data);
      }
    }
    
    fetchTasks();
  }, []);
  
  // טיפול בשליחת הטופס
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const projectData = {
        name,
        description,
        status: 'planning',
        priority: 'medium',
        progress: 0
      };
      
      const { project, error } = await createProjectWithSelectedTasks(
        projectData, 
        selectedTasks
      );
      
      if (error) {
        alert('אירעה שגיאה: ' + error.message);
      } else {
        alert('הפרויקט נוצר בהצלחה עם המשימות הנבחרות!');
        setName('');
        setDescription('');
        setSelectedTasks([]);
      }
    } catch (err) {
      alert('אירעה שגיאה: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // עדכון המשימות שנבחרו
  const handleTaskSelection = (taskId) => {
    setSelectedTasks(prev => {
      if (prev.includes(taskId)) {
        return prev.filter(id => id !== taskId);
      } else {
        return [...prev, taskId];
      }
    });
  };
  
  return (
    <div className="project-form">
      <h2>יצירת פרויקט חדש</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">שם הפרויקט</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="description">תיאור</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        
        <div className="form-group">
          <label>משימות לשיוך לפרויקט</label>
          <div className="tasks-list">
            {tasks.map(task => (
              <div key={task.id} className="task-item">
                <input
                  type="checkbox"
                  id={`task-${task.id}`}
                  checked={selectedTasks.includes(task.id)}
                  onChange={() => handleTaskSelection(task.id)}
                />
                <label htmlFor={`task-${task.id}`}>{task.title}</label>
              </div>
            ))}
            {tasks.length === 0 && <p>אין משימות זמינות</p>}
          </div>
        </div>
        
        <button 
          type="submit" 
          disabled={isSubmitting || !name}
          className="submit-button"
        >
          {isSubmitting ? 'מעבד...' : 'צור פרויקט'}
        </button>
      </form>
    </div>
  );
}

// ייצוא חלקים שונים
export {
  supabase,
  createProjectWithSelectedTasks,
  CreateProjectForm
}; 