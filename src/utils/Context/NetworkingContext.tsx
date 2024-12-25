import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo, useRef } from 'react';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';
import { NetworkingContextProps, QueuedRequest, UserObject } from '../../Constants';
import * as Sentry from '@sentry/react-native';

const API_URL = Constants.expoConfig?.extra?.API_URL || "http://localhost:7001";
export const CLEAN_API_URL = API_URL.split('//')[1];
const MAX_RETRIES = Constants.expoConfig?.extra?.MAX_RETRIES || 3;
const REQUEST_TIMEOUT = 5000;
const DEBUG_PREFIX = '[ApiClient]';
const REQUEST_QUEUE_KEY = 'REQUEST_QUEUE';

const NetworkingContext = createContext<NetworkingContextProps | undefined>(undefined);

export const NetworkingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [requestQueue, setRequestQueue] = useState<QueuedRequest[]>([]);
  const clientRef = useRef<AxiosInstance | null>(null);

  if (!clientRef.current) {
    console.log(`${DEBUG_PREFIX} Initializing with base URL: ${API_URL}`);
    clientRef.current = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `Nautilus/${DeviceInfo.getVersion()} (${Platform.OS}; React Native)`,
      },
      timeout: REQUEST_TIMEOUT,
    });
  }

  const client = clientRef.current!;

  useEffect(() => {
    const interceptor = client.interceptors.request.use(
      async (config: AxiosRequestConfig): Promise<AxiosRequestConfig> => {
        const userData = await AsyncStorage.getItem("userData");
        if (userData) {
          const parsedUser: UserObject = JSON.parse(userData);
          if (parsedUser.token) {
            config.headers = {
              ...config.headers,
              Authorization: `Bearer ${parsedUser.token}`,
            };
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    return () => {
      client.interceptors.request.eject(interceptor);
    };
  }, [client]);

  useEffect(() => {
    const loadQueue = async () => {
      try {
        const savedQueue = await AsyncStorage.getItem(REQUEST_QUEUE_KEY);
        const parsedQueue = savedQueue ? JSON.parse(savedQueue) : [];
        setRequestQueue(parsedQueue);
        console.log(`${DEBUG_PREFIX} Loaded request queue with ${parsedQueue.length} items.`);
      } catch (error) {
        Sentry.captureException(error);
        console.error(`${DEBUG_PREFIX} Failed to load request queue:`, error);
      }
    };
    loadQueue();
  }, []);

  const handleConnectivityChange = useCallback((state: { isConnected: any; isInternetReachable: any; }) => {
    const wasConnected = isConnected;
    const newConnectionState = !!(state.isConnected);
    if (wasConnected !== newConnectionState) {
      setIsConnected(newConnectionState);
      console.log(
        `${DEBUG_PREFIX} Network status changed: isConnected = ${state.isConnected}, isInternetReachable = ${state.isInternetReachable}`
      );
      if (newConnectionState && wasConnected === false) {
        processRequestQueue();
      }
    }
  }, [isConnected]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const state = await NetInfo.fetch();
      let newConnectionState = !!(state.isConnected && state.isInternetReachable);

      if (!newConnectionState) {
        await new Promise(res => setTimeout(res, 500));
        const secondCheck = await NetInfo.fetch();
        newConnectionState = !!(secondCheck.isConnected && secondCheck.isInternetReachable);
      }

      if (mounted) {
        setIsConnected(newConnectionState);
        console.log(`${DEBUG_PREFIX} Initial network state: isConnected = ${newConnectionState}`);
        if (newConnectionState) {
          processRequestQueue();
        }
      }
    })();

    const unsubscribe = NetInfo.addEventListener(handleConnectivityChange);
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [handleConnectivityChange]);

  const saveRequestQueue = useCallback(async (queue: QueuedRequest[]) => {
    try {
      await AsyncStorage.setItem(REQUEST_QUEUE_KEY, JSON.stringify(queue));
      console.log(`${DEBUG_PREFIX} Saved request queue.`);
    } catch (error) {
      Sentry.captureException(error);
      console.error(`${DEBUG_PREFIX} Failed to save request queue:`, error);
    }
  }, []);

  const enqueueRequest = useCallback(async (request: QueuedRequest) => {
    console.log(`${DEBUG_PREFIX} Enqueuing request: [${request.method.toUpperCase()}] ${request.url}`);
    setRequestQueue((prev) => {
      const newQueue = [...prev, request];
      saveRequestQueue(newQueue);
      return newQueue;
    });
  }, [saveRequestQueue]);

  const scheduleRetryAfter = useCallback(async (request: QueuedRequest, retryAfter: number) => {
    console.log(`${DEBUG_PREFIX} Scheduling retry for request ${request.url} after ${retryAfter} seconds.`);
    setTimeout(() => {
      enqueueRequest(request).catch(console.error);
    }, retryAfter * 1000);
  }, [enqueueRequest]);

  const logRateLimitHeaders = useCallback((response: AxiosResponse) => {
    const rateLimitLimit = response.headers['ratelimit-limit'];
    const rateLimitRemaining = response.headers['ratelimit-remaining'];
    const rateLimitReset = response.headers['ratelimit-reset'];
    const rateLimitPolicy = response.headers['ratelimit-policy'];

    if (rateLimitLimit || rateLimitRemaining || rateLimitReset || rateLimitPolicy) {
      console.log(`${DEBUG_PREFIX} RateLimit headers:`, {
        limit: rateLimitLimit,
        remaining: rateLimitRemaining,
        reset: rateLimitReset,
        policy: rateLimitPolicy,
      });
    }
  }, []);

  const executeRequest = useCallback(async (request: QueuedRequest): Promise<AxiosResponse<any>> => {
    const { url, method, data, headers, config, successHandler, errorHandler } = request;

    try {
      let response: AxiosResponse<any>;
      switch (method.toLowerCase()) {
        case 'get':
          response = await client.get(url, { headers, ...config });
          break;
        case 'post':
          response = await client.post(url, data, { headers, ...config });
          break;
        case 'put':
          response = await client.put(url, data, { headers, ...config });
          break;
        case 'delete':
          response = await client.delete(url, { headers, data, ...config });
          break;
        default:
          throw new Error(`${DEBUG_PREFIX} Unsupported HTTP method: ${method}`);
      }

      console.log(`${DEBUG_PREFIX} Successfully executed [${method.toUpperCase()}] ${url}`);
      console.log(`${DEBUG_PREFIX} Response status: ${response.status}`);
      console.log(`${DEBUG_PREFIX} Response data:`, response.data);
      logRateLimitHeaders(response);

      successHandler && (await successHandler(response));
      return response;
    } catch (error: any) {
      Sentry.captureException(error);
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        const retryAfterHeader = error.response?.headers['retry-after'];

        if (statusCode === 429 && retryAfterHeader) {
          console.warn(`${DEBUG_PREFIX} Received 429 for request: ${request.url}`);
          let retryAfterSeconds = 0;
          const retryVal = retryAfterHeader.trim();
          if (/^\d+$/.test(retryVal)) {
            retryAfterSeconds = parseInt(retryVal, 10);
          } else {
            const retryDate = new Date(retryVal).getTime();
            const now = Date.now();
            if (retryDate > now) {
              retryAfterSeconds = Math.ceil((retryDate - now) / 1000);
            }
          }

          if (retryAfterSeconds > 0) {
            const updatedRequest = { ...request, retryCount: (request.retryCount || 0) + 1 };
            await scheduleRetryAfter(updatedRequest, retryAfterSeconds);
          } else {
            console.warn(`${DEBUG_PREFIX} Invalid Retry-After header, cannot schedule retry.`);
            errorHandler && (await errorHandler(error));
          }
          return Promise.reject(error);
        }

        if (statusCode && statusCode !== 429) {
          console.error(`${DEBUG_PREFIX} Non-retryable error [${statusCode}] for request: ${url}`);
          errorHandler && (await errorHandler(error));
          return Promise.reject(error);
        }

        console.warn(
          `${DEBUG_PREFIX} Retryable error for request: ${url} | Status: ${statusCode || 'N/A'}`
        );
      } else {
        console.error(`${DEBUG_PREFIX} Unknown error for request: ${url}`, error);
      }

      return Promise.reject(error);
    }
  }, [client, logRateLimitHeaders, scheduleRetryAfter]);

  const processRequestQueue = useCallback(async () => {
    if (requestQueue.length === 0) {
      console.log(`${DEBUG_PREFIX} No queued requests to process.`);
      return;
    }

    console.log(`${DEBUG_PREFIX} Processing ${requestQueue.length} queued requests.`);

    const filteredQueue = requestQueue.filter(req => req.retryCount > 0);

    const queueCopy = [...filteredQueue];
    setRequestQueue([]);
    await saveRequestQueue([]);

    for (const request of queueCopy) {
      try {
        await executeRequest(request);
      } catch (error) {
        Sentry.captureException(error);
        if (request.retryCount < MAX_RETRIES) {
          console.warn(
            `${DEBUG_PREFIX} Retry ${request.retryCount + 1}/${MAX_RETRIES} for request: ${request.url}`
          );
          await enqueueRequest({ ...request, retryCount: request.retryCount + 1 });
        } else {
          console.error(`${DEBUG_PREFIX} Max retries reached for request: ${request.url}`);
          request.errorHandler && (await request.errorHandler(error));
        }
      }
    }
  }, [requestQueue, saveRequestQueue, executeRequest, enqueueRequest]);

  const handleRequest = useCallback(async (request: QueuedRequest) => {
    console.log(`${DEBUG_PREFIX} Handling request: [${request.method.toUpperCase()}] ${request.url}`);
    console.log("Online status:", isConnected);

    if (isConnected === null) {
      console.log(`${DEBUG_PREFIX} Unknown connectivity. Queuing request: ${request.url}`);
      request.offlineHandler && (await request.offlineHandler());
      await enqueueRequest(request);
      return;
    }

    if (!isConnected) {
      const isDuplicate = requestQueue.some(
        (queuedRequest) =>
          queuedRequest.url === request.url &&
          queuedRequest.method === request.method &&
          JSON.stringify(queuedRequest.data) === JSON.stringify(request.data)
      );

      if (isDuplicate) {
        console.log(`${DEBUG_PREFIX} Duplicate request detected and ignored: ${request.url}`);
        request.offlineHandler && (await request.offlineHandler());
        return;
      }

      console.log(`${DEBUG_PREFIX} Offline. Queuing request: ${request.url}`);
      request.offlineHandler && (await request.offlineHandler());
      await enqueueRequest(request);
      return;
    }

    try {
      await executeRequest(request);
    } catch (error) {
      Sentry.captureException(error);
      console.error(`${DEBUG_PREFIX} Error executing request: ${request.url}`, error);
    }
  }, [isConnected, requestQueue, enqueueRequest, executeRequest]);

  const decodeJWT = useCallback((token: string): any | null => {
    try {
      const [, payloadBase64] = token.split('.');
      if (!payloadBase64) {
        console.warn(`${DEBUG_PREFIX} JWT does not contain a payload.`);
        return null;
      }

      const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf-8');
      const payload = JSON.parse(payloadJson);
      console.log(`${DEBUG_PREFIX} Successfully decoded JWT payload.`);
      return payload;
    } catch (error) {
      Sentry.captureException(error);
      console.error(`${DEBUG_PREFIX} Failed to decode JWT:`, error);
      return null;
    }
  }, []);

  const validateToken = useCallback(async (token: string): Promise<UserObject | null> => {
    try {
      console.log(`${DEBUG_PREFIX} Starting token validation.`);

      const payload = decodeJWT(token);
      if (!payload || !payload.exp) {
        console.warn(`${DEBUG_PREFIX} Token payload is invalid.`);
        return null;
      }

      const currentTime = Math.floor(Date.now() / 1000);
      if (payload.exp < currentTime) {
        console.warn(`${DEBUG_PREFIX} Token has expired.`);
        return null;
      }

      console.log(`${DEBUG_PREFIX} Token is valid offline.`);

      if (isConnected) {
        console.log(`${DEBUG_PREFIX} Performing online token validation.`);
        const response = await client.get('/api/account/validate', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status !== 200) {
          console.warn(
            `${DEBUG_PREFIX} Server validation failed with status: ${response.status}`
          );
          return null;
        }

        const user = response.data.data.user;
        await AsyncStorage.setItem("userData", JSON.stringify(user));
        console.log(`${DEBUG_PREFIX} User data updated in storage.`);
        return user as UserObject;
      }

      console.log(`${DEBUG_PREFIX} Skipping online validation due to offline status.`);
      const storedUser = await AsyncStorage.getItem("userData");
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
      Sentry.captureException(error);
      console.error(`${DEBUG_PREFIX} Token validation encountered an error:`, error);
      return null;
    }
  }, [isConnected, client, decodeJWT]);

  const value = useMemo(() => ({
    handleRequest,
    validateToken,
    isConnected: isConnected ?? false,
    client
  }), [handleRequest, validateToken, isConnected, client]);

  return (
    <NetworkingContext.Provider value={value}>
      {children}
    </NetworkingContext.Provider>
  );
};

export const useNetworking = (): NetworkingContextProps => {
  const context = useContext(NetworkingContext);
  if (!context) {
    throw new Error("useNetworking must be used within an NetworkingProvider");
  }
  return context;
};