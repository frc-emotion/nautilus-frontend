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
import ApiClient from "../../utils/Networking/APIClient";
import { useModal } from "../../utils/UI/CustomModalProvider";
import { useGlobalToast } from "../../utils/UI/CustomToastProvider";
import { useForm, Controller, FieldErrors } from "react-hook-form";
import { AxiosError, AxiosResponse } from "axios";
import { Image } from "@/components/ui/image"
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../utils/AuthContext";
import { QueuedRequest } from "../../Constants";
import { Fab, FabIcon } from "@/components/ui/fab";
import { useThemeContext } from '../../utils/UI/CustomThemeProvider';
const icon = require("@/src/assets/icon.png")

const LoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { colorMode, toggleColorMode } = useThemeContext();

    const { showToast } = useGlobalToast();
    const { openModal } = useModal();
    const { login } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hidePassword, setHidePassword] = useState(true);

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

                showToast({
                    title: "Login Successful",
                    description: "You have been logged in successfully.",
                    type: "success",
                });

                const { user } = response.data;

                await login(user.token, user);

                await AsyncStorage.setItem("userData", JSON.stringify(user));

                console.log("User data saved to AsyncStorage:", user);

                navigation.replace("RoleBasedTabs");
            },
            errorHandler: async (error: AxiosError) => {
                const statusCode = error.response?.status;
                if (!statusCode) {
                    openModal({
                        title: `Request Failed: ${error.name}`,
                        message: error.message,
                        type: "error",
                    });

                    showToast({
                        title: "Login Failed",
                        description: error.message,
                        type: "error",
                    });
                }

                const errorData = error.response?.data;
                const errorMessage = typeof errorData === "string" ? JSON.parse(errorData) : errorData;

                openModal({
                    title: `Login Error: ${statusCode || "Unknown"}`,
                    message: errorMessage.error,
                    type: "error",
                });

                showToast({
                    title: "Login Failed",
                    description: errorMessage.error,
                    type: "error",
                });
            },
            offlineHandler: async () => {
                showToast({
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
            await ApiClient.handleRequest(request);
        } catch (error: any) {
            console.error("Error during login:", error);
            showToast({
                title: "Unexpected Error",
                description: error.message,
                type: "error",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const onError = (validationErrors: FieldErrors) => {
        console.error("Validation errors:", validationErrors);
        const firstError = Object.values(validationErrors)[0];
        if (firstError && "message" in firstError) {
            showToast({
                title: "Validation Error",
                description: (firstError as { message: string }).message,
                type: "error",
            });
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={120}
            style={{ flex: 1, backgroundColor: colorMode === 'light' ? '#FFFFFF' : '#1A202C' }}

        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1 }}
                    automaticallyAdjustKeyboardInsets={true} showsVerticalScrollIndicator

                >
                    <VStack
                        className="flex-1 justify-center items-center p-16"
                        space="sm"

                    >
                        <Image
                            width={5122}
                            height={512}
                            className="w-64 h-64"
                            source={icon}
                            alt="App Icon"
                        />

                        {/* Email */}
                        <Text className="mb-1 mt-4">Email</Text>
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
                                <Input size="md" className="rounded">
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

                        {/* Password */}
                        <Text className="mb-1 mt-4">Password</Text>
                        <Controller
                            control={control}
                            name="password"
                            render={({ field: { onChange, value } }) => (
                                <Input size="md" className="rounded">
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

                        {/* Submit Button */}
                        <Button
                            onPress={handleSubmit(handleLogin, onError)}
                            size="lg"
                            className="mt-4 py-2 rounded-md"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator size="small" />
                            ) : (
                                <ButtonText className="font-semibold">
                                    Login
                                </ButtonText>
                            )}
                        </Button>
                    </VStack>
                    <Fab
                        size="md"
                        placement="bottom right"
                        onPress={toggleColorMode}
                    >
                        <FabIcon as={colorMode === 'light' ? MoonIcon : SunIcon} />
                    </Fab>
                </ScrollView>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
};

export default LoginScreen;