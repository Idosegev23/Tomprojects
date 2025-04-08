import React from 'react';
import TaskListNew from './tasklist/TaskListNew';
import { Task } from '@/types/supabase';

interface TaskListProps {
  projectId: string;
  tasks?: Task[];
  onTaskCreated?: (task: Task) => void;
  onTaskUpdated?: (task: Task) => void;
  onTaskDeleted?: (taskId: string) => void;
}

const TaskList: React.FC<TaskListProps> = (props) => {
  return <TaskListNew {...props} />;
};

export default TaskList; 