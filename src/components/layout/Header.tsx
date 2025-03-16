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
  useBreakpointValue,
} from '@chakra-ui/react';
import { FiBell, FiUser, FiSettings, FiLogOut, FiMoon, FiSun, FiLogIn, FiMenu } from 'react-icons/fi';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

export default function Header({ onMenuClick, showMenuButton = false }: HeaderProps) {
  const { colorMode, toggleColorMode } = useColorMode();
  const { user, signOut, isAuthenticated } = useAuthContext();
  const router = useRouter();
  
  const headingSize = useBreakpointValue({ base: 'sm', md: 'md' });
  
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
      px={{ base: 2, md: 4 }} 
      bg="white" 
      boxShadow="sm"
      borderBottom="1px"
      borderColor="gray.200"
    >
      <Flex justify="space-between" align="center">
        <Flex align="center">
          {showMenuButton && (
            <IconButton
              aria-label="פתח תפריט"
              icon={<FiMenu />}
              onClick={onMenuClick}
              variant="ghost"
              size="md"
              mr={2}
            />
          )}
          <Heading size={headingSize} noOfLines={1}>פורטל המשרד הראשי</Heading>
        </Flex>
        
        <HStack spacing={{ base: 1, md: 2 }}>
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
              display={{ base: 'none', sm: 'flex' }}
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
              display={{ base: 'none', sm: 'flex' }}
            >
              התחברות
            </Button>
          )}
        </HStack>
      </Flex>
    </Box>
  );
} 