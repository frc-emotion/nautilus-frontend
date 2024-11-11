import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';

import { Text } from "@/components/ui/text";
import { Input, InputField, InputIcon, InputSlot } from '@/components/ui/input';
import { Button, ButtonText } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectInput,
  SelectIcon,
  SelectPortal,
  SelectBackdrop,
  SelectContent,
  SelectItem
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Toast, ToastTitle, useToast } from '@/components/ui/toast';
import ApiClient from '../utils/APIClient';
import { EyeIcon, EyeOffIcon, ChevronDownIcon } from 'lucide-react-native';
import { AxiosError } from 'axios';

interface ErrorResponse {
  error: string;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const RegisterScreen: React.FC = () => {
  const toast = useToast();
  const [hidePassword, setHidePassword] = useState(true);
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [selectedSubteam, setSelectedSubteam] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    studentId: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertTitle, setAlertTitle] = useState("");
  
  const handleInputChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const { email, password, confirmPassword } = formData;
    if (!email || !password || !confirmPassword || !selectedGrade || !selectedSubteam) {
      setAlertMessage("All fields are required.");
      setAlertTitle("Oops!")
      setAlertVisible(true);
      return false;
    }
    if (password !== confirmPassword) {
      setAlertMessage("Passwords do not match.");
      setAlertTitle("Oops!")
      setAlertVisible(true);
      return false;
    }
    
    if (formData.studentId.length !== 7 || isNaN(parseInt(formData.studentId))) {
      setAlertMessage("Invalid Student ID.");
      setAlertTitle("Oops!")
      setAlertVisible(true);
      return false;
    }
    
    if (!emailRegex.test(email)) {
      setAlertMessage("Invalid Email.");
      setAlertTitle("Oops!")
      setAlertVisible(true);
      return false;
    }

    if (password.length < 8 || !/\d/.test(password) || !/[!@#$%^&*]/.test(password)) {
      setAlertMessage("Password must be at least 8 characters long and contain a number and special character.");
      setAlertTitle("Oops!")
      setAlertVisible(true);
      return false;
    }

    if (formData.phone.length !== 10 || isNaN(parseInt(formData.phone))) {
      setAlertMessage("Invalid Phone Number.");
      setAlertTitle("Oops!")
      setAlertVisible(true);
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    try {
      const payload = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        student_id: formData.studentId,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        subteam: [selectedSubteam?.toLowerCase()],
        grade: selectedGrade
      };
      const response = await ApiClient.post('/api/auth/register', payload);
      console.log("Account created:", response.data);
      toast.show({
        render: ({ id }) => (
          <Toast nativeID={id} variant="solid" action="success">
            <ToastTitle>Account created successfully</ToastTitle>
          </Toast>
        ),
      });

      setAlertMessage("Account created successfully.");
      setAlertTitle("Woop Woop!")
      setAlertVisible(true);

      // Clear form data
      setFormData({
        firstName: '',
        lastName: '',
        studentId: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: ''
      });

      // Reset select fields
      setSelectedGrade(null);
      setSelectedSubteam(null);


      
    } catch (error) {
      const axiosError = error as AxiosError<ErrorResponse>;
      
      const errorMessage = axiosError.response?.data?.error ?? "An error occurred";
      const errorCode = axiosError.response?.status;

      setAlertMessage(`${errorMessage}`);
      setAlertTitle("Status Code: " + errorCode)
      setAlertVisible(true);
      console.error("Registration error:", axiosError);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 10 }} style={{ backgroundColor: '#F8F8F8' }} showsVerticalScrollIndicator>
      <VStack space="sm" className="max-w-[600px] w-full mx-auto p-3 bg-white rounded-md shadow">

        {/* Full Name - Two Columns */}
        <HStack space="sm">
          <VStack space="xs" className="flex-1">
            <Text className="mb-1 text-gray-600">First Name</Text>
            <Input size="md" className="bg-gray-100 rounded">
              <InputField
              className="rounded text-black-600"
                placeholder="First Name"
                value={formData.firstName}
                onChangeText={(text) => handleInputChange('firstName', text)}
                autoCorrect={false}
              />
            </Input>
          </VStack>
          <VStack space="xs" className="flex-1">
            <Text className="mb-1 text-gray-600">Last Name</Text>
            <Input size="md" className="bg-gray-100 rounded">
              <InputField
              className='text-black-600'
                placeholder="Last Name"
                value={formData.lastName}
                onChangeText={(text) => handleInputChange('lastName', text)}
                autoCorrect={false}
              />
            </Input>
          </VStack>
        </HStack>

        {/* Email */}
        <Text className="mb-1 mt-2 text-gray-600">Email</Text>
        <Input size="md" className="bg-gray-100 rounded">
          <InputField
          className="text-black-600"
            placeholder="Enter Email"
            keyboardType="email-address"
            value={formData.email}
            onChangeText={(text) => handleInputChange('email', text)}
            autoCorrect={false}
            autoCapitalize='none'
          />
        </Input>

        {/* Phone Number */}
        <Text className="mb-1 mt-2 text-gray-600">Phone Number</Text>
        <Input size="md" className="bg-gray-100 rounded">
          <InputField
          className="text-black-600"
            placeholder="Enter Phone Number"
            keyboardType="phone-pad"
            maxLength={10}
            value={formData.phone}
            onChangeText={(text) => handleInputChange('phone', text)}
          />
        </Input>

        {/* Student ID */}
        <Text className="mb-1 mt-2 text-gray-600">School Student ID</Text>
        <Input size="md" className="bg-gray-100 rounded">
          <InputField
          className="text-black-600"
            placeholder="Enter Student ID"
            keyboardType="numeric"
            value={formData.studentId}
            onChangeText={(text) => handleInputChange('studentId', text)}
            maxLength={7}
          />
        </Input>

        {/* Grade and Subteam - Two Columns */}
        <HStack space="sm" className="mt-2">
          <VStack space="xs" className="flex-1">
            <Text className="mb-1 text-gray-600">Grade</Text>
            <Select selectedValue={selectedGrade} onValueChange={setSelectedGrade}>
              <SelectTrigger variant="outline" size="md" className="bg-gray-100 rounded justify-between ">
                <SelectInput placeholder="Select Grade" className='text-black-600'/>
                <SelectIcon as={ChevronDownIcon} className="mr-2"/>
              </SelectTrigger>
              <SelectPortal>
                <SelectBackdrop />
                <SelectContent>
                  {['9', '10', '11', '12'].map((grade, i) => (
                    <SelectItem label={grade} value={grade} key={i}/>
                  ))}
                </SelectContent>
              </SelectPortal>
            </Select>
          </VStack>
          <VStack space="xs" className="flex-1">
            <Text className="mb-1 text-gray-600">Subteam</Text>
            <Select selectedValue={selectedSubteam} onValueChange={setSelectedSubteam}>
              <SelectTrigger variant="outline" size="md" className="bg-gray-100 rounded justify-between">
                <SelectInput placeholder="Select Subteam" className='text-black-600'/>
                <SelectIcon as={ChevronDownIcon} className="mr-2" />
              </SelectTrigger>
              <SelectPortal>
                <SelectBackdrop />
                <SelectContent>
                  {['Build', 'Software', 'Marketing', 'Electrical', 'Design'].map((team, i) => (
                    <SelectItem label={team} value={team} key={i} />
                  ))}
                </SelectContent>
              </SelectPortal>
            </Select>
          </VStack>
        </HStack>

        {/* Password */}
        <Text className="mb-1 mt-2 text-gray-600">Password</Text>
        <Input size="md" className="bg-gray-100 rounded">
          <InputField
          className='text-black-600'
            placeholder="Enter Password"
            secureTextEntry={hidePassword}
            value={formData.password}
            onChangeText={(text) => handleInputChange('password', text)}
          />
          <InputSlot className="pr-3" onPress={() => setHidePassword(!hidePassword)}>
            <InputIcon as={hidePassword ? EyeOffIcon : EyeIcon} />
          </InputSlot>
        </Input>

        {/* Confirm Password */}
        <Text className="mb-1 mt-2 text-gray-600">Confirm Password</Text>
        <Input size="md" className="bg-gray-100 rounded">
          <InputField
          className='text-black-600'
            placeholder="Confirm Password"
            secureTextEntry={hidePassword}
            value={formData.confirmPassword}
            onChangeText={(text) => handleInputChange('confirmPassword', text)}
          />
          <InputSlot className="pr-3" onPress={() => setHidePassword(!hidePassword)}>
            <InputIcon as={hidePassword ? EyeOffIcon : EyeIcon} />
          </InputSlot>
        </Input>

        {/* Submit Button */}
        <Button onPress={handleRegister} size="lg" className="mt-4 py-2 rounded-md bg-blue-600">
          <ButtonText className="text-white font-semibold">Create Account</ButtonText>
        </Button>

        {/* AlertDialog for displaying messages */}
        <AlertDialog isOpen={alertVisible} onClose={() => setAlertVisible(false)} size="md">
          <AlertDialogBackdrop />
          <AlertDialogContent>
            <AlertDialogHeader>
              <Text className="font-semibold">{alertTitle}</Text>
            </AlertDialogHeader>
            <AlertDialogBody>
              <Text>{alertMessage}</Text>
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button onPress={() => setAlertVisible(false)}>
                <ButtonText>OK</ButtonText>
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </VStack>
    </ScrollView>
  );
};

export default RegisterScreen;