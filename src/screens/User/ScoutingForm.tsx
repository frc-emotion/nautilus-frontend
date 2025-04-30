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
import { useTheme } from '../../utils/UI/CustomThemeProvider';
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
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import {
    AlertDialog,
    AlertDialogBackdrop,
    AlertDialogBody,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
} from "@/components/ui/alert-dialog";
import { RefreshControl } from "react-native";


const ScoutingForm: React.FC = () => {
    const { theme } = useTheme();
    const navigation = useNavigation<StackNavigationProp<any>>();
    const { openModal } = useGlobalModal();
    const { openToast } = useGlobalToast();
    const { handleRequest } = useNetworking();
    const [selectedCoralLevel, setSelectedCoralLevel] = useState<number>(1);
    const [selectedAlgaePickup, setSelectedAlgaePickup] = useState<number>(1);
    const [isSubmitting, setSubmitting] = useState<boolean>(false);
    const [allCompetitions, setAllCompetitions] = useState<any[]>([]);
    const [showRefreshPopup, setShowRefeshPopup] = useState(false)
    const [refreshing, setRefreshing] = useState(false)


    const getCompetitions = async () => {
        const request: QueuedRequest = {
            url: "/api/scouting/competitions",
            method: "get",
            retryCount: 0,
            successHandler: async (response: AxiosResponse) => {
                const data = response.data;
                // let formattedCompetitions = data.map((comp) => ({
                //     label: comp.replace(/-/g, " ").replace(/\d{4}/, "").trim(),
                //     value: comp,
                // }));
                setAllCompetitions(data);
                console.log("YURRRRRR", allCompetitions);
            },
            errorHandler: async (error: AxiosError) => {
                console.error("Competitions didn't fetch:", error);

                handleErrorWithModalOrToast({
                    actionName: "Fetch Competitions",
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
                    description: "Get competitions request saved. It will be processed when you're back online.",
                    type: "info",
                });

                openModal({
                    title: "Offline",
                    message: "Get competitions request saved. It will be processed when you're back online.",
                    type: "info",
                });
            }
        };

        try {
            await handleRequest(request);
        } catch (error: any) {
            console.error("Error during get competitions:", error);
            openToast({
                title: "Error",
                description: "An error occurred while getting competitions. Please report this.",
                type: "error",
            });
        } finally {
        }
    };

    useEffect(() => {
        getCompetitions();
    }, []);


    type FormValues = {
        competition: string;
        teamNumber: number;
        matchNumber: number;
        score: number;
        penaltyPointsEarned: number;
        won: number;
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
            coralLevel: string[];
        };
        climb: string;
    };
    const {
        control,
        handleSubmit,
        trigger,
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
            "won": 0, // 0 = tied, -1 = lost, 1 = won
            "comments": "",
            "defensive": false,
            "brokeDown": false,
            "rankingPoints": 0,
            "auto": {
                "leave": false,
                "coral": [0, 0, 0, 0], // [l1, l2, l3, l4]
                "algae": [0, 0], // [human player, ground intake]
                "humanPlayer": false, // did the human player interact during auto
                "coralLevel": [], //1,2,3,4
            },
            "teleop": {
                "leave": false,
                "coral": [0, 0, 0, 0], // [l1, l2, l3, l4]
                "algae": [0, 0], // [human player, ground intake]
                "humanPlayer": false,
                "coralLevel": [], //1,2,3,4
            },
            "climb": "N/A", // "SHALLOW_CAGE, DEEP_CAGE, PARK, N/A
        },
    });


    const onError = (errors: FieldErrors) => {
        console.error("Validation errors:", errors);
        const firstError = Object.values(errors)[0];
        if (firstError && "message" in firstError) {
            openToast({
                title: "Validation Error",
                description: (firstError as { message: string }).message,
                type: "error",
            });
        }
    };

    const handleScout = async (data: FormValues) => {
        console.log("Scouting form submitted with data:", data);
        setSubmitting(true);

        const payload = {
            competition: data.competition,
            teamNumber: data.teamNumber,
            matchNumber: data.matchNumber,
            won: data.won,
            comments: data.comments,
            defensive: data.defensive,
            brokeDown: data.brokeDown,
            rankingPoints: data.rankingPoints,
            auto: {
                coral: data.auto.coral,
                algae: data.auto.algae,
            },
            teleop: {
                coral: data.teleop.coral,
                algae: data.teleop.algae,
            },
            climb: data.climb
        };

        console.log("Payload for API:", payload);

        const request: QueuedRequest = {
            url: "/api/scouting/form",
            method: "post",
            data: payload,
            retryCount: 3,
            successHandler: async (response: AxiosResponse) => {

                openToast({
                    title: "Scouting Successful",
                    description: "Your scouting form is submitted successfully.",
                    type: "success",
                });

                navigation.replace("RoleBasedTabs", {});

            },
            errorHandler: async (error: AxiosError) => {
                handleErrorWithModalOrToast({
                    actionName: "Scouting Form Submission",
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
                    description: "Scouting request saved. It will be processed when you're back online.",
                    type: "info",
                });

                openModal({
                    title: "Offline",
                    message: "Scouting request saved. It will be processed when you're back online.",
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
            setSubmitting(false);
        }
    };


    const handleIncrease = (field: string, selected: number) => {
        const currentValue = watch(field);
        console.log(currentValue, selected);
        // if (typeof currentValue === "number") {
        setValue(field, currentValue.map((item, index) =>
            index === selected - 1 ? item + 1 : item));
        // }
        console.log(getValues(field));
    };

    const handleDecrease = (field: string, selected: number) => {
        const currentValue = watch(field);
        // if (typeof currentValue === "number") {
        setValue(field, currentValue.map((item, index) =>
            (index === selected - 1) && (item > 0) ? item - 1 : item
        ));
        // }
        console.log(getValues(field));
    };

    const handleRefresh = async () => {
        setRefreshing(true)
        setShowRefeshPopup(true)

        return
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={120}
            className="flex-1"
            style={{ backgroundColor: theme === 'light' ? '#FFFFFF' : '#1A202C' }}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>

                <ScrollView
                    contentContainerStyle={{ flexGrow: 1 }}
                    automaticallyAdjustKeyboardInsets={true}
                    showsVerticalScrollIndicator
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                        />
                    }>
                    
                    <VStack
                        space="md"
                        className="w-full max-w-[600px] mx-auto p-4 rounded-md shadow-sm flex-1"//justify-center"
                        style={{
                            minHeight: '100%',
                            paddingHorizontal: 16,
                            paddingVertical: Platform.OS === "ios" ? 24 : 16,
                        }}
                    >
                        {showRefreshPopup && (

                            <AlertDialog

                                isOpen={showRefreshPopup}
                                onClose={() => {
                                    setRefreshing(false);
                                    setShowRefeshPopup(false);
                                }}
                            >
                                <AlertDialogBackdrop />
                                <AlertDialogContent>
                                    <AlertDialogHeader className="pb-4">
                                        <Text className="text-lg font-semibold">
                                            Refresh Page
                                        </Text>
                                    </AlertDialogHeader>
                                    <AlertDialogBody>
                                        <Text>
                                            This will reset everything you've entered in the form. Are you sure you want to continue?
                                        </Text>
                                    </AlertDialogBody>
                                    <AlertDialogFooter className="mt-2">
                                        <Button onPress={() => {
                                            setShowRefeshPopup(false);
                                            setRefreshing(false);
                                        }}>
                                            <ButtonText>Cancel</ButtonText>
                                        </Button>
                                        <Button
                                            variant="solid"
                                            className="ml-2"
                                            onPress={() => {
                                                reset();
                                                setShowRefeshPopup(false);
                                                setRefreshing(false);
                                            }}
                                        >
                                            <ButtonText>Confirm</ButtonText>
                                        </Button>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                        <Accordion
                            size="md"
                            variant="unfilled"
                            type="multiple"
                            isCollapsible={true}
                            isDisabled={false}
                            className="w-[100%] border border-outline-50"
                            defaultValue={["a", "b", "c", "d"]}
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
                                        <Select className="" onValueChange={(value) => { setValue("competition", value); trigger("competition"); }}>
                                            <SelectTrigger variant="outline" size="md" >
                                                <SelectInput placeholder="Select option" />
                                                <SelectIcon className="ml-auto" as={ChevronDownIcon} />
                                            </SelectTrigger>
                                            <SelectPortal>
                                                <SelectBackdrop />
                                                <SelectContent>
                                                    <SelectDragIndicatorWrapper>
                                                        <SelectDragIndicator />
                                                    </SelectDragIndicatorWrapper>
                                                    {allCompetitions?.map((comp) => (
                                                        <SelectItem label={comp.label} value={comp.value} />
                                                    ))}
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
                                                        value: /^\d+$/,
                                                        message: "The team number must be numeric.",
                                                    },
                                                }}
                                                render={({ field: { onChange, value } }) => (
                                                    <Input size="md" className="rounded">
                                                        <InputField
                                                            inputMode="numeric"
                                                            placeholder="2658"
                                                            value={value.toString()}
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
                                                        value: /^\d+$/,
                                                        message: "The match number must be numeric.",
                                                    },
                                                }}
                                                render={({ field: { onChange, value } }) => (
                                                    <Input size="md" className="rounded">
                                                        <InputField
                                                            inputMode="numeric"
                                                            placeholder="0"
                                                            value={value.toString()}
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
                                                        <Pressable className={`rounded ${selectedCoralLevel === 1 ? 'bg-green-300' : 'bg-gray-150'}`} onPress={() => setSelectedCoralLevel(1)}>
                                                            <Text size="lg" className="m-2">Level 1</Text>
                                                        </Pressable>
                                                        <Pressable className={`rounded ${selectedCoralLevel === 2 ? 'bg-green-300' : 'bg-gray-150'}`} onPress={() => setSelectedCoralLevel(2)}>
                                                            <Text size="lg" className="m-2">Level 2</Text>
                                                        </Pressable>
                                                        <Pressable className={`rounded ${selectedCoralLevel === 3 ? 'bg-green-300' : 'bg-gray-150'}`} onPress={() => setSelectedCoralLevel(3)}>
                                                            <Text size="lg" className="m-2">Level 3</Text>
                                                        </Pressable>
                                                        <Pressable className={`rounded ${selectedCoralLevel === 4 ? 'bg-green-300' : 'bg-gray-150'}`} onPress={() => setSelectedCoralLevel(4)}>
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
                                                                style={{ height: 55 }}>
                                                                <InputField
                                                                    className="text-center"
                                                                    inputMode="numeric"
                                                                    placeholder="0"
                                                                    value={String(value[selectedCoralLevel - 1] || 0)} // Ensure value is a string for InputField
                                                                    onChangeText={(text) => {
                                                                        const numericValue = parseInt(text, 10) || 0;
                                                                        setValue("auto.coral", getValues("auto.coral").map((item, index) =>
                                                                            (index === selectedCoralLevel - 1) ? numericValue : item
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
                                                            onPress={() => {
                                                                handleDecrease("auto.coral", selectedCoralLevel);
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
                                                    <Text size="xl" className="self-center">Algae: {selectedAlgaePickup === 1 ? "Processor" : "Barge"}</Text>
                                                    <HStack space="lg" className="align-center justify-center">
                                                        <Pressable className={`rounded ${selectedAlgaePickup === 1 ? 'bg-green-300' : 'bg-gray-150'}`} onPress={() => setSelectedAlgaePickup(1)}>
                                                            <Text size="lg" className="m-2">Processor</Text>
                                                        </Pressable>
                                                        <Pressable className={`rounded ${selectedAlgaePickup === 2 ? 'bg-green-300' : 'bg-gray-150'}`} onPress={() => setSelectedAlgaePickup(2)}>
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
                                                                style={{ height: 55 }}>
                                                                <InputField
                                                                    className="text-center"
                                                                    inputMode="numeric"
                                                                    placeholder="0"
                                                                    value={String(value[selectedAlgaePickup - 1] || 0)} // Ensure value is a string for InputField
                                                                    onChangeText={(text) => {
                                                                        const numericValue = parseInt(text, 10) || 0;
                                                                        setValue("auto.algae", getValues("auto.algae").map((item, index) =>
                                                                            (index === selectedAlgaePickup - 1) ? numericValue : item
                                                                        ));// Update React Hook Form's state
                                                                    }}
                                                                    autoCorrect={false}
                                                                />
                                                            </Input>
                                                        )}
                                                    />

                                                    <HStack space="sm" className="w-full">
                                                        <Pressable
                                                            onPress={() => handleIncrease("auto.algae", selectedAlgaePickup)}
                                                            className="flex rounded items-center justify-center flex-1 bg-green-500"
                                                            style={{ height: 55, width: 45.5 }}
                                                        >
                                                            <Text size="3xl" className="text-typography-0">+</Text>
                                                        </Pressable>
                                                        <Pressable
                                                            onPress={() => handleDecrease("auto.algae", selectedAlgaePickup)}
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
                                                        <Pressable className={`rounded ${selectedCoralLevel === 1 ? 'bg-green-300' : 'bg-gray-150'}`} onPress={() => setSelectedCoralLevel(1)}>
                                                            <Text size="lg" className="m-2">Level 1</Text>
                                                        </Pressable>
                                                        <Pressable className={`rounded ${selectedCoralLevel === 2 ? 'bg-green-300' : 'bg-gray-150'}`} onPress={() => setSelectedCoralLevel(2)}>
                                                            <Text size="lg" className="m-2">Level 2</Text>
                                                        </Pressable>
                                                        <Pressable className={`rounded ${selectedCoralLevel === 3 ? 'bg-green-300' : 'bg-gray-150'}`} onPress={() => setSelectedCoralLevel(3)}>
                                                            <Text size="lg" className="m-2">Level 3</Text>
                                                        </Pressable>
                                                        <Pressable className={`rounded ${selectedCoralLevel === 4 ? 'bg-green-300' : 'bg-gray-150'}`} onPress={() => setSelectedCoralLevel(4)}>
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
                                                                style={{ height: 55 }}>
                                                                <InputField
                                                                    className="text-center"
                                                                    inputMode="numeric"
                                                                    placeholder="0"
                                                                    value={String(value[selectedCoralLevel - 1] || 0)} // Ensure value is a string for InputField
                                                                    onChangeText={(text) => {
                                                                        const numericValue = parseInt(text, 10) || 0;
                                                                        setValue("teleop.coral", getValues("teleop.coral").map((value, index) =>
                                                                            index === selectedCoralLevel - 1 ? numericValue : value
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
                                                            onPress={() => {
                                                                handleDecrease("teleop.coral", selectedCoralLevel);

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
                                                    <Text size="xl" className="self-center">Algae: {selectedAlgaePickup === 1 ? "Processor" : "Algae"}</Text>
                                                    <HStack space="lg" className="align-center justify-center">
                                                        <Pressable className={`rounded ${selectedAlgaePickup === 1 ? 'bg-green-300' : 'bg-gray-150'}`} onPress={() => setSelectedAlgaePickup(1)}>
                                                            <Text size="lg" className="m-2">Processor</Text>
                                                        </Pressable>
                                                        <Pressable className={`rounded ${selectedAlgaePickup === 2 ? 'bg-green-300' : 'bg-gray-150'}`} onPress={() => setSelectedAlgaePickup(2)}>
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
                                                                style={{ height: 55 }}>
                                                                <InputField
                                                                    className="text-center"
                                                                    inputMode="numeric"
                                                                    placeholder="0"
                                                                    value={String(value[selectedAlgaePickup - 1] || 0)} // Ensure value is a string for InputField
                                                                    onChangeText={(text) => {
                                                                        const numericValue = parseInt(text, 10) || 0;
                                                                        setValue("teleop.algae", getValues("teleop.algae").map((value, index) =>
                                                                            index === selectedAlgaePickup - 1 ? numericValue : value
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
                                                        <Radio onPress={() => setValue("climb", "SHALLOW_CAGE")} value="a" size="lg" isInvalid={false} isDisabled={false}>
                                                            <RadioIndicator>
                                                                <RadioIcon as={CircleIcon} />
                                                            </RadioIndicator>
                                                            <RadioLabel><Text size="xl">Shallow Cage</Text></RadioLabel>
                                                        </Radio>
                                                        <Radio onPress={() => setValue("climb", "DEEP_CAGE")} value="b" size="lg" isInvalid={false} isDisabled={false}>
                                                            <RadioIndicator>
                                                                <RadioIcon as={CircleIcon} />
                                                            </RadioIndicator>
                                                            <RadioLabel><Text size="xl">Deep Cage</Text></RadioLabel>
                                                        </Radio>
                                                    </VStack>
                                                    <VStack space="md">
                                                        <Radio onPress={() => setValue("climb", "PARK")} value="c" size="lg" isInvalid={false} isDisabled={false}>
                                                            <RadioIndicator>
                                                                <RadioIcon as={CircleIcon} />
                                                            </RadioIndicator>
                                                            <RadioLabel><Text size="xl">Park</Text></RadioLabel>
                                                        </Radio>
                                                        <Radio onPress={() => setValue("climb", "N/A")} value="d" size="lg" isInvalid={false} isDisabled={false}>
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




                            <AccordionItem value="d">
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

                                    <VStack className="items-center" space="sm">
                                        <Text size="3xl" className="self-center color-black">Postmatch</Text>
                                        <HStack className="w-full">
                                            <VStack className="w-1/2" space="sm">
                                                <Text size="xl">Playstyle (optional)</Text>
                                                <CheckboxGroup>
                                                    <VStack className="justify-center" space="lg">
                                                        <Checkbox value="1"
                                                            onChange={(isSelected) => setValue("defensive", !getValues("defensive"))}
                                                            size="lg">
                                                            <CheckboxIndicator>
                                                                <CheckboxIcon as={CheckIcon} />
                                                            </CheckboxIndicator>
                                                            <CheckboxLabel>Defensive</CheckboxLabel>
                                                        </Checkbox>

                                                        <Checkbox value="2"
                                                            size="lg"
                                                            onChange={(isSelected) => setValue("defensive", !getValues("defensive"))}>
                                                            <CheckboxIndicator>
                                                                <CheckboxIcon as={CheckIcon} />
                                                            </CheckboxIndicator>
                                                            <CheckboxLabel>Broke Down</CheckboxLabel>
                                                        </Checkbox>
                                                    </VStack>
                                                </CheckboxGroup>
                                            </VStack>
                                            <VStack className="w-1/2 h-full" space="sm">
                                                <Text size="xl">Ranking Points</Text>
                                                <Controller
                                                    control={control}
                                                    name="rankingPoints"
                                                    rules={{
                                                        required: "Ranking points are required",
                                                        pattern: {
                                                            value: /^(100|[1-9]?[0-9])$/,
                                                            message: "The ranking points must be numeric.",
                                                        },
                                                    }}
                                                    render={({ field: { onChange, value } }) => (
                                                        <Input size="md" className="rounded">
                                                            <InputField
                                                                inputMode="numeric"
                                                                placeholder="0"
                                                                value={value.toString()}
                                                                onChangeText={onChange}
                                                                autoCorrect={false}
                                                            />
                                                        </Input>
                                                    )}
                                                />
                                            </VStack>
                                        </HStack>

                                        <Text size="xl">Outcome</Text>

                                        <HStack space="md">
                                            <Pressable onPress={() => setValue("won", 1)} className={`items-center justify-center w-1/4 bg-green-500 rounded ${watch("won") === 1 ? "border-2" : ""}`}>
                                                <Text className="p-4">Win</Text>
                                            </Pressable>
                                            <Pressable onPress={() => setValue("won", 0)} className={`items-center justify-center w-1/4 bg-gray-300 rounded ${watch("won") === 0 ? "border-2" : ""}`}>
                                                <Text className="p-4">Draw</Text>
                                            </Pressable>
                                            <Pressable onPress={() => setValue("won", -1)} className={`items-center justify-center w-1/4 bg-red-500 rounded ${watch("won") === -1 ? "border-2" : ""}`}>
                                                <Text className="p-4">Loss</Text>
                                            </Pressable>
                                        </HStack>

                                        <VStack className="w-full">
                                            <Text className="text-center text-lg">Comments</Text>
                                            <Controller
                                                control={control}
                                                name="comments"
                                                render={({ field: { onChange, value } }) => (
                                                    <Input size="md" className="w-full mt-2 rounded">
                                                        <InputField
                                                            className="p-2"
                                                            placeholder="Enter your comments..."
                                                            value={value}
                                                            onChangeText={onChange}
                                                            multiline
                                                            onContentSizeChange={(event) => { }
                                                            }
                                                        // style={{ minHeight: 40}}
                                                        />
                                                    </Input>
                                                )}
                                            />
                                        </VStack>

                                    </VStack>


                                </AccordionContent>
                            </AccordionItem>

                        </Accordion>

                        <Button
                            onPress={handleSubmit(handleScout, onError)}
                            size="lg"
                            className="mt-4 py-2 rounded-md w-1/2 max-w-md self-center"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator size="small" />
                            ) : (
                                <ButtonText className="font-semibold text-lg">Submit</ButtonText>
                            )}
                        </Button>



                    </VStack>

                </ScrollView>

            </TouchableWithoutFeedback>

        </KeyboardAvoidingView>
    );
};
export default ScoutingForm;