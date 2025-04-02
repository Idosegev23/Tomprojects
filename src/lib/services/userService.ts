import supabase from '../supabase';
import { User } from '@supabase/supabase-js';

export interface UserInfo {
  id: string;
  email: string;
  fullName?: string;
  avatar_url?: string;
}

// משתמשי דמו קבועים
const DEMO_USERS: UserInfo[] = [
  { id: '1', email: 'yossi@example.com', fullName: 'יוסי כהן' },
  { id: '2', email: 'moshe@example.com', fullName: 'משה לוי' },
  { id: '3', email: 'david@example.com', fullName: 'דוד ישראלי' },
  { id: '4', email: 'sara@example.com', fullName: 'שרה גולן' },
  { id: '5', email: 'michal@example.com', fullName: 'מיכל רון' },
];

// משתנה להגדרה אם להשתמש בדמו
let USE_DEMO_MODE = false;

export const userService = {
  // קבלת המשתמש הנוכחי
  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },
  
  // קבלת מידע על המשתמש הנוכחי בפורמט מתאים
  async getCurrentUserInfo(): Promise<UserInfo | null> {
    try {
      const user = await this.getCurrentUser();
      if (!user) return null;
      
      return {
        id: user.id,
        email: user.email || '',
        fullName: user.user_metadata?.fullName as string || user.user_metadata?.full_name as string || user.email?.split('@')[0] || '',
        avatar_url: user.user_metadata?.avatar_url as string || ''
      };
    } catch (error) {
      console.error('שגיאה בקבלת מידע על המשתמש הנוכחי:', error);
      return null;
    }
  },
  
  // קבלת רשימת כל המשתמשים במערכת דרך API
  async getAllUsers(): Promise<UserInfo[]> {
    // אם הוגדר להשתמש ישירות בדמו
    if (USE_DEMO_MODE) {
      console.log('משתמש ישירות בנתוני דמו (מצב מוגדר מראש)');
      const currentUser = await this.getCurrentUserInfo();
      if (currentUser && !DEMO_USERS.some(user => user.id === currentUser.id || user.email === currentUser.email)) {
        return [...DEMO_USERS, currentUser];
      }
      return DEMO_USERS;
    }
    
    try {
      // קריאה ל-API לקבלת רשימת המשתמשים
      const response = await fetch('/api/users');
      
      if (!response.ok) {
        throw new Error(`שגיאת API: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // המרת הנתונים לפורמט הנכון
      const users: UserInfo[] = data.map((user: any) => ({
        id: user.id,
        email: user.email || '',
        fullName: user.user_metadata?.fullName || user.user_metadata?.full_name || user.email?.split('@')[0] || '',
        avatar_url: user.user_metadata?.avatar_url || ''
      }));
      
      // הוספת המשתמש הנוכחי לרשימה אם הוא לא כבר נמצא בה
      const currentUser = await this.getCurrentUserInfo();
      if (currentUser && !users.some(user => user.id === currentUser.id || user.email === currentUser.email)) {
        users.push(currentUser);
      }
      
      return users;
    } catch (error) {
      console.error('שגיאה בקבלת רשימת המשתמשים:', error);
      
      // מפעיל את מצב הדמו לשימוש עתידי
      USE_DEMO_MODE = true;
      console.log('משתמש בנתוני דמו כגיבוי ומפעיל מצב דמו קבוע');
      
      // הוספת המשתמש הנוכחי לרשימה אם הוא לא כבר נמצא בה
      const currentUser = await this.getCurrentUserInfo();
      if (currentUser && !DEMO_USERS.some(user => user.id === currentUser.id || user.email === currentUser.email)) {
        return [...DEMO_USERS, currentUser];
      }
      
      return DEMO_USERS;
    }
  },
  
  // קבלת מידע על משתמש לפי ID
  async getUserById(userId: string): Promise<UserInfo | null> {
    // אם הוגדר להשתמש ישירות בדמו
    if (USE_DEMO_MODE) {
      console.log(`משתמש ישירות בנתוני דמו לחיפוש משתמש לפי ID ${userId}`);
      return DEMO_USERS.find(user => user.id === userId) || null;
    }
    
    try {
      // ניסיון לקבל מידע על המשתמש דרך API
      const response = await fetch(`/api/users/${userId}`);
      
      if (!response.ok) {
        console.warn(`שגיאה בקבלת משתמש לפי ID ${userId} מה-API, מנסה לחפש ברשימה מקומית`);
        // אם לא מצליח, ננסה למצוא את המשתמש מתוך רשימת כל המשתמשים
        const users = await this.getAllUsers();
        return users.find(user => user.id === userId) || null;
      }
      
      const userData = await response.json();
      
      return {
        id: userData.id,
        email: userData.email || '',
        fullName: userData.user_metadata?.fullName || userData.user_metadata?.full_name || userData.email?.split('@')[0] || '',
        avatar_url: userData.user_metadata?.avatar_url || ''
      };
    } catch (error) {
      console.error(`שגיאה בקבלת מידע על משתמש לפי ID ${userId}:`, error);
      
      // אם יש שגיאה, ננסה למצוא את המשתמש ברשימת כל המשתמשים
      console.log('מחפש משתמש בנתוני דמו');
      const demoUser = DEMO_USERS.find(user => user.id === userId);
      if (demoUser) return demoUser;
      
      // אם לא נמצא בדמו, ננסה למצוא את המשתמש ברשימת כל המשתמשים
      const users = await this.getAllUsers();
      return users.find(user => user.id === userId) || null;
    }
  },
  
  // קבלת מידע על משתמש לפי אימייל
  async getUserByEmail(email: string): Promise<UserInfo | null> {
    // אם הוגדר להשתמש ישירות בדמו
    if (USE_DEMO_MODE) {
      console.log(`משתמש ישירות בנתוני דמו לחיפוש משתמש לפי אימייל ${email}`);
      return DEMO_USERS.find(user => user.email.toLowerCase() === email.toLowerCase()) || null;
    }
    
    try {
      // ניסיון לקבל מידע על המשתמש דרך API
      const response = await fetch(`/api/users/by-email?email=${encodeURIComponent(email)}`);
      
      if (!response.ok) {
        console.warn(`שגיאה בקבלת משתמש לפי אימייל ${email} מה-API, מנסה לחפש ברשימה מקומית`);
        // אם לא מצליח, ננסה למצוא את המשתמש מתוך רשימת כל המשתמשים
        const users = await this.getAllUsers();
        return users.find(user => user.email.toLowerCase() === email.toLowerCase()) || null;
      }
      
      const userData = await response.json();
      
      return {
        id: userData.id,
        email: userData.email || '',
        fullName: userData.user_metadata?.fullName || userData.user_metadata?.full_name || userData.email?.split('@')[0] || '',
        avatar_url: userData.user_metadata?.avatar_url || ''
      };
    } catch (error) {
      console.error(`שגיאה בקבלת מידע על משתמש לפי אימייל ${email}:`, error);
      
      // אם יש שגיאה, ננסה למצוא את המשתמש בנתוני הדמו
      console.log('מחפש משתמש בנתוני דמו');
      const demoUser = DEMO_USERS.find(user => user.email.toLowerCase() === email.toLowerCase());
      if (demoUser) return demoUser;
      
      // אם לא נמצא בדמו, ננסה למצוא את המשתמש ברשימת כל המשתמשים
      const users = await this.getAllUsers();
      return users.find(user => user.email.toLowerCase() === email.toLowerCase()) || null;
    }
  },
  
  // חיפוש משתמשים לפי טקסט חיפוש (בשם או באימייל)
  async searchUsers(searchTerm: string): Promise<UserInfo[]> {
    if (!searchTerm) return [];
    
    // אם הוגדר להשתמש ישירות בדמו
    if (USE_DEMO_MODE) {
      console.log(`משתמש ישירות בנתוני דמו לחיפוש משתמשים לפי "${searchTerm}"`);
      const lowercaseSearch = searchTerm.toLowerCase();
      return DEMO_USERS.filter(user => 
        user.email.toLowerCase().includes(lowercaseSearch) || 
        (user.fullName && user.fullName.toLowerCase().includes(lowercaseSearch))
      );
    }
    
    try {
      // ניסיון לחפש משתמשים דרך API
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchTerm)}`);
      
      if (!response.ok) {
        throw new Error(`שגיאת API בחיפוש משתמשים: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // המרת הנתונים לפורמט הנכון
      return data.map((user: any) => ({
        id: user.id,
        email: user.email || '',
        fullName: user.user_metadata?.fullName || user.user_metadata?.full_name || user.email?.split('@')[0] || '',
        avatar_url: user.user_metadata?.avatar_url || ''
      }));
    } catch (error) {
      console.error(`שגיאה בחיפוש משתמשים עם המונח "${searchTerm}":`, error);
      
      // אם יש שגיאה, נחפש ברשימת כל המשתמשים
      const users = await this.getAllUsers();
      const lowercaseSearch = searchTerm.toLowerCase();
      
      return users.filter(user => 
        user.email.toLowerCase().includes(lowercaseSearch) || 
        (user.fullName && user.fullName.toLowerCase().includes(lowercaseSearch))
      );
    }
  }
};

export default userService; 