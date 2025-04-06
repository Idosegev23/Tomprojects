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

// פונקציה לניקוי שם קובץ/תיקייה
function sanitizePath(path: string): string {
  // הסרת תווים לא חוקיים מהנתיב
  return path
    .replace(/[\\/:\*\?"<>\|]/g, '_') // החלפת תווים לא חוקיים ב-_
    .replace(/\s+/g, '_') // החלפת רווחים ב-_
    .replace(/__+/g, '_') // החלפת כפילויות של _ ב-_ בודד
    .trim(); // הסרת רווחים מתחילת וסוף המחרוזת
}

export const dropboxService = {
  // בדיקה האם תיקייה קיימת
  async folderExists(path: string): Promise<boolean> {
    try {
      // ניקוי הנתיב לפני בדיקה
      const cleanPath = sanitizePath(path);
      
      await dropbox.filesGetMetadata({ path: cleanPath });
      return true;
    } catch (error) {
      if ((error as any)?.status === 409) {
        return false; // התיקייה לא קיימת
      }
      console.warn(`Warning checking if folder exists: ${(error as any)?.message || 'Unknown error'}`);
      return false; // במקרה של שגיאה, נניח שהתיקייה לא קיימת
    }
  },

  // יצירת תיקייה 
  async createFolder(path: string): Promise<{ id: string; name: string; path: string }> {
    try {
      // ניקוי הנתיב לפני יצירת התיקייה
      const cleanPath = sanitizePath(path);
      
      if (!cleanPath || cleanPath === '/' || cleanPath === '') {
        throw new Error('Invalid path for folder creation');
      }
      
      console.log(`Attempting to create folder at: ${cleanPath}`);
      
      // נבדוק קודם אם התיקייה קיימת
      try {
        const existingFolder = await dropbox.filesGetMetadata({ path: cleanPath });
        console.log(`Folder already exists: ${cleanPath}`);
        return {
          id: (existingFolder.result as any).id,
          name: (existingFolder.result as any).name,
          path: cleanPath,
        };
      } catch (checkError) {
        // ננסה ליצור את התיקייה רק אם קיבלנו שגיאת 409 (התיקייה לא קיימת)
        if ((checkError as any)?.status === 409) {
          try {
            const result = await dropbox.filesCreateFolderV2({ path: cleanPath });
            console.log(`Successfully created folder: ${cleanPath}`);
            return {
              id: result.result.metadata.id,
              name: result.result.metadata.name,
              path: cleanPath,
            };
          } catch (createError) {
            console.error(`Error creating folder: ${cleanPath}`, createError);
            throw createError;
          }
        } else {
          // אם יש שגיאה אחרת, נזרוק אותה
          console.error(`Unexpected error checking if folder exists: ${cleanPath}`, checkError);
          throw checkError;
        }
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
  
  // יצירת תיקייה ליזם
  async createEntrepreneurFolder(entrepreneurId: string, entrepreneurName: string): Promise<string> {
    // יצירת נתיב לתיקיית היזם
    const path = `/entrepreneurs/${entrepreneurName}_${entrepreneurId}`;
    const result = await this.createFolder(path);
    
    return result.path;
  },

  // יצירת תיקייה לפרויקט
  async createProjectFolder(projectId: string, projectName: string, entrepreneurId?: string, entrepreneurName?: string): Promise<string> {
    if (entrepreneurId && entrepreneurName) {
      // אם יש יזם, צור תחילה את תיקיית היזם ואז את תיקיית הפרויקט בתוכה
      const entrepreneurPath = `/entrepreneurs/${entrepreneurName}_${entrepreneurId}`;
      await this.createFolder('/entrepreneurs'); // הבטחה שתיקיית האב entrepreneurs קיימת
      await this.createFolder(entrepreneurPath);
      
      const projectPath = `${entrepreneurPath}/${projectName}_${projectId}`;
      const result = await this.createFolder(projectPath);
      return result.path;
    } else {
      // אם אין יזם, נוסיף את הפרויקט ישירות לרמה הראשית
      await this.createFolder('/projects'); // הבטחה שתיקיית האב projects קיימת
      const projectPath = `/projects/${projectName}_${projectId}`;
      const result = await this.createFolder(projectPath);
      return result.path;
    }
  },

  // יצירת תיקייה למשימה בתוך פרויקט
  async createTaskFolder(projectId: string, projectName: string, taskId: string, taskTitle: string, entrepreneurId?: string, entrepreneurName?: string): Promise<string> {
    // יצירת נתיב לתיקיית המשימה בתוך תיקיית הפרויקט
    let projectPath: string;
    
    if (entrepreneurId && entrepreneurName) {
      // נתיב עם תיקיית יזם
      const entrepreneurPath = `/entrepreneurs/${entrepreneurName}_${entrepreneurId}`;
      projectPath = `${entrepreneurPath}/${projectName}_${projectId}`;
    } else {
      // נתיב ישירות לתיקיית פרויקטים
      projectPath = `/projects/${projectName}_${projectId}`;
    }
    
    // וידוא שתיקיית הפרויקט קיימת
    await this.createFolder(entrepreneurId && entrepreneurName ? '/entrepreneurs' : '/projects');
    await this.createFolder(projectPath);
    
    // יצירת תיקיית המשימה
    const taskPath = `${projectPath}/tasks/${taskTitle}_${taskId}`;
    
    // וידוא שתיקיית המשימות קיימת
    await this.createFolder(`${projectPath}/tasks`);
    
    // יצירת תיקיית המשימה הספציפית
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
    subtaskTitle: string,
    entrepreneurId?: string,
    entrepreneurName?: string
  ): Promise<string> {
    // יצירת נתיבים להיררכיה
    let projectPath: string;
    
    if (entrepreneurId && entrepreneurName) {
      // נתיב עם תיקיית יזם
      const entrepreneurPath = `/entrepreneurs/${entrepreneurName}_${entrepreneurId}`;
      projectPath = `${entrepreneurPath}/${projectName}_${projectId}`;
    } else {
      // נתיב ישירות לתיקיית פרויקטים
      projectPath = `/projects/${projectName}_${projectId}`;
    }
    
    const tasksPath = `${projectPath}/tasks`;
    const parentTaskPath = `${tasksPath}/${parentTaskTitle}_${parentTaskId}`;
    const subtaskPath = `${parentTaskPath}/subtasks/${subtaskTitle}_${subtaskId}`;
    
    // וידוא קיום התיקיות הקודמות בהיררכיה
    await this.createFolder(entrepreneurId && entrepreneurName ? '/entrepreneurs' : '/projects');
    await this.createFolder(projectPath);
    await this.createFolder(tasksPath);
    await this.createFolder(parentTaskPath);
    await this.createFolder(`${parentTaskPath}/subtasks`);
    
    // יצירת תיקיית תת-המשימה
    const result = await this.createFolder(subtaskPath);
    
    return result.path;
  },

  // אימות חיבור לדרופבוקס
  async validateConnection(): Promise<boolean> {
    try {
      const response = await dropbox.checkUser({});
      return !!response;
    } catch (error) {
      console.error('Failed to validate Dropbox connection:', error);
      return false;
    }
  },
};

export default dropboxService; 