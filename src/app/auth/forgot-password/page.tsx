'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Heading,
  Text,
  FormErrorMessage,
  useToast,
  Container,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { useAuthContext } from '@/components/auth/AuthProvider';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<{ email?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  
  const { resetPassword } = useAuthContext();
  const toast = useToast();
  
  const validateForm = () => {
    const newErrors: { email?: string } = {};
    
    if (!email) {
      newErrors.email = 'נדרש אימייל';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'כתובת אימייל לא תקינה';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsLoading(true);
      await resetPassword(email);
      setIsEmailSent(true);
      toast({
        title: 'הוראות נשלחו',
        description: 'הוראות לאיפוס הסיסמה נשלחו לדוא"ל שלך',
        status: 'success',
        duration: 5000,
        isClosable: true,
        position: 'top-right',
      });
    } catch (error) {
      toast({
        title: 'שגיאה',
        description: error instanceof Error ? error.message : 'אירעה שגיאה בשליחת הוראות איפוס הסיסמה',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top-right',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Box minH="100vh" bg="gray.50">
      <Container maxW="md" pt={{ base: 20, md: 32 }} pb={10}>
        <VStack spacing={8} w="full">
          <VStack spacing={3} textAlign="center">
            <Heading>שכחת סיסמה?</Heading>
            <Text color="gray.600">
              הכנס את כתובת האימייל שלך ואנו נשלח לך הוראות לאיפוס הסיסמה
            </Text>
          </VStack>
          
          {isEmailSent ? (
            <Alert
              status="success"
              variant="subtle"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              textAlign="center"
              height="200px"
              rounded="lg"
            >
              <AlertIcon boxSize="40px" mr={0} />
              <Heading as="h3" size="md" mt={4} mb={1}>
                הוראות נשלחו!
              </Heading>
              <Text>
                הוראות לאיפוס הסיסמה נשלחו לדוא"ל שלך.
                <br />
                אנא בדוק את תיבת הדואר הנכנס שלך (כולל תיקיית הספאם).
              </Text>
            </Alert>
          ) : (
            <Box
              w="full"
              bg="white"
              boxShadow="md"
              rounded="lg"
              p={8}
            >
              <form onSubmit={handleSubmit}>
                <VStack spacing={5}>
                  <FormControl isInvalid={!!errors.email}>
                    <FormLabel htmlFor="email">אימייל</FormLabel>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="הזן את האימייל שלך"
                    />
                    <FormErrorMessage>{errors.email}</FormErrorMessage>
                  </FormControl>
                  
                  <Button
                    type="submit"
                    w="full"
                    colorScheme="primary"
                    size="lg"
                    isLoading={isLoading}
                  >
                    שלח הוראות לאיפוס סיסמה
                  </Button>
                </VStack>
              </form>
            </Box>
          )}
          
          <Link href="/auth/login">
            <Text color="primary.600" fontWeight="medium">
              חזרה להתחברות
            </Text>
          </Link>
        </VStack>
      </Container>
    </Box>
  );
} 