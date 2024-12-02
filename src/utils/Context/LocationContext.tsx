import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import * as Location from 'expo-location';
import { useGlobalToast } from '@/src/utils/UI/CustomToastProvider';
import { LocationContextProps } from '@/src/Constants';
import { useModal } from '../UI/CustomModalProvider';
import { AppLifecycle } from 'react-native-applifecycle';
import { Platform } from 'react-native';

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
    console.log(`${DEBUG_PREFIX} Checking location services.`);
    try {
      const currentPermissions = await Location.getForegroundPermissionsAsync();
      const isEnabled = await Location.hasServicesEnabledAsync();

      if (!isEnabled) {
        console.log(`${DEBUG_PREFIX} Location services are disabled.`);
        updateLocationStatus('disabled');
      }

      if (currentPermissions.status === 'denied') {
        console.log(`${DEBUG_PREFIX} Location permissions denied.`);
        updateLocationStatus('unauthorized');
      }

      if (currentPermissions.status === 'granted') {
        console.log(`${DEBUG_PREFIX} Location permissions granted.`);
        updateLocationStatus('enabled');
      }

      if (currentPermissions.status === 'undetermined') {
        console.log(`${DEBUG_PREFIX} Location permissions undetermined.`);
        updateLocationStatus('unknown');
      }

    } catch (error) {
      console.error(`${DEBUG_PREFIX} Error checking location services:`, error);
      updateLocationStatus('unknown');
    }
  }


  const requestLocationServices = async () => {
    console.log(`${DEBUG_PREFIX} Checking location services status.`);
    try {
      console.log(`${DEBUG_PREFIX} Requesting location permissions.`);
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log(`${DEBUG_PREFIX} Location permissions status:`, status);
      const isEnabled = await Location.hasServicesEnabledAsync();
      console.log(`${DEBUG_PREFIX} Location services status:`, status, isEnabled);

      if (status === 'granted' && isEnabled) {
        console.log(`${DEBUG_PREFIX} Location services are enabled.`);
        updateLocationStatus('enabled');
      } else if (status !== 'granted') {
        console.log(`${DEBUG_PREFIX} Location permissions not granted.`);
        updateLocationStatus('unauthorized');
      } else {
        console.log(`${DEBUG_PREFIX} Location services are disabled.`);
        updateLocationStatus('disabled');
      }
    } catch (error) {
      console.error(`${DEBUG_PREFIX} Error checking location services:`, error);
      updateLocationStatus('unknown');
    }
  };

  const startPolling = () => {
    if (!pollingIntervalRef.current) {
      console.log(`${DEBUG_PREFIX} Starting location polling.`);
      pollingIntervalRef.current = setInterval(async () => {
        await requestLocationServices();
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
    requestLocationServices();
    if (Platform.OS === 'ios') {
      monitorLocationServices();
      startPolling();
    }

    const appStateListener = AppLifecycle.addEventListener('change', (state) => {
      console.log(`${DEBUG_PREFIX} App state changed:`, state);
      if (state === 'active') {
        console.log(`${DEBUG_PREFIX} App is active. Rechecking location services.`);
        checkLocationServices();
      }
    });

    return () => {
      console.log(`${DEBUG_PREFIX} Cleaning up.`);
      appStateListener.remove();
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove();
        locationSubscriptionRef.current = null;
      }
      stopPolling();
    };
  }, []);

  const contextValue: LocationContextProps = {
    locationStatus,
    checkLocationServices,
  };

  return <LocationContext.Provider value={contextValue}>{children}</LocationContext.Provider>;
};