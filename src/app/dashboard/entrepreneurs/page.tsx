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
  useToast,
  Divider,
  Textarea
} from '@chakra-ui/react';
import { FiFolder, FiCheckSquare, FiUser, FiPlus, FiEdit, FiTrash2 } from 'react-icons/fi';
import NextLink from 'next/link';
import projectService from '@/lib/services/projectService';
import entrepreneurService from '@/lib/services/entrepreneurService';
import { Project, Entrepreneur } from '@/types/supabase';

export default function EntrepreneursPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [entrepreneurs, setEntrepreneurs] = useState<Entrepreneur[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntrepreneur, setSelectedEntrepreneur] = useState<Entrepreneur | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [newEntrepreneur, setNewEntrepreneur] = useState({
    name: '',
    description: '',
    contact_info: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const toast = useToast();

  // טעינת נתונים
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // טעינת פרויקטים
        const projectsData = await projectService.getProjects();
        setProjects(projectsData);
        
        // טעינת יזמים מהטבלה החדשה
        const entrepreneursData = await entrepreneurService.getEntrepreneurs();
        setEntrepreneurs(entrepreneursData);
      } catch (error) {
        console.error('שגיאה בטעינת נתונים:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // פונקציה לקבלת פרויקטים של יזם ספציפי
  const getProjectsByEntrepreneur = (entrepreneurId: string) => {
    return projects.filter(project => project.entrepreneur_id === entrepreneurId);
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

  // פתיחת מודל להוספת יזם חדש
  const openAddEntrepreneurModal = () => {
    setIsEditing(false);
    setNewEntrepreneur({
      name: '',
      description: '',
      contact_info: ''
    });
    onOpen();
  };

  // פתיחת מודל לעריכת יזם קיים
  const openEditEntrepreneurModal = (entrepreneur: Entrepreneur) => {
    setIsEditing(true);
    setNewEntrepreneur({
      name: entrepreneur.name,
      description: entrepreneur.description || '',
      contact_info: entrepreneur.contact_info || ''
    });
    onOpen();
  };

  // הוספת או עדכון יזם
  const handleSaveEntrepreneur = async () => {
    if (!newEntrepreneur.name.trim()) {
      toast({
        title: "שגיאה",
        description: "שם היזם לא יכול להיות ריק",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      if (isEditing && selectedEntrepreneur) {
        // עדכון יזם קיים
        const updatedEntrepreneur = await entrepreneurService.updateEntrepreneur(
          selectedEntrepreneur.id,
          newEntrepreneur
        );
        
        // עדכון הרשימה המקומית
        setEntrepreneurs(entrepreneurs.map(e => 
          e.id === updatedEntrepreneur.id ? updatedEntrepreneur : e
        ));
        
        toast({
          title: "יזם עודכן בהצלחה",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } else {
        // בדיקה אם היזם כבר קיים
        const existingEntrepreneur = entrepreneurs.find(e => 
          e.name.toLowerCase() === newEntrepreneur.name.trim().toLowerCase()
        );
        
        if (existingEntrepreneur) {
          toast({
            title: "שגיאה",
            description: "יזם בשם זה כבר קיים במערכת",
            status: "error",
            duration: 3000,
            isClosable: true,
          });
          return;
        }
        
        // הוספת יזם חדש
        const createdEntrepreneur = await entrepreneurService.createEntrepreneur(newEntrepreneur);
        
        // עדכון הרשימה המקומית
        setEntrepreneurs([...entrepreneurs, createdEntrepreneur].sort((a, b) => 
          a.name.localeCompare(b.name)
        ));
        
        toast({
          title: "יזם נוסף בהצלחה",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      }
      
      // סגירת המודל וניקוי הטופס
      onClose();
      setNewEntrepreneur({
        name: '',
        description: '',
        contact_info: ''
      });
    } catch (error) {
      console.error('שגיאה בשמירת יזם:', error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בשמירת היזם",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // מחיקת יזם
  const handleDeleteEntrepreneur = async (entrepreneur: Entrepreneur) => {
    if (confirm(`האם אתה בטוח שברצונך למחוק את היזם "${entrepreneur.name}"?`)) {
      try {
        await entrepreneurService.deleteEntrepreneur(entrepreneur.id);
        
        // עדכון הרשימה המקומית
        setEntrepreneurs(entrepreneurs.filter(e => e.id !== entrepreneur.id));
        
        toast({
          title: "יזם נמחק בהצלחה",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } catch (error) {
        console.error('שגיאה במחיקת יזם:', error);
        toast({
          title: "שגיאה",
          description: "אירעה שגיאה במחיקת היזם",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    }
  };

  // טיפול בשינוי בשדות הטופס
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewEntrepreneur(prev => ({
      ...prev,
      [name]: value
    }));
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
        <Button leftIcon={<FiPlus />} colorScheme="blue" onClick={openAddEntrepreneurModal}>
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
            const entrepreneurProjects = getProjectsByEntrepreneur(entrepreneur.id);
            const activeProjects = entrepreneurProjects.filter(p => p.status === 'active').length;
            const completedProjects = entrepreneurProjects.filter(p => p.status === 'completed').length;
            
            return (
              <Card key={entrepreneur.id} position="relative">
                <CardHeader>
                  <Flex justifyContent="space-between" alignItems="center">
                    <Heading size="md" cursor="pointer" onClick={() => setSelectedEntrepreneur(entrepreneur)}>
                      {entrepreneur.name}
                    </Heading>
                    <Flex>
                      <Icon 
                        as={FiEdit} 
                        boxSize="20px" 
                        color="blue.500" 
                        cursor="pointer" 
                        mr={2}
                        onClick={() => {
                          setSelectedEntrepreneur(entrepreneur);
                          openEditEntrepreneurModal(entrepreneur);
                        }}
                      />
                      <Icon 
                        as={FiTrash2} 
                        boxSize="20px" 
                        color="red.500" 
                        cursor="pointer"
                        onClick={() => handleDeleteEntrepreneur(entrepreneur)}
                      />
                    </Flex>
                  </Flex>
                  {entrepreneur.description && (
                    <Text fontSize="sm" mt={2} color="gray.600">
                      {entrepreneur.description}
                    </Text>
                  )}
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
                  {entrepreneur.contact_info && (
                    <Text fontSize="sm" mt={2}>
                      <strong>פרטי קשר:</strong> {entrepreneur.contact_info}
                    </Text>
                  )}
                  <Button 
                    mt={4} 
                    size="sm" 
                    width="100%" 
                    colorScheme="blue" 
                    variant="outline"
                    as={NextLink}
                    href={`/dashboard?entrepreneur=${encodeURIComponent(entrepreneur.id)}`}
                  >
                    צפה בדשבורד
                  </Button>
                </CardBody>
              </Card>
            );
          })}
        </SimpleGrid>
      )}

      {/* מודל להוספת/עריכת יזם */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{isEditing ? 'עריכת יזם' : 'הוספת יזם חדש'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl isRequired mb={4}>
              <FormLabel>שם היזם</FormLabel>
              <Input 
                name="name"
                value={newEntrepreneur.name} 
                onChange={handleInputChange}
                placeholder="הכנס שם יזם" 
              />
            </FormControl>
            
            <FormControl mb={4}>
              <FormLabel>תיאור</FormLabel>
              <Textarea 
                name="description"
                value={newEntrepreneur.description} 
                onChange={handleInputChange}
                placeholder="תיאור היזם (לא חובה)" 
                rows={3}
              />
            </FormControl>
            
            <FormControl>
              <FormLabel>פרטי קשר</FormLabel>
              <Input 
                name="contact_info"
                value={newEntrepreneur.contact_info} 
                onChange={handleInputChange}
                placeholder="פרטי קשר (לא חובה)" 
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={handleSaveEntrepreneur}>
              {isEditing ? 'עדכן' : 'הוסף'}
            </Button>
            <Button variant="ghost" onClick={onClose}>ביטול</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* מודל לצפייה בפרטי יזם */}
      {selectedEntrepreneur && (
        <Modal 
          isOpen={!!selectedEntrepreneur && !isEditing} 
          onClose={() => setSelectedEntrepreneur(null)} 
          size="xl"
        >
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>פרטי יזם: {selectedEntrepreneur.name}</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              {selectedEntrepreneur.description && (
                <>
                  <Heading size="sm" mb={2}>תיאור</Heading>
                  <Text mb={4}>{selectedEntrepreneur.description}</Text>
                  <Divider mb={4} />
                </>
              )}
              
              {selectedEntrepreneur.contact_info && (
                <>
                  <Heading size="sm" mb={2}>פרטי קשר</Heading>
                  <Text mb={4}>{selectedEntrepreneur.contact_info}</Text>
                  <Divider mb={4} />
                </>
              )}
              
              <Heading size="md" mb={4}>פרויקטים של היזם</Heading>
              {getProjectsByEntrepreneur(selectedEntrepreneur.id).length === 0 ? (
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
                    {getProjectsByEntrepreneur(selectedEntrepreneur.id).map(project => (
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