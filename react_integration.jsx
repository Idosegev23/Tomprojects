// דוגמה לקומפוננטה בריאקט שמאפשרת יצירת פרויקט חדש עם בחירת משימות

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router'; // אם משתמשים ב-Next.js
import { createClient } from '@supabase/supabase-js';

// יצירת לקוח Supabase - החלף את ה-URL וה-API Key בערכים האמיתיים
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * פונקציה שיוצרת פרויקט חדש ומעתיקה אליו את המשימות שנבחרו
 */
async function createProjectWithSelectedTasks(projectData, selectedTaskIds) {
  try {
    // 1. יצירת רשומת הפרויקט בטבלת projects
    // הטריגר project_after_insert_trigger יופעל אוטומטית ויכין את הטבלאות הבסיסיות
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert([projectData])
      .select()
      .single();
    
    if (projectError) throw projectError;
    
    console.log('פרויקט נוצר בהצלחה:', project);
    
    // 2. אם אין משימות שנבחרו, לא צריך לעשות כלום נוסף
    if (!selectedTaskIds || selectedTaskIds.length === 0) {
      return { success: true, project };
    }
    
    // 3. קריאה לפונקציה שמעתיקה את המשימות שנבחרו לפרויקט
    const { data, error: taskError } = await supabase.rpc('init_project_with_selected_tasks', {
      project_id_param: project.id,
      selected_task_ids: selectedTaskIds
    });
    
    if (taskError) throw taskError;
    
    console.log('תוצאת אתחול המשימות בפרויקט:', data);
    
    return {
      success: true,
      project,
      initResult: data
    };
  } catch (err) {
    console.error('שגיאה ביצירת הפרויקט עם המשימות הנבחרות:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * קומפוננטת טופס ליצירת פרויקט חדש עם בחירת משימות
 */
export default function CreateProjectForm() {
  const router = useRouter();
  
  // משתני State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [allTasks, setAllTasks] = useState([]);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  // טעינת כל המשימות הקיימות במערכת
  useEffect(() => {
    async function loadTasks() {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, description, status')
        .order('title');
      
      if (error) {
        console.error('שגיאה בטעינת המשימות:', error);
        setError('לא ניתן לטעון את רשימת המשימות');
      } else {
        setAllTasks(data || []);
      }
      
      setIsLoading(false);
    }
    
    loadTasks();
  }, []);
  
  // טיפול בשינוי מצב בחירת משימה (הוספה או הסרה מהמשימות הנבחרות)
  const handleTaskSelection = (taskId) => {
    setSelectedTasks(prev => {
      if (prev.includes(taskId)) {
        // המשימה כבר נבחרה - מסיר אותה
        return prev.filter(id => id !== taskId);
      } else {
        // המשימה לא נבחרה - מוסיף אותה
        return [...prev, taskId];
      }
    });
  };
  
  // טיפול בשליחת הטופס
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // וידוא שיש שם לפרויקט ושנבחרו משימות
    if (!name.trim()) {
      setError('חובה להזין שם לפרויקט');
      return;
    }
    
    if (selectedTasks.length === 0) {
      setError('יש לבחור לפחות משימה אחת לפרויקט');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    // יצירת אובייקט נתוני הפרויקט
    const projectData = {
      name: name.trim(),
      description: description.trim(),
      status: 'planning',
      priority,
      progress: 0,
      // אפשר להוסיף כאן שדות נוספים לפי הצורך
    };
    
    // קריאה לפונקציה שיוצרת את הפרויקט עם המשימות הנבחרות
    const result = await createProjectWithSelectedTasks(projectData, selectedTasks);
    
    setIsSubmitting(false);
    
    if (result.success) {
      // הצלחה - ניווט לדף הפרויקט החדש
      router.push(`/projects/${result.project.id}`);
    } else {
      // כישלון - הצגת הודעת שגיאה
      setError(result.error || 'אירעה שגיאה ביצירת הפרויקט');
    }
  };
  
  // UI - טופס יצירת פרויקט
  return (
    <div className="create-project-container">
      <h1>יצירת פרויקט חדש</h1>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        {/* פרטי הפרויקט */}
        <div className="form-section">
          <h2>פרטי הפרויקט</h2>
          
          <div className="form-group">
            <label htmlFor="name">שם הפרויקט *</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="הזן שם לפרויקט"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="description">תיאור</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="תיאור הפרויקט (אופציונלי)"
              rows="3"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="priority">עדיפות</label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="low">נמוכה</option>
              <option value="medium">בינונית</option>
              <option value="high">גבוהה</option>
            </select>
          </div>
        </div>
        
        {/* בחירת משימות */}
        <div className="form-section">
          <h2>בחירת משימות</h2>
          <p className="help-text">סמן את המשימות שברצונך לכלול בפרויקט החדש</p>
          
          {isLoading ? (
            <div className="loading">טוען משימות...</div>
          ) : (
            <div className="tasks-list">
              {allTasks.length === 0 ? (
                <p>לא נמצאו משימות במערכת</p>
              ) : (
                <>
                  <div className="task-list-header">
                    <span className="selection">
                      <button 
                        type="button" 
                        onClick={() => setSelectedTasks(allTasks.map(t => t.id))}
                        className="select-button"
                      >
                        בחר הכל
                      </button>
                      <button 
                        type="button"
                        onClick={() => setSelectedTasks([])}
                        className="select-button"
                      >
                        נקה הכל
                      </button>
                    </span>
                    <span className="selected-count">
                      נבחרו {selectedTasks.length} מתוך {allTasks.length} משימות
                    </span>
                  </div>
                  
                  <div className="tasks-container">
                    {allTasks.map(task => (
                      <div key={task.id} className="task-item">
                        <input
                          type="checkbox"
                          id={`task-${task.id}`}
                          checked={selectedTasks.includes(task.id)}
                          onChange={() => handleTaskSelection(task.id)}
                        />
                        <label htmlFor={`task-${task.id}`}>
                          <span className="task-title">{task.title}</span>
                          {task.description && (
                            <span className="task-description">{task.description}</span>
                          )}
                          <span className={`task-status status-${task.status}`}>
                            {task.status === 'todo' && 'לביצוע'}
                            {task.status === 'in_progress' && 'בתהליך'}
                            {task.status === 'done' && 'הושלם'}
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        
        {/* כפתורים */}
        <div className="form-actions">
          <button
            type="button"
            onClick={() => router.back()}
            className="button secondary"
            disabled={isSubmitting}
          >
            ביטול
          </button>
          
          <button
            type="submit"
            className="button primary"
            disabled={isSubmitting || !name || selectedTasks.length === 0}
          >
            {isSubmitting ? 'יוצר פרויקט...' : 'צור פרויקט'}
          </button>
        </div>
      </form>
    </div>
  );
}

// סגנון CSS בסיסי - אפשר להעביר לקובץ נפרד
/*
.create-project-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  direction: rtl;
}

.form-section {
  margin-bottom: 30px;
  border: 1px solid #e1e1e1;
  border-radius: 8px;
  padding: 20px;
  background: #f9f9f9;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

input[type="text"],
textarea,
select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.tasks-list {
  margin-top: 15px;
}

.task-list-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.select-button {
  background: none;
  border: none;
  color: #3182ce;
  cursor: pointer;
  margin-left: 10px;
  font-size: 14px;
}

.tasks-container {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.task-item {
  padding: 10px;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: flex-start;
}

.task-item:last-child {
  border-bottom: none;
}

.task-item input[type="checkbox"] {
  margin-left: 10px;
  margin-top: 5px;
}

.task-item label {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.task-title {
  font-weight: bold;
}

.task-description {
  font-size: 14px;
  color: #666;
  margin-top: 3px;
}

.task-status {
  font-size: 12px;
  margin-top: 5px;
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
}

.status-todo {
  background-color: #FED7D7;
  color: #C53030;
}

.status-in_progress {
  background-color: #FEEBC8;
  color: #9C4221;
}

.status-done {
  background-color: #C6F6D5;
  color: #2F855A;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.button {
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  border: none;
  font-size: 16px;
}

.button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.primary {
  background-color: #3182ce;
  color: white;
}

.secondary {
  background-color: #e2e8f0;
  color: #4a5568;
}

.error-message {
  background-color: #FED7D7;
  color: #C53030;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.help-text {
  color: #666;
  font-size: 14px;
  margin-bottom: 10px;
}
*/ 