'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Text,
  Flex,
  Button,
  IconButton,
  Input,
  VStack,
  HStack,
  Spinner,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useToast,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Badge,
  useDisclosure,
} from '@chakra-ui/react';
import { 
  FiUpload, 
  FiDownload, 
  FiTrash2, 
  FiFile, 
  FiClock,
  FiRefreshCw,
  FiAlertTriangle,
  FiFolder
} from 'react-icons/fi';
import { dropboxService } from '@/lib/services/dropboxService';
import { updateBuildTracking } from '@/lib/services/buildTrackingService';

interface DropboxFile {
  id: string;
  name: string;
  path: string;
  size: number;
  client_modified: string;
  server_modified: string;
}

interface FileVersion {
  id: string;
  rev: string;
  size: number;
  modified: string;
  path: string;
  name: string;
}

interface DropboxFilesTabProps {
  folderPath: string | null | undefined;
}

export default function DropboxFilesTab({ folderPath }: DropboxFilesTabProps) {
  const [files, setFiles] = useState<DropboxFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<DropboxFile | null>(null);
  const [fileVersions, setFileVersions] = useState<FileVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  
  const { 
    isOpen: isDeleteOpen, 
    onOpen: onDeleteOpen, 
    onClose: onDeleteClose 
  } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);
  
  // עדכון רשימת הקבצים בעת שינוי התיקייה
  useEffect(() => {
    if (folderPath) {
      fetchFiles();
    } else {
      setFiles([]);
      setError('לא סופק נתיב תיקייה');
    }
  }, [folderPath]);
  
  // פונקציה לטעינת רשימת הקבצים
  const fetchFiles = async () => {
    if (!folderPath) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await updateBuildTracking(`טוען קבצים מתיקייה: ${folderPath}`);
      const filesList = await dropboxService.listFiles(folderPath);
      
      // מיון הקבצים לפי תאריך עדכון (חדש ביותר ראשון)
      const sortedFiles = filesList.sort((a, b) => {
        const dateA = new Date(a.server_modified).getTime();
        const dateB = new Date(b.server_modified).getTime();
        return dateB - dateA;
      });
      
      setFiles(sortedFiles);
      
      if (sortedFiles.length === 0) {
        setError('אין קבצים בתיקייה זו');
      }
    } catch (err) {
      console.error('שגיאה בטעינת קבצים:', err);
      setError('אירעה שגיאה בטעינת רשימת הקבצים');
      toast({
        title: 'שגיאה בטעינת קבצים',
        description: err instanceof Error ? err.message : 'אירעה שגיאה בטעינת הקבצים',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top-right',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // פונקציה לטעינת גרסאות של קובץ
  const fetchFileVersions = async (file: DropboxFile) => {
    setSelectedFile(file);
    setLoading(true);
    
    try {
      await updateBuildTracking(`טוען גרסאות של קובץ: ${file.name}`);
      const versions = await dropboxService.getFileVersions(file.path);
      setFileVersions(versions);
    } catch (err) {
      console.error('שגיאה בטעינת גרסאות הקובץ:', err);
      toast({
        title: 'שגיאה בטעינת גרסאות',
        description: err instanceof Error ? err.message : 'אירעה שגיאה בטעינת גרסאות הקובץ',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top-right',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // פתיחת דיאלוג לבחירת קובץ להעלאה
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  // העלאת קובץ
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !folderPath) return;
    
    setUploadLoading(true);
    
    try {
      await updateBuildTracking(`מעלה קובץ: ${files[0].name}`);
      await dropboxService.uploadFile(folderPath, files[0]);
      
      toast({
        title: 'הקובץ הועלה בהצלחה',
        status: 'success',
        duration: 3000,
        isClosable: true,
        position: 'top-right',
      });
      
      // רענן את רשימת הקבצים
      fetchFiles();
    } catch (err) {
      console.error('שגיאה בהעלאת קובץ:', err);
      toast({
        title: 'שגיאה בהעלאת קובץ',
        description: err instanceof Error ? err.message : 'אירעה שגיאה בהעלאת הקובץ',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top-right',
      });
    } finally {
      setUploadLoading(false);
      // איפוס שדה הקובץ
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  // הורדת קובץ
  const handleDownload = async (file: DropboxFile) => {
    try {
      await updateBuildTracking(`מוריד קובץ: ${file.name}`);
      const result = await dropboxService.downloadFile(file.path);
      
      // יצירת קישור להורדה
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      toast({
        title: 'הקובץ הורד בהצלחה',
        status: 'success',
        duration: 3000,
        isClosable: true,
        position: 'top-right',
      });
    } catch (err) {
      console.error('שגיאה בהורדת קובץ:', err);
      toast({
        title: 'שגיאה בהורדת קובץ',
        description: err instanceof Error ? err.message : 'אירעה שגיאה בהורדת הקובץ',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top-right',
      });
    }
  };
  
  // הורדת גרסה של קובץ
  const handleDownloadVersion = async (version: FileVersion) => {
    try {
      await updateBuildTracking(`מוריד גרסה קודמת של קובץ: ${version.name}`);
      const result = await dropboxService.downloadFile(version.path);
      
      // יצירת קישור להורדה
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = version.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      toast({
        title: 'גרסת הקובץ הורדה בהצלחה',
        status: 'success',
        duration: 3000,
        isClosable: true,
        position: 'top-right',
      });
    } catch (err) {
      console.error('שגיאה בהורדת גרסת קובץ:', err);
      toast({
        title: 'שגיאה בהורדת גרסת קובץ',
        description: err instanceof Error ? err.message : 'אירעה שגיאה בהורדת גרסת הקובץ',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top-right',
      });
    }
  };
  
  // הצגת חלון אישור למחיקה
  const confirmDelete = (file: DropboxFile) => {
    setSelectedFile(file);
    onDeleteOpen();
  };
  
  // מחיקת קובץ
  const handleDeleteFile = async () => {
    if (!selectedFile) return;
    
    try {
      await updateBuildTracking(`מוחק קובץ: ${selectedFile.name}`);
      await dropboxService.deleteFile(selectedFile.path);
      
      toast({
        title: 'הקובץ נמחק בהצלחה',
        status: 'success',
        duration: 3000,
        isClosable: true,
        position: 'top-right',
      });
      
      // רענון רשימת הקבצים
      fetchFiles();
    } catch (err) {
      console.error('שגיאה במחיקת קובץ:', err);
      toast({
        title: 'שגיאה במחיקת קובץ',
        description: err instanceof Error ? err.message : 'אירעה שגיאה במחיקת הקובץ',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top-right',
      });
    } finally {
      onDeleteClose();
    }
  };
  
  // פורמט גודל קובץ
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // פורמט תאריך
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('he-IL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return 'תאריך לא תקין';
    }
  };
  
  if (!folderPath) {
    return (
      <Box p={4} borderWidth="1px" borderRadius="md" bg="white">
        <Flex justifyContent="center" alignItems="center" direction="column" minH="200px" gap={4}>
          <FiFolder size={48} color="gray" />
          <Text textAlign="center" color="gray.500">
            לא הוגדרה תיקיית דרופבוקס למשימה זו
          </Text>
        </Flex>
      </Box>
    );
  }
  
  return (
    <Box p={4} borderWidth="1px" borderRadius="md" bg="white">
      <Tabs>
        <TabList>
          <Tab>קבצים</Tab>
          <Tab isDisabled={!selectedFile}>גרסאות</Tab>
        </TabList>
        
        <TabPanels>
          {/* טאב קבצים */}
          <TabPanel p={0} pt={4}>
            <Flex justifyContent="space-between" alignItems="center" mb={4}>
              <HStack>
                <Text fontSize="lg" fontWeight="bold">
                  קבצים בתיקייה
                </Text>
                <Badge colorScheme="blue" fontSize="0.8em">
                  {files.length} קבצים
                </Badge>
              </HStack>
              
              <HStack>
                <Button
                  leftIcon={<FiRefreshCw />}
                  onClick={fetchFiles}
                  isLoading={loading}
                  variant="outline"
                  size="sm"
                >
                  רענן
                </Button>
                
                <Button
                  leftIcon={<FiUpload />}
                  onClick={handleUploadClick}
                  isLoading={uploadLoading}
                  colorScheme="primary"
                  size="sm"
                >
                  העלאת קובץ
                </Button>
                <Input
                  type="file"
                  hidden
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                />
              </HStack>
            </Flex>
            
            {loading ? (
              <Flex justify="center" align="center" minH="200px">
                <Spinner size="xl" color="primary.500" thickness="4px" />
              </Flex>
            ) : error ? (
              <Flex justify="center" align="center" direction="column" minH="200px" gap={4}>
                <FiAlertTriangle size={48} color="orange" />
                <Text textAlign="center" color="gray.500">
                  {error}
                </Text>
              </Flex>
            ) : (
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>שם קובץ</Th>
                    <Th>גודל</Th>
                    <Th>עודכן</Th>
                    <Th>פעולות</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {files.map((file) => (
                    <Tr key={file.id}>
                      <Td>
                        <HStack>
                          <FiFile />
                          <Text>{file.name}</Text>
                        </HStack>
                      </Td>
                      <Td>{formatFileSize(file.size)}</Td>
                      <Td>{formatDate(file.server_modified)}</Td>
                      <Td>
                        <HStack spacing={2}>
                          <IconButton
                            aria-label="הורד קובץ"
                            icon={<FiDownload />}
                            size="sm"
                            onClick={() => handleDownload(file)}
                          />
                          <IconButton
                            aria-label="מחק קובץ"
                            icon={<FiTrash2 />}
                            size="sm"
                            colorScheme="red"
                            onClick={() => confirmDelete(file)}
                          />
                          <IconButton
                            aria-label="הצג גרסאות"
                            icon={<FiClock />}
                            size="sm"
                            onClick={() => fetchFileVersions(file)}
                          />
                        </HStack>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </TabPanel>
          
          {/* טאב גרסאות */}
          <TabPanel p={0} pt={4}>
            {selectedFile && (
              <>
                <Flex justifyContent="space-between" alignItems="center" mb={4}>
                  <HStack>
                    <Text fontSize="lg" fontWeight="bold">
                      גרסאות של {selectedFile.name}
                    </Text>
                    <Badge colorScheme="blue" fontSize="0.8em">
                      {fileVersions.length} גרסאות
                    </Badge>
                  </HStack>
                </Flex>
                
                {loading ? (
                  <Flex justify="center" align="center" minH="200px">
                    <Spinner size="xl" color="primary.500" thickness="4px" />
                  </Flex>
                ) : (
                  <Table variant="simple">
                    <Thead>
                      <Tr>
                        <Th>מזהה גרסה</Th>
                        <Th>גודל</Th>
                        <Th>תאריך עדכון</Th>
                        <Th>פעולות</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {fileVersions.map((version, index) => (
                        <Tr key={version.rev}>
                          <Td>
                            <HStack>
                              <Text>{version.rev.substring(0, 8)}</Text>
                              {index === 0 && (
                                <Badge colorScheme="green">נוכחי</Badge>
                              )}
                            </HStack>
                          </Td>
                          <Td>{formatFileSize(version.size)}</Td>
                          <Td>{formatDate(version.modified)}</Td>
                          <Td>
                            <IconButton
                              aria-label="הורד גרסה"
                              icon={<FiDownload />}
                              size="sm"
                              onClick={() => handleDownloadVersion(version)}
                            />
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                )}
              </>
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>
      
      {/* דיאלוג אישור מחיקה */}
      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteClose}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent mx={{ base: 4, md: 0 }}>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              מחיקת קובץ
            </AlertDialogHeader>
            
            <AlertDialogBody>
              האם אתה בטוח שברצונך למחוק את הקובץ &quot;{selectedFile?.name}&quot;?
              <Text mt={2} color="red.500">
                פעולה זו אינה ניתנת לביטול.
              </Text>
            </AlertDialogBody>
            
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteClose}>
                ביטול
              </Button>
              <Button colorScheme="red" onClick={handleDeleteFile} mr={3}>
                מחק
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
} 