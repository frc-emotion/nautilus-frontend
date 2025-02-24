import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useGlobalToast } from '../../utils/UI/CustomToastProvider';
import { useTheme } from '../../utils/UI/CustomThemeProvider';
import { useBLE } from '../../utils/BLE/BLEContext';
import { APP_UUID, MeetingObject } from '../../Constants';
import { useMeetings } from '../../utils/Context/MeetingContext';
import { useAuth } from '../../utils/Context/AuthContext';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { Button, ButtonText } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useLocation } from '@/src/utils/Context/LocationContext';
import { BluetoothStatusIndicator, LocationStatusIndicator } from '@/src/utils/Helpers';
import { Card } from '@/components/ui/card';
import { Input, InputField } from '@/components/ui/input';
import { Box } from '@/components/ui/box';
import { Pressable } from '@/components/ui/pressable';
import { View } from '@/components/ui/view';
import * as Sentry from '@sentry/react-native';
import PermissionStatusPopup from '@/src/components/PermissionStatusPopup';
import { HStack } from '@/components/ui/hstack';
import { Radio, RadioGroup, RadioIcon, RadioIndicator, RadioLabel } from '@/components/ui/radio';
import { ChevronDownIcon, ChevronUpIcon, CircleIcon } from '@/components/ui/icon';
import { Accordion, AccordionItem, AccordionHeader, AccordionTrigger, AccordionTitleText, AccordionIcon, AccordionContent } from '@/components/ui/accordion';
import { Divider } from '@/components/ui/divider';

const DEBUG_PREFIX = '[BroadcastAttendancePortal]';

const BroadcastAttendancePortal: React.FC = () => {
  const { user } = useAuth();
  const { openToast } = useGlobalToast();
  const { theme } = useTheme();
  const { locationStatus, checkLocationServices } = useLocation();

  // BLE Context
  const {
    bluetoothState,
    isBroadcasting,
    startBroadcasting,
    stopBroadcasting,
    fetchInitialBluetoothState,
  } = useBLE();

  // Meetings Context
  const {
    meetings,
    isLoadingMeetings,
    fetchMeetings,
    selectedMeeting,
    setSelectedMeeting,
    getChildMeeting
  } = useMeetings();

  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [validMeetings, setValidMeetings] = useState<MeetingObject[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filteredMeetings, setFilteredMeetings] = useState<MeetingObject[]>([]);
  const [isPopupVisible, setIsPopupVisible] = useState<boolean>(false); // State to control popup visibility
  const [broadcastingType, setBroadcastingType] = useState<number>(2); // 0 for low power, 1 for balanced, 2 for high power
  const [broadcastMeetingMode, setBroadcastMeetingMode] = useState<'full' | 'half'>('full');

  useEffect(() => {
    log('useEffect [searchQuery]', searchQuery);
    if (!searchQuery) {
      setFilteredMeetings(validMeetings);
      return;
    }

    const filtered = validMeetings.filter((meeting) => {
      return (
        meeting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meeting.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meeting.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });

    setFilteredMeetings(filtered);
  }, [searchQuery, validMeetings]);

  // Logging function
  const log = (...args: any[]) => {
    console.log(`[${new Date().toISOString()}] ${DEBUG_PREFIX}`, ...args);
  };

  const handleBluetoothPermissions = async (): Promise<boolean> => {
    if (bluetoothState === 'unauthorized') {
      openToast({
        title: 'Bluetooth Unauthorized',
        description: 'Please allow Bluetooth access to broadcast attendance.',
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
        description: 'Please enable location services to broadcast attendance.',
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
    console.log(`${DEBUG_PREFIX} Toggling broadcasting`, { isBroadcasting, selectedMeeting });
    if (!selectedMeeting) {
      openToast({
        title: 'No Meeting Selected',
        description: 'Please select a meeting to broadcast.',
        type: 'error',
      });
      return;
    }

    setLoading(true);
    try {
      // Determine which meeting ID to broadcast based on mode:
      let meetingIdToBroadcast = selectedMeeting._id;
      if (broadcastMeetingMode === 'half') {
        const halfMeeting = getChildMeeting(selectedMeeting._id);
        if (!halfMeeting) {
          openToast({
            title: 'Half Meeting Not Available',
            description: 'There is no half meeting available for this meeting.',
            type: 'error',
          });
          setLoading(false);
          return;
        }
        meetingIdToBroadcast = halfMeeting._id;
      }

      if (isBroadcasting) {
        console.log(`${DEBUG_PREFIX} Attempting to stop broadcasting`);
        await stopBroadcasting();
      } else {
        const hasLocation = await handleLocationPermissions();
        const hasBluetooth = await handleBluetoothPermissions();
        if (!hasLocation || !hasBluetooth) {
          setLoading(false);
          return;
        }
        if (bluetoothState !== 'poweredOn') {
          openToast({
            title: 'Bluetooth Required',
            description: 'Please enable Bluetooth to start broadcasting.',
            type: 'error',
          });
          Linking.openSettings();
          setLoading(false);
          return;
        }
        const majorValue = Number(meetingIdToBroadcast);
        const minorValue = Number(user?._id);
        console.log(`${DEBUG_PREFIX} Starting broadcasting`, { APP_UUID, majorValue, minorValue, meetingTitle: selectedMeeting.title });
        // Use existing broadcasting strength radio group values for power mode
        // (Assuming broadcastingType is already handled in the radio group below)
        // For this example, we simply use fixed values:
        // Full broadcasting uses mode 2, high power (for example)
        // Half broadcasting uses mode 0, low power (for example)
        if (broadcastMeetingMode === 'full') {
          await startBroadcasting(APP_UUID, majorValue, minorValue, selectedMeeting.title, 2, 3);
        } else {
          await startBroadcasting(APP_UUID, majorValue, minorValue, selectedMeeting.title, 0, 1);
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
      setLoading(false);
      console.log(`${DEBUG_PREFIX} Broadcasting toggle completed, loading state set to false`);
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
    await checkLocationServices();
    await fetchInitialBluetoothState();
    setRefreshing(false);
  };

  /**
   * Filter meetings that are currently active.
   */
  useEffect(() => {
    const currentTime = Math.floor(Date.now() / 1000);
    const eligibleMeetings = meetings.filter(
      (meeting) => currentTime >= meeting.time_start && currentTime <= meeting.time_end
    );
    setValidMeetings(eligibleMeetings);
    setFilteredMeetings(eligibleMeetings); // Update filteredMeetings when validMeetings change
  }, [meetings]);

  const openPermissionPopup = () => {
    setIsPopupVisible(true);
  };

  const closePermissionPopup = () => {
    setIsPopupVisible(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{
        flex: 1,
        backgroundColor: theme === 'light' ? '#FFFFFF' : '#1A202C',
      }}
    >
      <Box className="p-4 flex-1">
        <VStack space="lg" className="flex-1">
          {/* Bluetooth and Location Status Indicators */}
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

          {/* Open Settings Button */}
          {(bluetoothState === 'unknown' ||
            locationStatus === 'unknown' ||
            bluetoothState === 'unauthorized' ||
            locationStatus === 'unauthorized') && (
              <Button
                onPress={() => Linking.openSettings()}
                className="px-6 py-2 rounded-lg bg-blue-500 mt-4"
              >
                <ButtonText className="font-bold text-center">Open Settings</ButtonText>
              </Button>
            )}

          {/* Broadcasting Status */}
          <Text className="font-bold text-xl text-center mt-2">
            {isBroadcasting
              ? `Broadcasting: ${selectedMeeting?.title}`
              : 'Not Broadcasting'}
          </Text>

          {/* Broadcasting Type */}
          {Platform.OS === 'android' && (

            <Accordion
              size="md"
              variant="filled"
              type="single"
              isCollapsible={true}
              isDisabled={false}
              className="m-5 mt-1 mb-1 w-[90%] border border-outline-200"
            >
              <AccordionItem value="a" className='rounded-lg'>
                <AccordionHeader>
                  <AccordionTrigger>
                    {({ isExpanded }) => {
                      return (
                        <>
                          <AccordionTitleText>
                            Broadcasting Strength
                          </AccordionTitleText>
                          {isExpanded ? (
                            <AccordionIcon as={ChevronUpIcon} className="ml-3" />
                          ) : (
                            <AccordionIcon as={ChevronDownIcon} className="ml-3" />
                          )}
                        </>
                      )
                    }}
                  </AccordionTrigger>
                </AccordionHeader>
                <AccordionContent>
                  <RadioGroup value={broadcastingType.toString()}>
                    <HStack space="md" className="items-center justify-center">
                      <Radio isDisabled={isBroadcasting} onPress={() => setBroadcastingType(0)} value="0" size="md" isInvalid={false}>
                        <RadioIndicator>
                          <RadioIcon as={CircleIcon} />
                        </RadioIndicator>
                        <RadioLabel>Low Power</RadioLabel>
                      </Radio>
                      <Radio isDisabled={isBroadcasting} onPress={() => setBroadcastingType(1)} value="1" size="md" isInvalid={false}>
                        <RadioIndicator>
                          <RadioIcon as={CircleIcon} />
                        </RadioIndicator>
                        <RadioLabel>Balanced</RadioLabel>
                      </Radio>
                      <Radio isDisabled={isBroadcasting} onPress={() => setBroadcastingType(2)} value="2" size="md" isInvalid={false}>
                        <RadioIndicator>
                          <RadioIcon as={CircleIcon} />
                        </RadioIndicator>
                        <RadioLabel>High Power</RadioLabel>
                      </Radio>
                    </HStack>
                  </RadioGroup>
                </AccordionContent>
              </AccordionItem>
              <Divider />
            </Accordion>
          )}

          {/* Search Input */}
          <Input variant="outline" size="md" className="mt-4">
            <InputField
              value={searchQuery}
              onChangeText={(text) => {
                log('Search query changed', text);
                setSearchQuery(text);
              }}
              placeholder="Search by name, description, location..."
            />
          </Input>

          {/* Meetings List */}
          <Box className="flex-1 mt-4 w-full">
            <ScrollView
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ flexGrow: 1 }}
            >
              {isLoadingMeetings ? (
                <View className="p-3 flex-1 justify-center items-center">
                  <Spinner />
                  <Text className="text-center">Loading meetings...</Text>
                </View>
              ) : filteredMeetings.length === 0 ? (
                <View className="p-3 flex-1 justify-center items-center">
                  <Text className="text-center">No meetings found.</Text>
                </View>
              ) : (
                filteredMeetings.map((meeting) => (
                  <Pressable
                    key={meeting._id}
                    onPress={() => setSelectedMeeting(meeting)}
                  >
                    <Card
                      variant={selectedMeeting?._id === meeting._id ? 'filled' : 'outline'}
                      className={`p-4 mb-3 rounded-lg border`}
                    >
                      {/* Row container for details on the left, buttons on the right */}
                      <View className="flex flex-row justify-between items-center">
                        {/* Meeting details (left side) */}
                        <View className="flex flex-col">
                          <Text className="text-lg font-semibold">{meeting.title}</Text>
                          <Text className="text-sm mt-1">{meeting.location}</Text>
                          <Text className="text-sm mt-1">
                            {formatDateTime(meeting.time_start)} - {formatDateTime(meeting.time_end)}
                          </Text>
                        </View>

                        {/* Show Full/Half buttons only if this card is the selected meeting */}
                        {selectedMeeting && selectedMeeting === meeting && (
                          <View className="flex flex-col items-end ml-4">
                            <Button
                              onPress={() => setBroadcastMeetingMode('full')}
                              className={`px-4 py-2 mb-2 rounded-lg ${broadcastMeetingMode === 'full' ? 'bg-blue-500' : 'bg-gray-300'
                                }`}
                            >
                              <ButtonText>Full</ButtonText>
                            </Button>

                            <Button
                              onPress={() => setBroadcastMeetingMode('half')}
                              className={`px-4 py-2 rounded-lg ${broadcastMeetingMode === 'half' ? 'bg-blue-500' : 'bg-gray-300'
                                }`}
                            >
                              <ButtonText>Half</ButtonText>
                            </Button>
                          </View>
                        )}
                      </View>
                    </Card>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </Box>

          {/* Start/Stop Broadcasting Button */}
          <Button
            onPress={toggleBroadcasting}
            // className="mt-4 rounded-lg justify-center"
            className={`mt-4 rounded-lg justify-center ${loading || meetings.length === 0 || bluetoothState !== 'poweredOn' || locationStatus !== 'enabled' || !selectedMeeting ? 'bg-gray-500' : 'bg-blue-500'}`}
            size="lg"
            disabled={
              loading ||
              meetings.length === 0 ||
              bluetoothState !== 'poweredOn' ||
              !selectedMeeting ||
              locationStatus !== 'enabled'

            }
            action={isBroadcasting ? 'secondary' : 'primary'}
          >
            <ButtonText className="text-lg">
              {loading ? (
                <ActivityIndicator size="small" />
              ) : isBroadcasting ? (
                'Stop Broadcasting'
              ) : (
                'Start Broadcasting'
              )}
            </ButtonText>
          </Button>
          {/* Permission Status Popup */}
          <PermissionStatusPopup visible={isPopupVisible} onClose={closePermissionPopup} />
        </VStack>
      </Box>
    </KeyboardAvoidingView>
  );
};

export default BroadcastAttendancePortal;
