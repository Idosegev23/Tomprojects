import React, { useState } from 'react';
import {
  Box,
  Flex,
  Input,
  IconButton,
  useToast,
  Collapse,
  Button,
  Text,
  Select,
  Tooltip,
  FormControl,
  Fade,
  HStack,
  Checkbox,
  InputGroup,
  InputLeftElement,
  Badge,
  useColorModeValue
} from '@chakra-ui/react';
import { AddIcon, ChevronDownIcon, ChevronUpIcon, CalendarIcon } from '@chakra-ui/icons';
import taskService from '@/lib/services/taskService';
import { Task } from '@/types/supabase';
import TaskTemplateButton from './TaskTemplateButton';

interface QuickAddTaskProps {
  projectId: string;
  onTaskCreated?: (task: Task) => void;
}

const QuickAddTask: React.FC<QuickAddTaskProps> = ({ projectId, onTaskCreated }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState(getDefaultDueDate());
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  
  const bgColor = useColorModeValue('white', 'gray.800');

  // תאריך ברירת מחדל - שבוע מהיום
  function getDefaultDueDate(): string {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().split('T')[0];
  }

  // טיפול בתבנית שנבחרה
  const handleTemplateSelected = (template: any) => {
    setTitle(template.title || '');
    setPriority(template.priority || 'medium');
    setCategory(template.category || '');
    setIsExpanded(true);
    
    // אם יש שדות נוספים בתבנית שצריך להציג, נפתח את האפשרויות המתקדמות
    if (template.category) {
      setShowAdvanced(true);
    }
    
    toast({
      title: `תבנית "${template.name}" נטענה`,
      status: 'info',
      duration: 2000,
      isClosable: true,
    });
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) return;
    
    setLoading(true);
    
    try {
      const newTask = {
        title: title.trim(),
        description: '',
        status: 'todo',
        priority,
        project_id: projectId,
        due_date: dueDate,
        category,
      };
      
      const createdTask = await taskService.createTask(newTask);
      
      toast({
        title: 'המשימה נוצרה בהצלחה',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // איפוס הטופס
      setTitle('');
      setPriority('medium');
      setDueDate(getDefaultDueDate());
      setCategory('');
      
      // סגירת ההרחבה אם המשימה נוספה בהצלחה
      setIsExpanded(false);
      setShowAdvanced(false);
      
      // עדכון ההורה
      if (onTaskCreated) {
        onTaskCreated(createdTask);
      }
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: 'שגיאה ביצירת המשימה',
        description: error instanceof Error ? error.message : 'אירעה שגיאה לא ידועה',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // פונקציה לקבלת צבע הרקע של עדיפות
  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'low': return 'green.400';
      case 'medium': return 'orange.400';
      case 'high': return 'red.500';
      case 'urgent': return 'purple.500';
      default: return 'gray.400';
    }
  };
  
  return (
    <Box
      borderWidth="1px"
      borderRadius="md"
      overflow="hidden"
      bg={bgColor}
      boxShadow="sm"
      transition="all 0.3s"
      _hover={{ boxShadow: isExpanded ? 'md' : 'sm' }}
      mb={4}
    >
      <Flex 
        p={2} 
        onClick={() => !isExpanded && setIsExpanded(true)}
        cursor={isExpanded ? 'default' : 'pointer'}
        borderBottomWidth={isExpanded ? "1px" : "0"}
        align="center"
        justify="space-between"
      >
        {!isExpanded ? (
          <Flex align="center" w="100%">
            <AddIcon mr={2} color="blue.500" />
            <Text color="gray.500">הוסף משימה חדשה במהירות...</Text>
          </Flex>
        ) : (
          <Text fontWeight="medium">הוספת משימה מהירה</Text>
        )}
        
        {isExpanded && (
          <IconButton
            icon={<ChevronUpIcon />}
            aria-label="סגור טופס"
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(false);
              setShowAdvanced(false);
            }}
          />
        )}
      </Flex>
      
      <Collapse in={isExpanded} animateOpacity>
        <Box p={4}>
          <form onSubmit={handleAddTask}>
            <Flex direction="column" gap={3}>
              {/* שורה ראשונה - כותרת, עדיפות וכפתור הוספה */}
              <Flex direction={{ base: 'column', md: 'row' }} gap={2}>
                <FormControl flex="1">
                  <Input
                    placeholder="הזן כותרת למשימה..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    autoFocus
                  />
                </FormControl>
                
                <Select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  width={{ base: "100%", md: "150px" }}
                  bg={getPriorityColor(priority)}
                  color={priority === 'low' ? 'black' : 'white'}
                  fontWeight="medium"
                >
                  <option value="low">נמוכה</option>
                  <option value="medium">בינונית</option>
                  <option value="high">גבוהה</option>
                  <option value="urgent">דחופה</option>
                </Select>
                
                <HStack>
                  <Button
                    colorScheme="blue"
                    type="submit"
                    leftIcon={<AddIcon />}
                    isLoading={loading}
                    isDisabled={!title.trim()}
                  >
                    הוסף
                  </Button>
                  
                  <TaskTemplateButton
                    variant="ghost"
                    size="md"
                    onSelectTemplate={handleTemplateSelected}
                  />
                  
                  <Button
                    size="md"
                    variant="ghost"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    rightIcon={showAdvanced ? <ChevronUpIcon /> : <ChevronDownIcon />}
                  >
                    {showAdvanced ? 'פחות' : 'עוד'}
                  </Button>
                </HStack>
              </Flex>
              
              {/* שורה שנייה - אפשרויות נוספות */}
              <Collapse in={showAdvanced} animateOpacity>
                <Flex direction={{ base: 'column', md: 'row' }} gap={3} mt={2}>
                  <FormControl>
                    <InputGroup>
                      <InputLeftElement pointerEvents="none">
                        <CalendarIcon color="gray.400" />
                      </InputLeftElement>
                      <Input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        placeholder="תאריך יעד"
                      />
                    </InputGroup>
                  </FormControl>
                  
                  <Select
                    placeholder="בחר קטגוריה"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="פיתוח">פיתוח</option>
                    <option value="עיצוב">עיצוב</option>
                    <option value="תוכן">תוכן</option>
                    <option value="שיווק">שיווק</option>
                    <option value="תשתיות">תשתיות</option>
                    <option value="אחר">אחר</option>
                  </Select>
                </Flex>
              </Collapse>
            </Flex>
          </form>
        </Box>
      </Collapse>
    </Box>
  );
};

export default QuickAddTask; 