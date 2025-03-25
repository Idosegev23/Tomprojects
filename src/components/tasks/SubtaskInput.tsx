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
} from '@chakra-ui/react';
import { AddIcon, ChevronDownIcon, ChevronUpIcon, CloseIcon } from '@chakra-ui/icons';
import taskService from '@/lib/services/taskService';
import { Task } from '@/types/supabase';

interface SubtaskInputProps {
  parentTaskId: string;
  projectId: string;
  onSubtaskCreated?: (task: Task) => void;
  showExpanded?: boolean;
  onCancel?: () => void;
}

const SubtaskInput: React.FC<SubtaskInputProps> = ({
  parentTaskId,
  projectId,
  onSubtaskCreated,
  showExpanded = false,
  onCancel,
}) => {
  const [isExpanded, setIsExpanded] = useState(showExpanded);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) return;
    
    setLoading(true);
    
    try {
      const newSubtask = {
        title: title.trim(),
        description: '',
        status: 'todo',
        priority: 'medium',
        project_id: projectId,
        parent_task_id: parentTaskId,
      };
      
      const createdTask = await taskService.createTask(newSubtask);
      
      toast({
        title: 'תת-משימה נוצרה בהצלחה',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // איפוס הטופס
      setTitle('');
      
      // עדכון ההורה
      if (onSubtaskCreated) {
        onSubtaskCreated(createdTask);
      }
      
      // סגירת הטופס אם יש צורך
      if (onCancel) {
        setIsExpanded(false);
      }
    } catch (error) {
      console.error('Error creating subtask:', error);
      toast({
        title: 'שגיאה ביצירת תת-משימה',
        description: error instanceof Error ? error.message : 'אירעה שגיאה לא ידועה',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };
  
  // פונקציה לביטול הפעולה
  const handleCancel = () => {
    setTitle('');
    setIsExpanded(false);
    
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
        <Box
          borderWidth="1px"
          borderRadius="md"
          p={3}
          bg="gray.50"
        >
          <form onSubmit={handleAddSubtask}>
            <Flex gap={2} direction="column">
              <Input
                placeholder="הזן כותרת לתת-משימה חדשה"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                bg="white"
                size="md"
                autoFocus
              />
              <HStack justifyContent="space-between">
                <Button
                  size="sm"
                  colorScheme="blue"
                  type="submit"
                  isLoading={loading}
                  isDisabled={!title.trim()}
                  leftIcon={<AddIcon />}
                >
                  הוסף תת-משימה
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancel}
                  leftIcon={<CloseIcon />}
                >
                  בטל
                </Button>
              </HStack>
            </Flex>
          </form>
        </Box>
      )}
    </Box>
  );
};

export default SubtaskInput; 