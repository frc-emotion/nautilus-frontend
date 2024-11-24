import React, { useState } from "react";
import { ScrollView, ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, TouchableWithoutFeedback } from "react-native";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { Input, InputField, InputIcon, InputSlot } from "@/components/ui/input";
import { Button, ButtonText } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectInput,
  SelectIcon,
  SelectPortal,
  SelectBackdrop,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import ApiClient from "../../utils/APIClient";
import { EyeIcon, EyeOffIcon, ChevronDownIcon } from "lucide-react-native";
import { useModal } from "../../utils/ModalProvider";
import { useGlobalToast } from "../../utils/ToastProvider";
import { useForm, Controller, FieldErrors } from "react-hook-form";
import { AxiosError, AxiosResponse } from "axios";
import { GRADES, QueuedRequest, SUBTEAMS } from "../../Constants";
import { useThemeContext } from "../../utils/ThemeContext";

const RegisterScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { showToast } = useGlobalToast();
  const { openModal } = useModal();
  const [hidePassword, setHidePassword] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { colorMode, toggleColorMode } = useThemeContext();

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      studentId: "",
      password: "",
      confirmPassword: "",
      grade: null,
      subteam: null,
    },
  });

  const password = watch("password");

  const handleRegister = async (data: any) => {
    console.log("Register form submitted with data:", data);
    setIsSubmitting(true);

    const payload = {
      first_name: data.firstName,
      last_name: data.lastName,
      student_id: data.studentId,
      email: data.email,
      password: data.password,
      phone: data.phone,
      subteam: [data.subteam?.toLowerCase()],
      grade: data.grade,
    };

    console.log("Payload for API:", payload);

    const request: QueuedRequest = {
      url: "/api/auth/register",
      method: "post",
      data: payload,
      retryCount: 0,
      successHandler: async (response: AxiosResponse) => {
        openModal({
          title: "Woop woop!",
          message: "Account created successfully. To gain full access, an admin must approve your account.",
          type: "success",
        });

        showToast({
          title: "Account Created",
          description: response.data.message,
          type: "success",
        });

        reset();
      },
      errorHandler: async (error: AxiosError) => {
        const statusCode = error.response?.status;

        console.log("Status code:", statusCode);

        if (!statusCode) {
          openModal({
            title: "Unexpected Error",
            message: `${error.name} : ${error.message}\nCode: ${error.code}`,
            type: "error",
          });

          showToast({
            title: "Unexpected Error",
            description: `${error.name} : ${error.message}\nCode: ${error.code}`,
            type: "error",
          });

          return;
        }

        const errorData = error.response?.data;

        // Jsonify the error message if it's a string
        const errorMessage = typeof errorData === "string" ? JSON.parse(errorData) : errorData;

        openModal({
          title: "Registration failed: " + statusCode,
          message: errorMessage.error,
          type: "error",
        });

        showToast({
          title: "Registration failed",
          description: errorMessage.error,
          type: "error",
        });

      },
      offlineHandler: async () => {
        showToast({
          title: "Offline",
          description: "Request saved. It will be processed when you're back online.",
          type: "info",
        });

        openModal({
          title: "Offline",
          message: "Request saved. It will be processed when you're back online.",
          type: "info",
        });

        reset(); // Clear the form even if the request is queued offline
      },
    };

    try {
      await ApiClient.handleNewRequest(request);
    } catch (error: any) {
      console.error("Error during registration:", error);
      showToast({
        title: "That's a rare bug...",
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
      style={{ flex: 1, backgroundColor: colorMode === 'light' ? '#FFFFFF' : '#1A202C' }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          keyboardShouldPersistTaps="never"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingHorizontal: 16,
            paddingVertical: 100,
          }}
          automaticallyAdjustKeyboardInsets={true} showsVerticalScrollIndicator
        >
          <VStack space="md" className="max-w-[600px] w-full mx-auto p-4 rounded-md shadow-lg">

            {/* First and Last Name */}
            <HStack space="sm">
              <VStack space="xs" className="flex-1">
                <Text className="mb-1">First Name</Text>
                <Controller
                  control={control}
                  name="firstName"
                  rules={{ required: "First Name is required" }}
                  render={({ field: { onChange, value } }) => (
                    <Input size="md" className="rounded">
                      <InputField autoCorrect={false} placeholder="First Name" value={value} onChangeText={onChange} />
                    </Input>
                  )}
                />
              </VStack>
              <VStack space="xs" className="flex-1">
                <Text className="mb-1">Last Name</Text>
                <Controller
                  control={control}
                  name="lastName"
                  rules={{ required: "Last Name is required" }}
                  render={({ field: { onChange, value } }) => (
                    <Input size="md" className="rounded">
                      <InputField autoCorrect={false} placeholder="Last Name" value={value} onChangeText={onChange} />
                    </Input>
                  )}
                />
              </VStack>
            </HStack>

            {/* Email */}
            <Text className="mb-1 mt-2">Email</Text>
            <Controller
              control={control}
              name="email"
              rules={{
                required: "Email is required",
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Invalid Email" },
              }}
              render={({ field: { onChange, value } }) => (
                <Input size="md" className="rounded">
                  <InputField
                    placeholder="Enter Email"
                    keyboardType="email-address"
                    value={value}
                    onChangeText={onChange}
                    autoCorrect={false}
                    autoCapitalize="none"
                  />
                </Input>
              )}
            />

            {/* Phone */}
            <Text className="mb-1">Phone Number</Text>
            <Controller
              control={control}
              name="phone"
              rules={{
                required: "Phone Number is required",
                pattern: {
                  value: /^\d{10}$/,
                  message: "Phone Number must be 10 digits",
                },
              }}
              render={({ field: { onChange, value } }) => (
                <Input size="md" className="rounded">
                  <InputField
                    placeholder="Enter Phone Number"
                    keyboardType="phone-pad"
                    value={value}
                    onChangeText={onChange}
                    autoCorrect={false}
                  />
                </Input>
              )}
            />

            {/* Student ID */}
            <Text className="mb-1 mt-2">School Student ID</Text>
            <Controller
              control={control}
              name="studentId"
              rules={{
                required: "Student ID is required",
                pattern: {
                  value: /^\d{7}$/,
                  message: "Student ID must be 7 digits",
                },
              }}
              render={({ field: { onChange, value } }) => (
                <Input size="md" className="rounded">
                  <InputField
                    placeholder="Enter Student ID"
                    keyboardType="numeric"
                    value={value}
                    onChangeText={onChange}
                    autoCorrect={false}
                  />
                </Input>
              )}
            />

            {/* Grade and Subteam */}
            <HStack space="sm" className="mt-2">
              <VStack space="xs" className="flex-1">
                <Text className="mb-1">Grade</Text>
                <Controller
                  control={control}
                  name="grade"
                  rules={{ required: "Grade is required" }}
                  render={({ field: { onChange, value } }) => (
                    <Select selectedValue={value} onValueChange={onChange}>
                      <SelectTrigger variant="outline" size="md" className="rounded justify-between">
                        <SelectInput placeholder="Select Grade" />
                        <SelectIcon as={ChevronDownIcon} className="mr-2" />
                      </SelectTrigger>
                      <SelectPortal>
                        <SelectBackdrop />
                        <SelectContent>
                          {GRADES.map((grade) => (
                            <SelectItem key={grade} label={grade} value={grade} />
                          ))}
                        </SelectContent>
                      </SelectPortal>
                    </Select>
                  )}
                />
              </VStack>

              <VStack space="xs" className="flex-1">
                <Text className="mb-1">Subteam</Text>
                <Controller
                  control={control}
                  name="subteam"
                  rules={{ required: "Subteam is required" }}
                  render={({ field: { onChange, value } }) => (
                    <Select selectedValue={value} onValueChange={onChange}>
                      <SelectTrigger variant="outline" size="md" className="rounded justify-between">
                        <SelectInput placeholder="Select Subteam" />
                        <SelectIcon as={ChevronDownIcon} className="mr-2" />
                      </SelectTrigger>
                      <SelectPortal>
                        <SelectBackdrop />
                        <SelectContent>
                          {SUBTEAMS.map((team) => (
                            <SelectItem key={team} label={team} value={team} />
                          ))}
                        </SelectContent>
                      </SelectPortal>
                    </Select>
                  )}
                />
              </VStack>
            </HStack>

            {/* Password */}
            <Text className="mb-1 mt-2">Password</Text>
            <Controller
              control={control}
              name="password"
              rules={{
                required: "Password is required",
                minLength: {
                  value: 8,
                  message: "Password must be at least 8 characters long",
                },
                pattern: {
                  value: /^(?=.*\d)(?=.*[^a-zA-Z\d])[A-Za-z\d\S]+$/,
                  message: "Password must contain at least one number and one special character",
                },
              }}
              render={({ field: { onChange, value } }) => (
                <Input size="md" className="rounded">
                  <InputField
                    placeholder="Enter Password"
                    secureTextEntry={hidePassword}
                    value={value}
                    onChangeText={onChange}
                    className="text-black-600"
                    autoCorrect={false}
                  />
                  <InputSlot className="pr-3" onPress={() => setHidePassword(!hidePassword)}>
                    <InputIcon as={hidePassword ? EyeOffIcon : EyeIcon} />
                  </InputSlot>
                </Input>
              )}
            />

            {/* Confirm Password */}
            <Text className="mb-1 mt-2">Confirm Password</Text>
            <Controller
              control={control}
              name="confirmPassword"
              rules={{
                required: "Confirm Password is required",
                validate: (value) => value === password || "Passwords do not match",
              }}
              render={({ field: { onChange, value } }) => (
                <Input size="md" className="rounded">
                  <InputField
                    placeholder="Confirm Password"
                    secureTextEntry={hidePassword}
                    value={value}
                    onChangeText={onChange}
                    autoCorrect={false}
                  />
                  <InputSlot className="pr-3" onPress={() => setHidePassword(!hidePassword)}>
                    <InputIcon as={hidePassword ? EyeOffIcon : EyeIcon} />
                  </InputSlot>
                </Input>
              )}
            />

            {/* Submit Button */}
            <Button
              onPress={handleSubmit(handleRegister, onError)}
              size="lg"
              className="mt-4 py-2 rounded-md"
              disabled={isSubmitting}
              action="primary"
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" />
              ) : (
                <ButtonText className="font-semibold">Create Account</ButtonText>
              )}
            </Button>
          </VStack>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

export default RegisterScreen;