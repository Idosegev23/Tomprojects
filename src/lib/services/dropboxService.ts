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
      
      // וידוא שהנתיב מתחיל ב-/ אם הוא לא ריק
      const formattedPath = cleanPath && cleanPath !== '/' ? 
        (cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`) : 
        cleanPath;

      // אם הנתיב ריק או /, זו תיקיית הבסיס שתמיד קיימת
      if (!formattedPath || formattedPath === '/') {
        return true;
      }
      
      await dropbox.filesGetMetadata({ path: formattedPath });
      return true;
    } catch (error: any) {
      if (error?.status === 409) {
        return false; // התיקייה לא קיימת
      }
      
      // בדיקה האם השגיאה היא בגלל שהנתיב לא נמצא
      if (error?.error?.error_summary?.includes('path/not_found')) {
        return false;
      }
      
      console.warn(`Warning checking if folder exists: ${error?.message || 'Unknown error'}`);
      return false; // במקרה של שגיאה, נניח שהתיקייה לא קיימת
    }
  },

  // יצירת תיקייה 
  async createFolder(path: string): Promise<{ id: string; name: string; path: string }> {
    try {
      // אם הנתיב הוא ריק או /, אין צורך ליצור תיקייה (זו תיקיית השורש)
      if (!path || path === '/') {
        return {
          id: '',
          name: '',
          path: '/',
        };
      }
      
      // ניקוי הנתיב לפני יצירת התיקייה
      let cleanPath = sanitizePath(path);
      
      // וידוא שהנתיב מתחיל ב-/
      cleanPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
      
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
      } catch (checkError: any) {
        // ננסה ליצור את התיקייה רק אם קיבלנו שגיאה שמראה שהתיקייה לא קיימת
        if (
          checkError?.status === 409 || 
          checkError?.error?.error_summary?.includes('path/not_found')
        ) {
          try {
            const result = await dropbox.filesCreateFolderV2({ path: cleanPath });
            console.log(`Successfully created folder: ${cleanPath}`);
            return {
              id: result.result.metadata.id,
              name: result.result.metadata.name,
              path: cleanPath,
            };
          } catch (createError: any) {
            console.error(`Error creating folder: ${cleanPath}`, createError);
            // בדיקה האם התיקייה כבר קיימת (אולי נוצרה בין הקריאות)
            if (createError?.error?.error_summary?.includes('path/conflict')) {
              try {
                const existingFolder = await dropbox.filesGetMetadata({ path: cleanPath });
                return {
                  id: (existingFolder.result as any).id,
                  name: (existingFolder.result as any).name,
                  path: cleanPath,
                };
              } catch (error) {
                throw createError;
              }
            } else {
              throw createError;
            }
          }
        } else {
          // אם יש שגיאה אחרת, נזרוק אותה
          console.error(`Unexpected error checking if folder exists: ${cleanPath}`, checkError);
          throw checkError;
        }
      }
    } catch (error: any) {
      console.error('Error creating folder in Dropbox:', error);
      throw new Error(`Failed to create folder in Dropbox: ${error?.message || 'Unknown error'}`);
    }
  },

  // יצירת מבנה תיקיות היררכי (רקורסיבי) תוך התחשבות בשגיאות אפשריות
  async createFolderHierarchy(paths: string[]): Promise<void> {
    // מיון הנתיבים מהקצר ביותר לארוך ביותר כדי ליצור תיקיות אב לפני תיקיות בנות
    const sortedPaths = [...paths].sort((a, b) => a.length - b.length);
    
    for (const path of sortedPaths) {
      try {
        await this.createFolder(path);
      } catch (error) {
        console.error(`Failed to create folder in hierarchy: ${path}`, error);
        // נמשיך לתיקייה הבאה במקום לעצור את כל התהליך
      }
    }
  },
  
  // יצירת תיקייה ליזם
  async createEntrepreneurFolder(entrepreneurId: string, entrepreneurName: string): Promise<string> {
    try {
      // וידוא שיש מזהה תקין
      if (!entrepreneurId) {
        throw new Error('Invalid entrepreneur ID');
      }
      
      // ניקוי השם
      const cleanName = sanitizePath(entrepreneurName || 'entrepreneur');
      
      // יצירת נתיב לתיקיית היזם
      const path = `/entrepreneurs/${cleanName}_${entrepreneurId}`;
      
      // יצירת תיקיית יזמים אם לא קיימת
      await this.createFolder('/entrepreneurs');
      
      // יצירת תיקיית היזם הספציפי
      const result = await this.createFolder(path);
      
      return result.path;
    } catch (error) {
      console.error(`Error creating entrepreneur folder:`, error);
      throw error;
    }
  },

  // יצירת תיקייה לפרויקט
  async createProjectFolder(projectId: string, projectName: string, entrepreneurId?: string, entrepreneurName?: string): Promise<string> {
    try {
      // וידוא שיש מזהה פרויקט תקין
      if (!projectId) {
        throw new Error('Invalid project ID');
      }
      
      // ניקוי שם הפרויקט
      const cleanProjectName = sanitizePath(projectName || 'project');
      
      if (entrepreneurId && entrepreneurName) {
        // אם יש יזם, צור תחילה את תיקיית היזם ואז את תיקיית הפרויקט בתוכה
        try {
          // יצירת תיקיית יזמים אם לא קיימת
          await this.createFolder('/entrepreneurs');
          
          // ניקוי שם היזם
          const cleanEntrepreneurName = sanitizePath(entrepreneurName);
          
          const entrepreneurPath = `/entrepreneurs/${cleanEntrepreneurName}_${entrepreneurId}`;
          await this.createFolder(entrepreneurPath);
          
          const projectPath = `${entrepreneurPath}/${cleanProjectName}_${projectId}`;
          const result = await this.createFolder(projectPath);
          return result.path;
        } catch (error) {
          console.error(`Error creating project folder with entrepreneur:`, error);
          
          // במקרה של שגיאה, ננסה ליצור את הפרויקט ללא קישור ליזם
          await this.createFolder('/projects');
          const projectPath = `/projects/${cleanProjectName}_${projectId}`;
          const result = await this.createFolder(projectPath);
          return result.path;
        }
      } else {
        // אם אין יזם, נוסיף את הפרויקט ישירות לרמה הראשית
        await this.createFolder('/projects');
        const projectPath = `/projects/${cleanProjectName}_${projectId}`;
        const result = await this.createFolder(projectPath);
        return result.path;
      }
    } catch (error) {
      console.error(`Error creating project folder:`, error);
      throw error;
    }
  },

  // יצירת תיקייה למשימה בתוך פרויקט
  async createTaskFolder(projectId: string, projectName: string, taskId: string, taskTitle: string, entrepreneurId?: string, entrepreneurName?: string): Promise<string> {
    try {
      // וידוא שיש מזהים תקינים
      if (!projectId || !taskId) {
        throw new Error('Invalid project or task ID');
      }
      
      // ניקוי השמות
      const cleanProjectName = sanitizePath(projectName || 'project');
      const cleanTaskTitle = sanitizePath(taskTitle || 'task');
      
      // יצירת נתיב לתיקיית המשימה בתוך תיקיית הפרויקט
      let projectPath: string;
      
      if (entrepreneurId && entrepreneurName) {
        // נתיב עם תיקיית יזם
        const cleanEntrepreneurName = sanitizePath(entrepreneurName);
        const entrepreneurPath = `/entrepreneurs/${cleanEntrepreneurName}_${entrepreneurId}`;
        projectPath = `${entrepreneurPath}/${cleanProjectName}_${projectId}`;
        
        // וידוא שתיקיית היזם קיימת
        await this.createFolder('/entrepreneurs');
        await this.createFolder(entrepreneurPath);
      } else {
        // נתיב ישירות לתיקיית פרויקטים
        projectPath = `/projects/${cleanProjectName}_${projectId}`;
        
        // וידוא שתיקיית הפרויקטים קיימת
        await this.createFolder('/projects');
      }
      
      // וידוא שתיקיית הפרויקט קיימת
      await this.createFolder(projectPath);
      
      // יצירת תיקיית המשימות אם לא קיימת
      const tasksPath = `${projectPath}/tasks`;
      await this.createFolder(tasksPath);
      
      // יצירת תיקיית המשימה הספציפית
      const taskPath = `${tasksPath}/${cleanTaskTitle}_${taskId}`;
      const result = await this.createFolder(taskPath);
      
      return result.path;
    } catch (error) {
      console.error(`Error creating task folder:`, error);
      throw error;
    }
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
    try {
      // וידוא שיש מזהים תקינים
      if (!projectId || !parentTaskId || !subtaskId) {
        throw new Error('Invalid project, parent task, or subtask ID');
      }
      
      // ניקוי השמות
      const cleanProjectName = sanitizePath(projectName || 'project');
      const cleanParentTaskTitle = sanitizePath(parentTaskTitle || 'parent-task');
      const cleanSubtaskTitle = sanitizePath(subtaskTitle || 'subtask');
      
      // יצירת נתיבים להיררכיה
      let projectPath: string;
      
      if (entrepreneurId && entrepreneurName) {
        // נתיב עם תיקיית יזם
        const cleanEntrepreneurName = sanitizePath(entrepreneurName);
        const entrepreneurPath = `/entrepreneurs/${cleanEntrepreneurName}_${entrepreneurId}`;
        projectPath = `${entrepreneurPath}/${cleanProjectName}_${projectId}`;
        
        // וידוא שתיקיית היזם קיימת
        await this.createFolder('/entrepreneurs');
        await this.createFolder(entrepreneurPath);
      } else {
        // נתיב ישירות לתיקיית פרויקטים
        projectPath = `/projects/${cleanProjectName}_${projectId}`;
        
        // וידוא שתיקיית הפרויקטים קיימת
        await this.createFolder('/projects');
      }
      
      // בניית שאר הנתיבים
      const tasksPath = `${projectPath}/tasks`;
      const parentTaskPath = `${tasksPath}/${cleanParentTaskTitle}_${parentTaskId}`;
      const subtasksPath = `${parentTaskPath}/subtasks`;
      const subtaskPath = `${subtasksPath}/${cleanSubtaskTitle}_${subtaskId}`;
      
      // וידוא קיום התיקיות הקודמות בהיררכיה
      await this.createFolder(projectPath);
      await this.createFolder(tasksPath);
      await this.createFolder(parentTaskPath);
      await this.createFolder(subtasksPath);
      
      // יצירת תיקיית תת-המשימה
      const result = await this.createFolder(subtaskPath);
      
      return result.path;
    } catch (error) {
      console.error(`Error creating subtask folder:`, error);
      throw error;
    }
  },

  // אימות חיבור לדרופבוקס
  async validateConnection(): Promise<boolean> {
    try {
      // ניסיון ליצור פעולה פשוטה כדי לאמת את החיבור
      const response = await dropbox.usersGetCurrentAccount();
      return !!response;
    } catch (error) {
      console.error('Failed to validate Dropbox connection:', error);
      return false;
    }
  },
};

export default dropboxService; 