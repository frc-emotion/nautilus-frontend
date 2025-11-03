import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableWithoutFeedback, Keyboard, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { Input, InputField, InputIcon, InputSlot } from "@/components/ui/input";
import { Button, ButtonText } from "@/components/ui/button";
import { Image } from "@/components/ui/image";
import { Pressable } from "@/components/ui/pressable";
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

  // Premium entrance animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

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

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 9,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

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
    >
      <LinearGradient
        colors={theme === 'light' 
          ? ['#FFFFFF', '#F9FAFB', '#F3F4F6']
          : ['#0A0A0A', '#171717', '#1E1E1E']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            automaticallyAdjustKeyboardInsets={true}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              style={{
                flex: 1,
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
              }}
            >
              <VStack className="flex-1 justify-center items-center px-6 py-12">
            <View style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 24, marginBottom: 32 }}>
              <Image
                className="w-48 h-48"
                source={icon}
                alt="App Icon"
              />
            </View>

            <Text className="text-base font-semibold text-typography-900 mb-3">Email</Text>
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
                <Input size="md" className="rounded-lg shadow-sm w-full max-w-md mb-6 border-outline-200">
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
                <Text className="text-base font-semibold text-typography-900 mb-3">
                  Password
                </Text>
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, value } }) => (
                    <Input size="md" className="rounded-lg shadow-sm w-full max-w-md mb-8 border-outline-200">
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
                  className="rounded-lg shadow-md w-full max-w-md"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" />
                  ) : (
                    <ButtonText className="font-semibold text-base">Login</ButtonText>
                  )}
                </Button>
              </>
            )}

            {forgot && (
              <Button
                onPress={handleSubmit(handleForgotPassword, onError)}
                size="lg"
                className="rounded-lg shadow-md w-full max-w-md"
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
                variant="outline"
                className="mt-6 rounded-lg w-full max-w-md"
              >
                <ButtonText>
                  Forgot Password?
                </ButtonText>
              </Button>
            )}
            {/* Remember Password */}
            {forgot && (
                <Button
                  onPress={() => setForgot(false)}
                  size="sm"
                  variant="outline"
                  className="mt-6 rounded-lg w-full max-w-md"
                >
                    <ButtonText>
                      Remember Password?
                    </ButtonText>
                  </Button>
              )}
              </VStack>
            </Animated.View>
            
            {/* Premium FAB for theme toggle */}
            <View style={{ position: 'absolute', bottom: Platform.OS === 'ios' ? 32 : 24, right: 24 }}>
              <Pressable onPress={toggleTheme}>
                {({ pressed }) => (
                  <Animated.View
                    style={[
                      {
                        width: 56,
                        height: 56,
                        borderRadius: 28,
                        backgroundColor: theme === 'light' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(45, 45, 45, 0.95)',
                        justifyContent: 'center',
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: theme === 'light' ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.1)',
                        transform: [{ scale: pressed ? 0.95 : 1 }],
                      },
                      Platform.select({
                        ios: {
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 8 },
                          shadowOpacity: 0.2,
                          shadowRadius: 12,
                        },
                        android: {
                          elevation: 8,
                        },
                      }),
                    ]}
                  >
                    {theme === 'light' ? <MoonIcon color="#333333" size={24} /> : <SunIcon color="#F5F5F5" size={24} />}
                  </Animated.View>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;