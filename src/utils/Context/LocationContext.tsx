import React, { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo } from 'react';
import * as Location from 'expo-location';
import { useGlobalToast } from '@/src/utils/UI/CustomToastProvider';
import { LocationContextProps } from '@/src/Constants';
import { useModal } from '../UI/CustomModalProvider';
import { AppLifecycle } from 'react-native-applifecycle';
import { Platform } from 'react-native';
import * as Sentry from '@sentry/react-native';

const LocationContext = createContext<LocationContextProps | undefined>(undefined);
const DEBUG_PREFIX = '[GlobalLocationManager]';

export const useLocation = (): LocationContextProps => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locationStatus, setLocationStatus] = useState<'enabled' | 'disabled' | 'unauthorized' | 'unknown'>('unknown');
  const { openToast } = useGlobalToast();
  const { openModal } = useModal();

  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastStatusRef = useRef<'enabled' | 'disabled' | 'unauthorized' | 'unknown' | null>(null);

  const hasStarted = useRef(false);

  const updateLocationStatus = useCallback((newStatus: 'enabled' | 'disabled' | 'unauthorized' | 'unknown') => {
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
  }, [openToast, openModal]);

  const checkLocationServices = useCallback(async () => {
    console.log(`${DEBUG_PREFIX} Checking location services.`);
    try {
      const currentPermissions = await Location.getForegroundPermissionsAsync();
      const isEnabled = await Location.hasServicesEnabledAsync();

      if (!isEnabled) {
        console.log(`${DEBUG_PREFIX} Location services are disabled.`);
        updateLocationStatus('disabled');
        return;
      }

      if (currentPermissions.status === 'denied') {
        console.log(`${DEBUG_PREFIX} Location permissions denied.`);
        updateLocationStatus('unauthorized');
        return;
      }

      if (currentPermissions.status === 'granted') {
        console.log(`${DEBUG_PREFIX} Location permissions granted.`);
        updateLocationStatus('enabled');
        return;
      }

      if (currentPermissions.status === 'undetermined') {
        console.log(`${DEBUG_PREFIX} Location permissions undetermined.`);
        updateLocationStatus('unknown');
      }

    } catch (error) {
      Sentry.captureException(error);
      console.error(`${DEBUG_PREFIX} Error checking location services:`, error);
      updateLocationStatus('unknown');
    }
  }, [updateLocationStatus]);

  const requestLocationServices = useCallback(async () => {
    console.log(`${DEBUG_PREFIX} Requesting location permissions.`);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const isEnabled = await Location.hasServicesEnabledAsync();
      console.log(`${DEBUG_PREFIX} Location permissions status: ${status}, services enabled: ${isEnabled}`);

      if (status === 'granted' && isEnabled) {
        updateLocationStatus('enabled');
      } else if (status !== 'granted') {
        updateLocationStatus('unauthorized');
      } else {
        updateLocationStatus('disabled');
      }
    } catch (error) {
      Sentry.captureException(error);
      console.error(`${DEBUG_PREFIX} Error requesting location permissions:`, error);
      updateLocationStatus('unknown');
    }
  }, [updateLocationStatus]);

  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return; 
    console.log(`${DEBUG_PREFIX} Starting location polling.`);
    pollingIntervalRef.current = setInterval(async () => {
      await requestLocationServices();
    }, 10000);
  }, [requestLocationServices]);

  const stopPolling = useCallback(() => {
    if (!pollingIntervalRef.current) return;
    console.log(`${DEBUG_PREFIX} Stopping location polling.`);
    clearInterval(pollingIntervalRef.current);
    pollingIntervalRef.current = null;
  }, []);

  const monitorLocationServices = useCallback(async () => {
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
      Sentry.captureException(error);
      console.error(`${DEBUG_PREFIX} Error starting location subscription:`, error);
    }
  }, [updateLocationStatus]);

  useEffect(() => {
    if (hasStarted.current) return; 
    hasStarted.current = true;

    (async () => {
      await requestLocationServices();
      if (Platform.OS === 'ios') {
        await monitorLocationServices();
        startPolling();
      }
    })();

    const appStateListener = AppLifecycle.addEventListener('change', (state) => {
      console.log(`${DEBUG_PREFIX} App state changed:`, state);
      if (state === 'active') {
        console.log(`${DEBUG_PREFIX} App is active. Rechecking location services.`);
        checkLocationServices().catch(console.error);
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
  }, [checkLocationServices, monitorLocationServices, requestLocationServices, startPolling, stopPolling]);

  const contextValue = useMemo(() => ({
    locationStatus,
    checkLocationServices,
  }), [locationStatus, checkLocationServices]);

  return <LocationContext.Provider value={contextValue}>{children}</LocationContext.Provider>;
};