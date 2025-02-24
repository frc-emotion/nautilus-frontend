import React, { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { QueuedRequest, MeetingObject, MeetingsContextProps, MEETINGS_STORAGE_KEY } from '../../Constants';
import { AxiosResponse, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { useGlobalToast } from '../UI/CustomToastProvider';
import { handleErrorWithModalOrToast } from '../Helpers';
import { useGlobalModal } from '../UI/CustomModalProvider';
import { useNetworking } from './NetworkingContext';
import * as Sentry from '@sentry/react-native';

const MeetingsContext = createContext<MeetingsContextProps | undefined>(undefined);
const DEBUG_PREFIX = '[MeetingsProvider]';

export const MeetingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { openToast } = useGlobalToast();
  const { openModal } = useGlobalModal();
  const { handleRequest } = useNetworking();

  const [meetings, setMeetings] = useState<MeetingObject[]>([]);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState<boolean>(false);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingObject | null>(null);

  const hasInitialized = useRef(false);

  const cacheMeetings = useCallback(async (meetingsToCache: MeetingObject[]) => {
    try {
      await AsyncStorage.setItem(MEETINGS_STORAGE_KEY, JSON.stringify(meetingsToCache));
      console.log(`${DEBUG_PREFIX} Meetings cached successfully.`);
    } catch (error) {
      Sentry.captureException(error);
      console.error(`${DEBUG_PREFIX} Error caching meetings:`, error);
    }
  }, []);

  const loadCachedMeetings = useCallback(async () => {
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
      Sentry.captureException(error);
      console.error(`${DEBUG_PREFIX} Error loading cached meetings:`, error);
    }
  }, [openToast]);

  const fetchMeetings = useCallback(async () => {
    console.log(`${DEBUG_PREFIX} Fetching meetings from API...`);
    setIsLoadingMeetings(true);

    if (!user || user.role === 'unverified') {
      console.warn(`${DEBUG_PREFIX} Initialization skipped: User is unverified or undefined.`);
      setIsLoadingMeetings(false);
      return;
    }

    const url = (user && (user.role === 'admin' || user.role === 'leadership' || user.role === 'advisor' || user.role === 'executive'))
      ? '/api/meetings/'
      : '/api/meetings/info';

    const request: QueuedRequest = {
      url: url,
      method: 'get',
      retryCount: 0,
      successHandler: async (response: AxiosResponse) => {
        console.log(`${DEBUG_PREFIX} Meetings fetched successfully.`);
        const fetchedMeetings: MeetingObject[] = response.data.data.meetings;
        setMeetings(fetchedMeetings);
        await cacheMeetings(fetchedMeetings);
      },
      errorHandler: async (error: AxiosError) => {
        Sentry.captureException(error);
        console.error(`${DEBUG_PREFIX} API error while fetching meetings:`, error.message);
        handleErrorWithModalOrToast({
          actionName: 'Fetch Meetings',
          error,
          showModal: false,
          showToast: true,
          openModal,
          openToast,
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
      await handleRequest(request);
    } catch (error) {
      Sentry.captureException(error);
      console.error(`${DEBUG_PREFIX} Unexpected error during fetch:`, error);
      await loadCachedMeetings();
    } finally {
      setIsLoadingMeetings(false);
    }
  }, [user, openToast, openModal, handleRequest, cacheMeetings, loadCachedMeetings]);

  const init = useCallback(async () => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    console.log(`${DEBUG_PREFIX} Initializing...`);
    if (!user || user.role === 'unverified') {
      console.warn(`${DEBUG_PREFIX} Initialization skipped: User is unverified or undefined.`);
      return;
    }

    try {
      await fetchMeetings();
      console.log('Meetings context initialized successfully.');
    } catch (error) {
      Sentry.captureException(error);
      console.error(`${DEBUG_PREFIX} Initialization error:`, error);
      openToast({
        title: 'Initialization Error',
        description: 'An error occurred while initializing meetings.',
        type: 'error',
      });
    }
  }, [user, fetchMeetings, openToast]);

  // Helper to get a child (half) meeting for a given parent meeting ID
  const getChildMeeting = useCallback((parentId: number): MeetingObject | undefined => {
    return meetings.find((meeting) => meeting.parent === parentId);
  }, [meetings]);

  const value = useMemo(() => ({
    meetings,
    isLoadingMeetings,
    fetchMeetings,
    selectedMeeting,
    setSelectedMeeting,
    init,
    getChildMeeting, // <-- Expose the helper
  }), [meetings, isLoadingMeetings, fetchMeetings, selectedMeeting, init, getChildMeeting]);

  return (
    <MeetingsContext.Provider value={value}>
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