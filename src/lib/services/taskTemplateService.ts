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
    is_default: boolean;
    task_data: Partial<Task>;
  }): Promise<Task> {
    try {
      console.log('שומר תבנית משימה חדשה:', templateData.name);
      
      // יצירת שם התבנית
      const templateTitle = `[TEMPLATE] ${templateData.name || templateData.task_data.title || ''}`;
      
      // יצירת אובייקט המשימה שיישמר כתבנית
      const templateTask: NewTask = {
        title: templateTitle,
        project_id: null, // תבניות לא משויכות לפרויקט - המרה מפורשת לסוג הנכון
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // העתקת נתונים נוספים מהמשימה המקורית
        description: templateData.task_data.description,
        category: templateData.task_data.category,
        status: templateData.task_data.status || 'לא התחיל',
        priority: templateData.task_data.priority || 'בינוני',
        responsible: templateData.task_data.responsible,
        hierarchical_number: templateData.task_data.hierarchical_number,
        parent_task_id: templateData.task_data.parent_task_id,
      };
      
      // תיעוד המידע לגבי השמירה
      console.log('נתוני תבנית משימה לשמירה:', {
        title: templateTask.title,
      });
      
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
      
      console.log('תבנית המשימה נשמרה בהצלחה:', data.title);
      return data;
    } catch (err) {
      console.error('שגיאה בשמירת תבנית משימה:', err);
      throw new Error(err instanceof Error ? err.message : 'שגיאה לא ידועה');
    }
  },
  
  /**
   * קבלת כל תבניות המשימות
   * @returns {Promise<Task[]>} - רשימת כל תבניות המשימות
   */
  async getAllTemplates(): Promise<Task[]> {
    try {
      console.log('מחפש תבניות משימות לפי תיוג בכותרת...');
      // מחזיר רק משימות שהן תבניות (לפי תיוג בכותרת)
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .ilike('title', '%[TEMPLATE]%')
        .order('title', { ascending: true });
      
      if (error) {
        console.error('שגיאה בקבלת תבניות משימות:', error);
        throw new Error(error.message);
      }
      
      console.log(`נמצאו ${data?.length || 0} תבניות משימות לפי תיוג בכותרת`);
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
      // מחזיר רק משימות שהן תבניות ברירת מחדל לפי הכותרת
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .ilike('title', '%[TEMPLATE-DEFAULT]%')
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
        .ilike('title', '%[TEMPLATE]%')
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
      
      // שומר על התיוג של התבנית בכותרת
      let title = templateData.title || existingTemplate.title;
      if (!title.includes('[TEMPLATE]')) {
        title = `[TEMPLATE] ${title.replace(/\[TEMPLATE\]|\[TEMPLATE-DEFAULT\]/g, '').trim()}`;
      }
      
      // עדכון רק שדות מותרים
      const updateData: Partial<Task> = {
        ...templateData,
        title,
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
      
      // הסרת תיוג התבנית מהכותרת
      const cleanTitle = templateCopy.title.replace(/\[TEMPLATE\]|\[TEMPLATE-DEFAULT\]/g, '').trim();
      
      // יצירת אובייקט המשימה החדשה - שימוש בטיפוס NewTask
      const newTaskData: NewTask = {
        title: cleanTitle,
        description: templateCopy.description,
        priority: templateCopy.priority,
        status: templateCopy.status,
        parent_task_id: templateCopy.parent_task_id,
        hierarchical_number: templateCopy.hierarchical_number,
        responsible: templateCopy.responsible,
        category: templateCopy.category,
        project_id: projectId, // משויכת לפרויקט המבוקש
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