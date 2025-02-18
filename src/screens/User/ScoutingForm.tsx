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
import { Checkbox, CheckboxGroup, CheckboxIndicator, CheckboxLabel } from "@/components/ui/checkbox";
import { CheckIcon } from "@/components/ui/icon";


const ScoutingForm: React.FC = () => {
    const { colorMode } = useThemeContext();
    type FormValues = {
        competition: string;
        teamNumber: number;
        matchNumber: number;
        score: number;
        penaltyPointsEarned: number;
        won: boolean;
        tied: boolean;
        comments: string;
        defensive: boolean;
        brokeDown: boolean;
        rankingPoints: number;
        auto: {
          leave: boolean;
          coral: number;
          algae: number;
          humanPlayer: boolean;
          coralLevel: string[]; // Correct type for the array of numbers
        };
        teleop: {
          coral: number;
          algae: number;
          humanPlayer: boolean;
          coralLevel:string[];
        };
        climb: {
          shallowCage: boolean;
          deepCage: boolean;
        };
      };
    const {
        control,
        handleSubmit,
        watch,
        reset,
        setValue,
        getValues,
        formState: { errors },
      } = useForm<FormValues>({
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
                    "coralLevel": [], //1,2,3,4
                },
                "teleop": {
                    "coral": 0,
                    "algae": 0,
                    "humanPlayer": false,
                    "coralLevel": [],
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

    const handleCoralLevelChange = (time: string, level: string)=>{
        if (time==="auto"){
            let levels = getValues("auto.coralLevel") || []
            if (levels.includes(level)){
                setValue("auto.coralLevel",levels.filter((lvl) => lvl !== level));
            }
            else{
                setValue("auto.coralLevel",[...levels,level]);
            }
        }
        else{
            let levels = getValues("teleop.coralLevel") || []
            if (levels.includes(level)){
                setValue("teleop.coralLevel",levels.filter((lvl) => lvl !== level));
            }
            else{
                setValue("teleop.coralLevel",[...levels,level]);
            }
        }

    }

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

                {/* End General */}

                {/* Start Auto */}

                <VStack space="lg" className="w-full items-center">

                <Text size="xl" className="self-center color-black"> Auto </Text>



                <HStack space="4xl" className="ml-auto flex-1 justify-center">                

                <VStack space="lg" className="w-1/2 justify-center">
                        <VStack className="w-full">
                        <Text className="self-center">Coral</Text>
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
                                        className="text-center"
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

                <VStack space="lg" className="w-1/2 justify-center">
                        <VStack className="">
                        <Text className="self-center">Algae</Text>
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
                                        className="text-center"
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

                </HStack>

                {/* <VStack className="items-center"> */}

                <HStack space="4xl">

                <VStack space="lg" className="w-1/2">
                <Text className="self-center">Human Player</Text>

                <HStack className="w-full">
                <Pressable
                    onPress={()=>setValue("auto.humanPlayer",true)}
                    className={`flex flex-1 rounded items-center justify-center ${!watch("auto.humanPlayer") ? 'bg-gray-500' : 'bg-primary-500'}`}
                    style={{ height: 40, width: 80 }}
                >
                    <Text className="text-typography-0">Feed</Text>
                </Pressable>
                <Pressable
                    onPress={()=>setValue("auto.humanPlayer",false)}
                    className={`flex flex-1 rounded items-center justify-center ${watch("auto.humanPlayer") ? 'bg-gray-500' : 'bg-primary-500'}`}
                    style={{ height: 40, width: 80 }}
                >
                    <Text className="text-typography-0">No Feed</Text>
                </Pressable>
                </HStack>
                </VStack>
                
                <VStack space="sm">

                <Text className="self-center">Coral Scoring</Text>
                
                <HStack>
                <CheckboxGroup value={[]}>
                    <HStack space="sm">

                    <VStack space="sm">
                        
                        <Checkbox value="1"
                                onChange={(isSelected)=>handleCoralLevelChange("auto","1")}
                                size="lg">
                        <CheckboxIndicator>
                            {watch("auto.coralLevel")?.includes("1") && (<CheckIcon />)}
                        </CheckboxIndicator>
                        <CheckboxLabel>Level 1</CheckboxLabel>
                        </Checkbox>

                        <Checkbox value="2"
                        size="lg"
                            onChange={(isSelected)=>{handleCoralLevelChange("auto","2");
                            }}>
                        <CheckboxIndicator>
                            {watch("auto.coralLevel")?.includes("2") && (<CheckIcon />)}
                        </CheckboxIndicator>
                        <CheckboxLabel>Level 2</CheckboxLabel>
                        </Checkbox>
                    </VStack>

                    <VStack space="sm">

                        <Checkbox value="3"
                        size="lg"
                                onChange={(isSelected) => handleCoralLevelChange("auto","3")}>
                        <CheckboxIndicator>
                            {watch("auto.coralLevel")?.includes("3") && (<CheckIcon />)}
                        </CheckboxIndicator>
                        <CheckboxLabel>Level 3</CheckboxLabel>
                        </Checkbox>

                        <Checkbox value="4"
                        size="lg"
                                onChange={(isSelected)=>handleCoralLevelChange("auto","4")}
                                >
                        <CheckboxIndicator>
                            {watch("auto.coralLevel")?.includes("4") && (<CheckIcon />)}
                        </CheckboxIndicator>
                        <CheckboxLabel>Level 4</CheckboxLabel>
                        </Checkbox>

                    </VStack>

                    </HStack>
                </CheckboxGroup>
                </HStack>

                </VStack>

                </HStack>


                </VStack>

                <VStack>


                </VStack> 

                {/* End Auto */}

                {/* Start Teleop */}

                {/* End Teleop */}
                

                

              </VStack>

            </ScrollView>

        </TouchableWithoutFeedback>

    </KeyboardAvoidingView>
);
};
export default ScoutingForm;