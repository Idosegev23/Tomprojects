import React from 'react';
import { VStack, Divider, Card, CardBody, Text, Button, Flex, useColorModeValue } from '@chakra-ui/react';
import { FiPlus, FiRefreshCw } from 'react-icons/fi';
import { Task } from '@/types/supabase';
import { TaskWithStage } from './useTaskList';
import TaskTableHeader from './TaskTableHeader';
import TaskRow from './TaskRow';

interface TaskTableProps {
  tasks: TaskWithStage[];
  selectedTasks: string[];
  onTaskSelection: (taskId: string, isSelected: boolean) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => Promise<void>;
  onSelectAll: (isSelected: boolean) => void;
  onCreateTask: () => void;
  onRefresh: () => Promise<void>;
  getParentTask: (taskId: string | null) => Task | undefined;
  isLoading: boolean;
}

const TaskTable: React.FC<TaskTableProps> = ({
  tasks,
  selectedTasks,
  onTaskSelection,
  onEditTask,
  onDeleteTask,
  onSelectAll,
  onCreateTask,
  onRefresh,
  getParentTask,
  isLoading
}) => {
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const hoverBgColor = useColorModeValue('gray.50', 'gray.700');
  
  if (tasks.length === 0) {
    return (
      <Card variant="outline" p={8} textAlign="center" boxShadow="md">
        <CardBody>
          <Text mb={4} fontSize="lg">אין משימות להצגה</Text>
          <VStack spacing={4}>
            <Button
              leftIcon={<FiPlus />}
              colorScheme="blue"
              onClick={onCreateTask}
              size="md"
            >
              צור משימה חדשה
            </Button>
            
            <Button
              leftIcon={<FiRefreshCw />}
              colorScheme="teal"
              variant="outline"
              onClick={onRefresh}
              isLoading={isLoading}
              size="md"
            >
              סנכרן נתוני פרויקט
            </Button>
            
            <Text fontSize="sm" color="gray.500" maxW="400px" mt={2}>
              אם לא מופיעות משימות, יתכן שצריך לסנכרן את נתוני הפרויקט כדי לטעון את המשימות מטבלת המשימות הספציפית של הפרויקט.
            </Text>
          </VStack>
        </CardBody>
      </Card>
    );
  }
  
  return (
    <Card variant="outline" boxShadow="sm">
      <CardBody p={0}>
        <TaskTableHeader 
          isAllSelected={selectedTasks.length === tasks.length && tasks.length > 0}
          onSelectAll={onSelectAll}
        />
        
        <VStack spacing={0} align="stretch" divider={<Divider />}>
          {tasks.map(task => (
            <TaskRow
              key={task.id}
              task={task}
              isSelected={selectedTasks.includes(task.id)}
              borderColor={borderColor}
              hoverBgColor={hoverBgColor}
              onSelect={onTaskSelection}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
              getParentTask={getParentTask}
            />
          ))}
        </VStack>
      </CardBody>
    </Card>
  );
};

export default TaskTable; 