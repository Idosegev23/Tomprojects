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
    // אם זו משימת אב (אין לה parent_task_id), נגדיר מספר היררכי ראשי
    if (!task.parent_task_id) {
      // נמצא את המספר ההיררכי הבא הזמין לפרויקט זה
      const nextNumber = await this.getNextRootHierarchicalNumber(task.project_id);
      task.hierarchical_number = nextNumber;
    } else {
      // אם זו תת-משימה, נגדיר מספר היררכי מבוסס על המשימה האב
      const parentTask = await this.getTaskById(task.parent_task_id);
      if (parentTask && parentTask.hierarchical_number) {
        const nextSubNumber = await this.getNextSubHierarchicalNumber(task.parent_task_id);
        task.hierarchical_number = nextSubNumber;
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
    
    return data;
  },
  
  // עדכון משימה קיימת
  async updateTask(id: string, task: UpdateTask): Promise<Task> {
    const { data, error } = await supabase
      .from('tasks')
      .update(task)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error(`Error updating task with id ${id}:`, error);
      throw new Error(error.message);
    }
    
    return data;
  },
  
  // מחיקת משימה
  async deleteTask(id: string): Promise<void> {
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
    return this.updateTask(id, { status, updated_at: new Date().toISOString() });
  },
  
  // עדכון שלב משימה
  async updateTaskStage(id: string, stageId: string): Promise<Task> {
    return this.updateTask(id, { stage_id: stageId, updated_at: new Date().toISOString() });
  },
  
  // קבלת המספר ההיררכי הבא למשימת אב בפרויקט
  async getNextRootHierarchicalNumber(projectId: string): Promise<string> {
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
    
    // אם אין תתי-משימות קיימות, נוסיף .1 למספר האב
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
    
    return data || [];
  }
};

export default taskService; 