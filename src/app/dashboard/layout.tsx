'use client';

import React from 'react';
import { Box, Flex } from '@chakra-ui/react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import RequireAuth from '@/components/auth/RequireAuth';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <RequireAuth>
      <Flex h="100vh" direction="column">
        <Header />
        <Flex flex="1" overflowY="auto">
          <Sidebar />
          <Box as="main" flex="1" p={5} overflowY="auto">
            {children}
          </Box>
        </Flex>
      </Flex>
    </RequireAuth>
  );
} 