import supabase from '../supabase';
import { Project, NewProject, UpdateProject } from '@/types/supabase';

export const projectService = {
  // קריאת כל הפרויקטים
  async getProjects(): Promise<Project[]> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching projects:', error);
      throw new Error(error.message);
    }
    
    return data || [];
  },
  
  // קריאת פרויקט אחד לפי מזהה
  async getProjectById(id: string): Promise<Project | null> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`Error fetching project with id ${id}:`, error);
      throw new Error(error.message);
    }
    
    return data;
  },
  
  // יצירת פרויקט חדש
  async createProject(project: NewProject): Promise<Project> {
    const { data, error } = await supabase
      .from('projects')
      .insert(project)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating project:', error);
      throw new Error(error.message);
    }
    
    return data;
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
  }
};

export default projectService; 