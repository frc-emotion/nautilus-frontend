import React, { createContext, useContext, useState } from 'react';
import { QueuedRequest, MeetingObject, MeetingsContextProps, MEETINGS_STORAGE_KEY } from '../../Constants';
import ApiClient from '../Networking/APIClient';
import { AxiosResponse, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { useGlobalToast } from '../UI/CustomToastProvider';

const MeetingsContext = createContext<MeetingsContextProps | undefined>(undefined);
const DEBUG_PREFIX = '[MeetingsProvider]';

export const MeetingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth(); // User context for token authentication
  const { openToast } = useGlobalToast(); // Toast context for error and info messages

  const [meetings, setMeetings] = useState<MeetingObject[]>([]);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState<boolean>(false);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingObject | null>(null);

  /**
   * Initializes the MeetingsProvider by fetching meetings or loading cached ones.
   * This function is intended to be called during app initialization.
   */
  const init = async () => {
    console.log(`${DEBUG_PREFIX} Initializing...`);
    if (!user || user.role === 'unverified') {
      console.warn(`${DEBUG_PREFIX} Initialization skipped: User is unverified or undefined.`);
      return;
    }

    try {
      await fetchMeetings();
    } catch (error) {
      console.error(`${DEBUG_PREFIX} Initialization error:`, error);
      openToast({
        title: 'Initialization Error',
        description: 'An error occurred while initializing meetings.',
        type: 'error',
      });
    }
  };

  /**
   * Fetches the meetings from the server and caches the eligible ones.
   */
  const fetchMeetings = async () => {
    console.log(`${DEBUG_PREFIX} Fetching meetings from API...`);
    setIsLoadingMeetings(true);

    const request: QueuedRequest = {
      url: '/api/meetings/info',
      method: 'get',
      retryCount: 0,
      successHandler: async (response: AxiosResponse) => {
        console.log(`${DEBUG_PREFIX} Meetings fetched successfully.`);
        const fetchedMeetings: MeetingObject[] = response.data.data.meetings;

        // // Filter meetings that are currently active
        // const eligibleMeetings = fetchedMeetings.filter(
        //   (meeting) => currentTime >= meeting.time_start && currentTime <= meeting.time_end
        // );

        setMeetings(fetchedMeetings);
        await cacheMeetings(fetchedMeetings);
      },
      errorHandler: async (error: AxiosError) => {
        console.error(`${DEBUG_PREFIX} API error while fetching meetings:`, error.message);
        openToast({
          title: 'Error',
          description: 'Failed to fetch meetings. Loading cached meetings if available.',
          type: 'error',
        });
        await loadCachedMeetings();
      },
      offlineHandler: async () => {
        console.warn(`${DEBUG_PREFIX} Offline detected. Loading cached meetings.`);
        openToast({
          title: 'Offline',
          description: 'You are offline. Cached meetings have been loaded.',
          type: 'warning',
        });
        await loadCachedMeetings();
      },
    };

    try {
      await ApiClient.handleRequest(request);
    } catch (error) {
      console.error(`${DEBUG_PREFIX} Unexpected error during fetch:`, error);
      await loadCachedMeetings();
    } finally {
      setIsLoadingMeetings(false);
    }
  };

  /**
   * Caches the meetings locally in AsyncStorage for offline access.
   * @param meetingsToCache - The meetings to store in the cache
   */
  const cacheMeetings = async (meetingsToCache: MeetingObject[]) => {
    try {
      await AsyncStorage.setItem(MEETINGS_STORAGE_KEY, JSON.stringify(meetingsToCache));
      console.log(`${DEBUG_PREFIX} Meetings cached successfully.`);
    } catch (error) {
      console.error(`${DEBUG_PREFIX} Error caching meetings:`, error);
    }
  };

  /**
   * Loads meetings from the local cache if available.
   */
  const loadCachedMeetings = async () => {
    try {
      const cachedData = await AsyncStorage.getItem(MEETINGS_STORAGE_KEY);
      if (cachedData) {
        const cachedMeetings: MeetingObject[] = JSON.parse(cachedData);
        setMeetings(cachedMeetings);
        console.log(`${DEBUG_PREFIX} Cached meetings loaded.`);
      } else {
        console.warn(`${DEBUG_PREFIX} No cached meetings found.`);
        openToast({
          title: 'No Cached Data',
          description: 'No cached meetings available.',
          type: 'info',
        });
      }
    } catch (error) {
      console.error(`${DEBUG_PREFIX} Error loading cached meetings:`, error);
    }
  };

  return (
    <MeetingsContext.Provider
      value={{
        meetings,
        isLoadingMeetings,
        fetchMeetings,
        selectedMeeting,
        setSelectedMeeting,
        init, // Exposed initialization function
      }}
    >
      {children}
    </MeetingsContext.Provider>
  );
};

export const useMeetings = (): MeetingsContextProps => {
  const context = useContext(MeetingsContext);
  if (!context) {
    throw new Error('useMeetings must be used within a MeetingsProvider');
  }
  return context;
};