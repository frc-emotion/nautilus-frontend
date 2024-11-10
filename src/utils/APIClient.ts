import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import NetInfo from '@react-native-community/netinfo';
import { Alert, Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.API_URL || "http://localhost:7001";
const MAX_RETRIES = Constants.expoConfig?.extra?.MAX_RETRIES || 3;
const DEBUG_PREFIX = '[APIClient]';

class ApiClient {
  private client: AxiosInstance;
  private requestQueue: { requestFn: () => Promise<void>, retryCount: number }[] = [];
  private isConnected = true;

  constructor(baseURL: string) {
    console.log(`${DEBUG_PREFIX} Initializing with base URL: ${baseURL}`);
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `Nautilus/${DeviceInfo.getVersion()} (${Platform.OS}; React Native)`
      },
    });

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
      console.error(`${DEBUG_PREFIX} Server responded with error: ${error.response.data.message}`);
      Alert.alert('Error', error.response.data.message || 'An error occurred');
    } else if (error.request) {
      console.error(`${DEBUG_PREFIX} Network error, no response received.`);
      Alert.alert('Error', 'Network error. Please try again.');
    } else {
      console.error(`${DEBUG_PREFIX} Error in request setup: ${error.message}`);
      Alert.alert('Error', error.message);
    }
  }

  // Method to queue requests when offline or retry failed requests
  private enqueueRequest(requestFn: () => Promise<void>, retryCount = 0) {
    console.log(`${DEBUG_PREFIX} Queuing request (retryCount = ${retryCount})`);
    this.requestQueue.push({ requestFn, retryCount });
  }

  // Method to process queued requests with retry logic
  private async processQueue() {
    console.log(`${DEBUG_PREFIX} Processing queued requests. Queue length: ${this.requestQueue.length}`);
    while (this.requestQueue.length > 0) {
      const { requestFn, retryCount } = this.requestQueue.shift()!;
      try {
        console.log(`${DEBUG_PREFIX} Attempting queued request (retryCount = ${retryCount})`);
        await requestFn();
      } catch (error) {
        if (retryCount < MAX_RETRIES) {
          console.warn(`${DEBUG_PREFIX} Request failed, retrying (attempt ${retryCount + 1} of ${MAX_RETRIES})`);
          this.enqueueRequest(requestFn, retryCount + 1);
        } else {
          console.error(`${DEBUG_PREFIX} Max retries reached for request.`);
          this.handleError(error);
        }
      }
    }
  }

  // Helper to perform GET request with optional query parameters
  public async get<T>(url: string, params?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    console.log(`${DEBUG_PREFIX} Initiating GET request to ${url} with params:`, params);
    if (!this.isConnected) {
      console.log(`${DEBUG_PREFIX} Offline, queuing GET request to ${url}`);
      return new Promise((resolve, reject) => {
        this.enqueueRequest(() => this.client.get<T>(url, { ...config, params }).then(resolve).catch(reject));
      });
    }
    return this.client.get<T>(url, { ...config, params });
  }

  // Helper to perform POST request with payload support
  public async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    console.log(`${DEBUG_PREFIX} Initiating POST request to ${url} with data:`, data);
    if (!this.isConnected) {
      console.log(`${DEBUG_PREFIX} Offline, queuing POST request to ${url}`);
      return new Promise((resolve, reject) => {
        this.enqueueRequest(() => this.client.post<T>(url, data, config).then(resolve).catch(reject));
      });
    }
    return this.client.post<T>(url, data, config);
  }

  // Helper to perform PUT request with payload support
  public async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    console.log(`${DEBUG_PREFIX} Initiating PUT request to ${url} with data:`, data);
    if (!this.isConnected) {
      console.log(`${DEBUG_PREFIX} Offline, queuing PUT request to ${url}`);
      return new Promise((resolve, reject) => {
        this.enqueueRequest(() => this.client.put<T>(url, data, config).then(resolve).catch(reject));
      });
    }
    return this.client.put<T>(url, data, config);
  }

  // Helper to perform DELETE request with optional payload support
  public async delete<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    console.log(`${DEBUG_PREFIX} Initiating DELETE request to ${url} with data:`, data);
    if (!this.isConnected) {
      console.log(`${DEBUG_PREFIX} Offline, queuing DELETE request to ${url}`);
      return new Promise((resolve, reject) => {
        this.enqueueRequest(() => this.client.delete<T>(url, { ...config, data }).then(resolve).catch(reject));
      });
    }
    return this.client.delete<T>(url, { ...config, data });
  }
}

export default new ApiClient(API_URL);