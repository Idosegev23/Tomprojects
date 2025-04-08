'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Text,
  Button,
  FormControl,
  FormLabel,
  FormHelperText,
  InputGroup,
  Input,
  VStack,
  HStack,
  Icon,
  Flex,
  Spinner,
  Badge,
  Alert,
  AlertIcon,
  IconButton,
  useToast,
} from '@chakra-ui/react';
import { FiFolder, FiUpload, FiDownload, FiTrash2, FiFile, FiRefreshCw } from 'react-icons/fi';
import { dropboxService } from '@/lib/services/dropboxService';
import { updateBuildTracking } from '@/lib/services/buildTrackingService';
import { ExtendedTask } from './constants';

interface DropboxFile {
  id: string;
  name: string;
  path: string;
  size: number;
  client_modified: string;
  server_modified: string;
}

interface DropboxTabProps {
  formData: Partial<ExtendedTask>;
  errors: Record<string, string>;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  isEditMode: boolean;
}

const DropboxTab: React.FC<DropboxTabProps> = ({ formData, errors, handleChange, isEditMode }) => {
  const [files, setFiles] = useState<DropboxFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  
  // ניסיון לקבל את נתיב התיקייה במידה ואינו קיים בפורם
  useEffect(() => {
    // אם יש כבר נתיב בפורם, נשתמש בו
    if (formData.dropbox_folder) {
      setFolderPath(formData.dropbox_folder);
      return;
    }
    
    // אם אנחנו במצב עריכה ואין נתיב תיקייה, ננסה לקבל אותו מהשרת
    if (isEditMode && formData.id) {
      const fetchTaskPath = async () => {
        setLoading(true);
        try {
          const response = await fetch(`/api/tasks/${formData.id}/get-dropbox-path`);
          if (response.ok) {
            const data = await response.json();
            if (data.dropbox_folder) {
              console.log(`Found dropbox path for task ${formData.id}: ${data.dropbox_folder}`);
              setFolderPath(data.dropbox_folder);
              // אם אנחנו לא רוצים לעדכן את הפורם, רק להציג
              // handleChange({ target: { name: 'dropbox_folder', value: data.dropbox_folder } } as any);
            } else {
              setError('לא נמצא נתיב דרופבוקס למשימה זו');
            }
          } else {
            setError('שגיאה בקבלת נתיב דרופבוקס');
          }
        } catch (err) {
          console.error('Error fetching dropbox path:', err);
          setError('שגיאה בטעינת נתיב דרופבוקס');
        } finally {
          setLoading(false);
        }
      };
      
      fetchTaskPath();
    }
  }, [formData.id, formData.dropbox_folder, isEditMode]);
  
  // עדכון רשימת הקבצים בעת שינוי תיקיית דרופבוקס
  useEffect(() => {
    const pathToUse = folderPath || formData.dropbox_folder;
    
    if (pathToUse && isEditMode) {
      fetchFiles(pathToUse);
    } else {
      setFiles([]);
      if (isEditMode && !pathToUse) {
        setError('לא מוגדרת תיקיית דרופבוקס למשימה זו');
      }
    }
  }, [folderPath, formData.dropbox_folder, isEditMode]);
  
  // פונקציה לטעינת רשימת הקבצים
  const fetchFiles = async (path: string) => {
    if (!path) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await updateBuildTracking(`טוען קבצים מתיקייה: ${path}`);
      const filesList = await dropboxService.listFiles(path);
      
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
  
  // פתיחת דיאלוג לבחירת קובץ להעלאה
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  // העלאת קובץ
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !formData.dropbox_folder) return;
    
    setUploadLoading(true);
    
    try {
      await updateBuildTracking(`מעלה קובץ: ${files[0].name}`);
      await dropboxService.uploadFile(formData.dropbox_folder, files[0]);
      
      toast({
        title: 'הקובץ הועלה בהצלחה',
        status: 'success',
        duration: 3000,
        isClosable: true,
        position: 'top-right',
      });
      
      // רענן את רשימת הקבצים
      fetchFiles(formData.dropbox_folder || '');
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
  
  // מחיקת קובץ
  const handleDeleteFile = async (file: DropboxFile) => {
    if (!window.confirm(`האם אתה בטוח שברצונך למחוק את הקובץ "${file.name}"?`)) {
      return;
    }
    
    try {
      await updateBuildTracking(`מוחק קובץ: ${file.name}`);
      await dropboxService.deleteFile(file.path);
      
      toast({
        title: 'הקובץ נמחק בהצלחה',
        status: 'success',
        duration: 3000,
        isClosable: true,
        position: 'top-right',
      });
      
      // רענון רשימת הקבצים
      fetchFiles(formData.dropbox_folder || '');
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
  
  return (
    <VStack spacing={6} align="stretch">
      <FormControl isInvalid={!!errors.dropbox_folder}>
        <FormLabel htmlFor="dropbox_folder" fontWeight="bold">תיקיית Dropbox</FormLabel>
        <InputGroup>
          <Input
            id="dropbox_folder"
            name="dropbox_folder"
            placeholder="נתיב לתיקיית Dropbox"
            value={formData.dropbox_folder || folderPath || ''}
            onChange={handleChange}
          />
        </InputGroup>
        <FormHelperText>
          נתיב לתיקיית Dropbox של המשימה. התיקייה תיווצר אוטומטית בעת יצירת המשימה.
        </FormHelperText>
      </FormControl>
      
      {isEditMode && (formData.dropbox_folder || folderPath) && (
        <Box mt={4} borderWidth="1px" borderRadius="md" p={4}>
          <Flex justifyContent="space-between" alignItems="center" mb={4}>
            <HStack>
              <Text fontSize="lg" fontWeight="bold">
                קבצים בתיקייה
              </Text>
              {files.length > 0 && (
                <Badge colorScheme="blue" fontSize="0.8em">
                  {files.length} קבצים
                </Badge>
              )}
            </HStack>
            
            <HStack>
              <Button
                leftIcon={<FiRefreshCw />}
                onClick={() => fetchFiles(formData.dropbox_folder || '')}
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
                colorScheme="blue"
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
            <Flex justify="center" align="center" p={8}>
              <Spinner size="lg" color="blue.500" />
            </Flex>
          ) : error ? (
            <Alert status="info" borderRadius="md">
              <AlertIcon />
              {error}
            </Alert>
          ) : (
            <VStack align="stretch" spacing={2} maxH="300px" overflowY="auto">
              {files.map(file => (
                <Box 
                  key={file.id}
                  p={3}
                  borderWidth="1px"
                  borderRadius="md"
                  _hover={{ bg: "gray.50" }}
                >
                  <Flex justify="space-between" align="center">
                    <HStack>
                      <Icon as={FiFile} color="blue.500" />
                      <VStack align="flex-start" spacing={0}>
                        <Text fontWeight="medium">{file.name}</Text>
                        <Text fontSize="xs" color="gray.500">
                          {formatFileSize(file.size)} | עודכן: {formatDate(file.server_modified)}
                        </Text>
                      </VStack>
                    </HStack>
                    
                    <HStack>
                      <IconButton
                        aria-label="הורד קובץ"
                        icon={<FiDownload />}
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDownload(file)}
                      />
                      <IconButton
                        aria-label="מחק קובץ"
                        icon={<FiTrash2 />}
                        size="sm"
                        variant="ghost"
                        colorScheme="red"
                        onClick={() => handleDeleteFile(file)}
                      />
                    </HStack>
                  </Flex>
                </Box>
              ))}
            </VStack>
          )}
        </Box>
      )}
      
      {!isEditMode && (
        <Alert status="info" mt={2} borderRadius="md">
          <AlertIcon />
          ניהול קבצים יהיה זמין לאחר יצירת המשימה
        </Alert>
      )}
    </VStack>
  );
};

export default DropboxTab; 