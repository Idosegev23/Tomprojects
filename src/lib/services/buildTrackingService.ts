/**
 * שירות למעקב אחר הפעולות שמתבצעות ביישום
 * השירות מאפשר לעדכן קובץ build_tracking.txt עם פעולות שמתבצעות
 */

import fs from 'fs';
import path from 'path';
import { format } from 'date-fns';

/**
 * פונקציה לעדכון קובץ מעקב הבנייה
 * מוסיפה שורה חדשה לקובץ עם התאריך הנוכחי ותיאור הפעולה
 * 
 * @param message תיאור הפעולה שבוצעה
 * @returns הבטחה שמתממשת לאחר עדכון הקובץ
 */
export async function updateBuildTracking(message: string): Promise<void> {
  try {
    // בסביבת הדפדפן, נשתמש ב-console.log במקום בכתיבה לקובץ
    if (typeof window !== 'undefined') {
      console.log(`[Build Tracking] ${message}`);
      return;
    }

    // בצד השרת, נכתוב לקובץ
    const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
    const entry = `[${timestamp}] ${message}\n`;
    
    // קביעת נתיב הקובץ
    const filePath = path.join(process.cwd(), 'build_tracking.txt');
    
    // הוספת השורה לקובץ
    await fs.promises.appendFile(filePath, entry);
  } catch (error) {
    console.error('שגיאה בעדכון קובץ מעקב הבנייה:', error);
  }
} 