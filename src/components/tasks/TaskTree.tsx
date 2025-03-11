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
  Select,
  Collapse,
  useDisclosure,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  Spinner
} from '@chakra-ui/react';
import { ChevronDownIcon, ChevronRightIcon, EditIcon, DeleteIcon, SearchIcon, SettingsIcon, InfoIcon } from '@chakra-ui/icons';
import { FiFilter, FiLink, FiMaximize2, FiMinimize2 } from 'react-icons/fi';
import { Task, Stage } from '@/types/supabase';
import stageService from '@/lib/services/stageService';
import { motion } from 'framer-motion';

// קומפוננטות מונפשות
const MotionBox = motion(Box);
const MotionFlex = motion(Flex);

interface TaskTreeProps {
  tasks: Task[];
  projectId: string;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
  onStatusChange?: (taskId: string, status: string) => void;
}

interface TaskNodeProps {
  task: Task;
  children: Task[];
  level: number;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
  onStatusChange?: (taskId: string, status: string) => void;
  isFiltered?: boolean;
}

interface StageGroupProps {
  stage: Stage;
  tasks: Task[];
  onEditTask?: (task: Task) => void;
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
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');
  const lineColor = useColorModeValue('gray.300', 'gray.600');
  
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
  
  // פונקציה לקבלת צבע לפי עדיפות
  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
      case 'גבוהה':
        return 'red';
      case 'medium':
      case 'בינונית':
        return 'orange';
      case 'low':
      case 'נמוכה':
        return 'green';
      default:
        return 'gray';
    }
  };
  
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };
  
  const handleStatusChange = () => {
    if (onStatusChange) {
      const newStatus = task.status === 'done' ? 'todo' : 'done';
      onStatusChange(task.id, newStatus);
    }
  };
  
  // המרת תאריך לפורמט מקומי
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'לא נקבע';
    
    try {
      return new Date(dateString).toLocaleDateString('he-IL');
    } catch (e) {
      return 'תאריך לא תקין';
    }
  };
  
  return (
    <MotionBox 
      mb={2}
      initial={isFiltered ? { opacity: 0, scale: 0.9 } : { opacity: 1, scale: 1 }}
      animate={isFiltered ? { opacity: 1, scale: 1 } : { opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      position="relative"
    >
      {/* קו אנכי המחבר בין משימות באותה רמה */}
      {level > 0 && (
        <Box
          position="absolute"
          left={`${level * 4 - 2}px`}
          top="-10px"
          bottom="50%"
          width="2px"
          bg={lineColor}
          zIndex={1}
        />
      )}
      
      {/* קו אופקי המחבר את המשימה לקו האנכי */}
      {level > 0 && (
        <Box
          position="absolute"
          left={`${level * 4 - 2}px`}
          top="50%"
          width="10px"
          height="2px"
          bg={lineColor}
          zIndex={1}
        />
      )}
      
      <MotionFlex
        p={3}
        bg={bgColor}
        borderWidth="1px"
        borderColor={isHovered ? `${getStatusColor(task.status)}.400` : borderColor}
        borderRadius="md"
        boxShadow={isHovered ? "md" : "sm"}
        _hover={{ bg: hoverBg }}
        alignItems="center"
        ml={level * 4}
        transition="all 0.2s"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        whileHover={{ y: -2 }}
      >
        {children.length > 0 && (
          <IconButton
            aria-label={isExpanded ? "צמצם" : "הרחב"}
            icon={<Icon as={isExpanded ? ChevronDownIcon : ChevronRightIcon} />}
            onClick={toggleExpand}
            mr={2}
            size="sm"
            variant="ghost"
            colorScheme={isExpanded ? "blue" : "gray"}
          />
        )}
        
        <Checkbox
          isChecked={task.status === 'done'}
          onChange={handleStatusChange}
          mr={3}
          colorScheme="green"
          size="lg"
        />
        
        <Tooltip label="מספר היררכי" placement="top">
          <Badge mr={3} colorScheme="purple" fontSize="sm" px={2} py={1}>
            {task.hierarchical_number || '-'}
          </Badge>
        </Tooltip>
        
        <Text 
          fontWeight="bold" 
          flex="1"
          textDecoration={task.status === 'done' ? 'line-through' : 'none'}
          color={task.status === 'done' ? 'gray.500' : 'inherit'}
        >
          {task.title}
        </Text>
        
        <Badge 
          colorScheme={getStatusColor(task.status)} 
          mr={3}
          px={2}
          py={1}
          borderRadius="full"
        >
          {task.status === 'todo' ? 'לביצוע' : 
           task.status === 'in_progress' ? 'בתהליך' : 
           task.status === 'review' ? 'בבדיקה' : 
           task.status === 'done' ? 'הושלם' : task.status}
        </Badge>
        
        <Badge 
          colorScheme={getPriorityColor(task.priority)} 
          mr={3}
          px={2}
          py={1}
          borderRadius="full"
        >
          {task.priority === 'high' ? 'גבוהה' : 
           task.priority === 'medium' ? 'בינונית' : 
           task.priority === 'low' ? 'נמוכה' : task.priority}
        </Badge>
        
        <Tooltip label="תאריך יעד">
          <Text fontSize="sm" color="gray.500" mr={3}>
            {formatDate(task.due_date)}
          </Text>
        </Tooltip>
        
        <HStack spacing={1}>
          {onEditTask && (
            <Tooltip label="ערוך משימה">
              <IconButton
                size="sm"
                variant="ghost"
                colorScheme="blue"
                icon={<EditIcon />}
                onClick={() => onEditTask(task)}
                aria-label="ערוך משימה"
              />
            </Tooltip>
          )}
          
          {onDeleteTask && (
            <Tooltip label="מחק משימה">
              <IconButton
                size="sm"
                variant="ghost"
                colorScheme="red"
                icon={<DeleteIcon />}
                onClick={() => onDeleteTask(task.id)}
                aria-label="מחק משימה"
              />
            </Tooltip>
          )}
        </HStack>
      </MotionFlex>
      
      <Collapse in={isExpanded} animateOpacity>
        {children.length > 0 && (
          <Box mt={2}>
            {children.map(childTask => (
              <TaskNode
                key={childTask.id}
                task={childTask}
                children={children.filter(t => t.parent_task_id === childTask.id)}
                level={level + 1}
                onEditTask={onEditTask}
                onDeleteTask={onDeleteTask}
                onStatusChange={onStatusChange}
              />
            ))}
          </Box>
        )}
      </Collapse>
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
  const filterTasks = (taskList: Task[]) => {
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
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const { isOpen: isFilterOpen, onToggle: onFilterToggle } = useDisclosure();
  const { isOpen: isDrawerOpen, onOpen: onDrawerOpen, onClose: onDrawerClose } = useDisclosure();
  
  // טעינת השלבים של הפרויקט
  useEffect(() => {
    const loadStages = async () => {
      try {
        if (projectId) {
          const projectStages = await stageService.getProjectStages(projectId);
          setStages(projectStages);
        }
        setLoading(false);
      } catch (error) {
        console.error('שגיאה בטעינת שלבי הפרויקט:', error);
        setLoading(false);
      }
    };
    
    loadStages();
  }, [projectId]);
  
  // ארגון המשימות לפי שלבים
  const getTasksByStage = (stageId: string) => {
    let filteredTasks = tasks.filter(task => task.stage_id === stageId);
    
    // סינון לפי סטטוס
    if (filterStatus) {
      filteredTasks = filteredTasks.filter(task => task.status === filterStatus);
    }
    
    // סינון לפי עדיפות
    if (filterPriority) {
      filteredTasks = filteredTasks.filter(task => task.priority === filterPriority);
    }
    
    return filteredTasks;
  };
  
  // ארגון המשימות שאינן משויכות לשלב
  const getTasksWithoutStage = () => {
    let filteredTasks = tasks.filter(task => !task.stage_id);
    
    // סינון לפי סטטוס
    if (filterStatus) {
      filteredTasks = filteredTasks.filter(task => task.status === filterStatus);
    }
    
    // סינון לפי עדיפות
    if (filterPriority) {
      filteredTasks = filteredTasks.filter(task => task.priority === filterPriority);
    }
    
    return filteredTasks;
  };
  
  // תצוגת טעינה
  if (loading) {
    return (
      <Flex justify="center" align="center" h="200px">
        <Spinner size="xl" thickness="4px" speed="0.65s" color="blue.500" />
      </Flex>
    );
  }
  
  return (
    <Box>
      <Flex justify="space-between" align="center" mb={4}>
        <Heading size="md">עץ משימות היררכי</Heading>
        
        <HStack>
          <Tooltip label="הגדרות תצוגה">
            <IconButton
              aria-label="הגדרות תצוגה"
              icon={<SettingsIcon />}
              onClick={onDrawerOpen}
              size="sm"
              variant="outline"
            />
          </Tooltip>
          
          <Tooltip label="סינון משימות">
            <IconButton
              aria-label="סינון משימות"
              icon={<FiFilter />}
              onClick={onFilterToggle}
              size="sm"
              variant="outline"
              colorScheme={filterStatus || filterPriority ? "blue" : "gray"}
            />
          </Tooltip>
          
          <Tooltip label="חיפוש משימות">
            <InputGroup size="sm" width="200px">
              <Input
                placeholder="חיפוש משימות..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                borderRadius="md"
              />
            </InputGroup>
          </Tooltip>
        </HStack>
      </Flex>
      
      <Collapse in={isFilterOpen} animateOpacity>
        <Box mb={4} p={4} borderWidth="1px" borderRadius="md">
          <HStack spacing={4}>
            <Box>
              <Text fontSize="sm" mb={1}>סטטוס</Text>
              <Select
                size="sm"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                placeholder="כל הסטטוסים"
                width="150px"
              >
                <option value="todo">לביצוע</option>
                <option value="in_progress">בתהליך</option>
                <option value="review">בבדיקה</option>
                <option value="done">הושלם</option>
              </Select>
            </Box>
            
            <Box>
              <Text fontSize="sm" mb={1}>עדיפות</Text>
              <Select
                size="sm"
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                placeholder="כל העדיפויות"
                width="150px"
              >
                <option value="high">גבוהה</option>
                <option value="medium">בינונית</option>
                <option value="low">נמוכה</option>
              </Select>
            </Box>
            
            <Button
              size="sm"
              colorScheme="red"
              variant="outline"
              onClick={() => {
                setFilterStatus('');
                setFilterPriority('');
              }}
              isDisabled={!filterStatus && !filterPriority}
            >
              נקה סינון
            </Button>
          </HStack>
        </Box>
      </Collapse>
      
      <VStack spacing={4} align="stretch">
        {stages.map(stage => (
          <StageGroup
            key={stage.id}
            stage={stage}
            tasks={getTasksByStage(stage.id)}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
            onStatusChange={onStatusChange}
            searchTerm={searchTerm}
          />
        ))}
        
        {getTasksWithoutStage().length > 0 && (
          <StageGroup
            stage={{ id: 'no-stage', title: 'משימות ללא שלב', description: '', project_id: projectId, created_at: null, updated_at: null }}
            tasks={getTasksWithoutStage()}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
            onStatusChange={onStatusChange}
            searchTerm={searchTerm}
          />
        )}
      </VStack>
      
      {/* מגירת הגדרות תצוגה */}
      <Drawer isOpen={isDrawerOpen} placement="left" onClose={onDrawerClose}>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>הגדרות תצוגת עץ</DrawerHeader>
          <DrawerBody>
            <VStack spacing={4} align="stretch">
              <Box>
                <Text fontWeight="bold" mb={2}>אפשרויות תצוגה</Text>
                <VStack align="start">
                  <Checkbox defaultChecked>הצג מספרים היררכיים</Checkbox>
                  <Checkbox defaultChecked>הצג תאריכי יעד</Checkbox>
                  <Checkbox defaultChecked>הצג עדיפויות</Checkbox>
                  <Checkbox defaultChecked>הצג סטטוסים</Checkbox>
                </VStack>
              </Box>
              
              <Divider />
              
              <Box>
                <Text fontWeight="bold" mb={2}>מיון משימות לפי</Text>
                <Select defaultValue="hierarchical">
                  <option value="hierarchical">מספר היררכי</option>
                  <option value="dueDate">תאריך יעד</option>
                  <option value="priority">עדיפות</option>
                  <option value="status">סטטוס</option>
                </Select>
              </Box>
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  );
};

export default TaskTree; 