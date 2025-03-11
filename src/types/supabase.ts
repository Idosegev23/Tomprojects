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
      projects: {
        Row: {
          id: string
          name: string
          owner: string | null
          created_at: string
          updated_at: string
          status: string
          total_budget: number | null
          planned_start_date: string | null
          planned_end_date: string | null
          actual_start_date: string | null
          actual_end_date: string | null
          project_manager_id: string | null
          priority: string
          progress: number
        }
        Insert: {
          id?: string
          name: string
          owner?: string | null
          created_at?: string
          updated_at?: string
          status?: string
          total_budget?: number | null
          planned_start_date?: string | null
          planned_end_date?: string | null
          actual_start_date?: string | null
          actual_end_date?: string | null
          project_manager_id?: string | null
          priority?: string
          progress?: number
        }
        Update: {
          id?: string
          name?: string
          owner?: string | null
          created_at?: string
          updated_at?: string
          status?: string
          total_budget?: number | null
          planned_start_date?: string | null
          planned_end_date?: string | null
          actual_start_date?: string | null
          actual_end_date?: string | null
          project_manager_id?: string | null
          priority?: string
          progress?: number
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
          assignees: string[] | null
          watchers: string[] | null
          labels: string[] | null
          deleted: boolean
          created_at: string
          updated_at: string
          hierarchical_number: string | null
          parent_task_id: string | null
        }
        Insert: {
          id?: string
          project_id: string
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
          assignees?: string[] | null
          watchers?: string[] | null
          labels?: string[] | null
          deleted?: boolean
          created_at?: string
          updated_at?: string
          hierarchical_number?: string | null
          parent_task_id?: string | null
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
          assignees?: string[] | null
          watchers?: string[] | null
          labels?: string[] | null
          deleted?: boolean
          created_at?: string
          updated_at?: string
          hierarchical_number?: string | null
          parent_task_id?: string | null
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
export type Project = Database['public']['Tables']['projects']['Row']
export type NewProject = Database['public']['Tables']['projects']['Insert']
export type UpdateProject = Database['public']['Tables']['projects']['Update']

export type Stage = Database['public']['Tables']['stages']['Row'] 
export type NewStage = Database['public']['Tables']['stages']['Insert']
export type UpdateStage = Database['public']['Tables']['stages']['Update']

export type Task = Database['public']['Tables']['tasks']['Row']
export type NewTask = Database['public']['Tables']['tasks']['Insert'] 
export type UpdateTask = Database['public']['Tables']['tasks']['Update'] 