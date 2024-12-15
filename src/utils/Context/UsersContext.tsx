import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueuedRequest, UserObject, USERS_STORAGE_KEY, UsersContextProps } from '../../Constants';
import { AxiosError, AxiosResponse } from 'axios';
import { useAuth } from './AuthContext';
import { useGlobalToast } from '../UI/CustomToastProvider';
import { handleErrorWithModalOrToast } from '../Helpers';
import { useGlobalModal } from '../UI/CustomModalProvider';
import { useNetworking } from './NetworkingContext';
import * as Sentry from '@sentry/react-native';

const UsersContext = createContext<UsersContextProps | undefined>(undefined);
const DEBUG_PREFIX = '[UsersProvider]';

export const UsersProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { openToast } = useGlobalToast();
  const { openModal } = useGlobalModal();
  const { handleRequest } = useNetworking();

  const [users, setUsers] = useState<UserObject[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserObject[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSubteam, setSelectedSubteam] = useState<string>('');
  const [selectedGrade, setSelectedGrade] = useState<string>('');

  const hasInitialized = useRef(false);

  const loadCachedUsers = useCallback(async () => {
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
      Sentry.captureException(error);
      openToast({
        title: 'Error',
        description: 'Failed to load cached users.',
        type: 'error',
      });
    }
  }, [openToast]);

  const cacheUsers = useCallback(async (usersToCache: UserObject[]) => {
    try {
      await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersToCache));
      console.log(`${DEBUG_PREFIX} Users cached successfully.`);
    } catch (error) {
      console.error(`${DEBUG_PREFIX} Error caching users:`, error);
      Sentry.captureException(error);
      openToast({
        title: 'Error',
        description: 'Failed to cache users.',
        type: 'error',
      });
    }
  }, [openToast]);

  const fetchUsers = useCallback(async () => {
    if (!user || user.role === 'unverified') {
      console.warn(`${DEBUG_PREFIX} Fetching skipped: User is unverified or undefined.`);
      return;
    }

    console.log(`${DEBUG_PREFIX} Fetching users from API...`);
    setIsLoading(true);

    const url = ['admin', 'executive'].includes(user.role) ? '/api/account/users' : '/api/account/users/directory';

    const request: QueuedRequest = {
      url,
      method: 'get',
      retryCount: 0,
      successHandler: async (response: AxiosResponse) => {
        const fetchedUsers: UserObject[] = response.data.data.users || [];
        console.log(`${DEBUG_PREFIX} Users fetched successfully. Count: ${fetchedUsers.length}`);
        setUsers(fetchedUsers);
        await cacheUsers(fetchedUsers);
      },
      errorHandler: async (error: AxiosError) => {
        console.error(`${DEBUG_PREFIX} API error while fetching users:`, error.message);
        Sentry.captureException(error);
        handleErrorWithModalOrToast({
          actionName: 'Fetch Users',
          error,
          showModal: false,
          showToast: true,
          openToast,
          openModal,
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
      await handleRequest(request);
    } catch (error) {
      Sentry.captureException(error);
      console.error(`${DEBUG_PREFIX} Unexpected error during fetch:`, error);
      openToast({
        title: 'Error',
        description: 'An unexpected error occurred while fetching users.',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, openToast, openModal, handleRequest, cacheUsers, loadCachedUsers]);

  const editUser = useCallback(async (userId: number, updates: Partial<UserObject>) => {
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
      successHandler: async (response: AxiosResponse) => {
        console.log(`${DEBUG_PREFIX} User edited successfully.`);
        const updatedUser: UserObject = response.data.data.user;
        setUsers((prevUsers) =>
          prevUsers.map((u) =>
            u._id === updatedUser._id
              ? { ...u, ...updatedUser }
              : u
          )
        );
        
        await cacheUsers(users.map((u) =>
          u._id === updatedUser._id
            ? { ...u, ...updatedUser }
            : u
        ));
        openToast({
          title: 'Success',
          description: 'User updated successfully.',
          type: 'success',
        });
      },
      errorHandler: async (error: AxiosError) => {
        Sentry.captureException(error);
        console.error(`${DEBUG_PREFIX} API error while editing user:`, error.message);
        handleErrorWithModalOrToast({
          actionName: 'Edit User',
          error,
          openToast,
          openModal,
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
      await handleRequest(request);
    } catch (error) {
      Sentry.captureException(error);
      console.error(`${DEBUG_PREFIX} Unexpected error during edit:`, error);
      openToast({
        title: 'Error',
        description: 'An unexpected error occurred while editing the user.',
        type: 'error',
      });
    }
  }, [user, openToast, openModal, handleRequest, cacheUsers, users]);

  const deleteUser = useCallback(async (userId: number) => {
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
        Sentry.captureException(error);
        console.error(`${DEBUG_PREFIX} API error while deleting user:`, error.message);
        handleErrorWithModalOrToast({
          actionName: 'Delete User',
          error,
          openToast,
          openModal,

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
      await handleRequest(request);
    } catch (error) {
      Sentry.captureException(error);
      console.error(`${DEBUG_PREFIX} Unexpected error during delete:`, error);
      openToast({
        title: 'Error',
        description: 'An unexpected error occurred while deleting the user.',
        type: 'error',
      });
    }
  }, [user, openToast, openModal, handleRequest, cacheUsers, users]);

  const applyFilters = useCallback(() => {
    console.log(`${DEBUG_PREFIX} Applying filters...`);
    let filtered = [...users];

    if (selectedSubteam) {
      filtered = filtered.filter((usr) =>
        usr.subteam.some((subteam) =>
          subteam.toLowerCase().includes(selectedSubteam.toLowerCase())
        )
      );
    }

    if (selectedGrade) {
      filtered = filtered.filter((usr) => usr.grade === selectedGrade);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (usr) =>
          usr.email.toLowerCase().includes(query) ||
          usr.first_name.toLowerCase().includes(query) ||
          usr.last_name.toLowerCase().includes(query) ||
          usr.role.toLowerCase().includes(query)
      );
    }

    setFilteredUsers(filtered);
    console.log(`${DEBUG_PREFIX} Filters applied. Filtered users count: ${filtered.length}`);
  }, [users, searchQuery, selectedSubteam, selectedGrade]);

  useEffect(() => {
    applyFilters();
  }, [users, searchQuery, selectedSubteam, selectedGrade, applyFilters]);

  const setFilters = useCallback((newFilters: Partial<{
    searchQuery: string;
    selectedSubteam: string;
    selectedGrade: string;
  }>) => {
    if (newFilters.searchQuery !== undefined) setSearchQuery(newFilters.searchQuery);
    if (newFilters.selectedSubteam !== undefined) setSelectedSubteam(newFilters.selectedSubteam);
    if (newFilters.selectedGrade !== undefined) setSelectedGrade(newFilters.selectedGrade);
  }, []);

  const init = useCallback(async () => {
    if (hasInitialized.current) {
      return; 
    }

    console.log(`${DEBUG_PREFIX} Initializing...`);
    if (!user || user.role === 'unverified') {
      console.warn(`${DEBUG_PREFIX} Initialization skipped: User is unverified or undefined.`);
      return;
    }

    hasInitialized.current = true;
    try {
      await loadCachedUsers();
      await fetchUsers();
    } catch (error) {
      Sentry.captureException(error);
      console.error(`${DEBUG_PREFIX} Initialization error:`, error);
      openToast({
        title: 'Initialization Error',
        description: 'An error occurred while initializing users.',
        type: 'error',
      });
    }
  }, [user, loadCachedUsers, fetchUsers, openToast]);

  // Call init once user is available and not unverified
  useEffect(() => {
    if (user && user.role !== 'unverified' && !hasInitialized.current) {
      init();
    }
  }, [user, init]);

  const value = useMemo(() => ({
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
  }), [users, filteredUsers, isLoading, fetchUsers, editUser, deleteUser, searchQuery, selectedSubteam, selectedGrade, applyFilters, init]);

  return (
    <UsersContext.Provider value={value}>
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