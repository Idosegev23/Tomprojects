import supabase from '../supabase';
import { Stage, NewStage, UpdateStage } from '@/types/supabase';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { v4 as uuidv4 } from 'uuid';

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
    const supabase = createClientComponentClient();
    
    if (!projectId) {
      console.error("getProjectStages: מזהה פרויקט חסר");
      return [];
    }
    
    // נבדוק אם הטבלה הייחודית לפרויקט קיימת
    const projectStagesTableName = `project_${projectId}_stages`;
    
    try {
      // בדיקה אם הטבלה קיימת
      const { data: tablesData, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_name', projectStagesTableName)
        .eq('table_schema', 'public');
        
      if (tablesError) {
        console.error(`שגיאה בבדיקת קיום טבלת ${projectStagesTableName}:`, tablesError);
        
        // במקרה של שגיאה, ננסה לשלוף נתונים מטבלת השלבים הכללית
        console.log(`מנסה לשלוף שלבים מהטבלה הכללית (stages) עבור פרויקט ${projectId}`);
        const { data: generalStages, error: generalError } = await supabase
          .from('stages')
          .select('*')
          .eq('project_id', projectId);
          
        if (generalError) {
          console.error('שגיאה בשליפת שלבים מהטבלה הכללית:', generalError);
          return [];
        }
        
        return generalStages || [];
      }
      
      const tableExists = tablesData && tablesData.length > 0;
      
      if (tableExists) {
        // שליפת השלבים מהטבלה הייחודית לפרויקט
        const { data, error } = await supabase
          .from(projectStagesTableName)
          .select('*');
          
        if (error) {
          console.error(`שגיאה בשליפת שלבים מטבלת ${projectStagesTableName}:`, error);
          
          // במקרה של שגיאה, ננסה לשלוף נתונים מטבלת השלבים הכללית
          console.log(`מנסה לשלוף שלבים מהטבלה הכללית (stages) עבור פרויקט ${projectId}`);
          const { data: generalStages, error: generalError } = await supabase
            .from('stages')
            .select('*')
            .eq('project_id', projectId);
            
          if (generalError) {
            console.error('שגיאה בשליפת שלבים מהטבלה הכללית:', generalError);
            return [];
          }
          
          return generalStages || [];
        }
        
        return data || [];
      } else {
        // אם הטבלה לא קיימת, ננסה לשלוף נתונים מטבלת השלבים הכללית
        console.log(`טבלת ${projectStagesTableName} לא קיימת, שולף שלבים מהטבלה הכללית עבור פרויקט ${projectId}`);
        const { data, error } = await supabase
          .from('stages')
          .select('*')
          .eq('project_id', projectId);
          
        if (error) {
          console.error('שגיאה בשליפת שלבים מהטבלה הכללית:', error);
          return [];
        }
        
        return data || [];
      }
    } catch (error) {
      console.error('שגיאה בלתי צפויה בפונקציה getProjectStages:', error);
      return [];
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
    const supabase = createClientComponentClient();
    
    if (!projectId) {
      console.error("createDefaultStages: מזהה פרויקט חסר");
      return [];
    }
    
    try {
      // יצירת שלבים ברירת מחדל
      const defaultStages = [
        {
          title: "הכנה",
          description: "שלב ההכנות הראשוני של הפרויקט",
          status: "active",
          color: "#3498db", // כחול
          project_id: projectId
        },
        {
          title: "תכנון",
          description: "קביעת תכנית העבודה ופירוט המשימות",
          status: "active",
          color: "#2ecc71", // ירוק
          project_id: projectId
        },
        {
          title: "ביצוע",
          description: "ביצוע המשימות המתוכננות",
          status: "active",
          color: "#e74c3c", // אדום
          project_id: projectId
        },
        {
          title: "בקרה",
          description: "בקרת איכות ופיקוח על התוצרים",
          status: "active",
          color: "#f39c12", // כתום
          project_id: projectId
        },
        {
          title: "סיום",
          description: "סיום הפרויקט ומסירתו",
          status: "pending",
          color: "#9b59b6", // סגול
          project_id: projectId
        }
      ];
      
      // נבדוק אם הטבלה הייחודית לפרויקט קיימת
      const projectStagesTableName = `project_${projectId}_stages`;
      
      // בדיקה אם הטבלה קיימת
      const { data: tablesData, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_name', projectStagesTableName)
        .eq('table_schema', 'public');
        
      if (tablesError) {
        console.error(`שגיאה בבדיקת קיום טבלת ${projectStagesTableName}:`, tablesError);
        
        // נשתמש בטבלה הכללית במקום
        console.log(`מוסיף שלבי ברירת מחדל לטבלה הכללית (stages) עבור פרויקט ${projectId}`);
        const { data, error } = await supabase
          .from('stages')
          .upsert(defaultStages.map(stage => ({ ...stage, id: uuidv4() })));
          
        if (error) {
          console.error('שגיאה בהוספת שלבי ברירת מחדל לטבלה הכללית:', error);
          return [];
        }
        
        // שליפת השלבים שנוצרו
        const { data: createdStages, error: fetchError } = await supabase
          .from('stages')
          .select('*')
          .eq('project_id', projectId);
          
        if (fetchError) {
          console.error('שגיאה בשליפת שלבי ברירת מחדל שנוצרו:', fetchError);
          return [];
        }
        
        return createdStages || [];
      }
      
      const tableExists = tablesData && tablesData.length > 0;
      
      if (tableExists) {
        // הוספת שלבי ברירת מחדל לטבלה הייחודית לפרויקט
        const { data, error } = await supabase
          .from(projectStagesTableName)
          .upsert(defaultStages.map(stage => ({ ...stage, id: uuidv4() })));
          
        if (error) {
          console.error(`שגיאה בהוספת שלבי ברירת מחדל לטבלת ${projectStagesTableName}:`, error);
          
          // נשתמש בטבלה הכללית כגיבוי
          console.log(`מוסיף שלבי ברירת מחדל לטבלה הכללית (stages) כגיבוי עבור פרויקט ${projectId}`);
          const { data: generalData, error: generalError } = await supabase
            .from('stages')
            .upsert(defaultStages.map(stage => ({ ...stage, id: uuidv4() })));
            
          if (generalError) {
            console.error('שגיאה בהוספת שלבי ברירת מחדל לטבלה הכללית:', generalError);
            return [];
          }
          
          // שליפת השלבים שנוצרו
          const { data: createdStages, error: fetchError } = await supabase
            .from(projectStagesTableName)
            .select('*');
            
          if (fetchError) {
            console.error(`שגיאה בשליפת שלבי ברירת מחדל שנוצרו מטבלת ${projectStagesTableName}:`, fetchError);
            
            // שליפה מהטבלה הכללית כגיבוי
            const { data: generalStages, error: generalFetchError } = await supabase
              .from('stages')
              .select('*')
              .eq('project_id', projectId);
              
            if (generalFetchError) {
              console.error('שגיאה בשליפת שלבי ברירת מחדל שנוצרו מהטבלה הכללית:', generalFetchError);
              return [];
            }
            
            return generalStages || [];
          }
          
          return createdStages || [];
        }
        
        // שליפת השלבים שנוצרו
        const { data: createdStages, error: fetchError } = await supabase
          .from(projectStagesTableName)
          .select('*');
          
        if (fetchError) {
          console.error(`שגיאה בשליפת שלבי ברירת מחדל שנוצרו מטבלת ${projectStagesTableName}:`, fetchError);
          
          // שליפה מהטבלה הכללית כגיבוי
          const { data: generalStages, error: generalFetchError } = await supabase
            .from('stages')
            .select('*')
            .eq('project_id', projectId);
            
          if (generalFetchError) {
            console.error('שגיאה בשליפת שלבי ברירת מחדל שנוצרו מהטבלה הכללית:', generalFetchError);
            return [];
          }
          
          return generalStages || [];
        }
        
        return createdStages || [];
      } else {
        // נשתמש בטבלה הכללית במקום
        console.log(`טבלת ${projectStagesTableName} לא קיימת, מוסיף שלבי ברירת מחדל לטבלה הכללית עבור פרויקט ${projectId}`);
        const { data, error } = await supabase
          .from('stages')
          .upsert(defaultStages.map(stage => ({ ...stage, id: uuidv4() })));
          
        if (error) {
          console.error('שגיאה בהוספת שלבי ברירת מחדל לטבלה הכללית:', error);
          return [];
        }
        
        // שליפת השלבים שנוצרו
        const { data: createdStages, error: fetchError } = await supabase
          .from('stages')
          .select('*')
          .eq('project_id', projectId);
          
        if (fetchError) {
          console.error('שגיאה בשליפת שלבי ברירת מחדל שנוצרו:', fetchError);
          return [];
        }
        
        return createdStages || [];
      }
    } catch (error) {
      console.error('שגיאה בלתי צפויה בפונקציה createDefaultStages:', error);
      return [];
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