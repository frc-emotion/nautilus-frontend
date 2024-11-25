import React, { useEffect, useState } from 'react';
import { Text } from "@/components/ui/text";
import { VStack } from '@/components/ui/vstack';
import { Button, ButtonText } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { useGlobalToast } from '@/src/utils/UI/CustomToastProvider';
import ApiClient from '@/src/utils/Networking/APIClient';
import { APP_UUID, QueuedRequest, Beacon, MeetingObject, FailedRequest } from '@/src/Constants';
import { AxiosError, AxiosResponse } from 'axios';
import { useAuth } from '@/src/utils/AuthContext';
import { useModal } from '@/src/utils/UI/CustomModalProvider';
import { useBLE } from '@/src/utils/BLE/BLEContext';
import { View } from 'react-native';
import { Lock, AlertCircle, Bluetooth, BluetoothOff, RefreshCw } from 'lucide-react-native';
import { useMeetings } from '@/src/utils/MeetingContext';
import { useUsers } from '@/src/utils/UsersContext';

const DEBUG_PREFIX = '[LogAttendance]';

const BluetoothStatusIndicator: React.FC<{ state: string }> = ({ state }) => {
  let IconComponent = Bluetooth;
  let color = 'gray';
  let statusText = 'Unknown';

  switch (state) {
    case 'poweredOn':
      IconComponent = Bluetooth;
      color = 'green';
      statusText = 'Powered On';
      break;
    case 'poweredOff':
      IconComponent = BluetoothOff;
      color = 'red';
      statusText = 'Powered Off';
      break;
    case 'unsupported':
      IconComponent = AlertCircle;
      color = 'orange';
      statusText = 'Unsupported';
      break;
    case 'unauthorized':
      IconComponent = Lock;
      color = 'purple';
      statusText = 'Unauthorized';
      break;
    case 'resetting':
      IconComponent = RefreshCw;
      color = 'yellow';
      statusText = 'Resetting';
      break;
    default:
      IconComponent = Bluetooth;
      color = 'gray';
      statusText = 'Unknown';
      break;
  }

  return (
    <View className="flex-row items-center">
      <IconComponent size={24} color={color} />
      <Text className={`ml-2`} size="md">
        Bluetooth: {statusText}
      </Text>
    </View>
  );
};

const LogAttendance: React.FC = () => {
  const {
    bluetoothState,
    detectedBeacons,
    isListening,
    startListening,
    stopListening,
  } = useBLE();
  
  const { meetings, fetchMeetings, isLoadingMeetings } = useMeetings(); // Access meetings and fetchMeetings from context
  const { users, isLoading } = useUsers(); // Access users and loading state
  const { showToast } = useGlobalToast();
  const { user } = useAuth();
  const { openModal } = useModal();

  const [loading, setLoading] = useState(false);
  const [selectedBeacon, setSelectedBeacon] = useState<Beacon | null>(null);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingObject | null>(null);
  const [loggingBeacons, setLoggingBeacons] = useState<string[]>([]);

  const toggleListening = async () => {
    setLoading(true);
    try {
      if (isListening) {
        await stopListening();
      } else {
        await startListening();
      }
    } catch (error) {
      console.error(`${DEBUG_PREFIX} Error toggling listening:`, error);
      showToast({ title: 'Error', description: 'Failed to toggle listening.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const logAttendance = async (beacon: Beacon) => {
    if (!user?.token) {
      showToast({
        title: "Error",
        description: "User not authenticated.",
        type: "error",
      });
      return;
    }

    const beaconId = `${beacon.uuid}-${beacon.major}-${beacon.minor}`;
    setLoggingBeacons(prev => [...prev, beaconId]);

    const payload = {
      meeting_id: beacon.major,
      lead_id: beacon.minor,
      time_received: Math.floor(Date.now() / 1000),
      flag: false,
    };

    const request: QueuedRequest = {
      url: "/api/attendance/log",
      method: "post",
      data: payload,
      headers: { Authorization: `Bearer ${user.token}` },
      retryCount: 3,
      successHandler: async () => {
        showToast({
          title: "Success",
          description: `Attendance logged for Meeting ID: ${beacon.major}, Lead ID: ${beacon.minor}`,
          type: "success",
        });
        
      },
      errorHandler: async (error: AxiosError) => {
        console.error("Failed to log attendance:", error);
        showToast({
          title: `Error: ${error.response?.status}`,
          description:
            (error.response?.data as FailedRequest).message ||
            "Something went wrong",
          type: "error",
        });
      },
      offlineHandler: async () => {
        showToast({
          title: "Offline",
          description: `Attendance request for Meeting ID: ${beacon.major}, Lead ID: ${beacon.minor} saved. It will be processed when you're back online.`,
          type: "info",
        });
      },
    };

    try { 
      await ApiClient.handleRequest(request);
    } catch (error: any) {
      console.error("Error during attendance request:", error);
      showToast({
        title: "Error",
        description: `An unexpected error occurred while logging attendance for Meeting ID: ${beacon.major}, Lead ID: ${beacon.minor}`,
        type: "error",
      });
    } finally {
      setLoggingBeacons(prev => prev.filter(id => id !== beaconId));
      setSelectedBeacon(null);
      setSelectedMeeting(null);
    }
  };

  useEffect(() => {
    const fetchMeetingDetails = async () => {
      if (!selectedBeacon || !user?.token) {
        setSelectedMeeting(null);
        return;
      }

      const meeting_id = selectedBeacon.major;
      try {
        // Attempt to find the meeting from cached meetings first
        let meeting = meetings.find(m => m._id === meeting_id);

        if (meeting) {
          setSelectedMeeting(meeting);
        } else {
          // If not found in cache, attempt to fetch from API
          const isConnected = await ApiClient.connected();
          if (isConnected) {
            const request: QueuedRequest = {
              url: `/api/meetings/${meeting_id}/info`,
              method: "get",
              headers: { Authorization: `Bearer ${user.token}` },
              retryCount: 0,
              successHandler: async (response: AxiosResponse) => {
                const fetchedMeeting: MeetingObject = response.data.meeting;
                setSelectedMeeting(fetchedMeeting);
                // Update the meetings cache by fetching the latest from context
                await fetchMeetings(); // Refresh meetings in context
                showToast({
                  title: "Success",
                  description: `Fetched details for Meeting ID: ${meeting_id}`,
                  type: "success",
                });
              },
              errorHandler: async (error: AxiosError) => {
                console.error("Failed to fetch meeting details:", error);
                showToast({
                  title: "Error",
                  description: `Unable to fetch details for Meeting ID: ${meeting_id}`,
                  type: "error",
                });
                setSelectedMeeting(null);
              },
              offlineHandler: async () => {
                showToast({
                  title: "Offline",
                  description: "Cannot fetch meeting details while offline.",
                  type: "info",
                });
                setSelectedMeeting(null);
              },
            };

            await ApiClient.handleRequest(request);
          } else {
            showToast({
              title: "Offline",
              description: "Cannot fetch meeting details while offline.",
              type: "info",
            });
            setSelectedMeeting(null);
          }
        }
      } catch (error) {
        console.error("Error retrieving meeting details:", error);
        showToast({
          title: "Error",
          description: "An unexpected error occurred while retrieving meeting details.",
          type: "error",
        });
        setSelectedMeeting(null);
      }
    };

    fetchMeetingDetails();
  }, [selectedBeacon, user?.token, meetings, fetchMeetings, showToast]);

  // Helper functions to map IDs to names
  const getMeetingTitle = (meetingId: number): string => {
    const meeting = meetings.find(m => m._id === meetingId);
    return meeting ? meeting.title : 'Unknown Meeting';
  };

  const getUserName = (userId: number): string => {
    const user = users.find(u => u._id === userId);
    return user ? `${user.first_name} ${user.last_name}` : 'Unknown User';
  };

  // Handle loading states
  if (isLoadingMeetings || isLoading) {
    return (
      <VStack space="lg" className="p-6 flex-1 justify-center items-center">
        <Spinner />
        <Text className="mt-2">Loading...</Text>
      </VStack>
    );
  }

  return (
    <VStack space="lg" className="p-6 flex-1">
      {/* Bluetooth Status Indicator */}
      <View className="flex-row justify-center">
        <BluetoothStatusIndicator state={bluetoothState} />
      </View>

      <Text size="2xl" bold className="text-center mt-4 mb-4">
        {isListening ? 'Listening for Beacons' : 'Not Listening'}
      </Text>

      <Button
        onPress={toggleListening}
        className={`px-6 rounded-lg`}
        disabled={loading}
      >
        {loading ? (
          <Spinner/>
        ) : (
          <ButtonText size="lg" className={`font-bold text-center`}>
            {isListening ? 'Stop Listening' : 'Start Listening'}
          </ButtonText>
        )}
        
      </Button>

      <VStack space="md" className="p-4 rounded-lg shadow-md mt-6">
        {detectedBeacons.length > 0 ? (
          detectedBeacons.map(beacon => {
            const beaconId = `${beacon.uuid}-${beacon.major}-${beacon.minor}`;
            const isLogging = loggingBeacons.includes(beaconId);
            const meetingTitle = getMeetingTitle(beacon.major);
            const leadName = getUserName(beacon.minor);
            return (
              <VStack key={beaconId} space="sm" className="border-b pb-2 mb-2">
                <Text className="text-md text-center">
                  {leadName} : {meetingTitle}
                </Text>
                <Button
                  onPress={() => setSelectedBeacon(beacon)}
                  className={`px-4 rounded-lg ${isLogging ? '' : 'bg-green-500'}`}
                  disabled={isLogging}
                >
                  {isLogging ? (
                    <Spinner/>
                  ) : (
                    <ButtonText size="lg" className="font-bold text-center">
                      Log Attendance
                    </ButtonText>
                  )}
                  
                </Button>
              </VStack>
            );
          })
        ) : (
          <Text className="text-center">
            No leads detected
          </Text>
        )}
      </VStack>

      {/* Confirmation AlertDialog */}
      {selectedBeacon && (
        <AlertDialog isOpen={!!selectedBeacon} onClose={() => setSelectedBeacon(null)} size="md">
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
                  <Text size="sm"><Text className="font-bold">Time Start:</Text> {new Date(selectedMeeting.time_start * 1000).toLocaleString()}</Text>
                  <Text size="sm"><Text className="font-bold">Time End:</Text> {new Date(selectedMeeting.time_end * 1000).toLocaleString()}</Text>
                  <Text size="sm"><Text className="font-bold">Created by:</Text> {getUserName(selectedMeeting.created_by)}</Text>
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
                onPress={() => setSelectedBeacon(null)}
                size="sm"
              >
                <ButtonText>Cancel</ButtonText>
              </Button>
              <Button size="sm" onPress={() => logAttendance(selectedBeacon)}>
                <ButtonText>Confirm</ButtonText>
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </VStack>
  );
};

export default LogAttendance;