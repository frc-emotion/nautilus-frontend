import { Theme } from "@react-navigation/native";
import { AxiosRequestConfig, AxiosResponse } from "axios";
import Constants from 'expo-constants';

export const GRADES = ["9", "10", "11", "12"];
export const SUBTEAMS = ["Build", "Software", "Marketing", "Electrical", "Design"];
export const APP_UUID = Constants.expoConfig?.extra?.APP_UUID || '00000000-0000-0000-0000-000000000000';

export type AppStackParamList = {
    AuthLoading: undefined;
    RoleBasedTabs: undefined;
    NotLoggedInTabs: undefined;
};

export interface UserObject {
    token: string;
    _id: string;
    first_name: string;
    last_name: string;
    student_id: string;
    email: string;
    phone: string;
    subteam: string[];
    grade: string;
    role: "unverified" | "member" | "leadership" | "executive" | "advisor" | "admin";
    created_at: string;
};

export interface AuthContextType {
    user: UserObject | null;
    isLoggedIn: boolean;
    isLoading: boolean;
    login: (token: string, user: UserObject) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
};

export interface ThemeContextType {
    colorMode: "light" | "dark";
    toggleColorMode: () => void;
}

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

export interface ToastContextType {
    showToast: (options: ToastOptions) => void;
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

export interface BeaconBroadcasterType {
    startBroadcasting: (uuid: string, major: number, minor: number) => Promise<string>;
    stopBroadcasting: () => Promise<string>;
    startListening: (uuid: string) => Promise<string>;
    stopListening: () => Promise<string>;
    getDetectedBeacons: () => Promise<Array<{ uuid: string; major: number; minor: number }>>;
};

export interface ModalConfig {
    title: string;
    message: string;
    type: "success" | "error" | "warning" | "info";
}

export interface ToastConfig {
    title: string;
    description?: string;
    type: "success" | "error" | "warning" | "info";
    duration?: number; // Optional, defaults to 3000ms
}

export interface ModalContextProps {
    isOpen: boolean;
    config: ModalConfig | null;
    openModal: (config: ModalConfig) => void;
    closeModal: () => void;
}

export interface ThemeContextType {
    colorMode: 'light' | 'dark';
    toggleColorMode: () => void;
};

export const LightTheme: Theme = {
    dark: false,
    colors: {
        primary: '#010101', // systemBlue
        background: '#F2F2F7', // systemBackground (light)
        card: '#FFFFFF', // systemCard (light)
        text: '#1C1C1E', // primary text (dark)
        border: '#D8D8DC', // separator (light)
        notification: '#FF3B30', // systemRed
    },
};

export const DarkTheme: Theme = {
    dark: true,
    colors: {
        primary: '#FFFFFF', // systemBlue (dark mode)
        background: '#010101', // systemBackground (dark)
        card: '#1A202C', // systemGray6 (dark)
        text: '#E5E5E7', // primary text (light on dark)
        border: '#272729', // separator (dark)
        notification: '#FF453A', // systemRed (dark mode)
    },
};
