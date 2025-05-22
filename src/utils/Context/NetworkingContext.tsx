import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
  useMemo,
  useRef
} from "react";
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import NetInfo from "@react-native-community/netinfo";
import { Platform } from "react-native";
import DeviceInfo from "react-native-device-info";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Buffer } from "buffer";
import { NetworkingContextProps, QueuedRequest, UserObject } from "../../Constants";
import * as Sentry from "@sentry/react-native";

const API_URL = Constants.expoConfig?.extra?.API_URL || "https://api.team2658.org";
// const API_URL = "http://localhost:7001";
export const CLEAN_API_URL = API_URL.split('//')[1];
const MAX_RETRIES = Constants.expoConfig?.extra?.MAX_RETRIES || 3;
const REQUEST_TIMEOUT = 5000;
const DEBUG_PREFIX = "[ApiClient]";
const REQUEST_QUEUE_KEY = "REQUEST_QUEUE";

/** 
 * How many times do we poll for connectivity 
 * before giving up? (When isConnected===null.)
 */
const MAX_CONNECTIVITY_ATTEMPTS = 5;
const CONNECTIVITY_RETRY_DELAY_MS = 1000;

const NetworkingContext = createContext<NetworkingContextProps | undefined>(undefined);

export const NetworkingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requestQueue, setRequestQueue] = useState<QueuedRequest[]>([]);
  const clientRef = useRef<AxiosInstance | null>(null);

  // Create axios client once
  if (!clientRef.current) {
    console.log(`${DEBUG_PREFIX} Initializing with base URL: ${API_URL}`);
    clientRef.current = axios.create({
      baseURL: API_URL,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": `Nautilus/${DeviceInfo.getVersion()} (${Platform.OS}; React Native)`
      },
      timeout: REQUEST_TIMEOUT
    });
  }
  const client = clientRef.current!;

  // Attach token from AsyncStorage (if any)
  useEffect(() => {
    const interceptor = client.interceptors.request.use(
      async (config: AxiosRequestConfig) => {
        const userData = await AsyncStorage.getItem("userData");
        if (userData) {
          const parsedUser: UserObject = JSON.parse(userData);
          if (parsedUser.token) {
            config.headers = {
              ...config.headers,
              Authorization: `Bearer ${parsedUser.token}`
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

  // Load request queue
  useEffect(() => {
    const loadQueue = async () => {
      try {
        const savedQueue = await AsyncStorage.getItem(REQUEST_QUEUE_KEY);
        const parsedQueue = savedQueue ? JSON.parse(savedQueue) : [];
        setRequestQueue(parsedQueue);
        console.log(
          `${DEBUG_PREFIX} Loaded request queue with ${parsedQueue.length} items.`
        );
      } catch (error) {
        Sentry.captureException(error);
        console.error(`${DEBUG_PREFIX} Failed to load request queue:`, error);
      }
    };
    loadQueue();
  }, []);

  /**
   * NetInfo connectivity changes
   */
  const handleConnectivityChange = useCallback((state) => {
    const wasConnected = isConnected;
    const newConnectionState = !!(state.isConnected && state.isInternetReachable);
    if (wasConnected !== newConnectionState) {
      setIsConnected(newConnectionState);
      console.log(
        `${DEBUG_PREFIX} Network status changed: isConnected = ${state.isConnected}, isInternetReachable = ${state.isInternetReachable}`
      );
      if (newConnectionState && wasConnected === false) {
        // just went from offline -> online
        processRequestQueue();
      }
    }
  }, [isConnected]);

  // Check connectivity on mount, then subscribe
  useEffect(() => {
    let mounted = true;
    (async () => {
      const state = await NetInfo.fetch();
      let newConnectionState = !!(state.isConnected && state.isInternetReachable);

      // Quick re-check if not connected
      if (!newConnectionState) {
        await new Promise((res) => setTimeout(res, 500));
        const secondCheck = await NetInfo.fetch();
        newConnectionState = !!(secondCheck.isConnected && secondCheck.isInternetReachable);
      }

      if (mounted) {
        setIsConnected(newConnectionState);
        console.log(`${DEBUG_PREFIX} Initial network state: isConnected = ${newConnectionState}`);
        setIsLoading(false);

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

  /**
   * Save the request queue
   */
  const saveRequestQueue = useCallback(async (queue: QueuedRequest[]) => {
    try {
      await AsyncStorage.setItem(REQUEST_QUEUE_KEY, JSON.stringify(queue));
      console.log(`${DEBUG_PREFIX} Saved request queue.`);
    } catch (error) {
      Sentry.captureException(error);
      console.error(`${DEBUG_PREFIX} Failed to save request queue:`, error);
    }
  }, []);

  /**
   * Add a request to the queue
   */
  const enqueueRequest = useCallback(async (request: QueuedRequest) => {
    console.log(`${DEBUG_PREFIX} Enqueuing request: [${request.method.toUpperCase()}] ${request.url}`);
    setRequestQueue((prev) => {
      const newQueue = [...prev, request];
      saveRequestQueue(newQueue);
      return newQueue;
    });
  }, [saveRequestQueue]);

  /**
   * If we get a 429 (rate limit), schedule a retry
   */
  const scheduleRetryAfter = useCallback(async (request: QueuedRequest, retryAfter: number) => {
    console.log(`${DEBUG_PREFIX} Scheduling retry for request ${request.url} after ${retryAfter} seconds.`);
    setTimeout(() => {
      enqueueRequest(request).catch(console.error);
    }, retryAfter * 1000);
  }, [enqueueRequest]);

  /**
   * Log rate-limit headers
   */
  const logRateLimitHeaders = useCallback((response: AxiosResponse) => {
    const limit = response.headers["ratelimit-limit"];
    const remaining = response.headers["ratelimit-remaining"];
    const reset = response.headers["ratelimit-reset"];
    const policy = response.headers["ratelimit-policy"];
    if (limit || remaining || reset || policy) {
      console.log(`${DEBUG_PREFIX} RateLimit headers:`, {
        limit,
        remaining,
        reset,
        policy
      });
    }
  }, []);

  /**
   * Actually do the network call. 
   * If 429, handle retry-after. 
   * If other error, maybe pass to errorHandler.
   */
  const executeRequest = useCallback(async (request: QueuedRequest): Promise<AxiosResponse<any>> => {
    const { url, method, data, headers, config, successHandler, errorHandler } = request;
    console.log(`${DEBUG_PREFIX} Executing [${method.toUpperCase()}] ${url}`);
    console.log(`${DEBUG_PREFIX} Request data:`, data);

    try {
      let response: AxiosResponse<any>;
      switch (method.toLowerCase()) {
        case "get":
          response = await client.get(url, { headers, ...config });
          break;
        case "post":
          response = await client.post(url, data, { headers, ...config });
          break;
        case "put":
          response = await client.put(url, data, { headers, ...config });
          break;
        case "delete":
          response = await client.delete(url, { headers, data, ...config });
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }

      console.log(`${DEBUG_PREFIX} Successfully executed [${method.toUpperCase()}] ${url}`);
      console.log(`${DEBUG_PREFIX} Response status: ${response.status}`);
      console.log(`${DEBUG_PREFIX} Response data:`, response.data);

      logRateLimitHeaders(response);

      if (successHandler) {
        await successHandler(response);
      }
      return response;
    } catch (error: any) {
      Sentry.captureException(error);

      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        const retryAfterHeader = error.response?.headers["retry-after"];

        // If 429 => schedule a retry
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
            if (errorHandler) {
              await errorHandler(error);
            }
          }
          return Promise.reject(error);
        }

        // Non-429 => just call errorHandler if provided
        if (statusCode && statusCode !== 429) {
          console.error(`${DEBUG_PREFIX} Non-retryable error [${statusCode}] for request: ${url}`);
          if (errorHandler) {
            await errorHandler(error);
          }
          return Promise.reject(error);
        }

        console.warn(`${DEBUG_PREFIX} Potentially retryable error: ${url} | ${statusCode ?? "N/A"}`);
      } else {
        console.error(`${DEBUG_PREFIX} Unknown error for request: ${url}`, error);
      }
      return Promise.reject(error);
    }
  }, [client, logRateLimitHeaders, scheduleRetryAfter]);

  /**
   * Process requests that have .retryCount>0
   */
  const processRequestQueue = useCallback(async () => {
    if (requestQueue.length === 0) {
      console.log(`${DEBUG_PREFIX} No queued requests to process.`);
      return;
    }
    console.log(`${DEBUG_PREFIX} Processing ${requestQueue.length} queued requests.`);

    const filteredQueue = requestQueue.filter((req) => req.retryCount > 0);
    const queueCopy = [...filteredQueue];
    setRequestQueue([]);
    await saveRequestQueue([]);

    for (const request of queueCopy) {
      try {
        await executeRequest(request);
      } catch (error) {
        Sentry.captureException(error);

        if (request.retryCount < MAX_RETRIES) {
          console.warn(`${DEBUG_PREFIX} Retry ${request.retryCount + 1}/${MAX_RETRIES} for ${request.url}`);
          await enqueueRequest({ ...request, retryCount: request.retryCount + 1 });
        } else {
          console.error(`${DEBUG_PREFIX} Max retries reached for request: ${request.url}`);
          if (request.errorHandler) {
            await request.errorHandler(error);
          }
        }
      }
    }
  }, [requestQueue, saveRequestQueue, executeRequest, enqueueRequest]);

  /**
   * The main function to handle a new request.
   * If offline => queue. If unknown => try up to 5 times.
   */
  const handleRequest = useCallback(
    async (request: QueuedRequest, attempt = 0) => {
      console.log(
        `${DEBUG_PREFIX} Handling request: [${request.method.toUpperCase()}] ${request.url}, attempt=${attempt}`
      );
      console.log("Online status:", isConnected);

      // If connectivity is unknown => retry up to 5 times
      if (isConnected === null) {
        if (attempt < MAX_CONNECTIVITY_ATTEMPTS) {
          console.log(
            `${DEBUG_PREFIX} Connectivity unknown, re-trying in 1s... (attempt ${attempt + 1})`
          );
          setTimeout(() => {
            handleRequest(request, attempt + 1).catch(console.error);
          }, CONNECTIVITY_RETRY_DELAY_MS);
        } else {
          console.warn(
            `${DEBUG_PREFIX} Gave up waiting for connectivity after ${attempt} attempts. Skipping request: ${request.url}`
          );
        }
        return;
      }

      // If definitely offline => queue
      if (!isConnected) {
        console.log(`${DEBUG_PREFIX} Offline. Queuing request: ${request.url}`);
        if (request.offlineHandler) {
          await request.offlineHandler();
        }
        await enqueueRequest(request);
        return;
      }

      // Otherwise => connected => execute
      try {
        await executeRequest(request);
      } catch (error) {
        Sentry.captureException(error);
        console.error(`${DEBUG_PREFIX} Error executing request: ${request.url}`, error);
      }
    },
    [isConnected, enqueueRequest, executeRequest]
  );

  /**
   * Decode JWT offline to see if it's expired. 
   * Then if isConnected===true, confirm with server.
   */
  const decodeJWT = useCallback((token: string) => {
    try {
      const parts = token.split(".");
      if (parts.length < 2) {
        console.warn(`${DEBUG_PREFIX} JWT missing payload.`);
        return null;
      }
      const payloadBase64 = parts[1];
      const payloadJson = Buffer.from(payloadBase64, "base64").toString("utf-8");
      const payload = JSON.parse(payloadJson);
      console.log(`${DEBUG_PREFIX} Decoded JWT payload successfully.`);
      return payload;
    } catch (error) {
      Sentry.captureException(error);
      console.error(`${DEBUG_PREFIX} Failed to decode JWT:`, error);
      return null;
    }
  }, []);

  const validateToken = useCallback(
    async (token: string): Promise<UserObject | null> => {
      try {
        console.log(`${DEBUG_PREFIX} Starting token validation.`);
        const payload = decodeJWT(token);
        if (!payload || !payload.exp) {
          console.warn(`${DEBUG_PREFIX} Token payload invalid.`);
          return null;
        }
        const nowSec = Math.floor(Date.now() / 1000);
        if (payload.exp < nowSec) {
          console.warn(`${DEBUG_PREFIX} Token expired.`);
          return null;
        }
        console.log(`${DEBUG_PREFIX} Token is valid offline.`);

        if (isConnected) {
          console.log(`${DEBUG_PREFIX} Performing online token validation.`);
          const response = await client.get("/api/account/validate", {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (response.status !== 200) {
            console.warn(`${DEBUG_PREFIX} Server validation failed: ${response.status}`);
            return null;
          }
          const user = response.data.data.user;
          await AsyncStorage.setItem("userData", JSON.stringify(user));
          console.log(`${DEBUG_PREFIX} Updated userData in storage.`);
          return user;
        }

        // If offline => fallback to stored user
        console.log(`${DEBUG_PREFIX} Offline => skipping server check.`);
        const storedUser = await AsyncStorage.getItem("userData");
        return storedUser ? JSON.parse(storedUser) : null;
      } catch (error) {
        Sentry.captureException(error);
        console.error(`${DEBUG_PREFIX} Error validating token:`, error);
        return null;
      }
    },
    [isConnected, client, decodeJWT]
  );

  const value = useMemo(
    () => ({
      handleRequest,
      validateToken,
      isConnected: isConnected ?? false,
      isLoading,
      client,
    }),
    [handleRequest, validateToken, isConnected, isLoading, client]
  );

  return (
    <NetworkingContext.Provider value={value}>
      {children}
    </NetworkingContext.Provider>
  );
};

export const useNetworking = (): NetworkingContextProps => {
  const ctx = useContext(NetworkingContext);
  if (!ctx) {
    throw new Error("useNetworking must be used inside a NetworkingProvider");
  }
  return ctx;
};