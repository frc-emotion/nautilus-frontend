import { Theme } from "@react-navigation/native";
import { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import Constants from 'expo-constants';
import { Subscription } from "expo-modules-core";
//import * as Notifications from "expo-notifications";

export const GRADES = ["9", "10", "11", "12"];
export const ROLES = ["unverified", "member", "leadership", "executive", "advisor", "admin"];
export const SUBTEAMS = ["Build", "Software", "Marketing", "Electrical", "Design"];
export const APP_UUID = Constants.expoConfig?.extra?.APP_UUID.toUpperCase() || '00000000-0000-0000-0000-000000000000';
export const USERS_STORAGE_KEY = 'cached_users';
export const MEETINGS_STORAGE_KEY = 'cached_meetings';

export const rolePriority: Record<string, number> = ROLES.reduce((acc, role, index) => {
    acc[role] = index;
    return acc;
  }, {} as Record<string, number>);
  
export interface EditUserFormData {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    student_id: string;
    grade: string;
    role: string;
    subteam: string[];
  }

export interface NetworkingContextProps {
    handleRequest: (request: QueuedRequest) => Promise<void>;
    validateToken: (token: string) => Promise<UserObject | null>;
    isConnected: boolean;
    client: AxiosInstance;
    isLoading: boolean;
  }

// export interface NotificationsContextProps {
//     hasPermission: boolean;
//     requestPermission: () => Promise<void>;
//     scheduleNotification: (title: string, body: string, schedulingOptions?: Notifications.NotificationContentInput & Notifications.NotificationTriggerInput) => Promise<void>;
//     sendBackendNotification: (title: string, body: string, data: any) => Promise<void>;
//     backendHasToken: boolean;
//     checkBackendPushToken: () => Promise<void>;
// }

export interface UpdateInfo {
    version: string;
    update_url: {
      android: string;
      ios: string;
    };
  }
  
export interface UpdateContextProps {
    isOutOfDate: boolean;
    latestVersion: string | null;
    openUpdateURL: () => void;
    checkAppVersion: () => Promise<void>;
  }
  

export interface AttendanceLog {
    meeting_id: number;
    lead_id: number;
    time_received: number;
    flag: boolean;
    hours: number;
    term: number;
    year: string;
}

export interface AttendanceContextProps {
    schoolYears: string[];
    schoolTerms: SchoolYear;
    currentYear: string;
    currentTerm: number;
    userAttendanceHours: AttendanceHours;
    isLoading: boolean;
    allUsersAttendanceData: {
        [userId: string]: {
            user: UserObject;
            attendanceLogs: AttendanceLogWithMeeting[];
            attendanceHours: AttendanceHours;
        };
    };
    fetchAllUsersAttendanceLogs: () => Promise<void>;
    addManualAttendanceLog: (userId: number, attendanceLog: AttendanceLog) => Promise<void>;
    removeManualAttendanceLogs: (userId: number, hours: number, term: number, year: string) => Promise<void>;
    init: () => Promise<void>;
    refreshAttendanceData: () => Promise<void>;
    loadYearsAndTerms: () => Promise<void>;
}

export interface UserAttendanceLogs {
    _id: string; // User ID
    logs: AttendanceLog[];
}

export interface AttendanceLogWithMeeting extends AttendanceLog {
    meetingTitle: string;
    meetingDate: Date | null;
}
export type AllUsersAttendanceHours = {
    [userId: string]: {
        user: UserObject;
        attendanceHours: AttendanceHours;
    };
};

export type SchoolYear = {
    [year: string]: {
        [term: string]: {
            start: number; // Unix timestamp in seconds
            end: number;   // Unix timestamp in seconds
        };
    };
};

export type AttendanceHours = {
    [yearTermKey: string]: number;
};
export interface Beacon {
    uuid: string;
    major: number;
    minor: number;
    //rssi: number;
    timestamp: number;
}

export type AppStackParamList = {
    AppInitializer: undefined;
    RoleBasedTabs: undefined;
    NotLoggedInTabs: {
      screen?: "ForgotPassword";
      token?: string;
    };
  };

export type SingleScreenStackProps = {
    screenName: string;
    component: React.ComponentType<any>;
    options?: NativeStackNavigationOptions;
};

export interface BLEHelperType {
    startBroadcasting: (uuid: string, major: number, minor: number, advertiseMode?: number, txPowerLevel?: number) => Promise<void>;
    stopBroadcasting: () => Promise<void>;
    startListening: (uuid: string, mode: number) => Promise<void>;
    stopListening: () => Promise<void>;
    getDetectedBeacons: () => Promise<Beacon[]>;
    addBluetoothStateListener: (callback: (event: { state: string }) => void) => Subscription;
    removeBluetoothStateListener: (subscription: Subscription) => void;
    addBeaconDetectedListener: (listener: (event: Beacon) => void) => Subscription;
    removeBeaconDetectedListener: (subscription: Subscription) => void;
    // enableBluetooth: () => Promise<string>;
    // disableBluetooth: () => Promise<string>;
    getBluetoothState: () => Promise<string>;
    testBeaconEvent: () => Promise<void>;
}

export interface BLEContextProps {
    bluetoothState: string;
    detectedBeacons: Beacon[];
    isListening: boolean;
    isBroadcasting: boolean;
    startListening: (mode:number) => Promise<void>;
    stopListening: () => Promise<void>;
    startBroadcasting: (uuid: string, major: number, minor: number, title: string, advertiseMode: number, txPowerLevel: number ) => Promise<void>;
    stopBroadcasting: () => Promise<void>;
    getDetectedBeacons: () => Promise<void>;
    testEvent: () => Promise<void>;
    fetchInitialBluetoothState: () => Promise<void>;
}

export interface FailedRequest {
    error: string;
    status: number;
}

export interface MeetingsContextProps {
    meetings: MeetingObject[];
    isLoadingMeetings: boolean;
    fetchMeetings: () => Promise<void>;
    selectedMeeting: MeetingObject | null;
    setSelectedMeeting: (meeting: MeetingObject | null) => void;
    init: () => Promise<void>;
    getChildMeeting: (parentId: number) => MeetingObject | undefined;
}

export interface LocationContextProps {
    locationStatus: 'enabled' | 'disabled' | 'unauthorized' | 'unknown';
    checkLocationServices: () => Promise<void>;
    requestLocationServices: () => Promise<void>;
}

export interface UserFlag {
    field: string;
    issue: string;
    expected?: string | number;
    actual?: string | number;
  }

export interface UserObject {
    token: string;
    _id: number;
    first_name: string;
    last_name: string;
    student_id: string;
    email: string;
    phone: string;
    subteam: string[];
    grade: string;
    role: "unverified" | "member" | "leadership" | "executive" | "advisor" | "admin";
    created_at: string;
    flags?: UserFlag[];
    fourpointfive?: boolean;
};

export enum TabNames {
    Home = "Home",
    Profile = "Profile",
    Attendance = "Attendance",
    AsyncStorage = "AsyncStorage",
    Directory = "Directory",
    ForgotPasswordScreen = "Password",
    Scouting = "Scouting"
}

export enum Roles {
    Unverified = "unverified",
    Member = "member",
    Leadership = "leadership",
    Executive = "executive",
    Advisor = "advisor",
    Admin = "admin",
}

export const roleHierarchy: Record<Roles, Roles[]> = {
    [Roles.Unverified]: [Roles.Unverified],
    [Roles.Member]: [Roles.Member, Roles.Unverified],
    [Roles.Leadership]: [Roles.Leadership, Roles.Member, Roles.Unverified],
    [Roles.Executive]: [Roles.Executive, Roles.Leadership, Roles.Member, Roles.Unverified],
    [Roles.Advisor]: [Roles.Advisor, Roles.Executive, Roles.Leadership, Roles.Member, Roles.Unverified],
    [Roles.Admin]: [Roles.Admin, Roles.Advisor, Roles.Executive, Roles.Leadership, Roles.Member, Roles.Unverified],
};

export interface UsersContextProps {
    users: UserObject[]; // All users fetched from the server
    filteredUsers: UserObject[]; // Users after applying filters
    isLoading: boolean; // Indicates if data is being loaded
    fetchUsers: () => Promise<void>; // Function to fetch users from the API
    editUser: (userId: number, updates: Partial<UserObject>) => Promise<void>; // Edit a user by ID
    deleteUser: (userId: number) => Promise<void>; // Delete a user by ID
    searchQuery: string; // Query for filtering users by name, email, etc.
    setSearchQuery: (query: string) => void; // Update search query
    selectedSubteam: string; // Subteam filter
    setSelectedSubteam: (subteam: string) => void; // Update subteam filter
    selectedGrade: string; // Grade filter
    setSelectedGrade: (grade: string) => void; // Update grade filter
    applyFilters: () => void; // Apply current filters
    init: () => Promise<void>; // Initialize the users context
}

export interface ErrorHandlerOptions {
    actionName: string;
    error: AxiosError;
    showModal?: boolean;
    showToast?: boolean;
};


export type TabConfig = {
    name: string;
    component: React.ComponentType<any>;
    options?: object;
}[];

export interface FormData {
    title: string;
    description: string;
    location: string;
    time_start: Date;
    time_end: Date;
    hours: number;
    created_by: number;
};

export interface CleanUserObject {
    _id: number;
    first_name: string;
    last_name: string;
    grade: string;
    role: string;
    subteam: string[];
};

export interface MeetingObject {
    _id: number;
    created_at: string;
    created_by: number;
    description: string;
    hours: number;
    location: string;
    members_logged: number[];
    time_end: number;
    time_start: number;
    title: string;
    parent: number | null;
}

export interface AuthContextType {
    user: UserObject | null;
    isLoggedIn: boolean;
    isLoading: boolean;
    login: (token: string, user: UserObject) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
};

export interface ToastOptions {
    title: string;
    description?: string;
    type?: "success" | "error" | "warning" | "info";
    duration?: number;
    placement?:
    | "top"
    | "bottom"
    | "top left"
    | "top right"
    | "bottom left"
    | "bottom right";
};

export type OpenToastFunction = (options: ToastOptions) => void;
export type OpenModalFunction = (options: ModalConfig) => void;

export interface ErrorHandlerOptions {
    actionName: string;
    error: AxiosError;
    showModal?: boolean;
    showToast?: boolean;
    openModal: OpenModalFunction;
    openToast: OpenToastFunction;
}

export interface ToastContextType {
    openToast: (options: ToastOptions) => void;
};

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

export interface ModalConfig {
    title: string;
    message: string;
    type: "success" | "error" | "warning" | "info";
}

export interface ModalContextProps {
    isOpen: boolean;
    config: ModalConfig | null;
    openModal: (config: ModalConfig) => void;
    closeModal: () => void;
}

export const LightTheme: Theme = {
    dark: false,
    colors: {
        primary: '#333333', // Modern dark gray for primary actions
        background: '#FFFFFF', // Clean white background
        card: '#FFFFFF', // Card surfaces
        text: '#171717', // Primary text
        border: '#E5E7EB', // Subtle borders
        notification: '#DC2626', // Error red
    },
};

export const DarkTheme: Theme = {
    dark: true,
    colors: {
        primary: '#F5F5F5', // Light primary in dark mode
        background: '#121212', // True black for OLED
        card: '#1E1E1E', // Elevated surfaces
        text: '#F5F5F5', // High contrast text
        border: '#374151', // Subtle dark borders
        notification: '#EF4444', // Bright error in dark mode
    },
};
