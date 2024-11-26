import { AppStateContextType } from "@/src/Constants";
import React, { createContext, useContext, useState, ReactNode } from "react";

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export const AppStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAppReady, setIsAppReady] = useState(false);

  const setAppReady = () => setIsAppReady(true);

  return (
    <AppStateContext.Provider value={{ isAppReady, setAppReady }}>
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error("useAppState must be used within AppStateProvider");
  }
  return context;
};