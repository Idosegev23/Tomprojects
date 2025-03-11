import { useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import authService from '@/lib/services/authService';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // טעינת משתמש נוכחי
  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true);
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch (err) {
        console.error('Error loading user:', err);
        setError(err instanceof Error ? err.message : 'שגיאה בטעינת המשתמש');
      } finally {
        setLoading(false);
      }
    };
    
    // האזנה לשינויים במצב האימות
    const subscription = authService.onAuthStateChange((authUser) => {
      setUser(authUser);
      setLoading(false);
    });
    
    loadUser();
    
    // ניקוי בעת עזיבת הקומפוננטה
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  // התחברות עם אימייל וסיסמה
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      const { user } = await authService.signInWithEmail(email, password);
      setUser(user);
      return user;
    } catch (err) {
      console.error('Sign in error:', err);
      setError(err instanceof Error ? err.message : 'שגיאה בהתחברות');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  // הרשמה עם אימייל וסיסמה
  const signUp = useCallback(async (email: string, password: string, userData?: { fullName?: string }) => {
    try {
      setLoading(true);
      setError(null);
      const { user } = await authService.signUpWithEmail(email, password, userData);
      setUser(user);
      return user;
    } catch (err) {
      console.error('Sign up error:', err);
      setError(err instanceof Error ? err.message : 'שגיאה בהרשמה');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  // התנתקות
  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await authService.signOut();
      setUser(null);
    } catch (err) {
      console.error('Sign out error:', err);
      setError(err instanceof Error ? err.message : 'שגיאה בהתנתקות');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  // איפוס סיסמה
  const resetPassword = useCallback(async (email: string) => {
    try {
      setLoading(true);
      setError(null);
      await authService.resetPassword(email);
    } catch (err) {
      console.error('Reset password error:', err);
      setError(err instanceof Error ? err.message : 'שגיאה באיפוס הסיסמה');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  // עדכון סיסמה
  const updatePassword = useCallback(async (password: string) => {
    try {
      setLoading(true);
      setError(null);
      await authService.updatePassword(password);
    } catch (err) {
      console.error('Update password error:', err);
      setError(err instanceof Error ? err.message : 'שגיאה בעדכון הסיסמה');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  return {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    isAuthenticated: !!user
  };
};

export default useAuth; 