import React, { createContext, useContext, useEffect, useState } from 'react';
import { useGlobalToast } from '../UI/CustomToastProvider';
import { useModal } from '../UI/CustomModalProvider';
import ApiClient from '../Networking/APIClient';
import { AxiosResponse, AxiosError } from 'axios';
import { QueuedRequest, UpdateContextProps, UpdateInfo } from '@/src/Constants';
import DeviceInfo from 'react-native-device-info';
import NetInfo from '@react-native-community/netinfo';
import { Linking } from 'react-native';

const UpdateContext = createContext<UpdateContextProps | undefined>(undefined);
const DEBUG_PREFIX = '[UpdateProvider]';

export const UpdateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { openToast } = useGlobalToast();
  const { openModal } = useModal();
  const [isOutOfDate, setIsOutOfDate] = useState<boolean>(false);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [updateURL, setUpdateURL] = useState<string | null>(null);

  const checkAppVersion = async () => {
    console.log(`${DEBUG_PREFIX} Starting version check.`);
    
    // Check network connectivity
    const state = await NetInfo.fetch();
    if (!state.isConnected) {
      console.log(`${DEBUG_PREFIX} No internet connection. Skipping version check.`);
      return;
    }

    // Get current app version
    const currentVersion = DeviceInfo.getVersion(); // e.g., "1.0.0"
    console.log(`${DEBUG_PREFIX} Current app version: ${currentVersion}`);

    // Define the API endpoint to fetch the latest version
    const request: QueuedRequest = {
      url: '/version', // Ensure this endpoint returns the version info as per your backend
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
        console.error(`${DEBUG_PREFIX} Error fetching version info:`, error);
        // Ignore version check on error
      },
      offlineHandler: async () => {
        console.warn(`${DEBUG_PREFIX} Offline during version check. Skipping.`);
        // Do not set isOutOfDate
      },
    };

    try {
      await ApiClient.handleRequest(request);
    } catch (error) {
      console.error(`${DEBUG_PREFIX} Unexpected error during version check:`, error);
      // Ignore version check on unexpected errors
    }
  };

  const openUpdateURL = () => {
    if (updateURL) {
      Linking.openURL(updateURL);
    }
  }

  /**
   * Compares two semantic version strings.
   * Returns true if currentVersion is less than latestVersion.
   */
  const isVersionOutdated = (currentVersion: string, latestVersion: string): boolean => {
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
  };

  useEffect(() => {
    checkAppVersion();
  }, []);

  const contextValue: UpdateContextProps = {
    isOutOfDate,
    latestVersion,
    openUpdateURL,

  };

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
