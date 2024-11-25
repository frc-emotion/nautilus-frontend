import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { Button, ButtonText } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useGlobalToast } from '../../utils/UI/CustomToastProvider';
import { useModal } from '@/src/utils/UI/CustomModalProvider';
import { useThemeContext } from '@/src/utils/UI/CustomThemeProvider';
import { useBLE } from '@/src/utils/BLE/BLEContext';
import { APP_UUID } from '@/src/Constants';
import { useMeetings } from '@/src/utils/MeetingContext';
import { useAuth } from '@/src/utils/AuthContext';
import { Lock, AlertCircle, Bluetooth, BluetoothOff, RefreshCw } from 'lucide-react-native';

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
const DEBUG_PREFIX = '[BroadcastAttendancePortal]';

const BroadcastAttendancePortal: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useGlobalToast();
  const { openModal } = useModal();
  const { colorMode } = useThemeContext();

  // Utilize BLE Context
  const {
    bluetoothState,
    isBroadcasting,
    startBroadcasting,
    stopBroadcasting,
  } = useBLE();

  // Utilize Meetings Context
  const {
    meetings,
    isLoadingMeetings,
    fetchMeetings,
    selectedMeeting,
    setSelectedMeeting,
  } = useMeetings();

  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const toggleBroadcasting = async () => {
    console.log(
      `${DEBUG_PREFIX} Toggling broadcasting. Current state: ${
        isBroadcasting ? 'Broadcasting' : 'Not Broadcasting'
      }`
    );

    if (!selectedMeeting) {
      console.error(`${DEBUG_PREFIX} No meeting selected.`);
      showToast({
        title: 'No Meeting Selected',
        description: 'Please select a meeting to broadcast.',
        type: 'error',
      });
      return;
    }

    setLoading(true);
    console.log(`${DEBUG_PREFIX} Starting toggleBroadcasting, loading state set to true.`);

    try {
      if (isBroadcasting) {
        console.log(`${DEBUG_PREFIX} Attempting to stop broadcasting.`);
        await stopBroadcasting();
        console.log(`${DEBUG_PREFIX} Broadcasting stopped successfully.`);
      } else {
        if (bluetoothState !== 'poweredOn') {
          // Utilize modal and toast instead of Alert
          showToast({
            title: 'Bluetooth Required',
            description: 'Please enable Bluetooth to start broadcasting.',
            type: 'error',
          });
          openModal({
            title: 'Bluetooth Required',
            message: 'Please enable Bluetooth to start broadcasting.',
            type: 'error',
          });
          setLoading(false); // Stop loading if Bluetooth is not enabled
          return;
        }

        const majorValue = Number(selectedMeeting._id);
        const minorValue = Number(user?._id); // Ensure `user` is accessible here

        console.log(
          `${DEBUG_PREFIX} Starting broadcasting with UUID: ${APP_UUID}, Major: ${majorValue}, Minor: ${minorValue}`
        );

        await startBroadcasting(APP_UUID, majorValue, minorValue);

        console.log(`${DEBUG_PREFIX} Broadcasting started successfully.`);
      }
    } catch (error: any) {
      console.error(`${DEBUG_PREFIX} Error toggling broadcasting:`, error);
      if (error instanceof Error) {
        showToast({
          title: 'Broadcast Error',
          description: error.message,
          type: 'error',
        });
      } else {
        showToast({
          title: 'Broadcast Error',
          description: 'An unknown error occurred.',
          type: 'error',
        });
      }
    } finally {
      setLoading(false);
      console.log(`${DEBUG_PREFIX} toggleBroadcasting completed, loading state set to false.`);
    }
  };

  const formatDateTime = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMeetings();
    setRefreshing(false);
  };

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        padding: 16,
        backgroundColor: colorMode === 'light' ? '#FFFFFF' : '#1A202C',
      }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <VStack space="lg" className="items-center">
        {/* Bluetooth Status Indicator */}
      <View className="flex-row justify-center">
        <BluetoothStatusIndicator state={bluetoothState} />
      </View>
      
        <Text className="font-bold text-lg">
          {isBroadcasting
            ? `Broadcasting Meeting: ${selectedMeeting?.title}`
            : 'Not Broadcasting'}
        </Text>

        

        {isLoadingMeetings ? (
          <ActivityIndicator size="large" />
        ) : meetings.length === 0 ? (
          <Text className="text-md">No eligible meetings available.</Text>
        ) : (
          meetings.map((meeting) => (
            <TouchableOpacity
              key={meeting._id}
              onPress={() => setSelectedMeeting(meeting)}
              className={'p-4 mb-3 rounded-lg border'}
              style={{
                borderColor:
                  selectedMeeting?._id === meeting._id ? '#3B82F6' : '#D1D5DB',
              }}
            >
              <Text className="text-md font-bold">{meeting.title}</Text>
              <Text className="text-sm mt-2">{meeting.location}</Text>
              <Text className="text-sm">
                {formatDateTime(meeting.time_start)} - {formatDateTime(meeting.time_end)}
              </Text>
            </TouchableOpacity>
          ))
        )}

        <Button
          onPress={toggleBroadcasting}
          className={'mt-4 py-2 rounded-md'}
          size="lg"
          disabled={
            loading ||
            meetings.length === 0 ||
            bluetoothState !== 'poweredOn' ||
            !selectedMeeting
          }
        >
          <ButtonText>
            {loading ? (
              <Spinner />
            ) : isBroadcasting ? (
              'Stop Broadcasting'
            ) : (
              'Start Broadcasting'
            )}
          </ButtonText>
        </Button>
      </VStack>
    </ScrollView>
  );
};

export default BroadcastAttendancePortal;