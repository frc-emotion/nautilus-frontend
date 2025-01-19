import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  useMemo,
  useRef
} from 'react';
import { useGlobalToast } from '../UI/CustomToastProvider';
import { useGlobalModal } from '../UI/CustomModalProvider';
import { AxiosResponse, AxiosError } from 'axios';
import { QueuedRequest, UpdateContextProps, UpdateInfo } from '@/src/Constants';
import DeviceInfo from 'react-native-device-info';
import { Linking } from 'react-native';
import { useNetworking } from './NetworkingContext';
import * as Sentry from '@sentry/react-native';

const UpdateContext = createContext<UpdateContextProps | undefined>(undefined);
const DEBUG_PREFIX = '[UpdateProvider]';

export const UpdateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { openToast } = useGlobalToast();
  const { openModal } = useGlobalModal();
  const { handleRequest } = useNetworking();

  const [isOutOfDate, setIsOutOfDate] = useState<boolean>(false);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [updateURL, setUpdateURL] = useState<string | null>(null);

  /**
   * Use a ref so we only check version once per session, 
   * unless you want to allow multiple checks.
   */
  const hasCheckedVersion = useRef(false);

  /**
   * Compare two semver-ish strings. 
   * Returns true if currentVersion < latestVersion.
   */
  const isVersionOutdated = useCallback(
    (currentVersion: string, latestVersion: string): boolean => {
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
    },
    []
  );

  /**
   * Only call this from AppInitializer (or wherever) 
   * AFTER networking is known to be online or offline.
   */
  const checkAppVersion = useCallback(async () => {
    if (hasCheckedVersion.current) {
      return;
    }
    hasCheckedVersion.current = true;

    console.log(`${DEBUG_PREFIX} Starting version check.`);

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

        // e.g. data.update_url = { android: "...", ios: "..." }
        const systemName = DeviceInfo.getSystemName().toLowerCase() as 'android' | 'ios';
        setUpdateURL(data.update_url[systemName] || null);

        if (isVersionOutdated(currentVersion, data.version)) {
          setIsOutOfDate(true);
          console.warn(`${DEBUG_PREFIX} App is out of date.`);

          openToast({
            title: 'Update Available',
            description: 'A newer version of the app is available. Please update.',
            type: 'warning',
          });
          openModal({
            title: 'Update Available',
            message: 'A newer version of the app is available. Please update.',
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
      // If we’re offline at the time of request
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

  /**
   * If we have an updateURL, 
   * open it in the browser or store listing.
   */
  const openUpdateURL = useCallback(() => {
    if (updateURL) {
      Linking.openURL(updateURL);
    }
  }, [updateURL]);

  const contextValue = useMemo<UpdateContextProps>(() => ({
    isOutOfDate,
    latestVersion,
    openUpdateURL,
    checkAppVersion,
  }), [isOutOfDate, latestVersion, openUpdateURL, checkAppVersion]);

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