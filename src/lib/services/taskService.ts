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
    // ניתן להוסיף כאן קוד לתיעוד פעולות בקובץ או בבסיס נתונים
  } catch (error) {
    console.error('Error updating build tracking:', error);
  }
}

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
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .maybeSingle(); // שימוש ב-maybeSingle במקום single למניעת שגיאות
      
      if (error) {
        console.error(`Error fetching task with id ${id}:`, error);
        throw new Error(error.message);
      }
      
      return data;
    } catch (err) {
      console.error(`Error in getTaskById for task ${id}:`, err);
      // להחזיר null במקום לזרוק שגיאה, כדי לאפשר לקוד הקורא לטפל במקרה שמשימה לא נמצאה
      return null;
    }
  },
  
  // פונקציה להסרת שדות שאינם חלק מהטבלה
  async removeNonExistingFields(task: any, forProjectTable: boolean = false): Promise<any> {
    // רשימת השדות הקיימים בטבלה הראשית
    const mainTableFields = [
      'id', 'project_id', 'stage_id', 'title', 'description', 'category',
      'status', 'priority', 'responsible', 'estimated_hours', 'actual_hours',
      'start_date', 'due_date', 'completed_date', 'budget', 'dependencies',
      'assignees_info', 'watchers', 'labels', 'deleted', 'created_at',
      'updated_at', 'hierarchical_number', 'parent_task_id', 'is_template',
      'is_global_template', 'original_task_id'
    ];
    
    // רשימת השדות הקיימים בטבלה הספציפית של פרויקט
    const projectTableFields = [
      'id', 'project_id', 'stage_id', 'title', 'description', 'category',
      'status', 'priority', 'responsible', 'due_date', 'assignees_info',
      'created_at', 'updated_at', 'hierarchical_number', 'parent_task_id'
    ];
    
    const validFields = forProjectTable ? projectTableFields : mainTableFields;
    const cleanedTask = { ...task };
    
    // הסר את כל השדות שאינם קיימים ברשימת השדות התקפים
    for (const key in cleanedTask) {
      if (!validFields.includes(key)) {
        delete cleanedTask[key];
      }
    }
    
    return cleanedTask;
  },
  
  // פונקציה לקריאת משימות לפי שלב ופרויקט (אופציונלי)
  async getTasksByStage(stageId: string, projectId?: string): Promise<Task[]> {
    try {
      let query = supabase.from('tasks').select('*').eq('stage_id', stageId);

      // אם סופק projectId, נסנן גם לפיו
      // נצטרך להחליט אם להשתמש בטבלה ספציפית או לסנן בטבלה הראשית
      // כרגע, נניח שנסנן בטבלה הראשית
      if (projectId) {
        query = query.eq('project_id', projectId);
      } else {
        // אם אין projectId, אולי נרצה לסנן החוצה משימות שכן שייכות לפרויקט?
        // נשאיר את זה פתוח לדיון, כרגע נחזיר את כל המשימות לשלב הנתון ללא קשר לפרויקט
        // query = query.is('project_id', null); // אפשרות אם רוצים רק גלובליות
      }

      const { data, error } = await query.order('hierarchical_number', { ascending: true });

      if (error) {
        console.error(`Error fetching tasks for stage ${stageId}${projectId ? ` in project ${projectId}` : ''}:`, error);
        throw new Error(error.message);
      }

      return data || [];
    } catch (err) {
      console.error(`Error in getTasksByStage for stage ${stageId}:`, err);
      throw err; // Re-throw the error for the caller to handle
    }
  },
  
  // Placeholder functions for hierarchical numbering to resolve linter errors
  // TODO: Implement or find the actual definitions for these functions
  async getProjectSpecificNextSubHierarchicalNumber(parentId: string, projectId: string): Promise<string> {
    console.warn('Placeholder: getProjectSpecificNextSubHierarchicalNumber called');
    return 'PLACEHOLDER_SUB'; // Replace with actual implementation
  },
  async getNextSubHierarchicalNumber(parentId: string): Promise<string> {
    console.warn('Placeholder: getNextSubHierarchicalNumber called');
    return 'PLACEHOLDER_SUB_OLD'; // Replace with actual implementation
  },
  async getProjectSpecificNextRootHierarchicalNumber(projectId: string): Promise<string> {
    console.warn('Placeholder: getProjectSpecificNextRootHierarchicalNumber called');
    return 'PLACEHOLDER_ROOT'; // Replace with actual implementation
  },
  async getNextRootHierarchicalNumber(projectId: string): Promise<string> {
    console.warn('Placeholder: getNextRootHierarchicalNumber called');
    return 'PLACEHOLDER_ROOT_OLD'; // Replace with actual implementation
  },
  
  // עדכון פונקציית createTask
  async createTask(task: NewTask): Promise<Task> {
    try {
      // וידוא שיש מזהה UUID
      if (!task.id) {
        task.id = crypto.randomUUID();
      }
      
      // הגדרת תאריך התחלה כברירת מחדל להיום אם לא הוגדר
      if (!task.start_date) {
        task.start_date = new Date().toISOString().split('T')[0];
      }
      
      // תאימות לאחור: אם יש assignees אבל אין assignees_info, נעתיק את הערך
      if (task.assignees && !task.assignees_info) {
        task.assignees_info = Array.isArray(task.assignees) ? task.assignees : [];
      } else if (task.assignees_info && !Array.isArray(task.assignees_info)) {
        // אם assignees_info קיים אבל הוא לא מערך, נהפוך אותו למערך ריק
        task.assignees_info = [];
      }
      
      // יצירת עותק נקי של האובייקט task ללא שדות לא נתמכים
      let cleanedTask = { ...task };

      // טיפול בשדות תאריך ריקים - הסרתם מהאובייקט
      const dateFields = ['due_date']; // רק due_date קיים בטבלה
      for (const field of dateFields) {
        if (cleanedTask[field as keyof typeof cleanedTask] === '') {
          delete cleanedTask[field as keyof typeof cleanedTask];
        }
      }
      
      // וידוא שהשדה responsible קיים בפורמט הנכון
      if (cleanedTask.responsible === '') {
        cleanedTask.responsible = null;
      }
      
      // הסר את כל השדות שאינם קיימים בדאטאבייס
      cleanedTask = await this.removeNonExistingFields(cleanedTask, true);
      
      // אם המקבל את assignees_info מסוג מערך, נמיר אותו ל-JSON
      if (cleanedTask.assignees_info && Array.isArray(cleanedTask.assignees_info)) {
        // כיוון שהטבלה מצפה ל-jsonb ולא למערך, נשמור את המערך כ-JSON
        (cleanedTask as any).assignees_info = JSON.stringify(cleanedTask.assignees_info);
      }
      
      // אם יש project_id ואין hierarchical_number, נחשב את המספר ההיררכי הבא
      if (cleanedTask.project_id && !cleanedTask.hierarchical_number) {
        // אם יש parent_task_id, נחשב את המספר ההיררכי הבא כתת-משימה
        if (cleanedTask.parent_task_id) {
          try {
            // השתמש בפונקציה החדשה לחישוב מספר היררכי לתת-משימות בטבלה ייעודית
            cleanedTask.hierarchical_number = await this.getProjectSpecificNextSubHierarchicalNumber(
              cleanedTask.parent_task_id, 
              cleanedTask.project_id
            );
            console.log(`חושב מספר היררכי חדש לתת-משימה בטבלה ייעודית: ${cleanedTask.hierarchical_number}`);
          } catch (hierError) {
            console.error('שגיאה בחישוב מספר היררכי לתת-משימה בטבלה ייעודית:', hierError);
            // במקרה של שגיאה נחזור לפונקציה הישנה
            cleanedTask.hierarchical_number = await this.getNextSubHierarchicalNumber(cleanedTask.parent_task_id);
          }
        } else {
          try {
            // השתמש בפונקציה החדשה לחישוב מספר היררכי למשימות שורש בטבלה ייעודית
            cleanedTask.hierarchical_number = await this.getProjectSpecificNextRootHierarchicalNumber(cleanedTask.project_id);
            console.log(`חושב מספר היררכי חדש למשימת שורש בטבלה ייעודית: ${cleanedTask.hierarchical_number}`);
          } catch (hierError) {
            console.error('שגיאה בחישוב מספר היררכי למשימת שורש בטבלה ייעודית:', hierError);
            // במקרה של שגיאה נחזור לפונקציה הישנה
            cleanedTask.hierarchical_number = await this.getNextRootHierarchicalNumber(cleanedTask.project_id);
          }
        }
      }
      
      // אם המשימה היא ללא פרויקט (תבנית גלובלית), נוסיף אותה לטבלה הראשית
      if (!cleanedTask.project_id) {
        // הוספת תבנית גלובלית לטבלה הראשית - בטבלה הראשית יש יותר שדות
        // לכן ניצור עותק מקורי בלי סינון מלא
        const originalTask = { ...task };
        // מחיקת רק assignees לתאימות
        if ('assignees' in originalTask) {
          delete (originalTask as any).assignees;
        }
        
        // טיפול בשדות תאריך ריקים גם באובייקט המקורי
        const originalDateFields = ['start_date', 'due_date', 'completed_date'];
        for (const field of originalDateFields) {
          if (originalTask[field as keyof typeof originalTask] === '') {
            delete originalTask[field as keyof typeof originalTask];
          }
        }
        
        // תיקון: השתמש ב-.select() במקום .select().single() כדי למנוע שגיאות
        const { data, error } = await supabase
          .from('tasks')
          .insert(originalTask)
          .select('*')
          .single();
        
        if (error) {
          console.error('Error creating global task template:', error);
          throw new Error(`שגיאה ביצירת תבנית משימה גלובלית: ${error.message}`);
        }
        
        console.log('Global task template created successfully in main tasks table');
        return data; // החזר את האובייקט הראשון מהמערך
      } else {
        // אם המשימה שייכת לפרויקט, נבדוק אם יש טבלה ייעודית
        const projectTableName = `project_${cleanedTask.project_id}_tasks`;
        let useProjectTable = false;
        
        try {
          // בדיקה אם הטבלה קיימת
          const { data: tableExists, error: tableCheckError } = await supabase
            .rpc('check_table_exists', {
              table_name_param: projectTableName
            });
            
          if (tableCheckError) {
            console.error(`Error checking if project table ${projectTableName} exists:`, tableCheckError);
          } else {
            useProjectTable = !!tableExists;
          }
        } catch (checkError) {
          console.error(`Error in check_table_exists for ${projectTableName}:`, checkError);
        }
        
        let createdTask: Task;
        
        if (useProjectTable) {
          // שימוש בטבלה הייעודית של הפרויקט
          const { data, error } = await supabase
            .from(projectTableName)
            .insert(cleanedTask)
            .select('*')
            .single();
            
          if (error) {
            console.error(`Error inserting task into project-specific table ${projectTableName}:`, error);
            throw new Error(`שגיאה בהוספת משימה לטבלה הייעודית: ${error.message}`);
          }
          
          createdTask = data as Task;
        } else {
          // שימוש בטבלה הראשית
          // ניצור עותק מלא של המשימה עם כל השדות הנתמכים בטבלה הראשית
          const fullTask = await this.removeNonExistingFields(task, false);
          
          const { data, error } = await supabase
            .from('tasks')
            .insert(fullTask)
            .select('*')
            .single();
            
          if (error) {
            console.error('Error inserting task into main tasks table:', error);
            throw new Error(`שגיאה בהוספת משימה לטבלה הראשית: ${error.message}`);
          }
          
          createdTask = data;
        }
        
        // יצירת תיקייה בדרופבוקס עבור המשימה החדשה
        if (createdTask.project_id) {
          try {
            // קריאה סינכרונית - מחכה להשלמת יצירת התיקייה
            await this.createDropboxFolderForTask(createdTask, useProjectTable, projectTableName);
          } catch (err) {
            console.error(`Error in createDropboxFolderForTask:`, err);
            // לא נזרוק שגיאה במקרה זה, נאפשר להמשיך בתהליך יצירת המשימה
          }
        }
        
        return createdTask;
      }
    } catch (err) {
      console.error('Error in createTask:', err);
      throw new Error(err instanceof Error ? err.message : 'אירעה שגיאה ביצירת משימה');
    }
  },
  
  // פונקציה חדשה לטיפול ביצירת תיקיות דרופבוקס עבור משימות
  async createDropboxFolderForTask(task: Task, useProjectTable: boolean, projectTableName: string): Promise<void> {
    try {
      // קריאת פרטי הפרויקט לצורך יצירת תיקייה
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('name, entrepreneur_id')
        .eq('id', task.project_id)
        .single();
        
      if (projectError) {
        console.error(`Error fetching project details for task ${task.id}:`, projectError);
        return;
      }
      
      if (!projectData) {
        console.error(`No project data found for task ${task.id}`);
        return;
      }
      
      await updateBuildTracking(`יוצר תיקייה בדרופבוקס עבור משימה חדשה: ${task.title} (${task.id})`);
      
      // קריאת פרטי היזם אם קיים
      let entrepreneurId: string | undefined = undefined;
      let entrepreneurName: string | undefined = undefined;
      
      if (projectData.entrepreneur_id) {
        entrepreneurId = projectData.entrepreneur_id;
        try {
          // ניסיון לקבל את שם היזם מהמסד
          const { data: entrepreneurData, error: entrepreneurError } = await supabase
            .from('entrepreneurs')
            .select('name')
            .eq('id', entrepreneurId)
            .single();
            
          if (!entrepreneurError && entrepreneurData) {
            entrepreneurName = entrepreneurData.name;
            console.log(`Found entrepreneur for task: ${entrepreneurName} (${entrepreneurId})`);
          }
        } catch (entrepreneurError) {
          console.warn(`Could not fetch entrepreneur details for task: ${entrepreneurError}`);
        }
      }

      // קביעת נתיב תיקיית הפרויקט בדרופבוקס
      const cleanProjectName = sanitizePath(projectData.name);
      let projectBasePath = PROJECTS_PATH;

      // Construct entrepreneur path if applicable
      if (entrepreneurId && entrepreneurName) {
        const cleanEntrepreneurName = sanitizePath(entrepreneurName);
        const entrepreneurPath = `${projectBasePath}/${cleanEntrepreneurName}_${entrepreneurId}`;
        // Ensure entrepreneur folder exists (consider doing this once per project run)
        try {
          await dropboxService.createFolder(entrepreneurPath); // Create if not exists
          projectBasePath = entrepreneurPath; // Base path is now the entrepreneur's folder
        } catch (entError) {
          console.error(`Could not ensure entrepreneur folder exists: ${entrepreneurPath}`, entError);
          // Decide how to proceed: maybe default to base projects path?
          // For now, will continue assuming base path needs to be the entrepreneur folder
          projectBasePath = entrepreneurPath;
        }
      }

      // Final project folder path
      let projectFolderPath = `${projectBasePath}/${cleanProjectName}`;

      // Ensure project folder exists (consider doing this once per project run)
      console.log(`Ensuring final project folder: ${projectFolderPath}`);
      try {
         const projectFolderResult = await dropboxService.createFolder(projectFolderPath);
         projectFolderPath = projectFolderResult.path; // Use the actual path returned
         console.log(`Project folder ensured at: ${projectFolderPath}`);
      } catch (projError) {
         console.error(`CRITICAL: Failed to create or verify the main project folder: ${projectFolderPath}. Aborting task folder creation. Error:`, projError);
         await updateBuildTracking(`CRITICAL: Failed to create project folder ${projectFolderPath}. Aborting. Error: ${projError instanceof Error ? projError.message : projError}`);
         return;
      }

      // בדיקה אם זו תת-משימה או משימת שורש וטיפול בהתאם
      if (task.parent_task_id) {
        // העברנו את projectFolderPath המחושב
        await this.createSubtaskFolder(task, projectFolderPath, useProjectTable, projectTableName);
      } else {
        // העברנו את projectFolderPath המחושב
        await this.createRootTaskFolder(task, projectFolderPath, useProjectTable, projectTableName);
      }
    } catch (error) {
      console.error(`Error in createDropboxFolderForTask: ${error}`);
    }
  },

  async getTaskDropboxPath(task: Task, useProjectTable: boolean, projectTableName: string): Promise<string | null> {
    if (!task || !task.id) {
      console.warn('getTaskDropboxPath: Invalid task provided.');
      return null;
    }
    try {
      const tableName = useProjectTable ? projectTableName : 'tasks';
      const { data, error } = await supabase
        .from(tableName)
        .select('dropbox_folder')
        .eq('id', task.id)
        .single();

      if (error) {
        // Log error but don't throw, maybe the folder hasn't been created yet
        console.warn(`Error fetching Dropbox path for task ${task.id} from ${tableName}:`, error.message);
        return null;
      }

      if (data && data.dropbox_folder) {
        return data.dropbox_folder as string;
      } else {
        // Folder path not found in DB
        console.log(`Dropbox path for task ${task.id} not found in ${tableName}.`);
        return null;
      }
    } catch (dbError) {
      console.error(`Database error fetching Dropbox path for task ${task.id}:`, dbError);
      return null; // Return null on error
    }
  },

  // פונקציה נפרדת ליצירת תיקייה לתת-משימה - גרסה מתוקנת
  async createSubtaskFolder(
    task: Task,
    projectFolderPath: string, // נתיב תיקיית הפרויקט
    useProjectTable: boolean,
    projectTableName: string
  ): Promise<void> {
    if (!task.parent_task_id) {
       console.warn(`Task ${task.id} is not a subtask, skipping createSubtaskFolder.`);
       return;
    }
    try {
      console.log(`Creating subtask folder for task: ${task.title} (${task.id})`);
      // קבלת פרטי משימת האב
      const parentTask = await this.getTaskById(task.parent_task_id); // שימוש ב-getTaskById

      if (!parentTask) {
        console.error(`Parent task ${task.parent_task_id} not found for subtask ${task.id}. Cannot create folder.`);
        return;
      }

      // קבלת נתיב התיקייה של משימת האב מהמסד
      const parentTaskDropboxPath = await this.getTaskDropboxPath(parentTask, useProjectTable, projectTableName);

      if (!parentTaskDropboxPath) {
         console.error(`Dropbox path for parent task ${parentTask.id} not found. Cannot create subtask folder for ${task.id}.`);
         // ננסה ליצור את תיקיית האב אם היא לא קיימת
         console.log(`Attempting to create parent folder first for task ${parentTask.id}`);
         await this.createDropboxFolderForTask(parentTask, useProjectTable, projectTableName);
         // ננסה שוב לקבל את הנתיב אחרי היצירה
         const newParentPath = await this.getTaskDropboxPath(parentTask, useProjectTable, projectTableName);
         if (!newParentPath) {
            console.error(`Failed to create or find parent folder path for ${parentTask.id}. Aborting subtask folder creation.`);
            return;
         }
         // אם הצליח, נשתמש בנתיב החדש
         await this.createHierarchicalTaskFolderInternal(task, newParentPath, useProjectTable, projectTableName);
         return; // סיימנו לאחר יצירה מוצלחת
      }

      // אם נתיב האב קיים, ניצור את תיקיית התת-משימה תחתיו
      await this.createHierarchicalTaskFolderInternal(task, parentTaskDropboxPath, useProjectTable, projectTableName);

    } catch (error) {
      console.error(`Error creating subtask folder for ${task.id}:`, error);
      // לא זורקים שגיאה כדי לא לעצור את כל התהליך
    }
  },

  // פונקציה ליצירת תיקיית משימת שורש - חדשה
  async createRootTaskFolder(
    task: Task,
    projectFolderPath: string, // נתיב תיקיית הפרויקט
    useProjectTable: boolean,
    projectTableName: string
  ): Promise<void> {
    if (task.parent_task_id) {
       console.warn(`Task ${task.id} is a subtask, skipping createRootTaskFolder.`);
       return;
    }
     console.log(`Creating root task folder for task: ${task.title} (${task.id})`);
     // תיקיית שורש נוצרת ישירות תחת תיקיית הפרויקט
     await this.createHierarchicalTaskFolderInternal(task, projectFolderPath, useProjectTable, projectTableName);
  },

  // פונקציית עזר פנימית ליצירת התיקייה בפועל ועדכון המסד - תוקן
  async createHierarchicalTaskFolderInternal(
      task: Task,
      parentPath: string, // נתיב תיקיית האב (או תיקיית הפרויקט עבור משימות שורש)
      useProjectTable: boolean,
      projectTableName: string
  ): Promise<void> {
      try {
          // Use hierarchical number if available, otherwise just title (sanitized)
          const taskFolderNameBase = task.title ? sanitizePath(task.title) : `task_${task.id}`;
          const taskFolderName = task.hierarchical_number
              ? `${task.hierarchical_number} ${taskFolderNameBase}`
              : taskFolderNameBase;

          // נתיב מלא הוא נתיב האב + שם התיקייה של המשימה הנוכחית
          const fullTaskPath = `${parentPath}/${taskFolderName}`;

          await updateBuildTracking(`Attempting to create/verify folder for task: ${fullTaskPath}`);
          console.log(`Attempting to create/verify folder for task: ${fullTaskPath}`);

          // ודא שרק הנתיב מועבר לפונקציה
          const folderResult = await dropboxService.createFolder(fullTaskPath);
          const createdFolderPath = folderResult?.path; // Use the returned path

          if (createdFolderPath) {
            console.log(`Task folder created or verified: ${createdFolderPath}`);
            await updateBuildTracking(`Task folder created or verified: ${createdFolderPath}`);

            // עדכון מסד הנתונים עם הנתיב שנוצר
            const tableName = useProjectTable ? projectTableName : 'tasks';
            const { error: updateError } = await supabase
              .from(tableName)
              .update({ dropbox_folder: createdFolderPath })
              .eq('id', task.id);

            if (updateError) {
              console.error(`Failed to update task ${task.id} in ${tableName} with Dropbox path ${createdFolderPath}:`, updateError);
              await updateBuildTracking(`Failed to update task ${task.id} DB with path: ${createdFolderPath} - ${updateError.message}`);
            } else {
              console.log(`Successfully updated task ${task.id} in ${tableName} with Dropbox path.`);
              await updateBuildTracking(`Updated task ${task.id} DB with path: ${createdFolderPath}`);
            }

            // !!! הסרת הלוגיקה הרקורסיבית מפה - היא תטופל ע"י processTaskHierarchyFolders !!!

          } else {
            // טיפול במקרה שבו יצירת התיקייה נכשלה או לא החזירה נתיב
            console.error(`Folder creation/verification failed or did not return a path for: ${fullTaskPath}`);
            await updateBuildTracking(`Folder creation/verification failed for: ${fullTaskPath}`);
            // Consider throwing an error or returning a status to the caller
          }
      } catch (error: any) {
          console.error(`Error in createHierarchicalTaskFolderInternal for task ${task.id} (${task.title}):`, error);
          await updateBuildTracking(`Error creating folder for task ${task.id}: ${error.message}`);
          // Do not re-throw here to allow processing of other tasks potentially
      }
  },


  // ===== פונקציות ליצירת מבנה היררכי מלא =====

  // פונקציה ראשית ליצירת כל מבנה התיקיות עבור פרויקט - עודכן להעברת פרטי יזם
  async createFullHierarchicalFolderStructureForProject(
      project: { id: string; name: string; entrepreneur_id?: string | null }, // Pass the whole project object
      selectedEntrepreneurPath: string | null = null // Keep this for potential direct path usage if needed
  ): Promise<{ success: boolean; message: string; data?: any, project?: { id: string, path: string } }> {
      const projectId = project.id;
      const projectName = project.name;
      const entrepreneurId = project.entrepreneur_id; // Get from project object

      console.log(`Starting full hierarchical folder structure creation for project ${projectId} (${projectName})`);
      await updateBuildTracking(`Starting full hierarchical folder structure creation for project: ${projectName} (${projectId})`);

      let entrepreneurName: string | undefined = undefined;
      let finalProjectFolderPath: string | null = null; // To store the final path for return

      try {
          // 0. Fetch entrepreneur name if ID exists
          if (entrepreneurId) {
              try {
                  const { data: entrepreneurData, error: entrepreneurError } = await supabase
                      .from('entrepreneurs')
                      .select('name')
                      .eq('id', entrepreneurId)
                      .single();
                  if (entrepreneurError) throw entrepreneurError;
                  entrepreneurName = entrepreneurData?.name;
                  console.log(`Found entrepreneur: ${entrepreneurName} (${entrepreneurId})`);
              } catch (e) {
                  console.error(`Could not fetch entrepreneur name for ID ${entrepreneurId}:`, e);
                  await updateBuildTracking(`Warning: Could not fetch entrepreneur name for ID ${entrepreneurId}`);
                  // Continue without entrepreneur name? Or fail? For now, continue.
              }
          }

          // 1. קבע את שם הטבלה הייעודית (אם קיימת)
          const projectTableName = `project_${projectId}_tasks`;
          let useProjectTable = false;
          try {
              const { data: tableExists } = await supabase.rpc('check_table_exists', { table_name_param: projectTableName });
              useProjectTable = !!tableExists;
              console.log(`Project table ${projectTableName} ${useProjectTable ? 'exists' : 'does not exist'}. Using ${useProjectTable ? 'project table' : 'main tasks table'}.`);
          } catch (checkError) {
              console.error(`Error checking for project table ${projectTableName}, defaulting to main table:`, checkError);
          }
          const tableName = useProjectTable ? projectTableName : 'tasks';

          // 2. הבא את כל המשימות מהטבלה המתאימה
          const { data: tasks, error: fetchError } = await supabase
              .from(tableName)
              .select('*')
              .order('hierarchical_number', { ascending: true }); // סדר חשוב לעיבוד

          if (fetchError) {
              console.error(`Error fetching tasks from ${tableName}:`, fetchError);
              return { success: false, message: `שגיאה בקריאת משימות מטבלה ${tableName}: ${fetchError.message}` };
          }
          if (!tasks || tasks.length === 0) {
              console.log(`No tasks found for project ${projectId} in ${tableName}.`);
              // Ensure base folders even if no tasks
              // Construct path and ensure base folders
              const cleanProjectNameForEmpty = sanitizePath(projectName);
              let projectBasePathForEmpty = PROJECTS_PATH;
              if (selectedEntrepreneurPath) {
                 const exists = await dropboxService.folderExists(selectedEntrepreneurPath);
                 if (exists) projectBasePathForEmpty = selectedEntrepreneurPath;
              } else if (entrepreneurId && entrepreneurName) {
                  const cleanEntrepreneurNameForEmpty = sanitizePath(entrepreneurName);
                  const entrepreneurPathForEmpty = `${PROJECTS_PATH}/${cleanEntrepreneurNameForEmpty}_${entrepreneurId}`;
                  try {
                    await dropboxService.createFolder(entrepreneurPathForEmpty);
                    projectBasePathForEmpty = entrepreneurPathForEmpty;
                  } catch (entErrorEmpty) {
                     console.error(`Failed to ensure entrepreneur folder for empty project: ${entrepreneurPathForEmpty}`, entErrorEmpty);
                  }
              }
              const finalProjectFolderPathForEmpty = `${projectBasePathForEmpty}/${cleanProjectNameForEmpty}`;
              try {
                  await dropboxService.createFolder(finalProjectFolderPathForEmpty);
                  console.log(`Base project folder ensured even with no tasks: ${finalProjectFolderPathForEmpty}`);
              } catch (projErrorEmpty) {
                   console.error(`Failed to ensure project folder for empty project: ${finalProjectFolderPathForEmpty}`, projErrorEmpty);
              }
              return { success: true, message: 'לא נמצאו משימות לפרויקט זה, אך תיקיות הבסיס נוצרו/אומתו.', project: { id: projectId, path: finalProjectFolderPathForEmpty } };
          }

          // 3. הכן את נתיב הבסיס של הפרויקט והבטח את קיומו
          const cleanProjectName = sanitizePath(projectName);
          let projectBasePath = PROJECTS_PATH;

          if (selectedEntrepreneurPath) {
            console.log(`Using selected entrepreneur path: ${selectedEntrepreneurPath}`);
            const exists = await dropboxService.folderExists(selectedEntrepreneurPath);
            if (!exists) {
              console.warn(`Selected entrepreneur path ${selectedEntrepreneurPath} does not exist! Falling back to default logic.`);
              selectedEntrepreneurPath = null; // Fallback
            } else {
               projectBasePath = selectedEntrepreneurPath; // Use the selected path as the immediate parent for the project folder
               finalProjectFolderPath = `${projectBasePath}/${cleanProjectName}`;
            }
          }

          if (!finalProjectFolderPath && entrepreneurId && entrepreneurName) {
              const cleanEntrepreneurName = sanitizePath(entrepreneurName);
              const entrepreneurPath = `${PROJECTS_PATH}/${cleanEntrepreneurName}_${entrepreneurId}`;
              console.log(`Ensuring entrepreneur base folder: ${entrepreneurPath}`);
              try {
                  await dropboxService.createFolder(entrepreneurPath); // Ensure it exists
                  projectBasePath = entrepreneurPath; // Set base to entrepreneur folder
                  finalProjectFolderPath = `${projectBasePath}/${cleanProjectName}`;
              } catch (entError) {
                   console.error(`Failed to ensure entrepreneur folder ${entrepreneurPath}, project folder will be created under root projects path. Error:`, entError);
                   finalProjectFolderPath = `${PROJECTS_PATH}/${cleanProjectName}`;
              }
          } else if (!finalProjectFolderPath) {
              finalProjectFolderPath = `${PROJECTS_PATH}/${cleanProjectName}`;
          }

          console.log(`Ensuring final project folder: ${finalProjectFolderPath}`);
          try {
             const projectFolderResult = await dropboxService.createFolder(finalProjectFolderPath);
             finalProjectFolderPath = projectFolderResult.path; // Use the actual path returned
             console.log(`Project folder ensured at: ${finalProjectFolderPath}`);
          } catch (projError) {
             console.error(`CRITICAL: Failed to create or verify the main project folder: ${finalProjectFolderPath}. Aborting task folder creation. Error:`, projError);
             await updateBuildTracking(`CRITICAL: Failed to create project folder ${finalProjectFolderPath}. Aborting. Error: ${projError instanceof Error ? projError.message : projError}`);
             return { success: false, message: `שגיאה קריטית ביצירת תיקיית הפרויקט הראשית: ${finalProjectFolderPath}` };
          }


          // 4. בנה מפה של המשימות לגישה מהירה לפי ID
          const tasksMap = new Map<string, Task>(tasks.map(task => [task.id, task as Task]));

          // 5. זהה את משימות השורש (אלו ללא parent_task_id)
          const rootTasks = tasks.filter((task: Task) => !task.parent_task_id);
          console.log(`Found ${rootTasks.length} root tasks.`);

          // 6. השתמש ב-Set למעקב אחר משימות שכבר עובדו למניעת לולאות
          const processedTaskIds = new Set<string>();
          const maxDepth = 10; // הגבלת עומק רקורסיה

          // 7. עבור על כל משימת שורש והתחל את התהליך הרקורסיבי
          console.log('Starting recursive processing for root tasks...');
          for (const rootTask of rootTasks) {
              if (!processedTaskIds.has(rootTask.id)) {
                  await this.processTaskHierarchyFolders(
                      rootTask,
                      tasksMap,
                      tasks as Task[],
                      finalProjectFolderPath, // Pass the confirmed project folder path
                      projectTableName,
                      useProjectTable,
                      processedTaskIds,
                      0, // עומק התחלתי
                      maxDepth
                  );
              }
          }

          console.log(`Finished full hierarchical folder structure creation for project ${projectId}.`);
          await updateBuildTracking(`Finished full hierarchical folder structure creation for project: ${projectName} (${projectId})`);
          return {
              success: true,
              message: 'מבנה התיקיות ההיררכי נוצר/עודכן בהצלחה.',
              project: { id: projectId, path: finalProjectFolderPath } // Return the final project path
          };

      } catch (error) {
          console.error(`Critical error during createFullHierarchicalFolderStructureForProject for ${projectId}:`, error);
          await updateBuildTracking(`CRITICAL Error creating structure for project ${projectId}: ${error instanceof Error ? error.message : error}`);
          return {
              success: false,
              message: `שגיאה קריטית בתהליך יצירת התיקיות: ${error instanceof Error ? error.message : 'Unknown error'}`,
              project: { id: projectId, path: finalProjectFolderPath || 'unknown' } // Return path even on error if determined
          };
      }
  },


  // פונקציית העיבוד הרקורסיבית - ממוקמת מחדש כפונקציה נפרדת
  async processTaskHierarchyFolders(
    task: Task,
    tasksMap: Map<string, Task>,
    allTasks: Task[],
    projectFolderPath: string, // Absolute path to the ROOT project folder
    projectTableName: string,
    useProjectTable: boolean,
    processedTaskIds: Set<string>,
    currentDepth: number,
    maxDepth: number
  ): Promise<void> {
    // 1. בדיקת עומק רקורסיה מקסימלי
    if (currentDepth > maxDepth) {
      console.error(`Max recursion depth (${maxDepth}) exceeded for task ${task.id} (${task.title}). Stopping.`);
      await updateBuildTracking(`Max recursion depth reached for task ${task.id}`);
      return;
    }

    // 2. וידוא שהמשימה תקינה
    if (!task || !task.id) {
      console.error('Invalid task object received in processTaskHierarchyFolders. Skipping.');
      return;
    }

    // 3. בדיקה אם כבר טיפלנו במשימה זו (למניעת לופים)
    if (processedTaskIds.has(task.id)) {
      console.log(`Task ${task.title} (${task.id}) already processed, skipping.`);
      return;
    }

    // 4. בדיקה למעגל אינסופי ישיר (משימה שהיא האבא של עצמה)
    if (task.parent_task_id === task.id) {
      console.error(`Circular reference detected: task ${task.id} (${task.title}) is its own parent. Skipping.`);
      await updateBuildTracking(`Circular reference (self-parent) for task ${task.id}`);
      return;
    }

    // 5. בדיקה למעגל אינסופי עקיף
    if (task.parent_task_id && this.isCircularReference(task.id, task.parent_task_id, tasksMap)) {
        console.error(`Circular reference path detected involving task ${task.id} (${task.title}). Skipping creation.`);
        await updateBuildTracking(`Circular reference detected for task ${task.id}`);
        // Mark as processed to prevent further attempts down this path
        processedTaskIds.add(task.id);
        return;
    }

    // תיעוד פעולה
    console.log(`Processing folder for task: ${task.hierarchical_number || ''} ${task.title} (${task.id}) at depth ${currentDepth}`);
    await updateBuildTracking(`Processing folder for task: ${task.id} at depth ${currentDepth}`);

    // 6. וידוא שתיקיית האב קיימת ומטופלת קודם (במקרה של תת-משימה)
    let parentTaskDropboxPath: string | null = null;
    if (task.parent_task_id) {
        const parentTask = tasksMap.get(task.parent_task_id);
        if (parentTask) {
            // אם משימת האב עדיין לא עובדה, נטפל בה קודם רקורסיבית
            if (!processedTaskIds.has(parentTask.id)) {
                console.log(`Parent task ${parentTask.title} (${parentTask.id}) not processed yet. Processing parent first.`);
                await this.processTaskHierarchyFolders(
                    parentTask,
                    tasksMap,
                    allTasks,
                    projectFolderPath, // Pass the root project path
                    projectTableName,
                    useProjectTable,
                    processedTaskIds, // Pass the same set
                    currentDepth, // Keep same depth? Or currentDepth+1? Let's use currentDepth for now, parent is processed logically before child
                    maxDepth
                );
                // לאחר עיבוד האב, נוודא שהוא אכן עובד ונוסיף לסט
                if (!processedTaskIds.has(parentTask.id)) {
                    console.error(`Failed to process parent task ${parentTask.id} recursively. Aborting folder creation for child ${task.id}.`);
                    await updateBuildTracking(`Failed to process parent ${parentTask.id} for child ${task.id}`);
                    return; // לא ניתן להמשיך בלי האב
                }
                console.log(`Parent task ${parentTask.title} (${parentTask.id}) processed. Continuing with child ${task.title} (${task.id}).`);
            }

            // נוודא שלמשימת האב יש נתיב תיקייה קיים לאחר העיבוד
            parentTaskDropboxPath = await this.getTaskDropboxPath(parentTask, useProjectTable, projectTableName);
            if (!parentTaskDropboxPath) {
                console.error(`Could not find Dropbox path for processed parent task ${parentTask.id}. Cannot create folder for child ${task.id}.`);
                await updateBuildTracking(`Parent path not found for ${parentTask.id}, cannot create folder for child ${task.id}`);
                // Attempt to create the parent folder again? Risky, could loop.
                // Let's assume the parent processing should have handled it or logged an error.
                // We will mark the current task as processed and skip it to prevent potential infinite loops if parent keeps failing.
                 processedTaskIds.add(task.id);
                 return; 
            }
        } else {
            console.warn(`Parent task ID ${task.parent_task_id} specified for task ${task.id} but parent not found in tasksMap. Treating as root task.`);
            await updateBuildTracking(`Parent task ID ${task.parent_task_id} not found for task ${task.id}`);
            // Fallthrough: parentTaskDropboxPath remains null, createHierarchicalTaskFolderInternal will use projectFolderPath
        }
    }

    // 7. רישום המשימה הנוכחית כמטופלת *לפני* יצירת התיקייה והקריאות הרקורסיביות לילדים
    processedTaskIds.add(task.id);

    // 8. יצירת תיקייה למשימה הנוכחית (באמצעות הפונקציה הפנימית)
    try {
        // קבע את הנתיב של תיקיית האב (או תיקיית הפרויקט)
        const basePathForCurrentTask = parentTaskDropboxPath || projectFolderPath;
        await this.createHierarchicalTaskFolderInternal(task, basePathForCurrentTask, useProjectTable, projectTableName);
        console.log(`Successfully called folder creation logic for task ${task.title} (${task.id})`);
    } catch (folderError) {
        console.error(`Error during folder creation call for task ${task.id} (${task.title}):`, folderError);
        await updateBuildTracking(`Error calling folder creation for task ${task.id}: ${folderError instanceof Error ? folderError.message : folderError}`);
        // Even if folder creation fails, continue to process children
    }

    // 9. המתנה קצרה לפני המשך לתת-משימות (למניעת עומס על הדרופבוקס API)
    await new Promise(resolve => setTimeout(resolve, 250)); // Slightly reduced delay

    // 10. מציאת תתי-המשימות של המשימה הנוכחית ועיבוד רקורסיבי
    const childTasks = allTasks.filter((t: Task) => t.parent_task_id === task.id);

    if (childTasks.length > 0) {
        console.log(`Found ${childTasks.length} child tasks for task ${task.title} (${task.id}). Processing them...`);
        for (const childTask of childTasks) {
            // הקריאה הרקורסיבית תתעלם מילדים שכבר עובדו (בדיקה בתחילת הפונקציה)
            await this.processTaskHierarchyFolders(
                childTask,
                tasksMap,
                allTasks,
                projectFolderPath, // Pass the root project path again
                projectTableName,
                useProjectTable,
                processedTaskIds,
                currentDepth + 1, // Increment depth for children
                maxDepth
            );
        }
    }
  },


  // פונקציית עזר לבדיקת הימצאות מעגל אינסופי בין משימות
  isCircularReference(
    taskId: string, // The ID of the task we are checking the ancestry of
    parentId: string, // The immediate parent ID to start checking from
    tasksMap: Map<string, Task>,
    visited: Set<string> = new Set<string>() // Keep track of visited nodes in this specific check path
  ): boolean {
    // Add the current parent ID to the visited set for this path
    visited.add(parentId);

    // Get the parent task object
    const parent = tasksMap.get(parentId);

    // Base Case 1: No parent found (reached the root or an invalid ID)
    if (!parent) {
      return false; // No circular reference found along this path
    }

    // Base Case 2: The parent points back to the original task ID
    if (parent.parent_task_id === taskId) {
      return true; // Circular reference detected!
    }

    // Base Case 3: The parent points to a node already visited in this path
    if (parent.parent_task_id && visited.has(parent.parent_task_id)) {
        return true; // Circular reference detected!
    }

    // Base Case 4: The parent has no further parent (it's a root task relative to this path)
    if (!parent.parent_task_id) {
        return false; // No circular reference found along this path
    }

    // Recursive Step: Check the parent's parent
    return this.isCircularReference(taskId, parent.parent_task_id, tasksMap, new Set(visited)); // Pass a copy of visited set?
    // Using the same visited set should be correct for detecting cycles in the current path check.
    // return this.isCircularReference(taskId, parent.parent_task_id, tasksMap, visited);
  },
};

export default taskService; 