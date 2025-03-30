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
  Badge,
  useColorModeValue,
  SimpleGrid,
  InputGroup,
  InputLeftElement,
  Icon,
  Switch,
  Tag,
  TagLabel,
  Avatar,
  Wrap,
  WrapItem,
  CloseButton,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Flex,
  Box,
  Text,
} from '@chakra-ui/react';
import { AddIcon, EditIcon } from '@chakra-ui/icons';
import { Task } from '@/types/supabase';
import taskService from '@/lib/services/taskService';
import { FaCalendarAlt, FaClock, FaClipboardCheck, FaList, FaTasks, FaUserCircle, FaUsers } from 'react-icons/fa';
import { CheckIcon } from '@chakra-ui/icons';

// מדרג עדיפויות עם צבעים
const PRIORITY_MAP = {
  urgent: { color: "red.500", label: "דחוף" },
  high: { color: "orange.400", label: "גבוהה" },
  medium: { color: "yellow.400", label: "בינונית" },
  low: { color: "green.400", label: "נמוכה" },
};

// מדרג סטטוסים עם צבעים
const STATUS_MAP = {
  todo: { color: "gray.400", label: "לביצוע", icon: <FaList /> },
  in_progress: { color: "blue.400", label: "בתהליך", icon: <FaClock /> },
  review: { color: "purple.400", label: "בבדיקה", icon: <FaClipboardCheck /> },
  done: { color: "green.400", label: "הושלם", icon: <CheckIcon /> },
};

// הרחבת הטיפוס של המשימה כדי להכיל את כל השדות הדרושים
interface ExtendedTask extends Task {
  // assignees_info וגם assignees זמינים דרך ה-Task שהורחב
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
    responsible: null,
    assignees_info: [], // שימוש ב-assignees_info במקום assignees
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [parentTasks, setParentTasks] = useState<Task[]>([]);
  const [isSubtask, setIsSubtask] = useState(false);
  const [newAssignee, setNewAssignee] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  
  const toast = useToast();
  
  // צבעי רקע לפי מצב התצוגה החשוכה/בהירה
  const bgColor = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  // טעינת נתוני המשימה בעת עריכה
  useEffect(() => {
    if (task) {
      setFormData({
        ...task,
        start_date: task.start_date ? task.start_date.split('T')[0] : '',
        due_date: task.due_date ? task.due_date.split('T')[0] : '',
        assignees_info: Array.isArray(task.assignees_info) ? task.assignees_info : 
                        Array.isArray(task.assignees) ? task.assignees : [],
      });
      setIsSubtask(!!task.parent_task_id);
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
        responsible: null,
        assignees_info: [], // שימוש ב-assignees_info במקום assignees
      });
      setIsSubtask(false);
    }
    
    // טעינת משימות אב פוטנציאליות
    const loadParentTasks = async () => {
      try {
        // שימוש בפונקציה הייחודית לטעינת משימות של פרויקט
        const tasks = await taskService.getProjectSpecificTasks(projectId);
        
        console.log("כל המשימות שנטענו:", tasks.length);
        
        // סינון פשוט יותר - משימות שאין להן parent_task_id, 
        // ולא כולל את המשימה הנוכחית עצמה
        const filteredTasks = tasks.filter(t => {
          // לא להציג את המשימה הנוכחית כמשימת אב פוטנציאלית
          if (task && t.id === task.id) return false;
          
          // לא להציג משימות שכבר הן תת-משימות של המשימה הנוכחית (אם יש)
          if (task && t.parent_task_id === task.id) return false;
          
          // משימה יכולה להיות אב אם אין לה parent_task_id (null או undefined)
          return t.parent_task_id === null || t.parent_task_id === undefined;
        });
        
        console.log('מספר משימות אב פוטנציאליות לאחר סינון:', filteredTasks.length);
        filteredTasks.forEach(t => {
          console.log(`משימה: ${t.title}, ID: ${t.id}, parent_task_id: ${t.parent_task_id || 'אין'}`);
        });
        
        // מיון המשימות לפי כותרת
        const sortedParents = filteredTasks.sort((a, b) => {
          // מיון לפי כותרת
          return a.title.localeCompare(b.title);
        });
        
        setParentTasks(sortedParents);
      } catch (error) {
        console.error('Error loading parent tasks:', error);
        toast({
          title: "שגיאה בטעינת משימות אב",
          description: "אירעה שגיאה בטעינת משימות שיכולות להיות משימות אב",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    };
    
    loadParentTasks();
  }, [task, projectId]);
  
  // טיפול במשתפי פעולה
  const handleAddAssignee = () => {
    if (!newAssignee.trim()) return;
    
    const currentAssignees = Array.isArray(formData.assignees_info) ? formData.assignees_info : [];
    
    if (currentAssignees.includes(newAssignee)) {
      setNewAssignee('');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      assignees_info: [...currentAssignees, newAssignee],
      assignees: [...currentAssignees, newAssignee], // עדכון שדה ה-assignees לתאימות לאחור
    }));
    
    setNewAssignee('');
  };
  
  const handleRemoveAssignee = (assigneeToRemove: string) => {
    setFormData(prev => {
      const currentAssignees = Array.isArray(prev.assignees_info) ? prev.assignees_info : [];
      const updatedAssignees = currentAssignees.filter(a => a !== assigneeToRemove);
      return {
        ...prev,
        assignees_info: updatedAssignees,
        assignees: updatedAssignees, // עדכון שדה ה-assignees לתאימות לאחור
      };
    });
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
      let result;
      
      if (isEditMode && task) {
        // עדכון משימה קיימת
        const taskData = {
          ...formData,
          project_id: projectId,
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
        if (!formData.title) {
          toast({
            title: "שגיאה",
            description: "כותרת המשימה היא שדה חובה",
            status: "error",
            duration: 3000,
            isClosable: true,
          });
          setLoading(false);
          return;
        }
        
        const taskData = {
          ...formData,
          title: formData.title,
          project_id: projectId,
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
  
  // רינדור הכותרת של המודל
  const renderModalHeader = () => (
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
  );
  
  // רינדור החלק הבסיסי של המשימה
  const renderBasicInfo = () => (
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
          placeholder="הזן תיאור למשימה"
          rows={3}
          borderRadius="md"
        />
      </FormControl>
      
      <SimpleGrid columns={2} spacing={4}>
        <FormControl>
          <FormLabel fontWeight="bold">סטטוס</FormLabel>
          <Select 
            name="status" 
            value={formData.status || 'todo'} 
            onChange={handleChange}
            borderRadius="md"
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
          >
            {Object.entries(PRIORITY_MAP).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </FormControl>
      </SimpleGrid>
    </VStack>
  );
  
  // רינדור תאריכים
  const renderSchedule = () => (
    <VStack spacing={4} align="stretch">
      <SimpleGrid columns={2} spacing={4}>
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
      </SimpleGrid>
      
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
        <FormLabel fontWeight="bold">משתתפים</FormLabel>
        <HStack mb={2}>
          <InputGroup>
            <InputLeftElement pointerEvents="none">
              <Icon as={FaUsers} color="gray.400" />
            </InputLeftElement>
            <Input 
              value={newAssignee} 
              onChange={(e) => setNewAssignee(e.target.value)}
              placeholder="הוסף משתתף"
              borderRadius="md"
              onKeyPress={(e) => e.key === 'Enter' && handleAddAssignee()}
            />
          </InputGroup>
          <Button
            aria-label="הוסף משתתף"
            leftIcon={<AddIcon />}
            onClick={handleAddAssignee}
            colorScheme="blue"
            size="md"
          >
            הוסף
          </Button>
        </HStack>
        
        {formData.assignees_info && Array.isArray(formData.assignees_info) && formData.assignees_info.length > 0 && (
          <Wrap spacing={2} mt={2}>
            {formData.assignees_info.map((assignee, index) => (
              <WrapItem key={index}>
                <Tag colorScheme="blue" borderRadius="full" size="md">
                  <Avatar
                    src=""
                    name={assignee}
                    size="xs"
                    ml={-1}
                    mr={2}
                  />
                  <TagLabel>{assignee}</TagLabel>
                  <CloseButton 
                    size="sm" 
                    ml={1} 
                    onClick={() => handleRemoveAssignee(assignee)}
                  />
                </Tag>
              </WrapItem>
            ))}
          </Wrap>
        )}
      </FormControl>
    </VStack>
  );
  
  // רינדור תת-משימה
  const renderRelationships = () => (
    <VStack spacing={4} align="stretch">
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
          {parentTasks.length > 0 ? (
            <Select 
              name="parent_task_id" 
              value={formData.parent_task_id || ''} 
              onChange={handleChange}
              placeholder="בחר משימת אב"
              borderRadius="md"
            >
              {parentTasks.map(parentTask => (
                <option key={parentTask.id} value={parentTask.id}>
                  {parentTask.hierarchical_number ? `${parentTask.hierarchical_number} - ` : ''}
                  {parentTask.title}
                  {parentTask.status && ` (${getStatusLabel(parentTask.status)})`}
                </option>
              ))}
            </Select>
          ) : (
            <Text color="orange.500" mt={2}>
              אין משימות שיכולות לשמש כמשימות אב. צור קודם משימות ראשיות.
            </Text>
          )}
          {errors.parent_task_id && <FormErrorMessage>{errors.parent_task_id}</FormErrorMessage>}
        </FormControl>
      )}
    </VStack>
  );
  
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      size="xl" 
      scrollBehavior="inside"
      motionPreset="slideInBottom"
    >
      <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(5px)" />
      <ModalContent 
        borderRadius="md" 
        boxShadow="xl"
        maxWidth="95vw"
        width="700px"
      >
        {renderModalHeader()}
        <ModalCloseButton color="white" />
        
        <ModalBody p={0}>
          <Tabs 
            isFitted 
            variant="enclosed" 
            defaultIndex={0} 
            index={activeTab} 
            onChange={setActiveTab}
          >
            <TabList mb={4}>
              <Tab _selected={{ fontWeight: "bold", borderBottomWidth: "3px" }}>פרטים בסיסיים</Tab>
              <Tab _selected={{ fontWeight: "bold", borderBottomWidth: "3px" }}>לוח זמנים ואחראים</Tab>
              <Tab _selected={{ fontWeight: "bold", borderBottomWidth: "3px" }}>קשרים</Tab>
            </TabList>
            
            <TabPanels>
              <TabPanel>
                <Box p={4}>
                  {renderBasicInfo()}
                </Box>
              </TabPanel>
              <TabPanel>
                <Box p={4}>
                  {renderSchedule()}
                </Box>
              </TabPanel>
              <TabPanel>
                <Box p={4}>
                  {renderRelationships()}
                </Box>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </ModalBody>
        
        <ModalFooter borderTop="1px" borderColor={borderColor} py={3} bg={bgColor}>
          <Flex width="100%" justifyContent="space-between">
            <Button variant="ghost" onClick={onClose}>
              ביטול
            </Button>
            
            <HStack>
              {activeTab > 0 && (
                <Button variant="ghost" mr={2} onClick={() => setActiveTab(prev => prev - 1)}>
                  הקודם
                </Button>
              )}
              
              {activeTab < 2 ? (
                <Button colorScheme="blue" onClick={() => setActiveTab(prev => prev + 1)}>
                  הבא
                </Button>
              ) : (
                <Button 
                  colorScheme="blue" 
                  leftIcon={isEditMode ? <EditIcon /> : <AddIcon />}
                  onClick={handleSubmit}
                  isLoading={loading}
                  loadingText={isEditMode ? "מעדכן..." : "יוצר..."}
                >
                  {isEditMode ? "עדכן משימה" : "צור משימה"}
                </Button>
              )}
            </HStack>
          </Flex>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default TaskEditModal; 