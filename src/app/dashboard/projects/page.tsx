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
  Select,
} from '@chakra-ui/react';
import { FiPlus, FiSearch, FiMoreVertical, FiEdit, FiTrash2, FiClock, FiAlertCircle } from 'react-icons/fi';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import projectService from '@/lib/services/projectService';
import entrepreneurService from '@/lib/services/entrepreneurService';
import { Project, Entrepreneur } from '@/types/supabase';

export default function Projects() {
  const [searchQuery, setSearchQuery] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entrepreneurs, setEntrepreneurs] = useState<Entrepreneur[]>([]);
  const [selectedEntrepreneurId, setSelectedEntrepreneurId] = useState<string | null>(null);
  
  const router = useRouter();
  const toast = useToast();
  
  // טעינת פרויקטים מבסיס הנתונים
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const data = await projectService.getProjects();
        setProjects(data);
        
        // טעינת יזמים כאובייקטים מלאים במקום רק שמות
        const entrepreneursData = await entrepreneurService.getEntrepreneurs();
        setEntrepreneurs(entrepreneursData);
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
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (typeof project.owner === 'string' && project.owner.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesEntrepreneur = !selectedEntrepreneurId || project.entrepreneur_id === selectedEntrepreneurId;
    
    return matchesSearch && matchesEntrepreneur;
  });
  
  // פונקציה שמחזירה צבע לפי סטטוס
  const getStatusColor = (status: string | null) => {
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
      <Flex 
        direction={{ base: 'column', md: 'row' }} 
        justify="space-between" 
        align={{ base: 'start', md: 'center' }} 
        mb={6}
      >
        <Heading size={{ base: 'md', md: 'lg' }} mb={{ base: 3, md: 0 }}>פרויקטים</Heading>
        
        <HStack spacing={{ base: 2, md: 4 }} width={{ base: 'full', md: 'auto' }}>
          <Button 
            leftIcon={<FiPlus />} 
            colorScheme="primary" 
            onClick={() => router.push('/dashboard/projects/new')}
            size={{ base: 'sm', md: 'md' }}
          >
            פרויקט חדש
          </Button>
        </HStack>
      </Flex>
      
      <Flex 
        direction={{ base: 'column', md: 'row' }} 
        mb={6} 
        gap={3}
        width="full"
      >
        <InputGroup maxW={{ base: 'full', md: '300px' }}>
          <InputLeftElement pointerEvents="none">
            <FiSearch color="gray.300" />
          </InputLeftElement>
          <Input 
            placeholder="חיפוש פרויקטים..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)}
            size={{ base: 'sm', md: 'md' }}
          />
        </InputGroup>
        
        <Select 
          placeholder="סנן לפי יזם" 
          value={selectedEntrepreneurId || ''}
          onChange={(e) => setSelectedEntrepreneurId(e.target.value || null)}
          maxW={{ base: 'full', md: '250px' }}
          size={{ base: 'sm', md: 'md' }}
        >
          <option value="">כל היזמים</option>
          {entrepreneurs.map((entrepreneur) => (
            <option key={entrepreneur.id} value={entrepreneur.id}>
              {entrepreneur.name}
            </option>
          ))}
        </Select>
      </Flex>
      
      {loading ? (
        <Flex justify="center" align="center" h="200px">
          <Spinner size="xl" color="primary.500" />
        </Flex>
      ) : error ? (
        <Box p={4} bg="red.50" color="red.500" borderRadius="md">
          <Text>{error}</Text>
        </Box>
      ) : filteredProjects.length === 0 ? (
        <Box textAlign="center" p={8}>
          <Text fontSize="lg" mb={4}>לא נמצאו פרויקטים</Text>
          <Button 
            leftIcon={<FiPlus />} 
            colorScheme="primary" 
            onClick={() => router.push('/dashboard/projects/new')}
          >
            צור פרויקט חדש
          </Button>
        </Box>
      ) : (
        <SimpleGrid 
          columns={{ base: 1, sm: 2, lg: 3, xl: 4 }} 
          spacing={{ base: 4, md: 6 }}
        >
          {filteredProjects.map((project) => (
            <ProjectCard 
              key={project.id} 
              project={project} 
              formatDate={formatDate} 
              getStatusColor={getStatusColor} 
              getStatusText={getStatusText}
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
  getStatusColor: (status: string | null) => string;
  getStatusText: (status: string) => string;
  onDelete: () => void;
}

function ProjectCard({ project, formatDate, getStatusColor, getStatusText, onDelete }: ProjectCardProps) {
  const router = useRouter();
  const [taskCount, setTaskCount] = useState<number | null>(null);
  const [completedTaskCount, setCompletedTaskCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [entrepreneurName, setEntrepreneurName] = useState<string | null>(null);
  
  // טעינת התקדמות הפרויקט ומידע על המשימות
  useEffect(() => {
    const fetchProjectDetails = async () => {
      try {
        setLoading(true);
        
        // השגת מידע על כמות המשימות והמשימות שהושלמו
        const tasksData = await projectService.countTasksInProject(project.id);
        setTaskCount(tasksData.total);
        setCompletedTaskCount(tasksData.completed);
        
        // טעינת שם היזם
        if (project.entrepreneur_id) {
          const entrepreneur = await entrepreneurService.getEntrepreneurById(project.entrepreneur_id);
          if (entrepreneur) {
            setEntrepreneurName(entrepreneur.name);
          }
        }
      } catch (err) {
        console.error(`שגיאה בטעינת פרטי פרויקט ${project.id}:`, err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProjectDetails();
  }, [project.id, project.entrepreneur_id]);
  
  return (
    <Card 
      variant="outline" 
      borderRadius="md" 
      overflow="hidden" 
      h="100%"
      _hover={{ boxShadow: 'md', transform: 'translateY(-2px)' }}
      transition="all 0.2s"
    >
      <CardHeader pb={2}>
        <Flex justify="space-between" align="center">
          <Heading 
            as="h3" 
            size={{ base: 'sm', md: 'md' }} 
            noOfLines={1} 
            onClick={() => router.push(`/dashboard/projects/${project.id}`)}
            cursor="pointer"
            _hover={{ color: 'primary.500' }}
          >
            {project.name}
          </Heading>
          
          <Menu closeOnSelect={true}>
            <MenuButton
              as={IconButton}
              icon={<FiMoreVertical />}
              variant="ghost"
              size="sm"
              aria-label="אפשרויות"
            />
            <MenuList>
              <MenuItem 
                icon={<FiEdit />} 
                onClick={() => router.push(`/dashboard/projects/${project.id}/edit`)}
              >
                ערוך
              </MenuItem>
              <MenuItem 
                icon={<FiTrash2 />} 
                color="red.500" 
                onClick={onDelete}
              >
                מחק
              </MenuItem>
            </MenuList>
          </Menu>
        </Flex>
      </CardHeader>
      
      <CardBody py={2}>
        <VStack align="stretch" spacing={2}>
          <Flex justify="space-between">
            <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600">יזם:</Text>
            <Text fontSize={{ base: 'xs', md: 'sm' }} fontWeight="medium">
              {entrepreneurName || 'לא הוגדר'}
            </Text>
          </Flex>
          
          <Flex justify="space-between">
            <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600">סטטוס:</Text>
            <Badge colorScheme={getStatusColor(project.status || '')}>
              {getStatusText(project.status || '')}
            </Badge>
          </Flex>
          
          <Flex justify="space-between">
            <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600">תאריך יעד:</Text>
            <Text fontSize={{ base: 'xs', md: 'sm' }}>{formatDate(project.planned_end_date)}</Text>
          </Flex>
          
          <Box>
            <Flex justify="space-between" mb={1}>
              <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600">התקדמות:</Text>
              <Text fontSize={{ base: 'xs', md: 'sm' }}>{project.progress || 0}%</Text>
            </Flex>
            <Progress 
              value={project.progress || 0} 
              size="sm" 
              colorScheme="primary" 
              borderRadius="full"
            />
          </Box>
          
          {loading ? (
            <Flex justify="center" py={2}>
              <Spinner size="sm" />
            </Flex>
          ) : (
            <Flex justify="space-between">
              <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600">משימות:</Text>
              <Text fontSize={{ base: 'xs', md: 'sm' }}>
                {completedTaskCount}/{taskCount}
              </Text>
            </Flex>
          )}
        </VStack>
      </CardBody>
      
      <CardFooter pt={2} pb={3}>
        <Button 
          variant="ghost" 
          colorScheme="primary" 
          size="sm" 
          width="full"
          onClick={() => router.push(`/dashboard/projects/${project.id}`)}
        >
          צפה בפרויקט
        </Button>
      </CardFooter>
    </Card>
  );
} 