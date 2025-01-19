import React, { useState } from "react";
import {
  ScrollView,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from "react-native";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { Input, InputField, InputIcon, InputSlot } from "@/components/ui/input";
import { Button, ButtonText } from "@/components/ui/button";
import { EyeIcon, EyeOffIcon, MailIcon, LockIcon, MoonIcon, SunIcon } from "lucide-react-native";
import { useGlobalModal } from "../../utils/UI/CustomModalProvider";
import { useGlobalToast } from "../../utils/UI/CustomToastProvider";
import { useForm, Controller, FieldErrors } from "react-hook-form";
import { AxiosError, AxiosResponse } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../utils/Context/AuthContext";
import { QueuedRequest } from "../../Constants";
import { Fab, FabIcon } from "@/components/ui/fab";
import { useTheme } from '../../utils/UI/CustomThemeProvider';
import { handleErrorWithModalOrToast } from "@/src/utils/Helpers";
import { Image } from "@/components/ui/image";
import { useNetworking } from "@/src/utils/Context/NetworkingContext";
import { useAttendance } from "@/src/utils/Context/AttendanceContext";

const icon = require("@/src/assets/icon.png");

const LoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { theme, toggleTheme } = useTheme();
  const { openToast } = useGlobalToast();
  const { openModal } = useGlobalModal();
  const { login } = useAuth();
  const { handleRequest } = useNetworking();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hidePassword, setHidePassword] = useState(true);
  const [forgot, setForgot] = useState(false);
  const { loadYearsAndTerms } = useAttendance();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleLogin = async (data: any) => {
    console.log("Login form submitted with data:", data);
    setIsSubmitting(true);

    const payload = {
      email: data.email,
      password: data.password,
    };

    console.log("Payload for API:", payload);

    const request: QueuedRequest = {
      url: "/api/auth/login",
      method: "post",
      data: payload,
      retryCount: 0,
      successHandler: async (response: AxiosResponse) => {
        openModal({
          title: "Success",
          message: "Logged in successfully.",
          type: "success",
        });

        openToast({
          title: "Login Successful",
          description: "You have been logged in successfully.",
          type: "success",
        });

        const user = response.data.data.user;

        await login(user.token, user);
        await AsyncStorage.setItem("userData", JSON.stringify(user));

        console.log("User data saved to AsyncStorage:", user);
        await loadYearsAndTerms();
        navigation.replace("RoleBasedTabs");
      },
      errorHandler: async (error: AxiosError) => {
        handleErrorWithModalOrToast({
          actionName: "Login",
          error,
          showModal: true,
          showToast: true,
          openModal,
          openToast,
        });
      },
      offlineHandler: async () => {
        openToast({
          title: "Offline",
          description: "Login request saved. It will be processed when you're back online.",
          type: "info",
        });

        openModal({
          title: "Offline",
          message: "Login request saved. It will be processed when you're back online.",
          type: "info",
        });
      }
    };

    try {
      await handleRequest(request);
    } catch (error: any) {
      console.error("Error during login:", error);
      openToast({
        title: "Unexpected Error",
        description: error.message,
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (data: any) => {
    console.log("Forgot password request submitted with data:", data);
    const payload = {
      email: data.email
    }

    console.log("Payload for API:", payload);

    const request: QueuedRequest = {
      url: "/api/auth/forgot-password",
      method: "post",
      data: payload,
      retryCount: 3,
      successHandler: async (response: AxiosResponse) => {
        openModal({
          title: "Success",
          message: "If the email exists, a reset link has been sent.",
          type: "success",
        });

        openToast({
          title: "Email Sent",
          description: "If the email exists, a reset link has been sent.",
          type: "success",
        });
      },
      errorHandler: async (error: AxiosError) => {
        handleErrorWithModalOrToast({
          actionName: "Send email",
          error,
          showModal: true,
          showToast: true,
          openModal,
          openToast,
        });
      },
      offlineHandler: async () => {
        openToast({
          title: "Offline",
          description: "Email saved. It will be sent when you're back online.",
          type: "info",
        });

        openModal({
          title: "Offline",
          message: "Email saved. It will be sent when you're back online.",
          type: "info",
        });
      }
    };

    try {
      await handleRequest(request);
    } catch (error: any) {
      console.error("Error during email send:", error);
      openToast({
        title: "Unexpected Error",
        description: error.message,
        type: "error",
      });
    } finally {
      setForgot(false);
    }
  };

  const onError = (validationErrors: FieldErrors) => {
    console.error("Validation errors:", validationErrors);
    const firstError = Object.values(validationErrors)[0];
    if (firstError && "message" in firstError) {
      openToast({
        title: "Validation Error",
        description: (firstError as { message: string }).message,
        type: "error",
      });
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={60}
      className="flex-1"
      style={{ backgroundColor: theme === 'light' ? '#FFFFFF' : '#1A202C' }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          automaticallyAdjustKeyboardInsets={true}
          showsVerticalScrollIndicator
        >
          <VStack
            className="flex-1 justify-center items-center px-4 md:px-8 lg:px-16 space-y-4"
          >
            <Image
              className="w-64 h-64 sm:w-32 sm:h-32 md:w-64 md:h-64 lg:w-128 lg:h-128 mb-6"
              source={icon}
              alt="App Icon"
            />

            <Text className="text-sm md:text-base font-medium mb-2">Email</Text>
            <Controller
              control={control}
              name="email"
              rules={{
                required: "Email is required",
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: "Invalid email format.",
                },
              }}
              render={({ field: { onChange, value } }) => (
                <Input size="md" className="rounded w-9/12 mb-4 max-w-md">
                  <InputSlot className="pl-3">
                    <InputIcon as={MailIcon} />
                  </InputSlot>
                  <InputField
                    placeholder="Enter Email"
                    value={value}
                    onChangeText={onChange}
                    keyboardType="email-address"
                    autoCorrect={false}
                    autoCapitalize="none"
                  />
                </Input>
              )}
            />

            {!forgot && (
              <>
                <Text className="text-sm md:text-base font-medium mb-2">
                  Password
                </Text>
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, value } }) => (
                    <Input size="md" className="rounded w-9/12 mb-4 max-w-md">
                      <InputSlot className="pl-3">
                        <InputIcon as={LockIcon} />
                      </InputSlot>
                      <InputField
                        placeholder="Enter Password"
                        secureTextEntry={hidePassword}
                        value={value}
                        onChangeText={onChange}
                        autoCorrect={false}
                      />
                      <InputSlot
                        className="pr-3"
                        onPress={() => setHidePassword(!hidePassword)}
                      >
                        <InputIcon as={hidePassword ? EyeOffIcon : EyeIcon} />
                      </InputSlot>
                    </Input>
                  )}
                />

                <Button
                  onPress={handleSubmit(handleLogin, onError)}
                  size="lg"
                  className="mt-4 py-2 rounded-md w-1/2 max-w-md"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" />
                  ) : (
                    <ButtonText className="font-semibold text-lg">Login</ButtonText>
                  )}
                </Button>
              </>
            )}

            {forgot && (
              <Button
                onPress={handleSubmit(handleForgotPassword, onError)}
                size="lg"
                className="mt-4 py-2 rounded-md"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <ButtonText className="font-semibold">Send Email</ButtonText>
                )}
              </Button>
            )}

            {!forgot && (
              <Button
                onPress={() => setForgot(true)}
                size="sm"
                className={theme === 'light' ? "mt-4 py-2 rounded-md bg-white" : "mt-4 py-2 rounded-md bg-grey"} disabled={false}
              >
                <ButtonText className={theme === 'light' ? "color-black" : "color-white"}>
                  Forgot Password?
                </ButtonText>
              </Button>
            )}
            {/* Remember Password */}
            {forgot && (
                <Button
                  onPress={()=>setForgot(false)}
                  size="sm"
                  className={theme === 'light' ? "mt-4 py-2 rounded-md bg-white active:bg-white" : "mt-4 py-2 rounded-md bg-grey active:bg-grey"} disabled={false}
                  >
                    <ButtonText className={theme === 'light' ? "color-black" : "color-white"}>
                      Remember Password?
                    </ButtonText>
                  </Button>
              )}
          </VStack>
          <Fab
            size="md"
            placement="bottom right"
            onPress={toggleTheme}
            className="absolute bottom-4 right-4"
          >
            <FabIcon as={theme === 'light' ? MoonIcon : SunIcon} />
          </Fab>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;