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
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Input,
  FormControl,
  FormLabel,
  useToast
} from '@chakra-ui/react';
import { FiFolder, FiCheckSquare, FiUser, FiPlus, FiEdit, FiTrash2 } from 'react-icons/fi';
import NextLink from 'next/link';
import projectService from '@/lib/services/projectService';
import taskService from '@/lib/services/taskService';
import { Project, Task } from '@/types/supabase';

export default function EntrepreneursPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [entrepreneurs, setEntrepreneurs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntrepreneur, setSelectedEntrepreneur] = useState<string | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [newEntrepreneur, setNewEntrepreneur] = useState('');
  const toast = useToast();

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
        ).sort();
        
        setEntrepreneurs(uniqueEntrepreneurs);
      } catch (error) {
        console.error('שגיאה בטעינת נתונים:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // פונקציה לקבלת פרויקטים של יזם ספציפי
  const getProjectsByEntrepreneur = (entrepreneur: string) => {
    return projects.filter(project => project.entrepreneur === entrepreneur);
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

  // פונקציה להמרת תאריך לפורמט מקומי
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'לא נקבע';
    
    try {
      return new Date(dateString).toLocaleDateString('he-IL');
    } catch (e) {
      return 'תאריך לא תקין';
    }
  };

  // הוספת יזם חדש
  const handleAddEntrepreneur = () => {
    if (!newEntrepreneur.trim()) {
      toast({
        title: "שגיאה",
        description: "שם היזם לא יכול להיות ריק",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // בדיקה אם היזם כבר קיים
    if (entrepreneurs.includes(newEntrepreneur.trim())) {
      toast({
        title: "שגיאה",
        description: "יזם בשם זה כבר קיים במערכת",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // הוספת היזם לרשימה
    setEntrepreneurs([...entrepreneurs, newEntrepreneur.trim()].sort());
    setNewEntrepreneur('');
    onClose();

    toast({
      title: "יזם נוסף בהצלחה",
      description: `היזם ${newEntrepreneur.trim()} נוסף למערכת`,
      status: "success",
      duration: 3000,
      isClosable: true,
    });
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
        <Heading>יזמים</Heading>
        <Button leftIcon={<FiPlus />} colorScheme="blue" onClick={onOpen}>
          הוסף יזם
        </Button>
      </Flex>

      {entrepreneurs.length === 0 ? (
        <Card>
          <CardBody>
            <Text textAlign="center">אין יזמים במערכת</Text>
          </CardBody>
        </Card>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={5}>
          {entrepreneurs.map(entrepreneur => {
            const entrepreneurProjects = getProjectsByEntrepreneur(entrepreneur);
            const activeProjects = entrepreneurProjects.filter(p => p.status === 'active').length;
            const completedProjects = entrepreneurProjects.filter(p => p.status === 'completed').length;
            
            return (
              <Card key={entrepreneur} cursor="pointer" onClick={() => setSelectedEntrepreneur(entrepreneur)}>
                <CardHeader>
                  <Flex justifyContent="space-between" alignItems="center">
                    <Heading size="md">{entrepreneur}</Heading>
                    <Icon as={FiUser} boxSize="24px" color="blue.500" />
                  </Flex>
                </CardHeader>
                <CardBody>
                  <SimpleGrid columns={2} spacing={4}>
                    <Stat>
                      <StatLabel>פרויקטים פעילים</StatLabel>
                      <StatNumber>{activeProjects}</StatNumber>
                    </Stat>
                    <Stat>
                      <StatLabel>פרויקטים שהושלמו</StatLabel>
                      <StatNumber>{completedProjects}</StatNumber>
                    </Stat>
                  </SimpleGrid>
                  <Button 
                    mt={4} 
                    size="sm" 
                    width="100%" 
                    colorScheme="blue" 
                    variant="outline"
                    as={NextLink}
                    href={`/dashboard?entrepreneur=${encodeURIComponent(entrepreneur)}`}
                  >
                    צפה בדשבורד
                  </Button>
                </CardBody>
              </Card>
            );
          })}
        </SimpleGrid>
      )}

      {/* מודל להוספת יזם חדש */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>הוספת יזם חדש</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl>
              <FormLabel>שם היזם</FormLabel>
              <Input 
                value={newEntrepreneur} 
                onChange={(e) => setNewEntrepreneur(e.target.value)}
                placeholder="הכנס שם יזם" 
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={handleAddEntrepreneur}>
              הוסף
            </Button>
            <Button variant="ghost" onClick={onClose}>ביטול</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* מודל לצפייה בפרטי יזם */}
      {selectedEntrepreneur && (
        <Modal isOpen={!!selectedEntrepreneur} onClose={() => setSelectedEntrepreneur(null)} size="xl">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>פרטי יזם: {selectedEntrepreneur}</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <Heading size="md" mb={4}>פרויקטים של היזם</Heading>
              {getProjectsByEntrepreneur(selectedEntrepreneur).length === 0 ? (
                <Text>אין פרויקטים ליזם זה</Text>
              ) : (
                <Table variant="simple" size="sm">
                  <Thead>
                    <Tr>
                      <Th>שם</Th>
                      <Th>סטטוס</Th>
                      <Th>תאריך התחלה</Th>
                      <Th>תאריך סיום</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {getProjectsByEntrepreneur(selectedEntrepreneur).map(project => (
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
                        <Td>{formatDate(project.planned_start_date)}</Td>
                        <Td>{formatDate(project.planned_end_date)}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              )}
            </ModalBody>
            <ModalFooter>
              <Button colorScheme="blue" mr={3} onClick={() => setSelectedEntrepreneur(null)}>
                סגור
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </Box>
  );
} 