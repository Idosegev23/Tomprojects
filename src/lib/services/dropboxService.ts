import { Dropbox } from 'dropbox';

// הגדרת המפתחות מתוך משתני הסביבה
const appKey = process.env.NEXT_PUBLIC_DROPBOX_APP_KEY;
const accessToken = process.env.NEXT_PUBLIC_DROPBOX_ACCESS_TOKEN;

if (!accessToken) {
  console.error('Dropbox access token is missing. Please add it to your environment variables.');
}

// יצירת אובייקט דרופבוקס עם אימות
const dropbox = new Dropbox({
  accessToken,
});

export const dropboxService = {
  // בדיקה האם תיקייה קיימת
  async folderExists(path: string): Promise<boolean> {
    try {
      await dropbox.filesGetMetadata({ path });
      return true;
    } catch (error) {
      if ((error as any)?.status === 409) {
        return false; // התיקייה לא קיימת
      }
      throw error;
    }
  },

  // יצירת תיקייה 
  async createFolder(path: string): Promise<{ id: string; name: string; path: string }> {
    try {
      // נבדוק קודם אם התיקייה קיימת
      try {
        const existingFolder = await dropbox.filesGetMetadata({ path });
        return {
          id: (existingFolder.result as any).id,
          name: (existingFolder.result as any).name,
          path: path,
        };
      } catch (checkError) {
        // אם התיקייה לא קיימת, ניצור אותה
        const result = await dropbox.filesCreateFolderV2({ path });
        return {
          id: result.result.metadata.id,
          name: result.result.metadata.name,
          path: path,
        };
      }
    } catch (error) {
      console.error('Error creating folder in Dropbox:', error);
      throw new Error(`Failed to create folder in Dropbox: ${(error as any)?.message || 'Unknown error'}`);
    }
  },

  // יצירת מבנה תיקיות היררכי (רקורסיבי)
  async createFolderHierarchy(paths: string[]): Promise<void> {
    // מיון הנתיבים מהקצר ביותר לארוך ביותר כדי ליצור תיקיות אב לפני תיקיות בנות
    const sortedPaths = [...paths].sort((a, b) => a.length - b.length);
    
    for (const path of sortedPaths) {
      await this.createFolder(path);
    }
  },

  // יצירת תיקייה לפרויקט
  async createProjectFolder(projectId: string, projectName: string): Promise<string> {
    // יצירת נתיב לתיקיית הפרויקט
    const path = `/${projectName}_${projectId}`;
    const result = await this.createFolder(path);
    
    return result.path;
  },

  // יצירת תיקייה למשימה בתוך פרויקט
  async createTaskFolder(projectId: string, projectName: string, taskId: string, taskTitle: string): Promise<string> {
    // יצירת נתיב לתיקיית המשימה בתוך תיקיית הפרויקט
    const projectPath = `/${projectName}_${projectId}`;
    const taskPath = `${projectPath}/${taskTitle}_${taskId}`;
    
    // קודם מוודאים שתיקיית הפרויקט קיימת
    await this.createFolder(projectPath);
    
    // יוצרים את תיקיית המשימה
    const result = await this.createFolder(taskPath);
    
    return result.path;
  },

  // יצירת תיקייה לתת-משימה
  async createSubtaskFolder(
    projectId: string, 
    projectName: string, 
    parentTaskId: string, 
    parentTaskTitle: string, 
    subtaskId: string, 
    subtaskTitle: string
  ): Promise<string> {
    // יצירת נתיבים להיררכיה
    const projectPath = `/${projectName}_${projectId}`;
    const parentTaskPath = `${projectPath}/${parentTaskTitle}_${parentTaskId}`;
    const subtaskPath = `${parentTaskPath}/${subtaskTitle}_${subtaskId}`;
    
    // וידוא קיום התיקיות הקודמות
    await this.createFolder(projectPath);
    await this.createFolder(parentTaskPath);
    
    // יצירת תיקיית תת-המשימה
    const result = await this.createFolder(subtaskPath);
    
    return result.path;
  },

  // אימות חיבור לדרופבוקס
  async validateConnection(): Promise<boolean> {
    try {
      const response = await dropbox.usersGetCurrentAccount();
      return !!response;
    } catch (error) {
      console.error('Failed to validate Dropbox connection:', error);
      return false;
    }
  },
};

export default dropboxService; 