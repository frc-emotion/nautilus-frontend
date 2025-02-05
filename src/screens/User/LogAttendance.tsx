import React, { useEffect, useState } from 'react';
import { ScrollView, Linking, RefreshControl } from 'react-native';
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
import { QueuedRequest, Beacon, MeetingObject } from '@/src/Constants';
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

const DEBUG_PREFIX = '[LogAttendance]';

const LogAttendance: React.FC = () => {
  const {
    bluetoothState,
    detectedBeacons,
    isListening,
    startListening,
    stopListening,
    fetchInitialBluetoothState
  } = useBLE();

  const { locationStatus, checkLocationServices } = useLocation();
  const { handleRequest, isConnected } = useNetworking(); // handleRequest & isConnected from networking
  const { meetings, fetchMeetings, isLoadingMeetings } = useMeetings();
  const { users, isLoading: isUsersLoading } = useUsers();
  const { openToast } = useGlobalToast();
  const { user } = useAuth();
  const { theme } = useTheme();

  const [loading, setLoading] = useState<boolean>(false);
  const [selectedBeacon, setSelectedBeacon] = useState<Beacon | null>(null);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingObject | null>(null);
  const [loggingBeacons, setLoggingBeacons] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const [isPopupVisible, setIsPopupVisible] = useState<boolean>(false); // State to control popup visibility

  const log = (...args: any[]) => {
    console.log(`[${new Date().toISOString()}] ${DEBUG_PREFIX}`, ...args);
  };

  const handleLocationPermissions = async (): Promise<boolean> => {
    if (locationStatus !== 'enabled') {
      openToast({
        title: 'Location Services Required',
        description: 'Please enable location services to listen for attendance.',
        type: 'error',
      });

      setTimeout(() => {
        Linking.openSettings();
      }, 2000);
      return false;
    }
    return true;
  };

  const handleBluetoothPermissions = async (): Promise<boolean> => {
    if (bluetoothState === 'unauthorized') {
      openToast({
        title: 'Bluetooth Unauthorized',
        description: 'Please allow Bluetooth access to listen for attendance.',
        type: 'error',
      });

      setTimeout(() => {
        Linking.openSettings();
      }, 2000);
      return false;
    }
    return true;
  };

  const toggleListening = async () => {
    const hasLocation = await handleLocationPermissions();
    const hasBluetooth = await handleBluetoothPermissions();

    if (!hasLocation || !hasBluetooth) return;

    setLoading(true);
    log('Toggling listening', { isListening });

    try {
      if (isListening) {
        log('Attempting to stop listening');
        await stopListening();
      } else {
        log('Attempting to start listening');
        await startListening();
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
      setLoading(false);
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
      setSelectedMeeting(cachedMeeting || null);
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
      setSelectedMeeting(null);
      return;
    }

    const beacon = selectedBeacon;
    const cachedMeeting = selectedMeeting;

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
          openModal: () => {},
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
      setSelectedMeeting(null);
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
          openModal: () => {},
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
    await checkLocationServices();
    await fetchInitialBluetoothState();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  if (isLoadingMeetings || isUsersLoading) {
    return (
      <VStack space="lg" className="p-6 flex-1 justify-center items-center">
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
      contentContainerStyle={{
        flexGrow: 1,
        padding: 16,
        backgroundColor: theme === 'light' ? '#FFFFFF' : '#1A202C',
      }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <VStack space="lg" className="flex-1">
        <View className="flex items-center justify-center">
          <Pressable onPress={openPermissionPopup}>
            <BluetoothStatusIndicator state={bluetoothState} />
          </Pressable>
          <Pressable onPress={openPermissionPopup}>
            <View className="ml-4">
              <LocationStatusIndicator state={locationStatus} />
            </View>
          </Pressable>
        </View>

        {(bluetoothState === 'unknown' || locationStatus === 'unknown' || bluetoothState === 'unauthorized' || locationStatus === 'unauthorized') && (
          <Button
            onPress={() => Linking.openSettings()}
            className="mt-4 px-6 py-2 rounded-lg bg-blue-500"
          >
            <ButtonText className="font-bold text-center">Open Settings</ButtonText>
          </Button>
        )}

        <Text size="2xl" bold className="text-center mt-4 mb-4">
          {isListening ? 'Listening for Attendance' : 'Not Listening'}
        </Text>

        <Button
          onPress={toggleListening}
          
          className={`px-6 rounded-lg ${bluetoothState === 'unauthorized' || locationStatus !== 'enabled' ? 'bg-gray-500' : 'bg-blue-500'}`}
          disabled={loading || locationStatus !== 'enabled' || bluetoothState === 'unauthorized'}
        >
          {loading ? (
            <Spinner />
          ) : (
            <ButtonText size="lg" className="font-bold text-center">
              {isListening ? 'Stop Listening' : 'Start Listening'}
            </ButtonText>
          )}
        </Button>

        <VStack space="md" className="w-full mt-6">
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
                  className={`p-4 rounded-lg border ${
                    isLogging ? 'border-yellow-500 bg-yellow-50' : 'border-gray-300'
                  }`}
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
                      className={`mt-4 py-2 rounded-lg ${
                        isLogging ? 'bg-yellow-300' : 'bg-green-500'
                      }`}
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
            <Text className="text-center text-gray-500">
              No leads detected
            </Text>
          )}
        </VStack>

        {selectedBeacon && (
          <AlertDialog isOpen={!!selectedBeacon} onClose={() => { setSelectedBeacon(null); setSelectedMeeting(null); }} size="md">
            <AlertDialogBackdrop />
            <AlertDialogContent>
              <AlertDialogHeader>
                <Text size="lg" className="text-typography-950 font-semibold">
                  Confirm Logging Attendance
                </Text>
              </AlertDialogHeader>
              <AlertDialogBody className="mt-3 mb-4">
                {selectedMeeting ? (
                  <>
                    <Text size="sm"><Text className="font-bold">Title:</Text> {selectedMeeting.title}</Text>
                    <Text size="sm"><Text className="font-bold">Description:</Text> {selectedMeeting.description}</Text>
                    <Text size="sm"><Text className="font-bold">Location:</Text> {selectedMeeting.location}</Text>
                    <Text size="sm"><Text className="font-bold">Time Start:</Text> {formatDateTime(selectedMeeting.time_start)}</Text>
                    <Text size="sm"><Text className="font-bold">Time End:</Text> {formatDateTime(selectedMeeting.time_end)}</Text>
                    <Text size="sm"><Text className="font-bold">Created by:</Text> {users.find(u => u._id === selectedMeeting.created_by)?.first_name || `User ID ${selectedMeeting.created_by}`}</Text>
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
                  onPress={() => { setSelectedBeacon(null); setSelectedMeeting(null); }}
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

        {/* Permission Status Popup */}
        <PermissionStatusPopup visible={isPopupVisible} onClose={closePermissionPopup} />
      </VStack>
    </ScrollView>
  );
};

export default LogAttendance;