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
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { EyeIcon, EyeOffIcon, MailIcon, LockIcon, MoonIcon, SunIcon, ChevronDownIcon, Camera, Watch } from "lucide-react-native";
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
import { Pre } from "@expo/html-elements";
import * as ImagePicker from "expo-image-picker";
import {
    AlertDialog,
    AlertDialogBackdrop,
    AlertDialogBody,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
} from "@/components/ui/alert-dialog";
import { RefreshControl } from "react-native";



const PitScoutingForm: React.FC = () => {
    const navigation = useNavigation<StackNavigationProp<any>>();
    const { theme } = useTheme();
    const [allCompetitions, setAllCompetitions] = useState<any[]>([]);
    const [showRefreshPopup, setShowRefeshPopup] = useState(false)
    const [refreshing, setRefreshing] = useState(false)
    const [photoUri, setPhotoUri] = useState<string | null>(null); //stores the photo's uri
    const { openModal } = useGlobalModal();
    const { openToast } = useGlobalToast();
    const { handleRequest } = useNetworking();
    const [isSubmitting, setSubmitting] = useState<boolean>(false);
    type FormValues = {
        competition: string;
        teamNumber: number;
        teamName: string;
        scoring: {
            coral: number;
            algae: number;
        }
        prefPiece: string;
        climb: string;
        vision: boolean | null;
        autonomous: boolean | null;
        auto: {
            coral: number
            algae: number
        }
        favcomments: string;
        comments: string;

    }



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
            "teamName": "",
            "scoring": {
                "coral": 0,
                "algae": 0
            },
            "prefPiece": "both",
            "climb": "none",
            "vision": null,
            "autonomous": null,
            "auto": {
                "coral": 0,
                "algae": 0,
            },
            "favcomments": "",
            "comments": ""

        },
    });


    const onError = (errors: FieldErrors) => {
        console.error("Validation Errors:", errors)
        const firstError = Object.values(errors)[0];
        if (firstError && "message" in firstError) {
            openToast({
                title: "Validation Error",
                description: (firstError as { message: string }).message,
                type: "error",
            });
        }
    };

    const handlePitScout = async (data: FormValues) => {
        setSubmitting(true);
        const payload = {
            competition: data.competition,
            teamNumber: data.teamNumber,
            teamName: data.teamName,
            scoring: {
                coral: data.scoring.coral,
                algae: data.scoring.algae,
            },
            prefPiece: data.prefPiece,
            climb: data.climb,
            vision: data.vision,
            autonomous: data.autonomous,
            auto: {
                coral: data.auto.coral,
                algae: data.auto.algae,
            },
            favcomments: data.favcomments,
            comments: data.comments,
        };

        const request: QueuedRequest = {
            url: '/api/scouting/pitform',
            method: "post",
            data: payload,
            retryCount: 3,
            successHandler: async () => {
                openToast({
                    title: "Pit Scouting Successful",
                    description: "Your pit scouting form is submitted successfully.",
                    type: "success",
                });
                navigation.replace("RoleBasedTabs", {});
            },
            errorHandler: async (error: AxiosError) => {
                handleErrorWithModalOrToast({
                    actionName: "Pit Scouting Form Submission",
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
        } finally {
            setSubmitting(false);
        }
    };


    const handleTakePhoto = async () => {
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

        if (!permissionResult.granted) {
            openToast({
                title: "Permission Denied",
                description: "Camera permission is required to take a photo.",
                type: "error",
            });
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 1,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            setPhotoUri(result.assets[0].uri); //  store the photo URI
        }
    };


    const handleRefresh = async () => {
        setRefreshing(true)
        setShowRefeshPopup(true)

        return
    }


    const getCompetitions = async () => {
        const request: QueuedRequest = {
            url: "/api/scouting/competitions",
            method: "get",
            retryCount: 0,
            successHandler: async (response: AxiosResponse) => {
                const data = response.data;
                setAllCompetitions(data)

            },
            errorHandler: async (error: AxiosError) => {
                console.error("Competitions didn't fetch:", error)

                handleErrorWithModalOrToast({
                    actionName: "Fetch Competition",
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
                    description: "Get competitons requestion. It will be processed when you are back online",
                    type: "info",
                });

                openModal({
                    title: "Offline",
                    message: "Get competitions request",
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




    //handle refresh
    //show refreshpop
    //pop return true

    //onpress resetvalues

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ backgroundColor: theme === 'light' ? '#FFFFFF' : '#1A202C' }}>
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
                    }
                >
                    <VStack space="md"
                        className="w-full max-w-[600px] mx-auto p-4 rounded-md shadow-lg flex-1"
                        style={{
                            minHeight: '100%',
                            paddingHorizontal: 16,
                            paddingVertical: Platform.OS === "ios" ? 24 : 16,
                        }}>
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
                                    <AlertDialogHeader className="pb-4 justify-center w-full">
                                        <Text className="text-lg font-semibold text-center ">
                                            Refresh Page
                                        </Text>
                                    </AlertDialogHeader>
                                    <AlertDialogBody>
                                        <Text>
                                            This will reset everything you've entered in the form. Are you sure you want to continue?
                                        </Text>
                                    </AlertDialogBody>
                                    <AlertDialogFooter className="mt-2 justify-center">
                                        <Button
                                            variant="solid"
                                            className="w-1/2"
                                            onPress={() => {
                                                setShowRefeshPopup(false);
                                                setRefreshing(false);
                                            }}>
                                            <ButtonText>Cancel</ButtonText>
                                        </Button>
                                        <Button
                                            variant="solid"
                                            className="ml-2 w-1/2"
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
                            className="w-[100%]"
                            defaultValue={["a", "b", "c", "d"]}
                        >
                            <AccordionItem value="a">
                                <AccordionHeader>
                                    <AccordionTrigger>
                                        {({ isExpanded }) => {
                                            return (
                                                <>
                                                    <AccordionTitleText>
                                                        General
                                                    </AccordionTitleText>
                                                    {isExpanded ? (
                                                        <AccordionIcon as={ChevronUpIcon} />
                                                    ) : (
                                                        <AccordionIcon as={ChevronDownIcon} />
                                                    )
                                                    }
                                                </>
                                            )
                                        }}
                                    </AccordionTrigger>
                                </AccordionHeader>
                                <AccordionContent>
                                    <Text size="3xl" className="self-center color-black">
                                        General
                                    </Text>
                                    <VStack className="w-1/1 pl-0.8 pr-0.8">
                                        <Text className="mb-1">Competition</Text>
                                        <Controller
                                            control={control}
                                            name="competition"
                                            rules={{
                                                required: "Competition is required",
                                            }}
                                            render={({ field: { onChange, value } }) => (
                                                <Select onValueChange={onChange} selectedValue={value}>
                                                    <SelectTrigger variant="outline">
                                                        <SelectInput value={
                                                            allCompetitions.find((comp) => comp.value === value)?.label || ""
                                                        } placeholder="Select option" />
                                                        <SelectIcon as={ChevronDownIcon} className="ml-auto" />
                                                    </SelectTrigger>
                                                    <SelectPortal>
                                                        <SelectBackdrop />
                                                        <SelectContent>
                                                            <SelectDragIndicatorWrapper>
                                                                <SelectDragIndicator />
                                                            </SelectDragIndicatorWrapper>
                                                            {allCompetitions?.map((comp) => (<SelectItem label={comp.label} value={comp.value} />))}
                                                        </SelectContent>
                                                    </SelectPortal>
                                                </Select>
                                            )}
                                        />
                                    </VStack>
                                    <HStack space="lg" className="w-full justify-center pr-2 pl-2">
                                        <VStack className="w-1/2">
                                            <Text>Team #</Text>
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
                                                    <Input size="md">
                                                        <InputField
                                                            inputMode="numeric"
                                                            placeholder="2658"
                                                            className="rounded"
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
                                            <Text className="mb-1">Team Name</Text>
                                            <Controller
                                                control={control}
                                                name="teamName"
                                                rules={{
                                                    required: "Team Name is required",
                                                }}
                                                render={({ field: { onChange, value } }) => (
                                                    <Input size="md">
                                                        <InputField
                                                            inputMode="text"
                                                            placeholder="Σ-Motion"
                                                            className="rounded"
                                                            value={value.toString()}
                                                            onChangeText={onChange}
                                                            autoCorrect={false}

                                                        />
                                                    </Input>
                                                )}
                                            />
                                            {errors.teamName && (
                                                <Text className="text-red-500 mt-1">
                                                    {errors.teamName.message}
                                                </Text>
                                            )}
                                        </VStack>
                                    </HStack>
                                </AccordionContent>
                            </AccordionItem>
                            <Divider />
                            <AccordionItem value="b">
                                <AccordionHeader>
                                    <AccordionTrigger>
                                        {({ isExpanded }) => {
                                            return (
                                                <>
                                                    <AccordionTitleText>
                                                        Scoring
                                                    </AccordionTitleText>
                                                    {isExpanded ? (
                                                        <AccordionIcon as={ChevronUpIcon} />
                                                    ) : (
                                                        <AccordionIcon as={ChevronDownIcon} />
                                                    )
                                                    }
                                                </>
                                            )
                                        }}
                                    </AccordionTrigger>
                                </AccordionHeader>
                                <AccordionContent>
                                    <VStack space="xl" className="w-full items-center">
                                        <Text size="3xl" className="self-center color-black">Scoring</Text>
                                        <VStack space="lg" className="w-full" >
                                            <Text size="xl" className="self-center">Coral Per Game</Text>
                                            <Controller
                                                control={control}
                                                name="scoring.coral"
                                                rules={{
                                                    required: "Required",
                                                    pattern: {
                                                        value: /^\d+$/,
                                                        message: "The number must be numeric",

                                                    },
                                                }}
                                                render={({ field: { onChange, value } }) => (
                                                    <Input size="xl" className="rounded"
                                                        style={{ height: 55 }}>
                                                        <InputField
                                                            className="text-center"
                                                            inputMode="numeric"
                                                            placeholder="0"
                                                            value={value.toString()}
                                                            onChange={onChange}
                                                            autoCorrect={false}
                                                        />
                                                    </Input>
                                                )}
                                            />
                                            <HStack space="sm" className="w-full">
                                                <Pressable
                                                    onPress={() => setValue("scoring.coral", (watch("scoring.coral") + 1))}
                                                    className="flex rounded items-center flex-1 justify-center bg-green-500"
                                                    style={{ height: 55, width: 45.5 }}>
                                                    <Text size="3xl" className="text-typography-0">+</Text>
                                                </Pressable>
                                                <Pressable
                                                    onPress={() => setValue("scoring.coral", (((watch("scoring.coral") > 0) ? watch("scoring.coral") - 1 : watch("scoring.coral"))))}
                                                    className="flex rounded items-center justify-center flex-1 bg-red-500"
                                                    style={{ height: 55, width: 45.5 }}
                                                >
                                                    <Text size="3xl" className="text-typography-0">-</Text>
                                                </Pressable>

                                            </HStack>
                                        </VStack>
                                        <VStack space="xl" className="w-full items-center">
                                            <Text size="xl" className="self-center">Algae Per Game</Text>
                                            <Controller
                                                control={control}
                                                name="scoring.algae"
                                                rules={{
                                                    required: "Required",
                                                    pattern: {
                                                        value: /^\d+$/,
                                                        message: "The number must be numeric",

                                                    },
                                                }}
                                                render={({ field: { onChange, value } }) => (
                                                    <Input size="xl" className="rounded"
                                                        style={{ height: 55 }}>
                                                        <InputField
                                                            className="text-center"
                                                            inputMode="numeric"
                                                            placeholder="0"
                                                            value={value.toString()}
                                                            onChangeText={onChange}
                                                            autoCorrect={false}
                                                        />
                                                    </Input>
                                                )}
                                            />
                                            <HStack space="sm" className="w-full">
                                                <Pressable
                                                    onPress={() => setValue("scoring.algae", (watch("scoring.algae") + 1))}
                                                    className="flex rounded items-center flex-1 justify-center bg-green-500"
                                                    style={{ height: 55, width: 45.5 }}
                                                >
                                                    <Text size="3xl" className="text-typography-0">+</Text>
                                                </Pressable>
                                                <Pressable
                                                    onPress={() => setValue("scoring.algae", (((watch("scoring.algae") > 0) ? watch("scoring.algae") - 1 : watch("scoring.algae"))))}
                                                    className="flex rounded items-center justify-center flex-1 bg-red-500"
                                                    style={{ height: 55, width: 45.5 }}
                                                >
                                                    <Text size="3xl" className="text-typography-0">-</Text>
                                                </Pressable>

                                            </HStack>
                                        </VStack>
                                        <VStack space="md" className="w-full justify-center">
                                            <Text size="xl" className="self-center">Preferred Game Piece</Text>
                                            <HStack space="lg">
                                                <Pressable onPress={() => setValue("prefPiece", "coral")} className={`border border-primary-500 rounded items-center justify-center flex-1 ${watch("prefPiece") == "coral" ? "bg-primary-500" : ""}`}
                                                    style={{ height: 40, width: 30 }}>

                                                    <Text className={`${watch("prefPiece") == "coral" ? "text-typography-0" : ""}`}>Coral</Text>
                                                </Pressable>
                                                <Pressable onPress={() => setValue("prefPiece", "both")} className={`border border-primary-500 rounded items-center justify-center flex-1 ${watch("prefPiece") == "both" ? "bg-primary-500" : ""}`}
                                                    style={{ height: 40, width: 30 }}>
                                                    <Text className={`${watch("prefPiece") == "both" ? "text-typography-0" : ""}`}>Both</Text>
                                                </Pressable>
                                                <Pressable onPress={() => setValue("prefPiece", "algae")} className={`border border-primary-500 rounded items-center justify-center flex-1 ${watch("prefPiece") == "algae" ? "bg-primary-500" : ""}`}
                                                    style={{ height: 40, width: 30 }}>
                                                    <Text className={`${watch("prefPiece") == "algae" ? "text-typography-0" : ""}`}>Algae</Text>
                                                </Pressable>
                                            </HStack>
                                        </VStack>

                                        <VStack space="md" className="w-full justify-center">
                                            <Text size="xl" className="self-center">Climb?</Text>
                                            <HStack space="lg">

                                                <Pressable onPress={() => setValue("climb", "shallow")} className={`border border-primary-500 rounded items-center justify-center flex-1 ${watch("climb") == "shallow" ? "bg-primary-500" : ""}`}
                                                    style={{ height: 40, width: 30 }}>
                                                    <Text className={`${watch("climb") == "shallow" ? "text-typography-0" : ""}`}>Shallow</Text>
                                                </Pressable>
                                                <Pressable onPress={() => setValue("climb", "none")} className={`border border-primary-500 rounded items-center justify-center flex-1 ${watch("climb") == "none" ? "bg-primary-500" : ""}`}
                                                    style={{ height: 40, width: 30 }}>
                                                    <Text className={`${watch("climb") == "none" ? "text-typography-0" : ""}`}>None</Text>
                                                </Pressable>
                                                <Pressable onPress={() => setValue("climb", "deep")} className={`border border-primary-500 rounded items-center justify-center flex-1 ${watch("climb") == "deep" ? "bg-primary-500" : ""}`}
                                                    style={{ height: 40, width: 30 }}>
                                                    <Text className={`${watch("climb") == "deep" ? "text-typography-0" : ""}`}>Deep</Text>
                                                </Pressable>

                                            </HStack>
                                        </VStack>
                                    </VStack>
                                </AccordionContent>
                            </AccordionItem>
                            <Divider />
                            <AccordionItem value="c">
                                <AccordionHeader>
                                    <AccordionTrigger>
                                        {({ isExpanded }) => {
                                            return (
                                                <>
                                                    <AccordionTitleText>
                                                        Vision & Auto
                                                    </AccordionTitleText>
                                                    {isExpanded ? (
                                                        <AccordionIcon as={ChevronUpIcon} />
                                                    ) : (
                                                        <AccordionIcon as={ChevronDownIcon} />
                                                    )}
                                                </>
                                            )
                                        }}
                                    </AccordionTrigger>
                                </AccordionHeader>
                                <AccordionContent>
                                    <VStack space="md" className="justify-center">
                                        <Text size="3xl" className="self-center color-black">
                                            Vision & Auto
                                        </Text>
                                        <Text size="xl" className="self-center" >Vision?</Text>
                                        <HStack space="lg">
                                            <Pressable onPress={() => setValue("vision", true)} className={`border border-primary-500 rounded items-center justify-center flex-1 ${watch("vision") == true ? "bg-primary-500" : ""}`}
                                                style={{ height: 40, width: 30 }}>
                                                <Text className={`${watch("vision") == true ? "text-typography-0" : ""}`} >Yes</Text>
                                            </Pressable>
                                            <Pressable onPress={() => setValue("vision", false)} className={`border border-primary-500 rounded items-center justify-center flex-1 ${watch("vision") == false ? "bg-primary-500" : ""}`}
                                                style={{ height: 40, width: 30 }}>
                                                <Text className={`${watch("vision") == false ? "text-typography-0" : ""}`}>No</Text>
                                            </Pressable>
                                        </HStack>

                                        <Text size="xl" className="self-center" >Auto?</Text>
                                        <HStack space="lg">
                                            <Pressable onPress={() => setValue("autonomous", true)} className={`border border-primary-500 rounded items-center justify-center flex-1 ${watch("autonomous") == true ? "bg-primary-500" : ""}`}
                                                style={{ height: 40, width: 30 }}>
                                                <Text className={`${watch("autonomous") == true ? "text-typography-0" : ""}`} >Yes</Text>
                                            </Pressable>
                                            <Pressable onPress={() => setValue("autonomous", false)} className={`border border-primary-500 rounded items-center justify-center flex-1 ${watch("autonomous") == false ? "bg-primary-500" : ""}`}
                                                style={{ height: 40, width: 30 }}>
                                                <Text className={`${watch("autonomous") == false ? "text-typography-0" : ""}`}>No</Text>
                                            </Pressable>
                                        </HStack>

                                        <VStack space="xl">
                                            <Text size="xl" className="self-center">Coral Auto Per Game</Text>
                                            <Controller
                                                control={control}
                                                name="auto.coral"
                                                rules={{
                                                    required: "Required",
                                                    pattern: {
                                                        value: /^\d+$/,
                                                        message: "The number must be numeric",

                                                    },
                                                }}
                                                render={({ field: { onChange, value } }) => (
                                                    <Input size="xl" className="rounded"
                                                        style={{ height: 55 }}>
                                                        <InputField
                                                            className="text-center"
                                                            inputMode="numeric"
                                                            placeholder="0"
                                                            value={value.toString()}
                                                            onChangeText={onChange}
                                                            autoCorrect={false}
                                                        />
                                                    </Input>
                                                )}
                                            />
                                            <HStack space="sm">
                                                <Pressable
                                                    onPress={() => setValue("auto.coral", (watch("auto.coral") + 1))}
                                                    className="flex rounded items-center flex-1 justify-center bg-green-500"
                                                    style={{ height: 55, width: 45.5 }}>
                                                    <Text size="3xl" className="text-typography-0">+</Text>
                                                </Pressable>
                                                <Pressable
                                                    onPress={() => setValue("auto.coral", (((watch("auto.coral") > 0) ? watch("auto.coral") - 1 : watch("auto.coral"))))}
                                                    className="flex rounded items-center flex-1 justify-center bg-red-500"
                                                    style={{ height: 55, width: 45.5 }}>
                                                    <Text size="3xl" className="text-typography-0">-</Text>
                                                </Pressable>

                                            </HStack>
                                        </VStack>
                                        <VStack space="xl" className="w-full">
                                            <Text size="xl" className="self-center">Algae Auto Per Game</Text>
                                            <Controller
                                                control={control}
                                                name="auto.algae"
                                                rules={{
                                                    required: "Required",
                                                    pattern: {
                                                        value: /^\d+$/,
                                                        message: "The number must be numeric",

                                                    },
                                                }}
                                                render={({ field: { onChange, value } }) => (
                                                    <Input size="xl" className="rounded"
                                                        style={{ height: 55 }}>
                                                        <InputField
                                                            className="text-center"
                                                            inputMode="numeric"
                                                            placeholder="0"
                                                            value={value.toString()}
                                                            onChangeText={onChange}
                                                            autoCorrect={false}
                                                        />
                                                    </Input>
                                                )}
                                            />
                                            <HStack space="sm">
                                                <Pressable
                                                    onPress={() => setValue("auto.algae", (watch("auto.algae") + 1))}
                                                    className="flex rounded items-center flex-1 justify-center bg-green-500"
                                                    style={{ height: 55, width: 45.5 }}>
                                                    <Text size="3xl" className="text-typography-0">+</Text>
                                                </Pressable>
                                                <Pressable
                                                    onPress={() => setValue("auto.algae", (((watch("auto.algae") > 0) ? watch("auto.algae") - 1 : watch("auto.algae"))))}
                                                    className="flex rounded items-center flex-1 justify-center bg-red-500"
                                                    style={{ height: 55, width: 45.5 }}>
                                                    <Text size="3xl" className="text-typography-0">-</Text>
                                                </Pressable>

                                            </HStack>
                                        </VStack>
                                    </VStack>
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="d">
                                <AccordionHeader>
                                    <AccordionTrigger>
                                        {({ isExpanded }) => {
                                            return (
                                                <>
                                                    <AccordionTitleText>
                                                        Conclusion
                                                    </AccordionTitleText>
                                                    {isExpanded ? (
                                                        <AccordionIcon as={ChevronUpIcon} />

                                                    ) : (
                                                        <AccordionIcon as={ChevronDownIcon} />
                                                    )}
                                                </>
                                            )
                                        }}
                                    </AccordionTrigger>
                                </AccordionHeader>
                                <AccordionContent>
                                    <VStack space="lg" className="w-full">
                                        <Text size="3xl" className="self-center color-black">
                                            Conclusion
                                        </Text>
                                        <Button onPress={handleTakePhoto}>
                                            <ButtonText>Upload Photo</ButtonText>
                                            <ButtonIcon as={Camera} />
                                        </Button>
                                        {photoUri && (
                                            <Box className="relative w-full h-60 mt-4 rounded">
                                                <Image
                                                    source={{ uri: photoUri }}
                                                    alt="Scouting Photo"
                                                    className="w-full h-full rounded"
                                                    resizeMode="cover"
                                                />
                                                <Pressable
                                                    onPress={() => setPhotoUri(null)}
                                                    className="absolute top-2 right-2  rounded-full p-1 z-10"
                                                >
                                                    <Text className="text-white text-lg">✕</Text>
                                                </Pressable>
                                            </Box>
                                        )}
                                        <VStack space="sm">
                                            <Text size="xl" className="self-center "> Comments</Text>
                                            <Controller
                                                control={control}
                                                name="favcomments"
                                                render={({ field: { onChange, value } }) => (
                                                    <Input size="md" className="w-full mt-2 rounded">
                                                        <InputField
                                                            className=""
                                                            placeholder="Favorite part of the robot"
                                                            value={value}
                                                            onChangeText={onChange}
                                                            multiline
                                                        />
                                                    </Input>
                                                )}
                                            />
                                            <Controller
                                                control={control}
                                                name="comments"
                                                render={({ field: { onChange, value } }) => (
                                                    <Input size="md" className="w-full mt-2 rounded">
                                                        <InputField
                                                            className=""
                                                            placeholder="Scouters Comments"
                                                            value={value}
                                                            onChangeText={onChange}
                                                            multiline
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
                            onPress={handleSubmit(handlePitScout, onError)}
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
    )
}
export default PitScoutingForm;  // Export the component as default 