import supabase from '../supabase';
import { Stage, NewStage, UpdateStage } from '@/types/supabase';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { v4 as uuidv4 } from 'uuid';

// פונקציית עזר לקבלת שם טבלת השלבים הספציפית של פרויקט
const getProjectStagesTable = (projectId: string): string => {
  return "stages";
};

// פונקציית עזר - בודקת אם טבלה קיימת
const checkIfTableExists = async (tableName: string): Promise<boolean> => {
  const supabase = createClientComponentClient();
  
  try {
    console.log(`בודק אם הטבלה ${tableName} קיימת באמצעות פונקציית rpc...`);
    
    // שימוש בפונקציית RPC ייעודית לבדיקת קיום טבלה
    const { data, error } = await supabase.rpc('check_table_exists', {
      table_name_param: tableName
    });
    
    if (error) {
      console.error(`שגיאה בבדיקת קיום הטבלה ${tableName} באמצעות RPC:`, error);
      
      // אם יש שגיאת RPC, ננסה בדיקה ישירה
      try {
        console.log(`מנסה שיטה חלופית לבדיקת קיום הטבלה ${tableName}...`);
        
        // ננסה לעשות שאילתה פשוטה על הטבלה
        const { data: testData, error: testError } = await supabase
          .from(tableName)
          .select('count(*)')
          .limit(1);
          
        if (testError) {
          // אם קיבלנו שגיאה 400, סימן שהטבלה לא קיימת
          if (testError.code === '42P01' || testError.message.includes('does not exist') || (testError as any).status === 400) {
            console.log(`הטבלה ${tableName} לא קיימת (לפי בדיקה ישירה).`);
            return false;
          }
          
          // שגיאה אחרת - לא בטוח אם הטבלה קיימת
          console.error(`שגיאה לא צפויה בבדיקת קיום הטבלה ${tableName}:`, testError);
          return false;
        }
        
        // אם לא התקבלה שגיאה, הטבלה קיימת
        console.log(`הטבלה ${tableName} קיימת (לפי בדיקה ישירה).`);
        return true;
      } catch (testErr) {
        console.error(`כשלון מוחלט בבדיקת קיום הטבלה ${tableName}:`, testErr);
        return false;
      }
    }
    
    console.log(`הטבלה ${tableName} ${data ? 'קיימת' : 'לא קיימת'} (לפי RPC).`);
    return !!data;
  } catch (err) {
    console.error(`שגיאה בלתי צפויה בבדיקת קיום הטבלה ${tableName}:`, err);
    return false;
  }
};

// פונקציית עזר - קבלת רשימת העמודות הקיימות בטבלה
const getTableColumns = async (tableName: string): Promise<string[]> => {
  const supabase = createClientComponentClient();
  
  try {
    // נסיון שימוש בפונקציית RPC מוגדרת מראש
    const { data, error } = await supabase.rpc('get_table_columns', {
      table_name_param: tableName
    });
    
    if (error) {
      console.error(`שגיאה בקבלת עמודות של הטבלה ${tableName}:`, error);
      
      // אם אין פונקציית RPC מתאימה, ננסה להשתמש בפונקציה אחרת
      try {
        const { data: columnsData, error: columnsError } = await supabase.rpc('check_table_columns', {
          p_table_name: tableName
        });
        
        if (columnsError) {
          console.error(`שגיאה בנסיון חלופי לקבלת עמודות הטבלה ${tableName}:`, columnsError);
          return [];
        }
        
        return columnsData || [];
      } catch (altError) {
        console.error(`שגיאה בנסיון חלופי לקבלת עמודות הטבלה ${tableName}:`, altError);
        return [];
      }
    }
    
    return data || [];
  } catch (err) {
    console.error(`שגיאה בלתי צפויה בקבלת עמודות של הטבלה ${tableName}:`, err);
    return [];
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
    
    try {
      // שימוש בטבלת השלבים הכללית בלבד
      console.log(`שולף שלבים מהטבלה הכללית עבור פרויקט ${projectId}`);
      const { data, error } = await supabase
        .from('stages')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true });
        
      if (error) {
        console.error('שגיאה בשליפת שלבים מהטבלה הכללית:', error);
        return [];
      }
      
      return data || [];
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
  async createStage(projectId: string, stage: any): Promise<Stage> {
    const projectPrefix = projectId ? `project_${projectId}` : "";
    const tableName = "stages"; // השתמש רק בטבלה הראשית לפשטות
    
    // בדיקה האם טבלת ההיסטוריה קיימת
    try {
      const { data: historyCheck, error: historyError } = await supabase.rpc('ensure_stages_history_table');
      if (historyError) {
        console.error('שגיאה בבדיקת טבלת היסטוריית שלבים:', historyError);
        // ממשיכים בכל זאת, כי זה לא חיוני לעצם יצירת השלב
      } else {
        console.log('בדיקת טבלת היסטוריית שלבים הושלמה:', historyCheck);
      }
    } catch (error) {
      console.error('שגיאה לא צפויה בבדיקת טבלת היסטוריית שלבים:', error);
      // ממשיכים בכל זאת
    }

    // נסיון לתקן את מבנה הטבלה ולוודא שכל העמודות קיימות
    try {
      console.log(`מנסה לתקן את מבנה הטבלה ${tableName}...`);
      const { data: fixResult, error: fixError } = await supabase.rpc('fix_project_stages_table', {
        project_id_param: projectId
      });
      
      if (fixError) {
        console.error(`שגיאה בתיקון טבלת השלבים ${tableName}:`, fixError);
      } else {
        console.log(`תיקון טבלת השלבים ${tableName} הושלם בהצלחה:`, fixResult);
      }
    } catch (error) {
      console.error(`שגיאה לא צפויה בתיקון טבלת השלבים ${tableName}:`, error);
    }

    // בדיקה וקביעת מספר סידורי
    if (!stage.sort_order && stage.sort_order !== 0) {
      try {
        // ספירת מספר השלבים הקיימים בפרויקט
        const { data: existingStages, error: countError } = await supabase
          .from('stages')
          .select('id')
          .eq('project_id', projectId);
          
        if (!countError) {
          // הגדרת המספר הסידורי להיות אחרי כל השלבים הקיימים
          const nextSortOrder = (existingStages?.length || 0) + 1;
          console.log(`קובע מספר סידורי ${nextSortOrder} לשלב חדש בפרויקט ${projectId}`);
          stage.sort_order = nextSortOrder;
        }
      } catch (error) {
        console.error('שגיאה בספירת שלבים קיימים:', error);
        // השתמש במספר ברירת מחדל במקרה של שגיאה
        stage.sort_order = 999;
      }
    }
    
    // בדיקה והגדרת מספר היררכי
    if (!stage.hierarchical_number) {
      try {
        // ספירת מספר השלבים הקיימים בפרויקט
        const { data: existingStages, error: countError } = await supabase
          .from('stages')
          .select('hierarchical_number')
          .eq('project_id', projectId)
          .order('hierarchical_number', { ascending: false });
          
        if (!countError && existingStages && existingStages.length > 0) {
          // מציאת המספר ההיררכי הגבוה ביותר
          let maxNumber = 0;
          
          existingStages.forEach(existingStage => {
            if (existingStage.hierarchical_number) {
              const number = parseInt(existingStage.hierarchical_number, 10);
              if (!isNaN(number) && number > maxNumber) {
                maxNumber = number;
              }
            }
          });
          
          // הגדרת המספר ההיררכי להיות אחד יותר מהגבוה ביותר
          const nextHierarchicalNumber = (maxNumber || 0) + 1;
          console.log(`קובע מספר היררכי ${nextHierarchicalNumber} לשלב חדש בפרויקט ${projectId}`);
          stage.hierarchical_number = nextHierarchicalNumber.toString();
        } else {
          // אם אין שלבים קיימים, קבע את המספר ההיררכי ל-1
          console.log(`אין שלבים קיימים בפרויקט ${projectId}, קובע מספר היררכי 1`);
          stage.hierarchical_number = "1";
        }
      } catch (error) {
        console.error('שגיאה בהגדרת מספר היררכי אוטומטי:', error);
        // השתמש במספר ברירת מחדל במקרה של שגיאה
        stage.hierarchical_number = "1";
      }
    }

    try {
      // יצירת אובייקט שלב שמכיל רק את השדות הקיימים בטבלה
      const validStageData = {
        id: stage.id || undefined,
        title: stage.title,
        description: stage.description,
        hierarchical_number: stage.hierarchical_number,
        due_date: stage.due_date || stage.end_date,
        status: stage.status,
        progress: stage.progress,
        color: stage.color,
        parent_stage_id: stage.parent_stage_id,
        dependencies: stage.dependencies,
        sort_order: stage.sort_order,
        created_at: stage.created_at || new Date().toISOString(),
        updated_at: stage.updated_at || new Date().toISOString(),
        project_id: projectId
      };
      
      // מסיר שדות שהם undefined כדי שלא תהיה התנגשות עם ערכי ברירת מחדל בדאטהבייס
      const cleanedStageData: Record<string, any> = {};
      
      for (const [key, value] of Object.entries(validStageData)) {
        if (value !== undefined) {
          cleanedStageData[key] = value;
        }
      }

      console.log(`מנסה ליצור שלב בטבלה ${tableName} עם הנתונים:`, cleanedStageData);
      
      // אם לא הועבר ID, ניצור ID חדש
      if (!cleanedStageData.id) {
        cleanedStageData.id = uuidv4();
      }
      
      // הוספת השלב לטבלה
      const { data, error } = await supabase
        .from(tableName)
        .insert(cleanedStageData)
        .select()
        .single();
      
      if (error) {
        console.error(`שגיאה ביצירת שלב בטבלה ${tableName}:`, error);
        throw new Error(`שגיאה ביצירת שלב: ${error.message}`);
      }
      
      if (!data) {
        throw new Error('נכשל ביצירת שלב: לא התקבלו נתונים מהשרת');
      }
      
      console.log(`שלב נוצר בהצלחה בטבלה ${tableName}:`, data);
      return data as Stage;
    } catch (err) {
      console.error(`שגיאה ביצירת שלב בפרויקט ${projectId}:`, err);
      throw err;
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
      if (!projectId) {
        console.error("createDefaultStages: מזהה פרויקט חסר");
        return [];
      }
      
      // בדיקה אם כבר קיימים שלבים לפרויקט זה בטבלה הכללית
      const { data: existingStages, error: existingError } = await supabase
        .from('stages')
        .select('*')
        .eq('project_id', projectId);
        
      if (existingError) {
        console.error('שגיאה בבדיקת שלבים קיימים:', existingError);
        return [];
      }
      
      // אם כבר יש שלבים, אין צורך ליצור שלבים חדשים
      if (existingStages && existingStages.length > 0) {
        console.log(`קיימים כבר ${existingStages.length} שלבים עבור פרויקט ${projectId}. לא יוצר שלבים חדשים.`);
        return existingStages;
      }
        
      // הוספת שלבי ברירת מחדל לטבלה הכללית
      console.log(`יוצר שלבי ברירת מחדל בטבלה הכללית עבור פרויקט ${projectId}`);
      
      // יצירת שלושה שלבי ברירת מחדל
      const defaultStages = [
        {
          id: uuidv4(),
          title: 'לביצוע',
          description: 'משימות שצריך לבצע',
          project_id: projectId,
          status: 'active',
          hierarchical_number: '1',
          progress: 0,
          color: '#3182CE',
          sort_order: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: uuidv4(),
          title: 'בתהליך',
          description: 'משימות בביצוע',
          project_id: projectId,
          status: 'active',
          hierarchical_number: '2',
          progress: 0,
          color: '#DD6B20',
          sort_order: 2,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: uuidv4(),
          title: 'הושלם',
          description: 'משימות שהושלמו',
          project_id: projectId,
          status: 'active',
          hierarchical_number: '3',
          progress: 0,
          color: '#38A169',
          sort_order: 3,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      
      // הוספת השלבים לטבלת השלבים הכללית
      const { data, error } = await supabase
        .from('stages')
        .insert(defaultStages)
        .select();
        
      if (error) {
        console.error(`שגיאה בהוספת שלבי ברירת מחדל לטבלה הכללית:`, error);
        return [];
      }
      
      // שליפת השלבים שנוצרו
      const { data: fetchedStages, error: fetchError } = await supabase
        .from('stages')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true });
        
      if (fetchError) {
        console.error(`שגיאה בשליפת שלבי ברירת מחדל שנוצרו:`, fetchError);
        return data || [];
      }
      
      return fetchedStages || [];
    } catch (error) {
      console.error('שגיאה בלתי צפויה ביצירת שלבי ברירת מחדל:', error);
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
  },

  // סנכרון שלבים מהטבלה הכללית לטבלה הספציפית של הפרויקט
  async syncStagesToProjectTable(projectId: string): Promise<any> {
    try {
      if (!projectId) {
        return {
          success: false,
          message: "syncStagesToProjectTable: מזהה פרויקט חסר"
        };
      }
      
      // אין צורך בסנכרון כי משתמשים רק בטבלת השלבים הכללית
      console.log(`אין צורך בסנכרון טבלאות שלבים עבור פרויקט ${projectId} - משתמשים בטבלת שלבים כללית`);
      
      return {
        success: true,
        message: "השלבים מנוהלים בטבלה הכללית בלבד",
        project_id: projectId,
        stages_count: await this.countStages(projectId)
      };
    } catch (error) {
      console.error('שגיאה בלתי צפויה בסנכרון שלבים:', error);
      return {
        success: false,
        message: `שגיאה בסנכרון שלבים: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`,
        project_id: projectId
      };
    }
  },

  // קריאת מספר השלבים בפרויקט
  async countStages(projectId: string): Promise<number> {
    try {
      if (!projectId) {
        console.error("countStages: מזהה פרויקט חסר");
        return 0;
      }
      
      // שליפת מספר השלבים מהטבלה הכללית
      const { count, error } = await supabase
        .from('stages')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId);
        
      if (error) {
        console.error('שגיאה בספירת שלבים:', error);
        return 0;
      }
      
      return count || 0;
    } catch (error) {
      console.error('שגיאה בלתי צפויה בספירת שלבים:', error);
      return 0;
    }
  }
};

export default stageService; 