import supabase from '../supabase';
import { Task, NewTask, UpdateTask } from '@/types/supabase';

export const taskService = {
  // קריאת כל המשימות
  async getTasks(filters?: { projectId?: string, status?: string }): Promise<Task[]> {
    let query = supabase
      .from('tasks')
      .select('*')
      .order('due_date', { ascending: true });
    
    // הוספת סינון לפי פרויקט אם צריך
    if (filters?.projectId) {
      query = query.eq('project_id', filters.projectId);
    }
    
    // הוספת סינון לפי סטטוס אם צריך
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching tasks:', error);
      throw new Error(error.message);
    }
    
    return data || [];
  },
  
  // קריאת משימה אחת לפי מזהה
  async getTaskById(id: string): Promise<Task | null> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`Error fetching task with id ${id}:`, error);
      throw new Error(error.message);
    }
    
    return data;
  },
  
  // יצירת משימה חדשה
  async createTask(task: NewTask): Promise<Task> {
    // וידוא שיש מזהה UUID
    if (!task.id) {
      task.id = crypto.randomUUID();
    }
    
    // אם יש project_id ואין hierarchical_number, נחשב את המספר ההיררכי הבא
    if (task.project_id && !task.hierarchical_number) {
      // אם יש parent_task_id, נחשב את המספר ההיררכי הבא כתת-משימה
      if (task.parent_task_id) {
        task.hierarchical_number = await this.getNextSubHierarchicalNumber(task.parent_task_id);
      } else {
        // אחרת, נחשב את המספר ההיררכי הבא כמשימת שורש
        task.hierarchical_number = await this.getNextRootHierarchicalNumber(task.project_id);
      }
    }
    
    const { data, error } = await supabase
      .from('tasks')
      .insert(task)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating task:', error);
      throw new Error(error.message);
    }
    
    // אם יש project_id, נוסיף את המשימה גם לטבלה הייחודית של הפרויקט
    if (data.project_id) {
      try {
        // קריאה לפונקציה SQL להעתקת המשימה לטבלה הספציפית של הפרויקט
        await supabase.rpc('copy_task_to_project_table', {
          task_id: data.id,
          project_id: data.project_id
        });
        console.log(`Task ${data.id} added to project-specific table for project ${data.project_id}`);
      } catch (projectTableError) {
        console.error(`Error adding task to project-specific table for project ${data.project_id}:`, projectTableError);
        // נמשיך גם אם יש שגיאה בהוספה לטבלה הספציפית
      }
    }
    
    return data;
  },
  
  // עדכון משימה קיימת
  async updateTask(id: string, task: UpdateTask): Promise<Task> {
    // יצירת עותק של האובייקט task
    const cleanTask = { ...task };
    
    // טיפול בשדות תאריך ריקים - הסרתם מהאובייקט
    const dateFields = ['start_date', 'due_date', 'completed_date'];
    for (const field of dateFields) {
      if (cleanTask[field as keyof UpdateTask] === '') {
        delete cleanTask[field as keyof UpdateTask];
      }
    }
    
    console.log('Updating task with cleaned data:', cleanTask);
    
    // עדכון בטבלה הראשית
    const { data, error } = await supabase
      .from('tasks')
      .update(cleanTask)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error(`Error updating task with id ${id}:`, error);
      throw new Error(error.message);
    }
    
    // אם יש project_id, נעדכן את המשימה גם בטבלה הייחודית של הפרויקט
    if (data.project_id) {
      try {
        // קריאה לפונקציה SQL לעדכון המשימה בטבלה הספציפית של הפרויקט
        await supabase.rpc('update_task_in_project_table', {
          task_id: data.id,
          project_id: data.project_id
        });
        console.log(`Task ${data.id} updated in project-specific table for project ${data.project_id}`);
      } catch (projectTableError) {
        console.error(`Error updating task in project-specific table for project ${data.project_id}:`, projectTableError);
        // נמשיך גם אם יש שגיאה בעדכון בטבלה הספציפית
      }
    }
    
    return data;
  },
  
  // מחיקת משימה
  async deleteTask(id: string): Promise<void> {
    // קבלת המשימה לפני המחיקה כדי לדעת לאיזה פרויקט היא שייכת
    const { data: taskToDelete, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      console.error(`Error fetching task with id ${id} before deletion:`, fetchError);
      // נמשיך למחיקה גם אם לא הצלחנו לקבל את המשימה
    }
    
    // אם המשימה שייכת לפרויקט, נמחק אותה גם מהטבלה הייחודית של הפרויקט
    if (taskToDelete && taskToDelete.project_id) {
      try {
        // קריאה לפונקציה SQL למחיקת המשימה מהטבלה הספציפית של הפרויקט
        await supabase.rpc('delete_task_from_project_table', {
          task_id: id,
          project_id: taskToDelete.project_id
        });
        console.log(`Task ${id} deleted from project-specific table for project ${taskToDelete.project_id}`);
      } catch (projectTableError) {
        console.error(`Error deleting task from project-specific table for project ${taskToDelete.project_id}:`, projectTableError);
        // נמשיך גם אם יש שגיאה במחיקה מהטבלה הספציפית
      }
    }
    
    // מחיקה מהטבלה הראשית
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error(`Error deleting task with id ${id}:`, error);
      throw new Error(error.message);
    }
  },
  
  // קריאת משימות לפי שלב
  async getTasksByStage(stageId: string): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('stage_id', stageId)
      .order('hierarchical_number', { ascending: true });
    
    if (error) {
      console.error(`Error fetching tasks for stage ${stageId}:`, error);
      throw new Error(error.message);
    }
    
    return data || [];
  },
  
  // קריאת משימות משנה
  async getSubTasks(parentTaskId: string): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('parent_task_id', parentTaskId)
      .order('hierarchical_number', { ascending: true });
    
    if (error) {
      console.error(`Error fetching subtasks for task ${parentTaskId}:`, error);
      throw new Error(error.message);
    }
    
    return data || [];
  },
  
  // קריאת משימות מאוחרות
  async getOverdueTasks(): Promise<Task[]> {
    const today = new Date().toISOString().split('T')[0]; // יום נוכחי בפורמט YYYY-MM-DD
    
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .lt('due_date', today) // תאריך יעד מוקדם מהיום
      .not('status', 'eq', 'done') // משימות שלא הושלמו
      .order('due_date', { ascending: true });
    
    if (error) {
      console.error('Error fetching overdue tasks:', error);
      throw new Error(error.message);
    }
    
    return data || [];
  },
  
  // עדכון סטטוס משימה
  async updateTaskStatus(id: string, status: string): Promise<Task> {
    // וידוא שהסטטוס תקין ותואם לאילוצים בבסיס הנתונים
    const validStatuses = ['todo', 'in_progress', 'review', 'done'];
    
    console.log('updateTaskStatus - status before validation:', status);
    
    // המרת הסטטוס לאותיות קטנות
    let normalizedStatus = status.toLowerCase();
    
    if (!validStatuses.includes(normalizedStatus)) {
      // אם הסטטוס לא תקין, ננסה למפות אותו לערך תקין
      if (normalizedStatus === 'לביצוע' || normalizedStatus === 'to do' || normalizedStatus === 'todo') {
        normalizedStatus = 'todo';
      } else if (normalizedStatus === 'בתהליך' || normalizedStatus === 'in progress' || normalizedStatus === 'in_progress') {
        normalizedStatus = 'in_progress';
      } else if (normalizedStatus === 'בבדיקה' || normalizedStatus === 'in review' || normalizedStatus === 'review') {
        normalizedStatus = 'review';
      } else if (normalizedStatus === 'הושלם' || normalizedStatus === 'completed' || normalizedStatus === 'done') {
        normalizedStatus = 'done';
      } else {
        throw new Error(`סטטוס לא תקין: ${normalizedStatus}. הסטטוסים התקינים הם: ${validStatuses.join(', ')}`);
      }
    }
    
    console.log('updateTaskStatus - status after validation:', normalizedStatus);
    
    // עדכון רק של הסטטוס ותאריך העדכון, ללא שינוי בשדות אחרים
    const updateData: UpdateTask = { 
      status: normalizedStatus, 
      updated_at: new Date().toISOString() 
    };
    
    // עדכון המשימה
    return this.updateTask(id, updateData);
  },
  
  // עדכון שלב משימה
  async updateTaskStage(id: string, stageId: string): Promise<Task> {
    return this.updateTask(id, { stage_id: stageId, updated_at: new Date().toISOString() });
  },
  
  // קבלת המספר ההיררכי הבא למשימת אב בפרויקט
  async getNextRootHierarchicalNumber(projectId: string | null): Promise<string> {
    // אם אין project_id, נחזיר "1" כברירת מחדל
    if (!projectId) {
      return "1";
    }
    
    const { data, error } = await supabase
      .from('tasks')
      .select('hierarchical_number')
      .eq('project_id', projectId)
      .is('parent_task_id', null)
      .order('hierarchical_number', { ascending: false })
      .limit(1);
    
    if (error) {
      console.error(`Error getting next hierarchical number for project ${projectId}:`, error);
      throw new Error(error.message);
    }
    
    if (data && data.length > 0 && data[0].hierarchical_number) {
      // מצאנו את המספר האחרון, נגדיל ב-1
      const lastNumber = parseInt(data[0].hierarchical_number.split('.')[0]);
      return `${lastNumber + 1}`;
    }
    
    // אם אין משימות קיימות, נתחיל מ-1
    return '1';
  },
  
  // קבלת המספר ההיררכי הבא לתת-משימה
  async getNextSubHierarchicalNumber(parentTaskId: string): Promise<string> {
    // קבלת המשימה האב
    const parentTask = await this.getTaskById(parentTaskId);
    if (!parentTask || !parentTask.hierarchical_number) {
      throw new Error(`Parent task ${parentTaskId} not found or has no hierarchical number`);
    }
    
    // קבלת תתי-המשימות הקיימות
    const { data, error } = await supabase
      .from('tasks')
      .select('hierarchical_number')
      .eq('parent_task_id', parentTaskId)
      .order('hierarchical_number', { ascending: false })
      .limit(1);
    
    if (error) {
      console.error(`Error getting next sub-hierarchical number for parent task ${parentTaskId}:`, error);
      throw new Error(error.message);
    }
    
    if (data && data.length > 0 && data[0].hierarchical_number) {
      // מצאנו את המספר האחרון, נגדיל את המספר האחרון ב-1
      const parts = data[0].hierarchical_number.split('.');
      const lastPart = parseInt(parts[parts.length - 1]);
      parts[parts.length - 1] = (lastPart + 1).toString();
      return parts.join('.');
    }
    
    // אם אין תתי-משימות קיימות, נוסיף ".1" למספר ההיררכי של האב
    return `${parentTask.hierarchical_number}.1`;
  },
  
  // קבלת כל המשימות בפרויקט במבנה היררכי
  async getHierarchicalTasks(projectId: string): Promise<Task[]> {
    // קבלת כל המשימות בפרויקט
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('hierarchical_number', { ascending: true });
    
    if (error) {
      console.error(`Error fetching hierarchical tasks for project ${projectId}:`, error);
      throw new Error(error.message);
    }
    
    return data || [];
  },

  // קבלת משימות שאינן משויכות לפרויקט
  async getUnassignedTasks(): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .is('project_id', null)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching unassigned tasks:', error);
      throw new Error(error.message);
    }
    
    return data || [];
  },
  
  // שיוך משימות לפרויקט
  async assignTasksToProject(taskIds: string[], projectId: string): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .update({ project_id: projectId })
      .in('id', taskIds)
      .select();
    
    if (error) {
      console.error('Error assigning tasks to project:', error);
      throw new Error(error.message);
    }
    
    return data || [];
  },
  
  // שכפול משימות ושיוך לפרויקט חדש
  async cloneTasksToProject(taskIds: string[], projectId: string, stageId: string): Promise<Task[]> {
    // קבלת המשימות המקוריות
    const { data: originalTasks, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .in('id', taskIds);
    
    if (fetchError) {
      console.error('Error fetching original tasks:', fetchError);
      throw new Error(fetchError.message);
    }
    
    if (!originalTasks || originalTasks.length === 0) {
      return [];
    }
    
    // יצירת עותקים של המשימות עם מזהים חדשים ושיוך לפרויקט החדש
    const clonedTasks = originalTasks.map(task => {
      const newTask = {
        ...task,
        id: crypto.randomUUID(),
        project_id: projectId,
        stage_id: stageId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        original_task_id: task.id // שמירת המזהה המקורי
      };
      
      // אם יש מספר היררכי, נאפס אותו כדי שייקבע מחדש
      if (newTask.hierarchical_number) {
        newTask.hierarchical_number = null;
      }
      
      return newTask;
    });
    
    // הוספת המשימות המשוכפלות לטבלה הראשית
    const { data, error } = await supabase
      .from('tasks')
      .insert(clonedTasks)
      .select();
    
    if (error) {
      console.error('Error cloning tasks to project:', error);
      throw new Error(error.message);
    }
    
    // כרגע לא נוסיף את המשימות לטבלה הייחודית של הפרויקט
    // כיוון שהפונקציות SQL הנדרשות לא קיימות במסד הנתונים
    console.log(`Note: Adding cloned tasks to project-specific table for project ${projectId} is currently disabled.`);
    
    return data || [];
  },
  
  // קבלת כל המשימות הזמינות לשכפול
  async getAllTaskTemplates(): Promise<Task[]> {
    try {
      // מחזיר את כל המשימות בטבלה כתבניות
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('title', { ascending: true });
      
      if (error) {
        console.error('Error fetching task templates:', error);
        throw new Error(error.message);
      }
      
      return data || [];
    } catch (err) {
      console.error('Error in getAllTaskTemplates:', err);
      throw err;
    }
  },
  
  // יצירת משימות ברירת מחדל כתבניות
  async createDefaultTaskTemplates(): Promise<Task[]> {
    // בדיקה אם כבר יש משימות תבניות
    const existingTemplates = await this.getAllTaskTemplates();
    if (existingTemplates.length > 0) {
      return existingTemplates; // אם יש כבר תבניות, נחזיר אותן
    }
    
    // משימות ברירת מחדל לפרויקטי נדל"ן
    const defaultTemplates = [
      {
        id: crypto.randomUUID(),
        project_id: null, // ללא שיוך לפרויקט
        title: 'איתור קרקע מתאימה',
        description: 'חיפוש וסינון קרקעות פוטנציאליות לפרויקט',
        status: 'todo',
        priority: 'high',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted: false,
        labels: ['קרקע', 'איתור']
      },
      {
        id: crypto.randomUUID(),
        project_id: null,
        title: 'בדיקת היתכנות ראשונית',
        description: 'בדיקת תב"ע, זכויות בנייה, ומגבלות תכנוניות',
        status: 'todo',
        priority: 'high',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted: false,
        labels: ['תכנון', 'היתכנות']
      },
      {
        id: crypto.randomUUID(),
        project_id: null,
        title: 'משא ומתן לרכישת הקרקע',
        description: 'ניהול מו"מ עם בעלי הקרקע וגיבוש הסכם',
        status: 'todo',
        priority: 'high',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted: false,
        labels: ['קרקע', 'רכישה']
      },
      {
        id: crypto.randomUUID(),
        project_id: null,
        title: 'גיוס צוות תכנון',
        description: 'בחירת אדריכל, מהנדסים ויועצים',
        status: 'todo',
        priority: 'medium',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted: false,
        labels: ['תכנון', 'צוות']
      },
      {
        id: crypto.randomUUID(),
        project_id: null,
        title: 'תכנון אדריכלי ראשוני',
        description: 'הכנת תכניות קונספט ראשוניות',
        status: 'todo',
        priority: 'medium',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted: false,
        labels: ['תכנון', 'אדריכלות']
      },
      {
        id: crypto.randomUUID(),
        project_id: null,
        title: 'הגשת בקשה להיתר בנייה',
        description: 'הכנת מסמכים והגשה לוועדה המקומית',
        status: 'todo',
        priority: 'high',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted: false,
        labels: ['תכנון', 'היתרים']
      },
      {
        id: crypto.randomUUID(),
        project_id: null,
        title: 'בחירת קבלן מבצע',
        description: 'פרסום מכרז, קבלת הצעות ובחירת קבלן',
        status: 'todo',
        priority: 'high',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted: false,
        labels: ['ביצוע', 'קבלנים']
      },
      {
        id: crypto.randomUUID(),
        project_id: null,
        title: 'עבודות תשתית ופיתוח',
        description: 'ביצוע עבודות תשתית ופיתוח באתר',
        status: 'todo',
        priority: 'medium',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted: false,
        labels: ['ביצוע', 'תשתיות']
      },
      {
        id: crypto.randomUUID(),
        project_id: null,
        title: 'בנייה',
        description: 'ביצוע עבודות הבנייה',
        status: 'todo',
        priority: 'high',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted: false,
        labels: ['ביצוע', 'בנייה']
      },
      {
        id: crypto.randomUUID(),
        project_id: null,
        title: 'הכנת תכנית שיווק',
        description: 'גיבוש אסטרטגיית שיווק ומכירות',
        status: 'todo',
        priority: 'medium',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted: false,
        labels: ['שיווק', 'תכנון']
      },
      {
        id: crypto.randomUUID(),
        project_id: null,
        title: 'הקמת משרד מכירות',
        description: 'הקמת משרד מכירות באתר או במיקום אסטרטגי',
        status: 'todo',
        priority: 'medium',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted: false,
        labels: ['שיווק', 'מכירות']
      },
      {
        id: crypto.randomUUID(),
        project_id: null,
        title: 'פרסום ושיווק',
        description: 'פרסום הפרויקט בערוצי מדיה שונים',
        status: 'todo',
        priority: 'medium',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted: false,
        labels: ['שיווק', 'פרסום']
      },
      {
        id: crypto.randomUUID(),
        project_id: null,
        title: 'בדיקות איכות ותיקונים',
        description: 'ביצוע בדיקות איכות ותיקון ליקויים',
        status: 'todo',
        priority: 'high',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted: false,
        labels: ['מסירה', 'איכות']
      },
      {
        id: crypto.randomUUID(),
        project_id: null,
        title: 'מסירת דירות',
        description: 'מסירת דירות לרוכשים',
        status: 'todo',
        priority: 'high',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted: false,
        labels: ['מסירה', 'דירות']
      },
      {
        id: crypto.randomUUID(),
        project_id: null,
        title: 'רישום בטאבו',
        description: 'רישום הדירות על שם הרוכשים בטאבו',
        status: 'todo',
        priority: 'medium',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted: false,
        labels: ['מסירה', 'רישום']
      }
    ];
    
    // הוספת המשימות לבסיס הנתונים
    const { data, error } = await supabase
      .from('tasks')
      .insert(defaultTemplates)
      .select();
    
    if (error) {
      console.error('Error creating default task templates:', error);
      throw new Error(error.message);
    }
    
    return data || [];
  },
  
  // יצירת משימות ברירת מחדל לפרויקט נדל"ן חדש
  async createDefaultTasksForRealEstateProject(projectId: string, stageId: string): Promise<Task[]> {
    // קבלת השלבים של הפרויקט
    const { data: stages, error: stagesError } = await supabase
      .from('stages')
      .select('*')
      .eq('project_id', projectId);
    
    if (stagesError) {
      console.error(`Error fetching stages for project ${projectId}:`, stagesError);
      throw new Error(stagesError.message);
    }
    
    // מיפוי שלבים לפי כותרת
    const stageMap: Record<string, string> = {};
    stages?.forEach(stage => {
      stageMap[stage.title] = stage.id;
    });
    
    // משימות ברירת מחדל לפרויקט נדל"ן
    const defaultTasks = [
      // שלב 1: איתור ורכישת קרקע
      {
        id: crypto.randomUUID(),
        project_id: projectId,
        stage_id: stageMap['לביצוע'] || stageId,
        title: 'איתור קרקע מתאימה',
        description: 'חיפוש וסינון קרקעות פוטנציאליות לפרויקט',
        status: 'todo',
        priority: 'high',
        hierarchical_number: '1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        project_id: projectId,
        stage_id: stageMap['לביצוע'] || stageId,
        title: 'בדיקת היתכנות ראשונית',
        description: 'בדיקת תב"ע, זכויות בנייה, ומגבלות תכנוניות',
        status: 'todo',
        priority: 'high',
        hierarchical_number: '2',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        project_id: projectId,
        stage_id: stageMap['לביצוע'] || stageId,
        title: 'משא ומתן לרכישת הקרקע',
        description: 'ניהול מו"מ עם בעלי הקרקע וגיבוש הסכם',
        status: 'todo',
        priority: 'high',
        hierarchical_number: '3',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      
      // שלב 2: תכנון ואישורים
      {
        id: crypto.randomUUID(),
        project_id: projectId,
        stage_id: stageMap['לביצוע'] || stageId,
        title: 'גיוס צוות תכנון',
        description: 'בחירת אדריכל, מהנדסים ויועצים',
        status: 'todo',
        priority: 'medium',
        hierarchical_number: '4',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        project_id: projectId,
        stage_id: stageMap['לביצוע'] || stageId,
        title: 'תכנון אדריכלי ראשוני',
        description: 'הכנת תכניות קונספט ראשוניות',
        status: 'todo',
        priority: 'medium',
        hierarchical_number: '5',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        project_id: projectId,
        stage_id: stageMap['לביצוע'] || stageId,
        title: 'הגשת בקשה להיתר בנייה',
        description: 'הכנת מסמכים והגשה לוועדה המקומית',
        status: 'todo',
        priority: 'high',
        hierarchical_number: '6',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      
      // שלב 3: ביצוע
      {
        id: crypto.randomUUID(),
        project_id: projectId,
        stage_id: stageMap['לביצוע'] || stageId,
        title: 'בחירת קבלן מבצע',
        description: 'פרסום מכרז, קבלת הצעות ובחירת קבלן',
        status: 'todo',
        priority: 'high',
        hierarchical_number: '7',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        project_id: projectId,
        stage_id: stageMap['לביצוע'] || stageId,
        title: 'עבודות תשתית ופיתוח',
        description: 'ביצוע עבודות תשתית ופיתוח באתר',
        status: 'todo',
        priority: 'medium',
        hierarchical_number: '8',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        project_id: projectId,
        stage_id: stageMap['לביצוע'] || stageId,
        title: 'בנייה',
        description: 'ביצוע עבודות הבנייה',
        status: 'todo',
        priority: 'high',
        hierarchical_number: '9',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      
      // שלב 4: שיווק ומכירות
      {
        id: crypto.randomUUID(),
        project_id: projectId,
        stage_id: stageMap['לביצוע'] || stageId,
        title: 'הכנת תכנית שיווק',
        description: 'גיבוש אסטרטגיית שיווק ומכירות',
        status: 'todo',
        priority: 'medium',
        hierarchical_number: '10',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        project_id: projectId,
        stage_id: stageMap['לביצוע'] || stageId,
        title: 'הקמת משרד מכירות',
        description: 'הקמת משרד מכירות באתר או במיקום אסטרטגי',
        status: 'todo',
        priority: 'medium',
        hierarchical_number: '11',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        project_id: projectId,
        stage_id: stageMap['לביצוע'] || stageId,
        title: 'פרסום ושיווק',
        description: 'פרסום הפרויקט בערוצי מדיה שונים',
        status: 'todo',
        priority: 'medium',
        hierarchical_number: '12',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      
      // שלב 5: מסירה ואכלוס
      {
        id: crypto.randomUUID(),
        project_id: projectId,
        stage_id: stageMap['לביצוע'] || stageId,
        title: 'בדיקות איכות ותיקונים',
        description: 'ביצוע בדיקות איכות ותיקון ליקויים',
        status: 'todo',
        priority: 'high',
        hierarchical_number: '13',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        project_id: projectId,
        stage_id: stageMap['לביצוע'] || stageId,
        title: 'מסירת דירות',
        description: 'מסירת דירות לרוכשים',
        status: 'todo',
        priority: 'high',
        hierarchical_number: '14',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        project_id: projectId,
        stage_id: stageMap['לביצוע'] || stageId,
        title: 'רישום בטאבו',
        description: 'רישום הדירות על שם הרוכשים בטאבו',
        status: 'todo',
        priority: 'medium',
        hierarchical_number: '15',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
    
    // הוספת המשימות לבסיס הנתונים
    const { data, error } = await supabase
      .from('tasks')
      .insert(defaultTasks)
      .select();
    
    if (error) {
      console.error(`Error creating default tasks for project ${projectId}:`, error);
      throw new Error(error.message);
    }
    
    // כרגע לא נוסיף את המשימות לטבלה הייחודית של הפרויקט
    // כיוון שהפונקציות SQL הנדרשות לא קיימות במסד הנתונים
    console.log(`Note: Adding tasks to project-specific table for project ${projectId} is currently disabled.`);
    
    return data || [];
  },

  // פונקציה חדשה: קבלת כל המשימות בהיררכיה (משימת אב וכל תתי המשימות שלה)
  async getTaskHierarchy(rootTaskId: string): Promise<Task[]> {
    // מציאת כל המשימות שקשורות להיררכיה זו
    const allTasks: Task[] = [];
    
    // קבלת משימת השורש
    const rootTask = await this.getTaskById(rootTaskId);
    if (!rootTask) {
      throw new Error(`Root task ${rootTaskId} not found`);
    }
    
    allTasks.push(rootTask);
    
    // פונקציה רקורסיבית לקבלת כל תתי המשימות
    const fetchSubtasks = async (parentId: string) => {
      const subtasks = await this.getSubTasks(parentId);
      
      for (const subtask of subtasks) {
        allTasks.push(subtask);
        // קריאה רקורסיבית לקבלת תתי-משימות של תת-המשימה
        await fetchSubtasks(subtask.id);
      }
    };
    
    await fetchSubtasks(rootTaskId);
    
    // מיון לפי מספר היררכי
    return allTasks.sort((a, b) => {
      if (!a.hierarchical_number || !b.hierarchical_number) return 0;
      
      const aParts = a.hierarchical_number.split('.').map(Number);
      const bParts = b.hierarchical_number.split('.').map(Number);
      
      for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
        if (aParts[i] !== bParts[i]) {
          return aParts[i] - bParts[i];
        }
      }
      
      return aParts.length - bParts.length;
    });
  },
  
  // פונקציה חדשה: עדכון היררכיה של משימה (שינוי משימת האב)
  async updateTaskHierarchy(taskId: string, newParentId: string | null): Promise<Task> {
    const task = await this.getTaskById(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    // אם מנסים לשנות משימה להיות תת-משימה של עצמה או של אחת מתתי המשימות שלה
    if (newParentId) {
      // בדיקה שלא יוצרים מעגל בהיררכיה
      const checkForCycle = async (currentId: string, targetId: string): Promise<boolean> => {
        if (currentId === targetId) return true;
        
        const subtasks = await this.getSubTasks(currentId);
        for (const subtask of subtasks) {
          if (await checkForCycle(subtask.id, targetId)) {
            return true;
          }
        }
        
        return false;
      };
      
      if (await checkForCycle(taskId, newParentId)) {
        throw new Error('לא ניתן להפוך משימה לתת-משימה של עצמה או של אחת מתתי המשימות שלה');
      }
    }
    
    // עדכון משימת האב
    const updateData: any = { parent_task_id: newParentId };
    
    // עדכון המספר ההיררכי
    if (newParentId === null) {
      // אם הופכים למשימת אב, מקבלים מספר היררכי חדש
      updateData.hierarchical_number = await this.getNextRootHierarchicalNumber(task.project_id);
    } else {
      // אם הופכים לתת-משימה, מקבלים מספר היררכי חדש בהתאם למשימת האב החדשה
      updateData.hierarchical_number = await this.getNextSubHierarchicalNumber(newParentId);
    }
    
    // עדכון המשימה
    const updatedTask = await this.updateTask(taskId, updateData);
    
    // עדכון כל תתי המשימות של המשימה הזו
    await this.updateSubtaskHierarchicalNumbers(taskId);
    
    return updatedTask;
  },
  
  // פונקציה חדשה: עדכון מספרים היררכיים של כל תתי המשימות
  async updateSubtaskHierarchicalNumbers(parentTaskId: string): Promise<void> {
    const parent = await this.getTaskById(parentTaskId);
    if (!parent || !parent.hierarchical_number) return;
    
    const subtasks = await this.getSubTasks(parentTaskId);
    
    // עדכון כל תת-משימה
    for (let i = 0; i < subtasks.length; i++) {
      const subtask = subtasks[i];
      const newHierarchicalNumber = `${parent.hierarchical_number}.${i + 1}`;
      
      // עדכון המספר ההיררכי של תת-המשימה
      await this.updateTask(subtask.id, { hierarchical_number: newHierarchicalNumber });
      
      // עדכון רקורסיבי של תתי-המשימות של תת-המשימה
      await this.updateSubtaskHierarchicalNumbers(subtask.id);
    }
  },

  // קריאת משימות לפי פרויקט
  async getTasksByProject(projectId: string): Promise<Task[]> {
    try {
      // ניסיון לקבל משימות מהטבלה הספציפית של הפרויקט
      try {
        // קריאה לפונקציה SQL לקבלת המשימות מהטבלה הספציפית של הפרויקט
        const { data: projectTasks, error: projectTasksError } = await supabase.rpc('get_project_tasks', {
          project_id: projectId
        });
        
        if (!projectTasksError && projectTasks) {
          console.log(`Retrieved ${projectTasks.length} tasks from project-specific table for project ${projectId}`);
          return projectTasks;
        }
      } catch (projectTableError) {
        console.error(`Error fetching tasks from project-specific table for project ${projectId}:`, projectTableError);
        // נמשיך לקריאה מהטבלה הראשית אם יש שגיאה בקריאה מהטבלה הספציפית
      }
      
      // אם לא הצלחנו לקבל משימות מהטבלה הספציפית, נקרא מהטבלה הראשית
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('hierarchical_number', { ascending: true });
      
      if (error) {
        console.error(`Error fetching tasks for project ${projectId}:`, error);
        throw new Error(error.message);
      }
      
      return data || [];
    } catch (err) {
      console.error(`Error in getTasksByProject for project ${projectId}:`, err);
      throw new Error(err instanceof Error ? err.message : 'אירעה שגיאה לא ידועה');
    }
  },
  
  // קבלת משימות ספציפיות לפרויקט (מהטבלה הייחודית)
  async getProjectSpecificTasks(projectId: string): Promise<Task[]> {
    try {
      // קריאה לפונקציה SQL לקבלת המשימות מהטבלה הספציפית של הפרויקט
      const { data: projectTasks, error: projectTasksError } = await supabase.rpc('get_project_tasks', {
        project_id: projectId
      });
      
      if (projectTasksError) {
        console.error(`Error fetching tasks from project-specific table for project ${projectId}:`, projectTasksError);
        throw new Error(projectTasksError.message);
      }
      
      return projectTasks || [];
    } catch (err) {
      console.error(`Error in getProjectSpecificTasks for project ${projectId}:`, err);
      
      // אם יש שגיאה, ננסה לקרוא מהטבלה הראשית
      console.log(`Falling back to main tasks table for project ${projectId}`);
      
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('hierarchical_number', { ascending: true });
      
      if (error) {
        console.error(`Error fetching tasks for project ${projectId} from main table:`, error);
        throw new Error(error.message);
      }
      
      return data || [];
    }
  },
  
  // פונקציה חדשה: סנכרון כל המשימות של פרויקט מהטבלה הראשית לטבלה הספציפית
  async syncProjectTasks(projectId: string): Promise<void> {
    try {
      // קריאה לפונקציה SQL לסנכרון המשימות
      await supabase.rpc('sync_project_tasks', {
        project_id: projectId
      });
      
      console.log(`All tasks for project ${projectId} synced successfully`);
    } catch (err) {
      console.error(`Error syncing tasks for project ${projectId}:`, err);
      throw new Error(err instanceof Error ? err.message : 'אירעה שגיאה בסנכרון המשימות');
    }
  },
};

export default taskService; 