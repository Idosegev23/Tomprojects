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
          status: string
          priority: string
          department: string | null
          responsible: string | null
          total_budget: number | null
          planned_start_date: string | null
          planned_end_date: string | null
          actual_start_date: string | null
          actual_end_date: string | null
          progress: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          entrepreneur_id?: string | null
          status?: string
          priority?: string
          department?: string | null
          responsible?: string | null
          total_budget?: number | null
          planned_start_date?: string | null
          planned_end_date?: string | null
          actual_start_date?: string | null
          actual_end_date?: string | null
          progress?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          entrepreneur_id?: string | null
          status?: string
          priority?: string
          department?: string | null
          responsible?: string | null
          total_budget?: number | null
          planned_start_date?: string | null
          planned_end_date?: string | null
          actual_start_date?: string | null
          actual_end_date?: string | null
          progress?: number
          created_at?: string
          updated_at?: string
        }
      }
      milestones: {
        Row: {
          id: string
          title: string
          description: string | null
          project_id: string
          status: string
          priority: string
          department: string | null
          responsible: string | null
          planned_start_date: string | null
          planned_end_date: string | null
          actual_start_date: string | null
          actual_end_date: string | null
          reminder_date: string | null
          created_at: string
          updated_at: string
          sort_order: number | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          project_id: string
          status?: string
          priority?: string
          department?: string | null
          responsible?: string | null
          planned_start_date?: string | null
          planned_end_date?: string | null
          actual_start_date?: string | null
          actual_end_date?: string | null
          reminder_date?: string | null
          created_at?: string
          updated_at?: string
          sort_order?: number | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          project_id?: string
          status?: string
          priority?: string
          department?: string | null
          responsible?: string | null
          planned_start_date?: string | null
          planned_end_date?: string | null
          actual_start_date?: string | null
          actual_end_date?: string | null
          reminder_date?: string | null
          created_at?: string
          updated_at?: string
          sort_order?: number | null
        }
      }
      milestone_templates: {
        Row: {
          id: string
          title: string
          description: string | null
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          sort_order: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          title: string
          description: string | null
          project_id: string
          milestone_id: string | null
          parent_task_id: string | null
          hierarchical_number: string | null
          task_level: number
          is_planned: boolean
          status: string
          priority: string
          category: string | null
          tag: string | null
          department: string | null
          responsible: string | null
          estimated_hours: number | null
          actual_hours: number | null
          planned_start_date: string | null
          planned_end_date: string | null
          actual_start_date: string | null
          actual_end_date: string | null
          completed_date: string | null
          reminder_date: string | null
          budget: number | null
          deleted: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          project_id: string
          milestone_id?: string | null
          parent_task_id?: string | null
          hierarchical_number?: string | null
          task_level?: number
          is_planned?: boolean
          status?: string
          priority?: string
          category?: string | null
          tag?: string | null
          department?: string | null
          responsible?: string | null
          estimated_hours?: number | null
          actual_hours?: number | null
          planned_start_date?: string | null
          planned_end_date?: string | null
          actual_start_date?: string | null
          actual_end_date?: string | null
          completed_date?: string | null
          reminder_date?: string | null
          budget?: number | null
          deleted?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          project_id?: string
          milestone_id?: string | null
          parent_task_id?: string | null
          hierarchical_number?: string | null
          task_level?: number
          is_planned?: boolean
          status?: string
          priority?: string
          category?: string | null
          tag?: string | null
          department?: string | null
          responsible?: string | null
          estimated_hours?: number | null
          actual_hours?: number | null
          planned_start_date?: string | null
          planned_end_date?: string | null
          actual_start_date?: string | null
          actual_end_date?: string | null
          completed_date?: string | null
          reminder_date?: string | null
          budget?: number | null
          deleted?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_default_milestones_for_project: {
        Args: {
          project_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

export type Entrepreneur = Database['public']['Tables']['entrepreneurs']['Row']
export type NewEntrepreneur = Database['public']['Tables']['entrepreneurs']['Insert']
export type UpdateEntrepreneur = Database['public']['Tables']['entrepreneurs']['Update']

export type Project = Database['public']['Tables']['projects']['Row']
export type NewProject = Database['public']['Tables']['projects']['Insert']
export type UpdateProject = Database['public']['Tables']['projects']['Update']

export type Milestone = Database['public']['Tables']['milestones']['Row']
export type NewMilestone = Database['public']['Tables']['milestones']['Insert']
export type UpdateMilestone = Database['public']['Tables']['milestones']['Update']

export type MilestoneTemplate = Database['public']['Tables']['milestone_templates']['Row']
export type NewMilestoneTemplate = Database['public']['Tables']['milestone_templates']['Insert']
export type UpdateMilestoneTemplate = Database['public']['Tables']['milestone_templates']['Update']

export type Task = Database['public']['Tables']['tasks']['Row']
export type NewTask = Database['public']['Tables']['tasks']['Insert']
export type UpdateTask = Database['public']['Tables']['tasks']['Update']

export interface TaskWithChildren extends Task {
  children?: TaskWithChildren[]
} 