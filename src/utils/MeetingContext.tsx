import React, { createContext, useContext, useEffect, useState } from 'react';
import { QueuedRequest, MeetingObject } from '../Constants';
import ApiClient from './Networking/APIClient';
import { AxiosResponse, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../utils/AuthContext';
import { useGlobalToast } from './UI/CustomToastProvider';

interface MeetingsContextProps {
  meetings: MeetingObject[];
  isLoadingMeetings: boolean;
  fetchMeetings: () => Promise<void>;
  selectedMeeting: MeetingObject | null;
  setSelectedMeeting: (meeting: MeetingObject | null) => void;
}

const MeetingsContext = createContext<MeetingsContextProps | undefined>(undefined);

const DEBUG_PREFIX = '[MeetingsProvider]';
const MEETINGS_STORAGE_KEY = 'cached_meetings';

export const MeetingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { showToast } = useGlobalToast();

  const [meetings, setMeetings] = useState<MeetingObject[]>([]);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState<boolean>(true);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingObject | null>(null);

  useEffect(() => {
    console.log(`${DEBUG_PREFIX} Initializing MeetingsProvider.`);
    if (user) {
        fetchMeetings();
    }
    
  }, []);

  const fetchMeetings = async () => {
    console.log(`${DEBUG_PREFIX} Fetching meetings.`);
    setIsLoadingMeetings(true);
    const request: QueuedRequest = {
      url: '/api/meetings/info',
      method: 'get',
      headers: { Authorization: `Bearer ${user?.token}` },
      retryCount: 0,
      successHandler: async (response: AxiosResponse) => {
        console.log(`${DEBUG_PREFIX} Meetings fetched successfully.`);
        const fetchedMeetings: MeetingObject[] = response.data.meetings;
        const currentTime = Math.floor(Date.now() / 1000);
        const eligibleMeetings = fetchedMeetings.filter(
          (meeting) => currentTime >= meeting.time_start && currentTime <= meeting.time_end
        );
        setMeetings(eligibleMeetings);
        await cacheMeetings(eligibleMeetings);
        setIsLoadingMeetings(false);
      },
      errorHandler: async (error: AxiosError) => {
        console.error(`${DEBUG_PREFIX} Error fetching meetings:`, error);
        showToast({
          title: 'Error',
          description: 'Failed to fetch meetings. Loading cached meetings if available.',
          type: 'error',
        });
        await loadCachedMeetings();
        setIsLoadingMeetings(false);
      },
      offlineHandler: async () => {
        console.error(`${DEBUG_PREFIX} Offline, loading cached meetings.`);
        showToast({
          title: 'Offline',
          description: 'You are offline. Loaded cached meetings.',
          type: 'error',
        });
        await loadCachedMeetings();
        setIsLoadingMeetings(false);
      },
    };

    try {
      await ApiClient.handleRequest(request);
    } catch (error) {
      console.error(`${DEBUG_PREFIX} Exception fetching meetings:`, error);
      await loadCachedMeetings();
      setIsLoadingMeetings(false);
    }
  };

  const cacheMeetings = async (meetingsToCache: MeetingObject[]) => {
    try {
      await AsyncStorage.setItem(MEETINGS_STORAGE_KEY, JSON.stringify(meetingsToCache));
      console.log(`${DEBUG_PREFIX} Meetings cached successfully.`);
    } catch (error) {
      console.error(`${DEBUG_PREFIX} Error caching meetings:`, error);
    }
  };

  const loadCachedMeetings = async () => {
    try {
      const cachedData = await AsyncStorage.getItem(MEETINGS_STORAGE_KEY);
      if (cachedData) {
        const cachedMeetings: MeetingObject[] = JSON.parse(cachedData);
        setMeetings(cachedMeetings);
        console.log(`${DEBUG_PREFIX} Loaded meetings from cache.`);
      } else {
        console.warn(`${DEBUG_PREFIX} No cached meetings found.`);
        showToast({
          title: 'No Data',
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
      }}
    >
      {children}
    </MeetingsContext.Provider>
  );
};

export const useMeetings = (): MeetingsContextProps => {
  const context = useContext(MeetingsContext);
  if (context === undefined) {
    throw new Error('useMeetings must be used within a MeetingsProvider');
  }
  return context;
};