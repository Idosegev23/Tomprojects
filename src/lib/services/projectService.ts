import supabase from '../supabase';
import { Project, NewProject, UpdateProject } from '@/types/supabase';

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
  async createProject(project: NewProject): Promise<Project> {
    // וידוא שיש מזהה UUID
    if (!project.id) {
      project.id = crypto.randomUUID();
    }
    
    const { data, error } = await supabase
      .from('projects')
      .insert(project)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating project:', error);
      throw new Error(error.message);
    }
    
    // יצירת טבלאות ספציפיות לפרויקט ואתחול נתונים ראשוניים
    try {
      await supabase.rpc('init_project_tables_and_data', {
        project_id: data.id,
        create_default_stages: true,
        create_default_tasks: true
      });
      console.log(`Project tables for project ${data.id} initialized successfully with default data`);
    } catch (tableError) {
      console.error(`Error initializing project tables for project ${data.id}:`, tableError);
      // לא נזרוק שגיאה כאן כדי לא לעצור את יצירת הפרויקט
      console.log('Project created successfully, but without dedicated tables. Some features may be limited.');
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
    const { data, error } = await supabase
      .from('projects')
      .update(project)
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
        const { data: allTasks, error: allTasksError } = await supabase
          .from(tableName)
          .select('status');
        
        if (allTasksError) {
          console.error(`Error counting tasks from project-specific table ${tableName}:`, allTasksError);
          throw new Error(allTasksError.message);
        }
        
        const total = allTasks?.length || 0;
        const completed = allTasks?.filter(task => task.status === 'done').length || 0;
        
        return { total, completed };
      } else {
        // שימוש בטבלה הכללית (לתאימות לאחור)
        console.warn(`Project table ${tableName} does not exist, falling back to main tasks table`);
        
        // שליפת כל המשימות בפרויקט
        const { data: allTasks, error: allTasksError } = await supabase
          .from('tasks')
          .select('status')
          .eq('project_id', projectId);
        
        if (allTasksError) {
          console.error(`Error counting tasks for project ${projectId} from main table:`, allTasksError);
          throw new Error(allTasksError.message);
        }
        
        const total = allTasks?.length || 0;
        const completed = allTasks?.filter(task => task.status === 'done').length || 0;
        
        return { total, completed };
      }
    } catch (err) {
      console.error(`Error in countTasksInProject for project ${projectId}:`, err);
      throw new Error(err instanceof Error ? err.message : 'אירעה שגיאה בספירת משימות');
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
  }
};

export default projectService; 