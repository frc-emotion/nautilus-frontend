/**
 * AnnouncementNotifications
 * -------------------------
 * The entire out-of-app notification system lives in this file.
 *
 * What it does:
 *   - asks for OS notification permission and keeps track of the answer
 *   - grabs the device's Expo push token and registers it with the backend
 *     (PUT /api/notifications/), so the server can reach this device even when
 *     the app is closed
 *   - unregisters the token on logout
 *   - handles notifications that arrive while the app is open, and taps on them
 *   - exposes `publishAnnouncement(text)`, which creates the announcement and
 *     lets the backend fan it out to every registered device
 *
 * Screens should never talk to expo-notifications directly. HomeScreen only
 * calls `publishAnnouncement` from `useAnnouncementNotifications()`.
 *
 * NOTE: `expo-notifications` is an optional dependency here. If it isn't
 * installed (or we're on a simulator), everything below degrades gracefully:
 * announcements are still created, they just don't produce a device banner.
 * Run `npx expo install expo-notifications` and rebuild to enable push.
 */

import React, {
    ReactNode,
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { AxiosError, AxiosResponse } from 'axios';

import { QueuedRequest } from '@/src/Constants';
import { useAuth } from '@/src/utils/Context/AuthContext';
import { useNetworking } from '@/src/utils/Context/NetworkingContext';
import { useNotifications } from '@/src/utils/Context/NotificationContext';
import { useGlobalToast } from '@/src/utils/UI/CustomToastProvider';

const DEBUG_PREFIX = '[AnnouncementNotifications]';

/** Android notification channel used for announcements. */
const ANNOUNCEMENT_CHANNEL_ID = 'announcements';

/**
 * expo-notifications is loaded lazily so the app still boots when the package
 * isn't installed yet. `null` means "push is unavailable on this build".
 */
let Notifications: any = null;
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    Notifications = require('expo-notifications');
} catch (error) {
    console.warn(
        `${DEBUG_PREFIX} expo-notifications is not installed. Announcements will ` +
        `still be created, but no device notifications will be delivered. ` +
        `Run "npx expo install expo-notifications" and rebuild to enable them.`
    );
}

/** Show a banner even when the notification lands while the app is foregrounded. */
if (Notifications) {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            // SDK 53+ replaced shouldShowAlert with these two; harmless on older SDKs.
            shouldShowBanner: true,
            shouldShowList: true,
        }),
    });
}

/**
 * iOS simulators are never issued a remote push token, so end-to-end push can't
 * be tested there. Android emulators with Google Play Services can receive FCM,
 * so they are allowed through even though Device.isDevice is false.
 */
export const REMOTE_PUSH_SUPPORTED = Device.isDevice || Platform.OS === 'android';

/** 'unsupported' means expo-notifications isn't installed on this build. */
export type PushPermissionStatus = 'unknown' | 'granted' | 'denied' | 'unsupported';

export interface AnnouncementNotification {
    title: string;
    body: string;
    /** Extra payload sent by the backend, e.g. { type: 'announcement', id: 12 }. */
    data: Record<string, any>;
}

export interface AnnouncementNotificationsContextProps {
    /** True when a push token is registered with the backend for this device. */
    pushEnabled: boolean;
    /** The device's Expo push token, or null when we don't have one. */
    pushToken: string | null;
    permissionStatus: PushPermissionStatus;
    /** False on iOS simulators, where only local notifications are possible. */
    remotePushSupported: boolean;
    /** Ask for permission (if needed) and register this device with the backend. */
    registerForPush: () => Promise<boolean>;
    /** Drop this device's token from the backend. Called on logout. */
    unregisterFromPush: () => Promise<void>;
    /**
     * Create an announcement AND notify the team. Returns true when the
     * announcement was submitted. This is the only thing screens need.
     */
    publishAnnouncement: (text: string) => Promise<boolean>;
    /** Fire a local notification on this device -- handy for verifying setup. */
    sendTestNotification: () => Promise<void>;
    /** The most recent notification received while the app was open. */
    lastNotification: AnnouncementNotification | null;
}

const AnnouncementNotificationsContext =
    createContext<AnnouncementNotificationsContextProps | undefined>(undefined);

/** The EAS project id, required by getExpoPushTokenAsync on SDK 49+. */
const getProjectId = (): string | undefined =>
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as any)?.easConfig?.projectId;

export const AnnouncementNotificationsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const { handleRequest } = useNetworking();
    const { addUpdate } = useNotifications() as { addUpdate: (text: string) => Promise<void> };
    const { openToast } = useGlobalToast();

    const [pushToken, setPushToken] = useState<string | null>(null);
    const [pushEnabled, setPushEnabled] = useState(false);
    const [permissionStatus, setPermissionStatus] = useState<PushPermissionStatus>(
        Notifications ? 'unknown' : 'unsupported'
    );
    const [lastNotification, setLastNotification] = useState<AnnouncementNotification | null>(null);

    /** Avoid re-registering the same token every time the user object changes. */
    const registeredTokenRef = useRef<string | null>(null);

    // ----------------------------------------------------------------- //
    // Platform setup
    // ----------------------------------------------------------------- //

    /**
     * Android needs an explicit channel or notifications arrive silently with
     * default (low) importance.
     */
    const ensureAndroidChannel = useCallback(async () => {
        if (!Notifications || Platform.OS !== 'android') return;

        try {
            await Notifications.setNotificationChannelAsync(ANNOUNCEMENT_CHANNEL_ID, {
                name: 'Announcements',
                description: 'Team news and updates from Σ-Motion leadership.',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#fcf000',
                sound: 'default',
            });
        } catch (error) {
            console.error(`${DEBUG_PREFIX} Failed to create Android channel:`, error);
        }
    }, []);

    /** Ask the OS for permission, returning whether we ended up with it. */
    const requestPermission = useCallback(async (): Promise<boolean> => {
        if (!Notifications) {
            setPermissionStatus('unsupported');
            return false;
        }

        try {
            const existing = await Notifications.getPermissionsAsync();
            let status = existing.status;

            if (status !== 'granted') {
                const requested = await Notifications.requestPermissionsAsync({
                    ios: {
                        allowAlert: true,
                        allowBadge: true,
                        allowSound: true,
                    },
                });
                status = requested.status;
            }

            const granted = status === 'granted';
            setPermissionStatus(granted ? 'granted' : 'denied');
            console.log(`${DEBUG_PREFIX} Notification permission: ${status}`);
            return granted;
        } catch (error) {
            console.error(`${DEBUG_PREFIX} Error requesting permission:`, error);
            setPermissionStatus('denied');
            return false;
        }
    }, []);

    // ----------------------------------------------------------------- //
    // Backend token registration
    // ----------------------------------------------------------------- //

    /** Send the Expo push token to the backend so it can reach this device. */
    const sendTokenToBackend = useCallback(async (token: string): Promise<boolean> => {
        let succeeded = false;

        const request: QueuedRequest = {
            url: '/api/notifications/',
            method: 'put',
            data: { token },
            retryCount: 2,
            successHandler: async (_response: AxiosResponse) => {
                succeeded = true;
                registeredTokenRef.current = token;
                console.log(`${DEBUG_PREFIX} Push token registered with backend.`);
            },
            errorHandler: async (error: AxiosError) => {
                console.error(`${DEBUG_PREFIX} Failed to register push token:`, error.message);
            },
            offlineHandler: async () => {
                console.warn(`${DEBUG_PREFIX} Offline; token will register when back online.`);
            },
        };

        try {
            await handleRequest(request);
        } catch (error) {
            console.error(`${DEBUG_PREFIX} Unexpected error registering token:`, error);
        }

        return succeeded;
    }, [handleRequest]);

    /**
     * Full registration flow: permission -> Expo token -> backend.
     * Safe to call repeatedly; it no-ops once the current token is registered.
     */
    const registerForPush = useCallback(async (): Promise<boolean> => {
        if (!Notifications) return false;

        await ensureAndroidChannel();

        // Worth requesting even where remote push is impossible: local
        // notifications (and the publishAnnouncement fallback) still work on
        // simulators, so this is what makes the flow testable there.
        const granted = await requestPermission();
        if (!granted) return false;

        if (!REMOTE_PUSH_SUPPORTED) {
            console.warn(
                `${DEBUG_PREFIX} iOS simulators are never issued an Expo push token. ` +
                `Local notifications still work here; use a physical device or an ` +
                `Android emulator with Google Play for end-to-end push.`
            );
            return false;
        }

        try {
            const projectId = getProjectId();
            const tokenData = await Notifications.getExpoPushTokenAsync(
                projectId ? { projectId } : undefined
            );
            const token: string = tokenData.data;
            setPushToken(token);

            if (registeredTokenRef.current === token) {
                setPushEnabled(true);
                return true;
            }

            const registered = await sendTokenToBackend(token);
            setPushEnabled(registered);
            return registered;
        } catch (error) {
            console.error(`${DEBUG_PREFIX} Failed to obtain Expo push token:`, error);
            setPushEnabled(false);
            return false;
        }
    }, [ensureAndroidChannel, requestPermission, sendTokenToBackend]);

    /** Remove this device's token from the backend (logout / opt out). */
    const unregisterFromPush = useCallback(async (): Promise<void> => {
        registeredTokenRef.current = null;
        setPushEnabled(false);

        const request: QueuedRequest = {
            url: '/api/notifications/',
            method: 'delete',
            retryCount: 1,
            successHandler: async (_response: AxiosResponse) => {
                console.log(`${DEBUG_PREFIX} Push token removed from backend.`);
            },
            errorHandler: async (error: AxiosError) => {
                console.error(`${DEBUG_PREFIX} Failed to remove push token:`, error.message);
            },
            offlineHandler: async () => {
                console.warn(`${DEBUG_PREFIX} Offline; could not remove push token.`);
            },
        };

        try {
            await handleRequest(request);
        } catch (error) {
            console.error(`${DEBUG_PREFIX} Unexpected error removing token:`, error);
        }
    }, [handleRequest]);

    // ----------------------------------------------------------------- //
    // Local delivery (fallback + testing)
    // ----------------------------------------------------------------- //

    /**
     * Show a notification on *this* device only. Used when push isn't wired up
     * so the feature still visibly works, and by `sendTestNotification`.
     */
    const presentLocally = useCallback(async (title: string, body: string) => {
        // Local notifications work anywhere expo-notifications is installed,
        // simulators included -- don't gate this on remote push support.
        if (!Notifications) return;

        try {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title,
                    body,
                    sound: 'default',
                    data: { type: 'announcement', local: true },
                },
                trigger: null, // deliver immediately
            });
        } catch (error) {
            console.error(`${DEBUG_PREFIX} Failed to present local notification:`, error);
        }
    }, []);

    const sendTestNotification = useCallback(async () => {
        const granted = await requestPermission();
        if (!granted) {
            openToast({
                title: 'Notifications Off',
                description: 'Enable notifications in system settings to receive announcements.',
                type: 'warning',
            });
            return;
        }
        await ensureAndroidChannel();
        await presentLocally('Test Notification', 'Announcement notifications are working.');
    }, [requestPermission, ensureAndroidChannel, presentLocally, openToast]);

    // ----------------------------------------------------------------- //
    // The one thing screens call
    // ----------------------------------------------------------------- //

    /**
     * Create an announcement and notify the team.
     *
     * The backend broadcasts the push to every registered device as soon as the
     * announcement is stored, so all this needs to do is submit it. If push
     * isn't available on this build we fall back to a local notification so the
     * author still gets confirmation on-device.
     */
    const publishAnnouncement = useCallback(async (text: string): Promise<boolean> => {
        const trimmed = text.trim();

        if (!trimmed) {
            openToast({
                title: 'Error',
                description: 'News update cannot be empty.',
                type: 'error',
            });
            return false;
        }

        try {
            await addUpdate(trimmed);
        } catch (error) {
            console.error(`${DEBUG_PREFIX} Failed to publish announcement:`, error);
            openToast({
                title: 'Error',
                description: 'Could not post the announcement. Please try again.',
                type: 'error',
            });
            return false;
        }

        if (pushEnabled) {
            openToast({
                title: 'Announcement Posted',
                description: 'The team has been notified.',
                type: 'success',
            });
        } else {
            // No server-side push for this device -- at least surface it here.
            await presentLocally('New Announcement', trimmed);
            openToast({
                title: 'Announcement Posted',
                description: 'Posted to the news feed.',
                type: 'success',
            });
        }

        return true;
    }, [addUpdate, pushEnabled, presentLocally, openToast]);

    // ----------------------------------------------------------------- //
    // Lifecycle
    // ----------------------------------------------------------------- //

    // Register once the user is logged in and verified; clean up on logout.
    useEffect(() => {
        if (user?._id && user.role !== 'unverified') {
            registerForPush();
        } else if (!user) {
            registeredTokenRef.current = null;
            setPushEnabled(false);
            setPushToken(null);
        }
    }, [user?._id, user?.role]);

    // Listen for notifications arriving in the foreground and for taps on them.
    useEffect(() => {
        if (!Notifications) return;

        const toAnnouncement = (notification: any): AnnouncementNotification => ({
            title: notification?.request?.content?.title ?? '',
            body: notification?.request?.content?.body ?? '',
            data: notification?.request?.content?.data ?? {},
        });

        const receivedListener = Notifications.addNotificationReceivedListener((notification: any) => {
            const announcement = toAnnouncement(notification);
            console.log(`${DEBUG_PREFIX} Notification received:`, announcement.title);
            setLastNotification(announcement);
        });

        const responseListener = Notifications.addNotificationResponseReceivedListener((response: any) => {
            const announcement = toAnnouncement(response?.notification);
            console.log(`${DEBUG_PREFIX} Notification tapped:`, announcement.title);
            setLastNotification(announcement);
        });

        return () => {
            receivedListener?.remove?.();
            responseListener?.remove?.();
        };
    }, []);

    const contextValue: AnnouncementNotificationsContextProps = {
        pushEnabled,
        pushToken,
        permissionStatus,
        remotePushSupported: REMOTE_PUSH_SUPPORTED,
        registerForPush,
        unregisterFromPush,
        publishAnnouncement,
        sendTestNotification,
        lastNotification,
    };

    return (
        <AnnouncementNotificationsContext.Provider value={contextValue}>
            {children}
        </AnnouncementNotificationsContext.Provider>
    );
};

/** Hook for screens. Must be used inside AnnouncementNotificationsProvider. */
export const useAnnouncementNotifications = (): AnnouncementNotificationsContextProps => {
    const context = useContext(AnnouncementNotificationsContext);
    if (!context) {
        throw new Error(
            `${DEBUG_PREFIX} useAnnouncementNotifications must be used within an AnnouncementNotificationsProvider`
        );
    }
    return context;
};
