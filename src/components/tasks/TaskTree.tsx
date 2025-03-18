import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Flex, 
  Text, 
  Heading, 
  IconButton,
  Badge,
  HStack,
  Collapse,
  useToast,
  useColorModeValue,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  MenuOptionGroup,
  MenuItemOption
} from '@chakra-ui/react';
import { FiChevronDown, FiChevronRight, FiEdit, FiTrash2, FiMoreVertical } from 'react-icons/fi';
import { Task } from '@/types/supabase';
import taskService from '@/lib/services/taskService';
import SubtaskInput from '@/components/tasks/SubtaskInput';

interface TaskNodeProps {
  task: Task;
  children: React.ReactNode;
  level: number;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
  onStatusChange?: (taskId: string, newStatus: string) => void;
  isFiltered?: boolean;
}

// הפונקציה לקבלת צבע לפי סטטוס
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'todo':
      case 'לביצוע':
        return 'gray';
      case 'in_progress':
      case 'בתהליך':
        return 'blue';
      case 'review':
      case 'בבדיקה':
        return 'orange';
      case 'done':
      case 'הושלם':
        return 'green';
      default:
        return 'gray';
    }
  };
  
// הפונקציה לקבלת תווית הסטטוס
const getStatusLabel = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'todo':
      return 'לביצוע';
    case 'in_progress':
      return 'בתהליך';
    case 'review':
      return 'בבדיקה';
    case 'done':
      return 'הושלם';
    default:
      return status;
  }
};

// קומפוננטה להצגת משימה בודדת בעץ
const TaskNode: React.FC<TaskNodeProps> = ({ 
  task, 
  children, 
  level, 
  onEditTask, 
  onDeleteTask, 
  onStatusChange,
  isFiltered = false
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const lineColor = useColorModeValue('gray.300', 'gray.600');
  
  const toast = useToast();
  
  // חישוב רוחב ההזחה לפי רמת המשימה
  const indentWidth = level * 24;
  
  // פונקציה להוספת תת-משימה שנוצרה לעץ המשימות
  const handleSubtaskCreated = (createdTask: Task) => {
    if (onEditTask) {
      onEditTask(task);
    }
  };
  
  return (
    <Box mb={2}>
      <Box
        position="relative"
        mr={level > 0 ? 0 : 4}
        pl={level > 0 ? `${indentWidth}px` : 0}
      >
        {/* קו מחבר אנכי לתת-משימות */}
      {level > 0 && (
        <Box
          position="absolute"
          left={`${indentWidth - 16}px`}
            top="-12px"
            bottom={children ? "50%" : "10px"}
          width="1px"
          bg={lineColor}
          zIndex={1}
        />
      )}
      
      {/* קו מחבר אופקי */}
      {level > 0 && (
        <Box
          position="absolute"
          left={`${indentWidth - 16}px`}
            top="50%"
          width="16px"
          height="1px"
          bg={lineColor}
          zIndex={1}
        />
      )}
      
        <Box
        p={3}
          bg={bgColor}
        borderWidth="1px"
          borderColor={borderColor}
          borderRadius="md"
          boxShadow="sm"
          _hover={{ boxShadow: 'md' }}
          position="relative"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <Flex justifyContent="space-between" alignItems="center">
            <Flex alignItems="center" flex="1">
              {children && (
                <IconButton
                  icon={isExpanded ? <FiChevronDown /> : <FiChevronRight />}
                  variant="ghost"
                  size="sm"
                  aria-label={isExpanded ? "כווץ" : "הרחב"}
                  mr={2}
                  onClick={() => setIsExpanded(!isExpanded)}
                />
              )}
              
              {task.status && (
                <Badge 
                  colorScheme={getStatusColor(task.status)} 
                  variant="solid" 
                  fontSize="xs" 
                  mr={2}
                >
                  {getStatusLabel(task.status)}
                  </Badge>
                )}
                
              <Box flex="1">
                <Heading 
                  size="sm" 
                  fontWeight="semibold"
                  textDecoration={task.status === 'done' ? 'line-through' : 'none'}
                  opacity={task.status === 'done' ? 0.8 : 1}
                >
                  {task.title}
                </Heading>
                {task.description && (
                  <Text fontSize="sm" color="gray.600" noOfLines={2} mt={1}>
                    {task.description}
                  </Text>
                )}
              </Box>
              </Flex>
            
            <HStack spacing={1} opacity={isHovered ? 1 : 0.3} transition="opacity 0.2s">
              <Menu>
                <MenuButton
                  as={IconButton}
                  icon={<FiMoreVertical />}
                  variant="ghost"
                  size="sm"
                  aria-label="פעולות נוספות"
                />
                <MenuList>
                  <MenuItem 
                    icon={<FiEdit />} 
                    onClick={() => onEditTask && onEditTask(task)}
                  >
                    ערוך
                  </MenuItem>
                  <MenuItem 
                    icon={<FiTrash2 />} 
                    onClick={() => onDeleteTask && onDeleteTask(task.id)}
                    color="red.500"
                  >
                    מחק
                  </MenuItem>
                  
                  <MenuDivider />
                  
                  <MenuOptionGroup 
                    title="שנה סטטוס" 
                    type="radio" 
                    defaultValue={task.status}
                    onChange={(value) => onStatusChange && onStatusChange(task.id, value as string)}
                  >
                    <MenuItemOption value="todo">לביצוע</MenuItemOption>
                    <MenuItemOption value="in_progress">בתהליך</MenuItemOption>
                    <MenuItemOption value="review">בבדיקה</MenuItemOption>
                    <MenuItemOption value="done">הושלם</MenuItemOption>
                  </MenuOptionGroup>
                </MenuList>
              </Menu>
            </HStack>
              </Flex>
            </Box>
      </Box>
      
      {/* תיבת הזנה להוספת תת-משימה */}
      {isHovered && !isAddingSubtask && (
        <Box pl={level > 0 ? `${indentWidth + 24}px` : `24px`}>
          <SubtaskInput 
            parentTaskId={task.id} 
            projectId={task.project_id} 
            onSubtaskCreated={handleSubtaskCreated} 
          />
        </Box>
      )}
      
      {/* תתי-משימות */}
      <Collapse in={isExpanded} animateOpacity>
        <Box pl={4}>
          {children}
        </Box>
      </Collapse>
    </Box>
  );
};

interface TaskTreeProps {
  tasks: Task[];
  projectId: string;
  onTaskEdited?: (task: Task) => void;
  onTaskDeleted?: (taskId: string) => void;
  onTaskStatusChanged?: (taskId: string, newStatus: string) => void;
  searchTerm?: string;
}

// קומפוננטה להצגת עץ משימות
const TaskTree: React.FC<TaskTreeProps> = ({
  tasks,
  projectId,
  onTaskEdited,
  onTaskDeleted,
  onTaskStatusChanged,
  searchTerm = '',
}) => {
  const [taskTree, setTaskTree] = useState<Task[]>([]);
  const [filteredTree, setFilteredTree] = useState<Task[]>([]);
  const [isFilterActive, setIsFilterActive] = useState(false);
  
  useEffect(() => {
    // בניית עץ המשימות
    const buildTaskTree = () => {
      // יצירת מפה של משימות לפי מזהה
      const taskMap = new Map<string, Task & { children?: Task[] }>();
      
      // הוספת כל המשימות למפה
      tasks.forEach(task => {
        taskMap.set(task.id, { ...task, children: [] });
      });
      
      // יצירת עץ
      const tree: Task[] = [];
      
      // הוספת משימות לעץ או לתתי-משימות
      tasks.forEach(task => {
        const taskWithChildren = taskMap.get(task.id);
        
        if (!taskWithChildren) return;
        
        if (task.parent_task_id && taskMap.has(task.parent_task_id)) {
          // זו תת-משימה, נוסיף אותה לעץ של המשימה האב
          const parentTask = taskMap.get(task.parent_task_id);
          if (parentTask && parentTask.children) {
            parentTask.children.push(taskWithChildren);
            }
          } else {
            // זו משימת שורש
          tree.push(taskWithChildren);
        }
      });
      
      // מיון המשימות (לדוגמה, לפי תאריך יצירה)
      const sortedTree = tree.sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA; // המשימות החדשות יוצגו ראשונות
      });
      
      setTaskTree(sortedTree);
    };
    
    buildTaskTree();
  }, [tasks]);
  
  // פילטור המשימות לפי חיפוש
  useEffect(() => {
    const filterTasks = () => {
      if (!searchTerm.trim()) {
        setFilteredTree(taskTree);
        setIsFilterActive(false);
        return;
      }
      
      const searchTermLower = searchTerm.toLowerCase();
      
      // פונקציה לבדיקה אם משימה מתאימה לחיפוש
      const isTaskMatchingSearch = (task: Task): boolean => {
        return (
          task.title.toLowerCase().includes(searchTermLower) ||
          (task.description || '').toLowerCase().includes(searchTermLower)
        );
      };
      
      // איתור כל המשימות המתאימות לחיפוש, כולל תתי-משימות
      const findMatchingTasks = (tasks: Task[]): Task[] => {
        const result: Task[] = [];
        
        tasks.forEach(task => {
          const taskWithChildren = task as Task & { children?: Task[] };
          
          // האם המשימה הנוכחית מתאימה לחיפוש
          const taskMatches = isTaskMatchingSearch(task);
          
          // חיפוש ברקורסיה בתתי-משימות
          const childMatches = taskWithChildren.children 
            ? findMatchingTasks(taskWithChildren.children)
            : [];
          
          if (taskMatches || childMatches.length > 0) {
            // יצירת עותק של המשימה עם תתי-המשימות שמתאימות
            const clonedTask = { 
              ...task,
              children: childMatches
            };
            
            result.push(clonedTask);
          }
        });
        
        return result;
      };
      
      const matchingTasks = findMatchingTasks(taskTree);
      setFilteredTree(matchingTasks);
      setIsFilterActive(true);
    };
    
    filterTasks();
  }, [taskTree, searchTerm]);
  
  // פונקציה רקורסיבית להצגת עץ המשימות
  const renderTaskTree = (tasks: (Task & { children?: Task[] })[], level = 0) => {
    return tasks.map(task => {
      const children = task.children || [];
      return (
        <TaskNode
          key={task.id}
          task={task}
          level={level}
          onEditTask={onTaskEdited}
          onDeleteTask={onTaskDeleted}
          onStatusChange={onTaskStatusChanged}
          isFiltered={isFilterActive}
        >
          {children.length > 0 && renderTaskTree(children, level + 1)}
        </TaskNode>
      );
    });
  };
  
  return (
    <Box>
      {filteredTree.length === 0 ? (
        <Box p={4} textAlign="center">
          <Text>לא נמצאו משימות מתאימות</Text>
        </Box>
      ) : (
        renderTaskTree(filteredTree)
      )}
    </Box>
  );
};

export default TaskTree; 