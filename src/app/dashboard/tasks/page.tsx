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
  const [selectedEntrepreneur, setSelectedEntrepreneur] = useState<string>('');
  const [entrepreneurs, setEntrepreneurs] = useState<string[]>([]);
  
  // הוספת מצב למיון
  const [sortBy, setSortBy] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
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
        
        // חילוץ רשימת היזמים הייחודיים
        const uniqueEntrepreneurs = Array.from(
          new Set(
            projectsData
              .map(project => project.entrepreneur)
              .filter(entrepreneur => entrepreneur !== null && entrepreneur !== '') as string[]
          )
        );
        setEntrepreneurs(uniqueEntrepreneurs);
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
          filteredTasks = filteredTasks.filter(task => 
            task.priority.toLowerCase() === selectedPriority.toLowerCase()
          );
        }
        
        // סינון לפי יזם אם צריך (מבוצע בצד הלקוח)
        if (selectedEntrepreneur) {
          // מציאת פרויקטים של היזם הנבחר
          const entrepreneurProjectIds = projects
            .filter(project => project.entrepreneur === selectedEntrepreneur)
            .map(project => project.id);
          
          // סינון משימות שהן חלק מהפרויקטים של היזם
          filteredTasks = filteredTasks.filter(task => 
            entrepreneurProjectIds.includes(task.project_id)
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
  }, [selectedProject, selectedStatus, selectedPriority, selectedEntrepreneur, projects, toast]);
  
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
      // המרת הסטטוס לאותיות קטנות
      let normalizedStatus = newStatus.toLowerCase();
      
      // וידוא שהסטטוס תקין ותואם לאילוצים בבסיס הנתונים
      const validStatuses = ['todo', 'in_progress', 'review', 'done'];
      
      if (!validStatuses.includes(normalizedStatus)) {
        // אם הסטטוס לא תקין, ננסה למפות אותו לערך תקין
        if (normalizedStatus === 'לביצוע' || normalizedStatus === 'to do' || normalizedStatus === 'todo') {
          normalizedStatus = 'todo';
        } else if (normalizedStatus === 'בתהליך' || normalizedStatus === 'in progress' || normalizedStatus === 'in_progress') {
          normalizedStatus = 'in_progress';
        } else if (normalizedStatus === 'בבדיקה' || normalizedStatus === 'in review' || normalizedStatus === 'review') {
          normalizedStatus = 'review';
        } else if (normalizedStatus === 'הושלם' || normalizedStatus === 'completed' || normalizedStatus === 'done') {
          normalizedStatus = 'done';
        } else {
          // אם לא הצלחנו למפות, נציג שגיאה
          toast({
            title: 'שגיאה בעדכון הסטטוס',
            description: `הסטטוס "${normalizedStatus}" אינו תקין. יש להשתמש באחד מהסטטוסים המוגדרים: ${validStatuses.join(', ')}`,
            status: 'error',
            duration: 5000,
            isClosable: true,
            position: 'top-right',
          });
          return;
        }
      }
      
      await taskService.updateTaskStatus(taskId, normalizedStatus);
      
      // עדכון המשימה ברשימה המקומית
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId ? { ...task, status: normalizedStatus } : task
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
  
  // מיון המשימות לפי הקריטריון שנבחר
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    // אם אין מיון, החזר את הסדר המקורי
    if (!sortBy) return 0;
    
    // מיון לפי הקריטריון שנבחר
    switch (sortBy) {
      case 'due_date': // מיון לפי תאריך יעד
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return sortDirection === 'asc' ? 1 : -1;
        if (!b.due_date) return sortDirection === 'asc' ? -1 : 1;
        return sortDirection === 'asc' 
          ? new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
          : new Date(b.due_date).getTime() - new Date(a.due_date).getTime();
      
      case 'priority': // מיון לפי עדיפות
        const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
        const aPriority = priorityOrder[a.priority.toLowerCase() as keyof typeof priorityOrder] || 0;
        const bPriority = priorityOrder[b.priority.toLowerCase() as keyof typeof priorityOrder] || 0;
        return sortDirection === 'asc' ? aPriority - bPriority : bPriority - aPriority;
      
      case 'estimated_hours': // מיון לפי זמן לביצוע
        const aHours = a.estimated_hours || 0;
        const bHours = b.estimated_hours || 0;
        return sortDirection === 'asc' ? aHours - bHours : bHours - aHours;
      
      case 'late': // מיון לפי איחורים
        const aIsLate = a.due_date && new Date(a.due_date) < new Date() && a.status !== 'done';
        const bIsLate = b.due_date && new Date(b.due_date) < new Date() && b.status !== 'done';
        
        if (aIsLate === bIsLate) {
          // אם שניהם באיחור או שניהם לא, מיין לפי תאריך היעד
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return sortDirection === 'asc' ? 1 : -1;
          if (!b.due_date) return sortDirection === 'asc' ? -1 : 1;
          return sortDirection === 'asc'
            ? new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
            : new Date(b.due_date).getTime() - new Date(a.due_date).getTime();
        }
        
        // אם אחד באיחור והשני לא, הצג את המאחרים קודם
        return sortDirection === 'asc'
          ? (aIsLate ? -1 : 1)
          : (aIsLate ? 1 : -1);
      
      default:
        return 0;
    }
  });
  
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
    { value: 'todo', label: 'לביצוע' },
    { value: 'in_progress', label: 'בתהליך' },
    { value: 'review', label: 'בבדיקה' },
    { value: 'done', label: 'הושלם' },
  ];
  
  // מצבי עדיפות אפשריים
  const priorityOptions = [
    { value: '', label: 'כל העדיפויות' },
    { value: 'high', label: 'גבוהה' },
    { value: 'medium', label: 'בינונית' },
    { value: 'low', label: 'נמוכה' },
  ];
  
  // אפשרויות מיון
  const sortOptions = [
    { value: '', label: 'ללא מיון' },
    { value: 'due_date', label: 'תאריך יעד' },
    { value: 'priority', label: 'עדיפות' },
    { value: 'estimated_hours', label: 'זמן לביצוע' },
    { value: 'late', label: 'איחורים' },
  ];
  
  return (
    <Box>
      <Flex 
        direction={{ base: 'column', md: 'row' }} 
        justify="space-between" 
        align={{ base: 'start', md: 'center' }} 
        mb={6}
      >
        <Heading size={{ base: 'md', md: 'lg' }} mb={{ base: 3, md: 0 }}>משימות</Heading>
        
        <HStack spacing={{ base: 2, md: 4 }} width={{ base: 'full', md: 'auto' }}>
          <Button 
            leftIcon={<FiPlus />} 
            colorScheme="primary" 
            onClick={() => router.push('/dashboard/tasks/new')}
            size={{ base: 'sm', md: 'md' }}
          >
            משימה חדשה
          </Button>
        </HStack>
      </Flex>
      
      <Tabs variant="enclosed" mb={6}>
        <TabList overflowX="auto" flexWrap={{ base: 'nowrap', md: 'wrap' }}>
          <Tab fontSize={{ base: 'sm', md: 'md' }}>
            <Box as={FiList} mr={2} />
            רשימה
          </Tab>
          <Tab fontSize={{ base: 'sm', md: 'md' }}>
            <Box as={FiColumns} mr={2} />
            קנבן
          </Tab>
          <Tab fontSize={{ base: 'sm', md: 'md' }}>
            <Box as={FiCalendar} mr={2} />
            גאנט
          </Tab>
        </TabList>
        
        <Box 
          p={4} 
          borderWidth="1px" 
          borderTop="none" 
          borderRadius="0 0 md md"
        >
          <Flex 
            direction={{ base: 'column', md: 'row' }} 
            mb={4} 
            gap={3}
            width="full"
          >
            <InputGroup maxW={{ base: 'full', md: '300px' }}>
              <InputLeftElement pointerEvents="none">
                <FiSearch color="gray.300" />
              </InputLeftElement>
              <Input 
                placeholder="חיפוש משימות..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)}
                size={{ base: 'sm', md: 'md' }}
              />
            </InputGroup>
            
            <Select 
              placeholder="סנן לפי פרויקט" 
              value={selectedProject}
              onChange={(e) => {
                setSelectedProject(e.target.value);
                // הסרת פוקוס מהתפריט אחרי בחירה
                (e.target as HTMLSelectElement).blur();
              }}
              maxW={{ base: 'full', md: '250px' }}
              size={{ base: 'sm', md: 'md' }}
            >
              <option value="">כל הפרויקטים</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
            
            <Select 
              placeholder="סנן לפי סטטוס" 
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                // הסרת פוקוס מהתפריט אחרי בחירה
                (e.target as HTMLSelectElement).blur();
              }}
              maxW={{ base: 'full', md: '200px' }}
              size={{ base: 'sm', md: 'md' }}
            >
              <option value="">כל הסטטוסים</option>
              <option value="todo">לביצוע</option>
              <option value="in_progress">בתהליך</option>
              <option value="review">בבדיקה</option>
              <option value="done">הושלם</option>
            </Select>
            
            <Select 
              placeholder="סנן לפי עדיפות" 
              value={selectedPriority}
              onChange={(e) => {
                setSelectedPriority(e.target.value);
                // הסרת פוקוס מהתפריט אחרי בחירה
                (e.target as HTMLSelectElement).blur();
              }}
              maxW={{ base: 'full', md: '200px' }}
              size={{ base: 'sm', md: 'md' }}
            >
              <option value="">כל העדיפויות</option>
              <option value="high">גבוהה</option>
              <option value="medium">בינונית</option>
              <option value="low">נמוכה</option>
            </Select>
            
            <Select 
              placeholder="סנן לפי יזם" 
              value={selectedEntrepreneur}
              onChange={(e) => {
                setSelectedEntrepreneur(e.target.value);
                // הסרת פוקוס מהתפריט אחרי בחירה
                (e.target as HTMLSelectElement).blur();
              }}
              maxW={{ base: 'full', md: '200px' }}
              size={{ base: 'sm', md: 'md' }}
            >
              <option value="">כל היזמים</option>
              {entrepreneurs.map((entrepreneur) => (
                <option key={entrepreneur} value={entrepreneur}>
                  {entrepreneur}
                </option>
              ))}
            </Select>
          </Flex>
          
          <TabPanels>
            {/* תצוגת רשימה */}
            <TabPanel p={0}>
              {loading ? (
                <Flex justify="center" align="center" h="200px">
                  <Spinner size="xl" color="primary.500" />
                </Flex>
              ) : filteredTasks.length === 0 ? (
                <Box textAlign="center" p={8}>
                  <Text fontSize="lg" mb={4}>לא נמצאו משימות</Text>
                  <Button 
                    leftIcon={<FiPlus />} 
                    colorScheme="primary" 
                    onClick={() => router.push('/dashboard/tasks/new')}
                  >
                    צור משימה חדשה
                  </Button>
                </Box>
              ) : (
                <VStack spacing={3} align="stretch">
                  {filteredTasks.map((task) => (
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
                </VStack>
              )}
            </TabPanel>
            
            {/* תצוגת קנבן */}
            <TabPanel p={0}>
              {/* תוכן הקנבן */}
            </TabPanel>
            
            {/* תצוגת גאנט */}
            <TabPanel p={0}>
              {/* תוכן הגאנט */}
            </TabPanel>
          </TabPanels>
        </Box>
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
    <Box 
      borderWidth="1px" 
      borderRadius="md" 
      p={{ base: 3, md: 4 }} 
      bg="white" 
      boxShadow="sm"
      _hover={{ boxShadow: 'md' }}
      transition="all 0.2s"
    >
      <Flex 
        direction={{ base: 'column', md: 'row' }} 
        justify="space-between" 
        align={{ base: 'start', md: 'center' }}
      >
        <Flex 
          flex="1" 
          direction={{ base: 'column', md: 'row' }} 
          align={{ base: 'start', md: 'center' }}
          mb={{ base: 3, md: 0 }}
        >
          <Checkbox 
            isChecked={task.status === 'done'} 
            onChange={(e) => onStatusChange(task.id, e.target.checked ? 'done' : 'todo')}
            mr={{ base: 0, md: 3 }}
            mb={{ base: 2, md: 0 }}
            colorScheme="green"
          />
          
          <Box flex="1" onClick={onView} cursor="pointer">
            <Text 
              fontWeight="medium" 
              fontSize={{ base: 'sm', md: 'md' }}
              textDecoration={task.status === 'done' ? 'line-through' : 'none'}
              color={task.status === 'done' ? 'gray.500' : 'inherit'}
              mb={{ base: 1, md: 0 }}
            >
              {task.title}
            </Text>
            
            <Flex 
              wrap="wrap" 
              gap={2} 
              mt={{ base: 2, md: 1 }}
              display={{ base: 'flex', md: 'none' }}
            >
              <Badge colorScheme={getPriorityColor(task.priority || '')}>
                {task.priority}
              </Badge>
              
              <Badge variant="outline">
                {task.status}
              </Badge>
              
              {task.project_id && (
                <Badge variant="subtle" colorScheme="blue">
                  {getProjectName(task.project_id)}
                </Badge>
              )}
              
              {task.due_date && (
                <Badge 
                  colorScheme={
                    new Date(task.due_date) < new Date() && task.status !== 'done' 
                      ? 'red' 
                      : 'gray'
                  }
                >
                  {formatDate(task.due_date)}
                </Badge>
              )}
            </Flex>
          </Box>
        </Flex>
        
        <Flex 
          align="center" 
          gap={{ base: 1, md: 3 }}
          display={{ base: 'none', md: 'flex' }}
        >
          {task.project_id && (
            <Badge variant="subtle" colorScheme="blue">
              {getProjectName(task.project_id)}
            </Badge>
          )}
          
          <Badge colorScheme={getPriorityColor(task.priority || '')}>
            {task.priority}
          </Badge>
          
          <Badge variant="outline">
            {task.status}
          </Badge>
          
          {task.due_date && (
            <Text 
              fontSize="sm" 
              color={
                new Date(task.due_date) < new Date() && task.status !== 'done' 
                  ? 'red.500' 
                  : 'gray.500'
              }
            >
              {formatDate(task.due_date)}
            </Text>
          )}
        </Flex>
        
        <HStack spacing={1} mt={{ base: 2, md: 0 }}>
          <IconButton
            icon={<FiEdit />}
            aria-label="ערוך משימה"
            size="sm"
            variant="ghost"
            onClick={onEdit}
          />
          <Menu closeOnSelect={true}>
            <MenuButton
              as={IconButton}
              icon={<FiMoreVertical />}
              variant="ghost"
              size="sm"
              aria-label="אפשרויות נוספות"
            />
            <MenuList>
              <MenuItem icon={<FiEdit />} onClick={onEdit}>
                ערוך
              </MenuItem>
              <MenuItem icon={<FiTrash2 />} color="red.500" onClick={onDelete}>
                מחק
              </MenuItem>
            </MenuList>
          </Menu>
        </HStack>
      </Flex>
    </Box>
  );
} 