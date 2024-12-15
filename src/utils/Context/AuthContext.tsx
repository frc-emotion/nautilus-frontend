import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthContextType, UserObject } from "../../Constants";
import { useNetworking } from "./NetworkingContext";
import * as Sentry from '@sentry/react-native';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { validateToken } = useNetworking();
  const [user, setUser] = useState<UserObject | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const hasInitializedAuth = useRef(false);

  const clearAuthData = useCallback(async () => {
    try {
      await AsyncStorage.clear();
      setUser(null);
      Sentry.setUser(null);
      Sentry.setTag("role", "none");
    } catch (error) {
      Sentry.captureException(error);
      console.error("AuthProvider: Error clearing auth data:", error);
    }
  }, []);

  const initializeAuth = useCallback(async () => {
    if (hasInitializedAuth.current) return; 
    hasInitializedAuth.current = true;
    try {
      const storedData = await AsyncStorage.getItem("userData");
      if (storedData) {
        const parsedUser: UserObject = JSON.parse(storedData);
        const validatedUser = await validateToken(parsedUser.token);
        if (validatedUser) {
          setUser(validatedUser);
          Sentry.setUser({ id: String(validatedUser._id), email: validatedUser.email });
          Sentry.setTag("role", validatedUser.role);
        } else {
          await clearAuthData();
        }
      }
    } catch (error) {
      Sentry.captureException(error);
      console.error("AuthProvider: Initialization error:", error);
      await clearAuthData();
    } finally {
      console.log("AuthProvider: Initialization complete.");
      setIsLoading(false);
    }
  }, [validateToken, clearAuthData]);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const login = useCallback(async (authToken: string, authUser: UserObject) => {
    try {
      await AsyncStorage.setItem("userData", JSON.stringify(authUser));
      setUser(authUser);
      Sentry.setUser({ id: String(authUser._id), email: authUser.email });
      Sentry.setTag("role", authUser.role);
    } catch (error) {
      Sentry.captureException(error);
      console.error("AuthProvider: Login error:", error);
    }
  }, []);

  const logout = useCallback(async () => {
    await clearAuthData();
  }, [clearAuthData]);

  const refreshUser = useCallback(async () => {
    if (!user?.token) {
      console.warn("AuthProvider: No token available for refreshing user.");
      await clearAuthData();
      return;
    }

    try {
      const updatedUser = await validateToken(user.token);
      if (updatedUser) {
        setUser(updatedUser);
        Sentry.setUser({ id: String(updatedUser._id), email: updatedUser.email });
        Sentry.setTag("role", updatedUser.role);
      } else {
        await clearAuthData();
      }
    } catch (error) {
      Sentry.captureException(error);
      console.error("AuthProvider: Error refreshing user:", error);
      await clearAuthData();
    }
  }, [user, validateToken, clearAuthData]);

  const value = useMemo(() => ({
    user,
    isLoggedIn: !!user?.token,
    isLoading,
    login,
    logout,
    refreshUser,
  }), [user, isLoading, login, logout, refreshUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};