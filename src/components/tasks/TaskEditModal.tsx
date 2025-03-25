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
import { AddIcon, DeleteIcon, ChevronDownIcon, ChevronRightIcon, EditIcon, ChevronUpIcon } from '@chakra-ui/icons';
import { Task, Stage } from '@/types/supabase';
import taskService from '@/lib/services/taskService';
import stageService from '@/lib/services/stageService';
import SubtaskInput from '@/components/tasks/SubtaskInput';

// הרחבת הטיפוס של המשימה כדי להכיל את כל השדות הדרושים
interface ExtendedTask extends Task {
  dropbox_folder?: string;
  hierarchical_number?: string;
}

interface TaskEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: ExtendedTask | null;
  projectId: string;
  onTaskCreated?: (task: ExtendedTask) => void;
  onTaskUpdated?: (task: ExtendedTask) => void;
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
  const [formData, setFormData] = useState<Partial<ExtendedTask>>({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    start_date: '',
    due_date: '',
    project_id: projectId,
    parent_task_id: null,
    stage_id: null,
    category: '',
    responsible: null,
    dropbox_folder: '',
    hierarchical_number: '',
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
  const [milestones, setMilestones] = useState<Stage[]>([]);
  const [loadingMilestones, setLoadingMilestones] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  
  const toast = useToast();
  
  // טעינת נתוני המשימה בעת עריכה
  useEffect(() => {
    if (task) {
      setFormData({
        ...task,
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
        project_id: projectId,
        parent_task_id: null,
        stage_id: null,
        category: '',
        responsible: null,
        dropbox_folder: '',
        hierarchical_number: '',
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
    
    // טעינת מילסטונים (שלבים) של הפרויקט
    const loadMilestones = async () => {
      if (!projectId) return;
      
      try {
        setLoadingMilestones(true);
        const milestonesData = await stageService.getProjectStages(projectId);
        setMilestones(milestonesData);
        
        // בחירת מילסטון ברירת מחדל אם יש מילסטונים ואין מילסטון נבחר
        if (milestonesData.length > 0 && !formData.stage_id) {
          setFormData(prev => ({ ...prev, stage_id: milestonesData[0].id }));
        }
      } catch (error) {
        console.error('Error loading stages:', error);
        toast({
          title: 'שגיאה בטעינת שלבי הפרויקט',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      } finally {
        setLoadingMilestones(false);
      }
    };
    
    loadMilestones();
  }, [task, projectId, isEditMode, toast]);
  
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
  
  // טיפול בשינוי סוג המשימה (רגילה/תת-משימה)
  const handleSubtaskToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setIsSubtask(isChecked);
    
    if (!isChecked) {
      // אם זו לא תת-משימה, מאפסים את משימת האב
      setFormData(prev => ({ ...prev, parent_task_id: null }));
    }
  };
  
  // פונקציה לוולידציה של הטופס
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
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      let taskData: Partial<ExtendedTask> = {
        ...formData,
        project_id: projectId,
      };
      
      // אם זו לא תת-משימה, מוודאים שאין משימת אב
      if (!isSubtask) {
        taskData.parent_task_id = null;
      }
      
      let result;
      
      if (isEditMode && task) {
        // עדכון משימה קיימת
        result = await taskService.updateTask(task.id, taskData);
        
        if (result) {
          toast({
            title: "המשימה עודכנה בהצלחה",
            status: "success",
            duration: 3000,
            isClosable: true,
          });
          
          if (onTaskUpdated) {
            onTaskUpdated(result as ExtendedTask);
          }
        }
      } else {
        // יצירת משימה חדשה
        result = await taskService.createTask(taskData);
        
        if (result) {
          toast({
            title: "המשימה נוצרה בהצלחה",
            status: "success",
            duration: 3000,
            isClosable: true,
          });
          
          if (onTaskCreated) {
            onTaskCreated(result as ExtendedTask);
          }
        }
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving task:', error);
      toast({
        title: "שגיאה בשמירת המשימה",
        description: "אירעה שגיאה בעת שמירת המשימה. אנא נסה שנית.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };
  
  // מחיקת תת-משימה
  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק את תת-המשימה הזו?')) return;
    
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
        onTaskUpdated(task as ExtendedTask);
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
  
  // פונקציה לטיפול בתת-משימה שנוצרה
  const handleSubtaskCreated = (createdTask: Task) => {
    // עדכון רשימת תתי-המשימות
    setSubtasks(prev => [...prev, createdTask]);
    
    // סגירת טופס הוספת תת-משימה
    setIsAddingSubtask(false);
    
    toast({
      title: 'תת-משימה נוצרה בהצלחה',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };
  
  // פונקציות עזר להצגת סטטוס
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

  const getPriorityColor = (priority: string): string => {
    switch (priority.toLowerCase()) {
      case 'high':
      case 'גבוהה':
        return 'red.500';
      case 'medium':
      case 'בינונית':
        return 'orange.400';
      case 'low':
      case 'נמוכה':
        return 'green.400';
      case 'urgent':
      case 'דחופה':
        return 'purple.500';
      default:
        return 'gray.400';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent maxW="800px">
        <ModalHeader>{isEditMode ? 'עריכת משימה' : 'משימה חדשה'}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Tabs index={activeTab} onChange={setActiveTab}>
            <TabList>
              <Tab>פרטי משימה</Tab>
              {isEditMode && <Tab>תתי-משימות</Tab>}
              <Tab>הגדרות מתקדמות</Tab>
            </TabList>
            
            <TabPanels>
              {/* טאב פרטי משימה */}
              <TabPanel>
                <VStack spacing={4} align="stretch">
                  <FormControl isRequired isInvalid={!!errors.title}>
                    <FormLabel>כותרת</FormLabel>
                    <Input 
                      name="title" 
                      value={formData.title || ''} 
                      onChange={handleChange} 
                      placeholder="הזן כותרת למשימה"
                    />
                    {errors.title && <FormErrorMessage>{errors.title}</FormErrorMessage>}
                  </FormControl>
                  
                  <FormControl>
                    <FormLabel>תיאור</FormLabel>
                    <Textarea 
                      name="description" 
                      value={formData.description || ''} 
                      onChange={handleChange} 
                      placeholder="הזן תיאור מפורט למשימה"
                      minH="100px"
                    />
                  </FormControl>
                  
                  <HStack spacing={4}>
                    <FormControl>
                      <FormLabel>סטטוס</FormLabel>
                      <Select name="status" value={formData.status || 'todo'} onChange={handleChange}>
                        <option value="todo">לביצוע</option>
                        <option value="in_progress">בתהליך</option>
                        <option value="review">בבדיקה</option>
                        <option value="done">הושלם</option>
                      </Select>
                    </FormControl>
                    
                    <FormControl>
                      <FormLabel>עדיפות</FormLabel>
                      <Select name="priority" value={formData.priority || 'medium'} onChange={handleChange}>
                        <option value="low">נמוכה</option>
                        <option value="medium">בינונית</option>
                        <option value="high">גבוהה</option>
                        <option value="urgent">דחופה</option>
                      </Select>
                    </FormControl>
                  </HStack>
                  
                  <HStack spacing={4}>
                    <FormControl>
                      <FormLabel>תאריך התחלה</FormLabel>
                      <Input 
                        type="date" 
                        name="start_date" 
                        value={formData.start_date || ''} 
                        onChange={handleChange}
                      />
                    </FormControl>
                    
                    <FormControl isInvalid={!!errors.due_date}>
                      <FormLabel>תאריך יעד</FormLabel>
                      <Input 
                        type="date" 
                        name="due_date" 
                        value={formData.due_date || ''} 
                        onChange={handleChange}
                      />
                      {errors.due_date && <FormErrorMessage>{errors.due_date}</FormErrorMessage>}
                    </FormControl>
                  </HStack>
                  
                  <FormControl>
                    <FormLabel>קטגוריה</FormLabel>
                    <Select 
                      name="category" 
                      value={formData.category || ''} 
                      onChange={handleChange}
                      placeholder="בחר קטגוריה"
                    >
                      <option value="planning">תכנון</option>
                      <option value="development">פיתוח</option>
                      <option value="design">עיצוב</option>
                      <option value="marketing">שיווק</option>
                      <option value="content">תוכן</option>
                      <option value="qa">בדיקות איכות</option>
                      <option value="production">ייצור</option>
                      <option value="other">אחר</option>
                    </Select>
                  </FormControl>
                  
                  <FormControl>
                    <FormLabel>שלב בפרויקט</FormLabel>
                    <Select 
                      name="stage_id" 
                      value={formData.stage_id || ''} 
                      onChange={handleChange}
                      placeholder="בחר שלב"
                      isDisabled={loadingMilestones}
                    >
                      {milestones.map(milestone => (
                        <option key={milestone.id} value={milestone.id}>
                          {milestone.title}
                        </option>
                      ))}
                    </Select>
                    {loadingMilestones && <Spinner size="sm" ml={2} />}
                  </FormControl>
                  
                  <FormControl>
                    <FormLabel>אחראי</FormLabel>
                    <Input 
                      name="responsible" 
                      value={formData.responsible || ''} 
                      onChange={handleChange}
                      placeholder="הזן אחראי למשימה"
                    />
                  </FormControl>
                  
                  <FormControl>
                    <FormLabel>תיקיה בדרופבוקס</FormLabel>
                    <Input 
                      name="dropbox_folder" 
                      value={formData.dropbox_folder || ''} 
                      onChange={handleChange}
                      placeholder="נתיב לתיקיה בדרופבוקס"
                    />
                  </FormControl>
                  
                  <FormControl display="flex" alignItems="center">
                    <FormLabel mb={0}>הגדר כתת-משימה</FormLabel>
                    <Switch 
                      isChecked={isSubtask} 
                      onChange={handleSubtaskToggle}
                    />
                  </FormControl>
                  
                  {isSubtask && (
                    <FormControl isInvalid={!!errors.parent_task_id}>
                      <FormLabel>משימת אב</FormLabel>
                      <Select 
                        name="parent_task_id" 
                        value={formData.parent_task_id || ''} 
                        onChange={handleChange}
                        placeholder="בחר משימת אב"
                      >
                        {parentTasks.map(parentTask => (
                          <option key={parentTask.id} value={parentTask.id}>
                            {parentTask.title}
                          </option>
                        ))}
                      </Select>
                      {errors.parent_task_id && <FormErrorMessage>{errors.parent_task_id}</FormErrorMessage>}
                    </FormControl>
                  )}
                </VStack>
              </TabPanel>
              
              {/* טאב תתי-משימות (רק במצב עריכה) */}
              {isEditMode && (
                <TabPanel>
                  <VStack spacing={4} align="stretch">
                    <Flex justifyContent="space-between" alignItems="center">
                      <Heading as="h3" size="md">תתי-משימות</Heading>
                      <Button 
                        size="sm" 
                        leftIcon={<AddIcon />} 
                        colorScheme="blue"
                        onClick={() => setIsAddingSubtask(true)}
                      >
                        הוסף תת-משימה חדשה
                      </Button>
                    </Flex>
                    
                    <Collapse in={isAddingSubtask} animateOpacity>
                      <Box p={4} bg="gray.50" borderRadius="md" mb={4}>
                        <SubtaskInput 
                          parentTaskId={task?.id || ''} 
                          projectId={projectId} 
                          onSubtaskCreated={handleSubtaskCreated}
                          onCancel={() => setIsAddingSubtask(false)}
                        />
                      </Box>
                    </Collapse>
                    
                    {loadingSubtasks ? (
                      <Center p={4}>
                        <Spinner />
                      </Center>
                    ) : subtasks.length > 0 ? (
                      <List spacing={3}>
                        {subtasks.map(subtask => (
                          <ListItem 
                            key={subtask.id} 
                            p={3} 
                            borderWidth="1px" 
                            borderRadius="md"
                            _hover={{ bg: "gray.50" }}
                          >
                            <Flex justifyContent="space-between" alignItems="center">
                              <HStack>
                                <Badge colorScheme={getStatusColor(subtask.status || 'todo')}>
                                  {getStatusLabel(subtask.status || 'todo')}
                                </Badge>
                                <Text fontWeight="medium">{subtask.title}</Text>
                              </HStack>
                              <HStack>
                                <IconButton
                                  icon={<EditIcon />}
                                  aria-label="ערוך תת-משימה"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    onClose(); // סגירת המודל הנוכחי
                                    if (onEditTask) onEditTask(subtask); // פתיחת מודל עריכה לתת-המשימה
                                  }}
                                />
                                <IconButton
                                  icon={<DeleteIcon />}
                                  aria-label="מחק תת-משימה"
                                  size="sm"
                                  variant="ghost"
                                  colorScheme="red"
                                  onClick={() => handleDeleteSubtask(subtask.id)}
                                />
                              </HStack>
                            </Flex>
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Box p={4} textAlign="center" color="gray.500">
                        אין תתי-משימות. לחץ על "הוסף תת-משימה חדשה" כדי ליצור תת-משימה ראשונה.
                      </Box>
                    )}
                  </VStack>
                </TabPanel>
              )}
              
              {/* טאב הגדרות מתקדמות */}
              <TabPanel>
                <VStack spacing={4} align="stretch">
                  <Heading as="h3" size="sm" mb={2}>
                    הגדרות מתקדמות
                  </Heading>
                  
                  <FormControl>
                    <FormLabel>מספר היררכי</FormLabel>
                    <Input 
                      name="hierarchical_number" 
                      value={formData.hierarchical_number || ''} 
                      onChange={handleChange}
                      placeholder="הזן מספר היררכי (אופציונלי)"
                    />
                  </FormControl>
                  
                  <Divider my={2} />
                  
                  <FormControl display="flex" alignItems="center">
                    <FormLabel htmlFor="reminder-setting" mb="0">
                      הפעל תזכורות לקראת תאריך היעד
                    </FormLabel>
                    <Switch id="reminder-setting" />
                  </FormControl>
                </VStack>
              </TabPanel>
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
            loadingText="שומר..."
          >
            {isEditMode ? 'עדכן משימה' : 'צור משימה'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default TaskEditModal; 