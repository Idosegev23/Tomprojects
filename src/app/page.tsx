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
      <Container maxW="container.xl" py={{ base: 6, md: 10 }}>
        <VStack spacing={{ base: 5, md: 8 }} align="center" textAlign="center">
          {isAuthenticated ? (
            // תצוגה למשתמשים מחוברים
            <>
              <Heading as="h1" size={{ base: "xl", md: "2xl" }}>
                שלום, {displayName}
              </Heading>
              <Text fontSize={{ base: "md", md: "xl" }} maxW="container.md">
                ברוך הבא למערכת ניהול הפרויקטים והמשימות של המשרד הראשי
              </Text>
              
              <Flex 
                gap={{ base: 2, md: 4 }} 
                mt={{ base: 4, md: 8 }}
                direction={{ base: isMobile ? "column" : "row", md: "row" }}
                w={{ base: "100%", md: "auto" }}
              >
                <Button 
                  size={{ base: "md", md: "lg" }} 
                  colorScheme="primary" 
                  onClick={() => router.push('/dashboard')}
                  w={{ base: isMobile ? "100%" : "auto", md: "auto" }}
                >
                  לדאשבורד שלי
                </Button>
                <Button 
                  as={Link}
                  href="/dashboard/projects" 
                  size={{ base: "md", md: "lg" }} 
                  variant="outline"
                  w={{ base: isMobile ? "100%" : "auto", md: "auto" }}
                >
                  לפרויקטים שלי
                </Button>
              </Flex>
            </>
          ) : (
            // תצוגה למשתמשים לא מחוברים
            <>
              <Heading as="h1" size={{ base: "xl", md: "2xl" }}>
                פורטל ניהול פרויקטים
              </Heading>
              <Text fontSize={{ base: "md", md: "xl" }} maxW="container.md">
                מערכת מתקדמת לניהול פרויקטים, משימות ומעקב אחר התקדמות עבור המשרד הראשי
              </Text>
              
              <Flex 
                gap={{ base: 2, md: 4 }} 
                mt={{ base: 4, md: 8 }}
                direction={{ base: isMobile ? "column" : "row", md: "row" }}
                w={{ base: "100%", md: "auto" }}
              >
                <Button 
                  size={{ base: "md", md: "lg" }} 
                  colorScheme="primary" 
                  onClick={() => router.push('/auth/login')}
                  w={{ base: isMobile ? "100%" : "auto", md: "auto" }}
                >
                  התחברות
                </Button>
                <Button 
                  as={Link}
                  href="/auth/register" 
                  size={{ base: "md", md: "lg" }} 
                  variant="outline"
                  w={{ base: isMobile ? "100%" : "auto", md: "auto" }}
                >
                  הרשמה
                </Button>
              </Flex>
            </>
          )}
          
          {/* תכונות המערכת */}
          <Box w="full" mt={{ base: 10, md: 16 }}>
            <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} spacing={{ base: 4, md: 8 }}>
              {features.map((feature, i) => (
                <Card key={i}>
                  <CardBody p={{ base: 4, md: 6 }}>
                    <VStack spacing={{ base: 3, md: 4 }} align="center" textAlign="center">
                      <Flex
                        w={{ base: "50px", md: "60px" }}
                        h={{ base: "50px", md: "60px" }}
                        bg={`${feature.color}20`}
                        color={feature.color}
                        rounded="full"
                        align="center"
                        justify="center"
                        mb={{ base: 1, md: 2 }}
                      >
                        <Icon as={feature.icon} boxSize={{ base: 6, md: 8 }} />
                      </Flex>
                      <Heading size={{ base: "sm", md: "md" }}>{feature.title}</Heading>
                      <Text fontSize={{ base: "sm", md: "md" }}>{feature.description}</Text>
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