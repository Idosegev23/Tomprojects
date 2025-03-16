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
import { Project, Task } from '@/types/supabase';

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [entrepreneurs, setEntrepreneurs] = useState<string[]>([]);
  const [selectedEntrepreneur, setSelectedEntrepreneur] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  // טעינת נתונים
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // טעינת פרויקטים
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
        
        // טעינת משימות
        const tasksData = await taskService.getTasks();
        setTasks(tasksData);
      } catch (error) {
        console.error('שגיאה בטעינת נתונים:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // סינון פרויקטים לפי יזם
  const filteredProjects = selectedEntrepreneur
    ? projects.filter(project => project.entrepreneur === selectedEntrepreneur)
    : projects;
  
  // סינון משימות לפי יזם
  const filteredTasks = selectedEntrepreneur
    ? tasks.filter(task => {
        const projectOfTask = projects.find(p => p.id === task.project_id);
        return projectOfTask?.entrepreneur === selectedEntrepreneur;
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
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
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
  
  if (loading) {
    return (
      <Flex justify="center" align="center" minH="60vh">
        <Spinner size="xl" thickness="4px" color="primary.500" />
      </Flex>
    );
  }
  
  return (
    <Box>
      <Flex justifyContent="space-between" alignItems="center" mb={6}>
        <Heading>דאשבורד</Heading>
        
        <HStack spacing={4}>
          <Select 
            placeholder="סנן לפי יזם" 
            value={selectedEntrepreneur}
            onChange={(e) => setSelectedEntrepreneur(e.target.value)}
            maxW="200px"
          >
            <option value="">כל היזמים</option>
            {entrepreneurs.map(entrepreneur => (
              <option key={entrepreneur} value={entrepreneur}>
                {entrepreneur}
              </option>
            ))}
          </Select>
          
          {selectedEntrepreneur && (
            <Button 
              variant="outline" 
              onClick={() => setSelectedEntrepreneur('')}
            >
              נקה סינון
            </Button>
          )}
        </HStack>
      </Flex>
      
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={5} mb={8}>
        <StatCard 
          title="פרויקטים פעילים" 
          value={activeProjects} 
          helpText={selectedEntrepreneur ? `יזם: ${selectedEntrepreneur}` : "כל היזמים"} 
          icon={FiFolder} 
          color="blue.500" 
        />
        <StatCard 
          title="משימות פתוחות" 
          value={openTasks} 
          helpText={selectedEntrepreneur ? `יזם: ${selectedEntrepreneur}` : "כל היזמים"} 
          icon={FiCheckSquare}
          color="green.500" 
        />
        <StatCard 
          title="משימות באיחור" 
          value={lateTasks} 
          helpText={selectedEntrepreneur ? `יזם: ${selectedEntrepreneur}` : "כל היזמים"} 
          icon={FiAlertCircle}
          color="red.500" 
        />
        <StatCard 
          title="יזמים" 
          value={entrepreneurs.length} 
          helpText="סה״כ יזמים במערכת" 
          icon={FiUser}
          color="purple.500" 
        />
      </SimpleGrid>
      
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
        <Card>
          <CardHeader>
            <Heading size="md">פרויקטים אחרונים</Heading>
          </CardHeader>
          <CardBody>
            {recentProjects.length === 0 ? (
              <Text>אין פרויקטים להצגה</Text>
            ) : (
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th>שם</Th>
                    <Th>סטטוס</Th>
                    <Th>יזם</Th>
                    <Th>עדכון אחרון</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {recentProjects.map(project => (
                    <Tr key={project.id}>
                      <Td>
                        <Link as={NextLink} href={`/dashboard/projects/${project.id}`} color="blue.500">
                          {project.name}
                        </Link>
                      </Td>
                      <Td>
                        <Badge colorScheme={getStatusColor(project.status)}>
                          {project.status}
                        </Badge>
                      </Td>
                      <Td>{project.entrepreneur || 'לא הוגדר'}</Td>
                      <Td>{formatDate(project.updated_at)}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </CardBody>
        </Card>
        
        <Card>
          <CardHeader>
            <Heading size="md">משימות למעקב</Heading>
          </CardHeader>
          <CardBody>
            {urgentTasks.length === 0 ? (
              <Text>אין משימות דחופות להצגה</Text>
            ) : (
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th>כותרת</Th>
                    <Th>פרויקט</Th>
                    <Th>תאריך יעד</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {urgentTasks.map(task => {
                    const projectOfTask = projects.find(p => p.id === task.project_id);
                    return (
                      <Tr key={task.id}>
                        <Td>
                          <Link as={NextLink} href={`/dashboard/tasks/${task.id}`} color="blue.500">
                            {task.title}
                          </Link>
                        </Td>
                        <Td>
                          {projectOfTask ? (
                            <Link as={NextLink} href={`/dashboard/projects/${projectOfTask.id}`} color="blue.500">
                              {projectOfTask.name}
                            </Link>
                          ) : (
                            'לא משויך'
                          )}
                        </Td>
                        <Td color={
                          task.due_date && new Date(task.due_date) < new Date() 
                            ? 'red.500' 
                            : 'inherit'
                        }>
                          {formatDate(task.due_date)}
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            )}
          </CardBody>
        </Card>
      </SimpleGrid>
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
    <Card>
      <CardBody>
        <Flex justifyContent="space-between" alignItems="center">
          <Box>
            <Stat>
              <StatLabel>{title}</StatLabel>
              <StatNumber>{value}</StatNumber>
              {helpText && <StatHelpText>{helpText}</StatHelpText>}
            </Stat>
          </Box>
          <Box>
            <Flex 
              w="48px" 
              h="48px" 
              bg={`${color}10`} 
              color={color} 
              borderRadius="full" 
              justifyContent="center" 
              alignItems="center"
            >
              <Icon as={icon} boxSize="24px" />
            </Flex>
          </Box>
        </Flex>
      </CardBody>
    </Card>
  );
} 