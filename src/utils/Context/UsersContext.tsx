import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  QueuedRequest,
  UserObject,
  USERS_STORAGE_KEY,
  UsersContextProps,
} from '../../Constants';
import ApiClient from '../Networking/APIClient';
import { AxiosError, AxiosResponse } from 'axios';
import { useAuth } from './AuthContext';
import { useGlobalToast } from '../UI/CustomToastProvider';

const UsersContext = createContext<UsersContextProps | undefined>(undefined);
const DEBUG_PREFIX = '[UsersProvider]';

export const UsersProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { openToast } = useGlobalToast();

  // States
  const [users, setUsers] = useState<UserObject[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserObject[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSubteam, setSelectedSubteam] = useState<string>('');
  const [selectedGrade, setSelectedGrade] = useState<string>('');

  /**
   * Initialize UsersProvider by loading cached users and fetching fresh data.
   */
  useEffect(() => {
    init();
  }, [user]);

  /**
   * Fetch users from the API and update the local cache.
   */
  const fetchUsers = async () => {
    if (!user || user.role === 'unverified') {
      console.warn(`${DEBUG_PREFIX} Fetching skipped: User is unverified or undefined.`);
      return;
    }

    console.log(`${DEBUG_PREFIX} Fetching users from API...`);
    setIsLoading(true);

    const url =
      user.role === 'admin' ? '/api/account/users' : '/api/account/users/directory';

    const request: QueuedRequest = {
      url,
      method: 'get',
      retryCount: 0,
      headers: { Authorization: `Bearer ${user.token}` },
      successHandler: async (response: AxiosResponse) => {
        const fetchedUsers: UserObject[] = response.data.users || [];
        console.log(`${DEBUG_PREFIX} Users fetched successfully. Count: ${fetchedUsers.length}`);
        setUsers(fetchedUsers);
        await cacheUsers(fetchedUsers);
      },
      errorHandler: async (error: AxiosError) => {
        console.error(`${DEBUG_PREFIX} API error while fetching users:`, error.message);
        openToast({
          title: 'Error',
          description: 'Failed to fetch users. Loading cached users if available.',
          type: 'error',
        });
        await loadCachedUsers();
      },
      offlineHandler: async () => {
        console.warn(`${DEBUG_PREFIX} Offline detected. Loading cached users.`);
        openToast({
          title: 'Offline',
          description: 'You are offline. Cached users have been loaded.',
          type: 'warning',
        });
        await loadCachedUsers();
      },
    };

    try {
      await ApiClient.handleRequest(request);
    } catch (error) {
      console.error(`${DEBUG_PREFIX} Unexpected error during fetch:`, error);
      openToast({
        title: 'Error',
        description: 'An unexpected error occurred while fetching users.',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Edit a user by ID with provided updates.
   * @param userId - The ID of the user to edit.
   * @param updates - Partial updates to apply to the user.
   */
  const editUser = async (userId: number, updates: Partial<UserObject>) => {
    if (!user || user.role !== 'admin') {
      console.warn(`${DEBUG_PREFIX} Edit action skipped: Insufficient permissions.`);
      openToast({
        title: 'Permission Denied',
        description: 'You do not have permission to edit users.',
        type: 'error',
      });
      return;
    }

    console.log(`${DEBUG_PREFIX} Editing user ID: ${userId} with updates:`, updates);

    const url = `/api/account/users/${userId}`;
    const request: QueuedRequest = {
      url,
      method: 'put',
      data: updates,
      retryCount: 0,
      headers: { Authorization: `Bearer ${user.token}` },
      successHandler: async (response: AxiosResponse) => {
        console.log(`${DEBUG_PREFIX} User edited successfully.`);
        const updatedUser: UserObject = response.data.user;
        setUsers((prevUsers) =>
          prevUsers.map((u) => (u._id === updatedUser._id ? updatedUser : u))
        );
        await cacheUsers(
          users.map((u) => (u._id === updatedUser._id ? updatedUser : u))
        );
        openToast({
          title: 'Success',
          description: 'User updated successfully.',
          type: 'success',
        });
      },
      errorHandler: async (error: AxiosError) => {
        console.error(`${DEBUG_PREFIX} API error while editing user:`, error.message);
        openToast({
          title: 'Error',
          description: 'Failed to edit user.',
          type: 'error',
        });
      },
      offlineHandler: async () => {
        console.warn(`${DEBUG_PREFIX} Offline detected. Cannot edit user.`);
        openToast({
          title: 'Offline',
          description: 'You are offline. Cannot edit user at this time.',
          type: 'warning',
        });
      },
    };

    try {
      await ApiClient.handleRequest(request);
    } catch (error) {
      console.error(`${DEBUG_PREFIX} Unexpected error during edit:`, error);
      openToast({
        title: 'Error',
        description: 'An unexpected error occurred while editing the user.',
        type: 'error',
      });
    }
  };

  /**
   * Delete a user by ID.
   * @param userId - The ID of the user to delete.
   */
  const deleteUser = async (userId: number) => {
    if (!user || user.role !== 'admin') {
      console.warn(`${DEBUG_PREFIX} Delete action skipped: Insufficient permissions.`);
      openToast({
        title: 'Permission Denied',
        description: 'You do not have permission to delete users.',
        type: 'error',
      });
      return;
    }

    console.log(`${DEBUG_PREFIX} Deleting user ID: ${userId}`);

    const url = `/api/account/users/${userId}`;
    const request: QueuedRequest = {
      url,
      method: 'delete',
      retryCount: 0,
      headers: { Authorization: `Bearer ${user.token}` },
      successHandler: async () => {
        console.log(`${DEBUG_PREFIX} User deleted successfully.`);
        setUsers((prevUsers) => prevUsers.filter((u) => u._id !== userId));
        await cacheUsers(users.filter((u) => u._id !== userId));
        openToast({
          title: 'Success',
          description: 'User deleted successfully.',
          type: 'success',
        });
      },
      errorHandler: async (error: AxiosError) => {
        console.error(`${DEBUG_PREFIX} API error while deleting user:`, error.message);
        openToast({
          title: 'Error',
          description: 'Failed to delete user.',
          type: 'error',
        });
      },
      offlineHandler: async () => {
        console.warn(`${DEBUG_PREFIX} Offline detected. Cannot delete user.`);
        openToast({
          title: 'Offline',
          description: 'You are offline. Cannot delete user at this time.',
          type: 'warning',
        });
      },
    };

    try {
      await ApiClient.handleRequest(request);
    } catch (error) {
      console.error(`${DEBUG_PREFIX} Unexpected error during delete:`, error);
      openToast({
        title: 'Error',
        description: 'An unexpected error occurred while deleting the user.',
        type: 'error',
      });
    }
  };

  /**
   * Cache users locally for offline access.
   * @param usersToCache - The list of users to cache.
   */
  const cacheUsers = async (usersToCache: UserObject[]) => {
    try {
      await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersToCache));
      console.log(`${DEBUG_PREFIX} Users cached successfully.`);
    } catch (error) {
      console.error(`${DEBUG_PREFIX} Error caching users:`, error);
      openToast({
        title: 'Error',
        description: 'Failed to cache users.',
        type: 'error',
      });
    }
  };

  /**
   * Load users from the local cache.
   */
  const loadCachedUsers = async () => {
    try {
      const cachedUsersStr = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      if (cachedUsersStr) {
        const cachedUsers: UserObject[] = JSON.parse(cachedUsersStr);
        setUsers(cachedUsers);
        console.log(`${DEBUG_PREFIX} Cached users loaded. Count: ${cachedUsers.length}`);
      } else {
        console.warn(`${DEBUG_PREFIX} No cached users found.`);
        openToast({
          title: 'No Cached Data',
          description: 'No cached users available.',
          type: 'info',
        });
      }
    } catch (error) {
      console.error(`${DEBUG_PREFIX} Error loading cached users:`, error);
      openToast({
        title: 'Error',
        description: 'Failed to load cached users.',
        type: 'error',
      });
    }
  };

  /**
   * Initialize the UsersProvider.
   */
  const init = async () => {
    console.log(`${DEBUG_PREFIX} Initializing...`);
    if (!user || user.role === 'unverified') {
      console.warn(`${DEBUG_PREFIX} Initialization skipped: User is unverified or undefined.`);
      return;
    }

    try {
      await loadCachedUsers();
      await fetchUsers();
    } catch (error) {
      console.error(`${DEBUG_PREFIX} Initialization error:`, error);
      openToast({
        title: 'Initialization Error',
        description: 'An error occurred while initializing users.',
        type: 'error',
      });
    }
  };

  /**
   * Apply filters to the users list based on the current filter settings.
   */
  const applyFilters = () => {
    console.log(`${DEBUG_PREFIX} Applying filters...`);
    let filtered = [...users];

    if (selectedSubteam) {
      filtered = filtered.filter((user) =>
        user.subteam.some((subteam) =>
          subteam.toLowerCase().includes(selectedSubteam.toLowerCase())
        )
      );
    }

    if (selectedGrade) {
      filtered = filtered.filter((user) => user.grade === selectedGrade);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.email.toLowerCase().includes(query) ||
          user.first_name.toLowerCase().includes(query) ||
          user.last_name.toLowerCase().includes(query) ||
          user.role.toLowerCase().includes(query)
      );
    }

    setFilteredUsers(filtered);
    console.log(`${DEBUG_PREFIX} Filters applied. Filtered users count: ${filtered.length}`);
  };

  /**
   * Re-apply filters whenever users or filter states change.
   */
  useEffect(() => {
    applyFilters();
  }, [users, searchQuery, selectedSubteam, selectedGrade]);

  /**
   * Update filters dynamically.
   * @param newFilters - Partial updates to the filter states.
   */
  const setFilters = (newFilters: Partial<{
    searchQuery: string;
    selectedSubteam: string;
    selectedGrade: string;
  }>) => {
    if (newFilters.searchQuery !== undefined) setSearchQuery(newFilters.searchQuery);
    if (newFilters.selectedSubteam !== undefined) setSelectedSubteam(newFilters.selectedSubteam);
    if (newFilters.selectedGrade !== undefined) setSelectedGrade(newFilters.selectedGrade);
  };

  return (
    <UsersContext.Provider
      value={{
        users,
        filteredUsers,
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
        applyFilters,
        init,
      }}
    >
      {children}
    </UsersContext.Provider>
  );
};

export const useUsers = (): UsersContextProps => {
  const context = useContext(UsersContext);
  if (!context) {
    throw new Error('useUsers must be used within a UsersProvider');
  }
  return context;
};