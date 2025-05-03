import React, { useState, useEffect } from 'react';
import {
  Box,
  SimpleGrid,
  Heading,
  VStack,
  Flex,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  useToast,
  Text
} from '@chakra-ui/react';
import { AddIcon } from '@chakra-ui/icons';

import KanbanColumn from './kanban/KanbanColumn';
import TaskCard from './kanban/TaskCard';
import TaskEditModal from './TaskEditModal';
import { Task } from './kanban/types';
import taskService from '@/lib/services/taskService';

interface TaskKanbanProps {
  projectId: string;
  tasks: Task[];
  onTaskUpdated: (task: Task) => void;
  onTaskDeleted: (taskId: string) => void;
  getProjectName?: () => string;
  onStatusChange?: (taskId: string, status: string) => void;
}

const TaskKanban: React.FC<TaskKanbanProps> = ({
  projectId,
  tasks,
  onTaskUpdated,
  onTaskDeleted,
  getProjectName,
  onStatusChange
}) => {
  const [taskColumns, setTaskColumns] = useState<Record<string, Task[]>>({
    'todo': [],
    'in_progress': [],
    'review': [],
    'done': []
  });
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const toast = useToast();

  // קטגוריות משימות לעברית
  const columnTitles: Record<string, string> = {
    'todo': 'לביצוע',
    'in_progress': 'בתהליך',
    'review': 'בבדיקה',
    'done': 'הושלם'
  };

  // ארגון משימות לפי סטטוס
  useEffect(() => {
    console.log('Organizing tasks into columns:', tasks);
    
    const columns: Record<string, Task[]> = {
      'todo': [],
      'in_progress': [],
      'review': [],
      'done': []
    };
    
    tasks.forEach(task => {
      const status = task.status?.toLowerCase() || 'todo';
      // המרת סטטוסים מעברית לאנגלית
      let normalizedStatus = status;
      
      if (status === 'לביצוע') normalizedStatus = 'todo';
      else if (status === 'בתהליך') normalizedStatus = 'in_progress';
      else if (status === 'בבדיקה') normalizedStatus = 'review';
      else if (status === 'הושלם') normalizedStatus = 'done';
      
      // אם הסטטוס לא קיים, נשים במצב 'לביצוע'
      if (!columns[normalizedStatus]) {
        console.warn(`Unknown status: ${status}, normalizedStatus: ${normalizedStatus}`);
        normalizedStatus = 'todo';
      }
      
      columns[normalizedStatus].push({
        ...task,
        status: normalizedStatus // שמירת הסטטוס המנורמל
      });
    });
    
    setTaskColumns(columns);
  }, [tasks]);

  // פתיחת מודל עריכת משימה
  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    onOpen();
  };

  // עדכון משימה
  const handleTaskUpdated = (updatedTask: Task) => {
    onTaskUpdated(updatedTask);
    onClose();
  };

  // שינוי סטטוס משימה
  const handleChangeStatus = async (taskId: string, newStatus: string) => {
    console.log(`TaskKanban: Changing task ${taskId} status to ${newStatus}`);
    
    try {
      // קריאה ל-callback שהועבר מהקומפוננטה האב
      if (onStatusChange) {
        console.log(`TaskKanban: Calling onStatusChange callback for task ${taskId} with status ${newStatus}`);
        onStatusChange(taskId, newStatus);
      } else {
        // אם אין callback, נעדכן ישירות
        console.log(`TaskKanban: Updating task status directly for task ${taskId} to ${newStatus}`);
        
        // נורמליזציה של הסטטוס
        let normalizedStatus = newStatus.toLowerCase();
        const validStatuses = ['todo', 'in_progress', 'review', 'done'];
        
        if (!validStatuses.includes(normalizedStatus)) {
          if (normalizedStatus === 'לביצוע') normalizedStatus = 'todo';
          else if (normalizedStatus === 'בתהליך') normalizedStatus = 'in_progress';
          else if (normalizedStatus === 'בבדיקה') normalizedStatus = 'review';
          else if (normalizedStatus === 'הושלם') normalizedStatus = 'done';
        }
        
        console.log(`TaskKanban: Normalized status for task ${taskId}: ${normalizedStatus}`);
        
        // עדכון הסטטוס בשרת
        const updatedTask = await taskService.updateTaskStatus(taskId, normalizedStatus);
        
        // וידוא שהעדכון ישתקף גם בטבלת הפרויקט
        await taskService.syncProjectTasks(projectId);
        
        onTaskUpdated(updatedTask);
        
        toast({
          title: 'סטטוס המשימה עודכן',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error updating task status:', error);
      
      toast({
        title: 'שגיאה בעדכון סטטוס המשימה',
        description: error instanceof Error ? error.message : 'אירעה שגיאה לא ידועה',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // יצירת משימה חדשה
  const handleCreateTask = (status: string) => {
    setSelectedTask({
      id: '',
      title: '',
      description: '',
      status,
      project_id: projectId,
      assignees_info: [],
      created_at: new Date().toISOString(),
      deleted: false,
      due_date: null,
      category: null,
      stage_id: null,
      priority: 'medium',
      hierarchical_number: null,
      parent_task_id: null,
      updated_at: new Date().toISOString()
    } as unknown as Task);
    onOpen();
  };

  // מחיקת משימה
  const handleDeleteTask = (taskId: string) => {
    onTaskDeleted(taskId);
  };

  return (
    <Box p={4}>
      <Flex justify="space-between" align="center" mb={4}>
        <Heading size="md">לוח קנבן {getProjectName && `עבור ${getProjectName()}`}</Heading>
        <Box>
          {/* כפתורים נוספים */}
        </Box>
      </Flex>
      
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
        {Object.keys(taskColumns).map(status => (
          <KanbanColumn
            key={status}
            title={columnTitles[status] || status}
            status={status}
            onAddTask={() => handleCreateTask(status)}
          >
            {taskColumns[status].length > 0 ? (
              <VStack spacing={2} align="stretch">
                {taskColumns[status].map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={() => handleEditTask(task)}
                    onDelete={() => handleDeleteTask(task.id)}
                    onChangeStatus={handleChangeStatus}
                  />
                ))}
              </VStack>
            ) : (
              <Box textAlign="center" p={4} color="gray.500">
                <Text mb={2}>אין משימות</Text>
                <Button
                  leftIcon={<AddIcon />}
                  size="sm"
                  colorScheme="blue"
                  variant="outline"
                  onClick={() => handleCreateTask(status)}
                >
                  הוסף משימה
                </Button>
              </Box>
            )}
          </KanbanColumn>
        ))}
      </SimpleGrid>
      
      {/* מודל עריכת משימה */}
      <TaskEditModal
        isOpen={isOpen}
        onClose={onClose}
        task={selectedTask}
        projectId={projectId}
        onTaskCreated={onTaskUpdated}
        onTaskUpdated={handleTaskUpdated}
      />
    </Box>
  );
};

export default TaskKanban; 