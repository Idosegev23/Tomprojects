'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Box, 
  SimpleGrid, 
  Heading, 
  Text, 
  Flex, 
  Stat, 
  StatLabel, 
  StatNumber, 
  StatHelpText,
  Card, 
  CardBody,
  CardHeader,
  CardFooter,
  Icon,
  Select,
  Button,
  HStack,
  VStack,
  Spinner,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Link,
  Tooltip,
  Progress,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Divider,
  Tag,
  TagLabel,
  TagLeftIcon,
  AlertIcon,
  Alert,
  useColorModeValue,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  TableContainer,
  LinkBox,
  LinkOverlay,
  IconButton,
  useToast
} from '@chakra-ui/react';
import { 
  FiUsers, 
  FiFolder, 
  FiCheckSquare, 
  FiAlertCircle, 
  FiCalendar,
  FiClock,
  FiFilter,
  FiRefreshCw,
  FiBell,
  FiTrendingUp,
  FiBarChart2,
  FiEdit,
  FiArrowRight
} from 'react-icons/fi';
import NextLink from 'next/link';
import projectService from '@/lib/services/projectService';
import taskService from '@/lib/services/taskService';
import entrepreneurService from '@/lib/services/entrepreneurService';
import { Project, Task } from '@/types/supabase';
import { useSearchParams } from 'next/navigation';
import TaskKanban from '@/components/tasks/TaskKanban';

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [entrepreneurs, setEntrepreneurs] = useState<{ id: string, name: string }[]>([]);
  const [selectedEntrepreneur, setSelectedEntrepreneur] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const toast = useToast();
  
  // טעינת נתונים
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // טעינת פרויקטים
        const projectsData = await projectService.getProjects();
        setProjects(projectsData);
        
        // טעינת משימות
        const tasksData = await taskService.getTasks();
        setTasks(tasksData);
        
        // טעינת רשימת היזמים
        try {
          const entrepreneursData = await entrepreneurService.getEntrepreneurs();
          setEntrepreneurs(entrepreneursData.map(e => ({ id: e.id, name: e.name })));
          
          // בדיקה אם יש פרמטר entrepreneur ב-URL
          const entrepreneurId = searchParams?.get('entrepreneur');
          if (entrepreneurId) {
            // חיפוש היזם לפי המזהה
            const foundEntrepreneur = entrepreneursData.find(e => e.id === entrepreneurId);
            if (foundEntrepreneur) {
              setSelectedEntrepreneur(foundEntrepreneur.id);
              console.log(`נבחר יזם מה-URL: ${foundEntrepreneur.name} (${foundEntrepreneur.id})`);
            }
          }
          
          // בדיקה אם יש פרמטר status ב-URL
          const statusParam = searchParams?.get('status');
          if (statusParam) {
            setSelectedStatus(statusParam);
          }
          
        } catch (error) {
          console.error('שגיאה בטעינת יזמים:', error);
          setError('שגיאה בטעינת נתוני יזמים');
        }
        
        // עדכון זמן הרענון האחרון
        setLastUpdated(new Date());
      } catch (error) {
        console.error('שגיאה בטעינת נתונים:', error);
        setError('שגיאה בטעינת נתונים');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };
    
    fetchData();
  }, [searchParams]);
  
  // פונקציה לרענון הנתונים
  const refreshData = async () => {
    setRefreshing(true);
    try {
      // טעינת פרויקטים
      const projectsData = await projectService.getProjects();
      setProjects(projectsData);
      
      // טעינת משימות
      const tasksData = await taskService.getTasks();
      setTasks(tasksData);
      
      // עדכון זמן הרענון האחרון
      setLastUpdated(new Date());
      setError(null);
    } catch (error) {
      console.error('שגיאה ברענון נתונים:', error);
      setError('שגיאה ברענון נתונים');
    } finally {
      setRefreshing(false);
    }
  };
  
  // סינון פרויקטים לפי יזם וסטטוס
  const filteredProjects = useMemo(() => {
    let result = [...projects];
    
    // סינון לפי יזם
    if (selectedEntrepreneur) {
      result = result.filter(project => project.entrepreneur_id === selectedEntrepreneur);
    }
    
    // סינון לפי סטטוס
    if (selectedStatus) {
      result = result.filter(project => project.status === selectedStatus);
    }
    
    return result;
  }, [projects, selectedEntrepreneur, selectedStatus]);
  
  // סינון משימות לפי יזם
  const filteredTasks = useMemo(() => {
    let result = [...tasks];
    
    // סינון לפי יזם (דרך הפרויקט)
    if (selectedEntrepreneur) {
      result = result.filter(task => {
        const projectOfTask = projects.find(p => p.id === task.project_id);
        return projectOfTask?.entrepreneur_id === selectedEntrepreneur;
      });
    }
    
    return result;
  }, [tasks, projects, selectedEntrepreneur]);
  
  // חישוב סטטיסטיקות
  const stats = useMemo(() => {
    const activeProjects = filteredProjects.filter(p => p.status === 'active').length;
    const completedProjects = filteredProjects.filter(p => p.status === 'completed').length;
    const openTasks = filteredTasks.filter(t => t.status !== 'done').length;
    const completedTasks = filteredTasks.filter(t => t.status === 'done').length;
    const highPriorityTasks = filteredTasks.filter(t => t.priority === 'high' && t.status !== 'done').length;
    const lateTasks = filteredTasks.filter(t => 
      t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done'
    ).length;
    
    // חישוב אחוז משימות שהושלמו
    const taskCompletionRate = tasks.length > 0
      ? Math.round((completedTasks / tasks.length) * 100)
      : 0;
    
    // חישוב אחוז פרויקטים שהושלמו
    const projectCompletionRate = projects.length > 0
      ? Math.round((completedProjects / projects.length) * 100)
      : 0;
      
    return {
      activeProjects,
      completedProjects,
      openTasks,
      completedTasks,
      highPriorityTasks,
      lateTasks,
      taskCompletionRate,
      projectCompletionRate
    };
  }, [filteredProjects, filteredTasks, tasks.length, projects.length]);
  
  // פרויקטים אחרונים (5 האחרונים)
  const recentProjects = useMemo(() => {
    return [...filteredProjects]
      .sort((a, b) => {
        // בדיקה שאין ערכי null או undefined
        if (!a.updated_at && !b.updated_at) return 0;
        if (!a.updated_at) return 1;
        if (!b.updated_at) return -1;
        
        // המרה בטוחה יותר לטיימסטמפ
        const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [filteredProjects]);
  
  // משימות דחופות
  const urgentTasks = useMemo(() => {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    
    return [...filteredTasks]
      .filter(t => {
        // משימות שעוד לא הושלמו
        if (t.status === 'done') return false;
        
        // משימות ללא תאריך יעד לא ייחשבו דחופות
        if (!t.due_date) return false;
        
        const dueDate = new Date(t.due_date);
        
        // משימות בעדיפות גבוהה או באיחור
        return (
          t.priority === 'high' || 
          dueDate < today || 
          (dueDate >= today && dueDate <= nextWeek)
        );
      })
      .sort((a, b) => {
        // קודם מיון לפי תאריך יעד
        if (a.due_date && b.due_date) {
          const dateA = new Date(a.due_date).getTime();
          const dateB = new Date(b.due_date).getTime();
          if (dateA !== dateB) return dateA - dateB;
        }
        
        // אם תאריכי היעד זהים, מיון לפי עדיפות
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return (priorityOrder[a.priority as keyof typeof priorityOrder] || 999) - 
               (priorityOrder[b.priority as keyof typeof priorityOrder] || 999);
      })
      .slice(0, 5);
  }, [filteredTasks]);
  
  // פונקציה להמרת תאריך לפורמט מקומי
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'לא נקבע';
    
    try {
      return new Date(dateString).toLocaleDateString('he-IL');
    } catch (e) {
      return 'תאריך לא תקין';
    }
  };
  
  // פונקציה לפורמט של זמן אחרון
  const formatLastUpdated = (date: Date | null) => {
    if (!date) return 'טרם עודכן';
    
    try {
      return new Intl.DateTimeFormat('he-IL', {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      }).format(date);
    } catch (e) {
      return 'זמן לא תקין';
    }
  };
  
  // פונקציה לבדיקה אם משימה באיחור
  const isTaskOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    
    try {
      const taskDueDate = new Date(dueDate);
      const today = new Date();
      return taskDueDate < today;
    } catch (e) {
      return false;
    }
  };
  
  // פונקציה לחישוב כמה זמן נותר עד לתאריך היעד
  const getDueDateStatus = (dueDate: string | null) => {
    if (!dueDate) return { text: 'ללא תאריך יעד', color: 'gray' };
    
    try {
      const taskDueDate = new Date(dueDate);
      const today = new Date();
      
      // איפוס שעה כדי להשוות רק ברמת היום
      today.setHours(0, 0, 0, 0);
      const tempTaskDueDate = new Date(taskDueDate);
      tempTaskDueDate.setHours(0, 0, 0, 0);
      
      const diffTime = tempTaskDueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) {
        return { 
          text: `${Math.abs(diffDays)} ${Math.abs(diffDays) === 1 ? 'יום' : 'ימים'} באיחור`, 
          color: 'red' 
        };
      } else if (diffDays === 0) {
        return { 
          text: 'היום', 
          color: 'orange' 
        };
      } else if (diffDays === 1) {
        return { 
          text: 'מחר', 
          color: 'orange' 
        };
      } else if (diffDays <= 3) {
        return { 
          text: `בעוד ${diffDays} ימים`, 
          color: 'yellow' 
        };
      } else {
        return { 
          text: formatDate(dueDate), 
          color: 'green' 
        };
      }
    } catch (e) {
      return { text: 'תאריך לא תקין', color: 'gray' };
    }
  };
  
  // פונקציה לקבלת צבע לפי סטטוס
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'פעיל': return 'green';
      case 'planning':
      case 'בתכנון': return 'blue';
      case 'on hold':
      case 'בהמתנה': return 'orange';
      case 'completed':
      case 'הושלם': return 'purple';
      case 'cancelled':
      case 'בוטל': return 'red';
      default: return 'gray';
    }
  };
  
  // פונקציה לקבלת טקסט סטטוס מתורגם
  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'פעיל';
      case 'planning': return 'בתכנון';
      case 'on hold': return 'בהמתנה';
      case 'completed': return 'הושלם';
      case 'cancelled': return 'בוטל';
      default: return status;
    }
  };
  
  // פונקציה לקבלת צבע לפי סטטוס משימה
  const getTaskStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'todo': return 'gray';
      case 'in_progress': return 'blue';
      case 'review': return 'orange';
      case 'done': return 'green';
      default: return 'gray';
    }
  };
  
  // פונקציה לקבלת טקסט סטטוס משימה מתורגם
  const getTaskStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'todo': return 'לביצוע';
      case 'in_progress': return 'בתהליך';
      case 'review': return 'בבדיקה';
      case 'done': return 'הושלם';
      default: return status;
    }
  };
  
  // פונקציה לקבלת שם פרויקט לפי מזהה
  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project ? project.name : 'לא משויך';
  };
  
  // פונקציה לקבלת שם היזם לפי מזהה
  const getEntrepreneurName = (entrepreneurId: string | null) => {
    if (!entrepreneurId) return '-';
    const entrepreneur = entrepreneurs.find(e => e.id === entrepreneurId);
    return entrepreneur ? entrepreneur.name : '-';
  };
  
  // פונקציה לטיפול בשינוי סטטוס משימה
  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      console.log(`Dashboard: Updating task ${taskId} status to ${newStatus}`);
      // עדכון הסטטוס בשרת
      const updatedTask = await taskService.updateTaskStatus(taskId, newStatus);
      
      // עדכון מקומי של המשימה
      setTasks(prevTasks => prevTasks.map(task => 
        task.id === taskId ? { ...task, ...updatedTask } : task
      ));
      
      toast({
        title: 'סטטוס המשימה עודכן',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
      
      // רענון הנתונים מהשרת לאחר זמן קצר
      setTimeout(() => {
        refreshData();
      }, 500);
    } catch (error) {
      console.error('שגיאה בעדכון סטטוס המשימה:', error);
      
      toast({
        title: 'שגיאה בעדכון סטטוס המשימה',
        description: error instanceof Error ? error.message : 'אירעה שגיאה בעדכון סטטוס המשימה',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
  // פונקציה לטיפול בשינויים במשימות
  const handleTaskUpdated = (updatedTask: any) => {
    setTasks(prevTasks => prevTasks.map(task => 
      task.id === updatedTask.id ? { ...task, ...updatedTask } : task
    ));
    
    toast({
      title: 'המשימה עודכנה',
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
    
    // רענון הנתונים מהשרת
    setTimeout(() => {
      refreshData();
    }, 500);
  };
  
  // פונקציה לטיפול במחיקת משימה
  const handleTaskDeleted = (taskId: string) => {
    setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
    
    toast({
      title: 'המשימה נמחקה',
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
    
    // רענון הנתונים מהשרת
    setTimeout(() => {
      refreshData();
    }, 500);
  };
  
  if (loading) {
    return (
      <Flex justify="center" align="center" minH="60vh">
        <Spinner size="xl" thickness="4px" color="primary.500" />
      </Flex>
    );
  }
  
  return (
    <Box>
      {/* הודעת שגיאה */}
      {error && (
        <Alert status="error" mb={4} borderRadius="md">
          <AlertIcon />
          {error}
        </Alert>
      )}
      
      {/* כותרת ופקדי סינון */}
      <Card mb={6} variant="outline">
        <CardBody>
          <Flex 
            direction={{ base: 'column', md: 'row' }} 
            justify="space-between" 
            align={{ base: 'start', md: 'center' }} 
            wrap="wrap"
            gap={3}
          >
            <VStack align="flex-start" spacing={1}>
              <Heading size={{ base: 'md', md: 'lg' }}>דשבורד ניהול</Heading>
              <HStack>
                <Icon as={FiRefreshCw} color="gray.500" />
                <Text fontSize="sm" color="gray.500">
                  עודכן לאחרונה: {formatLastUpdated(lastUpdated)}
                </Text>
              </HStack>
            </VStack>
            
            <HStack spacing={3} flexWrap="wrap">
              <Menu closeOnSelect={false}>
                <MenuButton as={Button} rightIcon={<FiFilter />} size={{ base: 'sm', md: 'md' }}>
                  סנן
                </MenuButton>
                <MenuList>
                  <Box px={3} py={2}>
                    <Text fontWeight="bold" mb={2}>סנן לפי יזם</Text>
                    <Select 
                      placeholder="בחר יזם" 
                      value={selectedEntrepreneur} 
                      onChange={(e) => {
                        setSelectedEntrepreneur(e.target.value);
                        // עדכון ה-URL
                        const url = new URL(window.location.href);
                        if (e.target.value) {
                          url.searchParams.set('entrepreneur', e.target.value);
                        } else {
                          url.searchParams.delete('entrepreneur');
                        }
                        window.history.pushState({}, '', url.toString());
                      }}
                      size="sm"
                      mb={3}
                    >
                      <option value="">כל היזמים</option>
                      {entrepreneurs.map((entrepreneur) => (
                        <option key={entrepreneur.id} value={entrepreneur.id}>
                          {entrepreneur.name}
                        </option>
                      ))}
                    </Select>
                    
                    <Text fontWeight="bold" mb={2}>סנן לפי סטטוס</Text>
                    <Select 
                      placeholder="בחר סטטוס" 
                      value={selectedStatus} 
                      onChange={(e) => {
                        setSelectedStatus(e.target.value);
                        // עדכון ה-URL
                        const url = new URL(window.location.href);
                        if (e.target.value) {
                          url.searchParams.set('status', e.target.value);
                        } else {
                          url.searchParams.delete('status');
                        }
                        window.history.pushState({}, '', url.toString());
                      }}
                      size="sm"
                    >
                      <option value="">כל הסטטוסים</option>
                      <option value="active">פעיל</option>
                      <option value="planning">בתכנון</option>
                      <option value="on hold">בהמתנה</option>
                      <option value="completed">הושלם</option>
                      <option value="cancelled">בוטל</option>
                    </Select>
                  </Box>
                  <MenuItem onClick={() => {
                    setSelectedEntrepreneur('');
                    setSelectedStatus('');
                    const url = new URL(window.location.href);
                    url.searchParams.delete('entrepreneur');
                    url.searchParams.delete('status');
                    window.history.pushState({}, '', url.toString());
                  }}>
                    נקה את כל הסינונים
                  </MenuItem>
                </MenuList>
              </Menu>
              
              <Button 
                leftIcon={<FiRefreshCw />} 
                onClick={refreshData} 
                isLoading={refreshing}
                loadingText="מרענן..."
                size={{ base: 'sm', md: 'md' }}
                colorScheme="blue"
              >
                רענן נתונים
              </Button>
              
              <HStack spacing={1}>
                {selectedEntrepreneur && (
                  <Tag size={{ base: 'sm', md: 'md' }} colorScheme="blue" borderRadius="full">
                    <TagLeftIcon as={FiUsers} />
                    <TagLabel>{getEntrepreneurName(selectedEntrepreneur)}</TagLabel>
                  </Tag>
                )}
                
                {selectedStatus && (
                  <Tag size={{ base: 'sm', md: 'md' }} colorScheme={getStatusColor(selectedStatus)} borderRadius="full">
                    <TagLabel>{getStatusText(selectedStatus)}</TagLabel>
                  </Tag>
                )}
              </HStack>
            </HStack>
          </Flex>
        </CardBody>
      </Card>
      
      {/* סטטיסטיקות */}
      <SimpleGrid 
        columns={{ base: 1, sm: 2, md: 4 }} 
        spacing={{ base: 3, md: 5 }}
        mb={8}
      >
        <StatCard 
          title="פרויקטים פעילים" 
          value={stats.activeProjects} 
          helpText="סה״כ פרויקטים פעילים" 
          icon={FiFolder} 
          color="blue.500" 
        />
        <StatCard 
          title="משימות פתוחות" 
          value={stats.openTasks} 
          helpText="סה״כ משימות שטרם הושלמו" 
          icon={FiCheckSquare} 
          color="green.500" 
        />
        <StatCard 
          title="משימות דחופות" 
          value={stats.highPriorityTasks} 
          helpText="משימות בעדיפות גבוהה" 
          icon={FiAlertCircle} 
          color="red.500" 
        />
        <StatCard 
          title="יזמים" 
          value={entrepreneurs.length} 
          helpText="סה״כ יזמים פעילים" 
          icon={FiUsers} 
          color="purple.500" 
        />
      </SimpleGrid>
      
      {/* שיעור ההשלמה הכולל */}
      <Card mb={6} variant="outline">
        <CardBody>
          <Flex direction={{ base: 'column', md: 'row' }} gap={6}>
            <Box flex="1">
              <Flex justify="space-between" mb={2}>
                <Text fontWeight="medium">השלמת פרויקטים</Text>
                <Text fontWeight="bold">{stats.projectCompletionRate}%</Text>
              </Flex>
              <Progress 
                value={stats.projectCompletionRate} 
                colorScheme="blue" 
                size="lg"
                borderRadius="md"
                hasStripe
              />
            </Box>
            
            <Box flex="1">
              <Flex justify="space-between" mb={2}>
                <Text fontWeight="medium">השלמת משימות</Text>
                <Text fontWeight="bold">{stats.taskCompletionRate}%</Text>
              </Flex>
              <Progress 
                value={stats.taskCompletionRate} 
                colorScheme="green" 
                size="lg"
                borderRadius="md"
                hasStripe
              />
            </Box>
          </Flex>
        </CardBody>
      </Card>
      
      {/* טאבים לפרויקטים ולמשימות */}
      <Tabs variant="soft-rounded" colorScheme="primary" mb={6}>
        <TabList mb={4}>
          <Tab _selected={{ color: 'white', bg: 'primary.500' }}>פרויקטים אחרונים</Tab>
          <Tab _selected={{ color: 'white', bg: 'primary.500' }}>משימות דחופות</Tab>
        </TabList>
        
        <TabPanels>
          {/* פאנל פרויקטים */}
          <TabPanel px={0}>
            <Card variant="outline">
              <CardHeader pb={0}>
                <Flex justify="space-between" align="center">
                  <Heading size={{ base: 'sm', md: 'md' }}>פרויקטים אחרונים</Heading>
                  <Button 
                    as={NextLink} 
                    href="/dashboard/projects" 
                    size={{ base: 'xs', md: 'sm' }}
                    rightIcon={<FiBarChart2 />}
                    colorScheme="primary"
                    variant="outline"
                  >
                    צפה בכל הפרויקטים
                  </Button>
                </Flex>
              </CardHeader>
              <CardBody>
                <Box overflowX="auto">
                  <Table size={{ base: 'sm', md: 'md' }} variant="simple">
                    <Thead>
                      <Tr>
                        <Th>שם</Th>
                        <Th display={{ base: 'none', md: 'table-cell' }}>יזם</Th>
                        <Th display={{ base: 'none', md: 'table-cell' }}>סטטוס</Th>
                        <Th display={{ base: 'none', lg: 'table-cell' }}>תאריך יעד</Th>
                        <Th>התקדמות</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {recentProjects.length > 0 ? (
                        recentProjects.map((project) => (
                          <Tr key={project.id}>
                            <Td>
                              <Link as={NextLink} href={`/dashboard/projects/${project.id}`} color="primary.600" fontWeight="medium">
                                {project.name}
                              </Link>
                            </Td>
                            <Td display={{ base: 'none', md: 'table-cell' }}>{getEntrepreneurName(project.entrepreneur_id)}</Td>
                            <Td display={{ base: 'none', md: 'table-cell' }}>
                              <Badge colorScheme={getStatusColor(project.status || '')}>
                                {getStatusText(project.status || '')}
                              </Badge>
                            </Td>
                            <Td display={{ base: 'none', lg: 'table-cell' }}>{formatDate(project.planned_end_date)}</Td>
                            <Td>
                              <HStack spacing={2} align="center">
                                <Progress 
                                  value={project.progress || 0} 
                                  size="sm" 
                                  colorScheme={
                                    (project.progress || 0) < 25 ? 'red' : 
                                    (project.progress || 0) < 50 ? 'orange' : 
                                    (project.progress || 0) < 75 ? 'yellow' : 'green'
                                  }
                                  w="70px"
                                  borderRadius="full"
                                />
                                <Text fontSize="sm">{project.progress || 0}%</Text>
                              </HStack>
                            </Td>
                          </Tr>
                        ))
                      ) : (
                        <Tr>
                          <Td colSpan={5} textAlign="center">אין פרויקטים להצגה</Td>
                        </Tr>
                      )}
                    </Tbody>
                  </Table>
                </Box>
              </CardBody>
            </Card>
          </TabPanel>
          
          {/* פאנל משימות */}
          <TabPanel px={0}>
            <Card variant="outline">
              <CardHeader pb={0}>
                <Flex justify="space-between" align="center">
                  <Heading size={{ base: 'sm', md: 'md' }}>משימות דחופות</Heading>
                  <Button 
                    as={NextLink} 
                    href="/dashboard/tasks" 
                    size={{ base: 'xs', md: 'sm' }}
                    rightIcon={<FiCheckSquare />}
                    colorScheme="primary"
                    variant="outline"
                  >
                    צפה בכל המשימות
                  </Button>
                </Flex>
              </CardHeader>
              <CardBody>
                <Box overflowX="auto">
                  <Table size={{ base: 'sm', md: 'md' }} variant="simple">
                    <Thead>
                      <Tr>
                        <Th>כותרת</Th>
                        <Th display={{ base: 'none', md: 'table-cell' }}>פרויקט</Th>
                        <Th display={{ base: 'none', md: 'table-cell' }}>סטטוס</Th>
                        <Th display={{ base: 'none', lg: 'table-cell' }}>תאריך יעד</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {urgentTasks.length > 0 ? (
                        urgentTasks.map((task) => {
                          const dueStatus = getDueDateStatus(task.due_date);
                          return (
                            <Tr key={task.id}>
                              <Td>
                                <HStack spacing={2}>
                                  {task.priority === 'high' && (
                                    <Tooltip label="עדיפות גבוהה" placement="top">
                                      <Icon as={FiAlertCircle} color="red.500" />
                                    </Tooltip>
                                  )}
                                  <Link 
                                    as={NextLink} 
                                    href={`/dashboard/tasks/${task.id}`} 
                                    color="primary.600" 
                                    fontWeight="medium"
                                  >
                                    {task.title}
                                  </Link>
                                </HStack>
                              </Td>
                              <Td display={{ base: 'none', md: 'table-cell' }}>
                                {task.project_id ? (
                                  <Link as={NextLink} href={`/dashboard/projects/${task.project_id}`}>
                                    {getProjectName(task.project_id)}
                                  </Link>
                                ) : '-'}
                              </Td>
                              <Td display={{ base: 'none', md: 'table-cell' }}>
                                <Badge colorScheme={getTaskStatusColor(task.status || '')}>
                                  {getTaskStatusText(task.status || '')}
                                </Badge>
                              </Td>
                              <Td display={{ base: 'none', lg: 'table-cell' }}>
                                <Tag colorScheme={dueStatus.color} size="sm">
                                  {isTaskOverdue(task.due_date) ? (
                                    <Tooltip label="משימה באיחור!" placement="top">
                                      <HStack spacing={1}>
                                        <Icon as={FiClock} />
                                        <TagLabel>{dueStatus.text}</TagLabel>
                                      </HStack>
                                    </Tooltip>
                                  ) : (
                                    <TagLabel>{dueStatus.text}</TagLabel>
                                  )}
                                </Tag>
                              </Td>
                            </Tr>
                          );
                        })
                      ) : (
                        <Tr>
                          <Td colSpan={4} textAlign="center">אין משימות דחופות להצגה</Td>
                        </Tr>
                      )}
                    </Tbody>
                  </Table>
                </Box>
              </CardBody>
            </Card>
          </TabPanel>
        </TabPanels>
      </Tabs>
      
      {/* קארד משימות אחרונות */}
      <Card variant="outline" mb={6}>
        <CardHeader pb={0}>
          <Flex justify="space-between" align="center">
            <Heading size="md">
              <Icon as={FiClock} mr={2} />
              משימות אחרונות
            </Heading>
            <Tabs variant="soft-rounded" colorScheme="blue" size="sm">
              <TabList>
                <Tab>רשימה</Tab>
                <Tab>קנבן</Tab>
              </TabList>
            </Tabs>
          </Flex>
        </CardHeader>
        <CardBody>
          <TabPanels>
            <TabPanel px={0}>
              {/* תצוגת רשימה */}
              <TableContainer>
                <Table variant="simple" size={{ base: 'sm', md: 'md' }}>
                  <Thead>
                    <Tr>
                      <Th>משימה</Th>
                      <Th>פרויקט</Th>
                      <Th>תאריך יעד</Th>
                      <Th>סטטוס</Th>
                      <Th>פעולות</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {tasks.map((task) => (
                      <Tr key={task.id}>
                        <Td>
                          <LinkBox>
                            <LinkOverlay href={`/dashboard/tasks/${task.id}`}>
                              <Text fontWeight="medium">{task.title}</Text>
                            </LinkOverlay>
                          </LinkBox>
                        </Td>
                        <Td>
                          {task.project_id ? (
                            <Button
                              as={NextLink}
                              href={`/dashboard/projects/${task.project_id}`}
                              size="sm"
                              variant="ghost"
                            >
                              {getProjectName(task.project_id)}
                            </Button>
                          ) : (
                            <Text fontSize="sm" color="gray.500">-</Text>
                          )}
                        </Td>
                        <Td>
                          {task.due_date ? (
                            <Text color={isTaskOverdue(task.due_date) ? 'red.500' : undefined}>
                              {formatDate(task.due_date)}
                            </Text>
                          ) : (
                            <Text fontSize="sm" color="gray.500">לא נקבע</Text>
                          )}
                        </Td>
                        <Td>
                          <Badge
                            colorScheme={getTaskStatusColor(task.status)}
                            rounded="full"
                            px={2}
                            py={1}
                          >
                            {getTaskStatusText(task.status)}
                          </Badge>
                        </Td>
                        <Td>
                          <HStack spacing={1}>
                            <IconButton
                              aria-label="ערוך משימה"
                              icon={<FiEdit />}
                              size="sm"
                              variant="ghost"
                              as={NextLink}
                              href={`/dashboard/tasks/${task.id}`}
                            />
                          </HStack>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            </TabPanel>
            <TabPanel px={0}>
              {/* תצוגת קנבן */}
              <Box mt={2}>
                <TaskKanban
                  projectId=""
                  tasks={tasks}
                  onTaskUpdated={handleTaskUpdated}
                  onTaskDeleted={handleTaskDeleted}
                  onStatusChange={handleStatusChange}
                />
              </Box>
            </TabPanel>
          </TabPanels>
        </CardBody>
        <CardFooter pt={0}>
          <Button
            as={NextLink}
            href="/dashboard/tasks"
            rightIcon={<FiArrowRight />}
            variant="link"
            size="sm"
            colorScheme="blue"
          >
            לכל המשימות
          </Button>
        </CardFooter>
      </Card>
    </Box>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  helpText?: string;
  icon: any;
  color: string;
}

function StatCard({ title, value, helpText, icon, color }: StatCardProps) {
  const bgColor = useColorModeValue(`${color}10`, `${color}30`);
  
  return (
    <Card 
      variant="outline" 
      _hover={{ 
        transform: 'translateY(-4px)', 
        shadow: 'md',
        borderColor: color
      }}
      transition="all 0.2s ease-in-out"
    >
      <CardBody>
        <Flex align="center">
          <Box
            p={3}
            borderRadius="full"
            bg={bgColor}
            color={color}
            mr={4}
            display={{ base: 'none', sm: 'flex' }}
            alignItems="center"
            justifyContent="center"
          >
            <Icon as={icon} boxSize={{ base: 5, md: 6 }} />
          </Box>
          <Stat>
            <StatLabel fontSize={{ base: 'xs', md: 'sm' }} fontWeight="medium" mb={1}>{title}</StatLabel>
            <StatNumber fontSize={{ base: 'xl', md: '2xl' }} fontWeight="bold" color={color}>
              {value}
            </StatNumber>
            {helpText && (
              <StatHelpText 
                fontSize={{ base: 'xs', md: 'sm' }} 
                mt={1} 
                mb={0}
                color="gray.500"
              >
                {helpText}
              </StatHelpText>
            )}
          </Stat>
        </Flex>
      </CardBody>
    </Card>
  );
} 