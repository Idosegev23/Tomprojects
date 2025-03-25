// דוגמה לשימוש ב-JavaScript עם Supabase לאתחול פרויקט עם משימות נבחרות

import { createClient } from '@supabase/supabase-js';

// יצירת לקוח Supabase
const supabaseUrl = 'https://your-project-url.supabase.co';
const supabaseKey = 'your-api-key';
const supabase = createClient(supabaseUrl, supabaseKey);

// פונקציה ליצירת פרויקט חדש ואתחול משימות נבחרות
async function createProjectWithSelectedTasks(projectData, selectedTaskIds) {
  try {
    // 1. יצירת פרויקט חדש
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert([projectData])
      .select()
      .single();
    
    if (projectError) throw projectError;
    
    console.log('פרויקט נוצר בהצלחה:', project);
    
    // בזכות הטריגר, הטבלאות כבר נוצרו אוטומטית
    // אבל אנחנו רוצים לוודא שרק המשימות שנבחרו יועתקו
    
    // 2. קריאה ישירה לפונקציה עם המשימות שנבחרו
    const { data, error } = await supabase.rpc('init_project_tables_and_data', {
      project_id_param: project.id,
      create_default_stages: true,
      create_default_tasks: true,
      selected_task_ids: selectedTaskIds  // מערך ה-UUID של המשימות שנבחרו בצ'קבוקס
    });
    
    if (error) throw error;
    
    console.log('אתחול הפרויקט הושלם בהצלחה');
    return project;
    
  } catch (error) {
    console.error('שגיאה ביצירת הפרויקט:', error);
    throw error;
  }
}

// --------------- דוגמה לשימוש -----------------

// דוגמה לנתוני פרויקט חדש
const newProject = {
  name: 'פרויקט חדש',
  description: 'תיאור הפרויקט',
  owner: 'שם המשתמש',
  status: 'planning',
  priority: 'high',
  progress: 0
};

// המזהים של המשימות שנבחרו בצ'קבוקס
// אלה צריכים להגיע מהטופס או מהממשק משתמש
const selectedTasks = [
  '3fa85f64-5717-4562-b3fc-2c963f66afa6',  // המזהה של משימה 1
  '7fa85f64-5717-4562-b3fc-2c963f66afa9'   // המזהה של משימה 2
];

// הפעלת הפונקציה
createProjectWithSelectedTasks(newProject, selectedTasks)
  .then(project => {
    console.log('מזהה הפרויקט החדש:', project.id);
  })
  .catch(error => {
    console.error('שגיאה:', error);
  });

// --------------- קריאה ישירה לאתחול פרויקט קיים -----------------

async function initExistingProject(projectId, selectedTaskIds) {
  try {
    // קריאה ישירה לפונקציית האתחול
    const { data, error } = await supabase.rpc('init_project_tables_and_data', {
      project_id_param: projectId,
      create_default_stages: true,
      create_default_tasks: true,
      selected_task_ids: selectedTaskIds
    });
    
    if (error) throw error;
    
    console.log('אתחול הפרויקט הקיים הושלם בהצלחה');
    
  } catch (error) {
    console.error('שגיאה באתחול הפרויקט:', error);
    throw error;
  }
} 