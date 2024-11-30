import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ApiClient from "../Networking/APIClient";
import { AuthContextType, UserObject } from "../../Constants";
import { ActivityIndicator, View } from "react-native";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserObject | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedData = await AsyncStorage.getItem("userData");
        if (storedData) {
          const parsedUser: UserObject = JSON.parse(storedData);
          const validatedUser = await ApiClient.validateToken(parsedUser.token);
          if (validatedUser) {
            setUser(validatedUser);
          } else {
            await clearAuthData();
          }
        }
      } catch (error) {
        console.error("AuthProvider: Initialization error:", error);
        await clearAuthData();
      } finally {
        console.log("AuthProvider: Initialization complete.");
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const clearAuthData = async () => {
    try {
      await AsyncStorage.clear();
      setUser(null);
    } catch (error) {
      console.error("AuthProvider: Error clearing auth data:", error);
    }
  };

  const login = async (authToken: string, authUser: UserObject) => {
    try {
      await AsyncStorage.setItem("userData", JSON.stringify(authUser));
      setUser(authUser);
    } catch (error) {
      console.error("AuthProvider: Login error:", error);
    }
  };

  const logout = async () => {
    await clearAuthData();
  };

  const refreshUser = async () => {
    if (!user?.token) {
      console.warn("AuthProvider: No token available for refreshing user.");
      await clearAuthData();
      return;
    }

    try {
      const updatedUser = await ApiClient.validateToken(user.token);
      if (updatedUser) {
        setUser(updatedUser);
      } else {
        await clearAuthData();
      }
    } catch (error) {
      console.error("AuthProvider: Error refreshing user:", error);
      await clearAuthData();
    }
  };

  if (isLoading) {
    return <LoadingIndicator />;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user?.token,
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
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

// Loading Indicator Component
const LoadingIndicator: React.FC = () => (
  <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
    <ActivityIndicator size="large" />
  </View>
);