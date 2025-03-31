export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      entrepreneurs: {
        Row: {
          id: string
          name: string
          description: string | null
          contact_info: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          contact_info?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          contact_info?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          name: string
          description: string | null
          entrepreneur_id: string | null
          status: string | null
          priority: string | null
          department: string | null
          responsible: string | null
          total_budget: number | null
          planned_start_date: string | null
          planned_end_date: string | null
          actual_start_date: string | null
          actual_end_date: string | null
          progress: number | null
          created_at: string | null
          updated_at: string | null
          owner: Json | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          entrepreneur_id?: string | null
          status?: string | null
          priority?: string | null
          department?: string | null
          responsible?: string | null
          total_budget?: number | null
          planned_start_date?: string | null
          planned_end_date?: string | null
          actual_start_date?: string | null
          actual_end_date?: string | null
          progress?: number | null
          created_at?: string | null
          updated_at?: string | null
          owner?: Json | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          entrepreneur_id?: string | null
          status?: string | null
          priority?: string | null
          department?: string | null
          responsible?: string | null
          total_budget?: number | null
          planned_start_date?: string | null
          planned_end_date?: string | null
          actual_start_date?: string | null
          actual_end_date?: string | null
          progress?: number | null
          created_at?: string | null
          updated_at?: string | null
          owner?: Json | null
        }
      }
      stages: {
        Row: {
          id: string
          title: string
          description: string | null
          created_at: string
          updated_at: string
          project_id: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          created_at?: string
          updated_at?: string
          project_id: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          created_at?: string
          updated_at?: string
          project_id?: string
        }
      }
      tasks: {
        Row: {
          id: string
          project_id: string
          stage_id: string | null
          title: string
          description: string | null
          category: string | null
          status: string
          priority: string
          responsible: string | null
          estimated_hours: number | null
          actual_hours: number | null
          start_date: string | null
          due_date: string | null
          completed_date: string | null
          budget: number | null
          dependencies: string[] | null
          assignees_info: string[] | null
          watchers: string[] | null
          labels: string[] | null
          deleted: boolean
          created_at: string
          updated_at: string
          hierarchical_number: string | null
          parent_task_id: string | null
          is_template: boolean | null
          is_global_template: boolean | null
          original_task_id: string | null
        }
        Insert: {
          id?: string
          project_id: string | null
          stage_id?: string | null
          title: string
          description?: string | null
          category?: string | null
          status?: string
          priority?: string
          responsible?: string | null
          estimated_hours?: number | null
          actual_hours?: number | null
          start_date?: string | null
          due_date?: string | null
          completed_date?: string | null
          budget?: number | null
          dependencies?: string[] | null
          assignees_info?: string[] | null
          watchers?: string[] | null
          labels?: string[] | null
          deleted?: boolean
          created_at?: string
          updated_at?: string
          hierarchical_number?: string | null
          parent_task_id?: string | null
          is_template?: boolean | null
          is_global_template?: boolean | null
          original_task_id?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          stage_id?: string | null
          title?: string
          description?: string | null
          category?: string | null
          status?: string
          priority?: string
          responsible?: string | null
          estimated_hours?: number | null
          actual_hours?: number | null
          start_date?: string | null
          due_date?: string | null
          completed_date?: string | null
          budget?: number | null
          dependencies?: string[] | null
          assignees_info?: string[] | null
          watchers?: string[] | null
          labels?: string[] | null
          deleted?: boolean
          created_at?: string
          updated_at?: string
          hierarchical_number?: string | null
          parent_task_id?: string | null
          is_template?: boolean | null
          is_global_template?: boolean | null
          original_task_id?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// טיפוסים נוספים למערכת
export type Entrepreneur = Database['public']['Tables']['entrepreneurs']['Row']
export type NewEntrepreneur = Database['public']['Tables']['entrepreneurs']['Insert']
export type UpdateEntrepreneur = Database['public']['Tables']['entrepreneurs']['Update']

export type Project = Database['public']['Tables']['projects']['Row']
export type NewProject = Database['public']['Tables']['projects']['Insert']
export type UpdateProject = Database['public']['Tables']['projects']['Update']

export type Stage = Database['public']['Tables']['stages']['Row'] 
export type NewStage = Database['public']['Tables']['stages']['Insert']
export type UpdateStage = Database['public']['Tables']['stages']['Update']

// הגדרת הטיפוסים הבסיסיים מהדאטאבייס
export type Task = Database['public']['Tables']['tasks']['Row'] & {
  // הוספת שדה assignees לתאימות לאחור שיהיה זהה ל-assignees_info
  assignees?: string[] | null;
}
export type NewTask = Database['public']['Tables']['tasks']['Insert'] & {
  // הוספת שדה assignees לתאימות לאחור שיהיה זהה ל-assignees_info
  assignees?: string[] | null;
}
export type UpdateTask = Database['public']['Tables']['tasks']['Update'] & {
  // הוספת שדה assignees לתאימות לאחור שיהיה זהה ל-assignees_info
  assignees?: string[] | null;
}

// טיפוס מורחב של Task שכולל גם את תתי-המשימות
export interface TaskWithChildren extends Task {
  children?: TaskWithChildren[];
} 

// טיפוס מורחב של Task שכולל שדות נוספים שאינם בסכמה המקורית
export interface ExtendedTask extends Task {
  dropbox_folder?: string;
  tags?: string[] | null;
  reminder_days?: number | null;
}

// טיפוסים להוספה ועדכון משימות עם שדות מורחבים
export interface ExtendedNewTask extends NewTask {
  dropbox_folder?: string;
  tags?: string[] | null;
  reminder_days?: number | null;
}

export interface ExtendedUpdateTask extends UpdateTask {
  dropbox_folder?: string;
  tags?: string[] | null;
  reminder_days?: number | null;
} 