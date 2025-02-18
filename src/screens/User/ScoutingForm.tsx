import React, { useEffect, useState } from "react";
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
import { EyeIcon, EyeOffIcon, MailIcon, LockIcon, MoonIcon, SunIcon, ChevronDownIcon } from "lucide-react-native";
import { useGlobalModal } from "../../utils/UI/CustomModalProvider";
import { useGlobalToast } from "../../utils/UI/CustomToastProvider";
import { useForm, Controller, FieldErrors } from "react-hook-form";
import { AxiosError, AxiosResponse } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../utils/Context/AuthContext";
import { QueuedRequest } from "../../Constants";
import { Fab, FabIcon } from "@/components/ui/fab";
import { useThemeContext } from '../../utils/UI/CustomThemeProvider';
import { handleErrorWithModalOrToast } from "@/src/utils/Helpers";
import { Image } from "@/components/ui/image";
import { useNetworking } from "@/src/utils/Context/NetworkingContext";
import { useAttendance } from "@/src/utils/Context/AttendanceContext";
import { Select, SelectBackdrop, SelectContent, SelectDragIndicator, SelectDragIndicatorWrapper, SelectIcon, SelectInput, SelectItem, SelectPortal, SelectTrigger } from "@/components/ui/select";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Box } from "@/components/ui/box";


const ScoutingForm: React.FC = () => {
    const { colorMode } = useThemeContext();
    const {
        control,
        handleSubmit,
        watch,
        reset,
        setValue,
        getValues,
        formState: { errors },
      } = useForm({
        defaultValues: {
                "competition": "",
                "teamNumber": 0,
                "matchNumber": 0,
                "score": 0,
                "penaltyPointsEarned": 0,
                "won": false,
                "tied": false, 
                "comments": "",
                "defensive": false,
                "brokeDown": false,
                "rankingPoints": 0,
                "auto": {
                    "leave": false,
                    "coral": 0,
                    "algae": 0,
                    "humanPlayer": false, // did the human player interact during auto
                },
                "teleop": {
                    "coral": 0,
                    "algae": 0,
                },
                "climb":{
                    "shallowCage":false,
                    "deepCage":false,
                }
                // "stage": {
                //     "state": "NOT_PARKED", //"NOT_PARKED" | "PARKED" | "ONSTAGE" | "ONSTAGE_SPOTLIT"
                //     "harmony": 0,
                //     "trapNotes": 0,
                // },
            //     "ranking": {
            //         "melody": false,
            //         "ensemble": false              
            // }
        },
      });

    
    const handleIncrease = (field: string) => {
        const currentValue = watch(field);
        if (typeof currentValue === "number") {
            setValue(field, currentValue + 1);
        }
        console.log(getValues(field));
    };

    const handleDecrease = (field: string) => {
        const currentValue = watch(field);
        if (typeof currentValue === "number") {
            setValue(field, currentValue - 1);
        }
        console.log(getValues(field));
    };
    const toggleField = (field: string) => {
        const currentValue=watch(field);
        if (typeof currentValue === "boolean"){
            setValue(field, !currentValue);
        }
        console.log(getValues(field));
    };

    const updateField = (field: string) => {
        const currentValue=watch()
    }

    return (
    <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={120}
          className="flex-1"
          style={{ backgroundColor: colorMode === 'light' ? '#FFFFFF' : '#1A202C' }}
        >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>

            <ScrollView
              contentContainerStyle={{ flexGrow: 1 }}
              automaticallyAdjustKeyboardInsets={true}
              showsVerticalScrollIndicator>

                <VStack
                space="md"
                className="w-full max-w-[600px] mx-auto p-4 rounded-md shadow-lg flex-1"//justify-center"
                style={{
                    minHeight: '100%',
                    paddingHorizontal: 16,
                    paddingVertical: Platform.OS === "ios" ? 24 : 16,
                }}
                >
                
                {/* Start General */}

                <Text size="xl" className="self-center color-black"> General </Text>
                <VStack className="w-1/1 pl-0.8 pr-0.8">
                <Text className="mb-1">Competition</Text>
                <Select className="">
                    <SelectTrigger variant="outline" size="md" >
                    <SelectInput placeholder="Select option" />
                    <SelectIcon className="ml-auto" as={ChevronDownIcon} />
                    </SelectTrigger>
                    <SelectPortal>
                    <SelectBackdrop/>
                    <SelectContent>
                        <SelectDragIndicatorWrapper>
                        <SelectDragIndicator />
                        </SelectDragIndicatorWrapper>
                        <SelectItem label="Make Db Lol" value="sdr-2023" isDisabled={false}/>
                        <SelectItem label="Yurrrrrrrrrrrrrrr" value="sdr-2023" isDisabled={false}/>
                    </SelectContent>
                    </SelectPortal>
                </Select>
                </VStack>
                <HStack space="2xl" className="w-full justify-center pr-2 pl-2">

                <VStack className="w-1/2">
                <Text className="mb-1"> Team # </Text>
                <Controller
                    control={control}
                    name="teamNumber"
                    rules={{
                        required: "Team number is required",
                        pattern: {
                            value: /d/,
                            message: "The team number must be numeric.",
                        },
                    }}
                    render={({ field: { onChange, value } }) => (
                        <Input size="md" className="rounded">
                            <InputField
                                inputMode="numeric"                                
                                placeholder="2658"
                                value={value}
                                onChangeText={onChange}
                                autoCorrect={false}
                            />
                        </Input>
                    )}
                />
                
                {errors.teamNumber && (
                    <Text className="text-red-500 mt-1">
                        {errors.teamNumber.message}
                    </Text>
                )}
                </VStack>

                <VStack className="w-1/2">
                <Text className="mb-1"> Match # </Text>
                <Controller
                    control={control}
                    name="matchNumber"
                    rules={{
                        required: "Match is required",
                        pattern: {
                            value: /d/,
                            message: "The match number must be numeric.",
                        },
                    }}
                    render={({ field: { onChange, value } }) => (
                        <Input size="md" className="rounded">
                            <InputField
                                inputMode="numeric"                                
                                placeholder="0"
                                value={value}
                                onChangeText={onChange}
                                autoCorrect={false}
                            />
                        </Input>
                    )}
                />
                
                {errors.matchNumber && (
                    <Text className="text-red-500 mt-1">
                        {errors.matchNumber.message}
                    </Text>
                )}
                </VStack>
                </HStack>

                {/* Second Row of General*/}

                {/* <HStack space="4xl" className="w-full justify-center">
                <VStack space="lg" className="w-1/4 justify-center">
                        <VStack className="">
                        <Text className="">Score</Text>
                        <Controller
                            control={control}
                            name="score"
                            rules={{
                                required: "Score is required",
                                pattern: {
                                    value: /^\d+$/,
                                    message: "The score must be numeric.",
                                },
                            }}
                            render={({ field: { onChange, value } }) => (
                                <Input size="md" className="rounded">
                                    <InputField
                                        inputMode="numeric"
                                        placeholder="0"
                                        value={String(value || 0)} // Ensure value is a string for InputField
                                        onChangeText={(text) => {
                                            const numericValue = parseInt(text, 10) || 0;
                                            onChange(numericValue); // Update React Hook Form's state
                                        }}
                                        autoCorrect={false}
                                    />
                                </Input>
                            )}
                        />
                    
                        <HStack className="">
                            <Pressable
                                onPress={() => handleIncrease("score")}
                                className="flex rounded items-center justify-center bg-primary-500"
                                style={{ height: 40, width: 45.5 }}
                            >
                                <Text className="text-typography-0">+</Text>
                            </Pressable>
                            <Pressable
                                onPress={() => handleDecrease("score")}
                                className="flex rounded items-center justify-center bg-primary-500"
                                style={{ height: 40, width: 45.5 }}
                            >
                                <Text className="text-typography-0">-</Text>
                            </Pressable>
                        </HStack>
                    </VStack>
                </VStack>
                <VStack className="">
                <VStack className="items-center">
                <Text>Won</Text>
                <Pressable
                    onPress={()=>toggleField("won")}
                    className="flex rounded items-center justify-center bg-primary-500"
                    style={{ height: 40, width: 80 }}
                    disabled={watch("tied")}
                >
                    <Text className="text-typography-0">{watch("won") ? "yes" : "no"}</Text>
                </Pressable>
                </VStack>
                <VStack className="items-center">
                <Text>Tied</Text>
                <Pressable
                    onPress={()=>toggleField("tied")}
                    className="flex rounded items-center justify-center bg-primary-500"
                    style={{ height: 40, width: 80 }}
                    disabled={watch("won")}
                >
                    <Text className="text-typography-0">{watch("tied") ? "yes" : "no"}</Text>
                </Pressable>
                </VStack>
                </VStack>
                <VStack className="">
                <VStack className="items-center">
                <Text>Defensive</Text>
                <Pressable
                    onPress={()=>toggleField("defensive")}
                    className="flex rounded items-center justify-center bg-primary-500"
                    style={{ height: 40, width: 80 }}
                    disabled={false}
                >
                    <Text className="text-typography-0">{watch("defensive") ? "yes" : "no"}</Text>
                </Pressable>
                </VStack>
                <VStack className="items-center">
                <Text>Broke Down</Text>
                <Pressable
                    onPress={()=>toggleField("brokeDown")}
                    className="flex rounded items-center justify-center bg-primary-500"
                    style={{ height: 40, width: 80 }}
                    disabled={false}
                >
                    <Text className="text-typography-0">{watch("brokeDown") ? "yes" : "no"}</Text>
                </Pressable>
                </VStack>
                </VStack>
                </HStack> */}

                {/* End General */}

                {/* Start Auto */}

                <HStack className="w-full items-center justify-center">


                <VStack space="4xl" className="flex-1 justify-center">

                <Text size="xl" className="self-center color-black"> Auto </Text>
                

                <VStack space="lg" className="w-full mr-3 justify-center">
                        <VStack className="w-full">
                        <Text className="">Coral</Text>
                        <Controller
                            control={control}
                            name="auto.coral"
                            rules={{
                                required: "Required",
                                pattern: {
                                    value: /^\d+$/,
                                    message: "The num must be numeric.",
                                },
                            }}
                            render={({ field: { onChange, value } }) => (
                                <Input size="md" className="rounded">
                                    <InputField
                                        inputMode="numeric"
                                        placeholder="0"
                                        value={String(value || 0)} // Ensure value is a string for InputField
                                        onChangeText={(text) => {
                                            const numericValue = parseInt(text, 10) || 0;
                                            onChange(numericValue); // Update React Hook Form's state
                                        }}
                                        autoCorrect={false}
                                    />
                                </Input>
                            )}
                        />
                    
                        <HStack className="w-full">
                            <Pressable
                                onPress={() => {
                                    handleIncrease("auto.coral");
                                    if (watch("auto.coral") >= 1){
                                    setValue("auto.leave",true);
                                    }
                                }
                                }
                                className="flex rounded items-center flex-1 justify-center bg-primary-500"
                                style={{ height: 40, width: 45.5 }}
                            >
                                <Text className="text-typography-0">+</Text>
                            </Pressable>
                            <Pressable
                                onPress={() => {handleDecrease("auto.coral");
                                                if (watch("auto.coral") >= 0){
                                                    setValue("auto.leave",false);
                                                }

                                }}
                                className="flex rounded items-center justify-center flex-1 bg-primary-500"
                                style={{ height: 40, width: 45.5 }}
                            >
                                <Text className="text-typography-0">-</Text>
                            </Pressable>
                        </HStack>
                    </VStack>
                </VStack>

                <VStack space="lg" className="w-full mr-3 justify-center">
                        <VStack className="">
                        <Text className="">Algae</Text>
                        <Controller
                            control={control}
                            name="auto.algae"
                            rules={{
                                required: "Required",
                                pattern: {
                                    value: /^\d+$/,
                                    message: "The num must be numeric.",
                                },
                            }}
                            render={({ field: { onChange, value } }) => (
                                <Input size="md" className="rounded">
                                    <InputField
                                        inputMode="numeric"
                                        placeholder="0"
                                        value={String(value || 0)} // Ensure value is a string for InputField
                                        onChangeText={(text) => {
                                            const numericValue = parseInt(text, 10) || 0;
                                            onChange(numericValue); // Update React Hook Form's state
                                        }}
                                        autoCorrect={false}
                                    />
                                </Input>
                            )}
                        />
                    
                        <HStack className="w-full">
                            <Pressable
                                onPress={() => handleIncrease("auto.algae")}
                                className="flex rounded items-center justify-center flex-1 bg-primary-500"
                                style={{ height: 40, width: 45.5 }}
                            >
                                <Text className="text-typography-0">+</Text>
                            </Pressable>
                            <Pressable
                                onPress={() => handleDecrease("auto.algae")}
                                className="flex rounded items-center justify-center flex-1 bg-primary-500"
                                style={{ height: 40, width: 45.5 }}
                            >
                                <Text className="text-typography-0">-</Text>
                            </Pressable>
                        </HStack>
                    </VStack>
                </VStack>

                {/* <VStack className="items-center"> */}
                <VStack>
                <Text>Human Player</Text>
                <HStack>
                <Pressable
                    onPress={()=>setValue("auto.humanPlayer",true)}
                    className={`flex rounded items-center justify-center ${!watch("auto.humanPlayer") ? 'bg-gray-500' : 'bg-primary-500'}`}
                    style={{ height: 40, width: 80 }}
                >
                    <Text className="text-typography-0">Feed</Text>
                </Pressable>
                <Pressable
                    onPress={()=>setValue("auto.humanPlayer",false)}
                    className={`flex rounded items-center justify-center ${watch("auto.humanPlayer") ? 'bg-gray-500' : 'bg-primary-500'}`}
                    style={{ height: 40, width: 80 }}
                >
                    <Text className="text-typography-0">No Feed</Text>
                </Pressable>
                </HStack>
                </VStack>
                </VStack>



                <Box
        style={{
          borderLeftWidth: 2,
          borderColor: "gray",
          height: "100%",
          marginLeft:4,
        }}
      ></Box>



                <VStack space="4xl" className="flex-1 ml-1 justify-center">

                <Text size="xl" className="self-center color-black"> Teleop </Text>
                

                <VStack space="lg" className="w-full justify-center">
                        <VStack className="w-full">
                        <Text className="">Coral</Text>
                        <Controller
                            control={control}
                            name="teleop.coral"
                            rules={{
                                required: "Required",
                                pattern: {
                                    value: /^\d+$/,
                                    message: "The num must be numeric.",
                                },
                            }}
                            render={({ field: { onChange, value } }) => (
                                <Input size="md" className="rounded">
                                    <InputField
                                        inputMode="numeric"
                                        placeholder="0"
                                        value={String(value || 0)} // Ensure value is a string for InputField
                                        onChangeText={(text) => {
                                            const numericValue = parseInt(text, 10) || 0;
                                            onChange(numericValue); // Update React Hook Form's state
                                        }}
                                        autoCorrect={false}
                                    />
                                </Input>
                            )}
                        />
                    
                        <HStack className="w-full">
                            <Pressable
                                onPress={() => {
                                    handleIncrease("teleop.coral");
                                    if (watch("teleop.coral") >= 1){
                                    setValue("auto.leave",true);
                                    }
                                }
                                }
                                className="flex rounded items-center flex-1 justify-center bg-primary-500"
                                style={{ height: 40, width: 45.5 }}
                            >
                                <Text className="text-typography-0">+</Text>
                            </Pressable>
                            <Pressable
                                onPress={() => {handleDecrease("teleop.coral");
                                                if (watch("auto.coral") >= 0){
                                                    setValue("auto.leave",false);
                                                }

                                }}
                                className="flex rounded items-center justify-center flex-1 bg-primary-500"
                                style={{ height: 40, width: 45.5 }}
                            >
                                <Text className="text-typography-0">-</Text>
                            </Pressable>
                        </HStack>
                    </VStack>
                </VStack>

                <VStack space="lg" className="w-full ml-1 justify-center">
                        <VStack className="">
                        <Text className="">Algae</Text>
                        <Controller
                            control={control}
                            name="teleop.algae"
                            rules={{
                                required: "Required",
                                pattern: {
                                    value: /^\d+$/,
                                    message: "The num must be numeric.",
                                },
                            }}
                            render={({ field: { onChange, value } }) => (
                                <Input size="md" className="rounded">
                                    <InputField
                                        inputMode="numeric"
                                        placeholder="0"
                                        value={String(value || 0)} // Ensure value is a string for InputField
                                        onChangeText={(text) => {
                                            const numericValue = parseInt(text, 10) || 0;
                                            onChange(numericValue); // Update React Hook Form's state
                                        }}
                                        autoCorrect={false}
                                    />
                                </Input>
                            )}
                        />
                    
                        <HStack className="w-full">
                            <Pressable
                                onPress={() => handleIncrease("teleop.algae")}
                                className="flex rounded items-center justify-center flex-1 bg-primary-500"
                                style={{ height: 40, width: 45.5 }}
                            >
                                <Text className="text-typography-0">+</Text>
                            </Pressable>
                            <Pressable
                                onPress={() => handleDecrease("teleop.algae")}
                                className="flex rounded items-center justify-center flex-1 bg-primary-500"
                                style={{ height: 40, width: 45.5 }}
                            >
                                <Text className="text-typography-0">-</Text>
                            </Pressable>
                        </HStack>
                    </VStack>
                    
                </VStack>

                <VStack className="items-center">
                <Text>Human Player</Text>
                <Pressable
                    onPress={()=>toggleField("teleop.humanPlayer")}
                    className="flex rounded items-center justify-center bg-primary-500"
                    style={{ height: 40, width: 80 }}
                >
                    <Text className="text-typography-0">{watch("telop.humanPlayer") ? "Feed" : "No Feed"}</Text>
                </Pressable>
                </VStack>

                </VStack>

                </HStack>

                <VStack>

                { /* <VStack className="items-center">
                <Text>Left</Text>
                <Pressable
                    onPress={()=>toggleField("auto.leave")}
                    className="flex rounded items-center justify-center bg-primary-500"
                    style={{ height: 40, width: 80 }}
                    disabled={watch("auto.coral")>0}
                >
                    <Text className="text-typography-0">{watch("auto.leave") ? "yes" : "no"}</Text>
                </Pressable>
                </VStack>

                <VStack className="items-center">
                <Text>Human Player</Text>
                <Pressable
                    onPress={()=>toggleField("auto.humanPlayer")}
                    className="flex rounded items-center justify-center bg-primary-500"
                    style={{ height: 40, width: 80 }}
                >
                    <Text className="text-typography-0">{watch("auto.humanPlayer") ? "Feed" : "No Feed"}</Text>
                </Pressable>
                </VStack> */}

                </VStack> 

                {/* End Auto */}

                {/* Start Teleop */}

                {/* <Text size="xl" className="self-center color-black"> Teleop </Text>

                <VStack space="4xl" className="w-full justify-center">
                

                <VStack space="lg" className="w-1/4 justify-center">
                        <VStack className="">
                        <Text className="">Coral</Text>
                        <Controller
                            control={control}
                            name="teleop.coral"
                            rules={{
                                required: "Required",
                                pattern: {
                                    value: /^\d+$/,
                                    message: "The num must be numeric.",
                                },
                            }}
                            render={({ field: { onChange, value } }) => (
                                <Input size="md" className="rounded">
                                    <InputField
                                        inputMode="numeric"
                                        placeholder="0"
                                        value={String(value || 0)} // Ensure value is a string for InputField
                                        onChangeText={(text) => {
                                            const numericValue = parseInt(text, 10) || 0;
                                            onChange(numericValue); // Update React Hook Form's state
                                        }}
                                        autoCorrect={false}
                                    />
                                </Input>
                            )}
                        />
                    
                        <HStack className="">
                            <Pressable
                                onPress={() => handleIncrease("teleop.coral")}
                                className="flex rounded items-center justify-center bg-primary-500"
                                style={{ height: 40, width: 45.5 }}
                            >
                                <Text className="text-typography-0">+</Text>
                            </Pressable>
                            <Pressable
                                onPress={() => handleDecrease("teleop.coral")}
                                className="flex rounded items-center justify-center bg-primary-500"
                                style={{ height: 40, width: 45.5 }}
                            >
                                <Text className="text-typography-0">-</Text>
                            </Pressable>
                        </HStack>
                    </VStack>
                </VStack>

                <VStack space="lg" className="w-1/4 justify-center">
                        <VStack className="">
                        <Text className="">Algae</Text>
                        <Controller
                            control={control}
                            name="teleop.algae"
                            rules={{
                                required: "Required",
                                pattern: {
                                    value: /^\d+$/,
                                    message: "The num must be numeric.",
                                },
                            }}
                            render={({ field: { onChange, value } }) => (
                                <Input size="md" className="rounded">
                                    <InputField
                                        inputMode="numeric"
                                        placeholder="0"
                                        value={String(value || 0)} // Ensure value is a string for InputField
                                        onChangeText={(text) => {
                                            const numericValue = parseInt(text, 10) || 0;
                                            onChange(numericValue); // Update React Hook Form's state
                                        }}
                                        autoCorrect={false}
                                    />
                                </Input>
                            )}
                        />
                    
                        <HStack className="">
                            <Pressable
                                onPress={() => handleIncrease("teleop.algae")}
                                className="flex rounded items-center justify-center bg-primary-500"
                                style={{ height: 40, width: 45.5 }}
                            >
                                <Text className="text-typography-0">+</Text>
                            </Pressable>
                            <Pressable
                                onPress={() => handleDecrease("teleop.algae")}
                                className="flex rounded items-center justify-center bg-primary-500"
                                style={{ height: 40, width: 45.5 }}
                            >
                                <Text className="text-typography-0">-</Text>
                            </Pressable>
                        </HStack>
                    </VStack>
                </VStack>

                <VStack>

                <VStack className="items-center">
                <Text>Left</Text>
                <Pressable
                    onPress={()=>toggleField("auto.leave")}
                    className="flex rounded items-center justify-center bg-primary-500"
                    style={{ height: 40, width: 80 }}
                >
                    <Text className="text-typography-0">{watch("auto.leave") ? "yes" : "no"}</Text>
                </Pressable>
                </VStack>

                <VStack className="items-center">
                <Text>Human Player</Text>
                <Pressable
                    onPress={()=>toggleField("auto.humanPlayer")}
                    className="flex rounded items-center justify-center bg-primary-500"
                    style={{ height: 40, width: 80 }}
                >
                    <Text className="text-typography-0">{watch("auto.humanPlayer") ? "Feed" : "No Feed"}</Text>
                </Pressable>
                </VStack>

                </VStack>

                </VStack>  */}

                {/* End Teleop */}
                

                <VStack space="lg" className="w-1/4">
                        <VStack className="">
                        <Text className="">Ranking Points</Text>
                        <Controller
                            control={control}
                            name="rankingPoints"
                            rules={{
                                required: "Ranking points are required",
                                pattern: {
                                    value: /^\d+$/,
                                    message: "The points must be numeric.",
                                },
                            }}
                            render={({ field: { onChange, value } }) => (
                                <Input size="md" className="rounded">
                                    <InputField
                                        inputMode="numeric"
                                        placeholder="0"
                                        value={String(value || 0)} // Ensure value is a string for InputField
                                        onChangeText={(text) => {
                                            const numericValue = parseInt(text, 10) || 0;
                                            onChange(numericValue); // Update React Hook Form's state
                                        }}
                                        autoCorrect={false}
                                    />
                                </Input>
                            )}
                        />
                    
                        <HStack className="">
                            <Pressable
                                onPress={() => handleIncrease("rankingPoints")}
                                className="flex rounded items-center justify-center bg-primary-500"
                                style={{ height: 40, width: 45.5 }}
                            >
                                <Text className="text-typography-0">+</Text>
                            </Pressable>
                            <Pressable
                                onPress={() => handleDecrease("rankingPoints")}
                                className="flex rounded items-center justify-center bg-primary-500"
                                style={{ height: 40, width: 45.5 }}
                            >
                                <Text className="text-typography-0">-</Text>
                            </Pressable>
                        </HStack>
                    </VStack>
                </VStack>

              </VStack>

            </ScrollView>

        </TouchableWithoutFeedback>

    </KeyboardAvoidingView>
);
};
export default ScoutingForm;