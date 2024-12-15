import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useGlobalToast } from '../UI/CustomToastProvider';
import { useModal } from '../UI/CustomModalProvider';
import { AxiosResponse, AxiosError } from 'axios';
import { QueuedRequest, UpdateContextProps, UpdateInfo } from '@/src/Constants';
import DeviceInfo from 'react-native-device-info';
import NetInfo from '@react-native-community/netinfo';
import { Linking } from 'react-native';
import { useNetworking } from './NetworkingContext';
import * as Sentry from '@sentry/react-native';

const UpdateContext = createContext<UpdateContextProps | undefined>(undefined);
const DEBUG_PREFIX = '[UpdateProvider]';

export const UpdateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { openToast } = useGlobalToast();
  const { openModal } = useModal();
  const { handleRequest } = useNetworking();

  const [isOutOfDate, setIsOutOfDate] = useState<boolean>(false);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [updateURL, setUpdateURL] = useState<string | null>(null);

  const hasCheckedVersion = useRef(false);

  const isVersionOutdated = useCallback((currentVersion: string, latestVersion: string): boolean => {
    const currParts = currentVersion.split('.').map(Number);
    const latestParts = latestVersion.split('.').map(Number);

    for (let i = 0; i < latestParts.length; i++) {
      if ((currParts[i] || 0) < latestParts[i]) {
        return true;
      } else if ((currParts[i] || 0) > latestParts[i]) {
        return false;
      }
    }
    return false;
  }, []);

  const checkAppVersion = useCallback(async () => {
    if (hasCheckedVersion.current) {
      return; 
    }

    console.log(`${DEBUG_PREFIX} Starting version check.`);
    hasCheckedVersion.current = true;
    
    const state = await NetInfo.fetch();
    if (!state.isConnected) {
      console.log(`${DEBUG_PREFIX} No internet connection. Skipping version check.`);
      return;
    }

    const currentVersion = DeviceInfo.getVersion();
    console.log(`${DEBUG_PREFIX} Current app version: ${currentVersion}`);

    const request: QueuedRequest = {
      url: '/version',
      method: 'get',
      retryCount: 0,
      successHandler: async (response: AxiosResponse<UpdateInfo>) => {
        const data = response.data;
        console.log(`${DEBUG_PREFIX} Received version data:`, data);
        setLatestVersion(data.version);
        setUpdateURL(data.update_url[DeviceInfo.getSystemName().toLowerCase() as 'android' | 'ios']);

        if (isVersionOutdated(currentVersion, data.version)) {
          setIsOutOfDate(true);
          console.warn(`${DEBUG_PREFIX} App is out of date.`);
          openToast({
            title: 'Update Available',
            description: 'A newer version of the app is available. Please update to avoid any problems.',
            type: 'warning',
          });
          openModal({
            title: 'Update Available',
            message: 'A newer version of the app is available. Please update to avoid any problems.',
            type: 'warning',
          });
        } else {
          setIsOutOfDate(false);
          console.log(`${DEBUG_PREFIX} App is up to date.`);
        }
      },
      errorHandler: async (error: AxiosError) => {
        Sentry.captureException(error);
        console.error(`${DEBUG_PREFIX} Error fetching version info:`, error);
      },
      offlineHandler: async () => {
        console.warn(`${DEBUG_PREFIX} Offline during version check. Skipping.`);
      },
    };

    try {
      await handleRequest(request);
    } catch (error) {
      Sentry.captureException(error);
      console.error(`${DEBUG_PREFIX} Unexpected error during version check:`, error);
    }
  }, [handleRequest, isVersionOutdated, openModal, openToast]);

  const openUpdateURL = useCallback(() => {
    if (updateURL) {
      Linking.openURL(updateURL);
    }
  }, [updateURL]);

  const contextValue = useMemo(() => ({
    isOutOfDate,
    latestVersion,
    openUpdateURL,
    checkAppVersion,
  }), [isOutOfDate, latestVersion, openUpdateURL]);

  return (
    <UpdateContext.Provider value={contextValue}>
      {children}
    </UpdateContext.Provider>
  );
};

export const useUpdate = (): UpdateContextProps => {
  const context = useContext(UpdateContext);
  if (!context) {
    throw new Error('useUpdate must be used within an UpdateProvider');
  }
  return context;
};