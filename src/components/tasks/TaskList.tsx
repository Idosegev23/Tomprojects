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
} from '@chakra-ui/react';
import { FiPlus, FiFilter, FiEdit, FiTrash2, FiCalendar, FiMoreVertical } from 'react-icons/fi';
import { Task } from '@/types/supabase';
import taskService from '@/lib/services/taskService';
import TaskEditModal from '@/components/tasks/TaskEditModal';

interface TaskListProps {
  projectId: string;
  onTaskCreated?: (task: Task) => void;
  onTaskUpdated?: (task: Task) => void;
  onTaskDeleted?: (taskId: string) => void;
}

const TaskList: React.FC<TaskListProps> = ({ projectId, onTaskCreated, onTaskUpdated, onTaskDeleted }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  const toast = useToast();
  
  // טעינת המשימות
  useEffect(() => {
    const loadTasks = async () => {
      try {
        setLoading(true);
        const tasksData = await taskService.getTasks({ projectId });
        setTasks(tasksData);
      } catch (err) {
        console.error('Error loading tasks:', err);
        setError('אירעה שגיאה בטעינת המשימות');
        
        toast({
          title: 'שגיאה בטעינת משימות',
          description: err instanceof Error ? err.message : 'אירעה שגיאה לא ידועה',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadTasks();
  }, [projectId, toast]);
  
  // פונקציה לפתיחת מודל יצירת משימה חדשה
  const handleCreateTask = () => {
    setSelectedTask(null);
    setIsTaskModalOpen(true);
  };
  
  // פונקציה לפתיחת מודל עריכת משימה
  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  };
  
  // פונקציה למחיקת משימה
  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק משימה זו?')) {
      try {
        await taskService.deleteTask(taskId);
        setTasks(tasks.filter(task => task.id !== taskId));
        
        if (onTaskDeleted) {
          onTaskDeleted(taskId);
        }
        
        toast({
          title: 'המשימה נמחקה בהצלחה',
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
  
  // פונקציה לסינון המשימות
  const filteredTasks = tasks.filter(task => {
    // סינון לפי חיפוש
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // סינון לפי סטטוס
    const matchesStatus = !statusFilter || task.status === statusFilter;
    
    // סינון לפי עדיפות
    const matchesPriority = !priorityFilter || task.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });
  
  // פונקציה לקבלת צבע לפי סטטוס
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'todo':
      case 'לביצוע':
        return 'gray';
      case 'in progress':
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
        <Spinner size="xl" />
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
          >
            משימה חדשה
          </Button>
          
          {selectedTasks.length > 0 && (
            <Button
              leftIcon={<FiTrash2 />}
              colorScheme="red"
              variant="outline"
              onClick={handleDeleteSelected}
            >
              מחק נבחרים ({selectedTasks.length})
            </Button>
          )}
        </HStack>
      </Flex>
      
      {/* סינון וחיפוש */}
      <Flex mb={4} gap={2} wrap="wrap">
        <Input
          placeholder="חיפוש משימות..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          width={{ base: "100%", md: "300px" }}
        />
        
        <Select
          placeholder="סנן לפי סטטוס"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          width={{ base: "100%", md: "200px" }}
        >
          <option value="todo">לביצוע</option>
          <option value="in progress">בתהליך</option>
          <option value="review">לבדיקה</option>
          <option value="done">הושלם</option>
        </Select>
        
        <Select
          placeholder="סנן לפי עדיפות"
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          width={{ base: "100%", md: "200px" }}
        >
          <option value="high">גבוהה</option>
          <option value="medium">בינונית</option>
          <option value="low">נמוכה</option>
        </Select>
      </Flex>
      
      {/* רשימת משימות */}
      {filteredTasks.length === 0 ? (
        <Box textAlign="center" p={8} borderWidth="1px" borderRadius="md">
          <Text mb={4}>אין משימות להצגה</Text>
          <Button
            leftIcon={<FiPlus />}
            colorScheme="blue"
            onClick={handleCreateTask}
          >
            צור משימה חדשה
          </Button>
        </Box>
      ) : (
        <Box>
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
            <Box flex="2">כותרת</Box>
            <Box flex="1">סטטוס</Box>
            <Box flex="1">עדיפות</Box>
            <Box flex="1">תאריך יעד</Box>
            <Box flex="1">פעולות</Box>
          </Flex>
          
          {/* רשימת המשימות */}
          <VStack spacing={2} align="stretch">
            {filteredTasks.map(task => (
              <Flex
                key={task.id}
                p={3}
                borderWidth="1px"
                borderRadius="md"
                align="center"
                _hover={{ bg: "gray.50" }}
              >
                <Checkbox
                  isChecked={selectedTasks.includes(task.id)}
                  onChange={(e) => handleTaskSelection(task.id, e.target.checked)}
                  mr={2}
                />
                
                <Box flex={{ base: "1", md: "2" }}>
                  <Text fontWeight="medium">
                    {task.hierarchical_number && `${task.hierarchical_number}. `}
                    {task.title}
                  </Text>
                  {task.description && (
                    <Text fontSize="sm" color="gray.600" noOfLines={1}>
                      {task.description}
                    </Text>
                  )}
                </Box>
                
                <Box flex="1" display={{ base: "none", md: "block" }}>
                  <Badge colorScheme={getStatusColor(task.status)}>
                    {task.status}
                  </Badge>
                </Box>
                
                <Box flex="1" display={{ base: "none", md: "block" }}>
                  <Badge colorScheme={getPriorityColor(task.priority)}>
                    {task.priority}
                  </Badge>
                </Box>
                
                <Box flex="1" display={{ base: "none", md: "block" }}>
                  {task.due_date ? (
                    <Text fontSize="sm">
                      <FiCalendar style={{ display: "inline", marginLeft: "5px" }} />
                      {formatDate(task.due_date)}
                    </Text>
                  ) : (
                    <Text fontSize="sm" color="gray.500">לא נקבע</Text>
                  )}
                </Box>
                
                <Box flex="1">
                  <HStack justify="flex-end">
                    <IconButton
                      icon={<FiEdit />}
                      aria-label="ערוך משימה"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditTask(task)}
                    />
                    <IconButton
                      icon={<FiTrash2 />}
                      aria-label="מחק משימה"
                      size="sm"
                      variant="ghost"
                      colorScheme="red"
                      onClick={() => handleDeleteTask(task.id)}
                    />
                  </HStack>
                </Box>
              </Flex>
            ))}
          </VStack>
        </Box>
      )}
      
      {/* מודל יצירה/עריכת משימה */}
      {isTaskModalOpen && (
        <TaskEditModal
          isOpen={isTaskModalOpen}
          onClose={() => setIsTaskModalOpen(false)}
          task={selectedTask}
          projectId={projectId}
          onTaskCreated={onTaskCreated}
          onTaskUpdated={onTaskUpdated}
        />
      )}
    </Box>
  );
};

export default TaskList; 