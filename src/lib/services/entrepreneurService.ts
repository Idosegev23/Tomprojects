import supabase from '../supabase';
import { Entrepreneur, NewEntrepreneur, UpdateEntrepreneur } from '@/types/supabase';

export const entrepreneurService = {
  // קבלת כל היזמים
  async getEntrepreneurs(): Promise<Entrepreneur[]> {
    const { data, error } = await supabase
      .from('entrepreneurs')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      console.error('Error fetching entrepreneurs:', error);
      throw new Error(error.message);
    }
    
    return data || [];
  },
  
  // קבלת יזם לפי מזהה
  async getEntrepreneurById(id: string): Promise<Entrepreneur | null> {
    const { data, error } = await supabase
      .from('entrepreneurs')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`Error fetching entrepreneur with id ${id}:`, error);
      throw new Error(error.message);
    }
    
    return data;
  },
  
  // הוספת יזם חדש
  async createEntrepreneur(entrepreneur: NewEntrepreneur): Promise<Entrepreneur> {
    const { data, error } = await supabase
      .from('entrepreneurs')
      .insert(entrepreneur)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating entrepreneur:', error);
      throw new Error(error.message);
    }
    
    return data;
  },
  
  // עדכון יזם קיים
  async updateEntrepreneur(id: string, entrepreneur: UpdateEntrepreneur): Promise<Entrepreneur> {
    const { data, error } = await supabase
      .from('entrepreneurs')
      .update(entrepreneur)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error(`Error updating entrepreneur with id ${id}:`, error);
      throw new Error(error.message);
    }
    
    return data;
  },
  
  // מחיקת יזם
  async deleteEntrepreneur(id: string): Promise<void> {
    const { error } = await supabase
      .from('entrepreneurs')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error(`Error deleting entrepreneur with id ${id}:`, error);
      throw new Error(error.message);
    }
  },
  
  // קבלת פרויקטים של יזם
  async getEntrepreneurProjects(entrepreneurId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('entrepreneur_id', entrepreneurId);
    
    if (error) {
      console.error(`Error fetching projects for entrepreneur ${entrepreneurId}:`, error);
      throw new Error(error.message);
    }
    
    return data || [];
  },
  
  // קבלת יזם לפי שם
  async getEntrepreneurByName(name: string): Promise<Entrepreneur | null> {
    const { data, error } = await supabase
      .from('entrepreneurs')
      .select('*')
      .eq('name', name)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = לא נמצאו תוצאות
      console.error(`Error fetching entrepreneur with name ${name}:`, error);
      throw new Error(error.message);
    }
    
    return data || null;
  },
  
  // הוספת יזם חדש או קבלת קיים לפי שם
  async getOrCreateEntrepreneurByName(name: string): Promise<Entrepreneur> {
    // בדיקה אם היזם כבר קיים
    const existingEntrepreneur = await this.getEntrepreneurByName(name);
    
    if (existingEntrepreneur) {
      return existingEntrepreneur;
    }
    
    // יצירת יזם חדש אם לא קיים
    return this.createEntrepreneur({ name });
  }
};

export default entrepreneurService; 