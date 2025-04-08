/**
 * שירות למעקב אחר הפעולות שמתבצעות ביישום
 * השירות מאפשר לתעד פעולות שמתבצעות במערכת
 */

import { format } from 'date-fns';

/**
 * פונקציה לעדכון מעקב הבנייה
 * מתעדת פעולות שמתבצעות במערכת
 * 
 * @param message תיאור הפעולה שבוצעה
 * @returns הבטחה שמתממשת לאחר רישום הפעולה
 */
export async function updateBuildTracking(message: string): Promise<void> {
  try {
    // פורמט התאריך
    const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
    const logEntry = `[${timestamp}] ${message}`;
    
    // רישום ללוג
    console.log(`[Build Tracking] ${logEntry}`);
    
    // אם נרצה לשלוח את המידע לשרת בעתיד, נוכל להוסיף כאן קוד שמבצע בקשת API
    // לדוגמה:
    // if (typeof window !== 'undefined') {
    //   try {
    //     await fetch('/api/log-tracking', {
    //       method: 'POST',
    //       headers: { 'Content-Type': 'application/json' },
    //       body: JSON.stringify({ message: logEntry })
    //     });
    //   } catch (fetchError) {
    //     console.error('שגיאה בשליחת נתוני מעקב לשרת:', fetchError);
    //   }
    // }
  } catch (error) {
    console.error('שגיאה בעדכון מעקב הבנייה:', error);
  }
} 