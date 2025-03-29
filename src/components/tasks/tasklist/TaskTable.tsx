import React, { useState, useMemo } from 'react';
import { VStack, Divider, Card, CardBody, Text, Button, Flex, useColorModeValue } from '@chakra-ui/react';
import { FiPlus, FiRefreshCw } from 'react-icons/fi';
import { Task } from '@/types/supabase';
import { TaskWithStage } from './useTaskList';
import TaskTableHeader, { SortField, SortDirection } from './TaskTableHeader';
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
  
  // הוספת state למיונים
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // טיפול בלחיצה על עמודה למיון
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // הפיכת כיוון המיון אם לוחצים שוב על אותה עמודה
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // קביעת עמודה חדשה למיון והתחלה עם מיון עולה
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // מיון המשימות לפי השדה והכיוון שנבחרו
  const sortedTasks = useMemo(() => {
    if (!sortField) return tasks;
    
    return [...tasks].sort((a, b) => {
      let comparison = 0;
      
      // מיון לפי השדה שנבחר
      switch (sortField) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'hierarchical_number':
          if (a.hierarchical_number && b.hierarchical_number) {
            comparison = a.hierarchical_number.localeCompare(b.hierarchical_number);
          } else if (a.hierarchical_number) {
            comparison = -1;
          } else if (b.hierarchical_number) {
            comparison = 1;
          }
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'priority':
          // מיון מיוחד לפי עדיפות (גבוהה, בינונית, נמוכה)
          const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
          const aValue = priorityOrder[a.priority.toLowerCase()] ?? 3;
          const bValue = priorityOrder[b.priority.toLowerCase()] ?? 3;
          comparison = aValue - bValue;
          break;
        case 'responsible':
          const aResponsible = a.responsible || '';
          const bResponsible = b.responsible || '';
          comparison = aResponsible.localeCompare(bResponsible);
          break;
        case 'due_date':
          const aDate = a.due_date ? new Date(a.due_date).getTime() : Infinity;
          const bDate = b.due_date ? new Date(b.due_date).getTime() : Infinity;
          comparison = aDate - bDate;
          break;
      }
      
      // הפיכת התוצאה אם המיון הוא יורד
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [tasks, sortField, sortDirection]);
  
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
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
        />
        
        <VStack spacing={0} align="stretch" divider={<Divider />}>
          {sortedTasks.map(task => (
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