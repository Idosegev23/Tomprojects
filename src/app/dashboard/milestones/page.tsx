'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Heading, 
  Text, 
  Flex, 
  Card, 
  CardBody,
  CardHeader,
  SimpleGrid,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Link,
  Spinner,
  HStack,
  VStack,
  Icon,
  Progress,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Select,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useToast,
  Divider
} from '@chakra-ui/react';
import { FiFolder, FiCheckSquare, FiFlag, FiCalendar, FiClock, FiAlertCircle } from 'react-icons/fi';
import NextLink from 'next/link';
import projectService from '@/lib/services/projectService';
import { stageService } from '@/lib/services/stageService';
import taskService from '@/lib/services/taskService';
import { Project, Stage, Task } from '@/types/supabase';
import StageManager from '@/components/stages/StageManager';

// טיפוס לאבן דרך עם משימות
interface MilestoneWithTasks extends Stage {
  tasks: Task[];
  project: Project | null;
  completedTasks: number;
  totalTasks: number;
  progress: number;
}

export default function MilestonesPage() {
  const [milestones, setMilestones] = useState<MilestoneWithTasks[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const toast = useToast();

  // טעינת נתונים
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // טעינת פרויקטים
        const projectsData = await projectService.getProjects();
        setProjects(projectsData);
        
        // טעינת כל שלבי הפרויקט מכל הפרויקטים
        const allMilestones: MilestoneWithTasks[] = [];
        
        for (const project of projectsData) {
          const stages = await stageService.getProjectStages(project.id);
          
          for (const stage of stages) {
            const tasks = await taskService.getTasksByStage(stage.id);
            const completedTasks = tasks.filter(task => task.status === 'done').length;
            const progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
            
            allMilestones.push({
              ...stage,
              tasks,
              project,
              completedTasks,
              totalTasks: tasks.length,
              progress
            });
          }
        }
        
        setMilestones(allMilestones);
      } catch (error) {
        console.error('שגיאה בטעינת נתונים:', error);
        toast({
          title: 'שגיאה בטעינת נתונים',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [toast]);
  
  // סינון אבני דרך לפי פרויקט וסטטוס
  const filteredMilestones = milestones.filter(milestone => {
    // סינון לפי פרויקט
    if (selectedProject !== 'all' && milestone.project?.id !== selectedProject) {
      return false;
    }
    
    // סינון לפי סטטוס
    if (selectedStatus === 'completed' && milestone.progress < 100) {
      return false;
    } else if (selectedStatus === 'in_progress' && (milestone.progress === 0 || milestone.progress === 100)) {
      return false;
    } else if (selectedStatus === 'not_started' && milestone.progress > 0) {
      return false;
    }
    
    return true;
  });
  
  // פונקציה לקבלת צבע לפי התקדמות
  const getProgressColor = (progress: number): string => {
    if (progress >= 100) return 'green';
    if (progress >= 50) return 'blue';
    if (progress >= 25) return 'orange';
    return 'red';
  };
  
  // פונקציה לקבלת צבע לפי סטטוס
  const getStatusColor = (status: string | undefined): string => {
    if (!status) return 'gray';
    
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
  
  // פונקציה לקבלת צבע לפי עדיפות
  const getPriorityColor = (priority: string | undefined): string => {
    if (!priority) return 'gray';
    
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
  
  // פונקציה להמרת תאריך לפורמט מקומי
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'לא נקבע';
    
    try {
      return new Date(dateString).toLocaleDateString('he-IL');
    } catch (e) {
      return 'תאריך לא תקין';
    }
  };
  
  return (
    <Box p={6}>
      <Heading size="lg" mb={6}>שלבי פרויקט</Heading>
      
      {/* פילטרים */}
      <Flex mb={6} gap={4} flexWrap="wrap">
        <Box flex="1" minW="200px">
          <Text mb={2} fontWeight="medium">סינון לפי פרויקט:</Text>
          <Select 
            value={selectedProject} 
            onChange={(e) => setSelectedProject(e.target.value)}
          >
            <option value="all">כל הפרויקטים</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </Select>
        </Box>
        
        <Box flex="1" minW="200px">
          <Text mb={2} fontWeight="medium">סינון לפי סטטוס:</Text>
          <Select 
            value={selectedStatus} 
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="all">כל הסטטוסים</option>
            <option value="completed">הושלמו</option>
            <option value="in_progress">בתהליך</option>
            <option value="not_started">טרם התחילו</option>
          </Select>
        </Box>
      </Flex>
      
      {/* רכיב ניהול שלבים - מוצג רק כאשר בוחרים פרויקט ספציפי */}
      {selectedProject !== 'all' && (
        <Box mb={8}>
          <Heading size="md" mb={4}>ניהול שלבי הפרויקט</Heading>
          <StageManager 
            projectId={selectedProject} 
            showTasks={true} 
          />
          <Divider my={6} />
        </Box>
      )}
      
      {/* תוכן */}
      {loading ? (
        <Flex justify="center" align="center" minH="300px">
          <Spinner size="xl" color="primary.500" />
        </Flex>
      ) : (
        <Tabs variant="enclosed" colorScheme="primary">
          <TabList>
            <Tab>כרטיסיות</Tab>
            <Tab>רשימה</Tab>
          </TabList>
          
          <TabPanels>
            {/* תצוגת כרטיסיות */}
            <TabPanel p={0} pt={4}>
              {filteredMilestones.length === 0 ? (
                <Box textAlign="center" p={8} bg="gray.50" borderRadius="md">
                  <Text fontSize="lg">לא נמצאו שלבי פרויקט התואמים את הסינון</Text>
                </Box>
              ) : (
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                  {filteredMilestones.map(milestone => (
                    <Card key={milestone.id} boxShadow="md" borderRadius="lg" overflow="hidden">
                      <CardHeader bg="gray.50" py={3}>
                        <Flex justify="space-between" align="center">
                          <Heading size="md">{milestone.title}</Heading>
                          <Badge 
                            colorScheme={getProgressColor(milestone.progress)}
                            fontSize="0.8em"
                            px={2}
                            py={1}
                            borderRadius="full"
                          >
                            {milestone.progress}%
                          </Badge>
                        </Flex>
                      </CardHeader>
                      
                      <CardBody>
                        <VStack align="stretch" spacing={3}>
                          {milestone.project && (
                            <Flex align="center">
                              <Icon as={FiFolder} mr={2} color="blue.500" />
                              <Text fontWeight="medium">פרויקט: </Text>
                              <NextLink href={`/dashboard/projects/${milestone.project.id}`} passHref>
                                <Link ml={1} color="primary.500">{milestone.project.name}</Link>
                              </NextLink>
                            </Flex>
                          )}
                          
                          <Flex align="center">
                            <Icon as={FiCheckSquare} mr={2} color="green.500" />
                            <Text fontWeight="medium">משימות: </Text>
                            <Text ml={1}>{milestone.completedTasks} מתוך {milestone.totalTasks}</Text>
                          </Flex>
                          
                          <Box>
                            <Text fontWeight="medium" mb={1}>התקדמות:</Text>
                            <Progress 
                              value={milestone.progress} 
                              colorScheme={getProgressColor(milestone.progress)}
                              borderRadius="full"
                              size="sm"
                            />
                          </Box>
                          
                          {milestone.description && (
                            <Box>
                              <Text fontWeight="medium" mb={1}>תיאור:</Text>
                              <Text fontSize="sm">{milestone.description}</Text>
                            </Box>
                          )}
                          
                          <Button 
                            size="sm" 
                            colorScheme="primary" 
                            variant="outline"
                            mt={2}
                            as={NextLink}
                            href={`/dashboard/projects/${milestone.project?.id}?stage=${milestone.id}`}
                          >
                            צפה במשימות
                          </Button>
                        </VStack>
                      </CardBody>
                    </Card>
                  ))}
                </SimpleGrid>
              )}
            </TabPanel>
            
            {/* תצוגת רשימה */}
            <TabPanel p={0} pt={4}>
              {filteredMilestones.length === 0 ? (
                <Box textAlign="center" p={8} bg="gray.50" borderRadius="md">
                  <Text fontSize="lg">לא נמצאו שלבי פרויקט התואמים את הסינון</Text>
                </Box>
              ) : (
                <Accordion allowMultiple defaultIndex={[0]}>
                  {filteredMilestones.map((milestone, index) => (
                    <AccordionItem key={milestone.id}>
                      <h2>
                        <AccordionButton py={4}>
                          <Box flex="1" textAlign="right">
                            <HStack spacing={4}>
                              <Icon as={FiFlag} color="blue.500" />
                              <Text fontWeight="bold">{milestone.title}</Text>
                              <Badge colorScheme={getStatusColor(milestone.project?.status || '')}>
                                {milestone.project?.name || 'ללא פרויקט'}
                              </Badge>
                              <Badge colorScheme={getProgressColor(milestone.progress)}>
                                {milestone.progress}% הושלם
                              </Badge>
                              <Text fontSize="sm" color="gray.500">
                                {milestone.completedTasks} מתוך {milestone.totalTasks} משימות הושלמו
                              </Text>
                            </HStack>
                          </Box>
                          <AccordionIcon />
                        </AccordionButton>
                      </h2>
                      <AccordionPanel pb={4}>
                        <Box mb={4}>
                          <Progress 
                            value={milestone.progress} 
                            size="sm" 
                            colorScheme={getProgressColor(milestone.progress)} 
                            borderRadius="full" 
                          />
                        </Box>
                        
                        {milestone.tasks.length === 0 ? (
                          <Text textAlign="center" color="gray.500">אין משימות באבן דרך זו</Text>
                        ) : (
                          <Table variant="simple" size="sm">
                            <Thead>
                              <Tr>
                                <Th>משימה</Th>
                                <Th>סטטוס</Th>
                                <Th>עדיפות</Th>
                                <Th>תאריך יעד</Th>
                              </Tr>
                            </Thead>
                            <Tbody>
                              {milestone.tasks.map(task => (
                                <Tr key={task.id}>
                                  <Td>
                                    <Link as={NextLink} href={`/dashboard/tasks/${task.id}`} color="blue.500">
                                      {task.title}
                                    </Link>
                                  </Td>
                                  <Td>
                                    <Badge colorScheme={task.status === 'done' ? 'green' : 'blue'}>
                                      {task.status === 'todo' ? 'לביצוע' : 
                                       task.status === 'in_progress' ? 'בתהליך' : 
                                       task.status === 'review' ? 'בבדיקה' : 
                                       task.status === 'done' ? 'הושלם' : task.status}
                                    </Badge>
                                  </Td>
                                  <Td>
                                    <Badge colorScheme={getPriorityColor(task.priority)}>
                                      {task.priority}
                                    </Badge>
                                  </Td>
                                  <Td>
                                    <HStack>
                                      <Text 
                                        color={
                                          task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'
                                            ? 'red.500'
                                            : 'inherit'
                                        }
                                      >
                                        {formatDate(task.due_date)}
                                      </Text>
                                      {task.due_date && 
                                        new Date(task.due_date) < new Date() && 
                                        task.status !== 'done' && (
                                          <Icon as={FiAlertCircle} color="red.500" />
                                        )
                                      }
                                    </HStack>
                                  </Td>
                                </Tr>
                              ))}
                            </Tbody>
                          </Table>
                        )}
                        
                        <Flex justifyContent="flex-end" mt={4}>
                          <Button 
                            as={NextLink}
                            href={`/dashboard/projects/${milestone.project_id}`}
                            size="sm"
                            colorScheme="blue"
                            variant="outline"
                          >
                            צפה בפרויקט
                          </Button>
                        </Flex>
                      </AccordionPanel>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>
      )}
    </Box>
  );
} 