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
} from '@chakra-ui/react';
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
  }, [task, projectId]);
  
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
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{isEditMode ? 'עריכת משימה' : 'יצירת משימה חדשה'}</ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
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
              <FormControl>
                <FormLabel>סטטוס</FormLabel>
                <Select name="status" value={formData.status || 'todo'} onChange={handleChange}>
                  <option value="todo">לביצוע</option>
                  <option value="in progress">בתהליך</option>
                  <option value="review">לבדיקה</option>
                  <option value="done">הושלם</option>
                </Select>
              </FormControl>
              
              <FormControl>
                <FormLabel>עדיפות</FormLabel>
                <Select name="priority" value={formData.priority || 'medium'} onChange={handleChange}>
                  <option value="low">נמוכה</option>
                  <option value="medium">בינונית</option>
                  <option value="high">גבוהה</option>
                </Select>
              </FormControl>
            </Flex>
            
            <Flex gap={4} direction={{ base: 'column', md: 'row' }}>
              <FormControl>
                <FormLabel>תאריך התחלה</FormLabel>
                <Input
                  name="start_date"
                  type="date"
                  value={formData.start_date || ''}
                  onChange={handleChange}
                />
              </FormControl>
              
              <FormControl isInvalid={!!errors.due_date}>
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
              <FormLabel>שעות עבודה מוערכות</FormLabel>
              <Input
                name="estimated_hours"
                type="number"
                min="0"
                step="0.5"
                value={formData.estimated_hours || 0}
                onChange={handleNumberChange}
              />
            </FormControl>
            
            <Divider my={2} />
            
            <FormControl display="flex" alignItems="center">
              <FormLabel mb="0">
                תת-משימה
              </FormLabel>
              <Switch
                isChecked={isSubtask}
                onChange={handleSubtaskToggle}
                colorScheme="blue"
              />
            </FormControl>
            
            {isSubtask && (
              <FormControl isRequired isInvalid={!!errors.parent_task_id}>
                <FormLabel>משימת אב</FormLabel>
                <Select
                  name="parent_task_id"
                  value={formData.parent_task_id || ''}
                  onChange={handleChange}
                  placeholder="בחר משימת אב"
                >
                  {parentTasks.map(parentTask => (
                    <option key={parentTask.id} value={parentTask.id}>
                      {parentTask.hierarchical_number && `${parentTask.hierarchical_number}. `}
                      {parentTask.title}
                    </option>
                  ))}
                </Select>
                <FormErrorMessage>{errors.parent_task_id}</FormErrorMessage>
              </FormControl>
            )}
          </VStack>
        </ModalBody>
        
        <ModalFooter>
          <Button variant="outline" mr={3} onClick={onClose}>
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