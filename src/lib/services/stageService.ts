import supabase from '../supabase';
import { Stage, NewStage, UpdateStage } from '@/types/supabase';

export const stageService = {
  // קריאת כל השלבים בפרויקט
  async getProjectStages(projectId: string): Promise<Stage[]> {
    const { data, error } = await supabase
      .from('stages')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error(`Error fetching stages for project ${projectId}:`, error);
      throw new Error(error.message);
    }
    
    return data || [];
  },
  
  // קריאת שלב ספציפי
  async getStageById(id: string): Promise<Stage | null> {
    const { data, error } = await supabase
      .from('stages')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`Error fetching stage with id ${id}:`, error);
      throw new Error(error.message);
    }
    
    return data;
  },
  
  // יצירת שלב חדש
  async createStage(stage: NewStage): Promise<Stage> {
    // וידוא שיש מזהה UUID
    if (!stage.id) {
      stage.id = crypto.randomUUID();
    }
    
    const { data, error } = await supabase
      .from('stages')
      .insert(stage)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating stage:', error);
      throw new Error(error.message);
    }
    
    return data;
  },
  
  // עדכון שלב קיים
  async updateStage(id: string, stage: UpdateStage): Promise<Stage> {
    const { data, error } = await supabase
      .from('stages')
      .update(stage)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error(`Error updating stage with id ${id}:`, error);
      throw new Error(error.message);
    }
    
    return data;
  },
  
  // מחיקת שלב
  async deleteStage(id: string): Promise<void> {
    const { error } = await supabase
      .from('stages')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error(`Error deleting stage with id ${id}:`, error);
      throw new Error(error.message);
    }
  },
  
  // יצירת שלבים ברירת מחדל לפרויקט חדש
  async createDefaultStages(projectId: string): Promise<Stage[]> {
    const defaultStages = [
      { 
        id: crypto.randomUUID(),
        project_id: projectId, 
        title: 'היכרות', 
        description: 'שלב ההיכרות עם הפרויקט',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { 
        id: crypto.randomUUID(),
        project_id: projectId, 
        title: 'איסוף חומר קיים', 
        description: 'איסוף כל החומר הקיים הרלוונטי לפרויקט',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { 
        id: crypto.randomUUID(),
        project_id: projectId, 
        title: 'השלמות', 
        description: 'השלמת החומרים החסרים',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { 
        id: crypto.randomUUID(),
        project_id: projectId, 
        title: 'הערות', 
        description: 'הוספת הערות וסיכום ביניים',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { 
        id: crypto.randomUUID(),
        project_id: projectId, 
        title: 'יישור קו', 
        description: 'יישור קו ואיחוד הנתונים',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { 
        id: crypto.randomUUID(),
        project_id: projectId, 
        title: 'עלייה לאוויר (פריסייל)', 
        description: 'הכנה לקראת פריסייל',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { 
        id: crypto.randomUUID(),
        project_id: projectId, 
        title: 'איסוף נתונים ועדכון', 
        description: 'איסוף נתונים ועדכונים לפרויקט',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { 
        id: crypto.randomUUID(),
        project_id: projectId, 
        title: 'המשך מכירות', 
        description: 'המשך תהליך המכירות',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { 
        id: crypto.randomUUID(),
        project_id: projectId, 
        title: 'תוך כדי בניה', 
        description: 'התנהלות במהלך הבניה',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { 
        id: crypto.randomUUID(),
        project_id: projectId, 
        title: 'מסירות', 
        description: 'מסירת הדירות ללקוחות',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    ];
    
    const { data, error } = await supabase
      .from('stages')
      .insert(defaultStages)
      .select();
    
    if (error) {
      console.error(`Error creating default stages for project ${projectId}:`, error);
      throw new Error(error.message);
    }
    
    return data || [];
  },
  
  // עדכון סדר השלבים
  async reorderStages(stages: { id: string, order: number }[]): Promise<void> {
    try {
      // בדיקה אם העמודה 'order' קיימת בטבלה לפני ניסיון עדכון
      const { error: checkError } = await supabase
        .from('stages')
        .select('id')
        .limit(1);
        
      if (checkError && checkError.message.includes("order")) {
        console.warn("Column 'order' does not exist in stages table. Skipping reordering.");
        return;
      }
      
      // עדכון כל שלב בנפרד
      const updates = stages.map(stage => 
        supabase
          .from('stages')
          .update({ order: stage.order })
          .eq('id', stage.id)
      );
      
      await Promise.all(updates);
    } catch (error) {
      console.error('Error reordering stages:', error);
      throw new Error('Failed to reorder stages');
    }
  }
};

export default stageService; 