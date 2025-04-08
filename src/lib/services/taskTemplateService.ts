import supabase from '../supabase';
import { Task, NewTask } from '@/types/supabase';
import { taskService } from './taskService';

// שירות לניהול תבניות משימות
export const taskTemplateService = {
  /**
   * שמירת תבנית משימה חדשה
   * @param {Object} templateData - נתוני התבנית לשמירה
   * @returns {Promise<Task>} - המשימה שנשמרה כתבנית
   */
  async saveTemplate(templateData: {
    name: string;
    is_default: boolean; // השדה נשאר לתאימות אחורה אבל לא נעשה בו שימוש
    task_data: Partial<Task>;
  }): Promise<Task> {
    try {
      console.log('שומר תבנית משימה חדשה');
      
      // חישוב מספר הירארכי חדש - קבלת כל התבניות הקיימות לחישוב המספר הבא
      let hierarchicalNumber = '1'; // ברירת מחדל
      try {
        const templates = await this.getAllTemplates();
        console.log(`נמצאו ${templates.length} תבניות קיימות לחישוב המספר ההיררכי`);
        
        if (templates.length > 0) {
          // מיון התבניות לפי המספר ההיררכי
          const sortedTemplates = templates.filter(t => t.hierarchical_number)
            .sort((a, b) => {
              if (!a.hierarchical_number) return 1;
              if (!b.hierarchical_number) return -1;
              return parseInt(a.hierarchical_number) - parseInt(b.hierarchical_number);
            });
          
          // מציאת המספר האחרון ששימש
          const lastTemplate = sortedTemplates[sortedTemplates.length - 1];
          if (lastTemplate && lastTemplate.hierarchical_number) {
            // חישוב המספר הבא
            const lastNumber = parseInt(lastTemplate.hierarchical_number);
            hierarchicalNumber = String(lastNumber + 1);
            console.log(`המספר ההיררכי האחרון: ${lastTemplate.hierarchical_number}, המספר החדש: ${hierarchicalNumber}`);
          }
        }
      } catch (error) {
        console.warn('שגיאה בחישוב מספר היררכי חדש:', error);
        // נשאר עם ברירת המחדל '1'
      }
      
      // הכנת אובייקט המשימה החדש (תבנית)
      const templateTask: Partial<Task> = {
        id: crypto.randomUUID(), // יצירת מזהה חדש
        title: '',
        description: templateData.task_data.description,
        project_id: undefined, // תבניות הן גלובליות, בסופו של דבר נשמר כ-null בבסיס הנתונים
        hierarchical_number: hierarchicalNumber, // הגדרת המספר ההיררכי החדש
        parent_task_id: templateData.task_data.parent_task_id, // העברת משימת אב אם קיימת
        status: templateData.task_data.status,
        priority: templateData.task_data.priority,
        category: templateData.task_data.category,
        responsible: null, // שינוי מ-"מערכת" ל-null כדי למנוע שגיאת סינטקס UUID
        due_date: templateData.task_data.due_date, // תאריך יעד אם קיים
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      // קביעת שם התבנית
      const baseTemplateName = templateData.name || templateData.task_data.title || 'תבנית ללא שם';
      
      // כבר לא משתמשים בתג [TEMPLATE] - שימוש בכותרת כפי שהיא
      templateTask.title = baseTemplateName;
      console.log(`שומר תבנית בשם: ${baseTemplateName} עם מספר היררכי ${hierarchicalNumber}`);
      
      console.log('פרטי התבנית שנשמרת:', templateTask);
      
      // שמירת התבנית בטבלת המשימות
      const { data, error } = await supabase
        .from('tasks')
        .insert(templateTask)
        .select()
        .single();
      
      if (error) {
        console.error('שגיאה בשמירת תבנית משימה:', error);
        throw new Error(`שגיאה בשמירת תבנית משימה: ${error.message}`);
      }
      
      console.log('תבנית משימה נשמרה בהצלחה:', data);
      return data;
    } catch (error) {
      console.error('שגיאה בשמירת תבנית משימה:', error);
      throw new Error(`שגיאה בשמירת תבנית משימה: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`);
    }
  },
  
  /**
   * קבלת כל תבניות המשימות
   * @returns {Promise<Task[]>} - רשימת כל תבניות המשימות
   */
  async getAllTemplates(): Promise<Task[]> {
    try {
      console.log('מחפש תבניות משימות...');
      // מחזיר רק משימות שאין להן פרויקט ספציפי כי אלה התבניות
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .is('project_id', null)
        .order('title', { ascending: true });
      
      if (error) {
        console.error('שגיאה בקבלת תבניות משימות:', error);
        throw new Error(error.message);
      }
      
      console.log(`נמצאו ${data?.length || 0} תבניות משימות`);
      return data || [];
    } catch (err) {
      console.error('שגיאה בקבלת תבניות משימות:', err);
      throw new Error(err instanceof Error ? err.message : 'שגיאה לא ידועה');
    }
  },
  
  /**
   * קבלת כל תבניות המשימות שהן ברירת מחדל
   * @returns {Promise<Task[]>} - רשימת כל תבניות המשימות שהן ברירת מחדל
   */
  async getDefaultTemplates(): Promise<Task[]> {
    try {
      // תבניות ברירת מחדל הן תבניות שהאחראי עליהן הוא "מערכת"
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .is('project_id', null)
        .eq('responsible', 'מערכת')  // תבניות ברירת מחדל מוגדרות כמשויכות למערכת
        .order('title', { ascending: true });
      
      if (error) {
        console.error('שגיאה בקבלת תבניות משימות ברירת מחדל:', error);
        throw new Error(error.message);
      }
      
      console.log(`נמצאו ${data?.length || 0} תבניות משימות ברירת מחדל`);
      return data || [];
    } catch (err) {
      console.error('שגיאה בקבלת תבניות משימות ברירת מחדל:', err);
      throw new Error(err instanceof Error ? err.message : 'שגיאה לא ידועה');
    }
  },
  
  /**
   * קבלת תבנית משימה לפי מזהה
   * @param {string} id - מזהה התבנית
   * @returns {Promise<Task | null>} - תבנית המשימה, או null אם לא נמצאה
   */
  async getTemplateById(id: string): Promise<Task | null> {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .is('project_id', null)  // תבניות הן משימות ללא פרויקט ספציפי
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // לא נמצאה תבנית עם המזהה המבוקש
          return null;
        }
        console.error(`שגיאה בקבלת תבנית משימה לפי מזהה ${id}:`, error);
        throw new Error(error.message);
      }
      
      return data;
    } catch (err) {
      console.error(`שגיאה בקבלת תבנית משימה לפי מזהה ${id}:`, err);
      throw new Error(err instanceof Error ? err.message : 'שגיאה לא ידועה');
    }
  },
  
  /**
   * עדכון תבנית משימה קיימת
   * @param {string} id - מזהה התבנית לעדכון
   * @param {Partial<Task>} templateData - נתוני העדכון
   * @returns {Promise<Task>} - התבנית המעודכנת
   */
  async updateTemplate(id: string, templateData: Partial<Task>): Promise<Task> {
    try {
      // וידוא שהתבנית קיימת
      const existingTemplate = await this.getTemplateById(id);
      if (!existingTemplate) {
        throw new Error(`לא נמצאה תבנית משימה עם מזהה ${id}`);
      }
      
      // עדכון שדות
      const updateData: Partial<Task> = {
        ...templateData,
        updated_at: new Date().toISOString(),
      };
      
      const { data, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error(`שגיאה בעדכון תבנית משימה ${id}:`, error);
        throw new Error(error.message);
      }
      
      console.log(`תבנית משימה ${id} עודכנה בהצלחה`);
      return data;
    } catch (err) {
      console.error(`שגיאה בעדכון תבנית משימה ${id}:`, err);
      throw new Error(err instanceof Error ? err.message : 'שגיאה לא ידועה');
    }
  },
  
  /**
   * מחיקת תבנית משימה
   * @param {string} id - מזהה התבנית למחיקה
   * @returns {Promise<void>}
   */
  async deleteTemplate(id: string): Promise<void> {
    try {
      // וידוא שהתבנית קיימת
      const existingTemplate = await this.getTemplateById(id);
      if (!existingTemplate) {
        throw new Error(`לא נמצאה תבנית משימה עם מזהה ${id}`);
      }
      
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error(`שגיאה במחיקת תבנית משימה ${id}:`, error);
        throw new Error(error.message);
      }
      
      console.log(`תבנית משימה ${id} נמחקה בהצלחה`);
    } catch (err) {
      console.error(`שגיאה במחיקת תבנית משימה ${id}:`, err);
      throw new Error(err instanceof Error ? err.message : 'שגיאה לא ידועה');
    }
  },
  
  /**
   * יצירת משימה חדשה מתבנית
   * @param {string} templateId - מזהה התבנית
   * @param {string} projectId - מזהה הפרויקט שאליו תשויך המשימה
   * @param {Partial<Task>} overrideData - נתונים לדריסת נתוני התבנית (אופציונלי)
   * @returns {Promise<Task>} - המשימה החדשה שנוצרה
   */
  async createTaskFromTemplate(
    templateId: string, 
    projectId: string, 
    overrideData: Partial<Task> = {}
  ): Promise<Task> {
    try {
      // קבלת נתוני התבנית
      const template = await this.getTemplateById(templateId);
      if (!template) {
        throw new Error(`לא נמצאה תבנית משימה עם מזהה ${templateId}`);
      }
      
      // מכין העתק של נתוני התבנית לפני העריכה
      const templateCopy = { ...template };
      
      // יצירת אובייקט המשימה החדשה - שימוש בטיפוס NewTask
      const newTaskData = {
        title: templateCopy.title,
        description: templateCopy.description,
        priority: templateCopy.priority,
        status: templateCopy.status,
        parent_task_id: templateCopy.parent_task_id,
        hierarchical_number: templateCopy.hierarchical_number,
        responsible: templateCopy.responsible,
        category: templateCopy.category,
        project_id: projectId || undefined, // משויכת לפרויקט המבוקש והמרה ל-undefined אם אין ערך
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...overrideData as any, // דריסת נתונים שסופקו
      };
      
      // שימוש ב-taskService ליצירת המשימה החדשה
      const newTask = await taskService.createTask(newTaskData);
      
      console.log(`נוצרה משימה חדשה ${newTask.id} מתבנית ${templateId}`);
      return newTask;
    } catch (err) {
      console.error(`שגיאה ביצירת משימה מתבנית ${templateId}:`, err);
      throw new Error(err instanceof Error ? err.message : 'שגיאה לא ידועה');
    }
  }
};

export default taskTemplateService; 