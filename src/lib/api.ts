/**
 * API utility for data visualization endpoints
 */
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = Constants.expoConfig?.extra?.API_URL || "https://api.team2658.org";

/**
 * Typed fetch wrapper that throws on non-2xx responses
 */
export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  // Get token from AsyncStorage
  const userDataStr = await AsyncStorage.getItem("userData");
  const token = userDataStr ? JSON.parse(userDataStr).token : null;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options?.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage =
      errorData?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * Get base API URL
 */
export function getApiUrl(): string {
  return API_URL;
}
