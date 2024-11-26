import React, { createContext, useContext } from "react";
import {
  useToast,
  Toast,
  ToastTitle,
  ToastDescription,
} from "@/components/ui/toast";
import {
  Icon,
  CheckCircleIcon,
  CloseCircleIcon,
  AlertCircleIcon,
  InfoIcon,
} from "@/components/ui/icon";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Pressable } from "react-native";
import { ToastContextType, ToastOptions } from "../../Constants";
import { useThemeContext } from "./CustomThemeProvider";

const getTypeIcon = (type: string) => {
  switch (type) {
    case "success":
      return CheckCircleIcon;
    case "error":
      return CloseCircleIcon;
    case "warning":
      return AlertCircleIcon;
    case "info":
    default:
      return InfoIcon;
  }
};

const getColor = (type: string) => {
  switch (type) {
    case "success":
      return "green";
    case "error":
      return "red";
    case "warning":
      return "orange";
    case "info":
    default:
      return "blue";
  }
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const toast = useToast();

  const openToast = ({
    title,
    description,
    type = "info",
    duration = 5000,
    placement = "top",
  }: ToastOptions) => {
    toast.show({
      placement,
      duration,
      render: ({ id }) => (


        <Pressable onPress={() => toast.close(id)}>
          <Toast
            nativeID={`toast-${id}`}
            className={`p-4 gap-4 w-full max-w-[90vw] rounded-md shadow-md flex-row justify-between items-center`}
            style={{ backgroundColor: getColor(type) }}
          >
            <HStack space="md" className="items-center">
              <Icon color="white"
                as={getTypeIcon(type)}

              />
              <VStack space="xs" className="flex-shrink">
                <ToastTitle
                  className={`text-white font-bold text-base`}
                >
                  {title}
                </ToastTitle>
                <ToastDescription
                  size="sm"
                  className="text-white break-words text-xs"
                >
                  {description}
                </ToastDescription>
              </VStack>
            </HStack>
          </Toast>
        </Pressable>
      ),
    });
  };

  return (
    <ToastContext.Provider value={{ openToast }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useGlobalToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useGlobalToast must be used within a ToastProvider");
  }
  return context;
};