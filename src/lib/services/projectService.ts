import supabase from '../supabase';
import { Project, NewProject, UpdateProject } from '@/types/supabase';
import { ExtendedNewProject, ExtendedProject } from '@/types/extendedTypes';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import dropboxService from './dropboxService';
import { sanitizePath } from '@/utils/sanitizePath';

// תיעוד פעולות בקובץ build_tracking
async function updateBuildTracking(message: string) {
  try {
    console.log(`Build tracking: ${message}`);
    // ניתן להוסיף כאן קוד לתיעוד פעולות בקובץ או בבסיס נתונים
  } catch (error) {
    console.error('Error updating build tracking:', error);
  }
}

export const projectService = {
  // קריאת כל הפרויקטים
  async getProjects(): Promise<Project[]> {
    // קריאת מידע בסיסי מטבלת projects
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching projects:', error);
      throw new Error(error.message);
    }
    
    if (!data || data.length === 0) {
      return [];
    }
    
    // בעתיד ניתן להוסיף כאן קוד שמעשיר את המידע על כל פרויקט
    // מהטבלה הייחודית שלו
    
    return data;
  },
  
  // קריאת פרויקט אחד לפי מזהה
  async getProjectById(id: string): Promise<Project | null> {
    // קריאת מידע בסיסי מטבלת projects
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`Error fetching project with id ${id}:`, error);
      throw new Error(error.message);
    }
    
    if (!data) {
      return null;
    }
    
    // כרגע נחזיר רק את המידע הבסיסי מטבלת projects
    // בעתיד נוכל להוסיף מידע נוסף מהטבלה הייחודית לפרויקט
    return data;
  },
  
  // יצירת פרויקט חדש
  async createProject(project: ExtendedNewProject): Promise<Project> {
    const { data, error } = await supabase
      .from('projects')
      .insert(project)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating project:', error);
      throw new Error(error.message);
    }
    
    // הסרת הקריאה לאתחול הפרויקט מכאן
    // הפונקציה init_project_tables_and_data נקראת מדף היצירה של הפרויקט
    // עם מזהי המשימות שנבחרו
    console.log(`Project ${data.id} created successfully. Tables will be initialized from the UI.`);
    
    // יצירת תיקייה בדרופבוקס עבור הפרויקט החדש
    try {
      await updateBuildTracking(`יוצר תיקייה בדרופבוקס עבור פרויקט חדש: ${data.name} (${data.id})`);
      
      // בדיקה אם יש מידע על היזם
      let entrepreneurId = null;
      let entrepreneurName = null;
      
      if (data.entrepreneur_id) {
        entrepreneurId = data.entrepreneur_id;
        
        // ניסיון לקבל את שם היזם מהמסד
        try {
          const { data: entrepreneurData, error: entrepreneurError } = await supabase
            .from('entrepreneurs')
            .select('name')
            .eq('id', entrepreneurId)
            .single();
            
          if (!entrepreneurError && entrepreneurData) {
            entrepreneurName = entrepreneurData.name;
            console.log(`Found entrepreneur: ${entrepreneurName} (${entrepreneurId})`);
          }
        } catch (entrepreneurError) {
          console.warn(`Could not fetch entrepreneur details: ${entrepreneurError}`);
        }
      }
      
      let folderPath;
      
      // בדיקה אם יש נתיב תיקייה מוגדר שנבחר על ידי המשתמש
      if (project.dropbox_folder_path) {
        console.log(`Using selected Dropbox folder path: ${project.dropbox_folder_path}`);
        
        // יצירת תיקיית הפרויקט בדרופבוקס בתוך התיקייה שנבחרה
        try {
          // וידוא שהתיקייה קיימת
          const folderExists = await dropboxService.folderExists(project.dropbox_folder_path);
          
          if (folderExists) {
            // יצירת תיקיית הפרויקט בתוך התיקייה שנבחרה
            const projectFolderName = data.name ? data.name : `project_${data.id}`;
            const cleanProjectName = sanitizePath(projectFolderName);
            folderPath = `${project.dropbox_folder_path}/${cleanProjectName}`;
            
            const folder = await dropboxService.createFolder(folderPath);
            folderPath = folder.path;
            console.log(`Created project folder in selected path: ${folderPath}`);
          } else {
            console.warn(`Selected Dropbox folder does not exist: ${project.dropbox_folder_path}`);
            // אם התיקייה שנבחרה לא קיימת, ניצור תיקייה בדרך הרגילה
            folderPath = await dropboxService.createProjectFolder(
              data.id, 
              data.name,
              entrepreneurId,
              entrepreneurName
            );
          }
        } catch (error) {
          console.error(`Error creating project folder in selected path: ${error}`);
          // אם יש שגיאה, ניצור את התיקייה בדרך הרגילה
          folderPath = await dropboxService.createProjectFolder(
            data.id, 
            data.name,
            entrepreneurId,
            entrepreneurName
          );
        }
      } else {
        // אם אין נתיב נבחר, ניצור תיקייה בדרך הרגילה
        folderPath = await dropboxService.createProjectFolder(
          data.id, 
          data.name,
          entrepreneurId,
          entrepreneurName
        );
      }
      
      // שמירת נתיב התיקייה בפרויקט
      if (folderPath) {
        const { data: updateData, error: updateError } = await supabase
          .from('projects')
          .update({ dropbox_folder_path: folderPath })
          .eq('id', data.id)
          .select()
          .single();
          
        if (!updateError) {
          console.log(`Updated project with Dropbox folder path: ${folderPath}`);
        } else {
          console.error(`Error updating project with Dropbox folder path: ${updateError}`);
        }
      }
      
      console.log(`Created Dropbox folder for project ${data.name}: ${folderPath}`);
    } catch (dropboxError) {
      console.error(`Error creating Dropbox folder for project ${data.id}:`, dropboxError);
      // לא נזרוק שגיאה במקרה זה, נאפשר להמשיך בתהליך יצירת הפרויקט
    }
    
    return data;
  },
  
  // יצירת טבלה ייחודית לפרויקט
  async createProjectTable(projectId: string): Promise<void> {
    try {
      // קריאה לפונקציה SQL ליצירת טבלה ספציפית לפרויקט
      await supabase.rpc('create_project_table', {
        project_id: projectId
      });
      
      console.log(`Project-specific table for project ${projectId} created successfully`);
    } catch (error) {
      console.error(`Error creating project-specific table for project ${projectId}:`, error);
      
      // בדיקה אם השגיאה היא שגיאת תחביר באילוץ מפתח זר או התנגשות שמות
      if (error instanceof Error && 
          (error.message.includes('_project_id_fkey') || 
           error.message.includes('syntax error') ||
           error.message.includes('is ambiguous'))) {
        console.log('Ignoring known SQL error. Project will continue without a dedicated table.');
        // לא נזרוק שגיאה במקרה זה, נאפשר להמשיך בתהליך יצירת הפרויקט
        return;
      }
      
      throw new Error(error instanceof Error ? error.message : 'אירעה שגיאה ביצירת טבלה ספציפית לפרויקט');
    }
  },
  
  // עדכון פרויקט קיים
  async updateProject(id: string, project: UpdateProject): Promise<Project> {
    // וידוא שהשדות הנדרשים קיימים באובייקט העדכון
    const validFields = [
      'name', 'description', 'entrepreneur_id', 'status', 
      'priority', 'department', 'responsible', 'total_budget',
      'planned_start_date', 'planned_end_date', 
      'actual_start_date', 'actual_end_date',
      'progress', 'created_at', 'updated_at', 'owner'
    ];
    
    // סינון שדות לא חוקיים מהאובייקט
    const updateData: UpdateProject = {};
    
    // הוספת שדות חוקיים בלבד
    for (const key of Object.keys(project)) {
      if (validFields.includes(key)) {
        // הוספת השדה רק אם הוא קיים ברשימת השדות החוקיים
        (updateData as any)[key] = project[key as keyof UpdateProject];
      }
    }
    
    // הוספת שדה updated_at אם לא קיים
    if (!updateData.updated_at) {
      updateData.updated_at = new Date().toISOString();
    }
    
    const { data, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error(`Error updating project with id ${id}:`, error);
      throw new Error(error.message);
    }
    
    return data;
  },
  
  // מחיקת פרויקט
  async deleteProject(id: string): Promise<void> {
    try {
      // ניסיון מחיקה באמצעות הפונקציה המאולצת
      const { error: forceDeleteError } = await supabase.rpc('force_delete_project', {
        project_id_param: id
      });
      
      if (forceDeleteError) {
        console.error(`Error in force_delete_project for project id ${id}:`, forceDeleteError);
        
        // אם נכשל, ננסה את המחיקה הרגילה
        const { error } = await supabase
          .from('projects')
          .delete()
          .eq('id', id);
        
        if (error) {
          console.error(`Error deleting project with id ${id}:`, error);
          throw new Error(error.message);
        }
      }
    } catch (error: any) {
      console.error(`Error in deleteProject for project id ${id}:`, error);
      throw new Error(error.message);
    }
  },
  
  // ספירת המשימות בפרויקט
  async countTasksInProject(projectId: string): Promise<{ total: number, completed: number }> {
    const tableName = `project_${projectId}_tasks`;
    
    try {
      let total = 0;
      let completed = 0;
      
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
      
      // קריאת המשימות מהטבלה הספציפית אם היא קיימת
      if (tableExists) {
        // שימוש בטבלה הספציפית של הפרויקט
        const { data: projectSpecificTasks, error: projectSpecificError } = await supabase
          .from(tableName)
          .select('status');
        
        if (projectSpecificError) {
          console.error(`Error counting tasks from project-specific table ${tableName}:`, projectSpecificError);
          // ממשיכים לבדוק גם בטבלה הראשית
        } else {
          // אם קיבלנו נתונים תקינים, נוסיף אותם לספירה
          if (projectSpecificTasks && Array.isArray(projectSpecificTasks)) {
            total += projectSpecificTasks.length;
            completed += projectSpecificTasks.filter(task => task.status === 'done').length;
          }
        }
      }
      
      // בדיקה גם בטבלה הראשית (לתאימות לאחור או במקרה של תקלה)
      const { data: mainTableTasks, error: mainTableError } = await supabase
        .from('tasks')
        .select('status')
        .eq('project_id', projectId);
      
      if (mainTableError) {
        console.error(`Error counting tasks for project ${projectId} from main table:`, mainTableError);
        // אם יש שגיאה בטבלה הראשית, נחזיר את מה שכבר מצאנו בטבלה הייחודית
      } else {
        // אם קיבלנו נתונים תקינים, נוסיף אותם לספירה
        if (mainTableTasks && Array.isArray(mainTableTasks)) {
          total += mainTableTasks.length;
          completed += mainTableTasks.filter(task => task.status === 'done').length;
        }
      }
      
      // תיעוד המידע שנאסף
      await this.updateBuildTracking(projectId, {
        task_count: total,
        completed_task_count: completed,
        progress_percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
        last_count_update: new Date().toISOString()
      });
      
      return { total, completed };
    } catch (err) {
      console.error(`Error in countTasksInProject for project ${projectId}:`, err);
      // במקרה של שגיאה, נחזיר ערכי אפס כברירת מחדל
      return { total: 0, completed: 0 };
    }
  },
  
  // חישוב התקדמות הפרויקט
  async calculateProjectProgress(projectId: string): Promise<number> {
    const { total, completed } = await this.countTasksInProject(projectId);
    
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  },

  // עדכון התקדמות הפרויקט
  async updateProjectProgress(projectId: string): Promise<Project> {
    const progress = await this.calculateProjectProgress(projectId);
    
    return this.updateProject(projectId, { 
      progress,
      updated_at: new Date().toISOString()
    });
  },

  // סנכרון משימות של פרויקט
  async syncProjectTasks(projectId: string): Promise<void> {
    try {
      // אין צורך בסנכרון כי המערכת משתמשת ישירות בטבלאות הספציפיות של הפרויקט
      console.log(`Sync not needed for project ${projectId} - all operations now use only project-specific table`);
      
      // קריאה לשירות המשימות כדי לוודא שגם שם מעודכן
      const taskService = await import("./taskService").then(module => module.default);
      await taskService.syncProjectTasks(projectId);
    } catch (error) {
      console.error(`Error in syncProjectTasks for project ${projectId}:`, error);
      throw new Error(error instanceof Error ? error.message : 'אירעה שגיאה בפונקציית הסנכרון');
    }
  },

  // סנכרון כל הטבלאות הייחודיות של כל הפרויקטים
  async syncAllProjectTables(): Promise<void> {
    try {
      // קבלת כל הפרויקטים
      const projects = await this.getProjects();
      
      console.log(`Starting verification of ${projects.length} project tables...`);
      
      // עבור על כל פרויקט
      for (const project of projects) {
        try {
          // יצירת טבלה ייחודית לפרויקט אם היא לא קיימת
          await this.createProjectTable(project.id);
          
          // אין צורך בסנכרון המשימות כי המערכת משתמשת ישירות בטבלאות הספציפיות
          console.log(`Project ${project.id} (${project.name}) table verified`);
        } catch (projectError) {
          console.error(`Error verifying project ${project.id} (${project.name}) table:`, projectError);
          // נמשיך לפרויקט הבא גם אם יש שגיאה בפרויקט הנוכחי
        }
      }
      
      console.log('All project tables verified successfully');
    } catch (error) {
      console.error('Error verifying project tables:', error);
      throw new Error(error instanceof Error ? error.message : 'אירעה שגיאה בבדיקת טבלאות הפרויקטים');
    }
  },

  // סנכרון טבלאות פרויקט - חדש
  async syncProjectTables(projectId: string): Promise<any> {
    if (!projectId) {
      throw new Error('מזהה פרויקט חסר');
    }
    
    try {
      const response = await fetch(`/api/projects/${projectId}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'שגיאה בסנכרון טבלאות פרויקט');
      }
      
      return await response.json();
    } catch (error) {
      console.error('שגיאה בסנכרון טבלאות פרויקט:', error);
      throw error;
    }
  },

  // בדיקה אם קיימות טבלאות כפולות לפרויקט
  async checkDuplicateTables(projectId: string): Promise<{ hasDuplicates: boolean, details: any }> {
    if (!projectId) {
      throw new Error('מזהה פרויקט חסר');
    }
    
    try {
      const supabase = createClientComponentClient();
      
      // נחפש טבלאות שמכילות את ה-ID של הפרויקט בשמן
      const tablePrefix = `project_${projectId}_`;
      
      // קריאה לפונקציית RPC שבודקת אילו טבלאות קיימות במערכת
      const { data, error } = await supabase.rpc('list_tables_with_prefix', {
        prefix_param: tablePrefix
      });
      
      if (error) {
        console.error('שגיאה בבדיקת טבלאות כפולות:', error);
        
        // אם פונקציית ה-RPC לא קיימת, נחזיר שלא נמצאו כפילויות
        return { 
          hasDuplicates: false, 
          details: { 
            error: error.message,
            message: 'לא ניתן לבדוק טבלאות כפולות - הפונקציה list_tables_with_prefix חסרה'
          }
        };
      }
      
      // ברירת מחדל (אם אין מידע): אין כפילויות
      if (!data || !Array.isArray(data) || data.length === 0) {
        return { hasDuplicates: false, details: { tableCount: 0, tables: [] } };
      }
      
      // בדיקה אם יש יותר מטבלה אחת לכל סוג (tasks/stages)
      const tasksTablesCount = data.filter(table => table.endsWith('_tasks')).length;
      const stagesTablesCount = data.filter(table => table.endsWith('_stages')).length;
      
      const hasDuplicates = tasksTablesCount > 1 || stagesTablesCount > 1;
      
      return {
        hasDuplicates,
        details: {
          tableCount: data.length,
          tables: data,
          tasksTablesCount,
          stagesTablesCount,
          message: hasDuplicates ? 
            `נמצאו טבלאות כפולות: ${tasksTablesCount} טבלאות משימות, ${stagesTablesCount} טבלאות שלבים` : 
            'לא נמצאו טבלאות כפולות'
        }
      };
    } catch (error) {
      console.error('שגיאה בבדיקת טבלאות כפולות:', error);
      return { 
        hasDuplicates: false, 
        details: { 
          error: error instanceof Error ? error.message : 'שגיאה לא ידועה',
          message: 'שגיאה בבדיקת טבלאות כפולות'
        }
      };
    }
  },

  // עדכון מצב בנייה של פרויקט
  async updateBuildTracking(
    projectId: string,
    trackingData: Record<string, any>
  ): Promise<boolean> {
    try {
      if (!projectId) {
        console.error("updateBuildTracking: מזהה פרויקט חסר");
        return false;
      }

      try {
        // ניסיון ראשון - קריאה לפונקציית RPC
        const { data, error } = await supabase.rpc('update_build_tracking', {
          project_id_param: projectId,
          tracking_data: trackingData
        });

        if (!error) {
          console.log("build_tracking עודכן בהצלחה באמצעות RPC:", data);
          return true;
        }

        // אם הפונקציה לא קיימת או יש שגיאה, ננסה לעדכן ישירות את עמודת owner
        console.warn("אזהרה: נכשלה קריאה ל-RPC update_build_tracking:", error);
        console.log("מנסה לעדכן את נתוני הבנייה בעמודת owner ישירות...");
      } catch (rpcError) {
        console.error("שגיאה בקריאה ל-RPC:", rpcError);
        // המשך לניסיון ישיר לעדכון העמודה
      }

      // שליפת הערך הנוכחי של owner
      const { data: currentProject, error: fetchError } = await supabase
        .from('projects')
        .select('owner')
        .eq('id', projectId)
        .single();

      if (fetchError) {
        console.error("שגיאה בשליפת ערך owner נוכחי:", fetchError);
        return false;
      }

      // מיזוג הערך הקיים עם הערך החדש
      const currentOwnerData = currentProject?.owner || {};
      // שמירת המידע הקיים ב-owner והוספת חלק build_tracking
      const updatedOwnerData = { 
        ...currentOwnerData,
        build_tracking: {
          ...(currentOwnerData.build_tracking || {}),
          ...trackingData
        }
      };

      // עדכון ישיר של עמודת owner
      const { error: updateError } = await supabase
        .from('projects')
        .update({ 
          owner: updatedOwnerData,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId);

      if (updateError) {
        console.error("שגיאה בעדכון ישיר של נתוני הבנייה:", updateError);
        return false;
      }

      console.log("נתוני הבנייה עודכנו בהצלחה באמצעות עדכון ישיר של owner:", updatedOwnerData);
      return true;
    } catch (error) {
      console.error("שגיאה בלתי צפויה בעדכון נתוני הבנייה:", error);
      return false;
    }
  },

  // שליפת מצב בנייה של פרויקט
  async getBuildTracking(
    projectId: string
  ): Promise<Record<string, any> | null> {
    try {
      if (!projectId) {
        console.error("getBuildTracking: מזהה פרויקט חסר");
        return null;
      }

      let rpcSuccess = false;
      let buildTrackingData = {};

      try {
        // ניסיון ראשון - קריאה לפונקציית RPC
        const { data, error } = await supabase.rpc('get_build_tracking', {
          p_project_id: projectId
        });

        if (!error && data) {
          console.log("נשלפו נתוני הבנייה בהצלחה באמצעות RPC");
          rpcSuccess = true;
          return data.build_tracking || {};
        }

        // אם הפונקציה לא קיימת או יש שגיאה, נשלוף ישירות מעמודת owner
        console.warn("אזהרה: נכשלה קריאה ל-RPC get_build_tracking:", error);
      } catch (rpcError) {
        console.error("שגיאה בקריאה ל-RPC:", rpcError);
        // המשך לשליפה ישירה מהעמודה
      }

      if (!rpcSuccess) {
        // שליפה ישירה מעמודת owner
        console.log("מנסה לשלוף את נתוני הבנייה מעמודת owner ישירות...");
        const { data, error } = await supabase
          .from('projects')
          .select('owner')
          .eq('id', projectId)
          .single();

        if (error) {
          console.error("שגיאה בשליפה ישירה של נתוני הבנייה:", error);
          return null;
        }

        // במידה ו-owner קיים וכולל שדה build_tracking, נחזיר אותו
        buildTrackingData = data?.owner?.build_tracking || {};
        console.log("נשלפו נתוני הבנייה בהצלחה באמצעות שליפה ישירה מ-owner");
      }

      return buildTrackingData;
    } catch (error) {
      console.error("שגיאה בלתי צפויה בשליפת נתוני הבנייה:", error);
      return null;
    }
  }
};

export default projectService; 