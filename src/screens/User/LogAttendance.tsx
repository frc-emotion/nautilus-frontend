import React, { useEffect, useState } from 'react';
import { ScrollView, Linking, RefreshControl, Platform } from 'react-native';
import { View } from '@/components/ui/view';
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { useGlobalToast } from '@/src/utils/UI/CustomToastProvider';
import { APP_UUID, QueuedRequest, Beacon, MeetingObject } from '@/src/Constants';
import { AxiosError, AxiosResponse } from 'axios';
import { useAuth } from '@/src/utils/Context/AuthContext';
import { useBLE } from '@/src/utils/BLE/BLEContext';
import { useMeetings } from '@/src/utils/Context/MeetingContext';
import { useUsers } from '@/src/utils/Context/UsersContext';
import { BluetoothStatusIndicator, handleErrorWithModalOrToast, LocationStatusIndicator } from '@/src/utils/Helpers';
import { Text } from "@/components/ui/text";
import { VStack } from '@/components/ui/vstack';
import { Button, ButtonText } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Card } from '@/components/ui/card';
import { useTheme } from '@/src/utils/UI/CustomThemeProvider';
import { HStack } from '@/components/ui/hstack';
import { useLocation } from '@/src/utils/Context/LocationContext';
import { useNetworking } from '@/src/utils/Context/NetworkingContext';
import * as Sentry from '@sentry/react-native';
import PermissionStatusPopup from '@/src/components/PermissionStatusPopup';
import { Pressable } from '@/components/ui/pressable';
import {
  Radio,
  RadioGroup,
  RadioIndicator,
  RadioLabel,
  RadioIcon,
} from "@/components/ui/radio"
import { ChevronDownIcon, ChevronUpIcon, CircleIcon } from "@/components/ui/icon"
import { Accordion, AccordionItem, AccordionHeader, AccordionTrigger, AccordionTitleText, AccordionIcon, AccordionContent } from '@/components/ui/accordion';
import { Divider } from '@/components/ui/divider';
import { LinearGradient } from 'expo-linear-gradient';
import { Input, InputField } from '@/components/ui/input';

const DEBUG_PREFIX = '[LogAttendance]';

const LogAttendance: React.FC = () => {
  //BLE + other states
  const {
    bluetoothState,
    detectedBeacons,
    isListening,
    isBroadcasting,
    startBroadcasting,
    stopBroadcasting, 
    startListening,
    stopListening,
    fetchInitialBluetoothState
  } = useBLE();

  //LogAttendance.tsx states
  const { locationStatus, checkLocationServices } = useLocation();
  const { handleRequest, isConnected } = useNetworking();
  const { meetings, fetchMeetings, isLoadingMeetings, getChildMeeting } = useMeetings();
  const { users, isLoading: isUsersLoading } = useUsers();
  const { openToast } = useGlobalToast();
  const { user } = useAuth();
  const { theme } = useTheme();

  const isLead = ['leadership', 'executive', 'admin', 'advisor'].includes(user?.role ?? '');

  const [isListeningLoading, setIsListeningLoading] = useState<boolean>(false);
  const [selectedBeacon, setSelectedBeacon] = useState<Beacon | null>(null);
  const [selectedMeetingToLog, setSelectedMeetingToLog] = useState<MeetingObject | null>(null);
  const [loggingBeacons, setLoggingBeacons] = useState<string[]>([]);
  const [listeningType, setType] = useState<number>(0);

  //BroadcastAttendancePortal.tsx states
  const [isBroadcastingLoading, setIsBroadcastingLoading] = useState<boolean>(false);
  const [validMeetings, setValidMeetings] = useState<MeetingObject[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filteredMeetings, setFilteredMeetings] = useState<MeetingObject[]>([]);
  const [selectedMeetingToBroadcast, setSelectedMeetingToBroadcast] = useState<MeetingObject | null>(null);
  const [broadcastingType, setBroadcastingType] = useState<number>(2); // 0: Low, 1: Balanced, 2: High
  const [broadcastMeetingMode, setBroadcastMeetingMode] = useState<'full' | 'half'>('full');

  //Shared states
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isPopupVisible, setIsPopupVisible] = useState<boolean>(false);

  

  const log = (...args: any[]) => {
    console.log(`[${new Date().toISOString()}] ${DEBUG_PREFIX}`, ...args);
  };

  const handleLocationPermissions = async (): Promise<boolean> => {
    if (locationStatus !== 'enabled') {
      openToast({
        title: 'Location Services Required',
        description: 'Please enable location services to use attendance features.',
        type: 'error',
      });

      setTimeout(() => Linking.openSettings(), 2000);
      return false;
    }
    return true;
  };

  const handleBluetoothPermissions = async (): Promise<boolean> => {
    if (bluetoothState === 'unauthorized') {
      openToast({
        title: 'Bluetooth Unauthorized',
        description: 'Please allow Bluetooth access to use attendance features.',
        type: 'error',
      });

      setTimeout(() => Linking.openSettings(), 2000);
      return false;
    }
    return true;
  };

  //Logging attendance logic

  const toggleListening = async () => {
    const hasLocation = await handleLocationPermissions();
    const hasBluetooth = await handleBluetoothPermissions();

    if (!hasLocation || !hasBluetooth) return;

    setIsListeningLoading(true);
    log('Toggling listening', { isListening });

    try {
      if (isListening) {
        log('Attempting to stop listening');
        await stopListening();
      } else {
        log('Attempting to start listening, listening type:', listeningType);
        await startListening(listeningType);
      }
    } catch (error: any) {
      Sentry.captureException(error);
      log('Error toggling listening', error);
      openToast({
        title: 'Error',
        description: 'Failed to toggle listening.',
        type: 'error',
      });
    } finally {
      setIsListeningLoading(false);
      log('Toggle listening completed');
    }
  };

  const initiateLogAttendance = async (beacon: Beacon) => {
    if (!user?.token) {
      openToast({
        title: 'Error',
        description: 'User not authenticated.',
        type: 'error',
      });
      return;
    }

    const beaconId = `${beacon.uuid}-${beacon.major}-${beacon.minor}`;
    setLoggingBeacons(prev => [...prev, beaconId]);

    try {
      const meetingId = beacon.major;
      let cachedMeeting = meetings.find(m => m._id === meetingId);

      // If not in cache and online, fetch meeting details
      if (!cachedMeeting && isConnected) {
        cachedMeeting = await fetchMeetingDetails(meetingId);
      }

      setSelectedBeacon(beacon);
      setSelectedMeetingToLog(cachedMeeting || null);
    } catch (error) {
      Sentry.captureException(error);
      console.error('Error during attendance logging preparation:', error);
      openToast({
        title: 'Error',
        description: 'An unexpected error occurred while preparing attendance logging.',
        type: 'error',
      });
    } finally {
      setLoggingBeacons(prev => prev.filter(id => id !== beaconId));
    }
  };

  const confirmLogAttendance = async () => {
    if (!selectedBeacon) return;

    if (!user?.token) {
      openToast({
        title: 'Error',
        description: 'User not authenticated.',
        type: 'error',
      });
      setSelectedBeacon(null);
      setSelectedMeetingToLog(null);
      return;
    }

    const beacon = selectedBeacon;
    const cachedMeeting = selectedMeetingToLog;

    const payload = {
      meeting_id: beacon.major,
      lead_id: beacon.minor,
      time_received: Math.floor(Date.now() / 1000),
      flag: false,
    };

    const request: QueuedRequest = {
      url: '/api/attendance/log',
      method: 'post',
      data: payload,
      retryCount: 3,
      successHandler: async () => {
        openToast({
          title: 'Success',
          description: `Attendance logged for ${cachedMeeting ? `Meeting "${cachedMeeting.title}"` : `Meeting ID: ${beacon.major}`}.`,
          type: 'success',
        });
      },
      errorHandler: async (error: AxiosError): Promise<void> => {
        handleErrorWithModalOrToast({
          actionName: 'Log Attendance',
          error,
          showModal: false,
          showToast: true,
          openModal: () => { },
          openToast,
        });
      },
      offlineHandler: async () => {
        openToast({
          title: 'Offline',
          description: `Attendance request for ${cachedMeeting ? `Meeting "${cachedMeeting.title}"` : `Meeting ID: ${beacon.major}`} saved. It will be processed when you're back online.`,
          type: 'info',
        });
      },
    };

    try {
      await handleRequest(request);
    } catch (error) {
      Sentry.captureException(error);
      console.error('Error during attendance logging:', error);
      openToast({
        title: 'Error',
        description: 'Failed to log attendance.',
        type: 'error',
      });
    } finally {
      setSelectedBeacon(null);
      setSelectedMeetingToLog(null);
    }
  };

  const fetchMeetingDetails = async (meetingId: number): Promise<MeetingObject | undefined> => {
    let fetchedMeeting: MeetingObject | undefined = undefined;

    const request: QueuedRequest = {
      url: `/api/meetings/${meetingId}/info`,
      method: 'get',
      retryCount: 0,
      successHandler: async (response: AxiosResponse) => {
        fetchedMeeting = response.data.data.meeting as MeetingObject;
        await fetchMeetings();
      },
      errorHandler: async (error: AxiosError): Promise<void> => {
        handleErrorWithModalOrToast({
          actionName: 'Fetch Meeting Details',
          error,
          showModal: false,
          showToast: true,
          openModal: () => { },
          openToast,
        });
      },
      offlineHandler: async (): Promise<void> => {
        openToast({
          title: 'Offline',
          description: 'Cannot fetch meeting details while offline.',
          type: 'info',
        });
      },
    };

    try {
      await handleRequest(request);
    } catch (error) {
      Sentry.captureException(error);
      console.error('Error fetching meeting details:', error);
    }

    return fetchedMeeting;
  };

  const getMeetingTitle = (meetingId: number): string => {
    const meeting = meetings.find(m => m._id === meetingId);
    return meeting ? meeting.title : `Meeting ID: ${meetingId}`;
  };

  const getUserName = (userId: number): string => {
    const u = users.find(u => u._id === userId);
    return u ? `${u.first_name} ${u.last_name}` : `Lead ID: ${userId}`;
  };

  const formatDateTime = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMeetings();
    await checkLocationServices();
    await fetchInitialBluetoothState();
    setRefreshing(false);
  };

  const toggleBroadcasting = async () => {
      console.log(`${DEBUG_PREFIX} Toggling broadcasting`, { isBroadcasting, selectedMeetingToBroadcast });
      if (!isBroadcasting && !selectedMeetingToBroadcast) {
        openToast({
          title: 'No Meeting Selected',
          description: 'Please select a meeting to broadcast.',
          type: 'error',
        });
        return;
      }
  
      setIsBroadcastingLoading(true);
      try {
        if (isBroadcasting) {
          console.log(`${DEBUG_PREFIX} Attempting to stop broadcasting`);
          await stopBroadcasting();
        } else {
          // Determine which meeting ID to broadcast based on mode:
          let meetingIdToBroadcast = selectedMeetingToBroadcast!._id;
          if (broadcastMeetingMode === 'half') {
            const halfMeeting = getChildMeeting(selectedMeetingToBroadcast!._id);
            if (!halfMeeting) {
              openToast({
                title: 'Half Meeting Not Available',
                description: 'There is no half meeting available for this meeting.',
                type: 'error',
              });
              setIsBroadcastingLoading(false);
              return;
            }
            meetingIdToBroadcast = halfMeeting._id;
          }
    
              const hasLocation = await handleLocationPermissions();
              const hasBluetooth = await handleBluetoothPermissions();
              if (!hasLocation || !hasBluetooth) {
                setIsBroadcastingLoading(false);
                return;
              }
              if (bluetoothState !== 'poweredOn') {
                openToast({
                  title: 'Bluetooth Required',
                  description: 'Please enable Bluetooth to start broadcasting.',
                  type: 'error',
                });
                Linking.openSettings();
                setIsBroadcastingLoading(false);
                return;
              }
              const majorValue = Number(meetingIdToBroadcast);
              const minorValue = Number(user?._id);
              console.log(`${DEBUG_PREFIX} Starting broadcasting`, { APP_UUID, majorValue, minorValue, meetingTitle: selectedMeetingToBroadcast!.title });
              // Use existing broadcasting strength radio group values for power mode
              // (Assuming broadcastingType is already handled in the radio group below)
              // For this example, we simply use fixed values:
              // Full broadcasting uses mode 2, high power (for example)
              // Half broadcasting uses mode 0, low power (for example)
              if (broadcastMeetingMode === 'full') {
                await startBroadcasting(APP_UUID, majorValue, minorValue, selectedMeetingToBroadcast!.title, 2, 3);
              } else {
                await startBroadcasting(APP_UUID, majorValue, minorValue, selectedMeetingToBroadcast!.title, 0, 1);
              }
          }
        } catch (error: any) {
          Sentry.captureException(error);
          console.error(`${DEBUG_PREFIX} Error toggling broadcasting`, error);
          openToast({
            title: 'Broadcast Error',
            description: error.message || 'An unknown error occurred.',
            type: 'error',
          });
        } finally {
          setIsBroadcastingLoading(false);
          console.log(`${DEBUG_PREFIX} Broadcasting toggle completed, loading state set to false`);
        }
    };

    //Effects
  useEffect(() => {
    fetchMeetings();
  }, []);

  useEffect(() => {
    const currentTime = Math.floor(Date.now() / 1000);
    const eligibleMeetings = meetings.filter(
      (meeting) => currentTime >= meeting.time_start && currentTime <= meeting.time_end
    );
    const mainMeetings = eligibleMeetings.filter((meeting) => !meeting.parent);
    setValidMeetings(mainMeetings);
  }, [meetings]);

  useEffect(() => {
    if (!searchQuery) {
      setFilteredMeetings(validMeetings);
      return;
    }
    const filtered = validMeetings.filter((meeting) =>
      meeting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meeting.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meeting.location.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredMeetings(filtered);
  }, [searchQuery, validMeetings]);

  if (isLoadingMeetings || isUsersLoading) {
    return (
      <VStack space="lg" className="p-6 flex-1 justify-center items-center bg-background-0">
        <Spinner />
        <Text className="mt-2">Loading...</Text>
      </VStack>
    );
  }

  const openPermissionPopup = () => {
    setIsPopupVisible(true);
  };

  const closePermissionPopup = () => {
    setIsPopupVisible(false);
  };

  return (
    <ScrollView
      className="bg-background-0"
      contentContainerStyle={{ flexGrow: 1, padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <VStack space="xl" className="flex-1">
        {/* 1. Settings card*/}
        <View className="bg-background-0 rounded-2xl shadow-lg border border-outline-100 overflow-hidden">
          <LinearGradient
            colors={theme === 'light' ? ['#F9FAFB', '#F3F4F6'] : ['#1E1E1E', '#171717']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            <VStack space="md" className="p-5">
              <Text className="text-xs font-medium text-typography-600 uppercase tracking-wide">
                System Status
              </Text>
              
              <VStack space="sm" className="mt-2">
                <Pressable onPress={openPermissionPopup}>
                  <BluetoothStatusIndicator state={bluetoothState} />
                </Pressable>
                <Pressable onPress={openPermissionPopup}>
                  <LocationStatusIndicator state={locationStatus} />
                </Pressable>
              </VStack>

              {(bluetoothState === 'unknown' || locationStatus === 'unknown' || bluetoothState === 'unauthorized' || locationStatus === 'unauthorized') && (
                <Button
                  onPress={() => Linking.openSettings()}
                  className="mt-2 px-6 py-2 rounded-lg bg-teamYellow-500"
                >
                  <ButtonText className="font-bold text-center" style={{ color: '#333333' }}>
                    Open Settings
                  </ButtonText>
                </Button>
              )}

              {Platform.OS === 'android' && (
                <Accordion size="md" variant="unfilled" type="single" isCollapsible={true} className="mt-2">
                  <AccordionItem value="settings">
                    <AccordionHeader>
                      <AccordionTrigger>
                        {({ isExpanded }) => (
                          <>
                            <AccordionTitleText className="text-sm">Advanced Settings</AccordionTitleText>
                            <AccordionIcon as={isExpanded ? ChevronUpIcon : ChevronDownIcon} />
                          </>
                        )}
                      </AccordionTrigger>
                    </AccordionHeader>
                    <AccordionContent>
                      <VStack space="md">
                        <VStack space="xs">
                          <Text size="sm" className="font-semibold">Listening Mode</Text>
                          <Text size="xs" className="text-typography-500">
                              Main is the most reliable, but if you're having trouble detecting meetings, try Alternative.
                          </Text>
                        </VStack>
                        <RadioGroup value={listeningType.toString()} onChange={(val) => setType(Number(val))} className="mt-1">
                          <HStack space="md">
                            <Radio value="0" size="sm"><RadioIndicator><RadioIcon as={CircleIcon} /></RadioIndicator><RadioLabel>Main</RadioLabel></Radio>
                            <Radio value="1" size="sm"><RadioIndicator><RadioIcon as={CircleIcon} /></RadioIndicator><RadioLabel>Alternative</RadioLabel></Radio>
                          </HStack>
                        </RadioGroup>

                        <Divider className="my-2" />

                        <View className={!isLead ? 'opacity-50' : ''} pointerEvents={!isLead ? 'none' : 'auto'}>
                          <HStack className="justify-between items-center mb-2">
                             <Text size="sm" className="font-semibold">Broadcast Strength</Text>
                             {!isLead && (
                               <View className="bg-gray-200 px-2 py-0.5 rounded-md">
                                 <Text className="text-[10px] font-bold text-gray-500">LEADS ONLY</Text>
                               </View>
                             )}
                          </HStack>
                          <RadioGroup value={broadcastingType.toString()} onChange={(val) => setBroadcastingType(Number(val))}>
                            <HStack space="md">
                              <Radio value="0" size="sm"><RadioIndicator><RadioIcon as={CircleIcon} /></RadioIndicator><RadioLabel>Low</RadioLabel></Radio>
                              <Radio value="1" size="sm"><RadioIndicator><RadioIcon as={CircleIcon} /></RadioIndicator><RadioLabel>Mid</RadioLabel></Radio>
                              <Radio value="2" size="sm"><RadioIndicator><RadioIcon as={CircleIcon} /></RadioIndicator><RadioLabel>High</RadioLabel></Radio>
                            </HStack>
                          </RadioGroup>
                        </View>

                      </VStack>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
            </VStack>
          </LinearGradient>
        </View>

        {/*2. Card for logging attendance*/}
        <View className="bg-background-0 rounded-2xl shadow-lg border border-outline-100 p-5">
          <Text className="text-xs font-medium text-typography-600 uppercase tracking-wide mb-4">
            Record Attendance
          </Text>

          <Button
            onPress={toggleListening}
            className="rounded-xl h-12"
            disabled={isListeningLoading || locationStatus !== 'enabled' || bluetoothState !== 'poweredOn'}
            style={{
              backgroundColor: isListening ? '#fcf000' : (theme === 'light' ? '#111827' : '#374151')
            }}
          >
            {isListeningLoading ? <Spinner color={isListening ? 'black' : 'white'} /> : (
              <ButtonText className="font-bold text-lg" style={{ color: isListening ? '#000000' : '#FFFFFF' }}>
                {isListening ? 'Stop Scanning' : 'Scan for Meetings'}
              </ButtonText>
            )}
          </Button>

          <VStack space="md" className="mt-4">
            {detectedBeacons.length > 0 ? (
              detectedBeacons.map(beacon => {
                const beaconId = `${beacon.uuid}-${beacon.major}-${beacon.minor}`;
                const isLogging = loggingBeacons.includes(beaconId);
                const meetingTitle = getMeetingTitle(beacon.major);
                const leadName = getUserName(beacon.minor);

                return (
                  <Card
                    key={beaconId}
                    variant={isLogging ? 'filled' : 'outline'}
                    className={`p-4 rounded-lg border ${isLogging ? 'border-yellow-500 bg-yellow-50' : 'border-gray-300'}`}
                  >
                    <VStack space="sm">
                      <HStack className="justify-between items-center">
                        <VStack>
                          <Text className="text-sm font-semibold">Lead:</Text>
                          <Text className="text-md font-semibold">{leadName}</Text>
                        </VStack>
                        <VStack className="items-end">
                          <Text className="text-sm font-semibold">Meeting:</Text>
                          <Text className="text-sm">{meetingTitle}</Text>
                        </VStack>
                      </HStack>
                      <Button
                        onPress={() => initiateLogAttendance(beacon)}
                        className={`mt-4 py-2 rounded-lg ${isLogging ? 'bg-yellow-300' : 'bg-green-500'}`}
                        disabled={isLogging}
                      >
                        {isLogging ? (
                          <Spinner />
                        ) : (
                          <ButtonText className="font-bold text-center">
                            Log Attendance
                          </ButtonText>
                        )}
                      </Button>
                    </VStack>
                  </Card>
                );
              })
            ) : (
              <Text className="text-center text-typography-500 mt-2 text-sm italic">
                {isListening ? "Scanning for nearby meetings..." : "No meetings detected"}
              </Text>
            )}
          </VStack>
        </View>

        {/* 3. Card for broadcasting attendance */}
        <View className={`bg-background-0 rounded-2xl shadow-lg border border-outline-100 p-5 ${!isLead ? 'opacity-50' : ''}`} pointerEvents={!isLead ? 'none' : 'auto'}>
          <HStack className="justify-between items-center mb-4">
            <Text className="text-xs font-medium text-typography-600 uppercase tracking-wide">
              Host a Meeting
            </Text>
            {!isLead && (
              <View className="bg-gray-200 px-2 py-1 rounded-md">
                <Text className="text-xs font-bold text-gray-500">LEADS ONLY</Text>
              </View>
            )}
          </HStack>

          {isBroadcasting && selectedMeetingToBroadcast && (
            <Text className="font-bold text-lg text-center mb-3">
              Broadcasting: {selectedMeetingToBroadcast.title}
            </Text>
          )}

          <Input variant="outline" size="sm" className="mb-3 rounded-lg">
            <InputField 
               value={searchQuery} 
               onChangeText={setSearchQuery} 
               placeholder="Search meetings..." 
            />
          </Input>

          <ScrollView className="max-h-48 mb-4" nestedScrollEnabled>
            {isLoadingMeetings ? (
               <Spinner className="mt-4"/>
            ) : filteredMeetings.length === 0 ? (
               <Text className="text-center text-typography-500 mt-4 text-sm">No active meetings</Text>
            ) : (
               filteredMeetings.map((meeting) => (
                 <Pressable key={meeting._id} onPress={() => setSelectedMeetingToBroadcast(meeting)}>
                    <View className={`p-3 mb-2 rounded-lg border ${selectedMeetingToBroadcast?._id === meeting._id ? 'border-blue-500 bg-blue-50' : 'border-outline-200'}`}>
                       <Text className="font-semibold">{meeting.title}</Text>
                       <Text className="text-xs text-typography-600">{meeting.location}</Text>
                    </View>
                 </Pressable>
               ))
            )}
          </ScrollView>

          {selectedMeetingToBroadcast && (
             <HStack space="md" className="mb-4">
               <Pressable onPress={() => setBroadcastMeetingMode('full')} className={`flex-1 p-2 rounded-lg items-center ${broadcastMeetingMode === 'full' ? 'bg-blue-100 border border-blue-500' : 'bg-background-50 border border-outline-200'}`}>
                 <Text className={broadcastMeetingMode === 'full' ? 'text-blue-700 font-bold' : ''}>Full Credit</Text>
               </Pressable>
               <Pressable onPress={() => setBroadcastMeetingMode('half')} className={`flex-1 p-2 rounded-lg items-center ${broadcastMeetingMode === 'half' ? 'bg-blue-100 border border-blue-500' : 'bg-background-50 border border-outline-200'}`}>
                 <Text className={broadcastMeetingMode === 'half' ? 'text-blue-700 font-bold' : ''}>Half Credit</Text>
               </Pressable>
             </HStack>
          )}

          <Button
            onPress={toggleBroadcasting}
            className="rounded-xl h-12"
            disabled={isBroadcastingLoading || (!isBroadcasting && !selectedMeetingToBroadcast) || locationStatus !== 'enabled' || bluetoothState !== 'poweredOn'}
            style={{
              backgroundColor: isBroadcasting ? '#fcf000' : (theme === 'light' ? '#111827' : '#374151')
            }}
          >
            {isBroadcastingLoading ? <Spinner color={isBroadcasting ? 'black' : 'white'} /> : (
              <ButtonText className="font-bold text-lg" style={{ color: isBroadcasting ? '#000000' : '#FFFFFF' }}>
                {isBroadcasting ? 'Stop Broadcasting' : 'Start Broadcasting'}
              </ButtonText>
            )}
          </Button>

        </View>

        {selectedBeacon && (
          <AlertDialog isOpen={!!selectedBeacon} onClose={() => { setSelectedBeacon(null); setSelectedMeetingToLog(null); }} size="md">
            <AlertDialogBackdrop />
            <AlertDialogContent>
              <AlertDialogHeader>
                <Text size="lg" className="text-typography-950 font-semibold">
                  Confirm Logging Attendance
                </Text>
              </AlertDialogHeader>
              <AlertDialogBody className="mt-3 mb-4">
                {selectedMeetingToLog ? (
                  <>
                    <Text size="sm"><Text className="font-bold">Title:</Text> {selectedMeetingToLog.title}</Text>
                    <Text size="sm"><Text className="font-bold">Description:</Text> {selectedMeetingToLog.description}</Text>
                    <Text size="sm"><Text className="font-bold">Location:</Text> {selectedMeetingToLog.location}</Text>
                    <Text size="sm"><Text className="font-bold">Time Start:</Text> {formatDateTime(selectedMeetingToLog.time_start)}</Text>
                    <Text size="sm"><Text className="font-bold">Time End:</Text> {formatDateTime(selectedMeetingToLog.time_end)}</Text>
                    <Text size="sm"><Text className="font-bold">Created by:</Text> {users.find(u => u._id === selectedMeetingToLog.created_by)?.first_name || `User ID ${selectedMeetingToLog.created_by}`}</Text>
                  </>
                ) : (
                  <Text size="sm">
                    Are you sure you want to log attendance for Meeting ID: {selectedBeacon.major}, Lead ID: {selectedBeacon.minor}?
                  </Text>
                )}
              </AlertDialogBody>
              <AlertDialogFooter>
                <Button
                  variant="outline"
                  action="secondary"
                  onPress={() => { setSelectedBeacon(null); setSelectedMeetingToLog(null); }}
                  size="sm"
                  className="mr-2"
                >
                  <Text>Cancel</Text>
                </Button>
                <Button size="sm" onPress={confirmLogAttendance} className="bg-blue-500">
                  <Text className="text-white">Confirm</Text>
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        
        <PermissionStatusPopup visible={isPopupVisible} onClose={closePermissionPopup} />

      </VStack>
    </ScrollView>
  );
};

export default LogAttendance;