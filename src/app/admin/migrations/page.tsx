'use client';

import { useState } from 'react';
import { Button, VStack, Heading, Text, Code, Alert, AlertIcon, Box, Container } from '@chakra-ui/react';

export default function MigrationsPage() {
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // פונקציה להרצת המיגרציה שמוסיפה את עמודת dropbox_folder_path לטבלת projects
  const runDropboxFolderPathMigration = async () => {
    setIsLoading(true);
    setMessage('');
    setError('');

    try {
      // קודם, נוודא שפונקציית exec_sql קיימת
      const createFunctionRes = await fetch('/api/migrations/create-sql-exec-function');
      const createFunctionData = await createFunctionRes.json();

      if (!createFunctionRes.ok) {
        setError(`שגיאה ביצירת פונקציית SQL: ${createFunctionData.error || 'שגיאה לא ידועה'}`);
        return;
      }

      // עכשיו, נריץ את המיגרציה להוספת העמודה
      const res = await fetch('/api/migrations/run-migrations');
      const data = await res.json();

      if (!res.ok) {
        setError(`שגיאה בהרצת המיגרציה: ${data.error || 'שגיאה לא ידועה'}`);
      } else {
        setMessage(`המיגרציה הורצה בהצלחה: ${data.message || 'העמודה נוספה או שהיא כבר הייתה קיימת'}`);
      }
    } catch (error) {
      setError(`שגיאה לא צפויה: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxW="container.md" py={8}>
      <VStack spacing={6} align="stretch">
        <Heading as="h1" size="xl" textAlign="center">ניהול מיגרציות</Heading>
        
        <Box p={4} borderWidth={1} borderRadius="md">
          <Heading as="h2" size="md" mb={4}>הוספת עמודת dropbox_folder_path לטבלת projects</Heading>
          <Text mb={4}>
            המיגרציה הזו תוסיף את העמודה <Code>dropbox_folder_path</Code> לטבלת <Code>projects</Code> אם היא לא קיימת.
            זה יפתור את השגיאה <Code>Could not find the 'dropbox_folder_path' column of 'projects' in the schema cache</Code>.
          </Text>
          <Button 
            colorScheme="blue" 
            onClick={runDropboxFolderPathMigration}
            isLoading={isLoading}
            loadingText="מריץ מיגרציה..."
            width="full"
          >
            הרץ מיגרציה
          </Button>
        </Box>

        {message && (
          <Alert status="success" variant="solid">
            <AlertIcon />
            {message}
          </Alert>
        )}

        {error && (
          <Alert status="error" variant="solid">
            <AlertIcon />
            {error}
          </Alert>
        )}

        <Box p={4} borderWidth={1} borderRadius="md" bg="gray.50">
          <Heading as="h3" size="sm" mb={2}>הנחיות ידניות:</Heading>
          <Text mb={2}>אם האפשרות למעלה נכשלת, באפשרותך להריץ את הקוד SQL הבא בממשק הניהול של Supabase:</Text>
          <Code p={4} borderRadius="md" display="block" whiteSpace="pre-wrap" bgColor="gray.100">
            {`-- בדיקה האם העמודה קיימת והוספתה אם לא
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'projects' 
        AND column_name = 'dropbox_folder_path'
    ) THEN
        -- הוספת העמודה
        ALTER TABLE public.projects 
        ADD COLUMN dropbox_folder_path text DEFAULT NULL;
    END IF;
END $$;`}
          </Code>
        </Box>
      </VStack>
    </Container>
  );
} 