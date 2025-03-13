import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Select,
  FormErrorMessage,
  VStack,
  HStack,
  useToast,
  Flex,
  Box,
  Divider,
  Text,
  Switch,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  IconButton,
  Badge,
  useColorModeValue,
  Tooltip,
  Collapse,
  List,
  ListItem,
  ListIcon,
  Spinner,
  Center,
  Heading,
} from '@chakra-ui/react';
import { AddIcon, DeleteIcon, ChevronDownIcon, ChevronRightIcon, EditIcon } from '@chakra-ui/icons';
import { Task } from '@/types/supabase';
import taskService from '@/lib/services/taskService';

interface TaskEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  projectId: string;
  onTaskCreated?: (task: Task) => void;
  onTaskUpdated?: (task: Task) => void;
}

const TaskEditModal: React.FC<TaskEditModalProps> = ({
  isOpen,
  onClose,
  task,
  projectId,
  onTaskCreated,
  onTaskUpdated,
}) => {
  const isEditMode = !!task;
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    start_date: '',
    due_date: '',
    estimated_hours: 0,
    project_id: projectId,
    parent_task_id: null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [parentTasks, setParentTasks] = useState<Task[]>([]);
  const [isSubtask, setIsSubtask] = useState(false);
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [loadingSubtasks, setLoadingSubtasks] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [expandedSubtasks, setExpandedSubtasks] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState(0);
  
  const toast = useToast();
  
  // טעינת נתוני המשימה בעת עריכה
  useEffect(() => {
    if (task) {
      setFormData({
        ...task,
        estimated_hours: task.estimated_hours || 0,
        start_date: task.start_date ? task.start_date.split('T')[0] : '',
        due_date: task.due_date ? task.due_date.split('T')[0] : '',
      });
      setIsSubtask(!!task.parent_task_id);
      
      // טעינת תתי-משימות אם זו משימת אב
      if (isEditMode) {
        loadSubtasks(task.id);
      }
    } else {
      // איפוס הטופס בעת יצירת משימה חדשה
      setFormData({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        start_date: '',
        due_date: '',
        estimated_hours: 0,
        project_id: projectId,
        parent_task_id: null,
      });
      setIsSubtask(false);
      setSubtasks([]);
    }
    
    // טעינת משימות אב פוטנציאליות
    const loadParentTasks = async () => {
      try {
        const tasks = await taskService.getTasks({ projectId });
        // סינון משימות שיכולות להיות משימות אב (לא כולל את המשימה הנוכחית)
        const potentialParents = tasks.filter(t => !task || t.id !== task.id);
        setParentTasks(potentialParents);
      } catch (error) {
        console.error('Error loading parent tasks:', error);
      }
    };
    
    loadParentTasks();
  }, [task, projectId, isEditMode]);
  
  // טעינת תתי-משימות
  const loadSubtasks = async (taskId: string) => {
    setLoadingSubtasks(true);
    try {
      const taskHierarchy = await taskService.getTaskHierarchy(taskId);
      // מסננים את משימת האב עצמה
      const childTasks = taskHierarchy.filter(t => t.id !== taskId);
      setSubtasks(childTasks);
    } catch (error) {
      console.error('Error loading subtasks:', error);
      toast({
        title: 'שגיאה בטעינת תתי-משימות',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoadingSubtasks(false);
    }
  };
  
  // טיפול בשינויים בטופס
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // ניקוי שגיאות בעת שינוי
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  // טיפול בשינוי מספר
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value === '' ? 0 : parseFloat(value) }));
  };
  
  // טיפול בשינוי סוג המשימה (רגילה/תת-משימה)
  const handleSubtaskToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setIsSubtask(isChecked);
    
    if (!isChecked) {
      // אם זו לא תת-משימה, מאפסים את משימת האב
      setFormData(prev => ({ ...prev, parent_task_id: null }));
    }
  };
  
  // וולידציה של הטופס
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title?.trim()) {
      newErrors.title = 'כותרת המשימה היא שדה חובה';
    }
    
    if (isSubtask && !formData.parent_task_id) {
      newErrors.parent_task_id = 'יש לבחור משימת אב';
    }
    
    if (formData.start_date && formData.due_date && new Date(formData.start_date) > new Date(formData.due_date)) {
      newErrors.due_date = 'תאריך היעד חייב להיות אחרי תאריך ההתחלה';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // שמירת המשימה
  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      
      // הכנת הנתונים לשמירה
      const taskData = {
        ...formData,
        project_id: projectId,
      };
      
      let savedTask: Task;
      
      if (isEditMode) {
        // עדכון משימה קיימת
        savedTask = await taskService.updateTask(task!.id, taskData);
        
        toast({
          title: 'המשימה עודכנה בהצלחה',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        
        if (onTaskUpdated) {
          onTaskUpdated(savedTask);
        }
      } else {
        // יצירת משימה חדשה
        savedTask = await taskService.createTask(taskData as any);
        
        toast({
          title: 'המשימה נוצרה בהצלחה',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        
        if (onTaskCreated) {
          onTaskCreated(savedTask);
        }
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving task:', error);
      
      toast({
        title: isEditMode ? 'שגיאה בעדכון המשימה' : 'שגיאה ביצירת המשימה',
        description: error instanceof Error ? error.message : 'אירעה שגיאה לא ידועה',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };
  
  // הוספת תת-משימה חדשה
  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim() || !task) return;
    
    try {
      setLoading(true);
      
      const newSubtask: Partial<Task> = {
        title: newSubtaskTitle,
        description: '',
        status: 'todo',
        priority: formData.priority,
        project_id: projectId,
        parent_task_id: task.id,
      };
      
      const savedSubtask = await taskService.createTask(newSubtask as any);
      
      toast({
        title: 'תת-המשימה נוצרה בהצלחה',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // עדכון רשימת תתי-המשימות
      setSubtasks(prev => [...prev, savedSubtask]);
      setNewSubtaskTitle('');
      
      // עדכון המשימה הראשית אם צריך
      if (onTaskUpdated) {
        onTaskUpdated(task);
      }
    } catch (error) {
      console.error('Error creating subtask:', error);
      
      toast({
        title: 'שגיאה ביצירת תת-המשימה',
        description: error instanceof Error ? error.message : 'אירעה שגיאה לא ידועה',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };
  
  // מחיקת תת-משימה
  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את תת-המשימה הזו?')) return;
    
    try {
      setLoading(true);
      
      await taskService.deleteTask(subtaskId);
      
      toast({
        title: 'תת-המשימה נמחקה בהצלחה',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // עדכון רשימת תתי-המשימות
      setSubtasks(prev => prev.filter(st => st.id !== subtaskId));
      
      // עדכון המשימה הראשית אם צריך
      if (task && onTaskUpdated) {
        onTaskUpdated(task);
      }
    } catch (error) {
      console.error('Error deleting subtask:', error);
      
      toast({
        title: 'שגיאה במחיקת תת-המשימה',
        description: error instanceof Error ? error.message : 'אירעה שגיאה לא ידועה',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };
  
  // פתיחה/סגירה של תת-משימה בתצוגת העץ
  const toggleSubtask = (subtaskId: string) => {
    setExpandedSubtasks(prev => ({
      ...prev,
      [subtaskId]: !prev[subtaskId]
    }));
  };
  
  // רינדור של תת-משימה בתצוגת העץ
  const renderSubtaskItem = (subtask: Task, level: number = 0) => {
    const isExpanded = expandedSubtasks[subtask.id] || false;
    const childSubtasks = subtasks.filter(st => st.parent_task_id === subtask.id);
    const hasChildren = childSubtasks.length > 0;
    
    return (
      <Box key={subtask.id} mr={level * 4} mb={2}>
        <Flex align="center" p={2} borderWidth="1px" borderRadius="md" bg={useColorModeValue('gray.50', 'gray.700')}>
          {hasChildren && (
            <IconButton
              icon={isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
              size="sm"
              variant="ghost"
              aria-label={isExpanded ? 'כווץ' : 'הרחב'}
              onClick={() => toggleSubtask(subtask.id)}
              mr={2}
            />
          )}
          {!hasChildren && <Box w={8} />}
          
          <Text flex="1" fontWeight="medium" isTruncated>
            {subtask.hierarchical_number && (
              <Badge mr={2} colorScheme="blue">{subtask.hierarchical_number}</Badge>
            )}
            {subtask.title}
          </Text>
          
          <Badge colorScheme={getStatusColor(subtask.status)} mr={2}>
            {getStatusLabel(subtask.status)}
          </Badge>
          
          <Tooltip label="ערוך תת-משימה">
            <IconButton
              icon={<EditIcon />}
              size="sm"
              aria-label="ערוך"
              variant="ghost"
              onClick={() => {
                if (onClose && onTaskUpdated) {
                  onClose();
                  setTimeout(() => {
                    onTaskUpdated(subtask);
                  }, 100);
                }
              }}
              mr={1}
            />
          </Tooltip>
          
          <Tooltip label="מחק תת-משימה">
            <IconButton
              icon={<DeleteIcon />}
              size="sm"
              aria-label="מחק"
              variant="ghost"
              colorScheme="red"
              onClick={() => handleDeleteSubtask(subtask.id)}
            />
          </Tooltip>
        </Flex>
        
        {hasChildren && isExpanded && (
          <Box mr={4} borderLeftWidth="1px" borderLeftColor="gray.200" pr={2}>
            {childSubtasks.map(child => renderSubtaskItem(child, level + 1))}
          </Box>
        )}
      </Box>
    );
  };
  
  // פונקציה עזר לקבלת צבע לפי סטטוס
  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'todo': return 'gray';
      case 'in_progress': return 'blue';
      case 'review': return 'orange';
      case 'done': return 'green';
      default: return 'gray';
    }
  };
  
  // פונקציה עזר לקבלת תווית לפי סטטוס
  const getStatusLabel = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'todo': return 'לביצוע';
      case 'in_progress': return 'בתהליך';
      case 'review': return 'בבדיקה';
      case 'done': return 'הושלם';
      default: return status;
    }
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{isEditMode ? 'עריכת משימה' : 'יצירת משימה חדשה'}</ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          <Tabs isFitted variant="enclosed" index={activeTab} onChange={setActiveTab}>
            <TabList mb="1em">
              <Tab>פרטי משימה</Tab>
              {isEditMode && <Tab>תתי-משימות</Tab>}
            </TabList>
            
            <TabPanels>
              <TabPanel p={0}>
                <VStack spacing={4} align="stretch">
                  <FormControl isRequired isInvalid={!!errors.title}>
                    <FormLabel>כותרת</FormLabel>
                    <Input
                      name="title"
                      value={formData.title || ''}
                      onChange={handleChange}
                      placeholder="הזן כותרת למשימה"
                    />
                    <FormErrorMessage>{errors.title}</FormErrorMessage>
                  </FormControl>
                  
                  <FormControl>
                    <FormLabel>תיאור</FormLabel>
                    <Textarea
                      name="description"
                      value={formData.description || ''}
                      onChange={handleChange}
                      placeholder="הזן תיאור מפורט למשימה"
                      rows={3}
                    />
                  </FormControl>
                  
                  <Flex gap={4} direction={{ base: 'column', md: 'row' }}>
                    <FormControl flex="1">
                      <FormLabel>סטטוס</FormLabel>
                      <Select name="status" value={formData.status || 'todo'} onChange={handleChange}>
                        <option value="todo">לביצוע</option>
                        <option value="in_progress">בתהליך</option>
                        <option value="review">בבדיקה</option>
                        <option value="done">הושלם</option>
                      </Select>
                    </FormControl>
                    
                    <FormControl flex="1">
                      <FormLabel>עדיפות</FormLabel>
                      <Select name="priority" value={formData.priority || 'medium'} onChange={handleChange}>
                        <option value="low">נמוכה</option>
                        <option value="medium">בינונית</option>
                        <option value="high">גבוהה</option>
                        <option value="urgent">דחופה</option>
                      </Select>
                    </FormControl>
                  </Flex>
                  
                  <Flex gap={4} direction={{ base: 'column', md: 'row' }}>
                    <FormControl flex="1">
                      <FormLabel>תאריך התחלה</FormLabel>
                      <Input
                        name="start_date"
                        type="date"
                        value={formData.start_date || ''}
                        onChange={handleChange}
                      />
                    </FormControl>
                    
                    <FormControl flex="1" isInvalid={!!errors.due_date}>
                      <FormLabel>תאריך יעד</FormLabel>
                      <Input
                        name="due_date"
                        type="date"
                        value={formData.due_date || ''}
                        onChange={handleChange}
                      />
                      <FormErrorMessage>{errors.due_date}</FormErrorMessage>
                    </FormControl>
                  </Flex>
                  
                  <FormControl>
                    <FormLabel>שעות מוערכות</FormLabel>
                    <Input
                      name="estimated_hours"
                      type="number"
                      value={formData.estimated_hours || 0}
                      onChange={handleNumberChange}
                      min={0}
                      step={0.5}
                    />
                  </FormControl>
                  
                  <Divider my={2} />
                  
                  <FormControl display="flex" alignItems="center">
                    <FormLabel htmlFor="is-subtask" mb="0">
                      זוהי תת-משימה
                    </FormLabel>
                    <Switch
                      id="is-subtask"
                      isChecked={isSubtask}
                      onChange={handleSubtaskToggle}
                    />
                  </FormControl>
                  
                  <Collapse in={isSubtask} animateOpacity>
                    <FormControl isInvalid={!!errors.parent_task_id}>
                      <FormLabel>משימת אב</FormLabel>
                      <Select
                        name="parent_task_id"
                        value={formData.parent_task_id || ''}
                        onChange={handleChange}
                        placeholder="בחר משימת אב"
                      >
                        {parentTasks.map(pt => (
                          <option key={pt.id} value={pt.id}>
                            {pt.hierarchical_number ? `${pt.hierarchical_number} - ` : ''}{pt.title}
                          </option>
                        ))}
                      </Select>
                      <FormErrorMessage>{errors.parent_task_id}</FormErrorMessage>
                    </FormControl>
                  </Collapse>
                </VStack>
              </TabPanel>
              
              {isEditMode && (
                <TabPanel p={0}>
                  <VStack spacing={4} align="stretch">
                    <Flex>
                      <Heading size="sm" flex="1">תתי-משימות</Heading>
                      <Text fontSize="sm" color="gray.500">
                        {subtasks.filter(st => st.parent_task_id === task?.id).length} תתי-משימות ישירות
                      </Text>
                    </Flex>
                    
                    <Divider />
                    
                    <HStack>
                      <Input
                        placeholder="הזן כותרת לתת-משימה חדשה"
                        value={newSubtaskTitle}
                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                        flex="1"
                      />
                      <Button
                        leftIcon={<AddIcon />}
                        colorScheme="blue"
                        onClick={handleAddSubtask}
                        isLoading={loading}
                        isDisabled={!newSubtaskTitle.trim()}
                      >
                        הוסף
                      </Button>
                    </HStack>
                    
                    <Box maxH="300px" overflowY="auto" pr={2}>
                      {loadingSubtasks ? (
                        <Center p={4}>
                          <Spinner />
                        </Center>
                      ) : subtasks.length === 0 ? (
                        <Text color="gray.500" textAlign="center" p={4}>
                          אין תתי-משימות. הוסף תת-משימה חדשה באמצעות הטופס למעלה.
                        </Text>
                      ) : (
                        <VStack align="stretch" spacing={0}>
                          {subtasks
                            .filter(st => st.parent_task_id === task?.id)
                            .map(subtask => renderSubtaskItem(subtask))}
                        </VStack>
                      )}
                    </Box>
                  </VStack>
                </TabPanel>
              )}
            </TabPanels>
          </Tabs>
        </ModalBody>
        
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            ביטול
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleSubmit}
            isLoading={loading}
          >
            {isEditMode ? 'עדכן' : 'צור'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default TaskEditModal; 