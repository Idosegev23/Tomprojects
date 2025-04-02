import React, { useState, useMemo, useCallback } from 'react';
import { VStack, Divider, Card, CardBody, Text, Button, Flex, useColorModeValue, ButtonGroup, Tooltip, Box, HStack } from '@chakra-ui/react';
import { FiPlus, FiRefreshCw, FiChevronUp, FiChevronDown } from 'react-icons/fi';
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

// טיפוס חדש עבור משימה עם תת-משימות
interface TaskWithChildren extends TaskWithStage {
  childTasks?: TaskWithChildren[];
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
  
  // הוספת state למיונים - קביעת hierarchical_number כברירת מחדל
  const [sortField, setSortField] = useState<SortField>('hierarchical_number');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // state חדש לניהול מצב ההרחבה הגלובלי
  const [expandAll, setExpandAll] = useState<boolean>(false);
  
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
  
  // פונקציה להרחבת כל המשימות
  const handleExpandAll = () => {
    setExpandAll(true);
  };
  
  // פונקציה לצמצום כל המשימות
  const handleCollapseAll = () => {
    setExpandAll(false);
  };
  
  // בניית עץ המשימות
  const buildTaskTree = useCallback((): TaskWithChildren[] => {
    // מיפוי משימות לפי ID להקלה על חיפוש
    const taskMap = new Map<string, TaskWithChildren>();
    tasks.forEach(task => {
      taskMap.set(task.id, { ...task, childTasks: [] });
    });

    // בניית מבנה העץ
    const rootTasks: TaskWithChildren[] = [];
    
    taskMap.forEach(task => {
      if (task.parent_task_id) {
        // משימה עם הורה - הוספה לרשימת תת-המשימות של ההורה
        const parent = taskMap.get(task.parent_task_id);
        if (parent) {
          parent.childTasks = parent.childTasks || [];
          parent.childTasks.push(task);
        } else {
          // אם ההורה לא קיים, נוסיף כמשימת שורש
          rootTasks.push(task);
        }
      } else {
        // משימה ראשית ללא הורה
        rootTasks.push(task);
      }
    });
    
    return rootTasks;
  }, [tasks]);
  
  // מיון המשימות לפי השדה והכיוון שנבחרו
  const sortTasks = useCallback((taskList: TaskWithChildren[]): TaskWithChildren[] => {
    return [...taskList].sort((a, b) => {
      let comparison = 0;
      
      // מיון לפי השדה שנבחר
      switch (sortField) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'hierarchical_number':
          if (a.hierarchical_number && b.hierarchical_number) {
            if (typeof a.hierarchical_number === 'string' && typeof b.hierarchical_number === 'string') {
              try {
                const aParts = a.hierarchical_number.split('.').map(Number);
                const bParts = b.hierarchical_number.split('.').map(Number);
                
                for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
                  if (aParts[i] !== bParts[i]) {
                    comparison = aParts[i] - bParts[i];
                    break;
                  }
                }
                
                if (comparison === 0) {
                  comparison = aParts.length - bParts.length;
                }
              } catch (error) {
                console.error('שגיאה במיון לפי מספר היררכי:', error, { a: a.hierarchical_number, b: b.hierarchical_number });
                comparison = 0;
              }
            } else {
              comparison = String(a.hierarchical_number).localeCompare(String(b.hierarchical_number));
            }
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
  }, [sortField, sortDirection]);
  
  // יצירת עץ המשימות הממוין ברמת השורש
  const sortedTaskTree = useMemo(() => {
    const taskTree = buildTaskTree();
    
    // מיון משימות ברמת השורש
    const sortedRootTasks = sortTasks(taskTree);
    
    // מיון תת-משימות בכל רמה בעץ
    const sortTreeRecursively = (tasks: TaskWithChildren[]): TaskWithChildren[] => {
      return tasks.map(task => {
        if (task.childTasks && task.childTasks.length > 0) {
          // מיון תת-המשימות
          const sortedChildren = sortTasks([...task.childTasks]);
          // המשך מיון באופן רקורסיבי לרמות הבאות
          return {
            ...task,
            childTasks: sortTreeRecursively(sortedChildren)
          };
        }
        return task;
      });
    };
    
    return sortTreeRecursively(sortedRootTasks);
  }, [buildTaskTree, sortTasks]);
  
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
        {/* כפתורי הרחבה וכיווץ מעל הטבלה */}
        <Flex justify="flex-end" p={2} borderBottom="1px solid" borderColor={borderColor}>
          <ButtonGroup size="sm" isAttached variant="outline">
            <Tooltip label="פתח את כל המשימות">
              <Button 
                leftIcon={<FiChevronDown />} 
                onClick={handleExpandAll}
                colorScheme="blue"
                variant="outline"
              >
                הרחב הכל
              </Button>
            </Tooltip>
            <Tooltip label="סגור את כל המשימות">
              <Button 
                leftIcon={<FiChevronUp />} 
                onClick={handleCollapseAll}
                colorScheme="blue"
                variant="outline"
              >
                צמצם הכל
              </Button>
            </Tooltip>
          </ButtonGroup>
        </Flex>
        
        {/* כותרות הטבלה */}
        <TaskTableHeader 
          isAllSelected={selectedTasks.length === tasks.length && tasks.length > 0}
          onSelectAll={onSelectAll}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
        />
        
        <VStack spacing={0} align="stretch" divider={<Divider />}>
          {sortedTaskTree.map((task, index) => (
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
              level={0}
              hasChildren={task.childTasks !== undefined && task.childTasks.length > 0}
              childTasks={task.childTasks || []}
              isLastChild={index === sortedTaskTree.length - 1}
              expandAll={expandAll}
            />
          ))}
        </VStack>
      </CardBody>
    </Card>
  );
};

export default TaskTable; 