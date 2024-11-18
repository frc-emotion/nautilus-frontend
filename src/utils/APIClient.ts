import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ModalConfig } from './GlobalFeedbackConfigs';
import { Buffer } from 'buffer'

const API_URL = Constants.expoConfig?.extra?.API_URL || "http://localhost:7001";
const MAX_RETRIES = Constants.expoConfig?.extra?.MAX_RETRIES || 3;
const DEBUG_PREFIX = '[ApiClient]';
const REQUEST_QUEUE_KEY = 'REQUEST_QUEUE';

export interface QueuedRequest {
  url: string;
  method: 'get' | 'post' | 'put' | 'delete';
  data?: any;
  headers?: any;
  config?: AxiosRequestConfig;
  retryCount: number;
  modalConfig?: ModalConfig;
  successHandler?: (response: AxiosResponse) => Promise<void>;
  errorHandler?: (error: any) => Promise<void>;
  offlineHandler?: () => Promise<void>;
}

class ApiClient {
  private client: AxiosInstance;
  private requestQueue: QueuedRequest[] = [];
  private isConnected = true;

  constructor(baseURL: string) {
    console.log(`${DEBUG_PREFIX} Initializing with base URL: ${baseURL}`);
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `Nautilus/${DeviceInfo.getVersion()} (${Platform.OS}; React Native)`,
      },
    });

    this.init();
  }

  private async init() {
    await this.loadQueue();
    NetInfo.addEventListener(state => {
      const wasConnected = this.isConnected;
      this.isConnected = (state.isConnected && state.isInternetReachable) || false;

      console.log(
        `${DEBUG_PREFIX} Network status changed: isConnected = ${state.isConnected} | isInternetReachable = ${state.isInternetReachable}`
      );

      if (this.isConnected && !wasConnected) {
        this.processQueue();
      }
    });

  

    // this.client.interceptors.response.use(
    //   response => response,
    //   error => {
    //     this.handleError(error);
    //     return Promise.reject(error);
    //   }
    // );
  }

  private async saveQueue() {
    try {
      await AsyncStorage.setItem(REQUEST_QUEUE_KEY, JSON.stringify(this.requestQueue));
      console.log(`${DEBUG_PREFIX} Request queue saved.`);
    } catch (error) {
      console.error(`${DEBUG_PREFIX} Failed to save request queue:`, error);
    }
  }

  private async loadQueue() {
    try {
      const savedQueue = await AsyncStorage.getItem(REQUEST_QUEUE_KEY);
      this.requestQueue = savedQueue ? JSON.parse(savedQueue) : [];
      console.log(`${DEBUG_PREFIX} Request queue loaded. Length: ${this.requestQueue.length}`);
    } catch (error) {
      console.error(`${DEBUG_PREFIX} Failed to load request queue:`, error);
    }
  }

  private async enqueueRequest(request: QueuedRequest) {
    console.log(`${DEBUG_PREFIX} Queuing request to ${request.url}`);
    this.requestQueue.push(request);
    await this.saveQueue();
  }

  private async processQueue() {
    console.log(`${DEBUG_PREFIX} Processing queued requests. Queue length: ${this.requestQueue.length}`);
    const queue = [...this.requestQueue];
    this.requestQueue = [];

    for (const request of queue) {
      try {
        await this.executeRequest(request);
      } catch (error) {
        if (request.retryCount < MAX_RETRIES) {
          console.warn(
            `${DEBUG_PREFIX} Request to ${request.url} failed. Retrying (${request.retryCount + 1}/${MAX_RETRIES})`
          );
          await this.enqueueRequest({ ...request, retryCount: request.retryCount + 1 });
        } else {
          console.error(`${DEBUG_PREFIX} Max retries reached for ${request.url}.`);
          if (request.errorHandler) await request.errorHandler(error);
        }
      }
    }

    await this.saveQueue();
  }

  private async executeRequest(request: QueuedRequest) {
    const { url, method, data, headers, config, successHandler, errorHandler } = request;
    try {
      let response: AxiosResponse;

      switch (method) {
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
          throw new Error(`${DEBUG_PREFIX} Unsupported method: ${method}`);
      }

      console.log(`${DEBUG_PREFIX} Request to ${url} succeeded.`);
      if (successHandler) await successHandler(response);
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;

        // Handle non-retryable HTTP errors
        if (statusCode) {
          console.error(`${DEBUG_PREFIX} Non-retryable error for ${url}:`, error.response?.data);
          if (errorHandler) await errorHandler(error);
          return; // Do not retry, exit the method
        }

        console.warn(
          `${DEBUG_PREFIX} Retryable error for ${url}. Status: ${statusCode || 'N/A'}`
        );
      } else {
        console.error(`${DEBUG_PREFIX} Non-Axios error for ${url}:`, error);
      }

      // If the error is retryable, throw it to trigger a retry
      throw error;
    }
  }

  // private handleError(error: AxiosError) {
  //   if (error.response) {
  //     console.error(`${DEBUG_PREFIX} API responded with error:`, error.response.data);
  //   } else if (error.request) {
  //     console.error(`${DEBUG_PREFIX} Network error. No response received.`);
  //   } else {
  //     console.error(`${DEBUG_PREFIX} Error setting up request:`, error.message);
  //   }
  // }

  public async handleNewRequest(request: QueuedRequest) {
    if (!this.isConnected) {
      console.log(`${DEBUG_PREFIX} Offline. Queuing request to ${request.url}`);
      if (request.offlineHandler) await request.offlineHandler();
      await this.enqueueRequest(request);
      return;
    }

    try {
      await this.executeRequest(request);
    } catch (error) {
      console.error(`${DEBUG_PREFIX} Error during request execution:`, error);
    }
  }

  public async get<T>(url: string, headers: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    console.log(`${DEBUG_PREFIX} Initiating GET request to ${url}`);
    const request: QueuedRequest = { url, method: 'get', headers, config, retryCount: 0 };
    await this.handleNewRequest(request);
    return this.client.get<T>(url, { headers, ...config });
  }

  public async post<T>(url: string, headers: any, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    console.log(`${DEBUG_PREFIX} Initiating POST request to ${url}`);
    const request: QueuedRequest = { url, method: 'post', headers, data, config, retryCount: 0 };
    await this.handleNewRequest(request);
    return this.client.post<T>(url, data, { headers, ...config });
  }

  public async put<T>(url: string, headers: any, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    console.log(`${DEBUG_PREFIX} Initiating PUT request to ${url}`);
    const request: QueuedRequest = { url, method: 'put', headers, data, config, retryCount: 0 };
    await this.handleNewRequest(request);
    return this.client.put<T>(url, data, { headers, ...config });
  }

  public async delete<T>(url: string, headers: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    console.log(`${DEBUG_PREFIX} Initiating DELETE request to ${url}`);
    const request: QueuedRequest = { url, method: 'delete', headers, config, retryCount: 0 };
    await this.handleNewRequest(request);
    return this.client.delete<T>(url, { headers, ...config });
  }

  /**
     * Validates the token both offline (via Base64 decoding) and online (via server verification).
     * @param token - The JWT token to validate.
     * @returns {Promise<boolean>} - Whether the token is valid.
     */
  public async validateToken(token: string): Promise<any> {
    try {
      console.log(token)
      // Step 1: Decode the JWT payload
      const payload = this.decodeToken(token);

      // Step 2: Check if the token has expired
      if (!payload || !payload.exp) {
        console.warn(`${DEBUG_PREFIX} Invalid token payload.`);
        return false;
      }

      const now = Math.floor(Date.now() / 1000); // Current time in seconds
      if (payload.exp < now) {
        console.warn(`${DEBUG_PREFIX} Token has expired.`);
        return false;
      }

      console.log(`${DEBUG_PREFIX} Token is valid offline.`);

      // Step 3: Perform server validation if online
      if (this.isConnected) {
        console.log(`${DEBUG_PREFIX} Performing online validation.`);

        console.log(`Sending: ${token}`)
        const response = await this.client.get('/api/account/validate', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status !== 200) {
          console.warn(`${DEBUG_PREFIX} Not successful in checking token with server.`);
          return false;
        }

        // Step 4: If valid token then another refreshed token is returned, we should save that
        const { user } = response.data;

        await AsyncStorage.setItem("userData", JSON.stringify(user));

        console.log("User data saved to AsyncStorage:", user);

        return user;
      }

      console.log(`${DEBUG_PREFIX} Skipping server validation (offline).`);
      return true;
    } catch (error) {
      console.error(`${DEBUG_PREFIX} Token validation failed: ${error}`);
      return false;
    }
  }

  /**
   * Decodes the JWT payload using Base64 decoding.
   * @param token - The JWT token to decode.
   * @returns {any | null} - The decoded payload or null if decoding fails.
   */
  private decodeToken(token: string): any | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.warn(`${DEBUG_PREFIX} Invalid JWT format.`);
        return null;
      }

      console.log(parts);
      const payload = parts[1];
      console.log(payload);
      const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'));
      return decoded;
    } catch (error) {
      console.error(`${DEBUG_PREFIX} Failed to decode token: ${error}`);
      return null;
    }
  }
}

export default new ApiClient(API_URL);