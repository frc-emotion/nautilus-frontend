import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Location from 'expo-location';
import { useGlobalToast } from '@/src/utils/UI/CustomToastProvider';
import { LocationContextProps } from '@/src/Constants';
import { useModal } from '../UI/CustomModalProvider';

const LocationContext = createContext<LocationContextProps | undefined>(undefined);

export const useLocation = (): LocationContextProps => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

const DEBUG_PREFIX = '[GlobalLocationManager]';

export const LocationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [locationStatus, setLocationStatus] = useState<'enabled' | 'disabled' | 'unauthorized' | 'unknown'>('unknown');
  const { openToast } = useGlobalToast();
  const { openModal } = useModal();

  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const appStateRef = useRef(AppState.currentState); // Track the current app state
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastStatusRef = useRef<'enabled' | 'disabled' | 'unauthorized' | 'unknown' | null>(null);

  const updateLocationStatus = (newStatus: 'enabled' | 'disabled' | 'unauthorized' | 'unknown') => {
    if (lastStatusRef.current !== newStatus) {
      setLocationStatus(newStatus);
      lastStatusRef.current = newStatus;

      if (newStatus === 'unauthorized') {
        openToast({
          title: 'Location Unauthorized',
          description: 'Location permissions are not granted. Please enable them in settings.',
          type: 'error',
        });
        openModal({
          title: 'Location Unauthorized',
          message: 'Location permissions are not granted. Please enable them in settings.',
          type: 'error',
        });
      } else if (newStatus === 'disabled') {
        openToast({
          title: 'Location Disabled',
          description: 'Location services are turned off. Please enable them in settings.',
          type: 'error',
        });
        openModal({
          title: 'Location Disabled',
          message: 'Location services are turned off. Please enable them in settings.',
          type: 'error',
        });
      } else if (newStatus === 'enabled') {
        openToast({
          title: 'Location Enabled',
          description: 'Location services are active.',
          type: 'success',
        });
      }
    }
  };

  const checkLocationServices = async () => {
    console.log(`${DEBUG_PREFIX} Checking location services status.`);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const isEnabled = await Location.hasServicesEnabledAsync();

      if (status === 'granted' && isEnabled) {
        updateLocationStatus('enabled');
      } else if (status !== 'granted') {
        updateLocationStatus('unauthorized');
      } else {
        updateLocationStatus('disabled');
      }
    } catch (error) {
      console.error(`${DEBUG_PREFIX} Error checking location services:`, error);
      updateLocationStatus('unknown');
    }
  };

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
      console.log(`${DEBUG_PREFIX} App has come to the foreground. Rechecking location services.`);
      checkLocationServices();
    }
    appStateRef.current = nextAppState;
  };

  const startPolling = () => {
    if (!pollingIntervalRef.current) {
      console.log(`${DEBUG_PREFIX} Starting location polling.`);
      pollingIntervalRef.current = setInterval(async () => {
        await checkLocationServices();
      }, 10000); // Check every 10 seconds
    }
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      console.log(`${DEBUG_PREFIX} Stopping location polling.`);
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const monitorLocationServices = async () => {
    if (locationSubscriptionRef.current) {
      console.log(`${DEBUG_PREFIX} Subscription already active.`);
      return;
    }

    console.log(`${DEBUG_PREFIX} Starting location subscription.`);
    try {
      locationSubscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Lowest,
          timeInterval: 5000,
          distanceInterval: 0,
        },
        async () => {
          const isEnabled = await Location.hasServicesEnabledAsync();
          updateLocationStatus(isEnabled ? 'enabled' : 'disabled');
        }
      );
    } catch (error) {
      console.error(`${DEBUG_PREFIX} Error starting location subscription:`, error);
    }
  };

  useEffect(() => {
    // Perform an initial check and start monitoring
    checkLocationServices();
    monitorLocationServices();
    startPolling();

    // Listen for AppState changes using the new subscription pattern
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      console.log(`${DEBUG_PREFIX} Cleaning up.`);
      appStateSubscription.remove(); // Properly unsubscribe
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove();
        locationSubscriptionRef.current = null;
      }
      stopPolling();
    };
  }, []);

  const contextValue: LocationContextProps = {
    locationStatus,
    checkLocationStatus: async () => {
      await checkLocationServices();
    },
  };

  return <LocationContext.Provider value={contextValue}>{children}</LocationContext.Provider>;
};