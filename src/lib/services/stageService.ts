import supabase from '../supabase';
import { Stage, NewStage, UpdateStage } from '@/types/supabase';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { v4 as uuidv4 } from 'uuid';

// פונקציית עזר לקבלת שם טבלת השלבים הספציפית של פרויקט
const getProjectStagesTable = (projectId: string): string => {
  return `project_${projectId}_stages`;
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
    
    // נבדוק אם הטבלה הייחודית לפרויקט קיימת
    const projectStagesTableName = `project_${projectId}_stages`;
    
    try {
      // בדיקה אם הטבלה קיימת באמצעות הפונקציה המעודכנת
      const tableExists = await checkIfTableExists(projectStagesTableName);
        
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
  async createStage(projectId: string, stage: any): Promise<Stage> {
    const projectPrefix = projectId ? `project_${projectId}` : "";
    const tableName = projectId ? `project_${projectId}_stages` : "stages";
    
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
        
        // אם הפונקציה הראשונה נכשלה, ננסה את הפונקציה המיוחדת
        try {
          console.log(`מנסה להשתמש בפונקציה המיוחדת לתיקון טבלת השלבים ${tableName}...`);
          const { data: fixSpecificResult, error: fixSpecificError } = await supabase.rpc('fix_specific_project_stages_table', {
            project_id_param: projectId
          });
          
          if (fixSpecificError) {
            console.error(`שגיאה בתיקון מיוחד של טבלת השלבים ${tableName}:`, fixSpecificError);
          } else {
            console.log(`תיקון מיוחד של טבלת השלבים ${tableName} הושלם בהצלחה:`, fixSpecificResult);
          }
        } catch (specificError) {
          console.error(`שגיאה לא צפויה בתיקון מיוחד של טבלת השלבים ${tableName}:`, specificError);
        }
      } else {
        console.log(`תיקון טבלת השלבים ${tableName} הושלם בהצלחה:`, fixResult);
      }
    } catch (error) {
      console.error(`שגיאה לא צפויה בתיקון טבלת השלבים ${tableName}:`, error);
    }

    try {
      // יצירת אובייקט שלב שמכיל רק את השדות הקיימים בטבלה
      const validStageData = {
        id: stage.id,
        title: stage.title,
        hierarchical_number: stage.hierarchical_number,
        due_date: stage.due_date,
        status: stage.status,
        progress: stage.progress,
        color: stage.color,
        parent_stage_id: stage.parent_stage_id,
        dependencies: stage.dependencies,
        sort_order: stage.sort_order,
        created_at: stage.created_at,
        updated_at: stage.updated_at,
        project_id: projectId
      };
      
      // מסיר שדות שהם undefined כדי שלא תהיה התנגשות עם ערכי ברירת מחדל בדאטהבייס
      const cleanedStageData = Object.fromEntries(
        Object.entries(validStageData).filter(([_, value]) => value !== undefined)
      );

      console.log(`מנסה ליצור שלב בטבלה ${tableName} עם הנתונים:`, cleanedStageData);

      // שליחת הבקשה ליצירת השלב
      const { data, error } = await supabase
        .from(tableName)
        .insert(cleanedStageData)
        .select()
        .single();

      if (error) {
        console.error(`שגיאה ביצירת שלב בטבלה ${tableName}:`, error);
        
        // בדיקה אם השגיאה קשורה לטבלת ההיסטוריה
        if (error.message?.includes('stages_history')) {
          console.log('השגיאה קשורה לטבלת ההיסטוריה - מנסה לתקן ולנסות שוב');
          
          try {
            // נסיון נוסף לתקן את טבלת ההיסטוריה
            const { data: fixHistoryResult, error: fixHistoryError } = await supabase.rpc('ensure_stages_history_table');
            
            if (fixHistoryError) {
              console.error('שגיאה בתיקון טבלת היסטוריית שלבים:', fixHistoryError);
              throw new Error('לא ניתן לתקן את טבלת ההיסטוריה: ' + fixHistoryError.message);
            }
            
            console.log('תיקון טבלת היסטוריית שלבים הושלם, מנסה ליצור שלב שוב');
            
            // נסיון נוסף ליצירת השלב
            const { data: retryData, error: retryError } = await supabase
              .from(tableName)
              .insert(cleanedStageData)
              .select()
              .single();
              
            if (retryError) {
              console.error('שגיאה בנסיון השני ליצירת שלב:', retryError);
              throw retryError;
            }
            
            return retryData as Stage;
          } catch (fixError) {
            console.error('שגיאה בנסיון לתקן את הבעיה:', fixError);
            throw new Error('לא ניתן ליצור שלב עקב בעיה עם טבלת ההיסטוריה');
          }
        }
        
        // אם השגיאה קשורה לעמודות חסרות
        if (error.message?.includes('column') || error.message?.includes('does not exist')) {
          console.log('יתכן ויש בעיה עם מבנה הטבלה - מנסה לבדוק אילו עמודות קיימות');
          
          try {
            // נבדוק אילו עמודות קיימות בטבלה באמצעות הפונקציה שהגדרנו
            const existingColumns = await getTableColumns(tableName);
            
            if (existingColumns.length > 0) {
              console.log(`עמודות קיימות בטבלה ${tableName}:`, existingColumns);
              
              // יצירת אובייקט חדש רק עם העמודות הקיימות
              const filteredStageData: any = {};
              
              for (const column of existingColumns) {
                if (cleanedStageData.hasOwnProperty(column)) {
                  filteredStageData[column] = (cleanedStageData as any)[column];
                }
              }
              
              console.log('מנסה ליצור שלב עם עמודות קיימות בלבד:', filteredStageData);
              
              // נסיון נוסף ליצירת השלב עם העמודות הקיימות בלבד
              const { data: retryData, error: retryError } = await supabase
                .from(tableName)
                .insert(filteredStageData)
                .select()
                .single();
                
              if (retryError) {
                console.error('שגיאה בנסיון השני ליצירת שלב:', retryError);
                throw retryError;
              }
              
              return retryData as Stage;
            } else {
              console.log(`לא הצלחנו לקבל את העמודות של הטבלה ${tableName}.`);
            }
          } catch (columnCheckError) {
            console.error('שגיאה בבדיקת מבנה הטבלה:', columnCheckError);
          }
          
          // אם הבדיקה נכשלה, ננסה ליצור שלב עם שדות בסיסיים בלבד
          const basicStageData = {
            title: stage.title || 'שלב חדש',
            project_id: projectId
          };
          
          try {
            console.log('מנסה ליצור שלב עם שדות בסיסיים בלבד:', basicStageData);
            
            const { data: fallbackData, error: fallbackError } = await supabase
              .from(tableName)
              .insert(basicStageData)
              .select()
              .single();
              
            if (fallbackError) {
              console.error('שגיאה בנסיון האחרון ליצירת שלב בטבלה הספציפית:', fallbackError);
              
              // נסיון אחרון - ליצור בטבלה הרגילה 'stages'
              if (tableName !== 'stages') {
                console.log('מנסה ליצור שלב בטבלה הרגילה stages');
                
                const { data: regularTableData, error: regularTableError } = await supabase
                  .from('stages')
                  .insert(basicStageData)
                  .select()
                  .single();
                  
                if (regularTableError) {
                  console.error('שגיאה בנסיון ליצירת שלב בטבלה הרגילה:', regularTableError);
                  throw regularTableError;
                }
                
                return regularTableData as Stage;
              }
              
              throw fallbackError;
            }
            
            return fallbackData as Stage;
          } catch (fallbackError) {
            console.error('שגיאה בנסיון האחרון ליצירת שלב בטבלה הספציפית:', fallbackError);
            
            // נסיון אחרון - ליצור בטבלה הרגילה 'stages'
            if (tableName !== 'stages') {
              console.log('מנסה ליצור שלב בטבלה הרגילה stages');
              
              try {
                const { data: regularTableData, error: regularTableError } = await supabase
                  .from('stages')
                  .insert(basicStageData)
                  .select()
                  .single();
                  
                if (regularTableError) {
                  console.error('שגיאה בנסיון ליצירת שלב בטבלה הרגילה:', regularTableError);
                  throw regularTableError;
                }
                
                return regularTableData as Stage;
              } catch (regularError) {
                console.error('שגיאה מוחלטת בנסיון ליצירת שלב:', regularError);
                throw new Error('לא ניתן ליצור שלב עקב בעיה עם מבנה הטבלה');
              }
            }
            
            throw fallbackError;
          }
        }
        
        throw error;
      }

      return data as Stage;
    } catch (error) {
      console.error(`שגיאה לא צפויה ביצירת שלב:`, error);
      throw error;
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
      // יצירת שלבים ברירת מחדל עם השדות הנדרשים
      const defaultStages = [
        {
          id: uuidv4(),
          title: "הכנה",
          description: "שלב ההכנות הראשוני של הפרויקט",
          status: "active",
          progress: 0,
          color: "#3498db", // כחול
          project_id: projectId,
          sort_order: 0,
          hierarchical_number: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: uuidv4(),
          title: "תכנון",
          description: "קביעת תכנית העבודה ופירוט המשימות",
          status: "active",
          progress: 0,
          color: "#2ecc71", // ירוק
          project_id: projectId,
          sort_order: 1,
          hierarchical_number: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: uuidv4(),
          title: "ביצוע",
          description: "ביצוע המשימות המתוכננות",
          status: "active",
          progress: 0,
          color: "#e74c3c", // אדום
          project_id: projectId,
          sort_order: 2,
          hierarchical_number: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: uuidv4(),
          title: "בקרה",
          description: "בקרת איכות ופיקוח על התוצרים",
          status: "active",
          progress: 0,
          color: "#f39c12", // כתום
          project_id: projectId,
          sort_order: 3,
          hierarchical_number: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: uuidv4(),
          title: "סיום",
          description: "סיום הפרויקט ומסירתו",
          status: "pending",
          progress: 0,
          color: "#9b59b6", // סגול
          project_id: projectId,
          sort_order: 4,
          hierarchical_number: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      
      // נבדוק אם הטבלה הייחודית לפרויקט קיימת
      const projectStagesTableName = `project_${projectId}_stages`;
      
      // בדיקה אם הטבלה קיימת באמצעות הפונקציה המעודכנת
      const tableExists = await checkIfTableExists(projectStagesTableName);
      
      if (!tableExists) {
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
      } else {
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
  },

  // סנכרון שלבים מהטבלה הכללית לטבלה הספציפית של הפרויקט
  async syncStagesToProjectTable(projectId: string): Promise<any> {
    const supabase = createClientComponentClient();
    
    if (!projectId) {
      console.error("syncStagesToProjectTable: מזהה פרויקט חסר");
      return { success: false, error: "מזהה פרויקט חסר" };
    }
    
    try {
      // נבדוק אם הטבלה הייחודית לפרויקט קיימת
      const projectStagesTableName = `project_${projectId}_stages`;
      
      // בדיקה אם הטבלה קיימת
      const tableExists = await checkIfTableExists(projectStagesTableName);
      
      if (!tableExists) {
        // אם הטבלה לא קיימת, ניצור אותה
        console.log(`טבלת ${projectStagesTableName} לא קיימת, יוצר אותה...`);
        
        // ניסיון קריאה לפונקציית RPC ליצירת טבלת שלבים
        try {
          const { data, error } = await supabase.rpc(
            'create_project_stages_table',
            { project_id: projectId }
          );
          
          if (error) {
            console.error(`שגיאה ביצירת טבלת ${projectStagesTableName}:`, error);
            return { success: false, error: `שגיאה ביצירת טבלת השלבים: ${error.message}` };
          }
        } catch (err) {
          console.error(`שגיאה ביצירת טבלת ${projectStagesTableName}:`, err);
          return { success: false, error: `שגיאה ביצירת טבלת השלבים: ${err instanceof Error ? err.message : 'שגיאה לא ידועה'}` };
        }
      }
      
      // שליפת השלבים מהטבלה הכללית שהם או כלליים (project_id IS NULL) או שייכים לפרויקט זה
      const { data: stagesFromGeneralTable, error: generalError } = await supabase
        .from('stages')
        .select('*')
        .or(`project_id.eq.${projectId},project_id.is.null`);
      
      if (generalError) {
        console.error('שגיאה בשליפת שלבים מהטבלה הכללית:', generalError);
        return { success: false, error: `שגיאה בשליפת שלבים מהטבלה הכללית: ${generalError.message}` };
      }
      
      if (!stagesFromGeneralTable || stagesFromGeneralTable.length === 0) {
        console.log('לא נמצאו שלבים בטבלה הכללית להעתקה');
        
        // אם אין שלבים בטבלה הכללית, ניצור שלבי ברירת מחדל ישירות בטבלה הספציפית
        const defaultStages = await this.createDefaultStages(projectId);
        return { 
          success: true, 
          message: 'נוצרו שלבי ברירת מחדל בטבלה הספציפית של הפרויקט',
          stages_count: defaultStages.length
        };
      }
      
      // העתקת השלבים לטבלה הספציפית של הפרויקט
      let copiedCount = 0;
      
      for (const stage of stagesFromGeneralTable) {
        try {
          // התאמת השלב לטבלה הספציפית - שינוי שדה project_id לפרויקט הנוכחי
          const stageForProjectTable = {
            ...stage,
            project_id: projectId,
            updated_at: new Date().toISOString()
          };
          
          // העתקת השלב לטבלה הספציפית
          const { data, error } = await supabase
            .from(projectStagesTableName)
            .upsert(stageForProjectTable, { onConflict: 'id' })
            .select();
          
          if (error) {
            console.error(`שגיאה בהעתקת שלב ${stage.id} לטבלת ${projectStagesTableName}:`, error);
            continue;
          }
          
          copiedCount++;
        } catch (err) {
          console.error(`שגיאה בהעתקת שלב ${stage.id}:`, err);
          continue;
        }
      }
      
      // שליפת מספר השלבים הסופי בטבלה הספציפית
      const { data: finalStages, error: countError } = await supabase
        .from(projectStagesTableName)
        .select('*');
      
      if (countError) {
        console.error(`שגיאה בספירת השלבים הסופית בטבלת ${projectStagesTableName}:`, countError);
      }
      
      return { 
        success: true, 
        message: `הועתקו ${copiedCount} שלבים לטבלה הספציפית של הפרויקט`,
        stages_count: finalStages ? finalStages.length : copiedCount,
        stages: finalStages
      };
    } catch (error) {
      console.error('שגיאה בלתי צפויה בפונקציה syncStagesToProjectTable:', error);
      return { 
        success: false, 
        error: `שגיאה בלתי צפויה: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`
      };
    }
  }
};

export default stageService; 