import supabase from '../supabase';
import { Task, NewTask, UpdateTask, TaskWithChildren } from '@/types/supabase';
import dropboxService from './dropboxService';
import { ExtendedTask } from '@/types/extendedTypes';
import { sanitizePath } from '@/utils/sanitizePath';
import { PROJECTS_PATH } from '@/config/config';

// תיעוד פעולות בקובץ build_tracking
async function updateBuildTracking(message: string) {
  try {
    console.log(`Build tracking: ${message}`);
    
    // עדכון קובץ build_tracking
    const { data, error } = await supabase
      .from('build_tracking')
      .insert({
        message: message,
        timestamp: new Date().toISOString(),
        component: 'taskService'
      });
      
    if (error) {
      console.error('Error writing to build_tracking:', error);
    }
  } catch (error) {
    console.error('Error updating build tracking:', error);
  }
}

export const taskService = {
  // קריאת כל המשימות (גלובליות או לפי פרויקט)
  async getTasks(filters?: { projectId?: string, status?: string, category?: string }): Promise<Task[]> {
    let query = supabase
      .from('tasks')
      .select('*')
      .order('due_date', { ascending: true });

    if (filters?.projectId) {
      query = query.eq('project_id', filters.projectId);
    } else {
      // ברירת מחדל: החזר רק משימות גלובליות (ללא project_id)
      query = query.is('project_id', null);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

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
  async getTaskById(id: string): Promise<ExtendedTask | null> {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error(`Error fetching task with id ${id}:`, error);
        throw new Error(error.message);
      }

      return data as ExtendedTask;
    } catch (err) {
      console.error(`Error in getTaskById for task ${id}:`, err);
      return null;
    }
  },

  // פונקציה להסרת שדות שאינם חלק מהטבלה
  async removeNonExistingFields(task: any, forProjectTable: boolean = false): Promise<any> {
    const mainTableFields = [
      'id', 'project_id', 'stage_id', 'title', 'description', 'category',
      'status', 'priority', 'responsible', 'estimated_hours', 'actual_hours',
      'start_date', 'due_date', 'completed_date', 'budget', 'dependencies',
      'assignees_info', 'watchers', 'labels', 'deleted', 'created_at',
      'updated_at', 'hierarchical_number', 'parent_task_id', 'is_template',
      'is_global_template', 'original_task_id', 'dropbox_folder' // Added dropbox_folder
    ];
    const projectTableFields = [
      'id', 'project_id', 'stage_id', 'title', 'description', 'category',
      'status', 'priority', 'responsible', 'due_date', 'assignees_info',
      'created_at', 'updated_at', 'hierarchical_number', 'parent_task_id',
      'dropbox_folder' // Added dropbox_folder
    ];
    const validFields = forProjectTable ? projectTableFields : mainTableFields;
    const cleanedTask = { ...task };
    for (const key in cleanedTask) {
      if (!validFields.includes(key)) {
        delete cleanedTask[key];
      }
    }
    return cleanedTask;
  },

  // קריאת משימות לפי שלב ופרויקט (אופציונלי)
  async getTasksByStage(stageId: string, projectId?: string): Promise<Task[]> {
    try {
      let query = supabase.from('tasks').select('*').eq('stage_id', stageId);
      if (projectId) {
        query = query.eq('project_id', projectId);
      }
      const { data, error } = await query.order('hierarchical_number', { ascending: true });
      if (error) {
        console.error(`Error fetching tasks for stage ${stageId}${projectId ? ` in project ${projectId}` : ''}:`, error);
        throw new Error(error.message);
      }
      return data || [];
    } catch (err) {
      console.error(`Error in getTasksByStage for stage ${stageId}:`, err);
      throw err;
    }
  },

  // קריאת משימות ספציפיות לפרויקט
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
          
          try {
            // פונקציית עזר לבדיקה האם ערך הוא מחרוזת תקינה
            const isValidString = (value: any): boolean => {
              return typeof value === 'string' && value !== null && value.length > 0;
            };
            
            if (!isValidString(a.hierarchical_number) || !isValidString(b.hierarchical_number)) {
              return a.hierarchical_number ? -1 : (b.hierarchical_number ? 1 : 0);
            }
            
            const aParts = (a.hierarchical_number as string).split('.').map(Number);
            const bParts = (b.hierarchical_number as string).split('.').map(Number);
            
            for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
              if (aParts[i] !== bParts[i]) {
                return aParts[i] - bParts[i];
              }
            }
            
            return aParts.length - bParts.length;
          } catch (error) {
            console.error('שגיאה במיון לפי מספר היררכי:', error, { a: a.hierarchical_number, b: b.hierarchical_number });
            return 0;
          }
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

  // קבלת כל המשימות בצורה היררכית
  async getAllTasksHierarchical(projectId?: string): Promise<TaskWithChildren[]> {
    try {
      // קבלת כל המשימות הרלוונטיות - גלובליות או פרויקט-ספציפיות
      const tasks = projectId ? await this.getProjectSpecificTasks(projectId) : await this.getTasks();
      
      if (!tasks || tasks.length === 0) {
        return [];
      }
      
      // ארגון המשימות בצורה היררכית
      // 1. מיפוי משימות לפי ID להקלה על חיפוש
      const taskMap = new Map<string, TaskWithChildren>();
      tasks.forEach(task => {
        taskMap.set(task.id, { ...task, children: [] });
      });
      
      // 2. בניית עץ המשימות
      const rootTasks: TaskWithChildren[] = [];
      
      taskMap.forEach(task => {
        if (task.parent_task_id) {
          // משימה עם הורה - הוספה לרשימת תת-המשימות של ההורה
          const parent = taskMap.get(task.parent_task_id);
          if (parent) {
            parent.children = parent.children || [];
            parent.children.push(task);
          } else {
            // אם ההורה לא קיים, נוסיף כמשימת שורש
            rootTasks.push(task);
          }
        } else {
          // משימה ראשית ללא הורה
          rootTasks.push(task);
        }
      });
      
      // מיון לפי מספר היררכי
      return rootTasks.sort((a, b) => {
        if (!a.hierarchical_number && !b.hierarchical_number) return 0;
        if (!a.hierarchical_number) return 1;
        if (!b.hierarchical_number) return -1;
        return a.hierarchical_number.localeCompare(b.hierarchical_number);
      });
    } catch (err) {
      console.error(`Error in getAllTasksHierarchical:`, err);
      throw new Error(err instanceof Error ? err.message : 'אירעה שגיאה בקבלת מבנה המשימות');
    }
  },
  
  // קבלת תתי-משימות של משימה מסוימת
  async getSubTasks(parentTaskId: string): Promise<Task[]> {
    try {
      if (!parentTaskId) {
        console.error('getSubTasks: Missing parent task ID');
        return [];
      }

      // בדיקה אם יש צורך להשתמש בטבלה ספציפית לפרויקט
      let tableName = 'tasks';
      let useProjectTable = false;
      
      // קבלת המשימה עצמה כדי לדעת לאיזה פרויקט היא שייכת
      const parentTask = await this.getTaskById(parentTaskId);
      if (!parentTask) {
        console.warn(`getSubTasks: Parent task ${parentTaskId} not found`);
        return [];
      }
      
      // אם יש פרויקט, בדוק אם הטבלה הספציפית קיימת
      if (parentTask.project_id) {
        const projectTableName = `project_${parentTask.project_id}_tasks`;
        try {
          const { data: tableExists, error: checkError } = await supabase
            .rpc('check_table_exists', { table_name_param: projectTableName });
            
          if (!checkError && tableExists) {
            tableName = projectTableName;
            useProjectTable = true;
            console.log(`Using project-specific table ${projectTableName} for subtasks of ${parentTaskId}`);
          }
        } catch (checkError) {
          console.warn(`Error checking if table ${projectTableName} exists:`, checkError);
          // נמשיך עם הטבלה הראשית אם יש שגיאה בבדיקת הטבלה הספציפית
        }
      }
      
      // פונקציה לקבלת כל תתי-המשימות של משימה ספציפית
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('parent_task_id', parentTaskId)
        .order('hierarchical_number', { ascending: true });
        
      if (error) {
        console.error(`Error fetching subtasks for parent ${parentTaskId} from ${tableName}:`, error);
        
        // אם ניסינו להשתמש בטבלה ספציפית ונכשלנו, ננסה את הטבלה הראשית כמוצא אחרון
        if (useProjectTable) {
          console.log(`Falling back to main tasks table for subtasks of ${parentTaskId}`);
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('tasks')
            .select('*')
            .eq('parent_task_id', parentTaskId)
            .order('hierarchical_number', { ascending: true });
            
          if (fallbackError) {
            console.error(`Error fetching subtasks for parent ${parentTaskId} from fallback table:`, fallbackError);
            throw new Error(fallbackError.message);
          }
          
          return fallbackData || [];
        }
        
        throw new Error(error.message);
      }
      
      return data || [];
    } catch (err) {
      console.error(`Error in getSubTasks for parent ${parentTaskId}:`, err);
      throw new Error(err instanceof Error ? err.message : 'אירעה שגיאה בקבלת תתי-המשימות');
    }
  },
  
  // קבלת היררכיית משימות ספציפית
  async getTaskHierarchy(rootTaskId: string): Promise<Task[]> {
    try {
      if (!rootTaskId) {
        console.error('getTaskHierarchy: Missing root task ID');
        return [];
      }
      
      // מציאת כל המשימות שקשורות להיררכיה זו
      const allTasks: Task[] = [];
      
      // קבלת משימת השורש
      const rootTask = await this.getTaskById(rootTaskId);
      if (!rootTask) {
        console.warn(`Root task ${rootTaskId} not found`);
        return [];
      }
      
      allTasks.push(rootTask);
      
      // פונקציה רקורסיבית לקבלת כל תתי המשימות
      const fetchSubtasks = async (parentId: string) => {
        try {
          const subtasks = await this.getSubTasks(parentId);
          
          for (const subtask of subtasks) {
            allTasks.push(subtask);
            // קריאה רקורסיבית לקבלת תתי-משימות של תת-המשימה
            await fetchSubtasks(subtask.id);
          }
        } catch (subError) {
          // לוג השגיאה אבל לא להפסיק את התהליך הרקורסיבי
          console.error(`Error fetching subtasks for parent ${parentId} (continuing with other subtasks):`, subError);
        }
      };
      
      await fetchSubtasks(rootTaskId);
      
      // מיון לפי מספר היררכי
      return allTasks.sort((a, b) => {
        if (!a.hierarchical_number && !b.hierarchical_number) return 0;
        if (!a.hierarchical_number) return 1;
        if (!b.hierarchical_number) return -1;
        return a.hierarchical_number.localeCompare(b.hierarchical_number);
      });
    } catch (err) {
      console.error(`Error in getTaskHierarchy for task ${rootTaskId}:`, err);
      throw new Error(err instanceof Error ? err.message : 'אירעה שגיאה בקבלת היררכיית המשימות');
    }
  },

  // Placeholder functions for hierarchical numbering
  async getProjectSpecificNextSubHierarchicalNumber(parentId: string, projectId: string): Promise<string> {
    try {
      console.log(`מחשב מספר היררכי חדש לתת-משימה של הורה ${parentId} בטבלה ספציפית לפרויקט ${projectId}`);
      
      // נסה לקבל את המשימה ההורה
      const parentTask = await this.getTaskById(parentId);
      if (!parentTask || !parentTask.hierarchical_number) {
        console.warn(`משימת האב ${parentId} לא נמצאה או חסר לה מספר היררכי`);
        return "1.1"; // ברירת מחדל אם אין מספר היררכי להורה
      }
      
      // וידוא שה-hierarchical_number של ההורה הוא מחרוזת תקינה
      const parentHierarchicalNumber = String(parentTask.hierarchical_number);
      console.log(`מספר היררכי של הורה: ${parentHierarchicalNumber}`);
      
      // השג את כל המשימות המשויכות להורה
      const { data: subTasks, error } = await supabase
        .from(`project_${projectId}_tasks`)
        .select('hierarchical_number')
        .eq('parent_task_id', parentId)
        .order('hierarchical_number', { ascending: false });
      
      if (error) {
        console.error(`שגיאה בקבלת תת-משימות של ${parentId} מטבלה ספציפית לפרויקט:`, error);
        return `${parentHierarchicalNumber}.1`; // ברירת מחדל
      }
      
      if (!subTasks || subTasks.length === 0) {
        console.log(`אין תת-משימות קיימות להורה ${parentId} בטבלה ספציפית לפרויקט, מחזיר ${parentHierarchicalNumber}.1`);
        return `${parentHierarchicalNumber}.1`;
      }
      
      console.log(`נמצאו ${subTasks.length} תת-משימות להורה ${parentId} בטבלה ספציפית:`);
      subTasks.forEach(task => console.log(`- תת-משימה עם מספר היררכי: ${task.hierarchical_number}`));
      
      // מצא את המספר הגבוה ביותר
      let maxLastNumber = 0;
      
      subTasks.forEach(task => {
        if (task.hierarchical_number) {
          const hierarchyParts = String(task.hierarchical_number).split('.');
          // אנחנו מחפשים את המספר האחרון ברצף ההיררכי
          if (hierarchyParts.length > 0) {
            const lastPart = parseInt(hierarchyParts[hierarchyParts.length - 1], 10);
            if (!isNaN(lastPart)) {
              console.log(`פרסור מספר היררכי: ${task.hierarchical_number} -> ${lastPart} (מספר אחרון)`);
              if (lastPart > maxLastNumber) {
                maxLastNumber = lastPart;
              }
            } else {
              console.warn(`לא ניתן לפרסר את המספר האחרון בהיררכיה: ${task.hierarchical_number}`);
            }
          }
        }
      });
      
      const nextNumber = maxLastNumber + 1;
      const newHierarchicalNumber = `${parentHierarchicalNumber}.${nextNumber}`;
      console.log(`המספר ההיררכי הבא שיוקצה לתת-משימה בטבלה ספציפית: ${newHierarchicalNumber}`);
      
      return newHierarchicalNumber;
    } catch (error) {
      console.error('שגיאה בחישוב מספר היררכי בטבלה ספציפית:', error);
      return "1.1"; // ברירת מחדל במקרה של שגיאה
    }
  },
  
  async getNextSubHierarchicalNumber(parentId: string): Promise<string> {
    try {
      console.log(`מחשב מספר היררכי חדש לתת-משימה של הורה ${parentId}`);
      
      // נסה לקבל את המשימה ההורה
      const parentTask = await this.getTaskById(parentId);
      if (!parentTask || !parentTask.hierarchical_number) {
        console.warn(`משימת האב ${parentId} לא נמצאה או חסר לה מספר היררכי`);
        return "1.1"; // ברירת מחדל אם אין מספר היררכי להורה
      }
      
      // וידוא שה-hierarchical_number של ההורה הוא מחרוזת תקינה
      const parentHierarchicalNumber = String(parentTask.hierarchical_number);
      console.log(`מספר היררכי של הורה: ${parentHierarchicalNumber}`);
      
      // השג את כל המשימות המשויכות להורה
      const { data: subTasks, error } = await supabase
        .from('tasks')
        .select('hierarchical_number')
        .eq('parent_task_id', parentId)
        .order('hierarchical_number', { ascending: false });
      
      if (error) {
        console.error(`שגיאה בקבלת תת-משימות של ${parentId}:`, error);
        return `${parentHierarchicalNumber}.1`; // ברירת מחדל
      }
      
      if (!subTasks || subTasks.length === 0) {
        console.log(`אין תת-משימות קיימות להורה ${parentId}, מחזיר ${parentHierarchicalNumber}.1`);
        return `${parentHierarchicalNumber}.1`;
      }
      
      console.log(`נמצאו ${subTasks.length} תת-משימות להורה ${parentId}:`);
      subTasks.forEach(task => console.log(`- תת-משימה עם מספר היררכי: ${task.hierarchical_number}`));
      
      // מצא את המספר הגבוה ביותר
      let maxLastNumber = 0;
      
      subTasks.forEach(task => {
        if (task.hierarchical_number) {
          const hierarchyParts = String(task.hierarchical_number).split('.');
          // אנחנו מחפשים את המספר האחרון ברצף ההיררכי
          if (hierarchyParts.length > 0) {
            const lastPart = parseInt(hierarchyParts[hierarchyParts.length - 1], 10);
            if (!isNaN(lastPart)) {
              console.log(`פרסור מספר היררכי: ${task.hierarchical_number} -> ${lastPart} (מספר אחרון)`);
              if (lastPart > maxLastNumber) {
                maxLastNumber = lastPart;
              }
            } else {
              console.warn(`לא ניתן לפרסר את המספר האחרון בהיררכיה: ${task.hierarchical_number}`);
            }
          }
        }
      });
      
      const nextNumber = maxLastNumber + 1;
      const newHierarchicalNumber = `${parentHierarchicalNumber}.${nextNumber}`;
      console.log(`המספר ההיררכי הבא שיוקצה לתת-משימה: ${newHierarchicalNumber}`);
      
      return newHierarchicalNumber;
    } catch (error) {
      console.error('שגיאה בחישוב מספר היררכי:', error);
      return "1.1"; // ברירת מחדל במקרה של שגיאה
    }
  },
  
  async getProjectSpecificNextRootHierarchicalNumber(projectId: string): Promise<string> {
    try {
      console.log(`מחשב מספר היררכי חדש למשימת שורש בפרויקט ${projectId}`);
      
      let maxNumber = 0;
      
      // בדיקת טבלה ספציפית לפרויקט אם קיימת
      const projectTableName = `project_${projectId}_tasks`;
      let useProjectTable = false;
      
      try {
        const { data: tableExists, error: checkError } = await supabase
          .rpc('check_table_exists', { table_name_param: projectTableName });
          
        if (!checkError && tableExists) {
          useProjectTable = true;
          console.log(`בדיקת מספרים היררכיים בטבלה ספציפית לפרויקט ${projectTableName}`);
          
          // השג את כל משימות השורש של הפרויקט מהטבלה הספציפית
          const { data: projectRootTasks, error: projectError } = await supabase
            .from(projectTableName)
            .select('hierarchical_number')
            .is('parent_task_id', null)
            .order('hierarchical_number', { ascending: false });
          
          if (!projectError && projectRootTasks && projectRootTasks.length > 0) {
            console.log(`נמצאו ${projectRootTasks.length} משימות שורש בטבלה ספציפית לפרויקט ${projectId}`);
            
            // בדיקת המספר הגבוה ביותר מהטבלה הספציפית
            projectRootTasks.forEach(task => {
              if (task.hierarchical_number) {
                // נקה את המספר ההיררכי מכל תווים שאינם מספר
                const cleanNumber = String(task.hierarchical_number).split('.')[0].trim();
                const rootNumber = parseInt(cleanNumber, 10);
                
                if (!isNaN(rootNumber) && rootNumber > maxNumber) {
                  maxNumber = rootNumber;
                  console.log(`מצאתי מספר היררכי גבוה יותר בטבלה הספציפית: ${rootNumber}`);
                }
              }
            });
          }
        }
      } catch (tableCheckError) {
        console.error(`שגיאה בבדיקת טבלה ספציפית לפרויקט ${projectTableName}:`, tableCheckError);
      }
      
      // בדיקה גם בטבלה הראשית בכל מקרה
      console.log(`בדיקת מספרים היררכיים בטבלה הראשית 'tasks'`);
      
      // השג את כל משימות השורש של הפרויקט מהטבלה הראשית
      const { data: rootTasks, error } = await supabase
        .from('tasks')
        .select('hierarchical_number')
        .eq('project_id', projectId)
        .is('parent_task_id', null)
        .order('hierarchical_number', { ascending: false });
      
      if (error) {
        console.error(`שגיאה בקבלת משימות שורש של פרויקט ${projectId} מהטבלה הראשית:`, error);
      } else if (rootTasks && rootTasks.length > 0) {
        console.log(`נמצאו ${rootTasks.length} משימות שורש בטבלה הראשית עבור פרויקט ${projectId}`);
        
        // בדיקת המספר הגבוה ביותר מהטבלה הראשית
        rootTasks.forEach(task => {
          if (task.hierarchical_number) {
            // נקה את המספר ההיררכי מכל תווים שאינם מספר
            const cleanNumber = String(task.hierarchical_number).split('.')[0].trim();
            const rootNumber = parseInt(cleanNumber, 10);
            
            if (!isNaN(rootNumber) && rootNumber > maxNumber) {
              maxNumber = rootNumber;
              console.log(`מצאתי מספר היררכי גבוה יותר בטבלה הספציפית: ${rootNumber}`);
            }
          }
        });
      }
      
      // אם לא נמצאו משימות כלל או שיש בעיה בחישוב, החזר 1
      if (maxNumber === 0) {
        console.log(`לא נמצאו משימות שורש או שיש בעיה בחישוב, מחזיר מספר התחלתי 1`);
        return "1";
      }
      
      // הוסף 1 למספר הגבוה ביותר שנמצא
      const nextNumber = maxNumber + 1;
      console.log(`המספר ההיררכי הבא שיוקצה: ${nextNumber}`);
      
      // עדכון ב-build tracking
      await updateBuildTracking(`נוצר מספר היררכי חדש ${nextNumber} לפרויקט ${projectId}`);
      
      return `${nextNumber}`;
    } catch (error) {
      console.error('שגיאה בחישוב מספר היררכי:', error);
      // ברירת מחדל במקרה של שגיאה
      console.log(`מחזיר ברירת מחדל "1" בגלל שגיאה`);
      return "1";
    }
  },
  
  async getNextRootHierarchicalNumber(projectId: string): Promise<string> {
    try {
      console.log(`מחשב מספר היררכי חדש למשימת שורש בפרויקט ${projectId}`);
      
      let maxNumber = 0;
      
      // בדיקת טבלה ספציפית לפרויקט אם קיימת
      const projectTableName = `project_${projectId}_tasks`;
      let useProjectTable = false;
      
      try {
        const { data: tableExists, error: checkError } = await supabase
          .rpc('check_table_exists', { table_name_param: projectTableName });
          
        if (!checkError && tableExists) {
          useProjectTable = true;
          console.log(`בדיקת מספרים היררכיים בטבלה ספציפית לפרויקט ${projectTableName}`);
          
          // השג את כל משימות השורש של הפרויקט מהטבלה הספציפית
          const { data: projectRootTasks, error: projectError } = await supabase
            .from(projectTableName)
            .select('hierarchical_number')
            .is('parent_task_id', null)
            .order('hierarchical_number', { ascending: false });
          
          if (!projectError && projectRootTasks && projectRootTasks.length > 0) {
            console.log(`נמצאו ${projectRootTasks.length} משימות שורש בטבלה ספציפית לפרויקט ${projectId}`);
            
            // בדיקת המספר הגבוה ביותר מהטבלה הספציפית
            projectRootTasks.forEach(task => {
              if (task.hierarchical_number) {
                // נקה את המספר ההיררכי מכל תווים שאינם מספר
                const cleanNumber = String(task.hierarchical_number).split('.')[0].trim();
                const rootNumber = parseInt(cleanNumber, 10);
                
                if (!isNaN(rootNumber) && rootNumber > maxNumber) {
                  maxNumber = rootNumber;
                  console.log(`מצאתי מספר היררכי גבוה יותר בטבלה הספציפית: ${rootNumber}`);
                }
              }
            });
          }
        }
      } catch (tableCheckError) {
        console.error(`שגיאה בבדיקת טבלה ספציפית לפרויקט ${projectTableName}:`, tableCheckError);
      }
      
      // בדיקה גם בטבלה הראשית בכל מקרה
      console.log(`בדיקת מספרים היררכיים בטבלה הראשית 'tasks'`);
      
      // השג את כל משימות השורש של הפרויקט מהטבלה הראשית
      const { data: rootTasks, error } = await supabase
        .from('tasks')
        .select('hierarchical_number')
        .eq('project_id', projectId)
        .is('parent_task_id', null)
        .order('hierarchical_number', { ascending: false });
      
      if (error) {
        console.error(`שגיאה בקבלת משימות שורש של פרויקט ${projectId} מהטבלה הראשית:`, error);
      } else if (rootTasks && rootTasks.length > 0) {
        console.log(`נמצאו ${rootTasks.length} משימות שורש בטבלה הראשית עבור פרויקט ${projectId}`);
        
        // בדיקת המספר הגבוה ביותר מהטבלה הראשית
        rootTasks.forEach(task => {
          if (task.hierarchical_number) {
            // נקה את המספר ההיררכי מכל תווים שאינם מספר
            const cleanNumber = String(task.hierarchical_number).split('.')[0].trim();
            const rootNumber = parseInt(cleanNumber, 10);
            
            if (!isNaN(rootNumber) && rootNumber > maxNumber) {
              maxNumber = rootNumber;
              console.log(`מצאתי מספר היררכי גבוה יותר בטבלה הספציפית: ${rootNumber}`);
            }
          }
        });
      }
      
      // אם לא נמצאו משימות כלל או שיש בעיה בחישוב, החזר 1
      if (maxNumber === 0) {
        console.log(`לא נמצאו משימות שורש או שיש בעיה בחישוב, מחזיר מספר התחלתי 1`);
        return "1";
      }
      
      // הוסף 1 למספר הגבוה ביותר שנמצא
      const nextNumber = maxNumber + 1;
      console.log(`המספר ההיררכי הבא שיוקצה: ${nextNumber}`);
      
      // עדכון ב-build tracking
      await updateBuildTracking(`נוצר מספר היררכי חדש ${nextNumber} לפרויקט ${projectId}`);
      
      return `${nextNumber}`;
    } catch (error) {
      console.error('שגיאה בחישוב מספר היררכי:', error);
      // ברירת מחדל במקרה של שגיאה
      console.log(`מחזיר ברירת מחדל "1" בגלל שגיאה`);
      return "1";
    }
  },

  // יצירת משימה
  async createTask(taskData: Partial<ExtendedTask>): Promise<ExtendedTask> {
    try {
      console.log('taskService.createTask נקרא עם:', taskData);
      
      if (!taskData) {
        throw new Error('Missing task data');
      }
      
      // Save original data for possible project-specific table insertion
      const originalData = { ...taskData };
      const cleanedTaskData = await this.removeNonExistingFields(taskData, false);
      
      // Add timestamps
      cleanedTaskData.created_at = new Date().toISOString();
      cleanedTaskData.updated_at = new Date().toISOString();
      
      // Calculate hierarchical number if needed
      if (cleanedTaskData.project_id && !cleanedTaskData.hierarchical_number) {
        if (cleanedTaskData.parent_task_id) {
          try {
            // ניסיון להשיג מספר היררכי מהטבלה הספציפית לפרויקט
            cleanedTaskData.hierarchical_number = await this.getProjectSpecificNextSubHierarchicalNumber(
              cleanedTaskData.parent_task_id, 
              cleanedTaskData.project_id
            );
          } catch (hierError) { 
            console.warn(`Error getting project-specific hierarchical number: ${hierError}`);
            // ניסיון לקבל מהטבלה הכללית אם נכשל מהטבלה הספציפית
            try {
              cleanedTaskData.hierarchical_number = await this.getNextSubHierarchicalNumber(cleanedTaskData.parent_task_id);
            } catch (fallbackError) {
              console.error(`Error getting hierarchical number, using default: ${fallbackError}`);
              // ניסיון לקבל את המשימה ההורה ולבנות ברירת מחדל
              const parentTask = await this.getTaskById(cleanedTaskData.parent_task_id);
              cleanedTaskData.hierarchical_number = parentTask?.hierarchical_number 
                ? `${parentTask.hierarchical_number}.1` 
                : "1.1";
            }
          }
        } else {
          // משימת שורש (ללא הורה)
          try {
            cleanedTaskData.hierarchical_number = await this.getProjectSpecificNextRootHierarchicalNumber(cleanedTaskData.project_id);
          } catch (hierError) { 
            console.warn(`Error getting project-specific root hierarchical number: ${hierError}`);
            try {
              cleanedTaskData.hierarchical_number = await this.getNextRootHierarchicalNumber(cleanedTaskData.project_id); 
            } catch (fallbackError) {
              console.error(`Error getting root hierarchical number, using default: ${fallbackError}`);
              cleanedTaskData.hierarchical_number = "1";
            }
          }
        }
      }
      
      // עדכון האם להשתמש בטבלה ספציפית לפרויקט
      let useProjectTable = false;
      let projectTableName = 'tasks';
      
      if (cleanedTaskData.project_id) {
        const tableName = `project_${cleanedTaskData.project_id}_tasks`;
        try {
          const { data: tableExists, error: checkError } = await supabase
            .rpc('check_table_exists', { table_name_param: tableName });
            
          if (!checkError && tableExists) {
            projectTableName = tableName;
            useProjectTable = true;
            console.log(`Using project-specific table ${projectTableName} for new task`);
          }
        } catch (checkError) {
          console.warn(`Error checking if table ${tableName} exists:`, checkError);
        }
      }
      
      // הוספת המשימה לטבלה המתאימה
      const { data, error } = await supabase
        .from(useProjectTable ? projectTableName : 'tasks')
        .insert(cleanedTaskData)
        .select()
        .single();
      
      if (error) {
        console.error(`Error creating task in ${useProjectTable ? projectTableName : 'tasks'}:`, error);
        
        // אם ניסינו להשתמש בטבלה ספציפית ונכשלנו, ננסה את הטבלה הראשית
        if (useProjectTable) {
          console.log('Falling back to main tasks table for task creation');
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('tasks')
            .insert(cleanedTaskData)
            .select()
            .single();
            
          if (fallbackError) {
            console.error('Error creating task in fallback table:', fallbackError);
            throw new Error(fallbackError.message);
          }
          
          const createdTask = fallbackData as ExtendedTask;
          
          // עדכון היררכיית המשימות אם זו תת-משימה
          if (createdTask.parent_task_id) {
            try {
              await this.updateSubtaskHierarchicalNumbers(createdTask.parent_task_id);
            } catch (hierarchyError) {
              console.error(`Error updating hierarchical numbers for parent ${createdTask.parent_task_id}:`, hierarchyError);
            }
          }
          
          return createdTask;
        }
        
        throw new Error(error.message);
      }
      
      const createdTask = data as ExtendedTask;
      
      // אם יש לנו parent_task_id, עלינו לעדכן את המספרים ההיררכיים של כל תתי-המשימות של אותו הורה
      // זה יבטיח שכל תתי-המשימות יקבלו מספרים היררכיים נכונים
      if (createdTask.parent_task_id) {
        try {
          await this.updateSubtaskHierarchicalNumbers(createdTask.parent_task_id);
        } catch (hierarchyError) {
          console.error(`Error updating hierarchical numbers for parent ${createdTask.parent_task_id}:`, hierarchyError);
          // אנחנו לא זורקים את השגיאה כאן כי אנחנו עדיין רוצים להחזיר את המשימה שנוצרה
        }
      }
      
      return createdTask;
    } catch (err) {
      console.error('Error in createTask:', err);
      throw new Error(err instanceof Error ? err.message : 'אירעה שגיאה ביצירת משימה');
    }
  },

  // עדכון משימה
  async updateTask(taskId: string, updates: Partial<ExtendedTask>): Promise<ExtendedTask> {
    try {
      if (!taskId) {
        throw new Error('Missing task ID');
      }
      
      // קבלת המשימה הנוכחית כדי לקבל מזהה פרויקט ומידע נוסף
      const currentTask = await this.getTaskById(taskId);
      if (!currentTask) {
        throw new Error(`Task ${taskId} not found`);
      }
      
      // וידוא שזמן העדכון מוגדר
      const taskToUpdateBase = { ...updates, updated_at: new Date().toISOString() };
      
      // עדכון תמיד בטבלה הראשית
      const mainTaskToUpdate = await this.removeNonExistingFields(taskToUpdateBase, false);
      console.log(`Updating task ${taskId} in main tasks table:`, mainTaskToUpdate);
      
      // ביצוע העדכון בטבלת המשימות הראשית
      const { data: mainData, error: mainError } = await supabase
        .from('tasks')
        .update(mainTaskToUpdate)
        .eq('id', taskId)
        .select('*')
        .single();
      
      if (mainError) {
        console.error(`Error updating task ${taskId} in main tasks table:`, mainError);
        throw new Error(mainError.message);
      }
      
      let finalData = mainData;
      
      // אם יש פרויקט, נעדכן גם בטבלה הספציפית של הפרויקט
      if (currentTask.project_id) {
        const projectTableName = `project_${currentTask.project_id}_tasks`;
        
        try {
          // בדיקה אם טבלת הפרויקט קיימת
          const { data: tableExists, error: checkError } = await supabase
            .rpc('check_table_exists', { table_name_param: projectTableName });
            
          if (!checkError && tableExists) {
            console.log(`Using project-specific table ${projectTableName} for updating task ${taskId}`);
            
            // הכנת הנתונים לטבלה הספציפית
            const projectTaskToUpdate = await this.removeNonExistingFields(taskToUpdateBase, true);
            console.log(`Updating task ${taskId} in project table ${projectTableName}:`, projectTaskToUpdate);
            
            // ביצוע העדכון בטבלה הספציפית
            const { data: projectData, error: projectError } = await supabase
              .from(projectTableName)
              .update(projectTaskToUpdate)
              .eq('id', taskId)
              .select('*')
              .single();
              
            if (projectError) {
              console.error(`Error updating task ${taskId} in project table ${projectTableName}:`, projectError);
              // ממשיכים עם התוצאה מהטבלה הראשית
            } else {
              // אם העדכון בטבלה הספציפית הצליח, נשתמש בתוצאה ממנה
              finalData = projectData;
            }
          }
        } catch (checkError) {
          console.warn(`Error checking if table ${projectTableName} exists:`, checkError);
          // נמשיך עם התוצאה מהטבלה הראשית
        }
      }
      
      if (!finalData) {
        throw new Error(`Task ${taskId} not found after update`);
      }
      
      // רישום בכלי המעקב אחר בניה
      await updateBuildTracking(`Successfully updated task ${taskId} with fields: ${Object.keys(updates).join(', ')}`);
      
      console.log(`Successfully updated task ${taskId}`);
      return finalData as ExtendedTask;
    } catch (err) {
      console.error(`Error in updateTask for ${taskId}:`, err);
      throw err;
    }
  },

  // עדכון סטטוס משימה
  async updateTaskStatus(taskId: string, status: string): Promise<ExtendedTask> {
    try {
      await updateBuildTracking(`מנסה לעדכן סטטוס משימה ${taskId} ל-${status}`);
      
      if (!taskId) {
        throw new Error('Missing task ID');
      }
      
      if (!status) {
        throw new Error('Missing status value');
      }
      
      // המרת הסטטוס לאותיות קטנות
      let normalizedStatus = status.toLowerCase();
      
      // וידוא שהסטטוס תקין
      const validStatuses = ['todo', 'in_progress', 'review', 'done'];
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
      
      console.log(`Updating status for task ${taskId} to ${normalizedStatus}`);
      await updateBuildTracking(`Updating task ${taskId} status to ${normalizedStatus}`);
      
      // קבלת המשימה הנוכחית כדי לבדוק את פרטי הפרויקט
      const currentTask = await this.getTaskById(taskId);
      if (!currentTask) {
        throw new Error(`Task ${taskId} not found`);
      }
      
      let updatedTask: ExtendedTask | null = null;
      const updateData = { 
        status: normalizedStatus, 
        updated_at: new Date().toISOString() 
      };
      
      // אם המשימה שייכת לפרויקט, ננסה לעדכן את טבלת הפרויקט
      if (currentTask.project_id) {
        const projectTableName = `project_${currentTask.project_id}_tasks`;
        
        try {
          // בדיקה אם טבלת הפרויקט קיימת
          const { data: tableExists, error: checkError } = await supabase
            .rpc('check_table_exists', { table_name_param: projectTableName });
            
          if (!checkError && tableExists) {
            console.log(`עדכון סטטוס בטבלת הפרויקט ${projectTableName} עבור משימה ${taskId}`);
            
            // ניסיון לעדכון בטבלה הספציפית של הפרויקט
            let projectUpdateRetries = 0;
            const maxRetries = 3;
            let projectUpdateSuccess = false;
            
            while (!projectUpdateSuccess && projectUpdateRetries < maxRetries) {
              try {
                // עדכון בטבלת הפרויקט
                const { data: projectTaskData, error: updateError } = await supabase
                  .from(projectTableName)
                  .update(updateData)
                  .eq('id', taskId)
                  .select('*')
                  .single();
                  
                if (updateError) {
                  console.error(`שגיאה בעדכון סטטוס בטבלת הפרויקט (ניסיון ${projectUpdateRetries + 1}):`, updateError);
                  await updateBuildTracking(`שגיאה בעדכון סטטוס בטבלת הפרויקט (ניסיון ${projectUpdateRetries + 1}): ${updateError.message}`);
                  projectUpdateRetries++;
                  
                  // המתנה קצרה לפני ניסיון חוזר
                  if (projectUpdateRetries < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                  }
                } else {
                  console.log(`סטטוס עודכן בהצלחה בטבלת הפרויקט עבור משימה ${taskId}`);
                  updatedTask = projectTaskData as ExtendedTask;
                  projectUpdateSuccess = true;
                }
              } catch (projectError) {
                console.error(`שגיאה לא צפויה בעדכון סטטוס בטבלת הפרויקט (ניסיון ${projectUpdateRetries + 1}):`, projectError);
                await updateBuildTracking(`שגיאה לא צפויה בעדכון סטטוס: ${projectError instanceof Error ? projectError.message : 'שגיאה לא ידועה'}`);
                projectUpdateRetries++;
                
                if (projectUpdateRetries < maxRetries) {
                  await new Promise(resolve => setTimeout(resolve, 1000));
                }
              }
            }
            
            if (!projectUpdateSuccess) {
              console.warn(`לא הצלחנו לעדכן את טבלת הפרויקט אחרי ${maxRetries} ניסיונות`);
              await updateBuildTracking(`נכשל בעדכון טבלת הפרויקט אחרי ${maxRetries} ניסיונות`);
              
              // במקרה של כישלון מוחלט בעדכון טבלת הפרויקט, ננסה להחזיר את המשימה המקורית
              return currentTask as ExtendedTask;
            }
          } else {
            // טבלת הפרויקט לא קיימת, לכן נעדכן את הטבלה הראשית
            console.log(`טבלת הפרויקט ${projectTableName} לא קיימת, מעדכן בטבלה הראשית בלבד`);
            await updateBuildTracking(`טבלת הפרויקט לא קיימת, מעדכן בטבלה הראשית`);
            
            // קוד לעדכון הטבלה הראשית
            const { data: mainTaskData, error: mainUpdateError } = await supabase
              .from('tasks')
              .update(updateData)
              .eq('id', taskId)
              .select('*')
              .single();
              
            if (mainUpdateError) {
              console.error(`שגיאה בעדכון סטטוס בטבלה הראשית:`, mainUpdateError);
              await updateBuildTracking(`שגיאה בעדכון סטטוס בטבלה הראשית: ${mainUpdateError.message}`);
              throw new Error(mainUpdateError.message);
            }
            
            updatedTask = mainTaskData as ExtendedTask;
          }
        } catch (projectError) {
          console.error(`שגיאה בבדיקת/עדכון טבלת הפרויקט עבור משימה ${taskId}:`, projectError);
          await updateBuildTracking(`שגיאה בבדיקת טבלת הפרויקט: ${projectError instanceof Error ? projectError.message : 'שגיאה לא ידועה'}`);
          throw projectError;
        }
      } else {
        // אם המשימה אינה משויכת לפרויקט, נעדכן רק את הטבלה הראשית
        console.log(`המשימה ${taskId} אינה משויכת לפרויקט, מעדכן רק בטבלה הראשית`);
        
        try {
          const { data: mainTaskData, error: mainUpdateError } = await supabase
            .from('tasks')
            .update(updateData)
            .eq('id', taskId)
            .select('*')
            .single();
            
          if (mainUpdateError) {
            console.error(`שגיאה בעדכון סטטוס בטבלה הראשית:`, mainUpdateError);
            await updateBuildTracking(`שגיאה בעדכון סטטוס בטבלה הראשית: ${mainUpdateError.message}`);
            throw new Error(mainUpdateError.message);
          }
          
          updatedTask = mainTaskData as ExtendedTask;
        } catch (mainError) {
          console.error(`שגיאה בעדכון סטטוס בטבלה הראשית:`, mainError);
          await updateBuildTracking(`שגיאה חמורה בעדכון סטטוס: ${mainError instanceof Error ? mainError.message : 'שגיאה לא ידועה'}`);
          throw mainError;
        }
      }
      
      if (!updatedTask) {
        throw new Error(`Failed to update task ${taskId} status`);
      }
      
      if (updatedTask.status !== normalizedStatus) {
        console.warn(`Warning: Task ${taskId} status was not updated correctly. Expected ${normalizedStatus}, got ${updatedTask.status}`);
        await updateBuildTracking(`אזהרה: הסטטוס של המשימה ${taskId} לא עודכן כראוי. ציפינו ל-${normalizedStatus}, קיבלנו ${updatedTask.status}`);
        
        // ניסיון אחרון לתקן את הסטטוס
        updatedTask.status = normalizedStatus;
      }
      
      console.log(`Successfully updated task ${taskId} status to ${normalizedStatus}`);
      await updateBuildTracking(`Successfully updated task ${taskId} status to ${normalizedStatus}`);
      
      return updatedTask;
    } catch (err) {
      console.error(`Error in updateTaskStatus for ${taskId}:`, err);
      await updateBuildTracking(`שגיאה קריטית בעדכון סטטוס משימה ${taskId}: ${err instanceof Error ? err.message : 'שגיאה לא ידועה'}`);
      throw err;
    }
  },
  
  // פונקציה חדשה לסנכרון ממוקד של משימה ספציפית בין הטבלאות
  async forceSyncTaskBetweenTables(taskId: string, projectId: string, newStatus: string): Promise<void> {
    try {
      if (!taskId || !projectId) {
        console.error('forceSyncTaskBetweenTables: חסרים פרמטרים חובה');
        return;
      }
      
      console.log(`מתחיל סנכרון ממוקד של משימה ${taskId} בין הטבלאות`);
      
      // בדיקה אם טבלת הפרויקט קיימת
      const projectTableName = `project_${projectId}_tasks`;
      const { data: tableExists, error: checkError } = await supabase
        .rpc('check_table_exists', { table_name_param: projectTableName });
        
      if (checkError || !tableExists) {
        console.warn(`טבלת הפרויקט ${projectTableName} לא קיימת, לא ניתן לסנכרן`);
        return;
      }
      
      // קבלת המשימה מהטבלה הראשית
      const { data: mainTask, error: mainTaskError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();
        
      if (mainTaskError || !mainTask) {
        console.error(`שגיאה בקבלת משימה ${taskId} מהטבלה הראשית:`, mainTaskError);
        return;
      }
      
      // בדיקה האם המשימה קיימת בטבלה הספציפית
      const { data: projectTask, error: projectTaskError } = await supabase
        .from(projectTableName)
        .select('*')
        .eq('id', taskId)
        .maybeSingle();
        
      if (projectTaskError) {
        console.error(`שגיאה בבדיקת קיום משימה ${taskId} בטבלת הפרויקט:`, projectTaskError);
      }
      
      // וידוא שהסטטוס זהה בשתי הטבלאות
      const currentTime = new Date().toISOString();
      
      // אם המשימה לא קיימת בטבלת הפרויקט, נוסיף אותה
      if (!projectTask) {
        console.log(`משימה ${taskId} לא קיימת בטבלת הפרויקט, מוסיף אותה עם סטטוס ${newStatus}`);
        
        // הכנת הנתונים לטבלת הפרויקט
        const mainTaskCopy = {...mainTask};
        mainTaskCopy.status = newStatus;  // וידוא שהסטטוס נכון
        mainTaskCopy.updated_at = currentTime;
        
        const taskToInsert = await this.removeNonExistingFields(mainTaskCopy, true);
        
        const { error: insertError } = await supabase
          .from(projectTableName)
          .insert(taskToInsert);
          
        if (insertError) {
          console.error(`שגיאה בהוספת משימה ${taskId} לטבלת הפרויקט:`, insertError);
        } else {
          console.log(`משימה ${taskId} נוספה בהצלחה לטבלת הפרויקט עם סטטוס ${newStatus}`);
        }
      } 
      // עדכון סטטוס בטבלת הפרויקט
      else if (projectTask.status !== newStatus) {
        console.log(`מעדכן סטטוס משימה ${taskId} בטבלת הפרויקט מ-${projectTask.status} ל-${newStatus}`);
        
        const { error: updateError } = await supabase
          .from(projectTableName)
          .update({ 
            status: newStatus, 
            updated_at: currentTime 
          })
          .eq('id', taskId);
          
        if (updateError) {
          console.error(`שגיאה בעדכון סטטוס משימה ${taskId} בטבלת הפרויקט:`, updateError);
        } else {
          console.log(`סטטוס משימה ${taskId} עודכן בהצלחה בטבלת הפרויקט ל-${newStatus}`);
        }
      } else {
        console.log(`סטטוס משימה ${taskId} זהה בשתי הטבלאות (${newStatus}), אין צורך בסנכרון`);
      }
      
      console.log(`סנכרון ממוקד של משימה ${taskId} הושלם`);
    } catch (err) {
      console.error(`שגיאה בסנכרון ממוקד של משימה ${taskId}:`, err);
    }
  },

  // פונקציה לעדכון היררכיה של משימה (שינוי משימת האב)
  async updateTaskHierarchy(taskId: string, newParentId: string | null): Promise<ExtendedTask> {
    try {
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
      const updateData: Partial<ExtendedTask> = { parent_task_id: newParentId };
      
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
    } catch (err) {
      console.error(`Error in updateTaskHierarchy for ${taskId}:`, err);
      throw err;
    }
  },
  
  // פונקציה לעדכון מספרים היררכיים של כל תתי המשימות
  async updateSubtaskHierarchicalNumbers(parentTaskId: string): Promise<void> {
    try {
      if (!parentTaskId) {
        console.error('updateSubtaskHierarchicalNumbers: Missing parent task ID');
        return;
      }
      
      const parent = await this.getTaskById(parentTaskId);
      if (!parent || !parent.hierarchical_number) {
        console.warn(`updateSubtaskHierarchicalNumbers: Parent task ${parentTaskId} not found or missing hierarchical number`);
        return;
      }
      
      const subtasks = await this.getSubTasks(parentTaskId);
      if (subtasks.length === 0) {
        // אין תתי-משימות לעדכן
        return;
      }
      
      console.log(`Updating hierarchical numbers for ${subtasks.length} subtasks of ${parentTaskId}`);
      
      // זיהוי אם צריך לעבוד עם טבלה ספציפית לפרויקט
      let useProjectTable = false;
      let projectTableName = 'tasks';
      
      if (parent.project_id) {
        projectTableName = `project_${parent.project_id}_tasks`;
        try {
          const { data: tableExists, error: checkError } = await supabase
            .rpc('check_table_exists', { table_name_param: projectTableName });
            
          if (!checkError && tableExists) {
            useProjectTable = true;
            console.log(`Using project-specific table ${projectTableName} for updating subtasks of ${parentTaskId}`);
          }
        } catch (checkError) {
          console.warn(`Error checking if table ${projectTableName} exists:`, checkError);
          // נמשיך עם הטבלה הראשית אם יש שגיאה בבדיקת הטבלה הספציפית
        }
      }
      
      // עדכון כל תת-משימה
      for (let i = 0; i < subtasks.length; i++) {
        try {
          const subtask = subtasks[i];
          const newHierarchicalNumber = `${parent.hierarchical_number}.${i + 1}`;
          
          // עדכון המספר ההיררכי של תת-המשימה
          await this.updateTask(subtask.id, { hierarchical_number: newHierarchicalNumber });
          
          // עדכון רקורסיבי של תתי-המשימות של תת-המשימה
          await this.updateSubtaskHierarchicalNumbers(subtask.id);
          
        } catch (subtaskError) {
          console.error(`Error updating hierarchical number for subtask ${subtasks[i].id}:`, subtaskError);
          // נמשיך לתת-המשימה הבאה גם אם יש שגיאה בעדכון תת-משימה נוכחית
        }
      }
    } catch (err) {
      console.error(`Error in updateSubtaskHierarchicalNumbers for ${parentTaskId}:`, err);
      // לא נזרוק שגיאה כדי לא לעצור את תהליך עדכון המספרים ההיררכיים
    }
  },

  // מחיקת משימה
  async deleteTask(taskId: string, projectId: string): Promise<{ success: boolean; message?: string; deletedSubtasks: Task[] }> {
    try {
      console.log(`התחלת מחיקת משימה - taskId: ${taskId}, פרויקט: ${projectId || 'ללא פרויקט'}`);
      
      // בדיקת משימות משנה שיימחקו
      const subtasks = await this.getSubTasksRecursive(taskId);
      
      // אם יש project_id, קודם כל נבדוק בטבלה הספציפית של הפרויקט
      if (projectId) {
        const tableName = `project_${projectId}_tasks`;
        console.log(`בדיקה בטבלה הספציפית: ${tableName}`);
        
        try {
          // בדיקה אם הטבלה קיימת
          const { data: tableExists, error: tableCheckError } = await supabase
            .rpc('check_table_exists', { table_name_param: tableName });
          
          if (tableCheckError) {
            console.error(`Error checking if table ${tableName} exists:`, tableCheckError);
          } else {
            console.log(`האם הטבלה ${tableName} קיימת? ${tableExists ? 'כן' : 'לא'}`);
          }
          
          // אם הטבלה קיימת, ננסה למחוק את המשימה ממנה
          if (tableExists) {
            try {
              await supabase.rpc('delete_task_from_project_table', {
                task_id: taskId,
                project_id: projectId
              });
              console.log(`משימה ${taskId} נמחקה מטבלת הפרויקט ${projectId}`);
            } catch (projectTableError) {
              console.error(`Error deleting task from project-specific table:`, projectTableError);
            }
          }
        } catch (err) {
          console.error(`Error handling project-specific table operations:`, err);
        }
      }
      
      // מחיקה מהטבלה הראשית
      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (deleteError) {
        console.error(`Error deleting task with id ${taskId} from main table:`, deleteError);
        throw new Error(deleteError.message);
      }
      
      return { 
        success: true, 
        message: `משימה ${taskId} נמחקה בהצלחה עם ${subtasks.length} תתי-משימות`, 
        deletedSubtasks: subtasks 
      };
    } catch (err) {
      console.error(`Error in deleteTask for ${taskId}:`, err);
      throw err;
    }
  },

  // יצירת משימות ברירת מחדל לפרויקט נדלן
  async createDefaultTasksForRealEstateProject(projectId: string, firstStageId: string): Promise<Task[]> {
    console.warn(`Placeholder: createDefaultTasksForRealEstateProject called for project ${projectId} and stage ${firstStageId}`);
    // TODO: Implement actual logic using templates
    return [];
  },

  // Placeholder function for getting all non-hierarchical global task templates
  // TODO: Implement logic to fetch global templates (is_global_template = true)
  async getAllTaskTemplates(): Promise<Task[]> {
    console.warn(`Placeholder: getAllTaskTemplates called`);
    // Here you would typically:
    // 1. Fetch all tasks where is_global_template = true from the 'tasks' table.
    // 2. Return them as a flat array.
    return []; // Return empty array for now
  },

  // Placeholder function for creating a set of default task templates
  // TODO: Implement logic to create initial default global templates if they don't exist
  async createDefaultTaskTemplates(): Promise<Task[]> {
    console.warn(`Placeholder: createDefaultTaskTemplates called`);
    // Here you might check if default templates already exist, and if not, create them.
    return []; // Return empty array for now
  },

  // Placeholder function for getting all hierarchical global task templates
  // TODO: Implement logic to fetch global templates and build hierarchy
  async getAllHierarchicalTaskTemplates(): Promise<TaskWithChildren[]> { // Assuming TaskWithChildren is suitable
    console.warn(`Placeholder: getAllHierarchicalTaskTemplates called`);
    // Here you would typically:
    // 1. Fetch all tasks where is_global_template = true from the 'tasks' table.
    // 2. Build the hierarchy (e.g., using parent_task_id) into TaskWithChildren structure.
    // 3. Return the array of root template tasks with their children nested.
    return []; // Return empty array for now
  },

  // Placeholder function for getting unassigned tasks
  // TODO: Implement logic to fetch tasks where assignees_info is null or empty
  async getUnassignedTasks(): Promise<Task[]> {
    console.warn(`Placeholder: getUnassignedTasks called`);
    // Here you would typically fetch tasks where assignees_info is null or an empty array/JSON.
    return []; // Return empty array for now
  },

  // Placeholder function for assigning tasks to a project
  // TODO: Implement logic to update project_id for selected tasks
  async assignTasksToProject(taskIds: string[], projectId: string): Promise<Task[]> {
    console.warn(`Placeholder: assignTasksToProject called for tasks ${taskIds.join(', ')} to project ${projectId}`);
    // Here you would typically:
    // 1. Iterate through taskIds.
    // 2. Update the project_id for each task in the database.
    // 3. Potentially fetch and return the updated task objects.
    return []; // Return empty array for now
  },

  // Placeholder function for reordering tasks (hierarchy)
  // TODO: Implement logic to update hierarchical_number or similar based on new order
  async reorderTasks(projectId: string, parentTaskId: string | null, taskIds: string[]): Promise<void> {
    try {
      await updateBuildTracking(`סידור מחדש של משימות בפרויקט ${projectId} ${parentTaskId ? `תחת הורה ${parentTaskId}` : 'ברמת שורש'}`);
      console.log(`Reordering tasks in project ${projectId} ${parentTaskId ? `under parent ${parentTaskId}` : 'at root level'}`);
      
      if (!taskIds || taskIds.length === 0) {
        console.warn('No tasks provided for reordering');
        return;
      }
      
      // בדיקה אם יש צורך להשתמש בטבלה ספציפית לפרויקט
      let useProjectTable = false;
      let projectTableName = 'tasks';
      
      if (projectId) {
        const tableName = `project_${projectId}_tasks`;
        try {
          const { data: tableExists, error: checkError } = await supabase
            .rpc('check_table_exists', { table_name_param: tableName });
            
          if (!checkError && tableExists) {
            projectTableName = tableName;
            useProjectTable = true;
            console.log(`Using project-specific table ${projectTableName} for reordering tasks`);
          }
        } catch (checkError) {
          console.warn(`Error checking if table ${tableName} exists:`, checkError);
        }
      }
      
      // נמצא את המשימות הרלוונטיות (לפי משימת אב, או משימות שורש)
      let query = supabase
        .from(useProjectTable ? projectTableName : 'tasks')
        .select('id, hierarchical_number');
        
      if (parentTaskId) {
        // מצב של תת-משימות - נסנן לפי משימת האב
        query = query.eq('parent_task_id', parentTaskId);
      } else {
        // מצב של משימות שורש - נסנן לפי פרויקט ומשימות ללא הורה
        query = query.eq('project_id', projectId).is('parent_task_id', null);
      }
      
      const { data: tasks, error } = await query;
      
      if (error) {
        console.error(`Error fetching tasks for reordering:`, error);
        throw new Error(`שגיאה בקבלת המשימות לסידור: ${error.message}`);
      }
      
      if (!tasks || tasks.length === 0) {
        console.warn('No tasks found for reordering');
        return;
      }
      
      // נסדר את המשימות לפי הסדר החדש
      const parentTask = parentTaskId ? await this.getTaskById(parentTaskId) : null;
      const parentPrefix = parentTask?.hierarchical_number ? `${parentTask.hierarchical_number}.` : '';
      
      console.log(`Updating hierarchical numbers for ${taskIds.length} tasks:`);
      
      // עדכון המספרים ההיררכיים לפי הסדר החדש
      for (let i = 0; i < taskIds.length; i++) {
        const taskId = taskIds[i];
        const newHierarchicalNumber = parentTaskId ? `${parentPrefix}${i + 1}` : `${i + 1}`;
        
        console.log(`Updating task ${taskId} to hierarchical number ${newHierarchicalNumber}`);
        
        try {
          // עדכון המספר ההיררכי
          await this.updateTask(taskId, { hierarchical_number: newHierarchicalNumber });
          
          // עדכון רקורסיבי של תתי-המשימות של המשימה הזו
          await this.updateSubtaskHierarchicalNumbers(taskId);
        } catch (updateError) {
          console.error(`Error updating hierarchical number for task ${taskId}:`, updateError);
          // נמשיך למשימה הבאה גם אם יש שגיאה
        }
      }
      
      console.log('Task reordering completed successfully');
      await updateBuildTracking(`סידור המשימות הושלם בהצלחה`);
    } catch (err) {
      console.error(`Error in reorderTasks:`, err);
      throw new Error(`שגיאה בסידור המשימות: ${err instanceof Error ? err.message : 'שגיאה לא ידועה'}`);
    }
  },

  // פונקציה לסנכרון המשימות בין הטבלה הראשית וטבלת הפרויקט הספציפית
  async syncProjectTasks(projectId: string): Promise<void> {
    try {
      if (!projectId) {
        throw new Error('Missing project ID');
      }
      
      console.log(`מתחיל סנכרון משימות עבור פרויקט ${projectId}`);
      await updateBuildTracking(`התחלת סנכרון משימות עבור פרויקט ${projectId}`);
      
      // בדיקה אם טבלת הפרויקט קיימת
      const projectTableName = `project_${projectId}_tasks`;
      const { data: tableExists, error: checkError } = await supabase
        .rpc('check_table_exists', { table_name_param: projectTableName });
        
      if (checkError || !tableExists) {
        console.warn(`טבלת הפרויקט ${projectTableName} לא קיימת, מדלג על סנכרון`);
        return;
      }
      
      // קבלת כל המשימות מהטבלה הראשית שמשויכות לפרויקט זה
      const { data: mainTasks, error: mainTasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId);
        
      if (mainTasksError) {
        console.error(`שגיאה בקבלת משימות מהטבלה הראשית:`, mainTasksError);
        throw new Error(mainTasksError.message);
      }
      
      if (!mainTasks || mainTasks.length === 0) {
        console.log(`אין משימות בטבלה הראשית עבור פרויקט ${projectId}`);
        return;
      }
      
      // קבלת כל המשימות מטבלת הפרויקט
      const { data: projectTasks, error: projectTasksError } = await supabase
        .from(projectTableName)
        .select('*');
        
      if (projectTasksError) {
        console.error(`שגיאה בקבלת משימות מטבלת הפרויקט:`, projectTasksError);
        throw new Error(projectTasksError.message);
      }
      
      // יצירת מפות לחיפוש מהיר
      const projectTasksMap = new Map(projectTasks?.map(task => [task.id, task]) || []);
      
      // עדכון כל משימה בטבלת הפרויקט אם יש צורך
      for (const mainTask of mainTasks) {
        const projectTask = projectTasksMap.get(mainTask.id);
        
        // אם המשימה לא קיימת בטבלת הפרויקט, נוסיף אותה
        if (!projectTask) {
          console.log(`משימה ${mainTask.id} לא קיימת בטבלת הפרויקט, מוסיף אותה`);
          
          // הכנת הנתונים לטבלת הפרויקט
          const taskToInsert = await this.removeNonExistingFields(mainTask, true);
          
          const { error: insertError } = await supabase
            .from(projectTableName)
            .insert(taskToInsert);
            
          if (insertError) {
            console.error(`שגיאה בהוספת משימה ${mainTask.id} לטבלת הפרויקט:`, insertError);
          }
        } 
        // אם המשימה קיימת, נבדוק אם יש צורך לעדכן אותה
        else if (projectTask.status !== mainTask.status || 
                 projectTask.updated_at !== mainTask.updated_at ||
                 projectTask.hierarchical_number !== mainTask.hierarchical_number) {
          console.log(`משימה ${mainTask.id} קיימת בטבלת הפרויקט אבל צריכה עדכון`);
          
          // פרטים ספציפיים שחשוב לעדכן בטבלת הפרויקט
          const updates = {
            status: mainTask.status,
            priority: mainTask.priority,
            title: mainTask.title,
            description: mainTask.description,
            hierarchical_number: mainTask.hierarchical_number,
            parent_task_id: mainTask.parent_task_id,
            updated_at: mainTask.updated_at
          };
          
          // הכנת הנתונים לטבלת הפרויקט
          const taskToUpdate = await this.removeNonExistingFields(updates, true);
          
          const { error: updateError } = await supabase
            .from(projectTableName)
            .update(taskToUpdate)
            .eq('id', mainTask.id);
            
          if (updateError) {
            console.error(`שגיאה בעדכון משימה ${mainTask.id} בטבלת הפרויקט:`, updateError);
          }
        }
      }
      
      await updateBuildTracking(`סנכרון משימות עבור פרויקט ${projectId} הושלם בהצלחה`);
      console.log(`סנכרון משימות עבור פרויקט ${projectId} הושלם`);
    } catch (err) {
      console.error(`שגיאה בסנכרון משימות עבור פרויקט ${projectId}:`, err);
      await updateBuildTracking(`שגיאה בסנכרון משימות: ${err instanceof Error ? err.message : 'שגיאה לא ידועה'}`);
    }
  },

  // בדיקת משימות משנה
  async getSubTasksRecursive(taskId: string): Promise<Task[]> {
    const result: Task[] = [];
    
    const fetchSubtasks = async (parentId: string) => {
      const { data: subtasks, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('parent_task_id', parentId)
        .order('hierarchical_number', { ascending: true });
      
      if (error) {
        console.error(`Error fetching subtasks for task ${parentId}:`, error);
        throw new Error(error.message);
      }
      
      if (subtasks && subtasks.length > 0) {
        for (const subtask of subtasks) {
          result.push(subtask);
          await fetchSubtasks(subtask.id); // רקורסיה לתת-משימות נוספות
        }
      }
    };
    
    await fetchSubtasks(taskId);
    return result;
  },

  // --- Dropbox Folder Logic ---

  async createDropboxFolderForTask(task: Task, useProjectTable: boolean, projectTableName: string): Promise<void> {
    try {
      const { data: projectData, error: projectError } = await supabase.from('projects').select('name, entrepreneur_id').eq('id', task.project_id).single();
      if (projectError || !projectData) { console.error(`Error fetching project for task ${task.id}:`, projectError); return; }

      let entrepreneurName: string | undefined;
      if (projectData.entrepreneur_id) {
        try {
          const { data: entrepreneurData } = await supabase.from('entrepreneurs').select('name').eq('id', projectData.entrepreneur_id).single();
          entrepreneurName = entrepreneurData?.name;
        } catch (e) { console.warn('Could not fetch entrepreneur name', e); }
      }

      const cleanProjectName = sanitizePath(projectData.name);
      let projectBasePath = PROJECTS_PATH;
      if (projectData.entrepreneur_id && entrepreneurName) {
        const cleanEntrepreneurName = sanitizePath(entrepreneurName);
        const entrepreneurPath = `${projectBasePath}/${cleanEntrepreneurName}_${projectData.entrepreneur_id}`;
        try { await dropboxService.createFolder(entrepreneurPath); projectBasePath = entrepreneurPath; } catch (entError) { console.error(`Failed to ensure entrepreneur folder: ${entrepreneurPath}`, entError); projectBasePath = entrepreneurPath; /* Continue */ }
      }
      let projectFolderPath = `${projectBasePath}/${cleanProjectName}`;
      try {
        const projectFolderResult = await dropboxService.createFolder(projectFolderPath);
        projectFolderPath = projectFolderResult.path;
      } catch (projError) { console.error(`CRITICAL: Failed to ensure project folder: ${projectFolderPath}`, projError); return; }

      if (task.parent_task_id) await this.createSubtaskFolder(task, projectFolderPath, useProjectTable, projectTableName);
      else await this.createRootTaskFolder(task, projectFolderPath, useProjectTable, projectTableName);

    } catch (error) { console.error(`Error in createDropboxFolderForTask: ${error}`); }
  },

  async getTaskDropboxPath(task: Task, useProjectTable: boolean, projectTableName: string): Promise<string | null> {
    if (!task?.id) return null;
    try {
      const tableName = useProjectTable ? projectTableName : 'tasks';
      const { data, error } = await supabase.from(tableName).select('dropbox_folder').eq('id', task.id).single();
      if (error) { console.warn(`Error fetching DB path for task ${task.id}: ${error.message}`); return null; }
      return data?.dropbox_folder || null;
    } catch (dbError) { console.error(`DB error fetching path for task ${task.id}:`, dbError); return null; }
  },

  async createSubtaskFolder(task: Task, projectFolderPath: string, useProjectTable: boolean, projectTableName: string): Promise<void> {
    if (!task.parent_task_id) return;
    try {
      const parentTask = await this.getTaskById(task.parent_task_id);
      if (!parentTask) { console.error(`Parent task ${task.parent_task_id} not found for ${task.id}.`); return; }
      let parentTaskDropboxPath = await this.getTaskDropboxPath(parentTask, useProjectTable, projectTableName);
      if (!parentTaskDropboxPath) {
        console.log(`Parent folder path not found for ${parentTask.id}, attempting to create parent folder first.`);
        await this.createDropboxFolderForTask(parentTask, useProjectTable, projectTableName); // Create parent folder
        parentTaskDropboxPath = await this.getTaskDropboxPath(parentTask, useProjectTable, projectTableName); // Retry fetching path
        if (!parentTaskDropboxPath) { console.error(`Failed to create/find parent folder ${parentTask.id}. Aborting subtask folder.`); return; }
      }
      await this.createHierarchicalTaskFolderInternal(task, parentTaskDropboxPath, useProjectTable, projectTableName);
    } catch (error) { console.error(`Error creating subtask folder for ${task.id}:`, error); }
  },

  async createRootTaskFolder(task: Task, projectFolderPath: string, useProjectTable: boolean, projectTableName: string): Promise<void> {
    if (task.parent_task_id) return;
    await this.createHierarchicalTaskFolderInternal(task, projectFolderPath, useProjectTable, projectTableName);
  },

  async createHierarchicalTaskFolderInternal(task: Task, parentPath: string, useProjectTable: boolean, projectTableName: string): Promise<void> {
    try {
      // שימוש רק בשם המשימה ללא המספר ההיררכי
      const taskFolderNameBase = task.title ? sanitizePath(task.title) : `task_${task.id}`;
      const taskFolderName = taskFolderNameBase; // הסרת המספר ההיררכי מהשם
      const fullTaskPath = `${parentPath}/${taskFolderName}`;
      
      console.log(`Attempting create/verify folder: ${fullTaskPath}`);
      await updateBuildTracking(`יוצר תיקייה: ${taskFolderName}`);
      
      const folderResult = await dropboxService.createFolder(fullTaskPath);
      const createdFolderPath = folderResult?.path;
      if (createdFolderPath) {
        const tableName = useProjectTable ? projectTableName : 'tasks';
        const { error: updateError } = await supabase.from(tableName).update({ dropbox_folder: createdFolderPath }).eq('id', task.id);
        if (updateError) console.error(`Failed to update task ${task.id} DB path:`, updateError);
        else console.log(`Updated task ${task.id} DB path: ${createdFolderPath}`);
      } else { console.error(`Folder creation failed for: ${fullTaskPath}`); }
    } catch (error: any) { console.error(`Error in createHierarchicalTaskFolderInternal for task ${task.id}:`, error); }
  },

  async createFullHierarchicalFolderStructureForProject(project: { id: string; name: string; entrepreneur_id?: string | null }, selectedEntrepreneurPath: string | null = null): Promise<{ success: boolean; message: string; project?: { id: string, path: string } }> {
    const { id: projectId, name: projectName, entrepreneur_id: entrepreneurId } = project;
    console.log(`Starting full folder structure creation for project ${projectId} (${projectName})`);
    await updateBuildTracking(`מתחיל יצירת מבנה תיקיות לפרויקט ${projectName}`);
    
    let entrepreneurName: string | undefined;
    let finalProjectFolderPath: string | null = null;
    try {
      if (entrepreneurId) {
        try {
          const { data: entreData } = await supabase.from('entrepreneurs').select('name').eq('id', entrepreneurId).single();
          entrepreneurName = entreData?.name;
          await updateBuildTracking(`משתמש ביזם: ${entrepreneurName}`);
        } catch (e) { console.warn(`Could not fetch entrepreneur name for ${entrepreneurId}`, e); }
      }
      const projectTableName = `project_${projectId}_tasks`;
      let useProjectTable = false;
      try {
        const { data: tableExists } = await supabase.rpc('check_table_exists', { table_name_param: projectTableName });
        useProjectTable = !!tableExists;
      } catch (e) { console.error(`Error checking table ${projectTableName}`, e); }
      const tableName = useProjectTable ? projectTableName : 'tasks';
      const { data: tasks, error: fetchError } = await supabase.from(tableName).select('*').order('hierarchical_number', { ascending: true });
      if (fetchError) throw new Error(`Error fetching tasks from ${tableName}: ${fetchError.message}`);

      const cleanProjectName = sanitizePath(projectName);
      let projectBasePath = PROJECTS_PATH;
      if (selectedEntrepreneurPath) {
        await updateBuildTracking(`בודק אם התיקייה קיימת: ${selectedEntrepreneurPath}`);
        const exists = await dropboxService.folderExists(selectedEntrepreneurPath);
        if (exists) projectBasePath = selectedEntrepreneurPath;
        else console.warn(`Selected entrepreneur path ${selectedEntrepreneurPath} does not exist! Fallback.`);
        finalProjectFolderPath = `${projectBasePath}/${cleanProjectName}`;
      }
      if (!finalProjectFolderPath && entrepreneurId && entrepreneurName) {
        const cleanEntrepreneurName = sanitizePath(entrepreneurName);
        const entrepreneurPath = `${PROJECTS_PATH}/${cleanEntrepreneurName}_${entrepreneurId}`;
        try { 
          await updateBuildTracking(`יוצר תיקיית יזם: ${cleanEntrepreneurName}`);
          await dropboxService.createFolder(entrepreneurPath); 
          projectBasePath = entrepreneurPath; 
          finalProjectFolderPath = `${projectBasePath}/${cleanProjectName}`; 
        } catch (entError) { 
          console.error(`Failed ensure entrepreneur folder ${entrepreneurPath}`, entError); 
          finalProjectFolderPath = `${PROJECTS_PATH}/${cleanProjectName}`; 
        }
      } else if (!finalProjectFolderPath) finalProjectFolderPath = `${PROJECTS_PATH}/${cleanProjectName}`;

      await updateBuildTracking(`יוצר תיקיית פרויקט: ${cleanProjectName}`);
      const projectFolderResult = await dropboxService.createFolder(finalProjectFolderPath);
      finalProjectFolderPath = projectFolderResult.path;
      console.log(`Project folder ensured: ${finalProjectFolderPath}`);

      if (!tasks || tasks.length === 0) {
        console.log(`No tasks in ${tableName}. Base folders ensured.`);
        await updateBuildTracking(`לא נמצאו משימות, הסתיים בהצלחה.`);
        return { success: true, message: 'לא נמצאו משימות, תיקיות בסיס נוצרו.', project: { id: projectId, path: finalProjectFolderPath } };
      }

      const tasksMap = new Map<string, Task>(tasks.map(task => [task.id, task as Task]));
      const rootTasks = tasks.filter((task: Task) => !task.parent_task_id);
      const processedTaskIds = new Set<string>();
      const maxDepth = 10;
      
      await updateBuildTracking(`מתחיל עיבוד ${rootTasks.length} משימות שורש...`);
      console.log(`Processing ${rootTasks.length} root tasks...`);
      for (const rootTask of rootTasks) {
        if (!processedTaskIds.has(rootTask.id)) {
          await this.processTaskHierarchyFolders(rootTask, tasksMap, tasks as Task[], finalProjectFolderPath, projectTableName, useProjectTable, processedTaskIds, 0, maxDepth);
        }
      }
      
      await updateBuildTracking(`מבנה התיקיות נוצר בהצלחה`);
      console.log(`Finished structure creation for project ${projectId}.`);
      return { success: true, message: 'מבנה התיקיות נוצר/עודכן בהצלחה.', project: { id: projectId, path: finalProjectFolderPath } };
    } catch (error) {
      console.error(`Critical error during structure creation for ${projectId}:`, error);
      await updateBuildTracking(`שגיאה ביצירת מבנה תיקיות: ${error instanceof Error ? error.message : 'Unknown'}`);
      return { success: false, message: `שגיאה קריטית: ${error instanceof Error ? error.message : 'Unknown'}`, project: { id: projectId, path: finalProjectFolderPath || 'unknown' } };
    }
  },

  async processTaskHierarchyFolders(task: Task, tasksMap: Map<string, Task>, allTasks: Task[], projectFolderPath: string, projectTableName: string, useProjectTable: boolean, processedTaskIds: Set<string>, currentDepth: number, maxDepth: number): Promise<void> {
    if (currentDepth > maxDepth) { console.error(`Max depth (${maxDepth}) exceeded for task ${task.id}.`); return; }
    if (!task?.id) { console.error('Invalid task object.'); return; }
    if (processedTaskIds.has(task.id)) { console.log(`Task ${task.id} already processed.`); return; }
    if (task.parent_task_id === task.id) { console.error(`Circular ref (self): task ${task.id}.`); return; }
    if (task.parent_task_id && this.isCircularReference(task.id, task.parent_task_id, tasksMap)) { console.error(`Circular ref path: task ${task.id}.`); processedTaskIds.add(task.id); return; }

    console.log(`Processing task folder: ${task.id} (depth ${currentDepth})`);
    let parentTaskDropboxPath: string | null = null;
    if (task.parent_task_id) {
      const parentTask = tasksMap.get(task.parent_task_id);
      if (parentTask) {
        if (!processedTaskIds.has(parentTask.id)) {
          console.log(`Processing parent ${parentTask.id} first.`);
          await this.processTaskHierarchyFolders(parentTask, tasksMap, allTasks, projectFolderPath, projectTableName, useProjectTable, processedTaskIds, currentDepth, maxDepth);
          if (!processedTaskIds.has(parentTask.id)) { console.error(`Failed process parent ${parentTask.id} for child ${task.id}.`); return; }
        }
        parentTaskDropboxPath = await this.getTaskDropboxPath(parentTask, useProjectTable, projectTableName);
        if (!parentTaskDropboxPath) { console.error(`Parent path not found for ${parentTask.id}, aborting for ${task.id}.`); processedTaskIds.add(task.id); return; }
      } else { console.warn(`Parent ID ${task.parent_task_id} not found for task ${task.id}.`); }
    }

    processedTaskIds.add(task.id);
    try {
      const basePathForCurrentTask = parentTaskDropboxPath || projectFolderPath;
      await this.createHierarchicalTaskFolderInternal(task, basePathForCurrentTask, useProjectTable, projectTableName);
    } catch (folderError) { console.error(`Error creating folder for task ${task.id}:`, folderError); }

    // הגדלת ההשהיה בין יצירת תיקיות לפתרון בעיית הקונפליקטים
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const childTasks = allTasks.filter((t: Task) => t.parent_task_id === task.id);
    if (childTasks.length > 0) {
      console.log(`Processing ${childTasks.length} children for task ${task.id}...`);
      for (const childTask of childTasks) {
        await this.processTaskHierarchyFolders(childTask, tasksMap, allTasks, projectFolderPath, projectTableName, useProjectTable, processedTaskIds, currentDepth + 1, maxDepth);
      }
    }
  },

  isCircularReference(taskId: string, parentId: string, tasksMap: Map<string, Task>, visited: Set<string> = new Set<string>()): boolean {
    visited.add(parentId);
    const parent = tasksMap.get(parentId);
    if (!parent) return false;
    if (parent.parent_task_id === taskId) return true;
    if (parent.parent_task_id && visited.has(parent.parent_task_id)) return true;
    if (!parent.parent_task_id) return false;
    return this.isCircularReference(taskId, parent.parent_task_id, tasksMap, visited);
  },
};

export default taskService; 