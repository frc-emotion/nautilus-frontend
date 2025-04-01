// NotificationsProvider.tsx
import React, { ReactNode, useState, useEffect, createContext, useContext, useCallback } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useGlobalModal } from "../UI/CustomModalProvider";
import { useGlobalToast } from "../UI/CustomToastProvider";
// import * as Notifications from "expo-notifications";
import Constants from 'expo-constants';
import * as Device from 'expo-device';
// import { NotificationsContextProps } from "@/src/Constants";
import { useAuth } from "./AuthContext";
import { QueuedRequest } from "../../Constants";
import { AxiosError, AxiosResponse } from "axios";
import { handleErrorWithModalOrToast } from "../Helpers";
import { useNetworking } from "./NetworkingContext";
import { set } from "react-hook-form";

const DEBUG_PREFIX = "[NotificationsProvider]";
// const NotificationsContext = createContext<NotificationsContextProps | undefined>(undefined)
const NotificationsContext = createContext(undefined);

export const NotificationsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth(); // Assuming 'token' is part of user
    const [updates, setUpdates] = useState<String[]>([]);
    const { handleRequest } = useNetworking();
    const { openToast } = useGlobalToast();
    const { openModal } = useGlobalModal();
//     const [hasPermission, setHasPermission] = useState<boolean>(false);
//     const [isPermissionChecked, setIsPermissionChecked] = useState<boolean>(false);
//     const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
//     const [backendHasToken, setBackendHasToken] = useState<boolean>(false);

//     /**
//      * Check and update the notification permission status
//      */
//     const checkPermissionStatus = async () => {
//       try {
//         const settings = await Notifications.getPermissionsAsync();
//         const status = settings.status === 'granted';
//         setHasPermission(status);
//         setIsPermissionChecked(true);
//         console.log(`${DEBUG_PREFIX} Notification permission status: ${settings.status}`);
//       } catch (error) {
//         console.error(`${DEBUG_PREFIX} Error checking notification permissions:`, error);
//         setHasPermission(false);
//         setIsPermissionChecked(true);
//       }
//     };

//     /**
//      * Request notification permissions from the user
//      */
//     const requestPermission = async () => {
//       try {
//         const settings = await Notifications.requestPermissionsAsync();
//         const status = settings.status === 'granted';
//         setHasPermission(status);
//         console.log(`${DEBUG_PREFIX} Requested notification permission: ${settings.status}`);

//         if (status) {
//           openToast({
//             title: 'Notifications Enabled',
//             description: 'You will receive notifications from the app.',
//             type: 'success',
//           });
//           await registerPushToken();
//         } else {
//           openToast({
//             title: 'Notifications Disabled',
//             description: 'You can enable notifications in settings.',
//             type: 'warning',
//           });
//         }
//       } catch (error) {
//         console.error(`${DEBUG_PREFIX} Error requesting notification permissions:`, error);
//         openToast({
//           title: 'Permission Error',
//           description: 'An error occurred while requesting notifications permissions.',
//           type: 'error',
//         });
//       }
//     };

//     /**
//      * Register the Expo Push Token with the backend using ApiClient
//      */
//     const registerPushToken = async () => {
//       if (!Device.isDevice) {
//         console.warn(`${DEBUG_PREFIX} Push notifications are only supported on physical devices.`);
//         return;
//       }

//       try {
//         const tokenData = await Notifications.getExpoPushTokenAsync();
//         const token = tokenData.data;
//         setExpoPushToken(token);
//         console.log(`${DEBUG_PREFIX} Expo Push Token: ${token}`);

//         if (!user || !user._id) {
//           console.error(`${DEBUG_PREFIX} User is not authenticated. Cannot register push token.`);
//           openToast({
//             title: 'Authentication Error',
//             description: 'User is not authenticated.',
//             type: 'error',
//           });
//           return;
//         }

//         const request: QueuedRequest = {
//           url: '/api/notifications/register-token',
//           method: 'post',
//           retryCount: 3,
//           data: { user_id: user._id, token },
//           successHandler: async (response: AxiosResponse) => {
//             console.log(`${DEBUG_PREFIX} Push token registered successfully for user ${user._id}.`);
//             openToast({
//               title: 'Registration Success',
//               description: 'Push notifications registered successfully.',
//               type: 'success',
//             });
//           },
//           errorHandler: async (error: AxiosError) => {
//             console.error(`${DEBUG_PREFIX} API error while registering push token:`, error.message);
//             handleErrorWithModalOrToast({
//               actionName: 'Register Push Token',
//               error,
//               showModal: false,
//               showToast: true,
//               openToast,
//               openModal,
//             });
//           },
//           offlineHandler: async () => {
//             console.warn(`${DEBUG_PREFIX} Offline detected. Cannot register push token now.`);
//             openToast({
//               title: 'Offline',
//               description: 'You are offline. Push token will be registered when back online.',
//               type: 'warning',
//             });
//           },
//         };

//         await ApiClient.handleRequest(request);
//       } catch (error) {
//         console.error(`${DEBUG_PREFIX} Error registering push token:`, error);
//         openToast({
//           title: 'Registration Error',
//           description: 'Failed to register push token.',
//           type: 'error',
//         });
//       }
//     };

//     // Check if the backend has the Expo Push Token for the user
//     const checkBackendPushToken = async () => {
//       if (!user || !user._id) {
//         console.error(`${DEBUG_PREFIX} User is not authenticated. Cannot check push token.`);
//         return;
//       }

//       const request: QueuedRequest = {
//         url: `/api/notifications/`,
//         method: 'get',
//         retryCount: 3,
//         successHandler: async (response: AxiosResponse) => {
//           const data = response.data;
//           const hasToken = data.has_token;
//           setBackendHasToken(hasToken);
//           console.log(`${DEBUG_PREFIX} Backend has push token for user ${user._id}: ${hasToken}`);
//         },
//         errorHandler: async (error: AxiosError) => {
//           console.error(`${DEBUG_PREFIX} API error while checking push token:`, error.message);

//           if (error.response?.status === 404) {
//             console.warn(`${DEBUG_PREFIX} User ${user._id} does not have a push token in the backend.`);
//             setBackendHasToken(false);
//             openToast({
//               title: 'Please setup notifications',
//               description: 'Our backend does not have your push token. Please enable notifications and register at the profile screen.',
//               type: 'warning',
//             });

//             openModal({
//               title: 'Notifications Setup',
//               message: 'Our backend does not have your push token. Please enable notifications and register at the profile screen.',
//               type: 'warning',
//             });
//             return;
//           }

//           handleErrorWithModalOrToast({
//             actionName: 'Check Push Token',
//             error,
//             showModal: false,
//             showToast: true,
//             openToast,
//             openModal,
//           });
//         },
//         offlineHandler: async () => {
//           console.warn(`${DEBUG_PREFIX} Offline detected. Cannot check push token now.`);
//           openToast({
//             title: 'Offline',
//             description: 'You are offline. Push token will be checked when back online.',
//             type: 'warning',
//           });
//         },
//       };

//       await ApiClient.handleRequest(request);
//     }

//     /**
//      * Schedule a local notification
//      * @param title - Title of the notification
//      * @param body - Body message of the notification
//      * @param trigger - Optional trigger options
//      */
//     const scheduleNotification = async (title: string, body: string, trigger?: Notifications.NotificationTriggerInput) => {
//       if (!hasPermission) {
//         openToast({
//           title: 'Permission Required',
//           description: 'Please enable notifications to receive alerts.',
//           type: 'warning',
//         });
//         return;
//       }

//       try {
//         await Notifications.scheduleNotificationAsync({
//           content: {
//             title,
//             body,
//             sound: true,
//           },
//           trigger: trigger || { seconds: 5 }, // Default to 5 seconds if no trigger provided
//         });
//         console.log(`${DEBUG_PREFIX} Scheduled notification: ${title} - ${body}`);
//         openToast({
//           title: 'Notification Scheduled',
//           description: `Notification "${title}" scheduled successfully.`,
//           type: 'success',
//         });
//       } catch (error) {
//         console.error(`${DEBUG_PREFIX} Error scheduling notification:`, error);
//         openToast({
//           title: 'Notification Error',
//           description: 'Failed to schedule notification.',
//           type: 'error',
//         });
//       }
//     };

//     /**
//      * Send a notification via the backend using ApiClient
//      * @param title - Title of the notification
//      * @param body - Body message of the notification
//      */
//     const sendBackendNotification = async (title: string, body: string) => {
//       if (!user || user.role !== 'admin') {
//         console.warn(`${DEBUG_PREFIX} Send notification skipped: Insufficient permissions.`);
//         openToast({
//           title: 'Permission Denied',
//           description: 'You do not have permission to send notifications.',
//           type: 'error',
//         });
//         return;
//       }

//       const request: QueuedRequest = {
//         url: '/api/notifications/send',
//         method: 'post',
//         data: { title, body },
//         retryCount: 3,
//         successHandler: async (response: AxiosResponse) => {
//           openToast({
//             title: 'Notification Sent',
//             description: 'Your notification has been sent successfully.',
//             type: 'success',
//           });
//           console.log(`${DEBUG_PREFIX} Notification sent via backend: ${title} - ${body}`);
//         },
//         errorHandler: async (error: AxiosError) => {
//           console.error(`${DEBUG_PREFIX} API error while sending notification:`, error.message);
//           handleErrorWithModalOrToast({
//             actionName: 'Send Notification',
//             error,
//             showModal: false,
//             showToast: true,
//             openToast,
//             openModal,
//           });
//         },
//         offlineHandler: async () => {
//           console.warn(`${DEBUG_PREFIX} Offline detected. Cannot send notification now.`);
//           openToast({
//             title: 'Offline',
//             description: 'You are offline. Notification will be sent when back online.',
//             type: 'warning',
//           });
//         },
//       };

//       try {
//         await ApiClient.handleRequest(request);
//       } catch (error) {
//         console.error(`${DEBUG_PREFIX} Unexpected error while sending notification:`, error);
//         openToast({
//           title: 'Send Error',
//           description: 'An unexpected error occurred while sending the notification.',
//           type: 'error',
//         });
//       }
//     };

//     /**
//      * Handle incoming notifications while the app is foregrounded
//      */
//     const handleNotification = (notification: Notifications.Notification) => {
//       console.log(`${DEBUG_PREFIX} Received notification:`, notification);
//       // Customize how you handle incoming notifications here
//       // For example, show a modal or update the UI
//     };

//     /**
//      * Handle notification responses (when user interacts with a notification)
//      */
//     const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
//       console.log(`${DEBUG_PREFIX} Notification response received:`, response);
//       // Handle the response, e.g., navigate to a specific screen
//     };

//     /**
//      * Handle app state changes
//      */
//     const handleAppStateChange = (nextAppState: AppStateStatus) => {
//       if (nextAppState === 'active' && !hasPermission && isPermissionChecked) {
//         // Prompt the user to enable notifications
//         openModal({
//           title: "Enable Notifications",
//           message: "Stay updated by enabling notifications.",
//           type: "info",
//         });

//         openToast({
//           title: "Enable Notifications",
//           description: "Stay updated by enabling notifications.",
//           type: "info",
//         });

//         requestPermission();
//       }
//     };

//     useEffect(() => {
//       // Check permission status on mount
//       checkPermissionStatus();

//       // Check if the backend has the Expo Push Token
//       checkBackendPushToken();

//       // Listen for incoming notifications when the app is foregrounded
//       const notificationListener = Notifications.addNotificationReceivedListener(handleNotification);

//       // Listen for notification responses (user interactions)
//       const responseListener = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

//       // Listen for app state changes
//       const appStateListener = AppState.addEventListener('change', handleAppStateChange);

//       return () => {
//         notificationListener.remove();
//         responseListener.remove();
//         appStateListener.remove();
//       };
//     }, [hasPermission, isPermissionChecked]);

//     /**
//      * Prompt for notification permission if not granted
//      */
//     useEffect(() => {
//       if (!hasPermission && isPermissionChecked) {
//         // Show a modal prompting the user to enable notifications
//         openModal({
//           title: "Enable Notifications",
//           message: "We need your permission to send notifications, so you don't miss important updates.",
//           type: "info",
//         });

//         openToast({
//           title: "Enable Notifications",
//           description: "We need your permission to send notifications, so you don't miss important updates.",
//           type: "info",
//         });

//         requestPermission();
//       }
//     }, [hasPermission, isPermissionChecked]);
    // set the updates using the api:

    const addUpdate = useCallback(async (updatefr: string) => {
        const request: QueuedRequest = {
            url: '/api/notifications/add_noti',
            method: 'post',
            data: { update: updatefr,
                active:"1",
                created_by: user._id,
             },
            retryCount: 1,
            successHandler: async (response: AxiosResponse) => {
                fetchUpdates();
            },
            errorHandler: async (error: AxiosError) => {
                console.error(`${DEBUG_PREFIX} Error updating news and updates:`, error);
                handleErrorWithModalOrToast({
                    actionName: 'Update News and Updates',
                    error,
                    showModal: false,
                    showToast: true,
                    openModal,
                    openToast,
                });
            },
            offlineHandler: async () => {
                console.warn(`${DEBUG_PREFIX} Offline while updating news updates.`);
                openToast({
                    title: 'Offline',
                    description: 'Cannot update news and updates.',
                    type: 'warning',
                });
                setUpdates(["You can only update updates when you're online!"]);
            },
        };

        try {
            await handleRequest(request);
        } catch (error) {
            console.error(`${DEBUG_PREFIX} Unexpected error during addNoti:`, error);
        }
    }, []);

    const updateUpdate = useCallback(async (updatefr: string, idfr: number) => {
        const request: QueuedRequest = {
            url: '/api/notifications/update_noti',
            method: 'put',
            data: { id: idfr,
                update:updatefr,
                edited_by: user._id,
             },
            retryCount: 1,
            successHandler: async (response: AxiosResponse) => {
                fetchUpdates();
            },
            errorHandler: async (error: AxiosError) => {
                console.error(`${DEBUG_PREFIX} Error updating news and updates:`, error);
                handleErrorWithModalOrToast({
                    actionName: 'Update News and Updates',
                    error,
                    showModal: false,
                    showToast: true,
                    openModal,
                    openToast,
                });
            },
            offlineHandler: async () => {
                console.warn(`${DEBUG_PREFIX} Offline while updating news updates.`);
                openToast({
                    title: 'Offline',
                    description: 'Cannot update news and updates.',
                    type: 'warning',
                });
                setUpdates(["You can only update updates when you're online!"]);
            },
        };

        try {
            await handleRequest(request);
        } catch (error) {
            console.error(`${DEBUG_PREFIX} Unexpected error during updateNoti:`, error);
        }
    }, []);

    const removeUpdate = useCallback(async (id:number) => {
            const request: QueuedRequest = {
                url: '/api/notifications/delete_noti',
                method: 'delete',
                data: {
                    id: id,
                    removed_by: user._id,
                },
                
                retryCount: 1,
            
            successHandler: async (response: AxiosResponse) => {
                fetchUpdates();
            },
            errorHandler: async (error: AxiosError) => {
                handleErrorWithModalOrToast({
                    actionName: 'Delete Update',
                    error,
                    showModal: false,
                    showToast: true,
                    openModal,
                    openToast,
                });
            },
            offlineHandler: async () => {
                console.warn(`${DEBUG_PREFIX} Offline while deleteing news updates.`);
                openToast({
                    title: 'Offline',
                    description: 'Cannot delete news updates when offline.',
                    type: 'warning',
                });
            },
        };

        try {
            await handleRequest(request);
        } catch (error) {
            console.error(`${DEBUG_PREFIX} Unexpected error during deleteUpdates:`, error);
        }
    }, []);


    const fetchUpdates = useCallback(async () => {
        console.log(`${DEBUG_PREFIX} Fetching updates.`);
        const request: QueuedRequest = {
            url: '/api/notifications/updates',
            method: 'get',
            retryCount: 3,
            successHandler: async (response: AxiosResponse) => {
                console.log("yurrrr");
                const data = response.data.updates;
                setUpdates(data);
            },
            errorHandler: async (error: AxiosError) => {
                console.error(`${DEBUG_PREFIX} Error fetching news and updates:`, error);
                handleErrorWithModalOrToast({
                    actionName: 'Fetch News and Updates',
                    error,
                    showModal: false,
                    showToast: true,
                    openModal,
                    openToast,
                });
            },
            offlineHandler: async () => {
                console.warn(`${DEBUG_PREFIX} Offline while fetching news updates.`);
                openToast({
                    title: 'Offline',
                    description: 'Cannot fetch news and updates.',
                    type: 'warning',
                });
                setUpdates(["You can only see updates when you're online!"]);
            },
        };

        try {
            await handleRequest(request);
        } catch (error) {
            console.error(`${DEBUG_PREFIX} Unexpected error during fetchUpdates:`, error);
        }
    }, [setUpdates]);



//     const contextValue: NotificationsContextProps = {
//       hasPermission,
//       requestPermission,
//       scheduleNotification,
//       sendBackendNotification,
//       backendHasToken,
//       checkBackendPushToken,
//     };
        const contextValue = {
            updates,
            addUpdate,
            removeUpdate,
            fetchUpdates,
            updateUpdate,
        }

    return (
      <NotificationsContext.Provider value={contextValue}>
        {children}
      </NotificationsContext.Provider>
    );
  };

  /**
   * Custom hook to use the NotificationsContext
   */
  export const useNotifications = (): NotificationsContextProps => {
    const context = useContext(NotificationsContext);
    if (!context) {
      throw new Error(`${DEBUG_PREFIX} useNotifications must be used within a NotificationsProvider`);
    }
    return context;
  };
