import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ApiClient from "./APIClient";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { AppStackParamList, AuthContextType, UserObject } from "../Constants";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserObject | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigation = useNavigation<StackNavigationProp<AppStackParamList>>();

  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      try {
        const storedData = await AsyncStorage.getItem("userData");
        if (storedData) {
          const parsedUser: UserObject = JSON.parse(storedData);
          const isValid = await ApiClient.validateToken(parsedUser.token);
          if (isValid) {
            setUser(parsedUser);
            setToken(parsedUser.token);
          } else {
            await clearAuthData();
          }
        }
      } catch (error) {
        console.error("Error initializing authentication:", error);
        await clearAuthData();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const clearAuthData = async () => {
    await AsyncStorage.clear();
    setUser(null);
    setToken(null);
    navigation.navigate("NotLoggedInTabs");
  };

  const login = async (authToken: string, authUser: UserObject) => {
    try {
      await AsyncStorage.setItem("userData", JSON.stringify(authUser));
      setToken(authToken);
      setUser(authUser);
      navigation.navigate("RoleBasedTabs");
    } catch (error) {
      console.error("Error during login:", error);
    }
  };

  const logout = async () => {
    await clearAuthData();
    navigation.navigate("NotLoggedInTabs");
  };

  const refreshUser = async () => {
    try {
      if (!token) throw new Error("No token found");
      const updatedUser = await ApiClient.validateToken(token);
      if (updatedUser) {
        setUser(updatedUser);
        setToken(updatedUser.token);
      } else {
        await clearAuthData();
      }
    } catch (error) {
      console.error("Error refreshing user:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!token,
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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};