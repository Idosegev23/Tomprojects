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
    
    // יצירת טבלה ייחודית לפרויקט
    try {
      await this.createProjectTable(data.id);
    } catch (tableError) {
      console.error(`Error creating project table for project ${data.id}:`, tableError);
      // לא נזרוק שגיאה כאן כדי לא לעצור את יצירת הפרויקט
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
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error(`Error deleting project with id ${id}:`, error);
      throw new Error(error.message);
    }
  },
  
  // ספירת המשימות בפרויקט
  async countTasksInProject(projectId: string): Promise<{ total: number, completed: number }> {
    // שליפת כל המשימות בפרויקט
    const { data: allTasks, error: allTasksError } = await supabase
      .from('tasks')
      .select('status')
      .eq('project_id', projectId);
    
    if (allTasksError) {
      console.error(`Error counting tasks for project ${projectId}:`, allTasksError);
      throw new Error(allTasksError.message);
    }
    
    const total = allTasks?.length || 0;
    const completed = allTasks?.filter(task => task.status === 'done').length || 0;
    
    return { total, completed };
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
      // קריאה לפונקציה SQL לסנכרון המשימות
      await supabase.rpc('sync_project_tasks', {
        project_id: projectId
      });
      
      console.log(`All tasks for project ${projectId} synced successfully`);
    } catch (error) {
      console.error(`Error syncing tasks for project ${projectId}:`, error);
      throw new Error(error instanceof Error ? error.message : 'אירעה שגיאה בסנכרון המשימות');
    }
  }
};

export default projectService; 