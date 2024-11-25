import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueuedRequest, UserObject, FailedRequest } from '../Constants';
import ApiClient from './Networking/APIClient';
import { AxiosError, AxiosResponse } from 'axios';
import { useAuth } from '../utils/AuthContext';
import { useGlobalToast } from './UI/CustomToastProvider';

interface UsersContextProps {
  users: UserObject[];
  isLoading: boolean;
  fetchUsers: () => Promise<void>;
  editUser: (userId: number, updates: Partial<UserObject>) => Promise<void>;
  deleteUser: (userId: number) => Promise<void>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedSubteam: string;
  setSelectedSubteam: (subteam: string) => void;
  selectedGrade: string;
  setSelectedGrade: (grade: string) => void;
  filteredUsers: UserObject[];
}

const UsersContext = createContext<UsersContextProps | undefined>(undefined);

const DEBUG_PREFIX = '[UsersProvider]';
const USERS_STORAGE_KEY = 'cached_users';

export const UsersProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { showToast } = useGlobalToast();

  const [users, setUsers] = useState<UserObject[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filteredUsers, setFilteredUsers] = useState<UserObject[]>([]);
  
  // Filters
  const [selectedSubteam, setSelectedSubteam] = useState<string>('');
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    initializeUsers();

  }, [user]);

  useEffect(() => {
    applyFilters();

  }, [selectedSubteam, selectedGrade, searchQuery, users]);

  const initializeUsers = async () => {
    log('Initializing UsersProvider');
    try {
      const cachedUsersStr = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      if (cachedUsersStr) {
        const cachedUsers: UserObject[] = JSON.parse(cachedUsersStr);
        setUsers(cachedUsers);
        log('Loaded users from cache');
      }
      await fetchUsers(); // Fetch fresh data
    } catch (error) {
      log('Error initializing UsersProvider', error);
      showToast({
        title: 'Error',
        description: 'Failed to initialize user data.',
        type: 'error',
      });
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    if (!user) return;
    log('fetchUsers called');
    setIsLoading(true);
    const url =
      user.role === 'admin' ? '/api/account/users' : '/api/account/users/directory';
    
    const request: QueuedRequest = {
      url,
      method: 'get',
      headers: { Authorization: `Bearer ${user.token}` },
      retryCount: 0,
      successHandler: async (response: AxiosResponse) => {
        log('fetchUsers successHandler', response.data);
        const fetchedUsers: UserObject[] = response.data.users;
        setUsers(fetchedUsers);
        await cacheUsers(fetchedUsers);
        setIsLoading(false);
      },
      errorHandler: async (error: AxiosError) => {
        log('fetchUsers errorHandler', error);
        showToast({
          title: 'Error',
          description: 'Failed to fetch users. Loading cached users if available.',
          type: 'error',
        });
        await loadCachedUsers();
        setIsLoading(false);
      },
      offlineHandler: async () => {
        log('fetchUsers offlineHandler');
        showToast({
          title: 'Offline',
          description: 'You are offline! Loaded cached users.',
          type: 'error',
        });
        await loadCachedUsers();
        setIsLoading(false);
      },
    };

    try {
      await ApiClient.handleRequest(request);
      log('fetchUsers request sent');
    } catch (error) {
      log('fetchUsers exception', error);
      showToast({
        title: 'Error',
        description: 'An unexpected error occurred while fetching users.',
        type: 'error',
      });
      await loadCachedUsers();
      setIsLoading(false);
    }
  };

  const cacheUsers = async (usersToCache: UserObject[]) => {
    try {
      await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersToCache));
      log('Users cached successfully.');
    } catch (error) {
      log('Error caching users:', error);
      showToast({
        title: 'Error',
        description: 'Failed to cache users.',
        type: 'error',
      });
    }
  };

  const loadCachedUsers = async () => {
    try {
      const cachedUsersStr = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      if (cachedUsersStr) {
        const cachedUsers: UserObject[] = JSON.parse(cachedUsersStr);
        setUsers(cachedUsers);
        log('Loaded users from cache.');
      } else {
        log('No cached users found.');
        showToast({
          title: 'No Data',
          description: 'No cached users available.',
          type: 'info',
        });
      }
    } catch (error) {
      log('Error loading cached users:', error);
      showToast({
        title: 'Error',
        description: 'Failed to load cached users.',
        type: 'error',
      });
    }
  };

  const editUser = async (userId: number, updates: Partial<UserObject>) => {
    if (!user) return;
    log('editUser called', userId, updates);

    const request: QueuedRequest = {
      url: `/api/account/users/${userId}`,
      method: 'put',
      headers: { Authorization: `Bearer ${user.token}` },
      data: updates,
      retryCount: 3,
      successHandler: async (response: AxiosResponse) => {
        log('editUser successHandler', response.data);
        showToast({
          title: 'Success',
          description: 'User edited successfully!',
          type: 'success',
        });
        await fetchUsers(); // Refresh users
      },
      errorHandler: async (error: AxiosError) => {
        log('editUser errorHandler', error);
        showToast({
          title: 'Error',
          description: 'Failed to edit user.',
          type: 'error',
        });
      },
      offlineHandler: async () => {
        log('editUser offlineHandler');
        showToast({
          title: 'Offline',
          description: 'Edit request saved. It will be processed when online.',
          type: 'info',
        });
      },
    };

    try {
      await ApiClient.handleRequest(request);
      log('editUser request sent');
    } catch (error) {
      log('editUser exception', error);
      showToast({
        title: 'Error',
        description: 'An unexpected error occurred while editing user.',
        type: 'error',
      });
    }
  };

  const deleteUser = async (userId: number) => {
    if (!user) return;
    log('deleteUser called', userId);

    const request: QueuedRequest = {
      url: `/api/account/users/${userId}`,
      method: 'delete',
      headers: { Authorization: `Bearer ${user.token}` },
      retryCount: 3,
      successHandler: async (response: AxiosResponse) => {
        log('deleteUser successHandler', response.data);
        showToast({
          title: 'Success',
          description: 'User deleted successfully!',
          type: 'success',
        });
        await fetchUsers(); // Refresh users
      },
      errorHandler: async (error: AxiosError) => {
        log('deleteUser errorHandler', error);
        showToast({
          title: 'Error',
          description: 'Failed to delete user.',
          type: 'error',
        });
      },
      offlineHandler: async () => {
        log('deleteUser offlineHandler');
        showToast({
          title: 'Offline',
          description: 'Delete request saved. It will be processed when online.',
          type: 'info',
        });
      },
    };

    try {
      await ApiClient.handleRequest(request);
      log('deleteUser request sent');
    } catch (error) {
      log('deleteUser exception', error);
      showToast({
        title: 'Error',
        description: 'An unexpected error occurred while deleting user.',
        type: 'error',
      });
    }
  };

  const applyFilters = () => {
    let filtered = [...users];
    if (selectedSubteam) {
      filtered = filtered.filter((u) =>
        u.subteam.includes(selectedSubteam.toLowerCase())
      );
    }
    if (selectedGrade) {
      filtered = filtered.filter((u) => u.grade === selectedGrade);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.email.toLowerCase().includes(query) ||
          u.first_name.toLowerCase().includes(query) ||
          u.last_name.toLowerCase().includes(query) ||
          u.role.toLowerCase().includes(query)
      );
    }
    setFilteredUsers(filtered);
  };

  const log = (...args: any[]) => {
    console.log(`[${new Date().toISOString()}] ${DEBUG_PREFIX}`, ...args);
  };

  return (
    <UsersContext.Provider
      value={{
        users,
        isLoading,
        fetchUsers,
        editUser,
        deleteUser,
        searchQuery,
        setSearchQuery,
        selectedSubteam,
        setSelectedSubteam,
        selectedGrade,
        setSelectedGrade,
        filteredUsers,
      }}
    >
      {children}
    </UsersContext.Provider>
  );
};

export const useUsers = (): UsersContextProps => {
  const context = useContext(UsersContext);
  if (context === undefined) {
    throw new Error('useUsers must be used within a UsersProvider');
  }
  return context;
};