'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  InputGroup,
  InputRightElement,
  IconButton,
  Container,
  Flex,
  useBreakpointValue,
} from '@chakra-ui/react';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { useAuthContext } from '@/components/auth/AuthProvider';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const { signIn, isAuthenticated } = useAuthContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  
  const returnUrl = searchParams.get('returnUrl');
  
  const isMobile = useBreakpointValue({ base: true, md: false });
  
  useEffect(() => {
    if (isAuthenticated) {
      const redirectTo = returnUrl ? decodeURIComponent(returnUrl) : '/dashboard';
      router.push(redirectTo);
    }
  }, [isAuthenticated, router, returnUrl]);
  
  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    if (!email) {
      newErrors.email = 'נדרש אימייל';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'כתובת אימייל לא תקינה';
    }
    
    if (!password) {
      newErrors.password = 'נדרשת סיסמה';
    } else if (password.length < 6) {
      newErrors.password = 'הסיסמה חייבת להכיל לפחות 6 תווים';
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
      await signIn(email, password);
      toast({
        title: 'התחברת בהצלחה',
        status: 'success',
        duration: 3000,
        isClosable: true,
        position: 'top-right',
      });
      
      const redirectTo = returnUrl ? decodeURIComponent(returnUrl) : '/dashboard';
      router.push(redirectTo);
    } catch (error) {
      toast({
        title: 'שגיאת התחברות',
        description: error instanceof Error ? error.message : 'אירעה שגיאה בהתחברות',
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
      <Container maxW={{ base: "95%", sm: "md" }} pt={{ base: 10, md: 32 }} pb={10}>
        <VStack spacing={{ base: 5, md: 8 }} w="full">
          <VStack spacing={{ base: 2, md: 3 }} textAlign="center">
            <Heading size={{ base: "lg", md: "xl" }}>התחברות</Heading>
            <Text color="gray.600" fontSize={{ base: "sm", md: "md" }}>התחבר למערכת ניהול המשימות</Text>
          </VStack>
          
          <Box
            w="full"
            bg="white"
            boxShadow="md"
            rounded="lg"
            p={{ base: 5, md: 8 }}
          >
            <form onSubmit={handleSubmit}>
              <VStack spacing={{ base: 4, md: 5 }}>
                <FormControl isInvalid={!!errors.email}>
                  <FormLabel htmlFor="email" fontSize={{ base: "sm", md: "md" }}>אימייל</FormLabel>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="הזן את האימייל שלך"
                    size={{ base: "sm", md: "md" }}
                  />
                  <FormErrorMessage fontSize={{ base: "xs", md: "sm" }}>{errors.email}</FormErrorMessage>
                </FormControl>
                
                <FormControl isInvalid={!!errors.password}>
                  <FormLabel htmlFor="password" fontSize={{ base: "sm", md: "md" }}>סיסמה</FormLabel>
                  <InputGroup size={{ base: "sm", md: "md" }}>
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="הזן את הסיסמה שלך"
                    />
                    <InputRightElement>
                      <IconButton
                        aria-label={showPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
                        icon={showPassword ? <FiEyeOff /> : <FiEye />}
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPassword(!showPassword)}
                      />
                    </InputRightElement>
                  </InputGroup>
                  <FormErrorMessage fontSize={{ base: "xs", md: "sm" }}>{errors.password}</FormErrorMessage>
                </FormControl>
                
                <Box w="full" textAlign="right">
                  <Link href="/auth/forgot-password">
                    <Text color="primary.600" fontSize={{ base: "xs", md: "sm" }}>
                      שכחת סיסמה?
                    </Text>
                  </Link>
                </Box>
                
                <Button
                  type="submit"
                  w="full"
                  colorScheme="primary"
                  size={{ base: "md", md: "lg" }}
                  isLoading={isLoading}
                >
                  התחברות
                </Button>
              </VStack>
            </form>
          </Box>
          
          <Flex fontSize={{ base: "sm", md: "md" }}>
            <Text>אין לך חשבון?</Text>
            <Link href="/auth/register">
              <Text color="primary.600" fontWeight="bold" mr={2}>
                צור חשבון
              </Text>
            </Link>
          </Flex>
        </VStack>
      </Container>
    </Box>
  );
} 