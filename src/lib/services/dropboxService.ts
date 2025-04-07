import { Dropbox } from 'dropbox';

// הגדרת המפתחות מתוך משתני הסביבה
const appKey = process.env.NEXT_PUBLIC_DROPBOX_APP_KEY;
const accessToken = process.env.NEXT_PUBLIC_DROPBOX_ACCESS_TOKEN;

// סטטוס האם החיבור לדרופבוקס תקין
let isDropboxConfigured = false;
let dropbox: Dropbox | null = null;

// בדיקה האם יש טוקן גישה
if (!accessToken) {
  console.warn('Dropbox access token is missing. Dropbox functionality will be disabled.');
} else {
  // יצירת אובייקט דרופבוקס עם אימות רק אם יש טוקן
  try {
    dropbox = new Dropbox({
      accessToken,
    });
    isDropboxConfigured = true;
    console.log('Dropbox connection configured');
  } catch (error) {
    console.error('Failed to initialize Dropbox connection:', error);
  }
}

// הגדרת נתיבי בסיס קבועים
const BASE_PATH = 'נכסים בבלעדיות';
const PROJECTS_PATH = `${BASE_PATH}/פרויקטים חדשים`;

// פונקציה לניקוי שם קובץ/תיקייה
function sanitizePath(path: string): string {
  // הסרת תווים לא חוקיים מהנתיב
  return path
    .replace(/[\\/:\*\?"<>\|]/g, '_') // החלפת תווים לא חוקיים ב-_
    .replace(/\s+/g, '_') // החלפת רווחים ב-_
    .replace(/__+/g, '_') // החלפת כפילויות של _ ב-_ בודד
    .trim() // הסרת רווחים מתחילת וסוף המחרוזת
    .replace(/^_+/, ''); // הסרת _ מתחילת המחרוזת
}

// פונקציה שמנקה נתיב דרופבוקס מלא
function formatDropboxPath(path: string): string {
  // אם הנתיב ריק, החזר נתיב ריק
  if (!path) return '';
  
  // דרופבוקס דורש שהנתיב יתחיל ב-/ אבל לא יכיל // כפולים
  // הסר כל / מתחילת וסוף המחרוזת ואז הוסף / בהתחלה
  const cleanPath = path.replace(/^\/+|\/+$/g, '');
  
  // אם אחרי הניקוי קיבלנו מחרוזת ריקה, נחזיר רק /
  if (!cleanPath) return '';
  
  // אחרת נחזיר את הנתיב עם / בהתחלה
  return `/${cleanPath}`;
}

// בדיקה אם הדרופבוקס מוגדר ומחזיר שגיאה ידידותית אם לא
function checkDropboxConfig(): boolean {
  if (!isDropboxConfigured || !dropbox) {
    console.warn('Dropbox is not properly configured. Please check your access token.');
    return false;
  }
  
  // בדיקה נוספת שאובייקט הדרופבוקס תקין
  if (typeof dropbox.filesGetMetadata !== 'function' ||
      typeof dropbox.filesCreateFolderV2 !== 'function' ||
      typeof dropbox.filesListFolder !== 'function') {
    console.error('Dropbox object is missing required methods. Reinitializing...');
    try {
      dropbox = new Dropbox({ accessToken });
      isDropboxConfigured = !!dropbox;
    } catch (error) {
      console.error('Failed to reinitialize Dropbox:', error);
      isDropboxConfigured = false;
    }
    return isDropboxConfigured;
  }
  
  return true;
}

// פונקציית עזר לניסיונות חוזרים (retry)
async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000,
  operationName: string = 'Dropbox operation'
): Promise<T> {
  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await operation();
      return result;
    } catch (error: any) {
      lastError = error;
      
      // אם זו שגיאת 'fetch is not a function', צריך לאתחל מחדש את הדרופבוקס
      if (error.message && error.message.includes('fetch is not a function')) {
        console.error(`${operationName} failed with fetch error on attempt ${attempt}/${maxAttempts}. Reinitializing Dropbox...`);
        try {
          dropbox = new Dropbox({ accessToken });
          isDropboxConfigured = !!dropbox;
        } catch (initError) {
          console.error('Failed to reinitialize Dropbox client:', initError);
        }
      } else {
        console.error(`${operationName} failed on attempt ${attempt}/${maxAttempts}:`, error);
      }
      
      // אם זה לא הניסיון האחרון, נחכה לפני הניסיון הבא
      if (attempt < maxAttempts) {
        const waitTime = delay * attempt;  // הגדלת זמן ההמתנה בכל ניסיון
        console.log(`Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  throw lastError;
}

export const dropboxService = {
  // בדיקה האם תיקייה קיימת
  async folderExists(path: string): Promise<boolean> {
    // אם הדרופבוקס לא מוגדר, נחזיר שקר
    if (!checkDropboxConfig()) {
      return false;
    }
    
    try {
      // אם הנתיב ריק, התייחס לתיקיית השורש
      if (!path || path === '/') {
        return true; // תיקיית השורש תמיד קיימת
      }
      
      // ניקוי וסידור הנתיב
      const formattedPath = formatDropboxPath(path);
      
      console.log(`Checking if folder exists: ${formattedPath || '/'}`);
      
      // אם הנתיב ריק אחרי הפורמט, זו תיקיית השורש
      if (!formattedPath) {
        return true;
      }
      
      try {
        await withRetry(
          () => dropbox!.filesGetMetadata({ path: formattedPath }),
          3,
          1000,
          `Check if folder exists: ${formattedPath}`
        );
        console.log(`Folder exists: ${formattedPath}`);
        return true;
      } catch (error: any) {
        // שגיאה 409 היא "conflict", אבל יכולה לסמן גם path/not_found
        if (error?.status === 409) {
          // בדיקה האם השגיאה היא בגלל שהנתיב לא נמצא
          if (error?.error?.error_summary?.includes('path/not_found')) {
            console.log(`Folder does not exist (path/not_found): ${path}`);
            return false;
          }
          // במקרה אחר של 409, ננסה להשתמש ב-path_lookup לברר אם התיקייה קיימת
          if (error?.error?.error_summary?.includes('path/conflict')) {
            console.log(`Path conflict detected: ${path}`);
            return true; // נניח שהתיקייה קיימת במקרה של קונפליקט
          }
          
          console.log(`Folder does not exist (409): ${path}`);
          return false; // התיקייה לא קיימת
        }
        
        console.warn(`Warning checking if folder exists: ${path} - ${error?.message || 'Unknown error'}`);
        return false; // במקרה של שגיאה, נניח שהתיקייה לא קיימת
      }
    } catch (outerError) {
      console.error(`Error in folderExists for ${path}:`, outerError);
      return false;
    }
  },

  // יצירת תיקייה 
  async createFolder(path: string): Promise<{ id: string; name: string; path: string }> {
    // אם הדרופבוקס לא מוגדר, נחזיר אובייקט דמה
    if (!checkDropboxConfig()) {
      return {
        id: 'dropbox-not-configured',
        name: path.split('/').pop() || '',
        path: path,
      };
    }
    
    try {
      // אם הנתיב הוא ריק או /, אין צורך ליצור תיקייה (זו תיקיית השורש)
      if (!path || path === '/') {
        return {
          id: '',
          name: '',
          path: '',
        };
      }
      
      // ניקוי וסידור הנתיב
      const formattedPath = formatDropboxPath(path);
      
      if (!formattedPath) {
        throw new Error('Invalid path for folder creation');
      }
      
      console.log(`Attempting to create folder at: ${formattedPath}`);
      
      // נבדוק קודם אם התיקייה קיימת
      try {
        const existingFolder = await withRetry(
          () => dropbox!.filesGetMetadata({ path: formattedPath }),
          3,
          1000,
          `Get metadata for ${formattedPath}`
        );
        
        console.log(`Folder already exists: ${formattedPath}`);
        return {
          id: (existingFolder.result as any).id,
          name: (existingFolder.result as any).name,
          path: formattedPath,
        };
      } catch (checkError: any) {
        // אם התקבלה שגיאת 409 Path conflict, ייתכן שהתיקייה קיימת בשם אחר
        if (checkError?.status === 409 && checkError?.error?.error_summary?.includes('path/conflict')) {
          console.log(`Path conflict for ${formattedPath}, folder may exist with a different name or case`);
          
          // ננסה לקבל פרטים לגבי תיקיית האב ולבדוק האם התיקייה קיימת שם
          const parentPath = formattedPath.split('/').slice(0, -1).join('/') || '/';
          const folderName = formattedPath.split('/').pop() || '';
          
          try {
            // קבל את תוכן תיקיית האב
            const listFolderResult = await withRetry(
              () => dropbox!.filesListFolder({ path: parentPath }),
              3,
              1000,
              `List folder for ${parentPath}`
            );
            
            // חפש תיקייה עם אותו שם (התעלם מרישיות)
            const matchingFolder = listFolderResult.result.entries.find(
              entry => entry['.tag'] === 'folder' && entry.name.toLowerCase() === folderName.toLowerCase()
            );
            
            if (matchingFolder) {
              console.log(`Found matching folder: ${matchingFolder.path_display}`);
              return {
                id: (matchingFolder as any).id,
                name: matchingFolder.name,
                path: matchingFolder.path_display || formattedPath,
              };
            }
          } catch (listError) {
            console.log(`Could not list parent folder contents: ${parentPath}`, listError);
            // ממשיך לנסות ליצור את התיקייה
          }
        }
        
        // ננסה ליצור את התיקייה רק אם קיבלנו שגיאה שמראה שהתיקייה לא קיימת
        if (
          checkError?.status === 409 || 
          checkError?.error?.error_summary?.includes('path/not_found')
        ) {
          try {
            console.log(`Creating new folder: ${formattedPath}`);
            
            const result = await withRetry(
              () => dropbox!.filesCreateFolderV2({ path: formattedPath }),
              3, 
              1000,
              `Create folder ${formattedPath}`
            );
            
            console.log(`Successfully created folder: ${formattedPath}`);
            return {
              id: result.result.metadata.id,
              name: result.result.metadata.name,
              path: formattedPath,
            };
          } catch (createError: any) {
            console.error(`Error creating folder: ${formattedPath}`, createError);
            
            // בדיקה האם התיקייה כבר קיימת (אולי נוצרה בין הקריאות)
            if (createError?.error?.error_summary?.includes('path/conflict')) {
              console.log(`Path conflict while creating folder: ${formattedPath}, the folder probably exists already`);
              
              try {
                // ננסה לחפש את התיקייה שוב
                const parentPath = formattedPath.split('/').slice(0, -1).join('/') || '/';
                const folderName = formattedPath.split('/').pop() || '';
                
                const listFolderResult = await withRetry(
                  () => dropbox!.filesListFolder({ path: parentPath }),
                  3,
                  1000,
                  `List folder after conflict ${parentPath}`
                );
                
                const matchingFolder = listFolderResult.result.entries.find(
                  entry => entry['.tag'] === 'folder' && entry.name.toLowerCase() === folderName.toLowerCase()
                );
                
                if (matchingFolder) {
                  console.log(`Found existing folder after conflict: ${matchingFolder.path_display}`);
                  return {
                    id: (matchingFolder as any).id,
                    name: matchingFolder.name,
                    path: matchingFolder.path_display || formattedPath,
                  };
                }
                
                // אם לא מצאנו את התיקייה, נחזיר אובייקט דמה
                console.log(`Could not find the folder after conflict, returning dummy object`);
                return {
                  id: 'unknown-after-conflict',
                  name: folderName,
                  path: formattedPath,
                };
              } catch (error) {
                console.error(`Error searching for folder after conflict: ${formattedPath}`, error);
                throw createError;
              }
            } else {
              throw createError;
            }
          }
        } else {
          // אם יש שגיאה אחרת, נזרוק אותה
          console.error(`Unexpected error checking if folder exists: ${formattedPath}`, checkError);
          throw checkError;
        }
      }
    } catch (error: any) {
      console.error('Error creating folder in Dropbox:', error);
      
      // במקרה של שגיאה, נחזיר אובייקט דמה עם השם המקורי
      // כדי לאפשר להמשיך בתהליך
      const folderName = path.split('/').pop() || '';
      return {
        id: 'error-creating-folder',
        name: folderName,
        path: path,
      };
    }
  },

  // וידוא קיום תיקיות בסיס
  async ensureBaseFolders(): Promise<void> {
    // אם הדרופבוקס לא מוגדר, לא ננסה ליצור תיקיות
    if (!checkDropboxConfig()) {
      console.log('Skipping base folder creation - Dropbox not configured');
      return;
    }
    
    try {
      console.log(`Ensuring base folders exist`);
      
      // בדיקה אם תיקיית הבסיס כבר קיימת לפני הניסיון ליצור אותה
      let baseExists = await this.folderExists(BASE_PATH);
      if (!baseExists) {
        console.log(`Base folder ${BASE_PATH} doesn't exist - creating it`);
        // יצירה של תיקיית הבסיס אם לא קיימת
        await this.createFolder(BASE_PATH);
      } else {
        console.log(`Base folder ${BASE_PATH} already exists`);
      }
      
      // בדיקה אם תיקיית הפרויקטים כבר קיימת לפני הניסיון ליצור אותה
      let projectsFolderExists = await this.folderExists(PROJECTS_PATH);
      if (!projectsFolderExists) {
        console.log(`Projects folder ${PROJECTS_PATH} doesn't exist - creating it`);
        // יצירה של תיקיית הפרויקטים אם לא קיימת
        await this.createFolder(PROJECTS_PATH);
      } else {
        console.log(`Projects folder ${PROJECTS_PATH} already exists`);
      }
      
      console.log('Base folders verified successfully');
    } catch (error) {
      console.error('Error ensuring base folders:', error);
      throw error;
    }
  },

  // יצירת מבנה תיקיות היררכי (רקורסיבי) תוך התחשבות בשגיאות אפשריות
  async createFolderHierarchy(paths: string[]): Promise<void> {
    // אם הדרופבוקס לא מוגדר, לא ננסה ליצור תיקיות
    if (!checkDropboxConfig()) {
      return;
    }
    
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
  
  // קבלת כל תיקיות היזמים (למילוי תפריט בחירה)
  async getEntrepreneurFolders(): Promise<{ id: string; name: string; path: string }[]> {
    // אם הדרופבוקס לא מוגדר, נחזיר רשימה ריקה
    if (!checkDropboxConfig()) {
      console.log('Returning empty entrepreneur folders list - Dropbox not configured');
      return [];
    }
    
    try {
      // וידוא קיום תיקיות בסיס
      await this.ensureBaseFolders();
      
      // קבלת כל התיקיות תחת תיקיית הפרויקטים
      const structure = await this.getFolderStructure(PROJECTS_PATH);
      
      return structure.folders;
    } catch (error) {
      console.error('Error getting entrepreneur folders:', error);
      throw error;
    }
  },
  
  // קבלת מבנה התיקיות הקיים בדרופבוקס
  async getFolderStructure(path: string = ''): Promise<any> {
    // אם הדרופבוקס לא מוגדר, נחזיר מבנה ריק
    if (!checkDropboxConfig()) {
      return { path, folders: [] };
    }
    
    try {
      const formattedPath = formatDropboxPath(path);
      
      console.log(`Getting folder structure for: ${formattedPath || '/'}`);
      
      // שליפת תוכן התיקייה
      const response = await dropbox!.filesListFolder({
        path: formattedPath,
        recursive: false,
        include_deleted: false,
        include_has_explicit_shared_members: false,
        include_mounted_folders: true,
        include_non_downloadable_files: true
      });
      
      const entries = response.result.entries;
      
      // סינון רק תיקיות
      const folders = entries.filter(entry => entry['.tag'] === 'folder');
      
      const result = {
        path: formattedPath,
        folders: folders.map(folder => ({
          name: folder.name,
          path: folder.path_display,
          id: (folder as any).id
        }))
      };
      
      console.log(`Found ${folders.length} folders in ${formattedPath || '/'}`);
      return result;
      
    } catch (error: any) {
      console.error(`Error getting folder structure for ${path}:`, error);
      throw new Error(`Failed to get folder structure: ${error?.message || 'Unknown error'}`);
    }
  },
  
  // קבלת מבנה תיקיות רקורסיבי (עד לעומק מסוים)
  async getRecursiveFolderStructure(path: string = '', depth: number = 2): Promise<any> {
    // אם הדרופבוקס לא מוגדר, נחזיר מבנה ריק
    if (!checkDropboxConfig()) {
      return { path, folders: [] };
    }
    
    if (depth < 0) {
      return { path, folders: [] };
    }
    
    const structure = await this.getFolderStructure(path);
    
    if (depth > 0 && structure.folders.length > 0) {
      const folderPromises = structure.folders.map(async (folder: any) => {
        const subStructure = await this.getRecursiveFolderStructure(folder.path, depth - 1);
        return {
          ...folder,
          subFolders: subStructure.folders
        };
      });
      
      structure.folders = await Promise.all(folderPromises);
    }
    
    return structure;
  },
  
  // יצירת תיקייה ליזם תחת תיקיית הפרויקטים החדשים
  async createEntrepreneurFolder(entrepreneurId: string, entrepreneurName: string): Promise<string> {
    // אם הדרופבוקס לא מוגדר, נחזיר מחרוזת ריקה
    if (!checkDropboxConfig()) {
      return '';
    }
    
    try {
      // וידוא שיש מזהה תקין
      if (!entrepreneurId) {
        throw new Error('Invalid entrepreneur ID');
      }
      
      // וידוא קיום תיקיות הבסיס
      await this.ensureBaseFolders();
      
      // ניקוי השם
      const cleanName = sanitizePath(entrepreneurName || 'entrepreneur');
      
      // יצירת נתיב לתיקיית היזם
      const path = `${PROJECTS_PATH}/${cleanName}_${entrepreneurId}`;
      
      // יצירת תיקיית היזם הספציפי
      const result = await this.createFolder(path);
      
      return result.path;
    } catch (error) {
      console.error(`Error creating entrepreneur folder:`, error);
      throw error;
    }
  },

  // יצירת תיקייה לפרויקט תחת תיקיית היזם
  async createProjectFolder(projectId: string, projectName: string, entrepreneurId?: string, entrepreneurName?: string): Promise<string> {
    // אם הדרופבוקס לא מוגדר, נחזיר מזהה דמה
    if (!checkDropboxConfig()) {
      return `mock-folder-${projectId}`;
    }
    
    try {
      // וידוא שיש מזהה פרויקט תקין
      if (!projectId) {
        throw new Error('Invalid project ID');
      }
      
      // וידוא קיום תיקיות בסיס
      await this.ensureBaseFolders();
      
      // ניקוי שם הפרויקט
      const cleanProjectName = sanitizePath(projectName || 'project');
      
      if (entrepreneurId && entrepreneurName) {
        // יצירת נתיב ליזם ספציפי
        const cleanEntrepreneurName = sanitizePath(entrepreneurName);
        const entrepreneurPath = `${PROJECTS_PATH}/${cleanEntrepreneurName}_${entrepreneurId}`;
        
        // וידוא קיום תיקיית היזם
        await this.createFolder(entrepreneurPath);
        
        // יצירת תיקיית הפרויקט תחת תיקיית היזם - רק עם שם הפרויקט
        const projectPath = `${entrepreneurPath}/${cleanProjectName}`;
        const result = await this.createFolder(projectPath);
        
        return result.path;
      } else {
        // אם אין יזם, יוצר תיקייה ישירות תחת תיקיית הפרויקטים - רק עם שם הפרויקט
        const projectPath = `${PROJECTS_PATH}/${cleanProjectName}`;
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
    // אם הדרופבוקס לא מוגדר, נחזיר מזהה דמה
    if (!checkDropboxConfig()) {
      return `mock-task-folder-${projectId}-${taskId}`;
    }
    
    try {
      // וידוא שיש מזהים תקינים
      if (!projectId || !taskId) {
        throw new Error('Invalid project or task ID');
      }
      
      // וידוא קיום תיקיות בסיס
      await this.ensureBaseFolders();
      
      // ניקוי השמות
      const cleanProjectName = sanitizePath(projectName || 'project');
      const cleanTaskTitle = sanitizePath(taskTitle || 'task');
      
      // יצירת נתיב לתיקיית המשימה בתוך תיקיית הפרויקט
      let projectPath: string;
      
      if (entrepreneurId && entrepreneurName) {
        // נתיב עם תיקיית יזם
        const cleanEntrepreneurName = sanitizePath(entrepreneurName);
        const entrepreneurPath = `${PROJECTS_PATH}/${cleanEntrepreneurName}_${entrepreneurId}`;
        projectPath = `${entrepreneurPath}/${cleanProjectName}`;
        
        // וידוא קיום תיקיית היזם
        await this.createFolder(entrepreneurPath);
      } else {
        // נתיב ישירות תחת תיקיית הפרויקטים
        projectPath = `${PROJECTS_PATH}/${cleanProjectName}`;
      }
      
      // וידוא שתיקיית הפרויקט קיימת
      await this.createFolder(projectPath);
      
      // יצירת תיקיית המשימה הספציפית ישירות בתוך תיקיית הפרויקט
      const taskPath = `${projectPath}/${cleanTaskTitle}`;
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
    // אם הדרופבוקס לא מוגדר, נחזיר מזהה דמה
    if (!checkDropboxConfig()) {
      return `mock-subtask-folder-${projectId}-${parentTaskId}-${subtaskId}`;
    }
    
    try {
      // וידוא שיש מזהים תקינים
      if (!projectId || !parentTaskId || !subtaskId) {
        throw new Error('Invalid project, parent task, or subtask ID');
      }
      
      // וידוא קיום תיקיות בסיס
      await this.ensureBaseFolders();
      
      // ניקוי השמות
      const cleanProjectName = sanitizePath(projectName || 'project');
      const cleanParentTaskTitle = sanitizePath(parentTaskTitle || 'parent-task');
      const cleanSubtaskTitle = sanitizePath(subtaskTitle || 'subtask');
      
      // יצירת נתיבים להיררכיה
      let projectPath: string;
      
      if (entrepreneurId && entrepreneurName) {
        // נתיב עם תיקיית יזם
        const cleanEntrepreneurName = sanitizePath(entrepreneurName);
        const entrepreneurPath = `${PROJECTS_PATH}/${cleanEntrepreneurName}_${entrepreneurId}`;
        projectPath = `${entrepreneurPath}/${cleanProjectName}`;
        
        // וידוא קיום תיקיית היזם
        await this.createFolder(entrepreneurPath);
      } else {
        // נתיב ישירות תחת תיקיית הפרויקטים
        projectPath = `${PROJECTS_PATH}/${cleanProjectName}`;
      }
      
      // וידוא שתיקיית הפרויקט קיימת
      await this.createFolder(projectPath);
      
      // בניית שאר הנתיבים - תת משימה נמצאת ישירות בתוך תיקיית המשימה האב
      const parentTaskPath = `${projectPath}/${cleanParentTaskTitle}`;
      
      // וידוא קיום תיקיית המשימה האב
      await this.createFolder(parentTaskPath);
      
      // יצירת תיקיית תת-המשימה ישירות בתוך תיקיית המשימה האב
      const subtaskPath = `${parentTaskPath}/${cleanSubtaskTitle}`;
      const result = await this.createFolder(subtaskPath);
      
      return result.path;
    } catch (error) {
      console.error(`Error creating subtask folder:`, error);
      throw error;
    }
  },

  // פונקציה חדשה: יצירת תיקייה למשימה בכל רמה של ההירארכיה, בהתאם להיררכיית המשימות
  async createHierarchicalTaskFolder(
    projectId: string,
    projectName: string,
    taskId: string,
    taskTitle: string,
    parentFolderPath: string | null = null,
    entrepreneurId?: string,
    entrepreneurName?: string
  ): Promise<string> {
    // אם הדרופבוקס לא מוגדר, נחזיר מזהה דמה
    if (!checkDropboxConfig()) {
      return `mock-hierarchical-task-folder-${projectId}-${taskId}`;
    }
    
    try {
      // וידוא שיש מזהים תקינים
      if (!projectId || !taskId) {
        throw new Error('Invalid project or task ID');
      }
      
      // וידוא קיום תיקיות בסיס
      await this.ensureBaseFolders();
      
      // ניקוי השמות
      const cleanProjectName = sanitizePath(projectName || 'project');
      const cleanTaskTitle = sanitizePath(taskTitle || 'task');
      
      console.log(`Creating hierarchical task folder for task: ${taskTitle} (${taskId}) in project: ${projectName}`);
      
      let basePath: string;
      
      if (parentFolderPath) {
        // אם יש נתיב של משימת אב, נשתמש בו כבסיס
        console.log(`Using parent folder path: ${parentFolderPath}`);
        basePath = parentFolderPath;
      } else {
        // אחרת, נבנה את הנתיב לתיקיית הפרויקט - רק עם שם הפרויקט, ללא ה-UUID
        if (entrepreneurId && entrepreneurName) {
          const cleanEntrepreneurName = sanitizePath(entrepreneurName);
          const entrepreneurPath = `${PROJECTS_PATH}/${cleanEntrepreneurName}_${entrepreneurId}`;
          
          // בדיקה אם תיקיית היזם כבר קיימת לפני יצירתה
          const entrepreneurFolderExists = await this.folderExists(entrepreneurPath);
          if (entrepreneurFolderExists) {
            console.log(`Using existing entrepreneur folder: ${entrepreneurPath}`);
          } else {
            console.log(`Creating new entrepreneur folder: ${entrepreneurPath}`);
            await this.createFolder(entrepreneurPath);
          }
          
          // שימוש רק בשם הפרויקט ללא UUID
          basePath = `${entrepreneurPath}/${cleanProjectName}`;
        } else {
          // שימוש רק בשם הפרויקט ללא UUID
          basePath = `${PROJECTS_PATH}/${cleanProjectName}`;
        }
        
        // בדיקה אם תיקיית הפרויקט כבר קיימת
        const projectFolderExists = await this.folderExists(basePath);
        if (projectFolderExists) {
          console.log(`Using existing project folder: ${basePath}`);
        } else {
          console.log(`Creating new project folder: ${basePath}`);
          await this.createFolder(basePath);
        }
      }
      
      // יצירת תיקיית המשימה בנתיב הבסיס - שילוב השם ו-ID לזיהוי ייחודי
      const formattedTaskTitle = `${cleanTaskTitle} [${taskId}]`;
      const taskPath = `${basePath}/${formattedTaskTitle}`;
      
      // בדיקה אם תיקיית המשימה כבר קיימת
      const taskFolderExists = await this.folderExists(taskPath);
      if (taskFolderExists) {
        console.log(`Using existing task folder: ${taskPath}`);
      } else {
        console.log(`Creating new task folder: ${taskPath}`);
      }
      
      const result = await this.createFolder(taskPath);
      
      console.log(`Task folder path: ${result.path}`);
      return result.path;
    } catch (error) {
      console.error(`Error creating hierarchical task folder:`, error);
      throw error;
    }
  },

  // אימות חיבור לדרופבוקס
  async validateConnection(): Promise<boolean> {
    // אם הדרופבוקס לא מוגדר, נחזיר שקר
    if (!isDropboxConfigured || !dropbox) {
      return false;
    }
    
    try {
      // ניסיון ליצור פעולה פשוטה כדי לאמת את החיבור
      const response = await dropbox.usersGetCurrentAccount();
      return !!response;
    } catch (error) {
      console.error('Failed to validate Dropbox connection:', error);
      return false;
    }
  },
  
  // האם דרופבוקס מוגדר
  isConfigured(): boolean {
    return isDropboxConfigured;
  }
};

export default dropboxService; 