'use client';

import React, { useEffect } from 'react';
import { 
  Box, 
  Button, 
  Container, 
  Flex, 
  Heading, 
  Text, 
  VStack,
  SimpleGrid,
  Card,
  CardBody,
  Icon,
  HStack,
  useBreakpointValue 
} from '@chakra-ui/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { FiCheckSquare, FiFolder, FiCalendar, FiUsers } from 'react-icons/fi';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthContext();
  
  const displayName = user?.user_metadata?.fullName || user?.email?.split('@')[0] || '';
  
  const isMobile = useBreakpointValue({ base: true, md: false });
  
  // תכונות של המערכת להצגה בדף הבית
  const features = [
    {
      title: 'ניהול פרויקטים',
      description: 'צור ונהל פרויקטים עם שלבים מותאמים אישית',
      icon: FiFolder,
      color: 'blue.500',
    },
    {
      title: 'מעקב משימות',
      description: 'נהל משימות בקלות עם תצוגות שונות וסינון מתקדם',
      icon: FiCheckSquare,
      color: 'green.500',
    },
    {
      title: 'לוח שנה',
      description: 'צפה במשימות ופרויקטים עם לוח שנה מובנה',
      icon: FiCalendar,
      color: 'purple.500',
    },
    {
      title: 'עבודת צוות',
      description: 'שתף משימות עם חברי צוות ושיתוף פעולה יעיל',
      icon: FiUsers,
      color: 'orange.500',
    },
  ];
  
  return (
    <Box as="main">
      <Container maxW="container.xl" py={10}>
        <VStack spacing={8} align="center" textAlign="center">
          {isAuthenticated ? (
            // תצוגה למשתמשים מחוברים
            <>
              <Heading as="h1" size="2xl">
                שלום, {displayName}
              </Heading>
              <Text fontSize="xl" maxW="container.md">
                ברוך הבא למערכת ניהול הפרויקטים והמשימות של המשרד הראשי
              </Text>
              
              <Flex gap={4} mt={8}>
                <Button 
                  size="lg" 
                  colorScheme="primary" 
                  onClick={() => router.push('/dashboard')}
                >
                  לדאשבורד שלי
                </Button>
                <Button 
                  as={Link}
                  href="/dashboard/projects" 
                  size="lg" 
                  variant="outline"
                >
                  לפרויקטים שלי
                </Button>
              </Flex>
            </>
          ) : (
            // תצוגה למשתמשים לא מחוברים
            <>
              <Heading as="h1" size="2xl">
                פורטל ניהול פרויקטים
              </Heading>
              <Text fontSize="xl" maxW="container.md">
                מערכת מתקדמת לניהול פרויקטים, משימות ומעקב אחר התקדמות עבור המשרד הראשי
              </Text>
              
              <Flex gap={4} mt={8}>
                <Button 
                  size="lg" 
                  colorScheme="primary" 
                  onClick={() => router.push('/auth/login')}
                >
                  התחברות
                </Button>
                <Button 
                  as={Link}
                  href="/auth/register" 
                  size="lg" 
                  variant="outline"
                >
                  הרשמה
                </Button>
              </Flex>
            </>
          )}
          
          {/* תכונות המערכת */}
          <Box w="full" mt={16}>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={8}>
              {features.map((feature, i) => (
                <Card key={i}>
                  <CardBody>
                    <VStack spacing={4} align="center" textAlign="center">
                      <Flex
                        w="60px"
                        h="60px"
                        bg={`${feature.color}20`}
                        color={feature.color}
                        rounded="full"
                        align="center"
                        justify="center"
                        mb={2}
                      >
                        <Icon as={feature.icon} boxSize={8} />
                      </Flex>
                      <Heading size="md">{feature.title}</Heading>
                      <Text>{feature.description}</Text>
                    </VStack>
                  </CardBody>
                </Card>
              ))}
            </SimpleGrid>
          </Box>
        </VStack>
      </Container>
    </Box>
  );
} 