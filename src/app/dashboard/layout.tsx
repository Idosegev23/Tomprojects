'use client';

import React, { useState } from 'react';
import { Box, Flex, useBreakpointValue, IconButton, Drawer, DrawerOverlay, DrawerContent, DrawerCloseButton, DrawerBody } from '@chakra-ui/react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import RequireAuth from '@/components/auth/RequireAuth';
import { FiMenu } from 'react-icons/fi';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useBreakpointValue({ base: true, md: false });

  const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);

  return (
    <RequireAuth>
      <Flex h="100vh" direction="column">
        <Header onMenuClick={toggleSidebar} showMenuButton={isMobile} />
        <Flex flex="1" overflowY="auto">
          {/* Desktop Sidebar */}
          {!isMobile && <Sidebar />}
          
          {/* Mobile Sidebar (Drawer) */}
          {isMobile && (
            <Drawer
              isOpen={isSidebarOpen}
              placement="right"
              onClose={() => setSidebarOpen(false)}
            >
              <DrawerOverlay />
              <DrawerContent>
                <DrawerCloseButton />
                <DrawerBody p={0}>
                  <Sidebar isMobile={true} />
                </DrawerBody>
              </DrawerContent>
            </Drawer>
          )}
          
          <Box as="main" flex="1" p={{ base: 3, md: 5 }} overflowY="auto">
            {children}
          </Box>
        </Flex>
      </Flex>
    </RequireAuth>
  );
} 