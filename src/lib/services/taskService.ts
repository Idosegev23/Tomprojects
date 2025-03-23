import supabase from '../supabase';
import { Task, NewTask, UpdateTask, TaskWithChildren } from '@/types/supabase';

export const taskService = {
  // קריאת כל המשימות
  async getTasks(filters?: { projectId?: string, status?: string, category?: string }): Promise<Task[]> {
    let query = supabase
      .from('tasks')
      .select('*')
      .order('due_date', { ascending: true });
    
    // הוספת סינון לפי פרויקט אם צריך
    if (filters?.projectId) {
      query = query.eq('project_id', filters.projectId);
    } else {
      // אם לא מסננים לפי פרויקט, נסנן החוצה משימות ספציפיות לפרויקט
      // ונציג רק משימות גלובליות
      query = query.is('project_id', null);
    }
    
    // הוספת סינון לפי סטטוס אם צריך
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    
    // הוספת סינון לפי קטגוריה אם צריך
    if (filters?.category) {
      query = query.eq('category', filters.category);
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
    try {
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
      
      // אם המשימה היא ללא פרויקט (תבנית גלובלית), נוסיף אותה לטבלה הראשית
      if (!task.project_id) {
        // הוספת תבנית גלובלית לטבלה הראשית
        const { data, error } = await supabase
          .from('tasks')
          .insert(task)
          .select()
          .single();
        
        if (error) {
          console.error('Error creating global task template:', error);
          throw new Error(`שגיאה ביצירת תבנית משימה גלובלית: ${error.message}`);
        }
        
        console.log('Global task template created successfully in main tasks table');
        return data;
      }
      
      // כאן מדובר במשימה עם project_id - נוסיף אותה רק לטבלה הייחודית של הפרויקט
      const tableName = `project_${task.project_id}_tasks`;
      
      // בדיקה אם הטבלה הייחודית קיימת
      let tableExists = false;
      try {
        const { data: checkResult, error: tableCheckError } = await supabase
          .rpc('check_table_exists', {
            table_name_param: tableName
          });
        
        if (tableCheckError) {
          console.error(`Error checking if table ${tableName} exists:`, tableCheckError);
          throw new Error(`שגיאה בבדיקת קיום טבלת משימות ייעודית: ${tableCheckError.message}`);
        }
        
        tableExists = !!checkResult;
      } catch (err) {
        console.error(`Error checking project table ${tableName}:`, err);
        throw new Error(`שגיאה בבדיקת קיום טבלת משימות ייעודית: ${err instanceof Error ? err.message : 'שגיאה לא ידועה'}`);
      }
      
      // אם הטבלה לא קיימת, ניצור אותה
      if (!tableExists) {
        try {
          await supabase.rpc('create_project_table', {
            project_id: task.project_id
          });
          console.log(`Created project-specific table ${tableName} for project ${task.project_id}`);
          tableExists = true;
        } catch (createTableError) {
          console.error(`Error creating project-specific table ${tableName}:`, createTableError);
          throw new Error(`שגיאה ביצירת טבלת משימות ייעודית: ${createTableError instanceof Error ? createTableError.message : 'שגיאה לא ידועה'}`);
        }
      }
      
      // הוספת המשימה לטבלה הייחודית
      const { data, error } = await supabase
        .from(tableName)
        .insert(task)
        .select()
        .single();
      
      if (error) {
        console.error(`Error adding task to project-specific table ${tableName}:`, error);
        throw new Error(`שגיאה בהוספת משימה לטבלת הפרויקט: ${error.message}`);
      }
      
      console.log(`Task created successfully in project-specific table ${tableName}`);
      return data;
    } catch (err) {
      console.error('Error in createTask:', err);
      throw new Error(err instanceof Error ? err.message : 'אירעה שגיאה לא ידועה ביצירת משימה');
    }
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
    const tableName = `project_${projectId}_tasks`;
    
    try {
      // בדיקה אם הטבלה הייחודית קיימת
      let tableExists = false;
      try {
        const { data: checkResult, error: tableCheckError } = await supabase
          .rpc('check_table_exists', {
            table_name_param: tableName
          });
        
        if (tableCheckError) {
          console.error(`Error checking if table ${tableName} exists:`, tableCheckError);
          // נמשיך ונשתמש בטבלה הראשית במקרה של שגיאה
        } else {
          tableExists = !!checkResult;
        }
      } catch (err) {
        console.error(`Error checking project table ${tableName}:`, err);
      }
      
      if (tableExists) {
        // שימוש בטבלה הספציפית של הפרויקט
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .order('hierarchical_number', { ascending: true });
        
        if (error) {
          console.error(`Error fetching hierarchical tasks from project-specific table ${tableName}:`, error);
          throw new Error(error.message);
        }
        
        console.log(`Retrieved ${data?.length || 0} tasks from project-specific table ${tableName}`);
        return data || [];
      } else {
        // שימוש בטבלה הכללית (לתאימות לאחור)
        console.warn(`Project table ${tableName} does not exist, falling back to main tasks table`);
        
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('project_id', projectId)
          .order('hierarchical_number', { ascending: true });
        
        if (error) {
          console.error(`Error fetching hierarchical tasks for project ${projectId} from main table:`, error);
          throw new Error(error.message);
        }
        
        console.log(`Retrieved ${data?.length || 0} tasks from main table for project ${projectId}`);
        return data || [];
      }
    } catch (err) {
      console.error(`Error in getHierarchicalTasks for project ${projectId}:`, err);
      throw new Error(err instanceof Error ? err.message : 'אירעה שגיאה בשליפת משימות היררכיות');
    }
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
    console.log(`Assigning ${taskIds.length} tasks to project ${projectId}`);
    
    if (!taskIds.length) {
      console.error("No task IDs provided for assignment");
      return [];
    }
    
    try {
      // קריאת המשימות המקוריות מהטבלה הראשית
      const { data: originalTasks, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .in('id', taskIds);
      
      if (fetchError) {
        console.error('Error fetching original tasks:', fetchError);
        throw new Error(`שגיאה בקריאת המשימות המקוריות: ${fetchError.message}`);
      }
      
      if (!originalTasks || originalTasks.length === 0) {
        console.log('No original tasks found to assign');
        return [];
      }
      
      // שם הטבלה הספציפית של הפרויקט
      const tableName = `project_${projectId}_tasks`;
      
      // בדיקה אם הטבלה הספציפית קיימת, ואם לא - יצירתה
      let tableExists = false;
      try {
        const { data: checkResult, error: tableCheckError } = await supabase
          .rpc('check_table_exists', {
            table_name_param: tableName
          });
        
        if (tableCheckError) {
          console.error(`Error checking if table ${tableName} exists:`, tableCheckError);
          throw new Error(`שגיאה בבדיקת קיום טבלת משימות: ${tableCheckError.message}`);
        }
        
        tableExists = !!checkResult;
      } catch (err) {
        console.error(`Error checking table existence:`, err);
        throw new Error(`שגיאה בבדיקת קיום טבלה: ${err instanceof Error ? err.message : 'שגיאה לא ידועה'}`);
      }
      
      // אם הטבלה לא קיימת, ניצור אותה
      if (!tableExists) {
        try {
          await supabase.rpc('create_project_table', {
            project_id: projectId
          });
          console.log(`Created project-specific table ${tableName} for project ${projectId}`);
          tableExists = true;
        } catch (createTableError) {
          console.error(`Error creating project-specific table ${tableName}:`, createTableError);
          throw new Error(`שגיאה ביצירת טבלת משימות: ${createTableError instanceof Error ? createTableError.message : 'שגיאה לא ידועה'}`);
        }
      }
      
      // העתקת המשימות מהטבלה הראשית לטבלה הייחודית עם עדכון project_id
      const tasksToInsert = originalTasks.map(task => {
        return {
          ...task,
          id: crypto.randomUUID(), // מזהה חדש
          project_id: projectId,
          original_task_id: task.id, // שמירת המזהה המקורי
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          hierarchical_number: null // יעודכן אוטומטית מאוחר יותר
        };
      });
      
      // הוספת המשימות לטבלה הייחודית
      const { data: insertedTasks, error: insertError } = await supabase
        .from(tableName)
        .insert(tasksToInsert)
        .select();
      
      if (insertError) {
        console.error(`Error assigning tasks to project-specific table ${tableName}:`, insertError);
        throw new Error(`שגיאה בהוספת משימות לפרויקט: ${insertError.message}`);
      }
      
      // מספור היררכי של המשימות החדשות
      await this.updateHierarchicalNumbersForProject(projectId);
      
      console.log(`${insertedTasks?.length || 0} tasks assigned to project ${projectId} table ${tableName}`);
      return insertedTasks || [];
    } catch (error) {
      console.error(`Critical error in assignTasksToProject:`, error);
      throw new Error(error instanceof Error ? error.message : 'שגיאה לא ידועה בשיוך משימות לפרויקט');
    }
  },
  
  // פונקציה עזר לעדכון מספרים היררכיים בפרויקט
  async updateHierarchicalNumbersForProject(projectId: string): Promise<void> {
    try {
      const tableName = `project_${projectId}_tasks`;
      
      // עדכון מספרים היררכיים למשימות ללא מספר
      await supabase.rpc('update_hierarchical_numbers_for_project', {
        project_id_param: projectId
      });
      
      console.log(`Updated hierarchical numbers for project ${projectId}`);
    } catch (error) {
      console.error(`Error updating hierarchical numbers for project ${projectId}:`, error);
      // לא נזרוק שגיאה כדי לא לעצור את התהליך המרכזי
    }
  },
  
  // שכפול משימות ושיוך לפרויקט חדש
  async cloneTasksToProject(taskIds: string[], projectId: string, stageId: string | null): Promise<Task[]> {
    try {
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
      
      // שם הטבלה הספציפית של הפרויקט
      const tableName = `project_${projectId}_tasks`;
      
      // בדיקה אם הטבלה הספציפית קיימת, ואם לא - יצירתה
      try {
        // בדיקה אם הטבלה הייחודית קיימת
        let tableExists = false;
        
        // ניסיון לבדוק אם הטבלה קיימת באמצעות RPC
        try {
          const result = await supabase
            .rpc('check_table_exists', {
              table_name_param: tableName
            });
          tableExists = result.data;
        } catch (tableCheckError) {
          console.error(`Error checking if table ${tableName} exists with RPC:`, tableCheckError);
          console.log("Continuing without project-specific tables");
        }
        
        // אם הטבלה לא קיימת, ננסה ליצור אותה
        if (!tableExists) {
          try {
            await supabase.rpc('create_project_table', {
              project_id: projectId
            });
            console.log(`Created project-specific table ${tableName} for project ${projectId}`);
            tableExists = true;
          } catch (createTableError) {
            console.error(`Error creating project-specific table ${tableName}:`, createTableError);
            console.log("Continuing without project-specific tables");
          }
        }
        
        // בדיקה אם המשימות כבר קיימות בפרויקט - בטבלה הספציפית של הפרויקט
        const existingTasksResult = await supabase
          .from(tableName)
          .select('original_task_id')
          .in('original_task_id', taskIds);
          
        const existingOriginalTaskIds = new Set(existingTasksResult.data?.map(task => task.original_task_id) || []);
        
        // סינון המשימות המקוריות כך שנשכפל רק משימות שעדיין לא קיימות בפרויקט
        const tasksToClone = originalTasks.filter(task => !existingOriginalTaskIds.has(task.id));
        
        if (tasksToClone.length === 0) {
          console.log(`All selected tasks already exist in project ${projectId} table ${tableName}`);
          return [];
        }
        
        // יצירת עותקים של המשימות עם מזהים חדשים ושיוך לפרויקט החדש
        const clonedTasks = tasksToClone.map(task => {
          // בדיקה האם העמודה is_global_template קיימת כדי למנוע שגיאות
          const taskData: any = {
            ...task,
            id: crypto.randomUUID(),
            project_id: projectId,
            stage_id: stageId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            original_task_id: task.id, // שמירת המזהה המקורי
            hierarchical_number: null // נאפס את המספר ההיררכי כדי שייקבע מחדש
          };
          
          // הוספת השדה is_global_template רק אם הטבלה תומכת בו
          try {
            taskData.is_global_template = false;
          } catch (err) {
            console.log("Column is_global_template might not exist yet, skipping");
          }
          
          return taskData;
        });
        
        // הוספת המשימות המשוכפלות רק לטבלה הייחודית
        const { data: insertedTasks, error: insertError } = await supabase
          .from(tableName)
          .insert(clonedTasks)
          .select();
        
        if (insertError) {
          console.error(`Error inserting cloned tasks into project-specific table ${tableName}:`, insertError);
          throw new Error(insertError.message);
        }
        
        console.log(`${insertedTasks?.length || 0} tasks cloned to project ${projectId} table ${tableName}`);
        return insertedTasks || [];
      } catch (err) {
        console.error(`Error in cloneTasksToProject for project ${projectId}:`, err);
        throw new Error(err instanceof Error ? err.message : 'אירעה שגיאה לא ידועה');
      }
    } catch (err) {
      console.error(`Error in cloneTasksToProject for project ${projectId}:`, err);
      throw new Error(err instanceof Error ? err.message : 'אירעה שגיאה לא ידועה');
    }
  },
  
  // קבלת כל המשימות הזמינות לשכפול
  async getAllTaskTemplates(): Promise<Task[]> {
    try {
      // מחזיר רק משימות שאינן שייכות לפרויקט (project_id הוא null)
      // אלה הן ככל הנראה תבניות משימות
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .is('project_id', null)
        .order('title', { ascending: true });
      
      if (error) {
        console.error('Error fetching task templates:', error);
        throw new Error(error.message);
      }
      
      console.log(`Retrieved ${data?.length || 0} task templates with null project_id`);
      return data || [];
    } catch (err) {
      console.error('Error in getAllTaskTemplates:', err);
      throw err;
    }
  },
  
  // פונקציה חדשה: קבלת כל תבניות המשימות בצורה היררכית
  async getAllHierarchicalTaskTemplates(): Promise<TaskWithChildren[]> {
    try {
      // מקבל את כל תבניות המשימות
      const allTemplates = await this.getAllTaskTemplates();
      
      // אם אין תבניות, נחזיר מערך ריק
      if (!allTemplates || allTemplates.length === 0) {
        return [];
      }
      
      // ארגון המשימות בצורה היררכית
      // 1. זיהוי משימות-אב (משימות ללא parent_task_id)
      const rootTasks = allTemplates.filter(task => !task.parent_task_id);
      const childTasks = allTemplates.filter(task => task.parent_task_id);
      
      // 2. בניית עץ המשימות ההיררכי
      const buildChildrenTree = (parentTask: Task): TaskWithChildren => {
        const children = childTasks
          .filter(task => task.parent_task_id === parentTask.id)
          .map(childTask => buildChildrenTree(childTask));
        
        return {
          ...parentTask,
          children: children.length > 0 ? children : undefined
        };
      };
      
      // 3. בניית העץ המלא עם כל משימות האב
      const hierarchicalTemplates = rootTasks.map(rootTask => buildChildrenTree(rootTask));
      
      return hierarchicalTemplates;
    } catch (err) {
      console.error('Error in getAllHierarchicalTaskTemplates:', err);
      throw new Error(err instanceof Error ? err.message : 'אירעה שגיאה לא ידועה');
    }
  },
  
  // יצירת משימות ברירת מחדל לפרויקט נדל"ן חדש
  async createDefaultTasksForRealEstateProject(projectId: string, stageId: string | null): Promise<Task[]> {
    // בדיקה אם כבר יש משימות בפרויקט - נבדוק בטבלה הספציפית של הפרויקט
    const tableName = `project_${projectId}_tasks`;
    
    try {
      // בדיקה אם הטבלה הייחודית קיימת
      let tableExists = false;
      try {
        const { data, error: tableCheckError } = await supabase
          .rpc('check_table_exists', {
            table_name_param: tableName
          });
        
        if (tableCheckError) {
          console.error(`Error checking if table ${tableName} exists:`, tableCheckError);
          throw new Error(tableCheckError.message);
        }
        
        tableExists = !!data;
      } catch (err) {
        console.error(`Error checking project table ${tableName}:`, err);
      }
      
      // אם הטבלה לא קיימת, ניצור אותה
      if (!tableExists) {
        try {
          await supabase.rpc('create_project_table', {
            project_id: projectId
          });
          console.log(`Created project-specific table ${tableName} for project ${projectId}`);
          tableExists = true;
        } catch (createTableError) {
          console.error(`Error creating project-specific table ${tableName}:`, createTableError);
          throw new Error('Failed to create project-specific table');
        }
      }
      
      // בדיקה אם כבר יש משימות בטבלה הייחודית
      const { data: existingTasks, error: existingError } = await supabase
        .from(tableName)
        .select('*')
        .limit(10);
      
      if (existingError) {
        console.error(`Error checking existing tasks in ${tableName}:`, existingError);
        // נמשיך למרות השגיאה
      } else if (existingTasks && existingTasks.length > 0) {
        console.log(`Project ${projectId} already has tasks in ${tableName}, skipping default task creation`);
        return existingTasks;
      }
    
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
      
      // קבלת כל תבניות המשימות הקיימות
      let taskTemplates = await this.getAllTaskTemplates();
      
      if (!taskTemplates || taskTemplates.length === 0) {
        console.log("No task templates found, creating default templates first");
        await this.createDefaultTaskTemplates();
        // קבלת התבניות שנוצרו
        taskTemplates = await this.getAllTaskTemplates();
        if (!taskTemplates || taskTemplates.length === 0) {
          throw new Error("Failed to create and retrieve task templates");
        }
      }
      
      console.log(`Found ${taskTemplates.length} task templates to clone into the project`);
      
      // הכנת משימות לפרויקט על בסיס התבניות
      const newTasks = taskTemplates.map((template, index) => {
        // יצירת אובייקט משימה בסיסי
        const taskData: any = {
          id: crypto.randomUUID(),
          project_id: projectId,
          stage_id: stageMap['לביצוע'] || stageId,
          title: template.title,
          description: template.description,
          status: template.status || 'todo',
          priority: template.priority || 'medium',
          hierarchical_number: String(index + 1),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          labels: template.labels || [],
          original_task_id: template.id // שמירת המזהה של התבנית המקורית
        };
        
        return taskData;
      });
      
      if (!tableExists) {
        console.error(`Table ${tableName} does not exist and could not be created`);
        throw new Error(`Table ${tableName} does not exist and could not be created`);
      }
      
      // הוספת המשימות רק לטבלה הייחודית של הפרויקט
      const { data: createdTasks, error: createError } = await supabase
        .from(tableName)
        .insert(newTasks)
        .select();
      
      if (createError) {
        console.error(`Error creating default tasks for project ${projectId}:`, createError);
        throw new Error(createError.message);
      }
      
      console.log(`Created ${createdTasks?.length || 0} default tasks for project ${projectId} in table ${tableName}`);
      return createdTasks || [];
    } catch (err) {
      console.error(`Error creating default tasks for project ${projectId}:`, err);
      throw new Error(err instanceof Error ? err.message : 'אירעה שגיאה לא ידועה');
    }
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
    
    // סנכרון המשימה המעודכנת לטבלה הספציפית של הפרויקט
    if (updatedTask.project_id) {
      try {
        // קריאה לפונקציה SQL לעדכון המשימה בטבלה הספציפית של הפרויקט
        await supabase.rpc('update_task_in_project_table', {
          task_id: updatedTask.id,
          project_id: updatedTask.project_id
        });
        console.log(`Task hierarchy updated and synced to project-specific table for project ${updatedTask.project_id}`);
      } catch (syncError) {
        console.error(`Error syncing updated task hierarchy to project-specific table for project ${updatedTask.project_id}:`, syncError);
        // נמשיך גם אם יש שגיאה בסנכרון
      }
    }
    
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
      
      // סנכרון תת-המשימה המעודכנת לטבלה הספציפית של הפרויקט
      if (subtask.project_id) {
        try {
          // קריאה לפונקציה SQL לעדכון המשימה בטבלה הספציפית של הפרויקט
          await supabase.rpc('update_task_in_project_table', {
            task_id: subtask.id,
            project_id: subtask.project_id
          });
        } catch (syncError) {
          console.error(`Error syncing updated subtask to project-specific table for project ${subtask.project_id}:`, syncError);
          // נמשיך גם אם יש שגיאה בסנכרון
        }
      }
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
      // ננסה להשתמש בפונקציות RPC אם הן קיימות
      try {
        const { data: projectTasks, error: projectTasksError } = await supabase.rpc('get_tasks_tree', {
          project_id: projectId
        });
        
        if (!projectTasksError && projectTasks) {
          console.log(`Retrieved ${projectTasks.length} tasks from get_tasks_tree for project ${projectId}`);
          return projectTasks;
        }
      } catch (treeError) {
        console.error(`Error calling get_tasks_tree for project ${projectId}:`, treeError);
      }
      
      try {
        const { data: projectTasks, error: projectTasksError } = await supabase.rpc('get_project_tasks', {
          project_id: projectId
        });
        
        if (!projectTasksError && projectTasks) {
          console.log(`Retrieved ${projectTasks.length} tasks from project-specific table for project ${projectId}`);
          return projectTasks;
        }
      } catch (projectTableError) {
        console.error(`Error fetching tasks from project-specific table for project ${projectId}:`, projectTableError);
      }
      
      // אם יש שגיאה בפונקציות RPC, ננסה לבנות את ההיררכיה בצד הלקוח
      console.log(`Building hierarchical task tree for project ${projectId} on client side`);
      
      // קריאה לטבלה הראשית
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('hierarchical_number', { ascending: true });
      
      if (error) {
        console.error(`Error fetching tasks from main table for project ${projectId}:`, error);
        throw new Error(error.message);
      }
      
      if (!data || data.length === 0) {
        return [];
      }
      
      // ארגון המשימות בצורה היררכית
      const allTasks = data || [];
      
      // מציאת כל משימות האב (ללא parent_task_id)
      const rootTasks = allTasks.filter(task => !task.parent_task_id);
      
      // בניית עץ המשימות ההיררכי על ידי סידור תתי-המשימות תחת משימות האב שלהן
      const buildHierarchy = () => {
        // מיון המשימות בהתבסס על מספר היררכי
        return [...allTasks].sort((a, b) => {
          if (!a.hierarchical_number || !b.hierarchical_number) {
            return a.hierarchical_number ? -1 : (b.hierarchical_number ? 1 : 0);
          }
          
          const aParts = a.hierarchical_number.split('.').map(Number);
          const bParts = b.hierarchical_number.split('.').map(Number);
          
          for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
            if (aParts[i] !== bParts[i]) {
              return aParts[i] - bParts[i];
            }
          }
          
          return aParts.length - bParts.length;
        });
      };
      
      // החזרת המשימות בסדר היררכי
      const hierarchicalTasks = buildHierarchy();
      console.log(`Returning ${hierarchicalTasks.length} hierarchical tasks for project ${projectId}`);
      return hierarchicalTasks;
    } catch (err) {
      console.error(`Error in getProjectSpecificTasks for project ${projectId}:`, err);
      throw new Error(err instanceof Error ? err.message : 'אירעה שגיאה לא ידועה');
    }
  },
  
  // פונקציה חדשה: סנכרון כל המשימות של פרויקט מהטבלה הראשית לטבלה הספציפית
  async syncProjectTasks(projectId: string): Promise<void> {
    try {
      // הסנכרון כבר לא נדרש כי כל הפעולות מתבצעות ישירות בטבלה הספציפית
      console.log(`Sync not needed for project ${projectId} - all operations now use only project-specific table`);
      
      // אין צורך להשתמש ב-RPC או לבצע סנכרון ידני, כי אנחנו לא עובדים יותר עם הטבלה הראשית
      // עבור משימות של פרויקטים ספציפיים
    } catch (err) {
      console.error(`Error in syncProjectTasks for project ${projectId}:`, err);
      throw new Error(err instanceof Error ? err.message : 'אירעה שגיאה בפונקציית הסנכרון');
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
    
    console.log(`Created ${data?.length || 0} default task templates`);
    return data || [];
  },
};

export default taskService; 