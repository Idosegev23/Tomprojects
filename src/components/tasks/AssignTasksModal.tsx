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
  VStack,
  HStack,
  Text,
  Checkbox,
  Badge,
  Box,
  Flex,
  Spinner,
  Input,
  InputGroup,
  InputLeftElement,
  useToast,
  Divider,
} from '@chakra-ui/react';
import { FiSearch, FiCalendar } from 'react-icons/fi';
import { Task } from '@/types/supabase';
import taskService from '@/lib/services/taskService';

interface AssignTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onTasksAssigned: (tasks: Task[]) => void;
}

const AssignTasksModal: React.FC<AssignTasksModalProps> = ({
  isOpen,
  onClose,
  projectId,
  onTasksAssigned,
}) => {
  const [unassignedTasks, setUnassignedTasks] = useState<Task[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const toast = useToast();
  
  // טעינת משימות לא משויכות
  useEffect(() => {
    const loadUnassignedTasks = async () => {
      try {
        setLoading(true);
        const tasks = await taskService.getUnassignedTasks();
        setUnassignedTasks(tasks);
      } catch (err) {
        console.error('Error loading unassigned tasks:', err);
        setError('אירעה שגיאה בטעינת המשימות');
      } finally {
        setLoading(false);
      }
    };
    
    if (isOpen) {
      loadUnassignedTasks();
    }
  }, [isOpen]);
  
  // סינון משימות לפי חיפוש
  const filteredTasks = unassignedTasks.filter(task => 
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  // טיפול בבחירת משימה
  const handleTaskSelection = (taskId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedTaskIds([...selectedTaskIds, taskId]);
    } else {
      setSelectedTaskIds(selectedTaskIds.filter(id => id !== taskId));
    }
  };
  
  // טיפול בבחירת כל המשימות
  const handleSelectAll = (isSelected: boolean) => {
    if (isSelected) {
      setSelectedTaskIds(filteredTasks.map(task => task.id));
    } else {
      setSelectedTaskIds([]);
    }
  };
  
  // המרת תאריך לפורמט מקומי
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'לא נקבע';
    
    try {
      return new Date(dateString).toLocaleDateString('he-IL');
    } catch (e) {
      return 'תאריך לא תקין';
    }
  };
  
  // קבלת צבע לפי סטטוס
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
  
  // שיוך המשימות שנבחרו לפרויקט
  const handleAssignTasks = async () => {
    if (selectedTaskIds.length === 0) {
      toast({
        title: 'לא נבחרו משימות',
        description: 'יש לבחור לפחות משימה אחת לשיוך',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    try {
      setLoading(true);
      const assignedTasks = await taskService.assignTasksToProject(selectedTaskIds, projectId);
      
      toast({
        title: 'המשימות שויכו בהצלחה',
        description: `${assignedTasks.length} משימות שויכו לפרויקט`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      onTasksAssigned(assignedTasks);
      onClose();
    } catch (err) {
      console.error('Error assigning tasks:', err);
      
      toast({
        title: 'שגיאה בשיוך המשימות',
        description: err instanceof Error ? err.message : 'אירעה שגיאה לא ידועה',
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
        <ModalHeader>שיוך משימות לפרויקט</ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Text>בחר משימות לשיוך לפרויקט הנוכחי:</Text>
            
            <InputGroup>
              <InputLeftElement pointerEvents="none">
                <FiSearch color="gray.300" />
              </InputLeftElement>
              <Input 
                placeholder="חיפוש משימות..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </InputGroup>
            
            {loading ? (
              <Flex justify="center" py={8}>
                <Spinner size="lg" />
              </Flex>
            ) : error ? (
              <Text color="red.500" textAlign="center">{error}</Text>
            ) : filteredTasks.length === 0 ? (
              <Text textAlign="center" py={4}>
                {searchTerm ? 'לא נמצאו משימות התואמות את החיפוש' : 'אין משימות לא משויכות'}
              </Text>
            ) : (
              <>
                <Flex justify="space-between" align="center" mb={2}>
                  <Checkbox 
                    isChecked={selectedTaskIds.length === filteredTasks.length && filteredTasks.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  >
                    בחר הכל ({filteredTasks.length})
                  </Checkbox>
                  <Text fontSize="sm">נבחרו {selectedTaskIds.length} משימות</Text>
                </Flex>
                
                <Divider mb={2} />
                
                <VStack spacing={2} align="stretch" maxH="400px" overflowY="auto">
                  {filteredTasks.map(task => (
                    <Box 
                      key={task.id} 
                      p={3} 
                      borderWidth="1px" 
                      borderRadius="md"
                      _hover={{ bg: 'gray.50' }}
                    >
                      <Flex justify="space-between" align="flex-start">
                        <HStack align="flex-start" spacing={3}>
                          <Checkbox 
                            isChecked={selectedTaskIds.includes(task.id)}
                            onChange={(e) => handleTaskSelection(task.id, e.target.checked)}
                          />
                          <VStack align="flex-start" spacing={1}>
                            <Text fontWeight="bold">{task.title}</Text>
                            {task.description && (
                              <Text fontSize="sm" noOfLines={2}>{task.description}</Text>
                            )}
                            <HStack spacing={2}>
                              <Badge colorScheme={getStatusColor(task.status)}>{task.status}</Badge>
                              {task.due_date && (
                                <Text fontSize="xs" color="gray.600">
                                  <FiCalendar style={{ display: 'inline', marginLeft: '2px' }} />
                                  {formatDate(task.due_date)}
                                </Text>
                              )}
                            </HStack>
                          </VStack>
                        </HStack>
                      </Flex>
                    </Box>
                  ))}
                </VStack>
              </>
            )}
          </VStack>
        </ModalBody>
        
        <ModalFooter>
          <Button variant="outline" mr={3} onClick={onClose}>
            ביטול
          </Button>
          <Button 
            colorScheme="blue" 
            onClick={handleAssignTasks}
            isLoading={loading}
            isDisabled={selectedTaskIds.length === 0}
          >
            שייך משימות
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default AssignTasksModal; 