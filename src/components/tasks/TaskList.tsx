import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Button,
  Flex,
  VStack,
  HStack,
  Badge,
  Spinner,
  useToast,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Input,
  Select,
  Checkbox,
  Card,
  CardBody,
  Tag,
  TagLabel,
  TagLeftIcon,
  Tooltip,
  Divider,
  useColorModeValue,
} from '@chakra-ui/react';
import { 
  FiPlus, 
  FiFilter, 
  FiEdit, 
  FiTrash2, 
  FiCalendar, 
  FiMoreVertical, 
  FiClock, 
  FiFlag, 
  FiCheck, 
  FiCheckCircle, 
  FiAlertCircle, 
  FiClock as FiClockCircle,
  FiCreditCard,
  FiStar,
  FiActivity,
  FiList,
  FiLayers,
} from 'react-icons/fi';
import { Task, Stage } from '@/types/supabase';
import taskService from '@/lib/services/taskService';
import stageService from '@/lib/services/stageService';
import TaskEditModal from '@/components/tasks/TaskEditModal';
import QuickAddTask from '@/components/tasks/QuickAddTask';

interface TaskListProps {
  projectId: string;
  onTaskCreated?: (task: Task) => void;
  onTaskUpdated?: (task: Task) => void;
  onTaskDeleted?: (taskId: string) => void;
}

// הרחבת ממשק Stage כדי לכלול את שדה color
interface ExtendedStage extends Stage {
  color?: string;
  status?: string;
}

// הוספת ממשק מורחב עבור משימה עם שם השלב
interface TaskWithStage extends Task {
  stageName?: string;
  stageColor?: string;
}

const TaskList: React.FC<TaskListProps> = ({ projectId, onTaskCreated, onTaskUpdated, onTaskDeleted }) => {
  const [tasks, setTasks] = useState<TaskWithStage[]>([]);
  const [stages, setStages] = useState<ExtendedStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [stageFilter, setStageFilter] = useState<string>('');
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  const toast = useToast();
  const boxBgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const hoverBgColor = useColorModeValue('gray.50', 'gray.700');
  
  // עדכון טעינת המשימות והשלבים
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // טעינת שלבים
        const stagesData = await stageService.getProjectStages(projectId);
        setStages(stagesData as ExtendedStage[]);
        
        // טעינת משימות
        const tasksData = await taskService.getTasks({ projectId });
        
        // הוספת שם השלב לכל משימה
        const tasksWithStage: TaskWithStage[] = tasksData.map(task => {
          const stage = stagesData.find(s => s.id === task.stage_id) as ExtendedStage | undefined;
          return {
            ...task,
            stageName: stage?.title || 'ללא שלב',
            stageColor: stage?.color || '',
          };
        });
        
        setTasks(tasksWithStage);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('אירעה שגיאה בטעינת הנתונים');
        
        toast({
          title: 'שגיאה בטעינת נתונים',
          description: err instanceof Error ? err.message : 'אירעה שגיאה לא ידועה',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [projectId, toast]);
  
  // פונקציה לפתיחת מודל יצירת משימה חדשה
  const handleCreateTask = () => {
    setSelectedTask(null);
    setIsTaskModalOpen(true);
  };
  
  // פונקציה לטיפול ביצירת משימה חדשה
  const handleTaskCreated = (newTask: Task) => {
    // הוספת השלב למשימה החדשה
    const stage = stages.find(s => s.id === newTask.stage_id);
    const taskWithStage: TaskWithStage = {
      ...newTask,
      stageName: stage?.title || 'ללא שלב',
      stageColor: stage?.color || '',
    };
    
    setTasks([...tasks, taskWithStage]);
    
    if (onTaskCreated) {
      onTaskCreated(newTask);
    }
    
    toast({
      title: 'משימה נוצרה בהצלחה',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };
  
  // פונקציה לטיפול בעדכון משימה
  const handleTaskUpdated = (updatedTask: Task) => {
    // הוספת השלב למשימה המעודכנת
    const stage = stages.find(s => s.id === updatedTask.stage_id);
    const taskWithStage: TaskWithStage = {
      ...updatedTask,
      stageName: stage?.title || 'ללא שלב',
      stageColor: stage?.color || '',
    };
    
    setTasks(tasks.map(task => (task.id === updatedTask.id ? taskWithStage : task)));
    setSelectedTask(null);
    setIsTaskModalOpen(false);
    
    if (onTaskUpdated) {
      onTaskUpdated(updatedTask);
    }
    
    toast({
      title: 'משימה עודכנה בהצלחה',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };
  
  // פונקציה לטיפול במחיקת משימה
  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק משימה זו?')) {
      try {
        await taskService.deleteTask(taskId);
        
        setTasks(tasks.filter(task => task.id !== taskId));
        
        if (onTaskDeleted) {
          onTaskDeleted(taskId);
        }
        
        toast({
          title: 'משימה נמחקה בהצלחה',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } catch (err) {
        console.error('Error deleting task:', err);
        
        toast({
          title: 'שגיאה במחיקת המשימה',
          description: err instanceof Error ? err.message : 'אירעה שגיאה לא ידועה',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    }
  };
  
  // פונקציה לפתיחת מודל עריכת משימה
  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  };
  
  // פונקציה לסינון המשימות
  const filteredTasks = tasks.filter(task => {
    // סינון לפי חיפוש
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // סינון לפי סטטוס
    const matchesStatus = !statusFilter || task.status === statusFilter;
    
    // סינון לפי עדיפות
    const matchesPriority = !priorityFilter || task.priority === priorityFilter;
    
    // סינון לפי קטגוריה
    const matchesCategory = !categoryFilter || task.category === categoryFilter;
    
    // סינון לפי שלב
    const matchesStage = !stageFilter || task.stage_id === stageFilter;
    
    return matchesSearch && matchesStatus && matchesPriority && matchesCategory && matchesStage;
  });
  
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
      case 'לבדיקה':
        return 'orange';
      case 'done':
      case 'הושלם':
        return 'green';
      default:
        return 'gray';
    }
  };
  
  // פונקציה לקבלת אייקון לפי סטטוס
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'todo':
      case 'לביצוע':
        return FiClock;
      case 'in_progress':
      case 'בתהליך':
        return FiActivity;
      case 'review':
      case 'לבדיקה':
        return FiStar;
      case 'done':
      case 'הושלם':
        return FiCheckCircle;
      default:
        return FiList;
    }
  };
  
  // פונקציה לקבלת טקסט סטטוס בעברית
  const getStatusText = (status: string) => {
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
  
  // פונקציה לקבלת אייקון לפי עדיפות 
  const getPriorityIcon = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
      case 'גבוהה':
        return FiAlertCircle;
      case 'medium':
      case 'בינונית':
        return FiFlag;
      case 'low':
      case 'נמוכה':
        return FiCheck;
      default:
        return FiFlag;
    }
  };
  
  // פונקציה לקבלת טקסט עדיפות בעברית
  const getPriorityText = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'גבוהה';
      case 'medium':
        return 'בינונית';
      case 'low':
        return 'נמוכה';
      default:
        return priority;
    }
  };
  
  // פונקציה להמרת תאריך לפורמט מקומי
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'לא נקבע';
    
    try {
      return new Date(dateString).toLocaleDateString('he-IL');
    } catch (e) {
      return 'תאריך לא תקין';
    }
  };
  
  // פונקציה לטיפול בבחירת משימה
  const handleTaskSelection = (taskId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedTasks([...selectedTasks, taskId]);
    } else {
      setSelectedTasks(selectedTasks.filter(id => id !== taskId));
    }
  };
  
  // פונקציה לטיפול בבחירת כל המשימות
  const handleSelectAll = (isSelected: boolean) => {
    if (isSelected) {
      setSelectedTasks(filteredTasks.map(task => task.id));
    } else {
      setSelectedTasks([]);
    }
  };
  
  // פונקציה לטיפול במחיקת משימות נבחרות
  const handleDeleteSelected = async () => {
    if (selectedTasks.length === 0) return;
    
    if (window.confirm(`האם אתה בטוח שברצונך למחוק ${selectedTasks.length} משימות?`)) {
      try {
        // מחיקת כל המשימות הנבחרות
        await Promise.all(selectedTasks.map(taskId => taskService.deleteTask(taskId)));
        
        // עדכון הרשימה המקומית
        setTasks(tasks.filter(task => !selectedTasks.includes(task.id)));
        
        // עדכון ההורה
        if (onTaskDeleted) {
          selectedTasks.forEach(taskId => onTaskDeleted(taskId));
        }
        
        // איפוס הבחירה
        setSelectedTasks([]);
        
        toast({
          title: 'המשימות נמחקו בהצלחה',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } catch (err) {
        console.error('Error deleting tasks:', err);
        
        toast({
          title: 'שגיאה במחיקת המשימות',
          description: err instanceof Error ? err.message : 'אירעה שגיאה לא ידועה',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    }
  };
  
  if (loading) {
    return (
      <Flex justify="center" align="center" p={8}>
        <Spinner size="xl" thickness="4px" color="blue.500" />
      </Flex>
    );
  }
  
  if (error) {
    return (
      <Box p={4} textAlign="center">
        <Text color="red.500">{error}</Text>
      </Box>
    );
  }
  
  return (
    <Box>
      {/* כותרת ופעולות */}
      <Flex justify="space-between" align="center" mb={4} wrap="wrap" gap={2}>
        <Heading size="md">רשימת משימות</Heading>
        
        <HStack>
          <Button
            leftIcon={<FiPlus />}
            colorScheme="blue"
            onClick={handleCreateTask}
            size={{ base: 'sm', md: 'md' }}
            boxShadow="sm"
          >
            משימה חדשה
          </Button>
          
          {selectedTasks.length > 0 && (
            <Button
              leftIcon={<FiTrash2 />}
              colorScheme="red"
              variant="outline"
              onClick={handleDeleteSelected}
              size={{ base: 'sm', md: 'md' }}
            >
              מחק נבחרים ({selectedTasks.length})
            </Button>
          )}
        </HStack>
      </Flex>
      
      {/* הוספת משימה מהירה */}
      <Card variant="outline" mb={4} boxShadow="sm">
        <CardBody>
          <QuickAddTask projectId={projectId} onTaskCreated={handleTaskCreated} />
        </CardBody>
      </Card>
      
      {/* סינון וחיפוש */}
      <Card variant="outline" mb={4} boxShadow="sm">
        <CardBody>
          <HStack mb={2} align="center">
            <FiFilter />
            <Text fontWeight="bold">סינון וחיפוש</Text>
          </HStack>
          <Divider mb={3} />
          <Flex gap={2} wrap="wrap">
            <Input
              placeholder="חיפוש משימות..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              width={{ base: "100%", md: "300px" }}
              mb={{ base: 2, md: 0 }}
            />
            
            <Select
              placeholder="סנן לפי סטטוס"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              width={{ base: "100%", md: "200px" }}
              mb={{ base: 2, md: 0 }}
            >
              <option value="todo">לביצוע</option>
              <option value="in_progress">בתהליך</option>
              <option value="review">בבדיקה</option>
              <option value="done">הושלם</option>
            </Select>
            
            <Select
              placeholder="סנן לפי עדיפות"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              width={{ base: "100%", md: "200px" }}
              mb={{ base: 2, md: 0 }}
            >
              <option value="low">נמוכה</option>
              <option value="medium">בינונית</option>
              <option value="high">גבוהה</option>
            </Select>
            
            <Select
              placeholder="סנן לפי קטגוריה"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              width={{ base: "100%", md: "200px" }}
            >
              <option value="">הכל</option>
              <option value="פיתוח">פיתוח</option>
              <option value="עיצוב">עיצוב</option>
              <option value="תוכן">תוכן</option>
              <option value="שיווק">שיווק</option>
              <option value="תשתיות">תשתיות</option>
              <option value="אחר">אחר</option>
            </Select>
            
            <Box>
              <Text fontWeight="bold" mb={2}>שלב</Text>
              <Select 
                placeholder="כל השלבים" 
                value={stageFilter} 
                onChange={(e) => setStageFilter(e.target.value)}
                size="sm"
              >
                <option value="">ללא שלב</option>
                {stages.map(stage => (
                  <option key={stage.id} value={stage.id}>{stage.title}</option>
                ))}
              </Select>
            </Box>
          </Flex>
          <Button 
            size="sm"
            onClick={() => {
              setStatusFilter('');
              setPriorityFilter('');
              setCategoryFilter('');
              setStageFilter('');
            }}
          >
            נקה סינון
          </Button>
        </CardBody>
      </Card>
      
      {/* רשימת משימות */}
      {filteredTasks.length === 0 ? (
        <Card variant="outline" p={8} textAlign="center" boxShadow="md">
          <CardBody>
            <Text mb={4} fontSize="lg">אין משימות להצגה</Text>
            <Button
              leftIcon={<FiPlus />}
              colorScheme="blue"
              onClick={handleCreateTask}
              size="md"
            >
              צור משימה חדשה
            </Button>
          </CardBody>
        </Card>
      ) : (
        <Card variant="outline" boxShadow="sm">
          <CardBody p={0}>
            {/* כותרת הטבלה */}
            <Flex
              bg="gray.100"
              p={3}
              borderTopRadius="md"
              fontWeight="bold"
              display={{ base: "none", md: "flex" }}
            >
              <Checkbox
                isChecked={selectedTasks.length === filteredTasks.length && filteredTasks.length > 0}
                onChange={(e) => handleSelectAll(e.target.checked)}
                mr={2}
              />
              <Box flex="2">משימה</Box>
              <Box flex="1" display={{ base: "none", md: "block" }}>שלב</Box>
              <Box flex="1" display={{ base: "none", md: "block" }}>סטטוס</Box>
              <Box flex="1" display={{ base: "none", md: "block" }}>עדיפות</Box>
              <Box flex="1" display={{ base: "none", md: "block" }}>תאריך יעד</Box>
              <Box flex="1" display={{ base: "none", md: "block" }}>פעולות</Box>
            </Flex>
            
            {/* רשימת המשימות */}
            <VStack spacing={0} align="stretch" divider={<Divider />}>
              {filteredTasks.map(task => (
                <Flex
                  key={task.id}
                  p={4}
                  align="center"
                  _hover={{ bg: hoverBgColor }}
                  transition="background-color 0.2s"
                  borderBottom="1px solid"
                  borderBottomColor={borderColor}
                >
                  <Checkbox
                    isChecked={selectedTasks.includes(task.id)}
                    onChange={(e) => handleTaskSelection(task.id, e.target.checked)}
                    mr={2}
                  />
                  
                  <Box flex={{ base: "1", md: "2" }}>
                    <Text fontWeight="semibold" fontSize="md">
                      {task.hierarchical_number && (
                        <Tag size="sm" mr={2} bgColor="blue.50" color="blue.800" fontSize="xs">
                          {task.hierarchical_number}
                        </Tag>
                      )}
                      <Text 
                        fontWeight="bold"
                        textDecoration={task.status === 'done' ? 'line-through' : 'none'}
                        opacity={task.status === 'done' ? 0.7 : 1}
                      >
                        {task.title}
                      </Text>
                    </Text>
                    {task.description && (
                      <Text fontSize="sm" color="gray.600" noOfLines={1} mt={1}>
                        {task.description}
                      </Text>
                    )}
                  </Box>
                  
                  {/* שלב */}
                  <Box flex="1" display={{ base: "none", md: "block" }}>
                    <Tag 
                      size="sm" 
                      variant="subtle" 
                      colorScheme={task.stageColor || "gray"}
                    >
                      <TagLeftIcon as={FiLayers} />
                      <TagLabel>{task.stageName}</TagLabel>
                    </Tag>
                  </Box>
                  
                  <Box flex="1" display={{ base: "none", md: "block" }}>
                    <Tag colorScheme={getStatusColor(task.status)} size="md" borderRadius="full">
                      <TagLeftIcon as={getStatusIcon(task.status)} />
                      <TagLabel>{getStatusText(task.status)}</TagLabel>
                    </Tag>
                  </Box>
                  
                  <Box flex="1" display={{ base: "none", md: "block" }}>
                    <Tag colorScheme={getPriorityColor(task.priority)} size="md" borderRadius="full">
                      <TagLeftIcon as={getPriorityIcon(task.priority)} />
                      <TagLabel>{getPriorityText(task.priority)}</TagLabel>
                    </Tag>
                  </Box>
                  
                  <Box flex="1" display={{ base: "none", md: "block" }}>
                    {task.due_date ? (
                      <Tag size="md" colorScheme="purple" borderRadius="full">
                        <TagLeftIcon as={FiCalendar} />
                        <TagLabel>{formatDate(task.due_date)}</TagLabel>
                      </Tag>
                    ) : (
                      <Text fontSize="sm" color="gray.500">לא נקבע</Text>
                    )}
                  </Box>
                  
                  <Box flex="1" textAlign="end">
                    <Tooltip label="ערוך משימה">
                      <IconButton
                        icon={<FiEdit />}
                        aria-label="ערוך משימה"
                        colorScheme="blue"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditTask(task)}
                        mr={1}
                      />
                    </Tooltip>
                    <Tooltip label="מחק משימה">
                      <IconButton
                        icon={<FiTrash2 />}
                        aria-label="מחק משימה"
                        colorScheme="red"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTask(task.id)}
                      />
                    </Tooltip>
                  </Box>
                </Flex>
              ))}
            </VStack>
          </CardBody>
        </Card>
      )}
      
      {/* מודל עריכת משימה */}
      <TaskEditModal 
        isOpen={isTaskModalOpen} 
        onClose={() => {
          setIsTaskModalOpen(false);
          setSelectedTask(null);
        }} 
        task={selectedTask as any} 
        projectId={projectId}
        onTaskCreated={handleTaskCreated as any} 
        onTaskUpdated={handleTaskUpdated as any} 
      />
    </Box>
  );
};

export default TaskList; 