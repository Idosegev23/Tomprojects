import supabase from '../supabase';
import { User } from '@supabase/supabase-js';

export const authService = {
  // קבלת המשתמש הנוכחי
  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },
  
  // התחברות עם אימייל וסיסמה
  async signInWithEmail(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('Error signing in:', error);
      throw new Error(error.message);
    }
    
    return data;
  },
  
  // הרשמה עם אימייל וסיסמה
  async signUpWithEmail(email: string, password: string, userData?: { fullName?: string }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData
      }
    });
    
    if (error) {
      console.error('Error signing up:', error);
      throw new Error(error.message);
    }
    
    return data;
  },
  
  // התנתקות
  async signOut() {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Error signing out:', error);
      throw new Error(error.message);
    }
    
    return true;
  },
  
  // בדיקה אם משתמש מחובר
  async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return !!user;
  },
  
  // איפוס סיסמה
  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    
    if (error) {
      console.error('Error resetting password:', error);
      throw new Error(error.message);
    }
    
    return true;
  },
  
  // עדכון סיסמה
  async updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password });
    
    if (error) {
      console.error('Error updating password:', error);
      throw new Error(error.message);
    }
    
    return true;
  },
  
  // האזנה לשינויים במצב האימות
  onAuthStateChange(callback: (user: User | null) => void) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        callback(session?.user || null);
      }
    );
    
    return subscription;
  }
};

export default authService; 