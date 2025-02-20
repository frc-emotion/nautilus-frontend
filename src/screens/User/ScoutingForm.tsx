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
import { Checkbox, CheckboxGroup, CheckboxIcon, CheckboxIndicator, CheckboxLabel } from "@/components/ui/checkbox";
import { CheckCircleIcon, CheckIcon, ChevronUpIcon, CircleIcon } from "@/components/ui/icon";
import { Radio, RadioGroup, RadioIcon, RadioIndicator, RadioLabel } from "@/components/ui/radio";
import { Accordion, AccordionContent, AccordionHeader, AccordionIcon, AccordionItem, AccordionTitleText, AccordionTrigger } from "@/components/ui/accordion";
import { Divider } from "@/components/ui/divider";


const ScoutingForm: React.FC = () => {
    const { colorMode } = useThemeContext();
    const [selectedCoralLevel, setSelectedCoralLevel] = useState<number>(1);
    const [selectedAlgaePickup, setSelectedAlgaePickup] = useState<number>(1);

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
          coral: number[];
          algae: number[];
          humanPlayer: boolean;
          coralLevel: string[]; // Correct type for the array of numbers
        };
        teleop: {
          leave: boolean;
          coral: number[];
          algae: number[];
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
                    "coral": [0,0,0,0], // l1,l2,l3,l4
                    "algae": [0,0], // [human player, ground intake]
                    "humanPlayer": false, // did the human player interact during auto
                    "coralLevel": [], //1,2,3,4
                },
                "teleop": {
                    "leave":false,
                    "coral":[0,0,0,0], // l1,l2,l3,l4
                    "algae": [0,0], // [human player, ground intake]
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

    
    const handleIncrease = (field: string, selected: number) => {
        const currentValue = watch(field);
        console.log(currentValue,selected);
        // if (typeof currentValue === "number") {
        setValue(field, currentValue.map((item, index) => 
            index === selected-1 ? item+1 : item));
        // }
        console.log(getValues(field));
    };

    const handleDecrease = (field: string, selected: number) => {
        const currentValue = watch(field);
        // if (typeof currentValue === "number") {
        setValue(field, currentValue.map((item, index) => 
            (index === selected-1) && (item>0) ? item-1 : item
        ));
        // }
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
                <Accordion
                    size="md"
                    variant="unfilled"
                    type="multiple"
                    isCollapsible={true}
                    isDisabled={false}
                    className="w-[100%] border border-outline-50"
                    defaultValue={["a","b","c"]}
                >

                
                
                {/* Start General */}

                <AccordionItem value="c">
                <AccordionHeader>
                <AccordionTrigger>
                    {({ isExpanded }) => {
                    return (
                        <>
                        <AccordionTitleText>
                        General
                        </AccordionTitleText>
                        {isExpanded ? (
                            <AccordionIcon as={ChevronUpIcon} className="ml-3" />
                        ) : (
                            <AccordionIcon as={ChevronDownIcon} className="ml-3" />
                        )}
                        </>
                    )
                    }}
                </AccordionTrigger>
                </AccordionHeader>
                <AccordionContent>

                <Text size="3xl" className="self-center color-black"> General </Text>
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
                        <SelectItem label="Port Hueneme Week 1 2025" value="port-hueneme-2025" isDisabled={false}/>
                    </SelectContent>
                    </SelectPortal>
                </Select>
                </VStack>
                <HStack space="lg" className="w-full justify-center pr-2 pl-2">

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


                </AccordionContent>
                </AccordionItem>

                <Divider />
                

                

                {/* End General */}

                {/* Start Auto */}

      <AccordionItem value="a">
        <AccordionHeader>
          <AccordionTrigger>
            {({ isExpanded }) => {
              return (
                <>
                  <AccordionTitleText>
                   Autonomous
                  </AccordionTitleText>
                  {isExpanded ? (
                    <AccordionIcon as={ChevronUpIcon} className="ml-3" />
                  ) : (
                    <AccordionIcon as={ChevronDownIcon} className="ml-3" />
                  )}
                </>
              )
            }}
          </AccordionTrigger>
        </AccordionHeader>
        <AccordionContent>


                <VStack space="2xl" className="w-full items-center">

                <Text size="3xl" className="self-center color-black"> Autonomous </Text>

                <VStack space="4xl" className="w-full ml-auto flex items-center">                

                <VStack space="lg" className="w-full justify-center">
                        <VStack space="sm" className="w-full">
                        <Text size="xl" className="self-center">Coral: Level {selectedCoralLevel}</Text>
                        <HStack space="lg" className="align-center justify-center">
                            <Pressable className={`rounded ${selectedCoralLevel===1 ? 'bg-green-300' : 'bg-gray-150'}`} onPress={() => setSelectedCoralLevel(1)}>
                                <Text size="lg" className="m-2">Level 1</Text>
                            </Pressable>
                            <Pressable className={`rounded ${selectedCoralLevel===2 ? 'bg-green-300' : 'bg-gray-150'}`} onPress={() => setSelectedCoralLevel(2)}>
                                <Text size="lg" className="m-2">Level 2</Text>
                            </Pressable>
                            <Pressable className={`rounded ${selectedCoralLevel===3 ? 'bg-green-300' : 'bg-gray-150'}`} onPress={() => setSelectedCoralLevel(3)}>
                                <Text size="lg" className="m-2">Level 3</Text>
                            </Pressable>
                            <Pressable className={`rounded ${selectedCoralLevel===4 ? 'bg-green-300' : 'bg-gray-150'}`} onPress={() => setSelectedCoralLevel(4)}>
                                <Text size="lg" className="m-2">Level 4</Text>
                            </Pressable>
                        </HStack>
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
                                <Input size="xl" className="rounded"
                                style={{height: 55}}>
                                    <InputField
                                        className="text-center"
                                        inputMode="numeric"
                                        placeholder="0"
                                        value={String(value[selectedCoralLevel-1] || 0)} // Ensure value is a string for InputField
                                        onChangeText={(text) => {
                                            const numericValue = parseInt(text, 10) || 0;
                                            setValue("auto.coral", getValues("auto.coral").map((item, index) => 
                                                (index === selectedCoralLevel-1) ? numericValue : item
                                            )); // Update React Hook Form's state
                                        }}
                                        autoCorrect={false}
                                    />
                                </Input>
                            )}
                        />
                    
                        <HStack space="sm" className="w-full">
                            <Pressable
                                onPress={() => {
                                    handleIncrease("auto.coral", selectedCoralLevel);
                                }
                                }
                                className="flex rounded items-center flex-1 justify-center bg-green-500"
                                style={{ height: 55, width: 45.5 }}
                            >
                                <Text size="3xl" className="text-typography-0">+</Text>
                            </Pressable>
                            <Pressable
                                onPress={() => {handleDecrease("auto.coral", selectedCoralLevel);
                                }}
                                className="flex rounded items-center justify-center flex-1 bg-red-500"
                                style={{ height: 55, width: 45.5 }}
                            >
                                <Text size="3xl" className="text-typography-0">-</Text>
                            </Pressable>
                        </HStack>
                    </VStack>
                </VStack>

                <VStack space="lg" className="w-full justify-center">
                        <VStack space="sm" className="">
                        <Text size="xl" className="self-center">Algae: {selectedAlgaePickup===1 ? "Processor" : "Barge"}</Text>
                        <HStack space="lg" className="align-center justify-center">
                            <Pressable className={`rounded ${selectedAlgaePickup===1 ? 'bg-green-300' : 'bg-gray-150'}`} onPress={() => setSelectedAlgaePickup(1)}>
                                <Text size="lg" className="m-2">Processor</Text>
                            </Pressable>
                            <Pressable className={`rounded ${selectedAlgaePickup===2 ? 'bg-green-300' : 'bg-gray-150'}`} onPress={() => setSelectedAlgaePickup(2)}>
                                <Text size="lg" className="m-2">Barge</Text>
                            </Pressable>
                        </HStack>
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
                                <Input size="xl" className="rounded"
                                style={{height: 55}}>
                                    <InputField
                                        className="text-center"
                                        inputMode="numeric"
                                        placeholder="0"
                                        value={String(value[selectedAlgaePickup-1] || 0)} // Ensure value is a string for InputField
                                        onChangeText={(text) => {
                                            const numericValue = parseInt(text, 10) || 0;
                                            setValue("auto.algae", getValues("auto.algae").map((item, index) => 
                                                (index === selectedAlgaePickup-1) ? numericValue : item
                                            ));// Update React Hook Form's state
                                        }}
                                        autoCorrect={false}
                                    />
                                </Input>
                            )}
                        />
                    
                        <HStack space="sm" className="w-full">
                            <Pressable
                                onPress={() => handleIncrease("auto.algae",selectedAlgaePickup)}
                                className="flex rounded items-center justify-center flex-1 bg-green-500"
                                style={{ height: 55, width: 45.5 }}
                            >
                                <Text size="3xl" className="text-typography-0">+</Text>
                            </Pressable>
                            <Pressable
                                onPress={() => handleDecrease("auto.algae",selectedAlgaePickup)}
                                className="flex rounded items-center justify-center flex-1 bg-red-500"
                                style={{ height: 55, width: 45.5 }}
                            >
                                <Text size="3xl" className="text-typography-0">-</Text>
                            </Pressable>
                        </HStack>
                    </VStack>
                </VStack>

                </VStack>

                </VStack>

<VStack>


</VStack> 

                </AccordionContent>
      </AccordionItem>
      <Divider />
                {/* <HStack space="xl">

                <VStack space="lg" className="w-1/2 items-center">
                <Text size="xl" className="">Human Player</Text>

                <VStack space="sm" className="w-2/3">
                <Pressable
                    onPress={()=>setValue("auto.humanPlayer",true)}
                    className={`rounded items-center justify-center ${!watch("auto.humanPlayer") ? 'bg-gray-500' : 'bg-blue-500'}`}
                    style={{ height: 50, width: 150 }}
                >
                    <Text className="text-typography-0">Feed</Text>
                </Pressable>
                <Pressable
                    onPress={()=>setValue("auto.humanPlayer",false)}
                    className={`rounded items-center justify-center ${watch("auto.humanPlayer") ? 'bg-gray-500' : 'bg-blue-500'}`}
                    style={{ height: 50, width: 150 }}
                >
                    <Text className="text-typography-0">No Feed</Text>
                </Pressable>
                </VStack>
                </VStack>
                
                <VStack space="sm" className="w-1/2 items-center">

                <Text size="xl" className="self-center">Coral Scoring</Text>
                
                {/* <CheckboxGroup value={[]}> */}
                    {/* <HStack space="sm"> */}

                    {/* <VStack space="sm">
                        
                        <Checkbox value="1"
                                onChange={(isSelected)=>handleCoralLevelChange("auto","1")}
                                size="lg">
                        <CheckboxIndicator>
                        <CheckboxIcon as={CheckIcon}/>
                            {/* {watch("auto.coralLevel")?.includes("1") && (<CheckIcon />)} */}
                        {/* </CheckboxIndicator>
                        <CheckboxLabel><Text size="xl">Level 1</Text></CheckboxLabel>
                        </Checkbox>

                        <Checkbox value="2"
                        size="lg"
                            onChange={(isSelected)=>{handleCoralLevelChange("auto","2");
                            }}>
                        <CheckboxIndicator>
                            <CheckboxIcon as={CheckIcon}/>
                            {/* {watch("auto.coralLevel")?.includes("2") && (<CheckIcon />)} */}
                        {/* </CheckboxIndicator>
                        <CheckboxLabel><Text size="xl">Level 2</Text></CheckboxLabel>
                        </Checkbox> */}
                    {/* </VStack>

                    <VStack space="sm"> */}

                        {/* <Checkbox value="3"
                        size="lg"
                                onChange={(isSelected) => handleCoralLevelChange("auto","3")}>
                        <CheckboxIndicator>
                        <CheckboxIcon as={CheckIcon}/>
                            {/* {watch("auto.coralLevel")?.includes("3") && (<CheckIcon />)} */}
                        {/* </CheckboxIndicator>
                        <CheckboxLabel><Text size="xl">Level 3</Text></CheckboxLabel>
                        </Checkbox>

                        <Checkbox value="4"
                        size="lg"
                                onChange={(isSelected)=>handleCoralLevelChange("auto","4")}
                                >
                        <CheckboxIndicator>
                        <CheckboxIcon as={CheckIcon}/>
                            {/* {watch("auto.coralLevel")?.includes("4") && (<CheckIcon />)} */}
                        {/* </CheckboxIndicator>
                        <CheckboxLabel><Text size="xl">Level 4</Text></CheckboxLabel>
                        </Checkbox>

                    </VStack> */}

                    {/* </HStack> */}
                {/* </CheckboxGroup> */}
                {/*</VStack>

                </HStack> */}

                {/* End Auto */}



                {/* Start Teleop */}
                <AccordionItem value="b">
                    <AccordionHeader>
                    <AccordionTrigger>
                        {({ isExpanded }) => {
                        return (
                            <>
                            <AccordionTitleText>
                            Teleoperated
                            </AccordionTitleText>
                            {isExpanded ? (
                                <AccordionIcon as={ChevronUpIcon} className="ml-3" />
                            ) : (
                                <AccordionIcon as={ChevronDownIcon} className="ml-3" />
                            )}
                            </>
                        )
                        }}
                    </AccordionTrigger>
                    </AccordionHeader>
                    <AccordionContent>

                <VStack space="2xl" className="w-full items-center">

                <Text size="3xl" className="self-center color-black">Teleoperated</Text>



                <VStack space="4xl" className="w-full ml-auto flex items-center">                

                <VStack space="lg" className="w-full justify-center">
                        <VStack space="sm" className="w-full">
                        <Text size="xl" className="self-center">Coral: Level {selectedCoralLevel}</Text>
                        <HStack space="lg" className="align-center justify-center">
                            <Pressable className={`rounded ${selectedCoralLevel===1 ? 'bg-green-300' : 'bg-gray-150'}`} onPress={() => setSelectedCoralLevel(1)}>
                                <Text size="lg" className="m-2">Level 1</Text>
                            </Pressable>
                            <Pressable className={`rounded ${selectedCoralLevel===2 ? 'bg-green-300' : 'bg-gray-150'}`} onPress={() => setSelectedCoralLevel(2)}>
                                <Text size="lg" className="m-2">Level 2</Text>
                            </Pressable>
                            <Pressable className={`rounded ${selectedCoralLevel===3 ? 'bg-green-300' : 'bg-gray-150'}`} onPress={() => setSelectedCoralLevel(3)}>
                                <Text size="lg" className="m-2">Level 3</Text>
                            </Pressable>
                            <Pressable className={`rounded ${selectedCoralLevel===4 ? 'bg-green-300' : 'bg-gray-150'}`} onPress={() => setSelectedCoralLevel(4)}>
                                <Text size="lg" className="m-2">Level 4</Text>
                            </Pressable>
                        </HStack>
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
                                <Input size="xl" className="rounded"
                                style={{height:55}}>
                                    <InputField
                                        className="text-center"
                                        inputMode="numeric"
                                        placeholder="0"
                                        value={String(value[selectedCoralLevel-1] || 0)} // Ensure value is a string for InputField
                                        onChangeText={(text) => {
                                            const numericValue = parseInt(text, 10) || 0;
                                            setValue("teleop.coral", getValues("teleop.coral").map((value,index) =>
                                                index === selectedCoralLevel-1 ? numericValue : value
                                        )); // Update React Hook Form's state
                                        }}
                                        autoCorrect={false}
                                    />
                                </Input>
                            )}
                        />
                    
                        <HStack space="sm" className="w-full">
                            <Pressable
                                onPress={() => {
                                    handleIncrease("teleop.coral", selectedCoralLevel);
                                }
                                }
                                className="flex rounded items-center flex-1 justify-center bg-green-500"
                                style={{ height: 55, width: 45.5 }}
                            >
                                <Text size="3xl" className="text-typography-0">+</Text>
                            </Pressable>
                            <Pressable
                                onPress={() => {handleDecrease("teleop.coral", selectedCoralLevel);

                                }}
                                className="flex rounded items-center justify-center flex-1 bg-red-500"
                                style={{ height: 55, width: 45.5 }}
                            >
                                <Text size="3xl" className="text-typography-0">-</Text>
                            </Pressable>
                        </HStack>
                    </VStack>
                </VStack>

                <VStack space="lg" className="w-full justify-center">
                        <VStack space="sm" className="">
                        <Text size="xl" className="self-center">Algae: {selectedAlgaePickup===1 ? "Processor" : "Algae"}</Text>
                        <HStack space="lg" className="align-center justify-center">
                            <Pressable className={`rounded ${selectedAlgaePickup===1 ? 'bg-green-300' : 'bg-gray-150'}`} onPress={() => setSelectedAlgaePickup(1)}>
                                <Text size="lg" className="m-2">Processor</Text>
                            </Pressable>
                            <Pressable className={`rounded ${selectedAlgaePickup===2 ? 'bg-green-300' : 'bg-gray-150'}`} onPress={() => setSelectedAlgaePickup(2)}>
                                <Text size="lg" className="m-2">Barge</Text>
                            </Pressable>
                        </HStack>
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
                                <Input size="xl" className="rounded"
                                style={{height:55}}>
                                    <InputField
                                        className="text-center"
                                        inputMode="numeric"
                                        placeholder="0"
                                        value={String(value[selectedAlgaePickup-1] || 0)} // Ensure value is a string for InputField
                                        onChangeText={(text) => {
                                            const numericValue = parseInt(text, 10) || 0;
                                            setValue("teleop.algae",getValues("teleop.algae").map((value,index) =>
                                                index===selectedAlgaePickup-1 ? numericValue : value
                                        )) // Update React Hook Form's state
                                        }}
                                        autoCorrect={false}
                                    />
                                </Input>
                            )}
                        />
                    
                        <HStack space="sm" className="w-full">
                            <Pressable
                                onPress={() => handleIncrease("teleop.algae", selectedAlgaePickup)}
                                className="flex rounded items-center justify-center flex-1 bg-green-500"
                                style={{ height: 55, width: 45.5 }}
                            >
                                <Text size="3xl" className="text-typography-0">+</Text>
                            </Pressable>
                            <Pressable
                                onPress={() => handleDecrease("teleop.algae", selectedAlgaePickup)}
                                className="flex rounded items-center justify-center flex-1 bg-red-500"
                                style={{ height: 55, width: 45.5 }}
                            >
                                <Text size="3xl" className="text-typography-0">-</Text>
                            </Pressable>
                        </HStack>
                    </VStack>
                </VStack>

                </VStack>

                

                <VStack className="justify-center items-center">

                <Text size="xl">Climb</Text>

                <RadioGroup>
                    <HStack space="3xl">
                    <VStack space="md">
                    <Radio value="a" size="lg" isInvalid={false} isDisabled={false}>
                        <RadioIndicator>
                        <RadioIcon as={CircleIcon} />
                        </RadioIndicator>
                        <RadioLabel><Text size="xl">Shallow Cage</Text></RadioLabel>
                    </Radio>
                    <Radio value="b" size="lg" isInvalid={false} isDisabled={false}>
                        <RadioIndicator>
                        <RadioIcon as={CircleIcon} />
                        </RadioIndicator>
                        <RadioLabel><Text size="xl">Deep Cage</Text></RadioLabel>
                    </Radio>
                    </VStack>
                    <VStack space="md">
                    <Radio value="c" size="lg" isInvalid={false} isDisabled={false}>
                        <RadioIndicator>
                        <RadioIcon as={CircleIcon} />
                        </RadioIndicator>
                        <RadioLabel><Text size="xl">Park</Text></RadioLabel>
                    </Radio>
                    <Radio value="d" size="lg" isInvalid={false} isDisabled={false}>
                        <RadioIndicator>
                        <RadioIcon as={CircleIcon} />
                        </RadioIndicator>
                        <RadioLabel><Text size="xl">N/A</Text></RadioLabel>
                    </Radio>
                    </VStack>
                    </HStack>
                </RadioGroup>

                </VStack>

                </VStack> 

                </AccordionContent>
                </AccordionItem>

                {/* End Teleop */}




                <AccordionItem value="e">
                    <AccordionHeader>
                    <AccordionTrigger>
                        {({ isExpanded }) => {
                        return (
                            <>
                            <AccordionTitleText>
                            Postmatch
                            </AccordionTitleText>
                            {isExpanded ? (
                                <AccordionIcon as={ChevronUpIcon} className="ml-3" />
                            ) : (
                                <AccordionIcon as={ChevronDownIcon} className="ml-3" />
                            )}
                            </>
                        )
                        }}
                    </AccordionTrigger>
                    </AccordionHeader>
                    <AccordionContent>

                    </AccordionContent>
                </AccordionItem>

                </Accordion>
                

                

              </VStack>

            </ScrollView>

        </TouchableWithoutFeedback>

    </KeyboardAvoidingView>
);
};
export default ScoutingForm;