
import React,{ useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Dimensions, KeyboardAvoidingView, Platform, ScrollView, TouchableWithoutFeedback, Keyboard, Image} from 'react-native';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { EyeIcon, EyeOffIcon, Mail, MailIcon, LockIcon } from 'lucide-react-native';
import { Input, InputField, InputIcon, InputSlot } from '@/components/ui/input';
import { FormControl, FormControlLabel, FormControlLabelText, FormControlError, FormControlErrorText } from '@/components/ui/form-control';
import { Button, ButtonText } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogBackdrop,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogBody,
    AlertDialogFooter,
  } from "@/components/ui/alert-dialog";
//import { Mail, Lock, Eye, EyeOff } from '@tamagui/lucide-icons';
//import {Stack} from '@tamagui/core'

const { width, height } = Dimensions.get('window');
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LoginScreen: React.FC = () =>{
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const handleInputChange=(name: string, value: string) => {
    setFormData((prev) => ({...prev, [name]:value}));
  };

  const [emailValid, setEmailValid] =useState(true);
  const [passwordValid, setPasswordValid]=useState(true);

  const [emailRequired, setEmailRequired] =useState(false);
  const [passwordRequired, setPasswordRequired]=useState(false);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertTitle, setAlertTitle] = useState("");

  const [viewPassword, setViewPassword]=useState(false);

  const validateForm = () => {
    const { email, password } = formData;
    if (!email || !password) {
      setAlertMessage("All fields are required.");
      setAlertTitle("Oops!")
      setAlertVisible(true);
      setEmailRequired(true);
      setPasswordRequired(true);
      return false;
    }
    else{
        setEmailRequired(false);
        setPasswordRequired(false);
    }
    
    if (!emailRegex.test(email)) {
      setAlertMessage("Invalid Email.");
      setAlertTitle("Oops!")
      setAlertVisible(true);
      setEmailValid(false);
      return false;
    }
    else{
        setEmailValid(true);
    }

    if (password.length < 8 || !/\d/.test(password) || !/[!@#$%^&*]/.test(password)) {
      setAlertMessage("Password must be at least 8 characters long and contain a number and special character.");
      setAlertTitle("Oops!")
      setAlertVisible(true);
      setPasswordValid(false);
      return false;
    }
    else{
        setPasswordValid(true);
    }

    return true;
  };

  const handleLogin = () =>{
    validateForm();
  }


  
  return(
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
    <ScrollView contentContainerStyle={{ padding: 10 }} style={{ backgroundColor: '#F8F8F8' }} automaticallyAdjustKeyboardInsets={true} showsVerticalScrollIndicator>
    <VStack space="4xl" className="items-center pl-4 pr-4 md:pl-8 md:pr-8 lg:pl-16 lg:pr-16">
    <Image source={require('../assets/icon.png')} className="w-40 h-40 mt-20" />
    
    <Text className="color-black text-4xl">Sign In</Text>
      <FormControl
        isInvalid={!emailValid}
        size="md"
        isDisabled={false}
        isReadOnly={false}
        isRequired={emailRequired}
      >
        <FormControlLabel>
          <FormControlLabelText className="text-xl color-black">Email</FormControlLabelText>
        </FormControlLabel>
        {/*<Mail size={20} color="#888" style={styles.icon} />*/}
        <Input variant="outline" size="lg" className="w-5/6 border border-[#14213d]" isDisabled={false} isInvalid={false} isReadOnly={false}>
        <InputSlot className="pl-2">
            <InputIcon as={MailIcon} className="text-[#14213d]"/>
        </InputSlot>
        <InputField
          className="text-black"
          //style={styles.input}
          placeholder="aaran@gmail.com"
          /*placeholderTextColor="#FFC600"*/
          value={formData.email}
          onChangeText={(text) => handleInputChange('email',text)}
          autoCapitalize="none"
          
          

        />  

        </Input>
        <FormControlError>
            <FormControlErrorText className="text-red">Valid email required.</FormControlErrorText>
        </FormControlError>
    </FormControl>



    <FormControl
        isInvalid={!passwordValid}
        size="md"
        isDisabled={false}
        isReadOnly={false}
        isRequired={passwordRequired}
      >
        <FormControlLabel>
          <FormControlLabelText className="text-xl color-black">Password</FormControlLabelText>
        </FormControlLabel>
    <Input variant="outline" size="lg" className="w-5/6 border border-[#14213d]" isDisabled={false} isInvalid={false} isReadOnly={false} >
        <InputSlot className="pl-2">
            <InputIcon as={LockIcon} className="text-[#14213d]"/>
        </InputSlot>     
        <InputField
        className="text-black"
        placeholder='password'
        //style={styles.input}
        value={formData.password}
        onChangeText={(text)=>handleInputChange('password',text)}
        autoCapitalize='none'
        secureTextEntry={!viewPassword}
        />
        <InputSlot className="pr-2" onPress={() => setViewPassword((prev)=>!prev)}>
            <InputIcon as={!viewPassword ? EyeOffIcon : EyeIcon} className="text-[#14213d]"/>
        </InputSlot>       
    </Input>
    <FormControlError>
        <FormControlErrorText className="text-red">Valid password required.</FormControlErrorText>
    </FormControlError>
    </FormControl>
    

  <Button size="lg" className="rounded-md bg-[#14213d] w-1/3" onPress={handleLogin}>
          <ButtonText className="text-white font-semibold">Login</ButtonText>
  </Button>
        {/* AlertDialog for displaying messages */}
        <AlertDialog isOpen={alertVisible} onClose={() => setAlertVisible(false)} size="md">
          <AlertDialogBackdrop />
          <AlertDialogContent>
            <AlertDialogHeader>
              <Text className="font-semibold text-white">{alertTitle}</Text>
            </AlertDialogHeader>
            <AlertDialogBody>
              <Text className="text-white">{alertMessage}</Text>
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button onPress={() => setAlertVisible(false)}>
                <ButtonText className="text-black">OK</ButtonText>
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
  </VStack>
  </ScrollView>
  </TouchableWithoutFeedback>


  

);}

export default LoginScreen;