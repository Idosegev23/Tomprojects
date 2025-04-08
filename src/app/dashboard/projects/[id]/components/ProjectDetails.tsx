'use client';

import {
  Card,
  CardBody,
  HStack,
  Text,
  Icon,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Progress,
  useColorModeValue
} from '@chakra-ui/react';
import {
  FiCalendar,
  FiTarget,
  FiBarChart2,
  FiCreditCard,
  FiUsers,
  FiInfo as InfoIcon
} from 'react-icons/fi';
import { Project, Task } from '@/types/supabase';
import { useEffect, useState } from 'react';
import entrepreneurService from '@/lib/services/entrepreneurService';

interface ProjectDetailsProps {
  project: Project;
  tasks: Task[];
  progress: number;
  formatDate: (dateString: string | null) => string;
}

export default function ProjectDetails({ project, tasks, progress, formatDate }: ProjectDetailsProps) {
  const [entrepreneurName, setEntrepreneurName] = useState<string | null>(null);
  
  // קריאה לכל ה-hooks מחוץ ל-render להבטחת סדר קבוע
  const descriptionBg = useColorModeValue('gray.50', 'gray.700');
  const cardBg = useColorModeValue('white', 'gray.700');
  
  // קבלת שם היזם על פי המזהה
  useEffect(() => {
    const fetchEntrepreneurName = async () => {
      if (project.entrepreneur_id) {
        try {
          const entrepreneur = await entrepreneurService.getEntrepreneurById(project.entrepreneur_id);
          if (entrepreneur) {
            setEntrepreneurName(entrepreneur.name);
          }
        } catch (error) {
          console.error('שגיאה בטעינת פרטי היזם:', error);
        }
      }
    };
    
    fetchEntrepreneurName();
  }, [project.entrepreneur_id]);

  return (
    <>
      {project.description && (
        <Card mb={4} variant="outline" bg={descriptionBg}>
          <CardBody>
            <HStack mb={2}>
              <Icon as={InfoIcon} color="blue.500" />
              <Text fontWeight="bold">תיאור הפרויקט</Text>
            </HStack>
            <Text>{project.description}</Text>
          </CardBody>
        </Card>
      )}
      
      <SimpleGrid 
        columns={{ base: 1, sm: 2, md: 4 }}
        spacing={4} 
        mb={4}
      >
        <Card variant="elevated" shadow="md" bg={cardBg}>
          <CardBody>
            <Stat>
              <StatLabel>
                <HStack>
                  <Icon as={FiCalendar} color="blue.500" />
                  <Text>תאריך התחלה</Text>
                </HStack>
              </StatLabel>
              <StatNumber fontSize="lg">{formatDate(project.planned_start_date)}</StatNumber>
            </Stat>
          </CardBody>
        </Card>
        
        <Card variant="elevated" shadow="md" bg={cardBg}>
          <CardBody>
            <Stat>
              <StatLabel>
                <HStack>
                  <Icon as={FiTarget} color="purple.500" />
                  <Text>תאריך סיום</Text>
                </HStack>
              </StatLabel>
              <StatNumber fontSize="lg">{formatDate(project.planned_end_date)}</StatNumber>
            </Stat>
          </CardBody>
        </Card>
        
        <Card variant="elevated" shadow="md" bg={cardBg}>
          <CardBody>
            <Stat>
              <StatLabel>
                <HStack>
                  <Icon as={FiBarChart2} color="green.500" />
                  <Text>התקדמות</Text>
                </HStack>
              </StatLabel>
              <StatNumber fontSize="lg">{progress}%</StatNumber>
              <Progress 
                value={progress} 
                colorScheme={progress < 30 ? 'red' : progress < 70 ? 'orange' : 'green'} 
                size="sm" 
                mt={2} 
                borderRadius="full"
              />
            </Stat>
          </CardBody>
        </Card>
        
        <Card variant="elevated" shadow="md" bg={cardBg}>
          <CardBody>
            <Stat>
              <StatLabel>
                <HStack>
                  <Icon as={FiCreditCard} color="orange.500" />
                  <Text>משימות</Text>
                </HStack>
              </StatLabel>
              <StatNumber fontSize="lg">{tasks.length}</StatNumber>
              <StatHelpText>{tasks.filter(t => t.status === 'done').length} הושלמו</StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        {project.entrepreneur_id && entrepreneurName && (
          <Card variant="elevated" shadow="md" bg={cardBg}>
            <CardBody>
              <Stat>
                <StatLabel>
                  <HStack>
                    <Icon as={FiUsers} color="teal.500" />
                    <Text>יזם</Text>
                  </HStack>
                </StatLabel>
                <StatNumber fontSize="lg">{entrepreneurName}</StatNumber>
              </Stat>
            </CardBody>
          </Card>
        )}
      </SimpleGrid>
    </>
  );
} 