'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Text,
  Input,
  VStack,
  HStack,
  Checkbox,
  FormControl,
  FormLabel,
  Divider,
  InputGroup,
  InputLeftElement,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Spinner,
  Alert,
  AlertIcon,
  useToast,
  Card,
  CardBody,
  Link,
} from '@chakra-ui/react';
import { SearchIcon, WarningIcon } from '@chakra-ui/icons';
import { FiFolder, FiExternalLink } from 'react-icons/fi';
import dropboxService from '@/lib/services/dropboxService';

type FolderInfo = {
  name: string;
  path: string;
  id: string;
  subFolders?: FolderInfo[];
};

type FolderStructure = {
  path: string;
  folders: FolderInfo[];
};

export default function DropboxExplorer() {
  const [path, setPath] = useState('');
  const [recursive, setRecursive] = useState(false);
  const [depth, setDepth] = useState(2);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [folderStructure, setFolderStructure] = useState<FolderStructure | null>(null);
  const [isDropboxConfigured, setIsDropboxConfigured] = useState<boolean | null>(null);
  const toast = useToast();

  // בדיקה האם דרופבוקס מוגדר
  useEffect(() => {
    const checkDropboxConfig = async () => {
      const isConfigured = dropboxService.isConfigured();
      setIsDropboxConfigured(isConfigured);
      
      if (!isConfigured) {
        setError('דרופבוקס לא מוגדר. אנא הגדר טוקן גישה בהגדרות המערכת.');
      }
    };
    
    checkDropboxConfig();
  }, []);

  const fetchFolderStructure = async () => {
    if (!isDropboxConfigured) {
      toast({
        title: 'דרופבוקס לא מוגדר',
        description: 'אנא הגדר טוקן גישה בהגדרות המערכת',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      // בניית URL לקריאת ה-API
      const params = new URLSearchParams();
      if (path) params.append('path', path);
      if (recursive) params.append('recursive', 'true');
      params.append('depth', depth.toString());
      
      const url = `/api/dropbox/structure?${params.toString()}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'שגיאה בקבלת מבנה תיקיות');
      }
      
      setFolderStructure(data);
      
      toast({
        title: 'נטען בהצלחה',
        description: `נמצאו ${data.folders.length} תיקיות ב-${path || '/'}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error fetching folder structure:', error);
      setError(error instanceof Error ? error.message : 'שגיאה בקבלת מבנה תיקיות');
      
      toast({
        title: 'שגיאה',
        description: error instanceof Error ? error.message : 'שגיאה בקבלת מבנה תיקיות',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // רכיב תצוגת תיקייה (רקורסיבי)
  const FolderItem = ({ folder }: { folder: FolderInfo }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [subFolders, setSubFolders] = useState<FolderInfo[] | null>(folder.subFolders || null);
    
    const handleOpenFolder = async () => {
      setIsOpen(!isOpen);
      
      // אם אין תת-תיקיות וטרם נטענו, ננסה לטעון אותן
      if (!isOpen && !subFolders && !isLoading) {
        try {
          setIsLoading(true);
          
          const params = new URLSearchParams();
          params.append('path', folder.path);
          params.append('recursive', 'false');
          
          const url = `/api/dropbox/structure?${params.toString()}`;
          const response = await fetch(url);
          const data = await response.json();
          
          if (!response.ok) {
            throw new Error(data.message || 'שגיאה בקבלת מבנה תיקיות');
          }
          
          setSubFolders(data.folders);
        } catch (error) {
          console.error(`Error fetching subfolders for ${folder.path}:`, error);
          toast({
            title: 'שגיאה',
            description: `שגיאה בטעינת תת-תיקיות: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`,
            status: 'error',
            duration: 3000,
            isClosable: true,
          });
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    return (
      <AccordionItem>
        <h3>
          <AccordionButton onClick={handleOpenFolder}>
            <Box flex="1" textAlign="right" display="flex" alignItems="center">
              <Box as={FiFolder} mr={2} color="blue.500" />
              <Text fontWeight="medium">{folder.name}</Text>
            </Box>
            {isLoading ? <Spinner size="sm" mr={2} /> : <AccordionIcon />}
          </AccordionButton>
        </h3>
        <AccordionPanel pb={4}>
          <Text fontSize="sm" color="gray.600" mb={2} dir="ltr">
            {folder.path}
          </Text>
          
          {subFolders && subFolders.length > 0 ? (
            <Accordion allowToggle>
              {subFolders.map((subfolder) => (
                <FolderItem key={subfolder.id} folder={subfolder} />
              ))}
            </Accordion>
          ) : subFolders && subFolders.length === 0 ? (
            <Text fontSize="sm" color="gray.500">אין תיקיות משנה</Text>
          ) : null}
        </AccordionPanel>
      </AccordionItem>
    );
  };

  return (
    <Container maxW="container.lg" py={6}>
      <VStack spacing={6} align="stretch">
        <Heading size="lg">דפדפן תיקיות דרופבוקס</Heading>
        
        <Divider />
        
        {isDropboxConfigured === false && (
          <Alert status="warning" borderRadius="md">
            <AlertIcon />
            <VStack align="start" spacing={2}>
              <Text>דרופבוקס לא מוגדר במערכת</Text>
              <Text fontSize="sm">
                אנא הגדר את משתנה הסביבה NEXT_PUBLIC_DROPBOX_ACCESS_TOKEN עם טוקן גישה תקף כדי להשתמש בפונקציונליות של דרופבוקס.
              </Text>
              <Link href="https://www.dropbox.com/developers/apps" isExternal color="blue.500">
                <Flex align="center">
                  <Text>צור אפליקציית דרופבוקס</Text>
                  <Box as={FiExternalLink} ml={1} />
                </Flex>
              </Link>
            </VStack>
          </Alert>
        )}
        
        <Card>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel>נתיב בדרופבוקס:</FormLabel>
                <InputGroup>
                  <InputLeftElement pointerEvents="none">
                    <SearchIcon color="gray.300" />
                  </InputLeftElement>
                  <Input
                    value={path}
                    onChange={(e) => setPath(e.target.value)}
                    placeholder="השאר ריק לתיקיית השורש"
                    isDisabled={!isDropboxConfigured}
                  />
                </InputGroup>
              </FormControl>
              
              <HStack spacing={4}>
                <FormControl display="flex" alignItems="center">
                  <Checkbox 
                    isChecked={recursive} 
                    onChange={(e) => setRecursive(e.target.checked)}
                    isDisabled={!isDropboxConfigured}
                  />
                  <FormLabel mb="0" ml={2}>
                    חיפוש רקורסיבי
                  </FormLabel>
                </FormControl>
                
                <FormControl>
                  <FormLabel>עומק חיפוש:</FormLabel>
                  <Input
                    type="number"
                    value={depth}
                    onChange={(e) => setDepth(parseInt(e.target.value))}
                    max={5}
                    min={1}
                    w="80px"
                    isDisabled={!isDropboxConfigured || !recursive}
                  />
                </FormControl>
              </HStack>
              
              <Button 
                colorScheme="blue" 
                leftIcon={<SearchIcon />} 
                onClick={fetchFolderStructure}
                isLoading={isLoading}
                isDisabled={!isDropboxConfigured}
              >
                חיפוש תיקיות
              </Button>
            </VStack>
          </CardBody>
        </Card>
        
        {isLoading && (
          <Flex justify="center" py={8}>
            <Spinner size="xl" />
          </Flex>
        )}
        
        {error && !isLoading && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            <Text>{error}</Text>
          </Alert>
        )}
        
        {folderStructure && !isLoading && !error && (
          <Box>
            <Text mb={4}>
              מציג תיקיות בנתיב: <Box as="span" dir="ltr" fontWeight="bold">{folderStructure.path || '/'}</Box>
            </Text>
            
            {folderStructure.folders.length > 0 ? (
              <Accordion allowToggle>
                {folderStructure.folders.map((folder) => (
                  <FolderItem key={folder.id} folder={folder} />
                ))}
              </Accordion>
            ) : (
              <Text>לא נמצאו תיקיות בנתיב זה</Text>
            )}
          </Box>
        )}
      </VStack>
    </Container>
  );
} 