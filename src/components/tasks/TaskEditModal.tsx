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
  SimpleGrid,
  GridItem,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  InputRightAddon,
  Avatar,
  Card,
  CardBody,
  Stack,
  Tag,
  TagLabel,
  CardHeader,
  AvatarGroup,
  Icon,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  PopoverArrow,
  PopoverCloseButton,
  Wrap,
  WrapItem,
  CloseButton,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  ButtonGroup,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  FormHelperText,
} from '@chakra-ui/react';
import { AddIcon, DeleteIcon, ChevronDownIcon, ChevronRightIcon, EditIcon, ChevronUpIcon, CheckIcon, InfoIcon, SettingsIcon, TimeIcon, StarIcon, CalendarIcon, AtSignIcon, LinkIcon } from '@chakra-ui/icons';
import { Task, Stage } from '@/types/supabase';
import taskService from '@/lib/services/taskService';
import stageService from '@/lib/services/stageService';
import SubtaskInput from '@/components/tasks/SubtaskInput';
import { FaCalendarAlt, FaBell, FaBookmark, FaClock, FaClipboardCheck, FaFlag, FaHashtag, FaLayerGroup, FaList, FaTasks, FaUserCircle, FaUsers, FaDropbox, FaSitemap } from 'react-icons/fa';

// מדרג עדיפויות עם צבעים
const PRIORITY_MAP = {
  urgent: { color: "red.500", label: "דחוף", icon: <TimeIcon /> },
  high: { color: "orange.400", label: "גבוהה", icon: <StarIcon /> },
  medium: { color: "yellow.400", label: "בינונית", icon: null },
  low: { color: "green.400", label: "נמוכה", icon: null },
};

// מדרג סטטוסים עם צבעים
const STATUS_MAP = {
  todo: { color: "gray.400", label: "לביצוע", icon: <FaList /> },
  in_progress: { color: "blue.400", label: "בתהליך", icon: <FaClock /> },
  review: { color: "purple.400", label: "בבדיקה", icon: <FaClipboardCheck /> },
  done: { color: "green.400", label: "הושלם", icon: <CheckIcon /> },
};

// קטגוריות נפוצות במשימות שיווק ומכירות
const CATEGORIES = [
  { value: "planning", label: "תכנון", color: "blue.100" },
  { value: "content", label: "תוכן", color: "orange.100" },
  { value: "marketing", label: "שיווק", color: "green.100" },
  { value: "design", label: "עיצוב", color: "purple.100" },
  { value: "sales", label: "מכירות", color: "red.100" },
  { value: "events", label: "אירועים", color: "yellow.100" },
  { value: "social_media", label: "מדיה חברתית", color: "teal.100" },
  { value: "client", label: "לקוחות", color: "pink.100" },
  { value: "other", label: "אחר", color: "gray.100" },
];

// הרחבת הטיפוס של המשימה כדי להכיל את כל השדות הדרושים
interface ExtendedTask extends Task {
  dropbox_folder?: string;
  tags?: string[];
  reminder_days?: number;
  collaborators?: string[];
}

interface TaskEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: ExtendedTask | null;
  projectId: string;
  initialData?: Partial<ExtendedTask>;
  onTaskCreated?: (task: ExtendedTask) => void;
  onTaskUpdated?: (task: ExtendedTask) => void;
}

const TaskEditModal: React.FC<TaskEditModalProps> = ({
  isOpen,
  onClose,
  task,
  projectId,
  initialData,
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
    hierarchical_number: null,
    tags: [],
    reminder_days: 1,
    collaborators: [],
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
  const [newTag, setNewTag] = useState('');
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [newCollaborator, setNewCollaborator] = useState('');
  const [isEditingSubtask, setIsEditingSubtask] = useState(false);
  const [currentSubtask, setCurrentSubtask] = useState<Task | null>(null);
  
  const toast = useToast();
  
  // צבעי רקע לפי מצב התצוגה החשוכה/בהירה
  const bgColor = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const cardBg = useColorModeValue('white', 'gray.800');
  
  // טעינת נתוני המשימה בעת עריכה
  useEffect(() => {
    if (task) {
      setFormData({
        ...task,
        start_date: task.start_date ? task.start_date.split('T')[0] : '',
        due_date: task.due_date ? task.due_date.split('T')[0] : '',
        tags: task.tags || [],
        collaborators: task.collaborators || [],
      });
      setIsSubtask(!!task.parent_task_id);
      setRemindersEnabled(!!task.reminder_days);
      
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
        hierarchical_number: null,
        tags: [],
        reminder_days: 1,
        collaborators: [],
      });
      setIsSubtask(false);
      setSubtasks([]);
      setRemindersEnabled(false);
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
  
  // טיפול בתגים
  const handleAddTag = () => {
    if (!newTag.trim()) return;
    
    setFormData(prev => ({
      ...prev,
      tags: [...(prev.tags || []), newTag.trim()]
    }));
    setNewTag('');
  };
  
  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: (prev.tags || []).filter(tag => tag !== tagToRemove)
    }));
  };
  
  // טיפול במשתפי פעולה
  const handleAddCollaborator = () => {
    if (!newCollaborator.trim()) return;
    
    setFormData(prev => ({
      ...prev,
      collaborators: [...(prev.collaborators || []), newCollaborator.trim()]
    }));
    setNewCollaborator('');
  };
  
  const handleRemoveCollaborator = (collaboratorToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      collaborators: (prev.collaborators || []).filter(c => c !== collaboratorToRemove)
    }));
  };

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
  
  // טיפול בשינוי הפעלת תזכורות
  const handleReminderToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setRemindersEnabled(isChecked);
    
    if (!isChecked) {
      setFormData(prev => ({ ...prev, reminder_days: undefined }));
    } else {
      setFormData(prev => ({ ...prev, reminder_days: 1 }));
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
      let result;
      
      if (isEditMode && task) {
        // עדכון משימה קיימת
        const taskData = {
          ...formData,
          project_id: projectId || null
        };
        result = await taskService.updateTask(task.id, taskData);
        
        toast({
          title: "המשימה עודכנה בהצלחה",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        
        if (onTaskUpdated) {
          onTaskUpdated(result);
        }
      } else {
        // יצירת משימה חדשה
        const taskData = {
          ...formData,
          project_id: projectId || null
        };
        result = await taskService.createTask(taskData);
        
        toast({
          title: "המשימה נוצרה בהצלחה",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        
        if (onTaskCreated) {
          onTaskCreated(result);
        }
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving task:', error);
      toast({
        title: "שגיאה בשמירת המשימה",
        description: error instanceof Error ? error.message : "אירעה שגיאה לא ידועה",
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
    try {
      await taskService.deleteTask(subtaskId);
      
      // עדכון רשימת תתי-המשימות
      setSubtasks(prev => prev.filter(subtask => subtask.id !== subtaskId));
      
      toast({
        title: "תת-משימה נמחקה",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error deleting subtask:', error);
      toast({
        title: "שגיאה במחיקת תת-משימה",
        description: "אירעה שגיאה בעת ניסיון למחוק את תת-המשימה",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };
  
  // טיפול בתת-משימה חדשה שנוצרה
  const handleSubtaskCreated = (createdTask: Task) => {
    setSubtasks(prev => [...prev, createdTask]);
    setIsAddingSubtask(false);
    
    toast({
      title: "תת-משימה נוצרה",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };
  
  // פונקציות עזר לצבעים וסטטוסים
  const getStatusColor = (status: string) => {
    return STATUS_MAP[status as keyof typeof STATUS_MAP]?.color || "gray.500";
  };
  
  const getStatusLabel = (status: string): string => {
    return STATUS_MAP[status as keyof typeof STATUS_MAP]?.label || status;
  };
  
  const getPriorityColor = (priority: string): string => {
    return PRIORITY_MAP[priority as keyof typeof PRIORITY_MAP]?.color || "gray.500";
  };
  
  const getPriorityLabel = (priority: string): string => {
    return PRIORITY_MAP[priority as keyof typeof PRIORITY_MAP]?.label || priority;
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
      <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
      <ModalContent borderRadius="md" boxShadow="lg">
        <ModalHeader 
          bg={getPriorityColor(formData.priority || 'medium')} 
          color="white" 
          borderTopRadius="md"
          display="flex"
          alignItems="center"
          p={4}
        >
          <Icon as={FaTasks} mr={2} />
          {isEditMode ? 'עריכת משימה' : 'יצירת משימה חדשה'}
          {isEditMode && (
            <Badge ml={2} colorScheme={getStatusColor(formData.status || 'todo').split('.')[0]}>
              {getStatusLabel(formData.status || 'todo')}
            </Badge>
          )}
        </ModalHeader>
        <ModalCloseButton color="white" />
        
        <ModalBody p={6}>
          <Tabs 
            variant="enclosed" 
            colorScheme="blue" 
            index={activeTab} 
            onChange={setActiveTab}
            borderRadius="md" 
            mb={4}
          >
            <TabList>
              <Tab>
                <HStack spacing={1}>
                  <Icon as={FaList} />
                  <Text>פרטי משימה</Text>
                </HStack>
              </Tab>
              {isEditMode && (
                <Tab>
                  <HStack spacing={1}>
                    <Icon as={FaLayerGroup} />
                    <Text>תתי-משימות</Text>
                    {subtasks.length > 0 && <Badge colorScheme="blue" borderRadius="full">{subtasks.length}</Badge>}
                  </HStack>
                </Tab>
              )}
              <Tab>
                <HStack spacing={1}>
                  <Icon as={SettingsIcon} />
                  <Text>הגדרות מתקדמות</Text>
                </HStack>
              </Tab>
            </TabList>
            
            <TabPanels>
              {/* טאב 1: פרטי המשימה */}
              <TabPanel pt={5} px={2}>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  {/* עמודה ימנית - פרטים בסיסיים */}
                  <VStack spacing={4} align="stretch">
                    <Card p={0} bg={cardBg} shadow="sm">
                      <CardHeader pb={0} fontWeight="bold" fontSize="md">
                        פרטי משימה
                      </CardHeader>
                      <CardBody>
                        <VStack spacing={4} align="stretch">
                          <FormControl isRequired isInvalid={!!errors.title}>
                            <FormLabel fontWeight="bold">כותרת</FormLabel>
                            <InputGroup>
                              <InputLeftElement pointerEvents="none">
                                <Icon as={FaTasks} color="gray.400" />
                              </InputLeftElement>
                              <Input 
                                name="title" 
                                value={formData.title || ''} 
                                onChange={handleChange} 
                                placeholder="הזן כותרת למשימה"
                                borderRadius="md"
                              />
                            </InputGroup>
                            {errors.title && <FormErrorMessage>{errors.title}</FormErrorMessage>}
                          </FormControl>
                          
                          <FormControl>
                            <FormLabel fontWeight="bold">תיאור</FormLabel>
                            <Textarea 
                              name="description" 
                              value={formData.description || ''} 
                              onChange={handleChange} 
                              placeholder="הזן תיאור מפורט למשימה"
                              minH="100px"
                              borderRadius="md"
                            />
                          </FormControl>
                        </VStack>
                      </CardBody>
                    </Card>

                    <Card p={0} bg={cardBg} shadow="sm">
                      <CardHeader pb={0} fontWeight="bold" fontSize="md">
                        אחריות ושיתוף פעולה
                      </CardHeader>
                      <CardBody>
                        <VStack spacing={4} align="stretch">
                          <FormControl>
                            <FormLabel fontWeight="bold">אחראי ביצוע</FormLabel>
                            <InputGroup>
                              <InputLeftElement pointerEvents="none">
                                <Icon as={FaUserCircle} color="gray.400" />
                              </InputLeftElement>
                              <Input 
                                name="responsible" 
                                value={formData.responsible || ''} 
                                onChange={handleChange}
                                placeholder="שם האחראי על המשימה"
                                borderRadius="md"
                              />
                            </InputGroup>
                          </FormControl>
                          
                          <FormControl>
                            <FormLabel fontWeight="bold">משתפי פעולה</FormLabel>
                            <HStack mb={2}>
                              <InputGroup size="md">
                                <InputLeftElement pointerEvents="none">
                                  <Icon as={FaUsers} color="gray.400" />
                                </InputLeftElement>
                                <Input 
                                  value={newCollaborator} 
                                  onChange={(e) => setNewCollaborator(e.target.value)}
                                  placeholder="הוסף משתף פעולה"
                                  borderRadius="md"
                                  onKeyPress={(e) => e.key === 'Enter' && handleAddCollaborator()}
                                />
                              </InputGroup>
                              <IconButton
                                aria-label="הוסף משתף פעולה"
                                icon={<AddIcon />}
                                onClick={handleAddCollaborator}
                                colorScheme="blue"
                                borderRadius="md"
                              />
                            </HStack>
                            
                            {formData.collaborators && formData.collaborators.length > 0 && (
                              <Wrap spacing={2} mt={2}>
                                {formData.collaborators.map((collaborator, index) => (
                                  <WrapItem key={index}>
                                    <Tag colorScheme="blue" borderRadius="full" size="md">
                                      <Avatar
                                        src=""
                                        name={collaborator}
                                        size="xs"
                                        ml={-1}
                                        mr={2}
                                      />
                                      <TagLabel>{collaborator}</TagLabel>
                                      <CloseButton 
                                        size="sm" 
                                        ml={1} 
                                        onClick={() => handleRemoveCollaborator(collaborator)}
                                      />
                                    </Tag>
                                  </WrapItem>
                                ))}
                              </Wrap>
                            )}
                          </FormControl>
                        </VStack>
                      </CardBody>
                    </Card>
                  </VStack>

                  {/* עמודה שמאלית - תאריכים, סטטוס, עדיפות, שלב */}
                  <VStack spacing={4} align="stretch">
                    <Card p={0} bg={cardBg} shadow="sm">
                      <CardHeader pb={0} fontWeight="bold" fontSize="md">
                        זמנים וסטטוס
                      </CardHeader>
                      <CardBody>
                        <VStack spacing={4} align="stretch">
                          <HStack spacing={4}>
                            <FormControl>
                              <FormLabel fontWeight="bold">סטטוס</FormLabel>
                              <Select 
                                name="status" 
                                value={formData.status || 'todo'} 
                                onChange={handleChange}
                                borderRadius="md"
                                icon={STATUS_MAP[formData.status as keyof typeof STATUS_MAP]?.icon || <ChevronDownIcon />}
                              >
                                {Object.entries(STATUS_MAP).map(([value, { label }]) => (
                                  <option key={value} value={value}>
                                    {label}
                                  </option>
                                ))}
                              </Select>
                            </FormControl>
                            
                            <FormControl>
                              <FormLabel fontWeight="bold">עדיפות</FormLabel>
                              <Select 
                                name="priority" 
                                value={formData.priority || 'medium'} 
                                onChange={handleChange}
                                borderRadius="md"
                                icon={PRIORITY_MAP[formData.priority as keyof typeof PRIORITY_MAP]?.icon || <ChevronDownIcon />}
                              >
                                {Object.entries(PRIORITY_MAP).map(([value, { label }]) => (
                                  <option key={value} value={value}>
                                    {label}
                                  </option>
                                ))}
                              </Select>
                            </FormControl>
                          </HStack>
                          
                          <HStack spacing={4}>
                            <FormControl>
                              <FormLabel fontWeight="bold">תאריך התחלה</FormLabel>
                              <InputGroup>
                                <InputLeftElement pointerEvents="none">
                                  <Icon as={FaCalendarAlt} color="gray.400" />
                                </InputLeftElement>
                                <Input 
                                  type="date" 
                                  name="start_date" 
                                  value={formData.start_date || ''} 
                                  onChange={handleChange}
                                  borderRadius="md"
                                />
                              </InputGroup>
                            </FormControl>
                            
                            <FormControl isInvalid={!!errors.due_date}>
                              <FormLabel fontWeight="bold">תאריך יעד</FormLabel>
                              <InputGroup>
                                <InputLeftElement pointerEvents="none">
                                  <Icon as={FaCalendarAlt} color="gray.400" />
                                </InputLeftElement>
                                <Input 
                                  type="date" 
                                  name="due_date" 
                                  value={formData.due_date || ''} 
                                  onChange={handleChange}
                                  borderRadius="md"
                                />
                              </InputGroup>
                              {errors.due_date && <FormErrorMessage>{errors.due_date}</FormErrorMessage>}
                            </FormControl>
                          </HStack>
                        </VStack>
                      </CardBody>
                    </Card>

                    <Card p={0} bg={cardBg} shadow="sm">
                      <CardHeader pb={0} fontWeight="bold" fontSize="md">
                        סיווג ושיוך
                      </CardHeader>
                      <CardBody>
                        <VStack spacing={4} align="stretch">
                          <FormControl>
                            <FormLabel fontWeight="bold">קטגוריה</FormLabel>
                            <Select 
                              name="category" 
                              value={formData.category || ''} 
                              onChange={handleChange}
                              placeholder="בחר קטגוריה"
                              borderRadius="md"
                            >
                              {CATEGORIES.map(category => (
                                <option key={category.value} value={category.value}>
                                  {category.label}
                                </option>
                              ))}
                            </Select>
                          </FormControl>
                          
                          <FormControl>
                            <FormLabel fontWeight="bold">שלב בפרויקט</FormLabel>
                            <Select 
                              name="stage_id" 
                              value={formData.stage_id || ''} 
                              onChange={handleChange}
                              placeholder="בחר שלב"
                              isDisabled={loadingMilestones}
                              borderRadius="md"
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
                            <FormLabel fontWeight="bold">תגיות</FormLabel>
                            <HStack mb={2}>
                              <InputGroup size="md">
                                <InputLeftElement pointerEvents="none">
                                  <Icon as={FaHashtag} color="gray.400" />
                                </InputLeftElement>
                                <Input 
                                  value={newTag} 
                                  onChange={(e) => setNewTag(e.target.value)}
                                  placeholder="הוסף תגית"
                                  borderRadius="md"
                                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                                />
                              </InputGroup>
                              <IconButton
                                aria-label="הוסף תגית"
                                icon={<AddIcon />}
                                onClick={handleAddTag}
                                colorScheme="blue"
                                borderRadius="md"
                              />
                            </HStack>
                            
                            {formData.tags && formData.tags.length > 0 && (
                              <Wrap spacing={2} mt={2}>
                                {formData.tags.map((tag, index) => (
                                  <WrapItem key={index}>
                                    <Tag colorScheme="teal" borderRadius="full">
                                      <TagLabel>#{tag}</TagLabel>
                                      <CloseButton 
                                        size="sm" 
                                        ml={1} 
                                        onClick={() => handleRemoveTag(tag)}
                                      />
                                    </Tag>
                                  </WrapItem>
                                ))}
                              </Wrap>
                            )}
                          </FormControl>
                          
                          <FormControl display="flex" alignItems="center">
                            <FormLabel mb={0} htmlFor="subtask-toggle" fontWeight="bold">
                              הגדר כתת-משימה
                            </FormLabel>
                            <Switch 
                              id="subtask-toggle"
                              isChecked={isSubtask} 
                              onChange={handleSubtaskToggle}
                              colorScheme="blue"
                            />
                          </FormControl>
                          
                          {isSubtask && (
                            <FormControl isInvalid={!!errors.parent_task_id}>
                              <FormLabel fontWeight="bold">משימת אב</FormLabel>
                              <Select 
                                name="parent_task_id" 
                                value={formData.parent_task_id || ''} 
                                onChange={handleChange}
                                placeholder="בחר משימת אב"
                                borderRadius="md"
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
                      </CardBody>
                    </Card>
                  </VStack>
                </SimpleGrid>
              </TabPanel>
              
              {/* טאב 2: תתי-משימות (רק במצב עריכה) */}
              {isEditMode && (
                <TabPanel pt={5} px={2}>
                  <VStack spacing={4} align="stretch">
                    <Card p={4} bg={cardBg} shadow="sm">
                      <HStack justifyContent="space-between" mb={4}>
                        <Heading size="md">תתי-משימות</Heading>
                        <Button 
                          leftIcon={<AddIcon />} 
                          colorScheme="blue" 
                          size="sm" 
                          onClick={() => setIsAddingSubtask(true)}
                          isDisabled={isAddingSubtask}
                        >
                          הוסף תת-משימה
                        </Button>
                      </HStack>
                      
                      {loadingSubtasks ? (
                        <Center py={8}>
                          <Spinner />
                          <Text ml={2}>טוען תתי-משימות...</Text>
                        </Center>
                      ) : subtasks.length === 0 ? (
                        <Alert status="info" borderRadius="md">
                          <AlertIcon />
                          <Box>
                            <AlertTitle>אין תתי-משימות</AlertTitle>
                            <AlertDescription>
                              למשימה זו אין תתי-משימות. תוכל להוסיף תתי-משימות בעזרת הכפתור למעלה.
                            </AlertDescription>
                          </Box>
                        </Alert>
                      ) : (
                        <Table variant="simple" size="sm">
                          <Thead bg={useColorModeValue('gray.50', 'gray.700')}>
                            <Tr>
                              <Th>כותרת</Th>
                              <Th>סטטוס</Th>
                              <Th>אחראי</Th>
                              <Th>תאריך יעד</Th>
                              <Th isNumeric>פעולות</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {subtasks.map(subtask => (
                              <Tr key={subtask.id}>
                                <Td fontWeight="medium">{subtask.title}</Td>
                                <Td>
                                  <Badge 
                                    colorScheme={getStatusColor(subtask.status || 'todo').split('.')[0]}
                                    borderRadius="full"
                                    px={2}
                                  >
                                    {getStatusLabel(subtask.status || 'todo')}
                                  </Badge>
                                </Td>
                                <Td>{subtask.responsible || '-'}</Td>
                                <Td>
                                  {subtask.due_date ? (
                                    new Date(subtask.due_date).toLocaleDateString('he-IL')
                                  ) : (
                                    '-'
                                  )}
                                </Td>
                                <Td isNumeric>
                                  <ButtonGroup size="xs" variant="ghost">
                                    <IconButton
                                      aria-label="ערוך תת-משימה"
                                      icon={<EditIcon />}
                                      colorScheme="blue"
                                      onClick={() => {
                                        setCurrentSubtask(subtask);
                                        setIsEditingSubtask(true);
                                      }}
                                    />
                                    <IconButton
                                      aria-label="מחק תת-משימה"
                                      icon={<DeleteIcon />}
                                      colorScheme="red"
                                      onClick={() => handleDeleteSubtask(subtask.id)}
                                    />
                                  </ButtonGroup>
                                </Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      )}
                    </Card>
                  </VStack>
                  
                  {/* מודל להוספת תת-משימה */}
                  {isAddingSubtask && task && (
                    <TaskEditModal
                      isOpen={isAddingSubtask}
                      onClose={() => setIsAddingSubtask(false)}
                      projectId={projectId}
                      initialData={{
                        parent_task_id: task.id,
                        stage_id: task.stage_id
                      }}
                      onTaskCreated={handleSubtaskCreated}
                    />
                  )}
                  
                  {/* מודל לעריכת תת-משימה */}
                  {isEditingSubtask && currentSubtask && (
                    <TaskEditModal
                      isOpen={isEditingSubtask}
                      onClose={() => {
                        setIsEditingSubtask(false);
                        setCurrentSubtask(null);
                      }}
                      projectId={projectId}
                      task={currentSubtask}
                      onTaskUpdated={(updatedTask) => {
                        setSubtasks(prev => prev.map(st => 
                          st.id === updatedTask.id ? updatedTask : st
                        ));
                        setIsEditingSubtask(false);
                        setCurrentSubtask(null);
                      }}
                    />
                  )}
                </TabPanel>
              )}
              
              {/* טאב 3: הגדרות מתקדמות */}
              <TabPanel pt={5} px={2}>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <Card p={0} bg={cardBg} shadow="sm">
                    <CardHeader pb={0} fontWeight="bold" fontSize="md">
                      מידע נוסף
                    </CardHeader>
                    <CardBody>
                      <VStack spacing={4} align="stretch">
                        <FormControl>
                          <FormLabel fontWeight="bold">תיקיה בדרופבוקס</FormLabel>
                          <InputGroup>
                            <InputLeftElement pointerEvents="none">
                              <Icon as={FaDropbox} color="gray.400" />
                            </InputLeftElement>
                            <Input 
                              name="dropbox_folder" 
                              value={formData.dropbox_folder || ''} 
                              onChange={handleChange}
                              placeholder="נתיב לתיקיה בדרופבוקס"
                              borderRadius="md"
                            />
                          </InputGroup>
                        </FormControl>
                        
                        <FormControl>
                          <FormLabel fontWeight="bold">מספר היררכי</FormLabel>
                          <InputGroup>
                            <InputLeftElement pointerEvents="none">
                              <Icon as={FaSitemap} color="gray.400" />
                            </InputLeftElement>
                            <Input 
                              name="hierarchical_number" 
                              value={formData.hierarchical_number || ''} 
                              onChange={handleChange}
                              placeholder="מספר היררכי (לדוגמה: 1.2.3)"
                              borderRadius="md"
                            />
                          </InputGroup>
                          <FormHelperText>
                            מספר היררכי משמש למיון ולקביעת היחסים בין משימות. לדוגמה: 1.2.3
                          </FormHelperText>
                        </FormControl>
                      </VStack>
                    </CardBody>
                  </Card>
                  
                  <Card p={0} bg={cardBg} shadow="sm">
                    <CardHeader pb={0} fontWeight="bold" fontSize="md">
                      תזכורות והתראות
                    </CardHeader>
                    <CardBody>
                      <VStack spacing={4} align="stretch">
                        <FormControl display="flex" alignItems="center">
                          <FormLabel mb={0} htmlFor="reminder-toggle" fontWeight="bold">
                            הפעל תזכורות
                          </FormLabel>
                          <Switch 
                            id="reminder-toggle"
                            isChecked={remindersEnabled} 
                            onChange={handleReminderToggle}
                            colorScheme="blue"
                          />
                        </FormControl>
                        
                        {remindersEnabled && (
                          <FormControl>
                            <FormLabel fontWeight="bold">מספר ימים לפני תאריך היעד</FormLabel>
                            <NumberInput 
                              min={1} 
                              max={30} 
                              value={formData.reminder_days} 
                              onChange={(value) => setFormData(prev => ({ ...prev, reminder_days: parseInt(value) }))}
                            >
                              <NumberInputField borderRadius="md" />
                              <NumberInputStepper>
                                <NumberIncrementStepper />
                                <NumberDecrementStepper />
                              </NumberInputStepper>
                            </NumberInput>
                            <FormHelperText>
                              התזכורת תישלח x ימים לפני תאריך היעד של המשימה
                            </FormHelperText>
                          </FormControl>
                        )}
                      </VStack>
                    </CardBody>
                  </Card>
                </SimpleGrid>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </ModalBody>
        
        <ModalFooter borderTop="1px" borderColor={borderColor} py={4} bg={bgColor}>
          <HStack spacing={3} width="100%" justifyContent="space-between">
            <Button variant="ghost" onClick={onClose}>
              ביטול
            </Button>
            
            <HStack>
              <Button 
                colorScheme="blue" 
                leftIcon={isEditMode ? <EditIcon /> : <AddIcon />}
                onClick={handleSubmit}
                isLoading={loading}
                loadingText={isEditMode ? "מעדכן..." : "יוצר..."}
              >
                {isEditMode ? "עדכן משימה" : "צור משימה"}
              </Button>
            </HStack>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default TaskEditModal; 