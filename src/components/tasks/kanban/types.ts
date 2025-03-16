import { Task, Stage, Project } from '@/types/supabase';

// טיפוסים משותפים לקומפוננטות הקנבן
export interface TaskKanbanProps {
  tasks: Task[];
  stages?: Stage[];
  projects?: Project[];
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
  onStatusChange?: (taskId: string, status: string) => void;
  onStageChange?: (taskId: string, stageId: string) => void;
}

// טיפוס לעמודת קנבן
export interface KanbanColumnProps {
  id: string;
  title: string;
  tasks: Task[];
  color: string;
  isCollapsed: boolean;
  isDragOver: boolean;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onToggleCollapse: () => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
  getProjectName: (projectId: string) => string;
}

// טיפוס לכרטיס משימה
export interface TaskCardProps {
  task: Task;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, task: Task) => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
  getProjectName: (projectId: string) => string;
}

// טיפוס לכותרת הקנבן
export interface TaskKanbanHeaderProps {
  viewMode: 'status' | 'stage' | 'category';
  setViewMode: (mode: 'status' | 'stage' | 'category') => void;
  hasStages: boolean;
}

// טיפוס למידע על תאריך יעד
export interface DueStatus {
  status: 'overdue' | 'today' | 'tomorrow' | 'soon' | 'future' | 'invalid';
  text: string;
  color: string;
}

// מיפוי סטטוסים לתצוגה בעברית
export const statusLabels: Record<string, string> = {
  'todo': 'לביצוע',
  'in_progress': 'בתהליך',
  'review': 'בבדיקה',
  'done': 'הושלם'
};

// הגדרת הסטטוסים האפשריים
export const statuses = ['todo', 'in_progress', 'review', 'done']; 