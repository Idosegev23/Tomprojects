'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Box, Spinner, Center } from '@chakra-ui/react';
import { useAuthContext } from './AuthProvider';

interface RequireAuthProps {
  children: React.ReactNode;
}

export default function RequireAuth({ children }: RequireAuthProps) {
  const { isAuthenticated, loading } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();
  
  useEffect(() => {
    // אם סיימנו לטעון ואין משתמש מחובר, הפנה להתחברות
    if (!loading && !isAuthenticated) {
      // שמור את המסלול הנוכחי כדי לחזור אליו אחרי ההתחברות
      const returnUrl = encodeURIComponent(pathname);
      router.push(`/auth/login?returnUrl=${returnUrl}`);
    }
  }, [isAuthenticated, loading, router, pathname]);
  
  // אם עדיין טוענים, הראה ספינר
  if (loading) {
    return (
      <Center minH="100vh">
        <Spinner
          thickness="4px"
          speed="0.65s"
          emptyColor="gray.200"
          color="primary.500"
          size="xl"
        />
      </Center>
    );
  }
  
  // הראה את התוכן רק אם המשתמש מחובר
  return isAuthenticated ? <>{children}</> : null;
} 