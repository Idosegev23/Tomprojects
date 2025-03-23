import supabase from '../supabase';
import { Stage, NewStage, UpdateStage } from '@/types/supabase';

// פונקציה להחזרת שם הטבלה הספציפית של הפרויקט
const getProjectStagesTable = (projectId: string): string => {
  return `project_${projectId}_stages`;
};

// פונקציה לבדיקה אם טבלה ספציפית קיימת
const checkIfTableExists = async (tableName: string): Promise<boolean> => {
  try {
    // ניסיון לבצע שאילתה פשוטה על הטבלה
    const { data, error } = await supabase
      .from(tableName)
      .select('id')
      .limit(1);
    
    // אם אין שגיאה, הטבלה קיימת
    return !error;
  } catch (err) {
    console.error(`Error checking if table ${tableName} exists:`, err);
    return false;
  }
};

export const stageService = {
  // קריאת כל השלבים בפרויקט
  async getProjectStages(projectId: string): Promise<Stage[]> {
    try {
      // קודם ננסה להשתמש בטבלה הספציפית של הפרויקט
      const tableName = getProjectStagesTable(projectId);
      const tableExists = await checkIfTableExists(tableName);
      
      if (tableExists) {
        // אם הטבלה הספציפית קיימת, נשתמש בה
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: true });
        
        if (error) {
          console.error(`Error fetching stages from project-specific table ${tableName}:`, error);
          throw new Error(error.message);
        }
        
        return data || [];
      } else {
        // אם הטבלה הספציפית אינה קיימת, נשתמש בטבלה הכללית
        const { data, error } = await supabase
          .from('stages')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: true });
        
        if (error) {
          console.error(`Error fetching stages for project ${projectId} from main table:`, error);
          throw new Error(error.message);
        }
        
        return data || [];
      }
    } catch (err) {
      console.error(`Error in getProjectStages for project ${projectId}:`, err);
      throw new Error(err instanceof Error ? err.message : 'אירעה שגיאה לא ידועה');
    }
  },
  
  // קריאת שלב ספציפי
  async getStageById(id: string, projectId: string): Promise<Stage | null> {
    try {
      // קודם ננסה להשתמש בטבלה הספציפית של הפרויקט
      const tableName = getProjectStagesTable(projectId);
      const tableExists = await checkIfTableExists(tableName);
      
      if (tableExists) {
        // אם הטבלה הספציפית קיימת, נשתמש בה
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .eq('id', id)
          .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error(`Error fetching stage with id ${id} from project-specific table ${tableName}:`, error);
          throw new Error(error.message);
        }
        
        return data;
      }
      
      // אם הטבלה הספציפית אינה קיימת או לא מצאנו את השלב, ננסה בטבלה הכללית
      const { data, error } = await supabase
        .from('stages')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error(`Error fetching stage with id ${id} from main table:`, error);
        throw new Error(error.message);
      }
      
      return data;
    } catch (err) {
      console.error(`Error in getStageById for stage ${id}:`, err);
      throw new Error(err instanceof Error ? err.message : 'אירעה שגיאה לא ידועה');
    }
  },
  
  // יצירת שלב חדש
  async createStage(stage: NewStage): Promise<Stage> {
    try {
      // וידוא שיש מזהה UUID
      if (!stage.id) {
        stage.id = crypto.randomUUID();
      }
      
      // קודם נוודא שהטבלה הספציפית של הפרויקט קיימת
      const projectId = stage.project_id;
      const tableName = getProjectStagesTable(projectId);
      let tableExists = await checkIfTableExists(tableName);
      
      // אם הטבלה לא קיימת, ניצור אותה
      if (!tableExists) {
        try {
          await supabase.rpc('create_project_stages_table', {
            project_id: projectId
          });
          
          console.log(`Created project-specific stages table ${tableName} for project ${projectId}`);
          tableExists = true;
        } catch (createError) {
          console.error(`Error creating project-specific stages table ${tableName}:`, createError);
          throw new Error(`שגיאה ביצירת טבלת שלבים ייעודית: ${createError instanceof Error ? createError.message : 'שגיאה לא ידועה'}`);
        }
      }
      
      // הוספת השלב רק לטבלה הספציפית
      const { data, error } = await supabase
        .from(tableName)
        .insert(stage)
        .select()
        .single();
      
      if (error) {
        console.error(`Error creating stage in project-specific table ${tableName}:`, error);
        throw new Error(`שגיאה ביצירת שלב: ${error.message}`);
      }
      
      console.log(`Stage created successfully in project-specific table ${tableName}`);
      return data;
    } catch (err) {
      console.error('Error in createStage:', err);
      throw new Error(err instanceof Error ? err.message : 'אירעה שגיאה לא ידועה');
    }
  },
  
  // עדכון שלב קיים
  async updateStage(id: string, stage: UpdateStage, projectId: string): Promise<Stage> {
    try {
      // וידוא שהטבלה הספציפית של הפרויקט קיימת
      const tableName = getProjectStagesTable(projectId);
      let tableExists = await checkIfTableExists(tableName);
      
      // אם הטבלה לא קיימת, ניצור אותה
      if (!tableExists) {
        try {
          await supabase.rpc('create_project_stages_table', {
            project_id: projectId
          });
          
          console.log(`Created project-specific stages table ${tableName} for project ${projectId}`);
          tableExists = true;
        } catch (createError) {
          console.error(`Error creating project-specific stages table ${tableName}:`, createError);
          throw new Error(`שגיאה ביצירת טבלת שלבים ייעודית: ${createError instanceof Error ? createError.message : 'שגיאה לא ידועה'}`);
        }
      }
      
      // עדכון השלב רק בטבלה הספציפית
      const { data, error } = await supabase
        .from(tableName)
        .update(stage)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error(`Error updating stage with id ${id} in project-specific table ${tableName}:`, error);
        throw new Error(`שגיאה בעדכון שלב: ${error.message}`);
      }
      
      console.log(`Stage updated successfully in project-specific table ${tableName}`);
      return data;
    } catch (err) {
      console.error(`Error in updateStage for stage ${id}:`, err);
      throw new Error(err instanceof Error ? err.message : 'אירעה שגיאה לא ידועה');
    }
  },
  
  // מחיקת שלב
  async deleteStage(id: string, projectId: string): Promise<void> {
    try {
      // קודם ננסה למחוק מהטבלה הספציפית של הפרויקט אם היא קיימת
      const tableName = getProjectStagesTable(projectId);
      const tableExists = await checkIfTableExists(tableName);
      
      if (!tableExists) {
        throw new Error(`טבלת השלבים הייחודית ${tableName} לא קיימת`);
      }
      
      // עדכון המשימות המשויכות לשלב זה (אם ישנן)
      const tasksTableName = `project_${projectId}_tasks`;
      const tasksTableExists = await checkIfTableExists(tasksTableName);
      
      if (tasksTableExists) {
        const { error: updateTasksError } = await supabase
          .from(tasksTableName)
          .update({ stage_id: null })
          .eq('stage_id', id);
        
        if (updateTasksError) {
          console.error(`שגיאה בעדכון משימות של שלב ${id} בטבלת המשימות הייחודית ${tasksTableName}:`, updateTasksError);
          // נמשיך למחיקת השלב גם אם יש שגיאה בעדכון המשימות
        }
      }
      
      // מחיקת השלב מהטבלה הספציפית
      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);
      
      if (deleteError) {
        console.error(`Error deleting stage with id ${id} from project-specific table ${tableName}:`, deleteError);
        throw new Error(`שגיאה במחיקת שלב מטבלה ייחודית: ${deleteError.message}`);
      }
      
      console.log(`Stage deleted successfully from project-specific table ${tableName}`);
    } catch (err) {
      console.error(`Error in deleteStage for stage ${id}:`, err);
      throw new Error(err instanceof Error ? err.message : 'אירעה שגיאה לא ידועה');
    }
  },
  
  // יצירת שלבים ברירת מחדל לפרויקט חדש
  async createDefaultStages(projectId: string): Promise<Stage[]> {
    try {
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
      
      // וידוא שהטבלה הספציפית של הפרויקט קיימת
      const tableName = getProjectStagesTable(projectId);
      let tableExists = await checkIfTableExists(tableName);
      
      // אם הטבלה לא קיימת, ניצור אותה
      if (!tableExists) {
        try {
          await supabase.rpc('create_project_stages_table', {
            project_id: projectId
          });
          
          console.log(`Created project-specific stages table ${tableName} for project ${projectId}`);
          tableExists = true;
        } catch (createError) {
          console.error(`Error creating project-specific stages table ${tableName}:`, createError);
          throw new Error(`שגיאה ביצירת טבלת שלבים ייעודית: ${createError instanceof Error ? createError.message : 'שגיאה לא ידועה'}`);
        }
      }
      
      // הוספת השלבים רק לטבלה הספציפית
      const { data, error } = await supabase
        .from(tableName)
        .insert(defaultStages)
        .select();
      
      if (error) {
        console.error(`Error creating default stages in project-specific table ${tableName}:`, error);
        throw new Error(`שגיאה ביצירת שלבי ברירת מחדל: ${error.message}`);
      }
      
      console.log(`Default stages created successfully in project-specific table ${tableName}`);
      return data || [];
    } catch (err) {
      console.error(`Error in createDefaultStages for project ${projectId}:`, err);
      throw new Error(err instanceof Error ? err.message : 'אירעה שגיאה לא ידועה');
    }
  },
  
  // עדכון סדר השלבים
  // הערה: פונקציה זו מוכנה לעתיד במקרה שיוסיפו את שדה order לסכמה
  async reorderStages(stages: { id: string, order: number }[], projectId: string): Promise<void> {
    try {
      // קודם ננסה לעדכן בטבלה הספציפית של הפרויקט אם היא קיימת
      const tableName = getProjectStagesTable(projectId);
      const tableExists = await checkIfTableExists(tableName);
      
      if (tableExists) {
        const updates = stages.map(stage => 
          supabase
            .from(tableName)
            .update({ order_num: stage.order })
            .eq('id', stage.id)
        );
        
        await Promise.all(updates);
        console.log(`Stages reordered successfully in project-specific table ${tableName}`);
        return;
      }
      
      console.warn("Column 'order_num' might not exist in stages table. Functionality not fully implemented.");
      // לוגיקה לעדכון בטבלה הכללית תתווסף בעתיד אם יהיה צורך
    } catch (error) {
      console.error('Error reordering stages:', error);
      throw new Error('Failed to reorder stages');
    }
  },
  
  // קריאת כל השלבים והמשימות בפרויקט ספציפי
  async getStagesWithTasks(projectId: string): Promise<any[]> {
    try {
      // קבלת כל השלבים בפרויקט
      const stages = await this.getProjectStages(projectId);
      
      // במקרה ואין שלבים, נחזיר מערך ריק
      if (!stages || stages.length === 0) {
        return [];
      }
      
      // קבלת המשימות לכל שלב (ישתמש בטבלת המשימות הספציפית של הפרויקט אם קיימת)
      const stagesWithTasks = await Promise.all(
        stages.map(async (stage) => {
          // קודם ננסה לקרוא מהטבלה הספציפית של הפרויקט
          const tasksTableName = `project_${projectId}_tasks`;
          const tableExists = await checkIfTableExists(tasksTableName);
          
          let tasks = [];
          if (tableExists) {
            // אם הטבלה הספציפית קיימת, נשתמש בה
            const { data, error } = await supabase
              .from(tasksTableName)
              .select('*')
              .eq('stage_id', stage.id)
              .eq('project_id', projectId)
              .order('created_at', { ascending: true });
            
            if (!error) {
              tasks = data || [];
            } else {
              console.error(`Error fetching tasks for stage ${stage.id} from project-specific table:`, error);
              // במקרה של שגיאה, ננסה לקרוא מהטבלה הכללית
              const { data: generalData, error: generalError } = await supabase
                .from('tasks')
                .select('*')
                .eq('stage_id', stage.id)
                .eq('project_id', projectId)
                .order('created_at', { ascending: true });
              
              if (generalError) {
                console.error(`Error fetching tasks for stage ${stage.id} from main table:`, generalError);
              } else {
                tasks = generalData || [];
              }
            }
          } else {
            // אם הטבלה הספציפית אינה קיימת, נשתמש בטבלה הכללית
            const { data, error } = await supabase
              .from('tasks')
              .select('*')
              .eq('stage_id', stage.id)
              .eq('project_id', projectId)
              .order('created_at', { ascending: true });
            
            if (error) {
              console.error(`Error fetching tasks for stage ${stage.id} from main table:`, error);
            } else {
              tasks = data || [];
            }
          }
          
          return {
            ...stage,
            tasks
          };
        })
      );
      
      return stagesWithTasks;
    } catch (err) {
      console.error(`Error in getStagesWithTasks for project ${projectId}:`, err);
      throw new Error(err instanceof Error ? err.message : 'אירעה שגיאה לא ידועה');
    }
  }
};

export default stageService; 