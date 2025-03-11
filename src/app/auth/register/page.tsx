'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
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
} from '@chakra-ui/react';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { useAuthContext } from '@/components/auth/AuthProvider';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const { signUp } = useAuthContext();
  const router = useRouter();
  const toast = useToast();
  
  const validateForm = () => {
    const newErrors: {
      fullName?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};
    
    if (!fullName) {
      newErrors.fullName = 'נדרש שם מלא';
    }
    
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
    
    if (!confirmPassword) {
      newErrors.confirmPassword = 'נדרש אימות סיסמה';
    } else if (confirmPassword !== password) {
      newErrors.confirmPassword = 'הסיסמאות אינן תואמות';
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
      await signUp(email, password, { fullName });
      
      toast({
        title: 'נרשמת בהצלחה',
        description: 'חשבונך נוצר בהצלחה',
        status: 'success',
        duration: 5000,
        isClosable: true,
        position: 'top-right',
      });
      
      router.push('/dashboard');
    } catch (error) {
      toast({
        title: 'שגיאת הרשמה',
        description: error instanceof Error ? error.message : 'אירעה שגיאה בהרשמה',
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
            <Heading>הרשמה</Heading>
            <Text color="gray.600">צור חשבון במערכת ניהול המשימות</Text>
          </VStack>
          
          <Box
            w="full"
            bg="white"
            boxShadow="md"
            rounded="lg"
            p={8}
          >
            <form onSubmit={handleSubmit}>
              <VStack spacing={5}>
                <FormControl isInvalid={!!errors.fullName}>
                  <FormLabel htmlFor="fullName">שם מלא</FormLabel>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="הזן את שמך המלא"
                  />
                  <FormErrorMessage>{errors.fullName}</FormErrorMessage>
                </FormControl>
                
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
                
                <FormControl isInvalid={!!errors.password}>
                  <FormLabel htmlFor="password">סיסמה</FormLabel>
                  <InputGroup>
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
                  <FormErrorMessage>{errors.password}</FormErrorMessage>
                </FormControl>
                
                <FormControl isInvalid={!!errors.confirmPassword}>
                  <FormLabel htmlFor="confirmPassword">אימות סיסמה</FormLabel>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="הזן שוב את הסיסמה שלך"
                  />
                  <FormErrorMessage>{errors.confirmPassword}</FormErrorMessage>
                </FormControl>
                
                <Button
                  type="submit"
                  w="full"
                  colorScheme="primary"
                  size="lg"
                  isLoading={isLoading}
                >
                  הרשמה
                </Button>
              </VStack>
            </form>
          </Box>
          
          <Flex>
            <Text>כבר יש לך חשבון?</Text>
            <Link href="/auth/login">
              <Text color="primary.600" fontWeight="bold" mr={2}>
                התחבר
              </Text>
            </Link>
          </Flex>
        </VStack>
      </Container>
    </Box>
  );
} 