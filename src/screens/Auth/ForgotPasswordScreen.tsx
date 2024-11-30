// Credit: Aaran
// Merging a pull request would be very annoying so I'm just going to copy and paste the code here
// Apologies for the missing credit
// Needed to refactor the code to make it work with the current codebase anyways

import React, { useEffect, useState } from "react";
import { Text } from "@/components/ui/text";
import { useNavigation, useRoute } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { AppStackParamList, QueuedRequest } from "../../Constants";
import { useModal } from "../../utils/UI/CustomModalProvider";
import { useGlobalToast } from "../../utils/UI/CustomToastProvider";
import { useForm, Controller, FieldErrors } from "react-hook-form";
import { AxiosError, AxiosResponse } from "axios";
import ApiClient from "../../utils/Networking/APIClient";
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, ScrollView, TouchableWithoutFeedback } from "react-native";
import { VStack } from "@/components/ui/vstack";
import { Input, InputField, InputIcon, InputSlot } from "@/components/ui/input";
import { EyeIcon, EyeOffIcon, LockIcon } from "lucide-react-native";
import { Button, ButtonText } from "@/components/ui/button";
import { handleErrorWithModalOrToast } from "@/src/utils/Helpers";

const ForgotPasswordScreen: React.FC = () => {
    const navigation = useNavigation<StackNavigationProp<AppStackParamList>>();
    const route = useRoute()
    const { token, email } = route.params as { token: string; email: string };
    const { openToast } = useGlobalToast();
    const { openModal } = useModal();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hidePassword, setHidePassword] = useState(true);
    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm({
        defaultValues: {
            password: "",
        },
    });
    const handleResetPassword = async (data: any) => {
        console.log("Reset password submitted with data:", data);
        setIsSubmitting(true);
        const payload = {
            password: data.password,
            email: email,
            token: token,
        };

        console.log("Payload for API:", payload);

        const request: QueuedRequest = {
            url: "/api/auth/updatePassword",
            method: "post",
            data: payload,
            retryCount: 0,
            successHandler: async (response: AxiosResponse) => {
                openModal({
                    title: "Success",
                    message: "Your password has been reset successfully.",
                    type: "success",
                });

                openModal({
                    title: "Reset Successful",
                    message: "Your password has been reset successfully.",
                    type: "success",
                });


                navigation.replace("NotLoggedInTabs");
            },
            errorHandler: async (error: AxiosError) => {
                console.error("Token validation failed:", error);

                handleErrorWithModalOrToast({
                    actionName: "Update password",
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
                    description: "Reset request saved. It will be processed when you're back online.",
                    type: "info",
                });

                openModal({
                    title: "Offline",
                    message: "Reset request saved. It will be processed when you're back online.",
                    type: "info",
                });
            }
        };

        try {
            await ApiClient.handleRequest(request);
        } catch (error: any) {
            console.error("Error during reset:", error);
            openToast({
                title: "Error",
                description: "An error occurred while resetting your password. Please report this.",
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
            keyboardVerticalOffset={120}
            style={{ flex: 1 }}

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

                        {/* Password */}

                        <Text className="mb-1 mt-4">New Password</Text>
                        <Controller
                            control={control}
                            name="password"
                            rules={{
                                required: "Password is required",
                                pattern: {
                                    value: /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/, // regex for password
                                    message: "Password must be at least 8 characters long, with at least one uppercase letter, one number, and one special character.",
                                },
                            }}
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


                        <Button
                            onPress={handleSubmit(handleResetPassword, onError)}
                            size="lg"
                            className="mt-4 py-2 rounded-md"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator size="small" />
                            ) : (
                                <ButtonText className="font-semibold">
                                    Reset Password
                                </ButtonText>
                            )}
                        </Button>
                    </VStack>

                </ScrollView>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
};

export default ForgotPasswordScreen;