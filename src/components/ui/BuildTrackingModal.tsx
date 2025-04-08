import React, { useEffect, useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Box,
  Text,
  VStack,
  Progress,
  useToast,
  Flex,
  Badge,
  IconButton,
  HStack,
  Divider,
  Circle,
  Center,
  Heading,
  List,
  ListItem,
  ListIcon,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon
} from '@chakra-ui/react';
import { FiRefreshCw, FiFolder, FiFile, FiCheckCircle, FiAlertCircle, FiClock, FiDatabase, FiHome } from 'react-icons/fi';
import { projectService } from '@/lib/services/projectService';

interface BuildTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  title?: string;
}

interface TrackingEntry {
  message: string;
  timestamp: string;
}

interface CreatedFolder {
  path: string;
  timestamp: string;
  isComplete: boolean;
}

// סטטוסים אפשריים של התהליך
type ProcessStatus = 'waiting' | 'in_progress' | 'completed' | 'failed';

const BuildTrackingModal: React.FC<BuildTrackingModalProps> = ({
  isOpen,
  onClose,
  projectId,
  title = 'התקדמות תהליך'
}) => {
  const [entries, setEntries] = useState<TrackingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [status, setStatus] = useState<ProcessStatus>('waiting');
  const [createdFolders, setCreatedFolders] = useState<CreatedFolder[]>([]);
  const [projectName, setProjectName] = useState<string>('');
  const [mainFolderPath, setMainFolderPath] = useState<string>('');

  // מבנה נתונים שמייצג את השלבים של התהליך
  const [stages, setStages] = useState({
    projectCreation: { complete: false, inProgress: false, failed: false },
    tablesCreation: { complete: false, inProgress: false, failed: false },
    foldersCreation: { complete: false, inProgress: false, failed: false },
    taskAssignment: { complete: false, inProgress: false, failed: false },
    completion: { complete: false, inProgress: false, failed: false }
  });

  const fetchTrackingData = async () => {
    try {
      setIsLoading(true);
      const data = await projectService.getBuildTracking(projectId);
      
      if (data) {
        // הפיכת האובייקט לרשימה של הודעות עם חותמת זמן
        const trackingEntries: TrackingEntry[] = [];
        
        // רשימה למעקב אחר תיקיות שנוצרו
        const folders: CreatedFolder[] = [];
        
        // בדיקה שיש שדה logs בנתונים
        if (data.logs && Array.isArray(data.logs)) {
          // השתמש בשדה logs אם קיים
          setEntries(data.logs);
          
          // עדכון הסטטוס הכללי
          if (data.status) {
            switch (data.status) {
              case 'בתהליך':
                setStatus('in_progress');
                break;
              case 'הושלם':
                setStatus('completed');
                break;
              case 'נכשל':
                setStatus('failed');
                break;
              default:
                setStatus('waiting');
            }
          } else {
            // אם אין סטטוס מוגדר, נקבע סטטוס לפי הלוגים
            if (data.logs.length > 0) {
              setStatus('in_progress');
            }
          }
          
          // עיבוד ההודעות לעדכון השלבים
          const updatedStages = { ...stages };
          let stagesCompleted = 0;
          let stagesInProgress = 0;
          const totalStages = 5; // מספר השלבים במערכת
          
          // איפוס התקדמות
          Object.keys(updatedStages).forEach(key => {
            updatedStages[key as keyof typeof stages].inProgress = false;
          });
          
          // חיפוש מידע על תיקיות שנוצרו מתוך הלוג
          data.logs.forEach((entry: TrackingEntry) => {
            const msg = entry.message;
            const lowerMsg = msg.toLowerCase();
            
            // חילוץ נתיבי תיקיות מההודעות
            if (lowerMsg.includes('יוצר תיקייה') || lowerMsg.includes('נוצרה תיקייה') || lowerMsg.includes('תיקייה') || lowerMsg.includes('נתיב:')) {
              // חיפוש נתיב קבצים בהודעה - בדרך כלל מופיע בין גרשיים או אחרי המילה "תיקייה"
              const pathMatch = msg.match(/["""'']([^"""'']+)["""'']/) || 
                                msg.match(/תיקייה[^:]*: (.+?)(?:$|\.|\s+ב)/) ||
                                msg.match(/נתיב: (.+?)(?:$|\.)/) ||
                                msg.match(/תיקייה: (.+)$/) ||
                                msg.match(/תיקייה[^:]*: (.+)$/);
              
              if (pathMatch && pathMatch[1]) {
                const folderPath = pathMatch[1].trim();
                // בדיקה אם זו תיקיית הפרויקט הראשית
                if (!mainFolderPath && lowerMsg.includes('פרויקט')) {
                  setMainFolderPath(folderPath);
                }
                
                folders.push({
                  path: folderPath,
                  timestamp: entry.timestamp,
                  isComplete: lowerMsg.includes('בהצלחה') || lowerMsg.includes('נוצרה')
                });
              }
            }
            
            // חילוץ שם הפרויקט אם קיים בהודעות
            if (!projectName && lowerMsg.includes('פרויקט') && (lowerMsg.includes('נוצר') || lowerMsg.includes('חדש'))) {
              const nameMatch = msg.match(/פרויקט חדש: (.+?) \(/) || 
                                msg.match(/פרויקט (.+?) \(/) ||
                                msg.match(/פרויקט: (.+?)(?:$|\.|,)/);
              
              if (nameMatch && nameMatch[1]) {
                setProjectName(nameMatch[1].trim());
              }
            }
            
            // בדיקה לאיזה שלב שייכת ההודעה ועדכון ההתקדמות
            if (lowerMsg.includes('התחלת יצירת פרויקט') || lowerMsg.includes('יוצר פרויקט')) {
              updatedStages.projectCreation.inProgress = true;
              updatedStages.projectCreation.complete = false;
              stagesInProgress++;
            } else if (lowerMsg.includes('פרויקט') && (lowerMsg.includes('נוצר') || lowerMsg.includes('נוצר בהצלחה'))) {
              updatedStages.projectCreation.complete = true;
              updatedStages.projectCreation.inProgress = false;
              stagesCompleted++;
            }
            
            if (lowerMsg.includes('יוצר טבלאות')) {
              updatedStages.tablesCreation.inProgress = true;
              updatedStages.tablesCreation.complete = false;
              stagesInProgress++;
            } else if (lowerMsg.includes('טבלאות') && lowerMsg.includes('נוצרו בהצלחה')) {
              updatedStages.tablesCreation.complete = true;
              updatedStages.tablesCreation.inProgress = false;
              stagesCompleted++;
            } else if (lowerMsg.includes('שגיאה ביצירת טבלאות')) {
              updatedStages.tablesCreation.failed = true;
              updatedStages.tablesCreation.inProgress = false;
            }
            
            if (lowerMsg.includes('יוצר מבנה תיקיות') || lowerMsg.includes('יוצר תיקייה') || lowerMsg.includes('יוצר תיקיות')) {
              updatedStages.foldersCreation.inProgress = true;
              updatedStages.foldersCreation.complete = false;
              stagesInProgress++;
            } else if ((lowerMsg.includes('תיקיות') || lowerMsg.includes('מבנה') || lowerMsg.includes('תיקייה')) && 
                      (lowerMsg.includes('נוצר בהצלחה') || lowerMsg.includes('נוצרה בהצלחה'))) {
              updatedStages.foldersCreation.complete = true;
              updatedStages.foldersCreation.inProgress = false;
              stagesCompleted++;
            } else if (lowerMsg.includes('שגיאה ביצירת תיקיות')) {
              updatedStages.foldersCreation.failed = true;
              updatedStages.foldersCreation.inProgress = false;
            }
            
            if (lowerMsg.includes('משייך משימות')) {
              updatedStages.taskAssignment.inProgress = true;
              updatedStages.taskAssignment.complete = false;
              stagesInProgress++;
            } else if (lowerMsg.includes('משימות') && lowerMsg.includes('שויכו בהצלחה')) {
              updatedStages.taskAssignment.complete = true;
              updatedStages.taskAssignment.inProgress = false;
              stagesCompleted++;
            }
            
            if (lowerMsg.includes('תהליך יצירת הפרויקט הסתיים בהצלחה') || lowerMsg.includes('סיום התהליך')) {
              updatedStages.completion.complete = true;
              updatedStages.completion.inProgress = false;
              stagesCompleted++;
            } else if (lowerMsg.includes('תהליך הסתיים')) {
              updatedStages.completion.complete = true;
              updatedStages.completion.inProgress = false;
              stagesCompleted++;
            }
          });
          
          // עדכון רשימת התיקיות שנוצרו
          setCreatedFolders(folders);
          
          // חישוב אחוז ההתקדמות
          let newProgressPercentage = 0;
          
          // בדיקה אם יש שלבים שהושלמו
          if (stagesCompleted > 0) {
            newProgressPercentage = Math.round((stagesCompleted / totalStages) * 100);
          } else if (stagesInProgress > 0) {
            // אם אין שלבים שהושלמו, אבל יש שלבים בתהליך,
            // נחשב את האחוז לפי שלבים בתהליך
            newProgressPercentage = Math.max(10, Math.round((stagesInProgress / totalStages) * 30));
          }
          
          // אם יש תיקיות שנוצרו אבל האחוז עדיין נמוך, נשתמש במספר התיקיות לחישוב האחוז
          if (folders.length > 0 && newProgressPercentage < 30) {
            // נניח שבפרויקט רגיל יש בערך 10 תיקיות
            const folderProgressPercentage = Math.min(60, Math.round((folders.length / 10) * 50));
            newProgressPercentage = Math.max(newProgressPercentage, folderProgressPercentage);
          }
          
          // אם יש מעל 10 לוגים אבל האחוז עדיין נמוך, נחשב לפחות התקדמות מינימלית לפי כמות הלוגים
          if (data.logs.length > 5 && newProgressPercentage < 20) {
            const logProgressPercentage = Math.min(40, Math.round((data.logs.length / 20) * 40));
            newProgressPercentage = Math.max(newProgressPercentage, logProgressPercentage);
          }
          
          // אם ההתקדמות היא 100% אבל לא כל השלבים הושלמו, נגביל ל-99%
          if (newProgressPercentage >= 100 && stagesCompleted < totalStages) {
            newProgressPercentage = 99;
          }
          
          // אם הסטטוס הוא 'הושלם', נקבע את האחוז ל-100%
          if (status === 'completed') {
            newProgressPercentage = 100;
          }
          
          // וידוא שהאחוז תמיד בטווח תקין
          newProgressPercentage = Math.max(0, Math.min(100, newProgressPercentage));
          
          console.log(`חישוב התקדמות - שלבים: ${stagesCompleted}/${totalStages}, תיקיות: ${folders.length}, לוגים: ${data.logs.length}, אחוז: ${newProgressPercentage}%`);
          
          setProgressPercentage(newProgressPercentage);
          setStages(updatedStages);
          
        } else {
          // אחרת, צור רשימה מהשדות האחרים
          Object.entries(data).forEach(([key, value]) => {
            if (typeof value === 'string') {
              trackingEntries.push({
                message: value,
                timestamp: key
              });
            }
          });
          setEntries(trackingEntries);
          
          // חישוב התקדמות פשוט לפי מספר הודעות
          if (trackingEntries.length > 0) {
            // נניח שבתהליך רגיל יש בערך 20 הודעות 
            const simpleProgress = Math.min(100, Math.round((trackingEntries.length / 20) * 100));
            setProgressPercentage(simpleProgress);
          }
        }
      }
    } catch (error) {
      console.error('שגיאה בטעינת נתוני המעקב:', error);
      toast({
        title: 'שגיאה בטעינת נתוני מעקב',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && projectId) {
      fetchTrackingData();
      
      // הגדרת רענון אוטומטי כל 2 שניות
      const interval = setInterval(() => {
        fetchTrackingData();
      }, 2000);
      
      setRefreshInterval(interval);
    }
    
    return () => {
      // ניקוי האינטרוול בעת סגירת המודל
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [isOpen, projectId]);

  const handleRefresh = () => {
    fetchTrackingData();
  };

  // פונקציה עזר לקבלת צבע לפי סטטוס
  const getStatusColorScheme = () => {
    switch (status) {
      case 'completed':
        return 'green';
      case 'in_progress':
        return 'blue';
      case 'failed':
        return 'red';
      default:
        return 'gray';
    }
  };

  // פונקציה עזר לקבלת שם סטטוס בעברית
  const getStatusText = () => {
    switch (status) {
      case 'completed':
        return 'הושלם';
      case 'in_progress':
        return 'בתהליך';
      case 'failed':
        return 'נכשל';
      default:
        return 'ממתין';
    }
  };

  // קבלת האייקון המתאים לכל שלב
  const getStageIcon = (stage: keyof typeof stages) => {
    if (stages[stage].failed) return <FiAlertCircle color="red" />;
    if (stages[stage].complete) return <FiCheckCircle color="green" />;
    if (stages[stage].inProgress) return <FiClock color="blue" />;
    return <FiClock color="gray" />;
  };

  // שם לכל שלב בתהליך
  const getStageName = (stage: keyof typeof stages) => {
    switch (stage) {
      case 'projectCreation':
        return 'יצירת פרויקט בסיסי';
      case 'tablesCreation':
        return 'יצירת טבלאות נתונים';
      case 'foldersCreation':
        return 'יצירת תיקיות בדרופבוקס';
      case 'taskAssignment':
        return 'שיוך משימות לפרויקט';
      case 'completion':
        return 'השלמת התהליך';
      default:
        return '';
    }
  };

  // פונקציה עזר להצגת נתיב קצר יותר
  const getShortPath = (path: string) => {
    if (!path) return '';
    // הצגת שני הרכיבים האחרונים של הנתיב אם הוא ארוך
    const parts = path.split('/');
    if (parts.length <= 3) return path;
    
    return `.../${parts.slice(-2).join('/')}`;
  };

  // פונקציה לחילוץ שם התיקייה מתוך נתיב מלא
  const getFolderName = (path: string) => {
    if (!path) return '';
    const parts = path.split('/');
    return parts[parts.length - 1];
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered>
      <ModalOverlay backdropFilter="blur(2px)" />
      <ModalContent borderRadius="xl" boxShadow="xl">
        <ModalHeader bg={`${getStatusColorScheme()}.50`} borderTopRadius="xl" p={4}>
          <Flex justify="space-between" align="center">
            <Heading size="md">{title}</Heading>
            <HStack>
              <Badge 
                colorScheme={getStatusColorScheme()} 
                fontSize="md" 
                px={3} 
                py={1} 
                borderRadius="full"
              >
                {getStatusText()}
              </Badge>
              <IconButton
                aria-label="רענון נתונים"
                icon={<FiRefreshCw />}
                size="sm"
                onClick={handleRefresh}
                isLoading={isLoading}
                colorScheme={getStatusColorScheme()}
                variant="ghost"
              />
            </HStack>
          </Flex>
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody p={5}>
          {/* בר התקדמות */}
          <Box mb={6} mt={2}>
            <Flex justify="space-between" mb={1}>
              <Text fontWeight="bold">התקדמות התהליך</Text>
              <Text fontWeight="bold">{progressPercentage}%</Text>
            </Flex>
            <Progress 
              value={progressPercentage} 
              size="lg" 
              colorScheme={getStatusColorScheme()} 
              borderRadius="md"
              hasStripe={status === 'in_progress'}
              isAnimated={status === 'in_progress'}
            />
          </Box>

          {/* סיכום התהליך */}
          <Box 
            mb={4} 
            p={4} 
            borderWidth="1px" 
            borderRadius="lg" 
            borderColor={`${getStatusColorScheme()}.200`}
            bg={`${getStatusColorScheme()}.50`}
          >
            <Heading size="sm" mb={3}>שלבי התהליך</Heading>
            <List spacing={3}>
              {Object.keys(stages).map((stage) => (
                <ListItem key={stage}>
                  <Flex align="center">
                    <Box mr={3}>
                      {getStageIcon(stage as keyof typeof stages)}
                    </Box>
                    <Text fontWeight={stages[stage as keyof typeof stages].inProgress ? "bold" : "normal"}>
                      {getStageName(stage as keyof typeof stages)}
                    </Text>
                    <Box ml="auto">
                      {stages[stage as keyof typeof stages].complete && (
                        <Badge colorScheme="green">הושלם</Badge>
                      )}
                      {stages[stage as keyof typeof stages].inProgress && (
                        <Badge colorScheme="blue">בתהליך</Badge>
                      )}
                      {stages[stage as keyof typeof stages].failed && (
                        <Badge colorScheme="red">נכשל</Badge>
                      )}
                    </Box>
                  </Flex>
                </ListItem>
              ))}
            </List>
          </Box>

          {/* תצוגת תיקיות שנוצרו */}
          {createdFolders.length > 0 && (
            <Box mb={4}>
              <Accordion allowToggle defaultIndex={[0]}>
                <AccordionItem 
                  border="1px solid"
                  borderColor="blue.200"
                  borderRadius="md"
                  mb={4}
                >
                  <h2>
                    <AccordionButton bg="blue.50" _expanded={{ bg: 'blue.100' }} borderRadius="md">
                      <Box flex="1" textAlign="right">
                        <HStack>
                          <FiFolder color="blue" />
                          <Text fontWeight="bold">תיקיות שנוצרו בדרופבוקס</Text>
                        </HStack>
                      </Box>
                      <AccordionIcon />
                    </AccordionButton>
                  </h2>
                  <AccordionPanel pb={4} maxH="200px" overflowY="auto">
                    {mainFolderPath && (
                      <Box mb={3} p={2} bg="blue.50" borderRadius="md">
                        <Flex align="center">
                          <FiHome color="blue" />
                          <Text ml={2} fontWeight="bold">
                            תיקיית פרויקט ראשית: {mainFolderPath}
                          </Text>
                        </Flex>
                      </Box>
                    )}
                    
                    <List spacing={2}>
                      {createdFolders.map((folder, index) => (
                        <ListItem key={index}>
                          <Flex p={2} borderWidth="1px" borderRadius="md" bg={folder.isComplete ? "green.50" : "yellow.50"}>
                            <Box mr={2}>
                              <FiFolder color={folder.isComplete ? "green" : "orange"} />
                            </Box>
                            <Box flex="1">
                              <Text fontWeight="bold">
                                {getFolderName(folder.path)}
                              </Text>
                              <Text fontSize="sm" color="gray.600">
                                {folder.path}
                              </Text>
                            </Box>
                            <Badge colorScheme={folder.isComplete ? "green" : "yellow"} ml={2}>
                              {folder.isComplete ? "נוצרה" : "בתהליך יצירה"}
                            </Badge>
                          </Flex>
                        </ListItem>
                      ))}
                    </List>
                  </AccordionPanel>
                </AccordionItem>
              </Accordion>
            </Box>
          )}

          <Divider my={4} />
          
          {/* לוג הפעולות */}
          <Heading size="sm" mb={3}>לוג פעולות</Heading>
          <VStack spacing={3} align="stretch" maxH="250px" overflowY="auto" pr={2}>
            {entries.length > 0 ? (
              entries.map((entry, index) => {
                const isError = entry.message.toLowerCase().includes('שגיאה');
                const isSuccess = entry.message.toLowerCase().includes('בהצלחה');
                const isFolder = entry.message.toLowerCase().includes('תיקי');
                
                let icon = <Box w={5} />;
                if (isError) icon = <FiAlertCircle color="red" />;
                else if (isSuccess) icon = <FiCheckCircle color="green" />;
                else if (isFolder) icon = <FiFolder color="blue" />;
                else if (entry.message.toLowerCase().includes('טבל')) icon = <FiDatabase color="purple" />;
                
                return (
                  <Box 
                    key={index} 
                    p={3} 
                    borderWidth="1px" 
                    borderRadius="md" 
                    boxShadow="sm"
                    bg={isError ? "red.50" : isSuccess ? "green.50" : isFolder ? "blue.50" : index === entries.length - 1 ? "blue.50" : "white"}
                    borderColor={isError ? "red.200" : isSuccess ? "green.200" : "gray.200"}
                  >
                    <Flex align="center">
                      <Box mr={3}>
                        {icon}
                      </Box>
                      <Box flex="1">
                        <Text fontWeight={isError || isSuccess || isFolder ? "bold" : "normal"}>{entry.message}</Text>
                      </Box>
                      <Badge colorScheme={isError ? "red" : isSuccess ? "green" : "blue"} fontSize="xs" ml={2}>
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </Badge>
                    </Flex>
                  </Box>
                );
              })
            ) : (
              <Box p={4} textAlign="center" color="gray.500">
                <Text>אין נתוני מעקב זמינים</Text>
              </Box>
            )}
          </VStack>
        </ModalBody>
        
        <ModalFooter bg="gray.50" borderBottomRadius="xl">
          <Button 
            colorScheme={getStatusColorScheme()} 
            onClick={onClose}
            size="md"
            width="150px"
          >
            {status === 'completed' ? 'סגור וסיים' : 'סגור'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default BuildTrackingModal; 