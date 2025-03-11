'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Heading, 
  Text, 
  Button, 
  Flex, 
  Input, 
  InputGroup, 
  InputLeftElement,
  SimpleGrid,
  Badge,
  Card,
  CardBody,
  CardHeader,
  CardFooter,
  Progress,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  VStack,
  HStack,
  Spinner,
  useToast,
} from '@chakra-ui/react';
import { FiPlus, FiSearch, FiMoreVertical, FiEdit, FiTrash2, FiClock, FiAlertCircle } from 'react-icons/fi';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import projectService from '@/lib/services/projectService';
import { Project } from '@/types/supabase';

export default function Projects() {
  const [searchQuery, setSearchQuery] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const toast = useToast();
  
  // טעינת פרויקטים מבסיס הנתונים
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const data = await projectService.getProjects();
        setProjects(data);
      } catch (err) {
        console.error('שגיאה בטעינת פרויקטים:', err);
        setError('אירעה שגיאה בטעינת הפרויקטים. אנא נסה שוב מאוחר יותר.');
        
        toast({
          title: 'שגיאה בטעינת נתונים',
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
    
    fetchProjects();
  }, [toast]);
  
  // מחיקת פרויקט
  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק פרויקט זה? פעולה זו אינה הפיכה.')) {
      return;
    }
    
    try {
      await projectService.deleteProject(projectId);
      
      // עדכון הרשימה המקומית ללא הפרויקט שנמחק
      setProjects(prevProjects => prevProjects.filter(project => project.id !== projectId));
      
      toast({
        title: 'הפרויקט נמחק בהצלחה',
        status: 'success',
        duration: 3000,
        isClosable: true,
        position: 'top-right',
      });
    } catch (err) {
      console.error('שגיאה במחיקת פרויקט:', err);
      
      toast({
        title: 'שגיאה במחיקת הפרויקט',
        description: err instanceof Error ? err.message : 'אירעה שגיאה במחיקת הפרויקט',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top-right',
      });
    }
  };
  
  // סינון פרויקטים לפי חיפוש
  const filteredProjects = projects.filter(project => 
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // פונקציה שמחזירה צבע לפי סטטוס
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
  
  // המרת תאריך לפורמט מקומי
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'לא נקבע';
    
    try {
      return new Date(dateString).toLocaleDateString('he-IL');
    } catch (e) {
      return 'תאריך לא תקין';
    }
  };
  
  return (
    <Box>
      <Flex justifyContent="space-between" alignItems="center" mb={6}>
        <Heading>פרויקטים</Heading>
        <Button 
          leftIcon={<FiPlus />} 
          colorScheme="primary"
          onClick={() => router.push('/dashboard/projects/new')}
        >
          פרויקט חדש
        </Button>
      </Flex>
      
      <Flex mb={6} gap={2}>
        <InputGroup maxW="300px">
          <InputLeftElement pointerEvents="none">
            <FiSearch color="gray.300" />
          </InputLeftElement>
          <Input 
            placeholder="חיפוש פרויקטים..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </InputGroup>
      </Flex>
      
      {loading ? (
        <Flex justifyContent="center" my={10}>
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
      ) : filteredProjects.length === 0 ? (
        <Flex direction="column" alignItems="center" justifyContent="center" my={10} textAlign="center">
          <Text fontSize="lg">לא נמצאו פרויקטים</Text>
          {searchQuery ? (
            <Text>נסה לשנות את מילות החיפוש</Text>
          ) : (
            <Button 
              mt={4}
              leftIcon={<FiPlus />}
              colorScheme="primary"
              onClick={() => router.push('/dashboard/projects/new')}
            >
              צור פרויקט חדש
            </Button>
          )}
        </Flex>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
          {filteredProjects.map(project => (
            <ProjectCard 
              key={project.id} 
              project={project} 
              formatDate={formatDate}
              getStatusColor={getStatusColor}
              onDelete={() => handleDeleteProject(project.id)}
            />
          ))}
        </SimpleGrid>
      )}
    </Box>
  );
}

interface ProjectCardProps {
  project: Project;
  formatDate: (date: string | null) => string;
  getStatusColor: (status: string) => string;
  onDelete: () => void;
}

function ProjectCard({ project, formatDate, getStatusColor, onDelete }: ProjectCardProps) {
  const [progress, setProgress] = useState<number>(0);
  const [tasksInfo, setTasksInfo] = useState<{ completed: number, total: number }>({ completed: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  
  const router = useRouter();
  
  // טעינת התקדמות הפרויקט ומידע על המשימות
  useEffect(() => {
    const fetchProjectDetails = async () => {
      try {
        setLoading(true);
        
        // השגת מידע על כמות המשימות והמשימות שהושלמו
        const tasksData = await projectService.countTasksInProject(project.id);
        setTasksInfo(tasksData);
        
        // חישוב אחוז ההתקדמות
        const progressData = await projectService.calculateProjectProgress(project.id);
        setProgress(progressData);
      } catch (err) {
        console.error(`שגיאה בטעינת פרטי פרויקט ${project.id}:`, err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProjectDetails();
  }, [project.id]);
  
  return (
    <Card>
      <CardHeader>
        <Flex justifyContent="space-between" alignItems="flex-start">
          <VStack align="flex-start" spacing={1}>
            <Heading size="md">{project.name}</Heading>
            <Badge colorScheme={getStatusColor(project.status)}>{project.status}</Badge>
          </VStack>
          <Menu>
            <MenuButton 
              as={IconButton} 
              aria-label="אפשרויות"
              icon={<FiMoreVertical />}
              variant="ghost"
              size="sm"
            />
            <MenuList>
              <MenuItem 
                icon={<FiEdit />}
                onClick={() => router.push(`/dashboard/projects/${project.id}/edit`)}
              >
                עריכה
              </MenuItem>
              <MenuItem 
                icon={<FiTrash2 />}
                onClick={onDelete}
                color="red.600"
              >
                מחיקה
              </MenuItem>
            </MenuList>
          </Menu>
        </Flex>
      </CardHeader>
      
      <CardBody py={2}>
        <VStack spacing={3} align="stretch">
          <Box>
            <Flex justifyContent="space-between" mb={1}>
              <Text fontSize="sm">התקדמות</Text>
              <Text fontSize="sm" fontWeight="bold">{loading ? '...' : `${progress}%`}</Text>
            </Flex>
            <Progress value={progress} size="sm" colorScheme="primary" borderRadius="full" />
          </Box>
          
          <Text fontSize="sm" noOfLines={2}>
            {project.owner ? `בעלים: ${project.owner}` : 'אין פרטי בעלים'}
          </Text>
          
          <Flex justifyContent="space-between">
            <HStack spacing={2}>
              <FiClock />
              <Text fontSize="sm">תאריך יעד:</Text>
            </HStack>
            <Text fontSize="sm" fontWeight="bold">{formatDate(project.planned_end_date)}</Text>
          </Flex>
          
          <Text fontSize="sm">
            {loading ? 'טוען נתונים...' : `${tasksInfo.completed} מתוך ${tasksInfo.total} משימות הושלמו`}
          </Text>
        </VStack>
      </CardBody>
      
      <CardFooter pt={0}>
        <Button 
          as={Link}
          href={`/dashboard/projects/${project.id}`}
          variant="outline" 
          size="sm" 
          width="full"
        >
          צפייה בפרויקט
        </Button>
      </CardFooter>
    </Card>
  );
} 