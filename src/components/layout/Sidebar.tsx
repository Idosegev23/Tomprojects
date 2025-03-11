'use client';

import React from 'react';
import { Box, VStack, Icon, Text, Flex, Divider } from '@chakra-ui/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  FiHome, 
  FiFolder, 
  FiCheckSquare, 
  FiCalendar, 
  FiPieChart, 
  FiSettings, 
  FiUsers 
} from 'react-icons/fi';

type NavItemProps = {
  href: string;
  icon: any;
  children: React.ReactNode;
};

export default function Sidebar() {
  const pathname = usePathname();
  
  return (
    <Box
      as="nav"
      w="240px"
      h="full"
      bg="white"
      borderRight="1px"
      borderColor="gray.200"
      py={5}
    >
      <VStack spacing={1} align="stretch">
        <NavItem href="/dashboard" icon={FiHome} active={pathname === '/dashboard'}>
          דאשבורד
        </NavItem>
        
        <Divider my={2} />
        
        <Text fontSize="xs" fontWeight="bold" color="gray.500" mx={4} mb={2} mt={3}>
          ניהול
        </Text>
        
        <NavItem 
          href="/dashboard/projects" 
          icon={FiFolder}
          active={pathname?.startsWith('/dashboard/projects')}
        >
          פרויקטים
        </NavItem>
        
        <NavItem 
          href="/dashboard/tasks" 
          icon={FiCheckSquare}
          active={pathname?.startsWith('/dashboard/tasks')}
        >
          משימות
        </NavItem>
        
        <NavItem 
          href="/dashboard/calendar" 
          icon={FiCalendar}
          active={pathname?.startsWith('/dashboard/calendar')}
        >
          לוח שנה
        </NavItem>
        
        <Divider my={2} />
        
        <Text fontSize="xs" fontWeight="bold" color="gray.500" mx={4} mb={2} mt={3}>
          נוסף
        </Text>
        
        <NavItem 
          href="/dashboard/reports" 
          icon={FiPieChart}
          active={pathname?.startsWith('/dashboard/reports')}
        >
          דוחות
        </NavItem>
        
        <NavItem 
          href="/dashboard/team" 
          icon={FiUsers}
          active={pathname?.startsWith('/dashboard/team')}
        >
          צוות
        </NavItem>
        
        <NavItem 
          href="/dashboard/settings" 
          icon={FiSettings}
          active={pathname?.startsWith('/dashboard/settings')}
        >
          הגדרות
        </NavItem>
      </VStack>
    </Box>
  );
}

function NavItem({ href, icon, children, active }: NavItemProps & { active?: boolean }) {
  return (
    <Link href={href} passHref style={{ textDecoration: 'none' }}>
      <Flex
        mx={2}
        px={3}
        py={2}
        borderRadius="md"
        alignItems="center"
        bg={active ? 'primary.50' : 'transparent'}
        color={active ? 'primary.700' : 'gray.700'}
        fontWeight={active ? 'medium' : 'normal'}
        transition="all 0.2s"
        _hover={{
          bg: active ? 'primary.100' : 'gray.100',
        }}
      >
        <Icon as={icon} mr={3} boxSize="18px" />
        <Text fontSize="sm">{children}</Text>
      </Flex>
    </Link>
  );
} 