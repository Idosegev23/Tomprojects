'use client';

import React, { useState, useEffect } from 'react';
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
  Link
} from '@chakra-ui/react';
import { FiUsers, FiFolder, FiCheckSquare, FiAlertCircle, FiUser } from 'react-icons/fi';
import NextLink from 'next/link';
import projectService from '@/lib/services/projectService';
import taskService from '@/lib/services/taskService';
import entrepreneurService from '@/lib/services/entrepreneurService';
import { Project, Task } from '@/types/supabase';
import { useSearchParams } from 'next/navigation';

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [entrepreneurs, setEntrepreneurs] = useState<{ id: string, name: string }[]>([]);
  const [selectedEntrepreneur, setSelectedEntrepreneur] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  
  // טעינת נתונים
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
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
          const entrepreneurId = searchParams.get('entrepreneur');
          if (entrepreneurId) {
            // חיפוש היזם לפי המזהה
            const foundEntrepreneur = entrepreneursData.find(e => e.id === entrepreneurId);
            if (foundEntrepreneur) {
              setSelectedEntrepreneur(foundEntrepreneur.id);
              console.log(`נבחר יזם מה-URL: ${foundEntrepreneur.name} (${foundEntrepreneur.id})`);
            }
          }
        } catch (error) {
          console.error('שגיאה בטעינת יזמים:', error);
        }
      } catch (error) {
        console.error('שגיאה בטעינת נתונים:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [searchParams]);
  
  // סינון פרויקטים לפי יזם
  const filteredProjects = selectedEntrepreneur
    ? projects.filter(project => project.entrepreneur_id === selectedEntrepreneur)
    : projects;
  
  // סינון משימות לפי יזם
  const filteredTasks = selectedEntrepreneur
    ? tasks.filter(task => {
        const projectOfTask = projects.find(p => p.id === task.project_id);
        return projectOfTask?.entrepreneur_id === selectedEntrepreneur;
      })
    : tasks;
  
  // חישוב סטטיסטיקות
  const activeProjects = filteredProjects.filter(p => p.status === 'active').length;
  const openTasks = filteredTasks.filter(t => t.status !== 'done').length;
  const lateTasks = filteredTasks.filter(t => 
    t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done'
  ).length;
  
  // פרויקטים אחרונים (5 האחרונים)
  const recentProjects = [...filteredProjects]
    .sort((a, b) => {
      // בדיקה שאין ערכי null
      const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 5);
  
  // משימות דחופות (משימות שמועד היעד שלהן קרוב או עבר)
  const urgentTasks = [...filteredTasks]
    .filter(t => t.due_date && t.status !== 'done')
    .sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    })
    .slice(0, 5);
  
  // פונקציה להמרת תאריך לפורמט מקומי
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'לא נקבע';
    
    try {
      return new Date(dateString).toLocaleDateString('he-IL');
    } catch (e) {
      return 'תאריך לא תקין';
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
  
  if (loading) {
    return (
      <Flex justify="center" align="center" minH="60vh">
        <Spinner size="xl" thickness="4px" color="primary.500" />
      </Flex>
    );
  }
  
  return (
    <Box>
      <Flex 
        direction={{ base: 'column', md: 'row' }} 
        justify="space-between" 
        align={{ base: 'start', md: 'center' }} 
        mb={6}
      >
        <Heading size={{ base: 'md', md: 'lg' }} mb={{ base: 3, md: 0 }}>דשבורד</Heading>
        
        <HStack spacing={3}>
          <Select 
            placeholder="סנן לפי יזם" 
            value={selectedEntrepreneur} 
            onChange={(e) => {
              setSelectedEntrepreneur(e.target.value);
              // עדכון ה-URL כדי לאפשר שיתוף/שמירה של המצב הנוכחי
              const url = new URL(window.location.href);
              if (e.target.value) {
                url.searchParams.set('entrepreneur', e.target.value);
              } else {
                url.searchParams.delete('entrepreneur');
              }
              window.history.pushState({}, '', url.toString());
              // הסרת פוקוס מהתפריט אחרי בחירה
              (e.target as HTMLSelectElement).blur();
            }}
            size={{ base: 'sm', md: 'md' }}
            maxW={{ base: '200px', md: '250px' }}
          >
            <option value="">כל היזמים</option>
            {entrepreneurs.map((entrepreneur) => (
              <option key={entrepreneur.id} value={entrepreneur.id}>
                {entrepreneur.name}
              </option>
            ))}
          </Select>
          
          <Button 
            size={{ base: 'sm', md: 'md' }}
            onClick={() => {
              setSelectedEntrepreneur('');
              // מחיקת הפרמטר מה-URL
              const url = new URL(window.location.href);
              url.searchParams.delete('entrepreneur');
              window.history.pushState({}, '', url.toString());
            }}
            isDisabled={!selectedEntrepreneur}
          >
            נקה סינון
          </Button>
        </HStack>
      </Flex>
      
      {loading ? (
        <Flex justify="center" align="center" h="200px">
          <Spinner size="xl" color="primary.500" />
        </Flex>
      ) : (
        <>
          {/* סטטיסטיקות */}
          <SimpleGrid 
            columns={{ base: 1, sm: 2, md: 4 }} 
            spacing={{ base: 3, md: 5 }}
            mb={8}
          >
            <StatCard 
              title="פרויקטים פעילים" 
              value={filteredProjects.filter(p => p.status !== 'completed').length} 
              helpText="סה״כ פרויקטים פעילים" 
              icon={FiFolder} 
              color="blue.500" 
            />
            <StatCard 
              title="משימות פתוחות" 
              value={filteredTasks.filter(t => t.status !== 'done').length} 
              helpText="סה״כ משימות שטרם הושלמו" 
              icon={FiCheckSquare} 
              color="green.500" 
            />
            <StatCard 
              title="משימות דחופות" 
              value={filteredTasks.filter(t => t.priority === 'high' && t.status !== 'done').length} 
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
          
          {/* פרויקטים אחרונים */}
          <Card mb={6} variant="outline">
            <CardHeader pb={0}>
              <Flex justify="space-between" align="center">
                <Heading size={{ base: 'sm', md: 'md' }}>פרויקטים אחרונים</Heading>
                <Button 
                  as={NextLink} 
                  href="/dashboard/projects" 
                  size={{ base: 'xs', md: 'sm' }}
                  variant="ghost"
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
                    {filteredProjects.slice(0, 5).map((project) => (
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
                        <Td>{project.progress || 0}%</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            </CardBody>
          </Card>
          
          {/* משימות דחופות */}
          <Card variant="outline">
            <CardHeader pb={0}>
              <Flex justify="space-between" align="center">
                <Heading size={{ base: 'sm', md: 'md' }}>משימות דחופות</Heading>
                <Button 
                  as={NextLink} 
                  href="/dashboard/tasks" 
                  size={{ base: 'xs', md: 'sm' }}
                  variant="ghost"
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
                    {filteredTasks
                      .filter(task => task.priority === 'high' && task.status !== 'done')
                      .slice(0, 5)
                      .map((task) => (
                        <Tr key={task.id}>
                          <Td>
                            <Link as={NextLink} href={`/dashboard/tasks/${task.id}`} color="primary.600" fontWeight="medium">
                              {task.title}
                            </Link>
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
                          <Td display={{ base: 'none', lg: 'table-cell' }}>{formatDate(task.due_date)}</Td>
                        </Tr>
                      ))}
                  </Tbody>
                </Table>
              </Box>
            </CardBody>
          </Card>
        </>
      )}
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
  return (
    <Card variant="outline">
      <CardBody>
        <Flex align="center">
          <Box
            p={2}
            borderRadius="md"
            bg={`${color}10`}
            color={color}
            mr={3}
            display={{ base: 'none', sm: 'block' }}
          >
            <Icon as={icon} boxSize={{ base: 5, md: 6 }} />
          </Box>
          <Stat>
            <StatLabel fontSize={{ base: 'xs', md: 'sm' }}>{title}</StatLabel>
            <StatNumber fontSize={{ base: 'xl', md: '2xl' }}>{value}</StatNumber>
            {helpText && <StatHelpText fontSize={{ base: 'xs', md: 'sm' }}>{helpText}</StatHelpText>}
          </Stat>
        </Flex>
      </CardBody>
    </Card>
  );
} 