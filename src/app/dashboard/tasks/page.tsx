'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Heading, 
  Flex, 
  Button,
  Select,
  Input,
  VStack,
  HStack,
  Text,
  Checkbox,
  Badge,
  IconButton,
  Spinner,
  useDisclosure,
} from '@chakra-ui/react';
import {
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  InputGroup,
  InputLeftElement,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useToast,
} from '@chakra-ui/react';
import { 
  FiPlus, 
  FiSearch, 
  FiList, 
  FiCalendar, 
  FiColumns,
  FiChevronLeft,
  FiChevronRight,
  FiMoreVertical,
  FiEdit,
  FiTrash2,
  FiAlertCircle
} from 'react-icons/fi';
import { useRouter, useSearchParams } from 'next/navigation';
import taskService from '@/lib/services/taskService';
import projectService from '@/lib/services/projectService';
import { Task, Project } from '@/types/supabase';
import { useAuthContext } from '@/components/auth/AuthProvider';

export default function Tasks() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<number>(0);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { user } = useAuthContext();
  
  // בדיקה אם יש פרמטר של פרויקט בURL
  useEffect(() => {
    const projectId = searchParams.get('projectId');
    if (projectId) {
      setSelectedProject(projectId);
    }
  }, [searchParams]);
  
  // טעינת רשימת הפרויקטים
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const projectsData = await projectService.getProjects();
        setProjects(projectsData);
      } catch (err) {
        console.error('שגיאה בטעינת פרויקטים:', err);
        toast({
          title: 'שגיאה בטעינת פרויקטים',
          status: 'error',
          duration: 3000,
          isClosable: true,
          position: 'top-right',
        });
      }
    };
    
    fetchProjects();
  }, [toast]);
  
  // טעינת רשימת המשימות
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        
        const filters: { projectId?: string; status?: string; } = {};
        
        // הוספת פילטרים אם יש כאלה
        if (selectedProject) {
          filters.projectId = selectedProject;
        }
        
        if (selectedStatus) {
          filters.status = selectedStatus;
        }
        
        const tasksData = await taskService.getTasks(filters);
        
        // סינון לפי עדיפות אם צריך (מבוצע בצד הלקוח כי אין פילטר לזה בשרת)
        let filteredTasks = tasksData;
        if (selectedPriority) {
          filteredTasks = tasksData.filter(task => 
            task.priority.toLowerCase() === selectedPriority.toLowerCase()
          );
        }
        
        setTasks(filteredTasks);
      } catch (err) {
        console.error('שגיאה בטעינת משימות:', err);
        setError('אירעה שגיאה בטעינת המשימות. אנא נסה שוב.');
        
        toast({
          title: 'שגיאה בטעינת משימות',
          description: err instanceof Error ? err.message : 'אירעה שגיאה בלתי צפויה',
          status: 'error',
          duration: 5000,
          isClosable: true,
          position: 'top-right',
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchTasks();
  }, [selectedProject, selectedStatus, selectedPriority, toast]);
  
  // מחיקת משימה
  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק משימה זו? פעולה זו אינה הפיכה.')) {
      return;
    }
    
    try {
      await taskService.deleteTask(taskId);
      
      // עדכון רשימת המשימות המקומית
      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
      
      toast({
        title: 'המשימה נמחקה בהצלחה',
        status: 'success',
        duration: 3000,
        isClosable: true,
        position: 'top-right',
      });
    } catch (err) {
      console.error('שגיאה במחיקת משימה:', err);
      
      toast({
        title: 'שגיאה במחיקת המשימה',
        description: err instanceof Error ? err.message : 'אירעה שגיאה במחיקת המשימה',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top-right',
      });
    }
  };
  
  // עדכון סטטוס משימה
  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await taskService.updateTaskStatus(taskId, newStatus);
      
      // עדכון המשימה ברשימה המקומית
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId ? { ...task, status: newStatus } : task
        )
      );
      
      toast({
        title: 'סטטוס המשימה עודכן',
        status: 'success',
        duration: 2000,
        isClosable: true,
        position: 'top-right',
      });
    } catch (err) {
      console.error('שגיאה בעדכון סטטוס משימה:', err);
      
      toast({
        title: 'שגיאה בעדכון הסטטוס',
        description: err instanceof Error ? err.message : 'אירעה שגיאה בעדכון סטטוס המשימה',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top-right',
      });
    }
  };
  
  // סינון המשימות לפי חיפוש
  const filteredTasks = tasks.filter(task => 
    task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  // קבלת צבע לפי עדיפות
  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
      case 'גבוהה': return 'red';
      case 'medium':
      case 'בינונית': return 'orange';
      case 'low': 
      case 'נמוכה': return 'green';
      default: return 'gray';
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
  
  // קבלת שם פרויקט לפי מזהה
  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project ? project.name : 'לא משויך לפרויקט';
  };
  
  // מצבי סטטוס אפשריים
  const statusOptions = [
    { value: '', label: 'כל הסטטוסים' },
    { value: 'to do', label: 'לביצוע' },
    { value: 'in progress', label: 'בתהליך' },
    { value: 'in review', label: 'בבדיקה' },
    { value: 'completed', label: 'הושלם' },
  ];
  
  // מצבי עדיפות אפשריים
  const priorityOptions = [
    { value: '', label: 'כל העדיפויות' },
    { value: 'high', label: 'גבוהה' },
    { value: 'medium', label: 'בינונית' },
    { value: 'low', label: 'נמוכה' },
  ];
  
  return (
    <Box>
      <Flex justifyContent="space-between" alignItems="center" mb={6}>
        <Heading>משימות</Heading>
        <Button 
          leftIcon={<FiPlus />} 
          colorScheme="primary"
          onClick={() => router.push('/dashboard/tasks/new')}
        >
          משימה חדשה
        </Button>
      </Flex>
      
      <Flex mb={6} gap={2} flexWrap="wrap">
        <InputGroup maxW={{ base: "100%", md: "300px" }}>
          <InputLeftElement pointerEvents="none">
            <FiSearch color="gray.300" />
          </InputLeftElement>
          <Input 
            placeholder="חיפוש משימות..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </InputGroup>
        
        <Select 
          placeholder="כל הפרויקטים" 
          maxW={{ base: "100%", md: "200px" }}
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
        >
          {projects.map(project => (
            <option key={project.id} value={project.id}>{project.name}</option>
          ))}
        </Select>
        
        <Select 
          placeholder="סטטוס" 
          maxW={{ base: "100%", md: "160px" }}
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        >
          {statusOptions.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </Select>
        
        <Select 
          placeholder="עדיפות" 
          maxW={{ base: "100%", md: "160px" }}
          value={selectedPriority}
          onChange={(e) => setSelectedPriority(e.target.value)}
        >
          {priorityOptions.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </Select>
      </Flex>
      
      <Tabs variant="enclosed" onChange={(index) => setActiveTab(index)}>
        <TabList>
          <Tab><HStack><FiList /><Text mr={2}>רשימה</Text></HStack></Tab>
          <Tab><HStack><FiColumns /><Text mr={2}>קנבן</Text></HStack></Tab>
          <Tab><HStack><FiCalendar /><Text mr={2}>לוח שנה</Text></HStack></Tab>
        </TabList>
        
        <TabPanels>
          {/* תצוגת רשימה */}
          <TabPanel p={0} pt={4}>
            {loading ? (
              <Flex justify="center" my={10}>
                <Spinner size="xl" color="primary.500" thickness="4px" />
              </Flex>
            ) : error ? (
              <Flex direction="column" alignItems="center" justifyContent="center" my={10} textAlign="center">
                <FiAlertCircle size={40} color="red" />
                <Text mt={4} fontSize="lg" fontWeight="medium">
                  {error}
                </Text>
                <Button 
                  mt={4}
                  onClick={() => window.location.reload()}
                  colorScheme="primary"
                  variant="outline"
                >
                  נסה שוב
                </Button>
              </Flex>
            ) : filteredTasks.length === 0 ? (
              <Flex direction="column" alignItems="center" justifyContent="center" my={10} textAlign="center">
                <Text fontSize="lg">לא נמצאו משימות</Text>
                {searchQuery || selectedProject || selectedStatus || selectedPriority ? (
                  <Text>נסה לשנות את הפילטרים</Text>
                ) : (
                  <Button 
                    mt={4}
                    leftIcon={<FiPlus />}
                    colorScheme="primary"
                    onClick={() => router.push('/dashboard/tasks/new')}
                  >
                    צור משימה חדשה
                  </Button>
                )}
              </Flex>
            ) : (
              <VStack spacing={2} align="stretch">
                {filteredTasks.map(task => (
                  <TaskItem 
                    key={task.id} 
                    task={task} 
                    formatDate={formatDate}
                    getPriorityColor={getPriorityColor}
                    getProjectName={getProjectName}
                    onStatusChange={handleStatusChange}
                    onDelete={() => handleDeleteTask(task.id)}
                    onEdit={() => router.push(`/dashboard/tasks/${task.id}/edit`)}
                    onView={() => router.push(`/dashboard/tasks/${task.id}`)}
                  />
                ))}
                
                {filteredTasks.length > 0 && (
                  <Text textAlign="center" color="gray.500" py={4}>
                    סה"כ: {filteredTasks.length} משימות
                  </Text>
                )}
              </VStack>
            )}
          </TabPanel>
          
          {/* תצוגת קנבן */}
          <TabPanel>
            <Text textAlign="center" p={10} color="gray.500">
              תצוגת קנבן תהיה זמינה בקרוב - עדיין בפיתוח
            </Text>
          </TabPanel>
          
          {/* תצוגת לוח שנה */}
          <TabPanel>
            <Text textAlign="center" p={10} color="gray.500">
              תצוגת לוח שנה תהיה זמינה בקרוב - עדיין בפיתוח
            </Text>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
}

interface TaskItemProps {
  task: Task;
  formatDate: (date: string | null) => string;
  getPriorityColor: (priority: string) => string;
  getProjectName: (projectId: string) => string;
  onStatusChange: (taskId: string, newStatus: string) => void;
  onDelete: () => void;
  onEdit: () => void;
  onView: () => void;
}

function TaskItem({ 
  task, 
  formatDate, 
  getPriorityColor, 
  getProjectName,
  onStatusChange,
  onDelete,
  onEdit,
  onView
}: TaskItemProps) {
  return (
    <Flex 
      p={3} 
      borderWidth="1px" 
      borderRadius="md" 
      justifyContent="space-between"
      alignItems="center"
      bg="white"
      _hover={{ bg: 'gray.50' }}
      transition="background 0.2s"
    >
      <HStack spacing={3} flex={1}>
        <Checkbox 
          size="lg" 
          colorScheme="green" 
          isChecked={task.status === 'completed'} 
          onChange={(e) => {
            onStatusChange(
              task.id, 
              e.target.checked ? 'completed' : 'to do'
            );
          }}
        />
        
        <Box>
          <Text 
            fontWeight="medium" 
            textDecoration={task.status === 'completed' ? 'line-through' : 'none'}
            color={task.status === 'completed' ? 'gray.500' : 'inherit'}
          >
            {task.title}
          </Text>
          <HStack mt={1} spacing={2}>
            <Badge colorScheme={getPriorityColor(task.priority)} size="sm">
              {task.priority}
            </Badge>
            <Badge variant="outline" size="sm">
              {task.status}
            </Badge>
            <Text fontSize="xs" color="gray.600">
              {getProjectName(task.project_id)}
            </Text>
            {task.due_date && (
              <Text fontSize="xs" color={
                new Date(task.due_date) < new Date() && task.status !== 'completed'
                  ? 'red.500'
                  : 'gray.600'
              }>
                יעד: {formatDate(task.due_date)}
              </Text>
            )}
          </HStack>
        </Box>
      </HStack>
      
      <HStack>
        <Menu>
          <MenuButton
            as={IconButton}
            icon={<FiMoreVertical />}
            variant="ghost"
            size="sm"
            aria-label="אפשרויות"
          />
          <MenuList>
            <MenuItem onClick={onView}>צפייה</MenuItem>
            <MenuItem onClick={onEdit}>עריכה</MenuItem>
            <MenuItem onClick={onDelete} color="red.600">מחיקה</MenuItem>
          </MenuList>
        </Menu>
      </HStack>
    </Flex>
  );
} 