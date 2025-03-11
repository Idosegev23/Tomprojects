'use client';

import React from 'react';
import { 
  Box, 
  Flex, 
  Heading, 
  IconButton, 
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Avatar,
  Text,
  HStack,
  useColorMode,
  Button,
} from '@chakra-ui/react';
import { FiBell, FiUser, FiSettings, FiLogOut, FiMoon, FiSun, FiLogIn } from 'react-icons/fi';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { useRouter } from 'next/navigation';

export default function Header() {
  const { colorMode, toggleColorMode } = useColorMode();
  const { user, signOut, isAuthenticated } = useAuthContext();
  const router = useRouter();
  
  const handleLogin = () => {
    router.push('/auth/login');
  };
  
  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  const getDisplayName = () => {
    if (!user) return '';
    
    // נסה להשתמש בשם המלא אם הוא קיים
    if (user.user_metadata?.fullName) {
      return user.user_metadata.fullName;
    }
    
    // אחרת השתמש בחלק הראשון של האימייל
    return user.email?.split('@')[0] || '';
  };
  
  return (
    <Box 
      as="header" 
      py={2} 
      px={4} 
      bg="white" 
      boxShadow="sm"
      borderBottom="1px"
      borderColor="gray.200"
    >
      <Flex justify="space-between" align="center">
        <Heading size="md">פורטל המשרד הראשי</Heading>
        
        <HStack spacing={2}>
          <IconButton
            aria-label="מצב כהה/בהיר"
            icon={colorMode === 'light' ? <FiMoon /> : <FiSun />}
            onClick={toggleColorMode}
            variant="ghost"
            size="md"
          />
          
          {isAuthenticated && (
            <IconButton
              aria-label="התראות"
              icon={<FiBell />}
              variant="ghost"
              size="md"
            />
          )}
          
          {isAuthenticated ? (
            <Menu>
              <MenuButton
                as={IconButton}
                icon={<FiUser />}
                variant="ghost"
                size="md"
                aria-label="פתח תפריט משתמש"
              />
              <MenuList>
                <HStack px={3} py={2}>
                  <Avatar size="sm" name={getDisplayName()} />
                  <Box>
                    <Text fontWeight="medium">{getDisplayName()}</Text>
                    <Text fontSize="xs" color="gray.500">{user?.email}</Text>
                  </Box>
                </HStack>
                
                <MenuItem icon={<FiSettings size={18} />}>הגדרות</MenuItem>
                <MenuItem icon={<FiLogOut size={18} />} onClick={handleSignOut}>התנתק</MenuItem>
              </MenuList>
            </Menu>
          ) : (
            <Button
              leftIcon={<FiLogIn />}
              variant="outline"
              size="sm"
              onClick={handleLogin}
            >
              התחברות
            </Button>
          )}
        </HStack>
      </Flex>
    </Box>
  );
} 