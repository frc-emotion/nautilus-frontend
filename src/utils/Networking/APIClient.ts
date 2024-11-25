import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';
import { QueuedRequest, UserObject } from '../../Constants';

const API_URL = Constants.expoConfig?.extra?.API_URL || "http://localhost:7001";
const MAX_RETRIES = Constants.expoConfig?.extra?.MAX_RETRIES || 3;
const REQUEST_TIMEOUT = 5000; // 5 seconds
const DEBUG_PREFIX = '[ApiClient]';
const REQUEST_QUEUE_KEY = 'REQUEST_QUEUE';

class ApiClient {
  private client: AxiosInstance;
  private requestQueue: QueuedRequest[] = [];
  private isConnected: boolean = true;

  constructor(baseURL: string) {
    console.log(`${DEBUG_PREFIX} Initializing with base URL: ${baseURL}`);
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `Nautilus/${DeviceInfo.getVersion()} (${Platform.OS}; React Native)`,
      },
      timeout: REQUEST_TIMEOUT,
    });

    this.setupInterceptors();
    this.initialize();
  }

  private setupInterceptors() {
    // Request Interceptor: Attach Authorization token
    this.client.interceptors.request.use(
      async (config) => {
        const userData = await AsyncStorage.getItem("userData");
        if (userData) {
          const parsedUser: UserObject = JSON.parse(userData);
          if (parsedUser.token) {
            config.headers['Authorization'] = `Bearer ${parsedUser.token}`;
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response Interceptor: Handle 401 Unauthorized globally
    this.client.interceptors.response.use(
      response => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          console.warn(`${DEBUG_PREFIX} Unauthorized access - possibly invalid token.`);
          // Additional global handling can be added here
        }
        return Promise.reject(error);
      }
    );
  }

  public async connected(): Promise<boolean> {
    return this.isConnected;
  }

  private async initialize() {
    await this.loadRequestQueue();
    NetInfo.addEventListener(this.handleConnectivityChange.bind(this));
  }

  private async handleConnectivityChange(state: NetInfoState) {
    const wasConnected = this.isConnected;
    this.isConnected = !!(state.isConnected && state.isInternetReachable);

    console.log(
      `${DEBUG_PREFIX} Network status changed: isConnected = ${state.isConnected} | isInternetReachable = ${state.isInternetReachable}`
    );

    if (this.isConnected && !wasConnected) {
      this.processRequestQueue();
    }
  }

  // Queue Management
  private async loadRequestQueue() {
    try {
      const savedQueue = await AsyncStorage.getItem(REQUEST_QUEUE_KEY);
      this.requestQueue = savedQueue ? JSON.parse(savedQueue) : [];
      console.log(`${DEBUG_PREFIX} Loaded request queue with ${this.requestQueue.length} items.`);
    } catch (error) {
      console.error(`${DEBUG_PREFIX} Failed to load request queue:`, error);
    }
  }

  private async saveRequestQueue() {
    try {
      await AsyncStorage.setItem(REQUEST_QUEUE_KEY, JSON.stringify(this.requestQueue));
      console.log(`${DEBUG_PREFIX} Saved request queue.`);
    } catch (error) {
      console.error(`${DEBUG_PREFIX} Failed to save request queue:`, error);
    }
  }

  private async enqueueRequest(request: QueuedRequest) {
    console.log(`${DEBUG_PREFIX} Enqueuing request: [${request.method.toUpperCase()}] ${request.url}`);
    this.requestQueue.push(request);
    await this.saveRequestQueue();
  }

  private async dequeueRequest() {
    return this.requestQueue.shift();
  }

  private async processRequestQueue() {
    if (this.requestQueue.length === 0) {
      console.log(`${DEBUG_PREFIX} No queued requests to process.`);
      return;
    }

    console.log(`${DEBUG_PREFIX} Processing ${this.requestQueue.length} queued requests.`);

    const queueCopy = [...this.requestQueue];
    this.requestQueue = [];
    await this.saveRequestQueue();

    for (const request of queueCopy) {
      try {
        await this.executeRequest(request);
      } catch (error) {
        if (request.retryCount < MAX_RETRIES) {
          console.warn(
            `${DEBUG_PREFIX} Retry ${request.retryCount + 1}/${MAX_RETRIES} for request: ${request.url}`
          );
          await this.enqueueRequest({ ...request, retryCount: request.retryCount + 1 });
        } else {
          console.error(`${DEBUG_PREFIX} Max retries reached for request: ${request.url}`);
          request.errorHandler && await request.errorHandler(error);
        }
      }
    }
  }

  // Request Execution
  private async executeRequest(request: QueuedRequest): Promise<AxiosResponse<any>> {
    const { url, method, data, headers, config, successHandler, errorHandler } = request;

    try {
      let response: AxiosResponse<any>;

      switch (method.toLowerCase()) {
        case 'get':
          response = await this.client.get(url, { headers, ...config });
          break;
        case 'post':
          response = await this.client.post(url, data, { headers, ...config });
          break;
        case 'put':
          response = await this.client.put(url, data, { headers, ...config });
          break;
        case 'delete':
          response = await this.client.delete(url, { headers, data, ...config });
          break;
        default:
          throw new Error(`${DEBUG_PREFIX} Unsupported HTTP method: ${method}`);
      }

      console.log(`${DEBUG_PREFIX} Successfully executed [${method.toUpperCase()}] ${url}`);
      successHandler && await successHandler(response);
      return response;
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;

        // Non-retryable errors
        if (statusCode && (statusCode < 500 || statusCode >= 600)) {
          console.error(`${DEBUG_PREFIX} Non-retryable error [${statusCode}] for request: ${url}`);
          errorHandler && await errorHandler(error);
          return Promise.reject(error);
        }

        // Retryable errors (e.g., network issues, 5xx server errors)
        console.warn(`${DEBUG_PREFIX} Retryable error for request: ${url} | Status: ${statusCode || 'N/A'}`);
      } else {
        console.error(`${DEBUG_PREFIX} Unknown error for request: ${url}`, error);
      }

      return Promise.reject(error);
    }
  }

  // Public Method to Handle New Requests
  public async handleRequest(request: QueuedRequest) {
    const isDuplicate = this.requestQueue.some(queuedRequest =>
      queuedRequest.url === request.url &&
      queuedRequest.method === request.method &&
      JSON.stringify(queuedRequest.data) === JSON.stringify(request.data)
    );

    if (isDuplicate) {
      console.log(`${DEBUG_PREFIX} Duplicate request detected and ignored: ${request.url}`);
      request.offlineHandler && await request.offlineHandler();
      return;
    }

    if (!this.isConnected) {
      console.log(`${DEBUG_PREFIX} Offline. Queuing request: ${request.url}`);
      request.offlineHandler && await request.offlineHandler();
      await this.enqueueRequest(request);
      return;
    }

    try {
      await this.executeRequest(request);
    } catch (error) {
      console.error(`${DEBUG_PREFIX} Error executing request: ${request.url}`, error);
      request.errorHandler && await request.errorHandler(error);
    }
  }

  // Token Validation
  public async validateToken(token: string): Promise<UserObject | null> {
    try {
      console.log(`${DEBUG_PREFIX} Starting token validation.`);
      
      const payload = this.decodeJWT(token);
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

      if (this.isConnected) {
        console.log(`${DEBUG_PREFIX} Performing online token validation.`);
        const response = await this.client.get('/api/account/validate', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status !== 200) {
          console.warn(`${DEBUG_PREFIX} Server validation failed with status: ${response.status}`);
          return null;
        }

        const { user } = response.data;
        await AsyncStorage.setItem("userData", JSON.stringify(user));
        console.log(`${DEBUG_PREFIX} User data updated in storage.`);
        return user as UserObject;
      }

      console.log(`${DEBUG_PREFIX} Skipping online validation due to offline status.`);
      const storedUser = await AsyncStorage.getItem("userData");
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
      console.error(`${DEBUG_PREFIX} Token validation encountered an error:`, error);
      return null;
    }
  }

  private decodeJWT(token: string): any | null {
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
      console.error(`${DEBUG_PREFIX} Failed to decode JWT:`, error);
      return null;
    }
  }
}

export default new ApiClient(API_URL);