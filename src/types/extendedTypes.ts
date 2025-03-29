import { Stage, Task, Project } from './supabase';

// טיפוס שמרחיב את Stage כדי לכלול שדות נוספים שנדרשים בממשק
export interface ExtendedStage extends Stage {
  status?: string;
  start_date?: string;
  end_date?: string;
  color?: string;
  order?: number;
  sort_order?: number;
  hierarchical_number?: string;
  progress?: number;
}

// טיפוס שמרחיב את Task כדי לכלול שדות נוספים
export interface ExtendedTask extends Task {
  dropbox_folder?: string;
  tags?: string[] | null;
  reminder_days?: number | null;
  // הערה: assignees כבר קיים ב-Task המקורי
}

// טיפוס שמותאם למשימה עם ילדים
export interface TaskWithChildren extends Task {
  children: TaskWithChildren[];
}

// טיפוס שמתאים למודל של שלב עם משימות
export interface StageWithTasks extends ExtendedStage {
  tasks: Task[];
  project?: Project;
  completed_tasks?: number;
  total_tasks?: number;
  progress?: number;
} 