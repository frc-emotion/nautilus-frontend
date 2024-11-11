import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import NetInfo from '@react-native-community/netinfo';
import { Alert, Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = Constants.expoConfig?.extra?.API_URL || "http://localhost:7001";
const MAX_RETRIES = Constants.expoConfig?.extra?.MAX_RETRIES || 3;
const DEBUG_PREFIX = '[APIClient]';
const REQUEST_QUEUE_KEY = 'REQUEST_QUEUE';
const FAILED_REQUESTS_KEY = 'FAILED_REQUESTS';

class ApiClient {
  private client: AxiosInstance;
  private requestQueue: QueuedRequest[] = [];
  private isConnected = true;

  constructor(baseURL: string) {
    console.log(`${DEBUG_PREFIX} Initializing with base URL: ${baseURL}`);
    this.client = axios.create({
      baseURL: baseURL,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `Nautilus/${DeviceInfo.getVersion()} (${Platform.OS}; React Native)`
      },
    });

    // Load the request queue from storage
    this.loadQueue();

    // Monitor network state
    NetInfo.addEventListener(state => {
      this.isConnected = state.isConnected || false;
      console.log(`${DEBUG_PREFIX} Network status changed: isConnected = ${this.isConnected}`);
      if (this.isConnected) {
        this.processQueue();
      }
    });

    // Interceptor for handling errors
    this.client.interceptors.response.use(
      response => {
        console.log(`${DEBUG_PREFIX} Response received:`, response);
        return response;
      },
      error => {
        console.error(`${DEBUG_PREFIX} Request error:`, error);
        this.handleError(error);
        return Promise.reject(error);
      }
    );
  }

  // Method to handle API errors
  private handleError(error: any) {
    if (error.response) {
      console.warn(`${DEBUG_PREFIX} Server responded with error: ${error.response.data.message}`);
      return Promise.reject(error)
    } else if (error.request) {
      console.error(`${DEBUG_PREFIX} Network error, no response received.`);
      Alert.alert('Error', 'Network error. Please try again.');
    } else {
      console.error(`${DEBUG_PREFIX} Error in request setup: ${error.message}`);
      Alert.alert('Error', error.message);
    }
  }

  // Method to queue requests when offline or retry failed requests
  private async enqueueRequest(request: QueuedRequest) {
    console.log(`${DEBUG_PREFIX} Queuing request to ${request.url} with retryCount = ${request.retryCount}`);
    this.requestQueue.push(request);
    await this.saveQueue();
  }

  // Method to save the request queue to AsyncStorage
  private async saveQueue() {
    try {
      const serializedQueue = JSON.stringify(this.requestQueue);
      await AsyncStorage.setItem(REQUEST_QUEUE_KEY, serializedQueue);
    } catch (error) {
      console.error(`${DEBUG_PREFIX} Failed to save request queue:`, error);
    }
  }

  // Method to load the request queue from AsyncStorage
  private async loadQueue() {
    try {
      const serializedQueue = await AsyncStorage.getItem(REQUEST_QUEUE_KEY);
      if (serializedQueue) {
        this.requestQueue = JSON.parse(serializedQueue) || [];
        console.log(`${DEBUG_PREFIX} Loaded saved request queue. Length: ${this.requestQueue.length}`);
      }
    } catch (error) {
      console.error(`${DEBUG_PREFIX} Failed to load request queue:`, error);
    }
  }

  // Retrieve all failed requests from storage
  public async getFailedRequests(): Promise<QueuedRequest[]> {
    try {
      const serializedFailedRequests = await AsyncStorage.getItem(FAILED_REQUESTS_KEY);
      return serializedFailedRequests ? JSON.parse(serializedFailedRequests) : [];
    } catch (error) {
      console.error(`${DEBUG_PREFIX} Failed to load failed requests:`, error);
      return [];
    }
  }

  // Clear a specific failed request or all failed requests
  public async clearFailedRequest(request?: QueuedRequest) {
    const failedRequests = await this.getFailedRequests();
    const updatedRequests = request
      ? failedRequests.filter((req) => req !== request)
      : []; // Clear all if no specific request is given
    await AsyncStorage.setItem(FAILED_REQUESTS_KEY, JSON.stringify(updatedRequests));
    console.log(`${DEBUG_PREFIX} Cleared failed request(s) from storage.`);
  }

  // Retry a specific failed request
  public async retryFailedRequest(request: QueuedRequest) {
    try {
      await this.executeRequest(request);
      await this.clearFailedRequest(request); // Remove from failed requests if successful
    } catch (error) {
      console.error(`${DEBUG_PREFIX} Retry failed for request to ${request.url}`);
      this.handleError(error);
    }
  }

  // Save the failed request separately
  private async saveFailedRequest(request: QueuedRequest) {
    try {
      const failedRequests = await this.getFailedRequests();
      failedRequests.push(request);
      await AsyncStorage.setItem(FAILED_REQUESTS_KEY, JSON.stringify(failedRequests));
      console.log(`${DEBUG_PREFIX} Saved failed request to storage. Total failed: ${failedRequests.length}`);
    } catch (error) {
      console.error(`${DEBUG_PREFIX} Failed to save failed request:`, error);
    }
  }

  // Method to process queued requests with retry logic
  private async processQueue() {
    console.log(`${DEBUG_PREFIX} Processing queued requests. Queue length: ${this.requestQueue.length}`);
    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift()!;
      try {
        console.log(`${DEBUG_PREFIX} Attempting queued request to ${request.url} (retryCount = ${request.retryCount})`);
        await this.executeRequest(request);
        await this.saveQueue(); // Update storage after successful request
      } catch (error) {
        if (request.retryCount < MAX_RETRIES) {
          console.warn(`${DEBUG_PREFIX} Request failed, retrying (attempt ${request.retryCount + 1} of ${MAX_RETRIES})`);
          this.enqueueRequest({ ...request, retryCount: request.retryCount + 1 });
        } else {
          console.error(`${DEBUG_PREFIX} Max retries reached for request. Moving to failed requests.`);
          await this.saveFailedRequest(request);
        }
      }
    }
    await AsyncStorage.removeItem(REQUEST_QUEUE_KEY); // Clear queue storage after processing
  }

  // Helper to execute a queued request based on its method
  private async executeRequest(request: QueuedRequest): Promise<void> {
    const { url, method, data, config } = request;
    switch (method) {
      case 'get':
        await this.client.get(url, config);
        break;
      case 'post':
        await this.client.post(url, data, config);
        break;
      case 'put':
        await this.client.put(url, data, config);
        break;
      case 'delete':
        await this.client.delete(url, { ...config, data });
        break;
      default:
        throw new Error(`${DEBUG_PREFIX} Unsupported request method: ${method}`);
    }
  }

  // Helper to perform GET request with optional query parameters
  public async get<T>(url: string, params?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    console.log(`${DEBUG_PREFIX} Initiating GET request to ${url} with params:`, params);
    if (!this.isConnected) {
      console.log(`${DEBUG_PREFIX} Offline, queuing GET request to ${url}`);
      return new Promise<AxiosResponse<T>>((resolve, reject) => {
        this.enqueueRequest({ url, method: 'get', config: { ...config, params }, retryCount: 0 })
          .then(() => {
            // Offline case: resolve with an empty response or a specific structure if needed
            resolve({ data: null } as AxiosResponse<T>);
          })
          .catch(reject);
      });
    }
    return this.client.get<T>(url, { ...config, params });
  }
  
  // Helper to perform POST request with payload support
  public async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    console.log(`${DEBUG_PREFIX} Initiating POST request to ${url} with data:`, data);
    if (!this.isConnected) {
      console.log(`${DEBUG_PREFIX} Offline, queuing POST request to ${url}`);
      return new Promise<AxiosResponse<T>>((resolve, reject) => {
        this.enqueueRequest({ url, method: 'post', data, config, retryCount: 0 })
          .then(() => {
            resolve({ data: null } as AxiosResponse<T>);
          })
          .catch(reject);
      });
    }
    return this.client.post<T>(url, data, config);
  }
  
  // Helper to perform PUT request with payload support
  public async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    console.log(`${DEBUG_PREFIX} Initiating PUT request to ${url} with data:`, data);
    if (!this.isConnected) {
      console.log(`${DEBUG_PREFIX} Offline, queuing PUT request to ${url}`);
      return new Promise<AxiosResponse<T>>((resolve, reject) => {
        this.enqueueRequest({ url, method: 'put', data, config, retryCount: 0 })
          .then(() => {
            resolve({ data: null } as AxiosResponse<T>);
          })
          .catch(reject);
      });
    }
    return this.client.put<T>(url, data, config);
  }
  
  // Helper to perform DELETE request with optional payload support
  public async delete<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    console.log(`${DEBUG_PREFIX} Initiating DELETE request to ${url} with data:`, data);
    if (!this.isConnected) {
      console.log(`${DEBUG_PREFIX} Offline, queuing DELETE request to ${url}`);
      return new Promise<AxiosResponse<T>>((resolve, reject) => {
        this.enqueueRequest({ url, method: 'delete', data, config, retryCount: 0 })
          .then(() => {
            resolve({ data: null } as AxiosResponse<T>);
          })
          .catch(reject);
      });
    }
    return this.client.delete<T>(url, { ...config, data });
  }
}
export interface QueuedRequest {
  url: string;
  method: 'get' | 'post' | 'put' | 'delete';
  data?: any;
  config?: AxiosRequestConfig;
  retryCount: number;
}

export default new ApiClient(API_URL);