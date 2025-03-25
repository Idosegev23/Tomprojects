import { Stage, Task, Project } from './supabase';

// טיפוס שמרחיב את Stage כדי לכלול שדות נוספים שנדרשים בממשק
export interface ExtendedStage extends Stage {
  status?: string;
  start_date?: string;
  end_date?: string;
  color?: string;
  order?: number;
}

// טיפוס שמרחיב את Task כדי לכלול שדות נוספים
export interface ExtendedTask extends Task {
  dropbox_folder?: string;
  // ללא שינוי של hierarchical_number, הוא קיים כבר ב-Task המקורי כ-string | null
}

// טיפוס שמתאים למודל של שלב עם משימות
export interface StageWithTasks extends ExtendedStage {
  tasks: Task[];
  project?: Project;
  completed_tasks?: number;
  total_tasks?: number;
  progress?: number;
} 