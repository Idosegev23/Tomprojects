'use client';

import React from 'react';
import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import { CacheProvider } from '@chakra-ui/next-js';
import { AuthProvider } from '@/components/auth/AuthProvider';

// הרחבת הנושא של Chakra UI כדי להתאים אותו לצרכים שלנו
const theme = extendTheme({
  direction: 'rtl',
  colors: {
    primary: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9',
      600: '#0284c7',
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e',
    },
  },
  breakpoints: {
    sm: '30em', // 480px
    md: '48em', // 768px
    lg: '62em', // 992px
    xl: '80em', // 1280px
    '2xl': '96em', // 1536px
  },
  styles: {
    global: {
      body: {
        bg: 'gray.50',
      },
      // הוספת סגנונות גלובליים לרספונסיביות
      'html, body': {
        maxWidth: '100vw',
        overflowX: 'hidden',
      },
    },
  },
  components: {
    Button: {
      defaultProps: {
        colorScheme: 'primary',
      },
    },
    Container: {
      baseStyle: {
        maxW: { base: '100%', md: '90%', lg: '80%' },
        px: { base: 2, md: 4 },
      },
    },
    // הגדרות רספונסיביות לקומפוננטות נוספות
    Table: {
      variants: {
        responsive: {
          table: {
            display: { base: 'block', md: 'table' },
            overflowX: { base: 'auto', md: 'initial' },
          },
          thead: {
            display: { base: 'none', md: 'table-header-group' },
          },
          tbody: {
            display: { base: 'block', md: 'table-row-group' },
          },
          tr: {
            display: { base: 'grid', md: 'table-row' },
            gridTemplateColumns: { base: '1fr 1fr', md: 'auto' },
            borderBottom: { base: '1px solid', md: 'none' },
            borderColor: 'gray.200',
          },
          td: {
            display: { base: 'block', md: 'table-cell' },
            textAlign: 'start',
            py: { base: 2, md: 3 },
          },
        },
      },
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CacheProvider>
      <ChakraProvider theme={theme}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </ChakraProvider>
    </CacheProvider>
  );
} 