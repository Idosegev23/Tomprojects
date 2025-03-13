import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Flex, 
  Text, 
  Icon, 
  Checkbox, 
  Badge, 
  useColorModeValue, 
  Button, 
  Heading, 
  Divider, 
  VStack, 
  HStack, 
  Tooltip, 
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  Select,
  Collapse,
  useDisclosure,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  Spinner,
  FormControl,
  FormLabel,
  useToast,
  Center
} from '@chakra-ui/react';
import { ChevronDownIcon, ChevronRightIcon, EditIcon, DeleteIcon, SearchIcon, SettingsIcon, InfoIcon, CloseIcon } from '@chakra-ui/icons';
import { FiFilter, FiLink, FiMaximize2, FiMinimize2, FiCalendar, FiClock, FiTag } from 'react-icons/fi';
import { Task, Stage, TaskWithChildren } from '@/types/supabase';
import stageService from '@/lib/services/stageService';
import { motion } from 'framer-motion';
import taskService from '@/lib/services/taskService';

// קומפוננטות מונפשות
const MotionBox = motion(Box);
const MotionFlex = motion(Flex);

interface TaskTreeProps {
  tasks: TaskWithChildren[];
  projectId: string;
  onEditTask?: (task: TaskWithChildren) => void;
  onDeleteTask?: (taskId: string) => void;
  onStatusChange?: (taskId: string, status: string) => void;
}

interface TaskNodeProps {
  task: TaskWithChildren;
  children: TaskWithChildren[];
  level: number;
  onEditTask?: (task: TaskWithChildren) => void;
  onDeleteTask?: (taskId: string) => void;
  onStatusChange?: (taskId: string, status: string) => void;
  isFiltered?: boolean;
}

interface StageGroupProps {
  stage: Stage;
  tasks: TaskWithChildren[];
  onEditTask?: (task: TaskWithChildren) => void;
  onDeleteTask?: (taskId: string) => void;
  onStatusChange?: (taskId: string, status: string) => void;
  searchTerm: string;
}

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
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');
  const lineColor = useColorModeValue('gray.300', 'gray.600');
  
  const toast = useToast();
  
  // פונקציה לקבלת צבע לפי סטטוס
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
  
  // פונקציה להוספת תת-משימה חדשה
  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) return;
    
    try {
      setIsSubmitting(true);
      
      const newSubtask = {
        title: newSubtaskTitle,
        description: '',
        status: 'todo',
        priority: task.priority,
        project_id: task.project_id,
        parent_task_id: task.id,
      };
      
      const createdTask = await taskService.createTask(newSubtask);
      
      toast({
        title: 'תת-משימה נוצרה בהצלחה',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // איפוס הטופס
      setNewSubtaskTitle('');
      setIsAddingSubtask(false);
      
      // רענון המשימות (דרך הקומפוננטה האב)
      if (onEditTask) {
        onEditTask(task);
      }
    } catch (error) {
      console.error('Error creating subtask:', error);
      toast({
        title: 'שגיאה ביצירת תת-משימה',
        description: error instanceof Error ? error.message : 'אירעה שגיאה לא ידועה',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // פונקציה לשינוי סטטוס המשימה
  const handleStatusChange = (newStatus: string) => {
    if (onStatusChange) {
      onStatusChange(task.id, newStatus);
    }
  };
  
  // חישוב רוחב ההזחה לפי רמת המשימה
  const indentWidth = level * 24;
  
  return (
    <MotionBox 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: level * 0.05 }}
      mb={3}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* קו מחבר אנכי */}
      {level > 0 && (
        <Box
          position="absolute"
          left={`${indentWidth - 16}px`}
          top={0}
          bottom={0}
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
          top="16px"
          width="16px"
          height="1px"
          bg={lineColor}
          zIndex={1}
        />
      )}
      
      {/* כרטיס המשימה */}
      <Flex
        direction="column"
        ml={`${indentWidth}px`}
        position="relative"
        zIndex={2}
      >
      <MotionFlex
        p={3}
        borderWidth="1px"
        borderRadius="md"
          bg={isHovered ? hoverBg : bgColor}
          borderColor={borderColor}
          boxShadow={isHovered ? 'sm' : 'none'}
        transition="all 0.2s"
          direction="column"
          whileHover={{ scale: 1.01 }}
      >
          <Flex align="center" mb={2}>
          <IconButton
              icon={isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
              variant="ghost"
              size="sm"
              aria-label={isExpanded ? 'כווץ' : 'הרחב'}
              onClick={() => setIsExpanded(!isExpanded)}
              visibility={children.length > 0 ? 'visible' : 'hidden'}
            mr={2}
          />
        
        <Checkbox
          isChecked={task.status === 'done'}
              onChange={(e) => handleStatusChange(e.target.checked ? 'done' : 'todo')}
              mr={2}
        />
        
            <Text fontWeight="bold" flex="1" isTruncated>
              {task.hierarchical_number && (
                <Badge mr={2} colorScheme="blue">{task.hierarchical_number}</Badge>
              )}
          {task.title}
        </Text>
        
            <Badge colorScheme={getStatusColor(task.status)} mr={2}>
          {task.status === 'todo' ? 'לביצוע' : 
           task.status === 'in_progress' ? 'בתהליך' : 
           task.status === 'review' ? 'בבדיקה' : 
           task.status === 'done' ? 'הושלם' : task.status}
        </Badge>
        
            <HStack spacing={1} opacity={isHovered ? 1 : 0.3} transition="opacity 0.2s">
              <Tooltip label="הוסף תת-משימה">
                <IconButton
                  icon={<FiTag />}
                  size="sm"
                  variant="ghost"
                  aria-label="הוסף תת-משימה"
                  onClick={() => setIsAddingSubtask(!isAddingSubtask)}
                />
        </Tooltip>
        
            <Tooltip label="ערוך משימה">
              <IconButton
                  icon={<EditIcon />}
                size="sm"
                variant="ghost"
                  aria-label="ערוך"
                  onClick={() => onEditTask && onEditTask(task)}
              />
            </Tooltip>
          
            <Tooltip label="מחק משימה">
              <IconButton
                  icon={<DeleteIcon />}
                size="sm"
                variant="ghost"
                colorScheme="red"
                  aria-label="מחק"
                  onClick={() => onDeleteTask && onDeleteTask(task.id)}
              />
            </Tooltip>
            </HStack>
          </Flex>
          
          {/* מידע נוסף על המשימה */}
          <Collapse in={isExpanded} animateOpacity>
            <Box pl={8} pt={2}>
              {task.description && (
                <Text fontSize="sm" color="gray.600" mb={2}>
                  {task.description}
                </Text>
              )}
              
              <Flex wrap="wrap" gap={2}>
                {task.due_date && (
                  <Badge colorScheme="purple" variant="outline">
                    <Icon as={FiCalendar} mr={1} />
                    {new Date(task.due_date).toLocaleDateString()}
                  </Badge>
                )}
                
                {task.estimated_hours != null && (
                  <Badge colorScheme="teal" variant="outline">
                    <Icon as={FiClock} mr={1} />
                    {task.estimated_hours} שעות
                  </Badge>
                )}
                
                {task.priority && (
                  <Badge 
                    colorScheme={
                      task.priority === 'low' ? 'green' : 
                      task.priority === 'medium' ? 'blue' : 
                      task.priority === 'high' ? 'orange' : 'red'
                    } 
                    variant="outline"
                  >
                    <Icon as={FiTag} mr={1} />
                    {task.priority === 'low' ? 'נמוכה' : 
                     task.priority === 'medium' ? 'בינונית' : 
                     task.priority === 'high' ? 'גבוהה' : 'דחופה'}
                  </Badge>
                )}
              </Flex>
            </Box>
          </Collapse>
          
          {/* טופס להוספת תת-משימה */}
          <Collapse in={isAddingSubtask} animateOpacity>
            <Box mt={3} pl={8}>
              <Flex>
                <Input
                  placeholder="הזן כותרת לתת-משימה חדשה"
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  size="sm"
                  flex="1"
                  mr={2}
                />
                <Button
                  size="sm"
                  colorScheme="blue"
                  onClick={handleAddSubtask}
                  isLoading={isSubmitting}
                  isDisabled={!newSubtaskTitle.trim()}
                >
                  הוסף
                </Button>
                <IconButton
                  icon={<CloseIcon />}
                  size="sm"
                  variant="ghost"
                  aria-label="בטל"
                  onClick={() => {
                    setIsAddingSubtask(false);
                    setNewSubtaskTitle('');
                  }}
                  ml={1}
                />
              </Flex>
            </Box>
          </Collapse>
      </MotionFlex>
      
        {/* תתי-משימות */}
        <Collapse in={isExpanded && children.length > 0} animateOpacity>
          <Box position="relative">
            {children.map(childTask => (
              <TaskNode
                key={childTask.id}
                task={childTask}
                children={childTask.children || []}
                level={level + 1}
                onEditTask={onEditTask}
                onDeleteTask={onDeleteTask}
                onStatusChange={onStatusChange}
                isFiltered={isFiltered}
              />
            ))}
          </Box>
      </Collapse>
      </Flex>
    </MotionBox>
  );
};

// קומפוננטה להצגת קבוצת משימות לפי שלב
const StageGroup: React.FC<StageGroupProps> = ({ 
  stage, 
  tasks, 
  onEditTask, 
  onDeleteTask, 
  onStatusChange,
  searchTerm
}) => {
  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: true });
  const bgColor = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  // ארגון המשימות בצורה היררכית
  const organizeTasksHierarchically = () => {
    // קבלת משימות שרמת האב שלהן היא null (משימות ראשיות)
    const rootTasks = tasks.filter(task => !task.parent_task_id);
    
    // מיון לפי מספר היררכי
    return rootTasks.sort((a, b) => {
      if (!a.hierarchical_number && !b.hierarchical_number) return 0;
      if (!a.hierarchical_number) return 1;
      if (!b.hierarchical_number) return -1;
      return a.hierarchical_number.localeCompare(b.hierarchical_number);
    });
  };
  
  // סינון משימות לפי מונח חיפוש
  const filterTasks = (taskList: TaskWithChildren[]) => {
    if (!searchTerm) return taskList;
    
    return taskList.filter(task => 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (task.hierarchical_number && task.hierarchical_number.includes(searchTerm))
    );
  };
  
  const rootTasks = filterTasks(organizeTasksHierarchically());
  const totalTasks = tasks.length;
  const filteredTasksCount = rootTasks.length;
  
  return (
    <MotionBox 
      mb={6} 
      borderRadius="md" 
      borderWidth="1px"
      borderColor={borderColor}
      overflow="hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Flex 
        p={4} 
        bg={bgColor} 
        alignItems="center" 
        justifyContent="space-between"
        onClick={onToggle}
        cursor="pointer"
        _hover={{ bg: useColorModeValue('gray.100', 'gray.600') }}
      >
        <HStack>
          <Icon 
            as={isOpen ? ChevronDownIcon : ChevronRightIcon} 
            transition="transform 0.2s"
          />
          <Heading size="md">{stage.title}</Heading>
          <Badge colorScheme="blue" ml={2}>
            {searchTerm ? `${filteredTasksCount}/${totalTasks}` : totalTasks}
          </Badge>
        </HStack>
        
        <HStack>
          {stage.description && (
            <Tooltip label={stage.description}>
              <InfoIcon color="gray.500" />
            </Tooltip>
          )}
        </HStack>
      </Flex>
      
      <Collapse in={isOpen} animateOpacity>
        <Box p={4} bg={useColorModeValue('white', 'gray.800')}>
          {rootTasks.length > 0 ? (
            rootTasks.map(task => (
              <TaskNode
                key={task.id}
                task={task}
                children={tasks.filter(t => t.parent_task_id === task.id)}
                level={0}
                onEditTask={onEditTask}
                onDeleteTask={onDeleteTask}
                onStatusChange={onStatusChange}
                isFiltered={!!searchTerm}
              />
            ))
          ) : (
            <Text color="gray.500" textAlign="center" py={4}>
              {searchTerm ? 'אין תוצאות חיפוש בשלב זה' : 'אין משימות בשלב זה'}
            </Text>
          )}
        </Box>
      </Collapse>
    </MotionBox>
  );
};

// הקומפוננטה הראשית להצגת עץ המשימות
const TaskTree: React.FC<TaskTreeProps> = ({ tasks, projectId, onEditTask, onDeleteTask, onStatusChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredTasks, setFilteredTasks] = useState<TaskWithChildren[]>([]);
  const [hierarchicalTasks, setHierarchicalTasks] = useState<TaskWithChildren[]>([]);
  const [loading, setLoading] = useState(true);
  const [stages, setStages] = useState<Stage[]>([]);
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [expandAll, setExpandAll] = useState(true);
  
  // טעינת שלבים
  useEffect(() => {
    const loadStages = async () => {
      try {
        const projectStages = await stageService.getProjectStages(projectId);
        setStages(projectStages);
      } catch (error) {
        console.error('Error loading stages:', error);
      }
    };
    
    loadStages();
  }, [projectId]);
  
  // ארגון המשימות בצורה היררכית
  useEffect(() => {
    const organizeTasksHierarchically = () => {
      setLoading(true);
      
      try {
        // העתקת המשימות כדי לא לשנות את המקור
        const tasksCopy = JSON.parse(JSON.stringify(tasks)) as TaskWithChildren[];
        
        // מיפוי משימות לפי מזהה
        const tasksMap = new Map<string, TaskWithChildren>();
        tasksCopy.forEach(task => {
          task.children = [];
          tasksMap.set(task.id, task);
        });
        
        // בניית העץ
        const rootTasks: TaskWithChildren[] = [];
        
        tasksCopy.forEach(task => {
          if (task.parent_task_id) {
            // זו תת-משימה
            const parentTask = tasksMap.get(task.parent_task_id);
            if (parentTask) {
              parentTask.children = parentTask.children || [];
              parentTask.children.push(task);
            } else {
              // אם משימת האב לא נמצאה, נתייחס לזו כמשימת שורש
              rootTasks.push(task);
            }
          } else {
            // זו משימת שורש
            rootTasks.push(task);
          }
        });
        
        // מיון משימות לפי מספר היררכי
        const sortTasksByHierarchicalNumber = (tasks: TaskWithChildren[]) => {
          return tasks.sort((a, b) => {
            if (!a.hierarchical_number || !b.hierarchical_number) {
              return 0;
            }
            
            const aParts = a.hierarchical_number.split('.').map(Number);
            const bParts = b.hierarchical_number.split('.').map(Number);
            
            for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
              if (aParts[i] !== bParts[i]) {
                return aParts[i] - bParts[i];
              }
            }
            
            return aParts.length - bParts.length;
          });
        };
        
        // מיון משימות השורש
        const sortedRootTasks = sortTasksByHierarchicalNumber(rootTasks);
        
        // מיון תתי-משימות באופן רקורסיבי
        const sortChildrenRecursively = (task: TaskWithChildren) => {
          if (task.children && task.children.length > 0) {
            task.children = sortTasksByHierarchicalNumber(task.children);
            task.children.forEach(sortChildrenRecursively);
          }
        };
        
        sortedRootTasks.forEach(sortChildrenRecursively);
        
        setHierarchicalTasks(sortedRootTasks);
      } catch (error) {
        console.error('Error organizing tasks hierarchically:', error);
      } finally {
        setLoading(false);
      }
    };
    
    organizeTasksHierarchically();
  }, [tasks]);
  
  // סינון משימות לפי חיפוש, שלב וסטטוס
  useEffect(() => {
    const filterTasks = () => {
      let filtered = [...hierarchicalTasks];
      
      // סינון לפי שלב
      if (selectedStage !== 'all') {
        const filterTasksByStage = (tasks: TaskWithChildren[]): TaskWithChildren[] => {
          return tasks.filter(task => {
            // בדיקה אם המשימה עצמה תואמת לשלב
            const taskMatches = task.stage_id === selectedStage;
            
            // בדיקה רקורסיבית של תתי-משימות
            let childrenMatch = false;
            if (task.children && task.children.length > 0) {
              const matchingChildren = filterTasksByStage(task.children);
              childrenMatch = matchingChildren.length > 0;
              
              // עדכון תתי-המשימות המסוננות
              if (childrenMatch) {
                task.children = matchingChildren;
              }
            }
            
            return taskMatches || childrenMatch;
          });
        };
        
        filtered = filterTasksByStage(filtered);
      }
    
    // סינון לפי סטטוס
      if (statusFilter !== 'all') {
        const filterTasksByStatus = (tasks: TaskWithChildren[]): TaskWithChildren[] => {
          return tasks.filter(task => {
            // בדיקה אם המשימה עצמה תואמת לסטטוס
            const taskMatches = task.status === statusFilter;
            
            // בדיקה רקורסיבית של תתי-משימות
            let childrenMatch = false;
            if (task.children && task.children.length > 0) {
              const matchingChildren = filterTasksByStatus(task.children);
              childrenMatch = matchingChildren.length > 0;
              
              // עדכון תתי-המשימות המסוננות
              if (childrenMatch) {
                task.children = matchingChildren;
              }
            }
            
            return taskMatches || childrenMatch;
          });
        };
        
        filtered = filterTasksByStatus(filtered);
    }
    
      // סינון לפי חיפוש
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        
        const filterTasksBySearchTerm = (tasks: TaskWithChildren[]): TaskWithChildren[] => {
          return tasks.filter(task => {
            // בדיקה אם המשימה עצמה תואמת לחיפוש
            const taskMatches = 
              task.title.toLowerCase().includes(term) || 
              (task.description && task.description.toLowerCase().includes(term));
            
            // בדיקה רקורסיבית של תתי-משימות
            let childrenMatch = false;
            if (task.children && task.children.length > 0) {
              const matchingChildren = filterTasksBySearchTerm(task.children);
              childrenMatch = matchingChildren.length > 0;
  
              // עדכון תתי-המשימות המסוננות
              if (childrenMatch) {
                task.children = matchingChildren;
              }
            }
            
            return taskMatches || childrenMatch;
          });
        };
        
        filtered = filterTasksBySearchTerm(filtered);
      }
      
      setFilteredTasks(filtered);
    };
    
    filterTasks();
  }, [hierarchicalTasks, searchTerm, selectedStage, statusFilter]);
  
  // פונקציה להרחבה/כיווץ של כל המשימות
  const toggleExpandAll = () => {
    setExpandAll(!expandAll);
  };
  
  return (
    <Box>
      {/* כותרת וכפתורים */}
      <Flex justify="space-between" align="center" mb={4}>
        <Heading size="md">משימות בתצוגת עץ</Heading>
        
        <HStack>
          <Tooltip label={expandAll ? 'כווץ הכל' : 'הרחב הכל'}>
            <IconButton
              icon={expandAll ? <FiMinimize2 /> : <FiMaximize2 />}
              aria-label={expandAll ? 'כווץ הכל' : 'הרחב הכל'}
              onClick={toggleExpandAll}
              size="sm"
            />
          </Tooltip>
          
          <Tooltip label="הגדרות סינון">
            <IconButton
              icon={<FiFilter />}
              aria-label="סינון"
              onClick={() => setIsDrawerOpen(true)}
              size="sm"
            />
          </Tooltip>
        </HStack>
      </Flex>
      
      {/* חיפוש */}
      <InputGroup mb={4}>
        <Input
          placeholder="חפש משימות..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <InputRightElement>
          <SearchIcon color="gray.500" />
        </InputRightElement>
      </InputGroup>
      
      {/* תצוגת המשימות */}
      {loading ? (
        <Center p={10}>
          <Spinner size="xl" />
        </Center>
      ) : filteredTasks.length === 0 ? (
        <Box textAlign="center" p={10} bg="gray.50" borderRadius="md">
          <InfoIcon boxSize={10} color="gray.400" mb={4} />
          <Text fontSize="lg" fontWeight="medium">לא נמצאו משימות</Text>
          <Text color="gray.500">נסה לשנות את הגדרות הסינון או להוסיף משימות חדשות</Text>
        </Box>
      ) : (
        <Box position="relative">
          {filteredTasks.map(task => (
            <TaskNode
              key={task.id}
              task={task}
              children={task.children || []}
              level={0}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
            onStatusChange={onStatusChange}
              isFiltered={!!searchTerm || selectedStage !== 'all' || statusFilter !== 'all'}
          />
        ))}
        </Box>
        )}
      
      {/* מגירת סינון */}
      <Drawer
        isOpen={isDrawerOpen}
        placement="right"
        onClose={() => setIsDrawerOpen(false)}
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>הגדרות סינון</DrawerHeader>
          
          <DrawerBody>
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel>סינון לפי שלב</FormLabel>
                <Select
                  value={selectedStage}
                  onChange={(e) => setSelectedStage(e.target.value)}
                >
                  <option value="all">כל השלבים</option>
                  {stages.map(stage => (
                    <option key={stage.id} value={stage.id}>
                      {stage.title}
                    </option>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl>
                <FormLabel>סינון לפי סטטוס</FormLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">כל הסטטוסים</option>
                  <option value="todo">לביצוע</option>
                  <option value="in_progress">בתהליך</option>
                  <option value="review">בבדיקה</option>
                  <option value="done">הושלם</option>
                </Select>
              </FormControl>
              
              <Button
                colorScheme="blue"
                onClick={() => {
                  setSelectedStage('all');
                  setStatusFilter('all');
                  setSearchTerm('');
                }}
              >
                נקה סינון
              </Button>
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  );
};

export default TaskTree; 