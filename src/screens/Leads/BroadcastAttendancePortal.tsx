import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  TouchableOpacity,
  View,
  RefreshControl,
} from 'react-native';
import { useGlobalToast } from '../../utils/UI/CustomToastProvider';
import { useModal } from '../../utils/UI/CustomModalProvider';
import { useThemeContext } from '../../utils/UI/CustomThemeProvider';
import { useBLE } from '../../utils/BLE/BLEContext';
import { APP_UUID } from '../../Constants';
import { useMeetings } from '../../utils/Context/MeetingContext';
import { useAuth } from '../../utils/Context/AuthContext';
import {
  Lock,
  AlertCircle,
  Bluetooth,
  BluetoothOff,
  RefreshCw,
} from 'lucide-react-native';
import * as Linking from 'expo-linking';
import { Text } from "@/components/ui/text";
import { VStack } from '@/components/ui/vstack';
import { Button, ButtonText } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useLocation } from '@/src/utils/BLE/LocationContext';
import { BluetoothStatusIndicator, LocationStatusIndicator } from '@/src/utils/Helpers';
import { Card } from '@/components/ui/card';

const DEBUG_PREFIX = '[BroadcastAttendancePortal]';

const BroadcastAttendancePortal: React.FC = () => {
  const { user } = useAuth();
  const { openToast } = useGlobalToast();
  const { openModal } = useModal();
  const { colorMode } = useThemeContext();
  const { locationStatus, checkLocationStatus } = useLocation();


  // BLE Context
  const {
    bluetoothState,
    isBroadcasting,
    startBroadcasting,
    stopBroadcasting,

  } = useBLE();

  // Meetings Context
  const {
    meetings,
    isLoadingMeetings,
    fetchMeetings,
    selectedMeeting,
    setSelectedMeeting,
  } = useMeetings();

  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // Logging function
  const log = (...args: any[]) => {
    console.log(`[${new Date().toISOString()}] ${DEBUG_PREFIX}`, ...args);
  };

  const handleBluetoothPermissions = async (): Promise<boolean> => {
    if (bluetoothState === 'unauthorized') {
      openToast({
        title: 'Bluetooth Unauthorized',
        description: 'Please allow Bluetooth access to listen for attendance.',
        type: 'error',
      });
      openModal({
        title: 'Bluetooth Unauthorized',
        message: 'Please allow Bluetooth access to listen for attendance.',
        type: 'error',
      });
  
      setTimeout(() => {
        Linking.openSettings();
      }, 2000);
      return false;
    }
    return true;
  };
  
  const handleLocationPermissions = async (): Promise<boolean> => {
    if (locationStatus !== 'enabled') {
      openToast({
        title: 'Location Services Required',
        description: 'Please enable location services to listen for attendance.',
        type: 'error',
      });
      openModal({
        title: 'Location Services Required',
        message: 'Please enable location services to listen for attendance.',
        type: 'error',
      });
  
      setTimeout(() => {
        Linking.openSettings();
      }, 2000);
      return false;
    }
    return true;
  };

  /**
   * Toggle broadcasting state.
   */
  const toggleBroadcasting = async () => {
    log('Toggling broadcasting', { isBroadcasting, selectedMeeting });

    if (!selectedMeeting) {
      openToast({
        title: 'No Meeting Selected',
        description: 'Please select a meeting to broadcast.',
        type: 'error',
      });
      return;
    }

    setLoading(true);
    log('Broadcasting state set to loading');

    try {
      if (isBroadcasting) {
        log('Attempting to stop broadcasting');
        await stopBroadcasting();
        openToast({
          title: 'Broadcast Stopped',
          description: 'Broadcasting has been stopped successfully.',
          type: 'success',
        });
      } else {
        const hasLocation = await handleLocationPermissions();
        const hasBluetooth = await handleBluetoothPermissions();
      
        if (!hasLocation || !hasBluetooth) return;

        if (bluetoothState !== 'poweredOn') {
          openToast({
            title: 'Bluetooth Required',
            description: 'Please enable Bluetooth to start broadcasting.',
            type: 'error',
          });
          openModal({
            title: 'Bluetooth Required',
            message: 'Please enable Bluetooth to start broadcasting.',
            type: 'error',
          });
          Linking.openSettings();
          return;
        }

        const majorValue = Number(selectedMeeting._id);
        const minorValue = Number(user?._id);

        log('Starting broadcasting', { APP_UUID, majorValue, minorValue });

        await startBroadcasting(APP_UUID, majorValue, minorValue);

        openToast({
          title: 'Broadcasting Started',
          description: `Broadcasting for meeting "${selectedMeeting.title}" has started.`,
          type: 'success',
        });
      }
    } catch (error: any) {
      log('Error toggling broadcasting', error);
      openToast({
        title: 'Broadcast Error',
        description: error.message || 'An unknown error occurred.',
        type: 'error',
      });
    } finally {
      setLoading(false);
      log('Broadcasting toggle completed, loading state set to false');
    }
  };

  /**
   * Format UNIX timestamp to readable string.
   * @param timestamp - UNIX timestamp in seconds.
   * @returns Formatted date-time string.
   */
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

  /**
   * Handle pull-to-refresh action.
   */
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMeetings();
    setRefreshing(false);
  };

  /**
   * Effect to fetch meetings on component mount.
   */
  useEffect(() => {
    fetchMeetings();
  }, []);

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
        <View className="flex items-center justify-center">
          <BluetoothStatusIndicator state={bluetoothState} />
          <LocationStatusIndicator state={locationStatus} />
        </View>

        {/* Broadcasting Status */}
        <Text className="font-bold text-xl mb-6">
          {isBroadcasting
            ? `Broadcasting: ${selectedMeeting?.title}`
            : 'Not Broadcasting'}
        </Text>

        {/* Meetings List */}
        {isLoadingMeetings ? (
          <Spinner/>
        ) : meetings.length === 0 ? (
          <Text className="text-md text-center">No eligible meetings available.</Text>
        ) : (
          <VStack className="w-full">
            {meetings.map((meeting) => (
              <TouchableOpacity
                key={meeting._id}
                onPress={() => setSelectedMeeting(meeting)}
              >
                <Card
                  variant={selectedMeeting?._id === meeting._id ? 'filled' : 'outline'}
                  className={`p-4 rounded-lg border ${
                    selectedMeeting?._id === meeting._id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300'
                  }`}
                >
                  <Text className="text-md font-semibold">{meeting.title}</Text>
                  <Text className="text-sm mt-1 text-gray-600">{meeting.location}</Text>
                  <Text className="text-sm mt-1 text-gray-600">
                    {formatDateTime(meeting.time_start)} - {formatDateTime(meeting.time_end)}
                  </Text>
                </Card>
              </TouchableOpacity>
            ))}
          </VStack>
        )}

        {/* Start/Stop Broadcasting Button */}
        <Button
          onPress={toggleBroadcasting}
          className="mt-8 w-full rounded-lg"
          size="lg"
          disabled={
            loading ||
            meetings.length === 0 ||
            bluetoothState !== 'poweredOn' ||
            !selectedMeeting
          }
          action={isBroadcasting ? 'secondary' : 'primary'}
        >
          <ButtonText className="text-lg">
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