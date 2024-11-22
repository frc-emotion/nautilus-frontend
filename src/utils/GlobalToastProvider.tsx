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

type ToastOptions = {
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

type ToastContextType = {
  showToast: (options: ToastOptions) => void;
};

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
      return "yellow";
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

  const showToast = ({
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
              <Icon
                as={getTypeIcon(type)}
                
              />
              <VStack space="xs" className="flex-shrink">
                <ToastTitle
                  className={`font-bold text-base text-gray-100`}
                >
                  {title}
                </ToastTitle>
                <ToastDescription
                  size="sm"
                  className="break-words text-xs text-gray-100"
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
    <ToastContext.Provider value={{ showToast }}>
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