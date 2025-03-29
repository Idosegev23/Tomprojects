import React, { useState } from 'react';
import {
  Flex,
  Input,
  Button,
  useToast,
  Box,
  Collapse,
  IconButton,
  Text,
  HStack,
  VStack,
  FormControl,
  FormLabel,
  Select,
  Textarea,
  Card,
  useColorModeValue,
  Divider,
  Badge,
  Icon,
} from '@chakra-ui/react';
import { AddIcon, ChevronDownIcon, ChevronUpIcon, CloseIcon } from '@chakra-ui/icons';
import { FiCalendar, FiClock, FiFlag, FiTag, FiFileText, FiUsers } from 'react-icons/fi';
import taskService from '@/lib/services/taskService';
import { Task } from '@/types/supabase';

interface SubtaskInputProps {
  parentTaskId: string;
  projectId: string;
  stageId?: string;
  onSubtaskCreated?: (task: Task) => void;
  showExpanded?: boolean;
  onCancel?: () => void;
}

const SubtaskInput: React.FC<SubtaskInputProps> = ({
  parentTaskId,
  projectId,
  stageId,
  onSubtaskCreated,
  showExpanded = false,
  onCancel,
}) => {
  const [isExpanded, setIsExpanded] = useState(showExpanded);
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'todo',
    due_date: '',
    responsible: '',
    estimated_hours: 0,
    assignees: [] as string[],
    tags: [] as string[],
  });
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'estimated_hours') {
      // וודא שהערך הוא מספרי ותקין
      const numericValue = parseFloat(value);
      if (!isNaN(numericValue) && numericValue >= 0) {
        setFormData(prev => ({ ...prev, [name]: numericValue }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) return;
    
    setLoading(true);
    
    try {
      // הכנת אובייקט חדש לשליחה
      const cleanTask: any = {
        title: formData.title.trim(),
        description: formData.description,
        status: formData.status,
        priority: formData.priority,
        project_id: projectId,
        parent_task_id: parentTaskId,
        stage_id: stageId || null,
        responsible: formData.responsible || null,
        estimated_hours: formData.estimated_hours || 0,
        tags: formData.tags,
        assignees: formData.assignees,
      };
      
      // טיפול בתאריך יעד - רק אם יש ערך
      if (formData.due_date) {
        cleanTask.due_date = formData.due_date;
      }
      
      // יצירת תת-המשימה
      const createdTask = await taskService.createTask(cleanTask);
      
      toast({
        title: 'תת-משימה נוצרה בהצלחה',
        status: 'success',
        duration: 3000,
        isClosable: true,
        position: 'top-right',
      });
      
      // איפוס הטופס
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        status: 'todo',
        due_date: '',
        responsible: '',
        estimated_hours: 0,
        assignees: [],
        tags: [],
      });
      
      // עדכון ההורה
      if (onSubtaskCreated) {
        onSubtaskCreated(createdTask);
      }
      
      // סגירת הטופס אם יש צורך
      if (onCancel) {
        setIsExpanded(false);
        setIsAdvancedMode(false);
      }
    } catch (error) {
      console.error('Error creating subtask:', error);
      toast({
        title: 'שגיאה ביצירת תת-משימה',
        description: error instanceof Error ? error.message : 'אירעה שגיאה לא ידועה',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top-right',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // פונקציה לביטול הפעולה
  const handleCancel = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      status: 'todo',
      due_date: '',
      responsible: '',
      estimated_hours: 0,
      assignees: [],
      tags: [],
    });
    setIsExpanded(false);
    setIsAdvancedMode(false);
    
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <Box>
      {!isExpanded ? (
        <Flex
          align="center"
          py={2}
          px={4}
          borderRadius="md"
          cursor="pointer"
          _hover={{ bg: 'gray.50' }}
          onClick={() => setIsExpanded(true)}
        >
          <AddIcon fontSize="xs" mr={2} color="blue.500" />
          <Text fontSize="sm" color="gray.500">הוסף תת-משימה חדשה...</Text>
        </Flex>
      ) : (
        <Card
          borderWidth="1px"
          borderRadius="md"
          p={4}
          bg={cardBg}
          borderColor={borderColor}
          boxShadow="sm"
        >
          <form onSubmit={handleAddSubtask}>
            <VStack spacing={4} align="stretch">
              <FormControl isRequired>
                <FormLabel display="flex" alignItems="center">
                  <Icon as={FiFileText} mr={2} />
                  כותרת תת-משימה
                </FormLabel>
                <Input
                  placeholder="הזן כותרת לתת-משימה חדשה"
                  value={formData.title}
                  name="title"
                  onChange={handleChange}
                  bg="white"
                  size="md"
                  autoFocus
                />
              </FormControl>
              
              {isAdvancedMode && (
                <>
                  <FormControl>
                    <FormLabel display="flex" alignItems="center">
                      <Icon as={FiFileText} mr={2} />
                      תיאור
                    </FormLabel>
                    <Textarea
                      placeholder="תיאור תת-המשימה..."
                      value={formData.description}
                      name="description"
                      onChange={handleChange}
                      bg="white"
                      size="sm"
                      rows={3}
                    />
                  </FormControl>
                  
                  <Flex gap={4}>
                    <FormControl flex={1}>
                      <FormLabel display="flex" alignItems="center" fontSize="sm">
                        <Icon as={FiFlag} mr={2} color="red.500" />
                        עדיפות
                      </FormLabel>
                      <Select
                        name="priority"
                        value={formData.priority}
                        onChange={handleChange}
                        bg="white"
                        size="sm"
                      >
                        <option value="low">נמוכה</option>
                        <option value="medium">בינונית</option>
                        <option value="high">גבוהה</option>
                      </Select>
                    </FormControl>
                    
                    <FormControl flex={1}>
                      <FormLabel display="flex" alignItems="center" fontSize="sm">
                        <Icon as={FiTag} mr={2} color="blue.500" />
                        סטטוס
                      </FormLabel>
                      <Select
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        bg="white"
                        size="sm"
                      >
                        <option value="todo">לביצוע</option>
                        <option value="in_progress">בתהליך</option>
                        <option value="review">בבדיקה</option>
                        <option value="done">הושלם</option>
                      </Select>
                    </FormControl>
                  </Flex>
                  
                  <Flex gap={4}>
                    <FormControl flex={1}>
                      <FormLabel display="flex" alignItems="center" fontSize="sm">
                        <Icon as={FiCalendar} mr={2} color="green.500" />
                        תאריך יעד
                      </FormLabel>
                      <Input
                        type="date"
                        name="due_date"
                        value={formData.due_date}
                        onChange={handleChange}
                        bg="white"
                        size="sm"
                      />
                    </FormControl>
                    
                    <FormControl flex={1}>
                      <FormLabel display="flex" alignItems="center" fontSize="sm">
                        <Icon as={FiClock} mr={2} color="orange.500" />
                        זמן משוער (שעות)
                      </FormLabel>
                      <Input
                        type="number"
                        name="estimated_hours"
                        value={formData.estimated_hours}
                        onChange={handleChange}
                        placeholder="שעות"
                        bg="white"
                        size="sm"
                        min={0}
                      />
                    </FormControl>
                  </Flex>
                  
                  <FormControl>
                    <FormLabel display="flex" alignItems="center" fontSize="sm">
                      <Icon as={FiUsers} mr={2} color="purple.500" />
                      אחראי
                    </FormLabel>
                    <Input
                      name="responsible"
                      value={formData.responsible}
                      onChange={handleChange}
                      placeholder="שם האחראי"
                      bg="white"
                      size="sm"
                    />
                  </FormControl>
                </>
              )}
              
              <HStack justifyContent="space-between">
                <HStack>
                  <Button
                    size="sm"
                    colorScheme="blue"
                    type="submit"
                    isLoading={loading}
                    isDisabled={!formData.title.trim()}
                    leftIcon={<AddIcon />}
                  >
                    הוסף
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCancel}
                  >
                    בטל
                  </Button>
                </HStack>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsAdvancedMode(!isAdvancedMode)}
                  rightIcon={isAdvancedMode ? <ChevronUpIcon /> : <ChevronDownIcon />}
                >
                  {isAdvancedMode ? 'הסתר אפשרויות' : 'הצג אפשרויות נוספות'}
                </Button>
              </HStack>
            </VStack>
          </form>
        </Card>
      )}
    </Box>
  );
};

export default SubtaskInput; 