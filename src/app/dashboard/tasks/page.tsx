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
      
      <Flex direction={{ base: 'column', md: 'row' }} mb={6} gap={4} wrap="wrap">
        <InputGroup maxW={{ base: '100%', md: '300px' }}>
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
          placeholder="סנן לפי פרויקט" 
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          maxW={{ base: '100%', md: '200px' }}
        >
          <option value="">כל הפרויקטים</option>
          {projects.map(project => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </Select>
        
        <Select 
          placeholder="סנן לפי יזם" 
          value={selectedEntrepreneur}
          onChange={(e) => setSelectedEntrepreneur(e.target.value)}
          maxW={{ base: '100%', md: '200px' }}
        >
          <option value="">כל היזמים</option>
          {entrepreneurs.map(entrepreneur => (
            <option key={entrepreneur} value={entrepreneur}>
              {entrepreneur}
            </option>
          ))}
        </Select>
        
        <Select 
          placeholder="סנן לפי סטטוס" 
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          maxW={{ base: '100%', md: '200px' }}
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
        
        {/* הוספת אפשרויות מיון */}
        <Flex gap={2} maxW={{ base: '100%', md: '300px' }}>
          <Select 
            placeholder="מיין לפי" 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            maxW={{ base: '100%', md: '160px' }}
          >
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </Select>
          
          <Select 
            value={sortDirection}
            onChange={(e) => setSortDirection(e.target.value as 'asc' | 'desc')}
            maxW={{ base: '100%', md: '120px' }}
            isDisabled={!sortBy}
          >
            <option value="asc">עולה</option>
            <option value="desc">יורד</option>
          </Select>
        </Flex>
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
            ) : sortedTasks.length === 0 ? (
              <Flex direction="column" alignItems="center" justifyContent="center" my={10} textAlign="center">
                <Text fontSize="lg">לא נמצאו משימות</Text>
                {searchQuery || selectedProject || selectedStatus || selectedPriority || selectedEntrepreneur ? (
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
                {sortedTasks.map(task => (
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
                
                {sortedTasks.length > 0 && (
                  <Text textAlign="center" color="gray.500" py={4}>
                    סה"כ: {sortedTasks.length} משימות
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
          isChecked={task.status === 'done'} 
          onChange={(e) => {
            onStatusChange(
              task.id, 
              e.target.checked ? 'done' : 'todo'
            );
          }}
        />
        
        <Box>
          <Text 
            fontWeight="medium" 
            textDecoration={task.status === 'done' ? 'line-through' : 'none'}
            color={task.status === 'done' ? 'gray.500' : 'inherit'}
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
                new Date(task.due_date) < new Date() && task.status !== 'done'
                  ? 'red.500'
                  : 'gray.600'
              }>
                יעד: {formatDate(task.due_date)}
              </Text>
            )}
            {/* סימון משימות שעבר זמנן */}
            {task.due_date && 
              new Date(task.due_date) < new Date() && task.status !== 'done' && (
              <Badge colorScheme="red" ml={2}>
                איחור
              </Badge>
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