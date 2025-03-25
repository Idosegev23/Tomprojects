import React, { useState, useEffect, useRef } from 'react';
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
  MenuItemOption,
  Tooltip,
  useDisclosure,
  Spinner,
  Button
} from '@chakra-ui/react';
import { FiChevronDown, FiChevronRight, FiEdit, FiTrash2, FiMoreVertical, FiPlus, FiCalendar, FiMove } from 'react-icons/fi';
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
  // יש להתחיל עם isExpanded=true לתצוגה ברירת מחדל טובה יותר
  // אם מדובר בתצוגה מסוננת, תמיד נרצה להציג את כל העץ פתוח
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const lineColor = useColorModeValue('gray.300', 'gray.600');
  const hoverBgColor = useColorModeValue('gray.50', 'gray.700');
  
  const toast = useToast();
  
  // חישוב רוחב ההזחה לפי רמת המשימה
  const indentWidth = level * 24;
  
  // פונקציה להוספת תת-משימה שנוצרה לעץ המשימות
  const handleSubtaskCreated = (createdTask: Task) => {
    toast({
      title: "תת-משימה נוצרה בהצלחה",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
    
    // וידוא שהעץ יהיה פתוח לאחר יצירת תת-משימה
    setIsExpanded(true);
    setIsAddingSubtask(false);
    
    if (onEditTask) {
      onEditTask(task);
    }
  };
  
  // פונקציה לביטול הוספת תת-משימה
  const handleCancelAddSubtask = () => {
    setIsAddingSubtask(false);
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
          bg={isHovered ? hoverBgColor : bgColor}
          borderWidth="1px"
          borderColor={borderColor}
          borderRadius="md"
          boxShadow="sm"
          position="relative"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          cursor="pointer"
          _hover={{ boxShadow: 'md' }}
          onClick={(e) => {
            // מניעת הרחבה/כיווץ אם לחצנו על כפתור אחר
            if (
              (e.target as HTMLElement).tagName !== 'BUTTON' && 
              !(e.target as HTMLElement).closest('button')
            ) {
              if (onEditTask) {
                onEditTask(task);
              }
            }
          }}
        >
          <Flex justifyContent="space-between" alignItems="center">
            <Flex alignItems="center" flex="1">
              {React.Children.count(children) > 0 && (
                <IconButton
                  icon={isExpanded ? <FiChevronDown /> : <FiChevronRight />}
                  variant="ghost"
                  size="sm"
                  aria-label={isExpanded ? "כווץ" : "הרחב"}
                  mr={2}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(!isExpanded);
                  }}
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
                <Flex alignItems="center">
                  <Heading 
                    size="sm" 
                    fontWeight="semibold"
                    textDecoration={task.status === 'done' ? 'line-through' : 'none'}
                    opacity={task.status === 'done' ? 0.8 : 1}
                  >
                    {task.title}
                  </Heading>
                  
                  {/* תאריך יעד */}
                  {task.due_date && (
                    <Tooltip 
                      label={`תאריך יעד: ${new Date(task.due_date).toLocaleDateString('he-IL')}`} 
                      placement="top"
                    >
                      <Badge 
                        ml={2} 
                        colorScheme={isTaskOverdue(task) ? 'red' : 'blue'}
                        variant="outline"
                        display="flex"
                        alignItems="center"
                      >
                        <FiCalendar style={{ marginLeft: '4px' }} />
                        {new Date(task.due_date).toLocaleDateString('he-IL')}
                      </Badge>
                    </Tooltip>
                  )}
                </Flex>
                {task.description && (
                  <Text 
                    fontSize="sm" 
                    color="gray.600" 
                    noOfLines={2} 
                    mt={1}
                    opacity={isHovered ? 1 : 0.8}
                  >
                    {task.description}
                  </Text>
                )}
              </Box>
              </Flex>
            
            {/* כפתורי פעולה */}
            <HStack spacing={1}>
              {/* כפתור הוספת תת-משימה - תמיד גלוי */}
              <Tooltip label="הוסף תת-משימה">
                <IconButton
                  icon={<FiPlus />}
                  aria-label="הוסף תת-משימה"
                  size="sm"
                  variant="ghost"
                  visibility="visible"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAddingSubtask(!isAddingSubtask);
                  }}
                />
              </Tooltip>
              
              {/* כפתור גרירה יתווסף בהמשך */}
              <Tooltip label="גרור לסידור מחדש">
                <IconButton
                  icon={<FiMove />}
                  aria-label="גרור"
                  size="sm"
                  variant="ghost"
                  visibility={isHovered ? "visible" : "hidden"}
                  cursor="grab"
                />
              </Tooltip>
            
              {/* כפתורי עריכה ומחיקה - מוצגים בריחוף */}
              <HStack spacing={1} opacity={isHovered ? 1 : 0} transition="opacity 0.2s">
                <Menu>
                  <MenuButton
                    as={IconButton}
                    icon={<FiMoreVertical />}
                    variant="ghost"
                    size="sm"
                    aria-label="אפשרויות נוספות"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <MenuList>
                    <MenuItem 
                      icon={<FiEdit />}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onEditTask) {
                          onEditTask(task);
                        }
                      }}
                    >
                      ערוך משימה
                    </MenuItem>
                    <MenuDivider />
                    <MenuOptionGroup 
                      title="שנה סטטוס" 
                      type="radio" 
                      value={task.status}
                      onChange={(value) => {
                        if (onStatusChange) {
                          onStatusChange(task.id, value as string);
                        }
                      }}
                    >
                      <MenuItemOption value="todo">לביצוע</MenuItemOption>
                      <MenuItemOption value="in_progress">בתהליך</MenuItemOption>
                      <MenuItemOption value="review">בבדיקה</MenuItemOption>
                      <MenuItemOption value="done">הושלם</MenuItemOption>
                    </MenuOptionGroup>
                    <MenuDivider />
                    <MenuItem
                      icon={<FiTrash2 />}
                      color="red.500"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onDeleteTask) {
                          onDeleteTask(task.id);
                        }
                      }}
                    >
                      מחק משימה
                    </MenuItem>
                  </MenuList>
                </Menu>
              </HStack>
            </HStack>
          </Flex>
        </Box>
        
        {/* טופס להוספת תת-משימה */}
        <Collapse in={isAddingSubtask} animateOpacity>
          <Box mt={2} ml={indentWidth + 8} mr={4} p={3} borderWidth="1px" borderRadius="md" bg="gray.50">
            <SubtaskInput 
              parentTaskId={task.id} 
              projectId={task.project_id}
              onSubtaskCreated={handleSubtaskCreated}
              onCancel={handleCancelAddSubtask}
            />
          </Box>
        </Collapse>
        
        {/* תת-משימות */}
        <Collapse in={isExpanded && React.Children.count(children) > 0} animateOpacity>
          <Box mt={2}>
            {children}
          </Box>
        </Collapse>
      </Box>
    </Box>
  );
};

// בדיקה האם משימה עברה את תאריך היעד
const isTaskOverdue = (task: Task): boolean => {
  if (!task.due_date) return false;
  if (task.status === 'done') return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dueDate = new Date(task.due_date);
  dueDate.setHours(0, 0, 0, 0);
  
  return dueDate < today;
};

interface TaskTreeProps {
  tasks: Task[];
  projectId: string;
  onTaskEdited?: (task: Task) => void;
  onTaskDeleted?: (taskId: string) => void;
  onTaskStatusChanged?: (taskId: string, newStatus: string) => void;
  searchTerm?: string;
  onReorderTasks?: (taskId: string, fromIndex: number, toIndex: number) => void;
  onTaskDropped?: (taskId: string, fromColumn: string, toColumn: string) => void;
  loading?: boolean;
  errorMessage?: string;
  filterTerm?: string;
}

// קומפוננטה להצגת עץ משימות
const TaskTree: React.FC<TaskTreeProps> = ({
  tasks,
  projectId,
  onTaskEdited,
  onTaskDeleted,
  onTaskStatusChanged,
  onReorderTasks,
  onTaskDropped,
  searchTerm = '',
  loading = false,
  errorMessage = '',
  filterTerm = ''
}) => {
  const [taskTree, setTaskTree] = useState<(Task & { children?: Task[] })[]>([]);
  const [filteredTree, setFilteredTree] = useState<(Task & { children?: Task[] })[]>([]);
  const [isFilterActive, setIsFilterActive] = useState(false);
  
  // בניית עץ המשימות ההיררכי
  useEffect(() => {
    // בניית עץ המשימות
    const buildTaskTree = () => {
      // יצירת מפה של משימות לפי ID
      const taskMap = new Map<string, Task & { children?: Task[] }>();
      
      // הוספת כל המשימות למפה עם מערך ילדים ריק
      tasks.forEach(task => {
        // וידוא שהמשימה מקבלת מערך ילדים ריק אם אין לה כבר אחד
        taskMap.set(task.id, { ...task, children: [] });
      });
      
      // מיון המשימות להיררכיה - משימות אב ומשימות ילדים
      const rootTasks: (Task & { children?: Task[] })[] = [];
      
      // עיבוד כל המשימות - חיבור תתי-משימות למשימות האב
      taskMap.forEach(task => {
        // בדיקה אם זו תת-משימה (יש לה parent_task_id)
        if (task.parent_task_id && taskMap.has(task.parent_task_id)) {
          // תת-משימה - חיבור למשימת האב
          const parent = taskMap.get(task.parent_task_id);
          if (parent) {
            // בדיקה שהילד לא כבר קיים במערך הילדים של האב
            if (!parent.children) {
              parent.children = [];
            }
            // רק אם הילד לא קיים כבר, הוסף אותו
            if (!parent.children.some(child => child.id === task.id)) {
              parent.children.push(task);
            }
          }
        } else {
          // משימת אב - הוספה לרשימת השורש רק אם היא לא כבר שם
          if (!rootTasks.some(rootTask => rootTask.id === task.id)) {
            rootTasks.push(task);
          }
        }
      });
      
      // מיון משימות האב לפי מספר היררכי או לפי תאריך יצירה אם אין מספר היררכי
      rootTasks.sort((a, b) => {
        // אם יש מספרים היררכיים לשתי המשימות
        if (a.hierarchical_number && b.hierarchical_number) {
          const aNum = a.hierarchical_number.split('.').map(Number);
          const bNum = b.hierarchical_number.split('.').map(Number);
          
          for (let i = 0; i < Math.min(aNum.length, bNum.length); i++) {
            if (aNum[i] !== bNum[i]) {
              return aNum[i] - bNum[i];
            }
          }
          
          return aNum.length - bNum.length;
        } 
        // אם רק לאחת מהן יש מספר היררכי
        else if (a.hierarchical_number) {
          return -1; // a מופיע קודם
        } else if (b.hierarchical_number) {
          return 1; // b מופיע קודם
        } 
        // אם אין מספרים היררכיים, מיון לפי תאריך יצירה אם קיים
        else if (a.created_at && b.created_at) {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        
        return 0;
      });
      
      // פונקציה רקורסיבית למיון תתי-משימות
      const sortChildrenRecursively = (tasks: (Task & { children?: Task[] })[]) => {
        tasks.forEach(task => {
          if (task.children && task.children.length > 0) {
            // מיון תתי-משימות לפי מספר היררכי או תאריך יצירה
            task.children.sort((a, b) => {
              // אם יש מספרים היררכיים לשתי המשימות
              if (a.hierarchical_number && b.hierarchical_number) {
                const aNum = a.hierarchical_number.split('.').map(Number);
                const bNum = b.hierarchical_number.split('.').map(Number);
                
                for (let i = 0; i < Math.min(aNum.length, bNum.length); i++) {
                  if (aNum[i] !== bNum[i]) {
                    return aNum[i] - bNum[i];
                  }
                }
                
                return aNum.length - bNum.length;
              } 
              // אם רק לאחת מהן יש מספר היררכי
              else if (a.hierarchical_number) {
                return -1; // a מופיע קודם
              } else if (b.hierarchical_number) {
                return 1; // b מופיע קודם
              } 
              // אם אין מספרים היררכיים, מיון לפי תאריך יצירה אם קיים
              else if (a.created_at && b.created_at) {
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
              }
              
              return 0;
            });
            
            // מיון רקורסיבי של תתי-משימות עמוקות יותר
            sortChildrenRecursively(task.children);
          }
        });
      };
      
      // מיון רקורסיבי של כל העץ
      sortChildrenRecursively(rootTasks);
      
      console.log('מבנה עץ משימות מיוצר:', rootTasks);
      return rootTasks;
    };
    
    const tree = buildTaskTree();
    setTaskTree(tree);
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
  
  // פונקציה לטיפול בגרירה ושינוי סדר (תשמש בעתיד)
  const handleReorderTask = (taskId: string, fromIndex: number, toIndex: number) => {
    if (onReorderTasks) {
      onReorderTasks(taskId, fromIndex, toIndex);
    }
  };
  
  // פונקציה לטיפול בהעברת משימה לקטגוריה אחרת (תשמש בעתיד)
  const handleDropTask = (taskId: string, fromColumn: string, toColumn: string) => {
    if (onTaskDropped) {
      onTaskDropped(taskId, fromColumn, toColumn);
    }
  };
  
  // פונקציה רקורסיבית להצגת עץ המשימות
  const renderTaskTree = (tasks: (Task & { children?: Task[] })[] = [], level = 0) => {
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
  
  // פונקציה להוספת משימה חדשה לרמה העליונה
  const handleAddRootTask = () => {
    // חלונית של הוספת משימה חדשה תוצג בממשק ראשי
    console.log('הוספת משימה ראשית חדשה');
  };
  
  return (
    <Box position="relative">
      {loading && (
        <Box 
          position="absolute"
          inset="0"
          bg="whiteAlpha.700"
          display="flex"
          alignItems="center"
          justifyContent="center"
          zIndex={10}
        >
          <Spinner size="xl" />
        </Box>
      )}
      
      {errorMessage && (
        <Box 
          p={4} 
          bg="red.50" 
          color="red.600" 
          borderRadius="md" 
          textAlign="center"
          mb={4}
        >
          {errorMessage}
        </Box>
      )}
      
      {tasks.length === 0 && !loading && !errorMessage && (
        <Box 
          p={4} 
          bg="gray.50" 
          borderRadius="md" 
          textAlign="center"
          mb={4}
        >
          <Text fontSize="lg" fontWeight="medium">אין משימות להצגה</Text>
          <Text fontSize="sm" color="gray.600" mt={2}>
            {filterTerm ? 
              'נסה לשנות את פרמטרי הסינון' : 
              'לחץ על "הוסף משימה" כדי להתחיל'}
          </Text>
          
          <Button
            mt={4}
            colorScheme="blue"
            leftIcon={<FiPlus />}
            onClick={handleAddRootTask}
          >
            הוסף משימה חדשה
          </Button>
        </Box>
      )}

      <Box>
        {renderTaskTree(filteredTree)}
      </Box>
    </Box>
  );
};

export default TaskTree; 