import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ApiClient from "./APIClient";

type UserObject = {
    token: string;
    _id: string;
    first_name: string;
    last_name: string;
    student_id: string;
    email: string;
    password: string;
    phone: string;
    subteam: Array<string>;
    grade: string;
    api_version: string;
    role: string;
    created_at: string;
};

type AuthContextType = {
    user: UserObject | null;
    isLoading: boolean;
    isLoggedIn: boolean;
    login: (token: string, user: UserObject) => Promise<void>;
    logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<UserObject | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadAuthData = async () => {
            setIsLoading(true);
            try {
                const storedUser = await AsyncStorage.getItem("userData");

                if (storedUser) {
                    const parsedUser: UserObject = JSON.parse(storedUser);
                    const storedToken = parsedUser.token || null;
        
                    if (storedToken) {
                        const isValid = await ApiClient.validateToken(storedToken);
                        if (isValid) {
                            setToken(storedToken);
                            setUser(parsedUser);
                        } else {
                            console.warn("Invalid token. Clearing stored auth data.");
                            await AsyncStorage.clear();
                        }
                    }
                } else {
                    setUser(null);
                }
            } catch (error) {
                console.error("Error loading auth data:", error);
                await AsyncStorage.clear(); // Clear potentially corrupt data
            } finally {
                setIsLoading(false);
            }
        };

        loadAuthData();
    }, []);

    const login = async (authToken: string, authUser: UserObject) => {
        try {
            await AsyncStorage.setItem("userData", JSON.stringify(authUser));
            setToken(authToken);
            setUser(authUser);
        } catch (error) {
            console.error("Error during login:", error);
        }
    };

    const logout = async () => {
        try {
            await AsyncStorage.clear();
            setToken(null);
            setUser(null);
        } catch (error) {
            console.error("Error during logout:", error);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isLoggedIn: !!token,
                login,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};