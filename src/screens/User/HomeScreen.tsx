import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ScrollView, RefreshControl, ActivityIndicator, Animated, View } from 'react-native';
import { useAuth } from '../../utils/Context/AuthContext';
import { useTheme } from '../../utils/UI/CustomThemeProvider';
import { useAttendance } from '../../utils/Context/AttendanceContext';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { AnimatedProgressBar } from '@/src/components/AnimatedProgressBar';
import { LinearGradient } from 'expo-linear-gradient';
import { MetricCard } from '@/src/components/MetricCard';
import { CompactNewsFeed } from '@/src/components/CompactNewsFeed';
import { ClockIcon, TrophyIcon, TrendingUpIcon, CalendarIcon } from 'lucide-react-native';
import {
    Select,
    SelectTrigger,
    SelectInput,
    SelectIcon,
    SelectPortal,
    SelectBackdrop,
    SelectContent,
    SelectItem,
} from '@/components/ui/select';
import { MoonIcon, SunIcon, ChevronDownIcon, EllipsisVertical, BellIcon } from 'lucide-react-native';
import { PremiumFAB } from '@/src/components/PremiumFAB';
import UpdateRibbon from '@/src/components/UpdateRibbon';
import { useGlobalToast } from '@/src/utils/UI/CustomToastProvider';
import { Box } from '@/components/ui/box';
import { AlertDialog, AlertDialogBackdrop, AlertDialogBody, AlertDialogContent, AlertDialogFooter, AlertDialogHeader } from '@/components/ui/alert-dialog';
import { Input, InputField } from '@/components/ui/input';
import { Controller, set, useForm } from 'react-hook-form';
import { useNetworking } from '@/src/utils/Context/NetworkingContext';
import { useNotifications } from '@/src/utils/Context/NotificationContext';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';

const HomeScreen: React.FC = () => {
    const { theme, toggleTheme } = useTheme();
    const { user, refreshUser } = useAuth();
    const { userAttendanceHours, isLoading, currentYear, currentTerm, schoolYears, schoolTerms, refreshAttendanceData } = useAttendance();
    const { openToast } = useGlobalToast();
    const [refreshing, setRefreshing] = useState(false);

    // Animation refs for premium feel
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;
    const [selectedYear, setSelectedYear] = useState<string>('All Years');// (currentYear); // ('All Years');
    const [selectedTerm, setSelectedTerm] = useState<string>('All Terms');//(currentTerm.toString()); // ('All Terms');
    const [availableYears, setAvailableYears] = useState<string[]>([]);
    const [termsByYear, setTermsByYear] = useState<{ [year: string]: string[] }>({});
    const [termOptions, setTermOptions] = useState<string[]>(['All Terms']);

    const [timeLeft, setTimeLeft] = useState('');
    const [semesterEndDate, setSemesterEndDate] = useState<Date | null>(null);

    const { updates, fetchUpdates, addUpdate, updateUpdate, removeUpdate } = useNotifications();
    const [showNewsPopup, setShowNewsPopup] = useState(false);

    const [showEditNotis, setShowEditNotis] = useState(false);

    const [currentlyEditing, setCurrentlyEditing] = useState<number>(1);

    useEffect(() => {
        fetchUpdates();

        // Entrance animation
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.spring(slideAnim, {
                toValue: 0,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const { control, handleSubmit, getValues, setValue } = useForm({
        defaultValues: {
            news: "",
        },
    });

    useEffect(() => {
        if (currentYear && currentTerm && schoolTerms[currentYear]?.[currentTerm]) {
            const endTimestamp = schoolTerms[currentYear][currentTerm]?.end;
            if (endTimestamp) {
                setSemesterEndDate(new Date(endTimestamp * 1000)); // Convert UNIX timestamp to Date
            }
        }
    }, [currentYear, currentTerm, schoolTerms]);

    useEffect(() => {
        if (!semesterEndDate) return;

        const updateCountdown = () => {
            const now = new Date();
            const difference = semesterEndDate.getTime() - now.getTime();

            if (difference <= 0) {
                setTimeLeft('Semester has ended!');
                return;
            }

            const days = Math.floor(difference / (1000 * 60 * 60 * 24));
            const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((difference / (1000 * 60)) % 60);
            const seconds = Math.floor((difference / 1000) % 60);

            setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
        };

        const interval = setInterval(updateCountdown, 1000);
        updateCountdown(); // Initial call to prevent 1-second delay

        return () => clearInterval(interval); // Cleanup on unmount
    }, [semesterEndDate]);

    useEffect(() => {
        // Extract available years and terms from attendance data AND school configuration
        const yearsSet = new Set<string>();
        const tempTermsByYear: { [year: string]: Set<string> } = {};

        // 1. From Attendance Data
        Object.keys(userAttendanceHours).forEach(key => {
            const [year, term] = key.split('_');
            if (year && term) {
                yearsSet.add(year);
                if (!tempTermsByYear[year]) {
                    tempTermsByYear[year] = new Set();
                }
                tempTermsByYear[year].add(term);
            }
        });

        // 2. From School Configuration (schoolTerms)
        if (schoolTerms) {
            Object.keys(schoolTerms).forEach(year => {
                yearsSet.add(year);
                if (!tempTermsByYear[year]) {
                    tempTermsByYear[year] = new Set();
                }
                // Ensure schoolTerms[year] is an object before iterating keys
                if (schoolTerms[year]) {
                    Object.keys(schoolTerms[year]).forEach(term => {
                        tempTermsByYear[year].add(term);
                    });
                }
            });
        }

        // 3. From School Years list (if available)
        if (schoolYears && Array.isArray(schoolYears)) {
            schoolYears.forEach(year => yearsSet.add(year));
        }

        const yearsArray = Array.from(yearsSet).sort();
        setAvailableYears(yearsArray);

        const termsObj: { [year: string]: string[] } = {};
        yearsArray.forEach(year => {
            termsObj[year] = Array.from(tempTermsByYear[year] || []).sort((a, b) => parseInt(a) - parseInt(b));
        });
        setTermsByYear(termsObj);

        // REMOVED: Auto-reset of selectedYear and selectedTerm here.
        // We trust the initial state or user selection.

    }, [userAttendanceHours, schoolYears, schoolTerms]);

    useEffect(() => {
        handleRefresh();
    }, []);

    useEffect(() => {
        // Update term options based on selected year
        if (selectedYear !== 'All Years' && termsByYear[selectedYear]) {
            setTermOptions(['All Terms', ...termsByYear[selectedYear]]);

            // Only reset if current selection is invalid for the new year
            if (selectedTerm !== 'All Terms' && !termsByYear[selectedYear].includes(selectedTerm)) {
                setSelectedTerm('All Terms');
            }
        } else {
            setTermOptions(['All Terms']);
            if (selectedTerm !== 'All Terms') {
                setSelectedTerm('All Terms');
            }
        }
    }, [selectedYear, termsByYear]);

    const handleRefresh = async () => {
        setRefreshing(true);
        if (user?.role === 'unverified') {
            // If user is unverified, refresh user data
            try {
                await refreshUser();
            } catch (error) {
                console.error("Error refreshing user data:", error);
                openToast({
                    title: 'Error',
                    description: 'Failed to refresh user data. Please try again later.',
                    type: 'error',
                });
            }
        } else {
            // If user is verified, refresh attendance data
            try {
                await fetchUpdates();
                await refreshAttendanceData();
            } catch (error) {
                console.error("Error refreshing attendance data:", error);
                openToast({
                    title: 'Error',
                    description: 'Failed to refresh attendance data. Please try again later.',
                    type: 'error',
                });
            }
        }
        setRefreshing(false);
    };

    if (user?.role === 'unverified') {
        return (
            <ScrollView
                className="flex-1 bg-background-0"
                contentContainerStyle={{ flexGrow: 1 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            >
                <VStack space="2xl" className="flex-1 justify-center items-center px-6 py-12">
                    <Text className="text-center text-lg text-typography-800">You are currently unverified. Please contact an administrator.</Text>
                    <Button onPress={handleRefresh} size="lg" className="rounded-lg shadow-md w-48" disabled={refreshing}>
                        {refreshing ? (
                            <ActivityIndicator size="small" />
                        ) : (
                            <ButtonText className="font-semibold text-base">Refresh</ButtonText>
                        )}
                    </Button>
                </VStack>
            </ScrollView>
        );
    }

    const calculateTotalHours = () => {
        if (selectedYear === 'All Years' && selectedTerm === 'All Terms') {
            return Object.values(userAttendanceHours).reduce((sum, h) => sum + h, 0);
        } else if (selectedYear === 'All Years') {
            return Object.entries(userAttendanceHours)
                .filter(([key, _]) => key.endsWith(`_${selectedTerm}`))
                .reduce((sum, [_, h]) => sum + h, 0);
        } else if (selectedTerm === 'All Terms') {
            return Object.entries(userAttendanceHours)
                .filter(([key, _]) => key.startsWith(`${selectedYear}_`))
                .reduce((sum, [_, h]) => sum + h, 0);
        } else {
            return userAttendanceHours[`${selectedYear}_${selectedTerm}`] || 0;
        }
    };

    const totalHours = calculateTotalHours();

    return (
        <VStack className="flex-1 bg-background-0">
            <UpdateRibbon />
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ flexGrow: 1 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            >
                <Animated.View
                    style={{
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                    }}
                >
                    <VStack space="lg" className="px-5 py-6">
                        {/* Compact Header */}
                        <VStack space="xs">
                            <Text className="text-sm font-medium text-typography-600">Welcome back,</Text>
                            <Text className="text-3xl font-bold text-typography-950">{user?.first_name}</Text>
                        </VStack>
                        {availableYears.length > 0 ? (
                            <>
                                {/* Compact Period Selector */}
                                <HStack className="gap-3">
                                    <View className="flex-1">
                                        <Select selectedValue={selectedYear} onValueChange={setSelectedYear}>
                                            <SelectTrigger variant="outline" size="sm" className="rounded-xl border-outline-200">
                                                <SelectInput placeholder="Year" value={selectedYear} />
                                                <SelectIcon className="mr-2" as={ChevronDownIcon} size={16} />
                                            </SelectTrigger>
                                            <SelectPortal>
                                                <SelectBackdrop />
                                                <SelectContent>
                                                    <SelectItem label="All Years" value="All Years" />
                                                    {availableYears.map(year => (
                                                        <SelectItem key={year} label={year} value={year} />
                                                    ))}
                                                </SelectContent>
                                            </SelectPortal>
                                        </Select>
                                    </View>
                                    {selectedYear !== 'All Years' && (
                                        <View className="flex-1">
                                            <Select selectedValue={selectedTerm} onValueChange={setSelectedTerm}>
                                                <SelectTrigger variant="outline" size="sm" className="rounded-xl border-outline-200">
                                                    <SelectInput placeholder="Term" value={selectedTerm} />
                                                    <SelectIcon className="mr-2" as={ChevronDownIcon} size={16} />
                                                </SelectTrigger>
                                                <SelectPortal>
                                                    <SelectBackdrop />
                                                    <SelectContent>
                                                        {termOptions.map(term => (
                                                            <SelectItem
                                                                key={term}
                                                                label={term === 'All Terms' ? 'All Terms' : `Term ${term}`}
                                                                value={term}
                                                            />
                                                        ))}
                                                    </SelectContent>
                                                </SelectPortal>
                                            </Select>
                                        </View>
                                    )}
                                </HStack>

                                {/* Dashboard Grid - 2 columns on wider screens */}
                                <VStack space="md">
                                    {/* Hero Metric - Attendance Hours */}
                                    <View className="bg-background-0 rounded-2xl shadow-lg border border-outline-100 overflow-hidden">
                                        <LinearGradient
                                            colors={theme === 'light'
                                                ? ['#F0F9FF', '#E0F2FE']
                                                : ['#1E293B', '#0F172A']
                                            }
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                        >
                                            <VStack space="lg" className="p-6">
                                                <HStack className="items-center justify-between">
                                                    <Text className="text-xs font-medium text-typography-600 uppercase tracking-wide">
                                                        Attendance Progress
                                                    </Text>
                                                    <TrophyIcon color={theme === 'light' ? '#0EA5E9' : '#38BDF8'} size={20} />
                                                </HStack>

                                                <HStack className="items-baseline gap-2">
                                                    <Text className="text-5xl font-bold text-typography-950">
                                                        {Math.round(totalHours)}
                                                    </Text>
                                                    <Text className="text-lg text-typography-600 pb-1">/ 36 hours</Text>
                                                </HStack>

                                                <AnimatedProgressBar
                                                    value={(totalHours / 36) * 100}
                                                    height={10}
                                                    showPercentage={false}
                                                    gradient={true}
                                                />

                                                <HStack className="justify-between">
                                                    <Text className="text-sm text-typography-600">
                                                        {Math.round((totalHours / 36) * 100)}% Complete
                                                    </Text>
                                                    <Text className="text-sm font-medium text-typography-700">
                                                        {Math.round(36 - totalHours)} hrs remaining
                                                    </Text>
                                                </HStack>
                                            </VStack>
                                        </LinearGradient>
                                    </View>

                                    {/* Quick Stats Grid */}
                                    <HStack className="gap-3">
                                        <View className="flex-1">
                                            <MetricCard
                                                label="This Term"
                                                value={selectedTerm !== 'All Terms' ? Math.round(totalHours) : '—'}
                                                subtitle="hours"
                                                icon={<ClockIcon color={theme === 'light' ? '#6B7280' : '#9CA3AF'} size={18} />}
                                                theme={theme}
                                            />
                                        </View>
                                        <View className="flex-1">
                                            <MetricCard
                                                label="Progress"
                                                value={`${Math.round((totalHours / 36) * 100)}%`}
                                                subtitle="complete"
                                                icon={<TrendingUpIcon color={theme === 'light' ? '#10B981' : '#34D399'} size={18} />}
                                                theme={theme}
                                            />
                                        </View>
                                    </HStack>
                                </VStack>
                            </>
                        ) : (
                            <Text className="text-center text-sm text-typography-600">No attendance data available</Text>
                        )}

                        {/* Countdown Timer - Compact */}
                        {semesterEndDate && (
                            <View className="bg-background-0 rounded-2xl shadow-md border border-outline-100 p-5">
                                <HStack className="items-center justify-between">
                                    <VStack space="xs">
                                        <Text className="text-xs font-medium text-typography-600 uppercase tracking-wide">
                                            Term {currentTerm} Ends In
                                        </Text>
                                        <Text className="text-2xl font-bold text-typography-950 tracking-tight">
                                            {timeLeft}
                                        </Text>
                                    </VStack>
                                    <CalendarIcon color={theme === 'light' ? '#6B7280' : '#9CA3AF'} size={32} />
                                </HStack>
                            </View>
                        )}

                        {/* Compact News Feed */}
                        <CompactNewsFeed
                            updates={updates}
                            onEditPress={() => setShowNewsPopup(true)}
                            canEdit={['executive', 'admin', 'advisor'].includes(user?.role ?? '')}
                            maxVisible={3}
                            theme={theme}
                        />

                        {/* Action Button */}
                        <Button
                            onPress={handleRefresh}
                            size="md"
                            variant="outline"
                            className="rounded-xl"
                            disabled={refreshing}
                        >
                            {refreshing ? (
                                <ActivityIndicator size="small" />
                            ) : (
                                <ButtonText className="font-medium">Refresh Data</ButtonText>
                            )}
                        </Button>
                    </VStack>
                </Animated.View>

                {showNewsPopup && (
                    <AlertDialog
                        isOpen={showNewsPopup}
                        onClose={() => {
                            setValue('news', '');
                            setShowNewsPopup(false);
                        }}
                    >
                        <AlertDialogBackdrop />
                        <AlertDialogContent className="w-11/12 max-w-2xl">
                            <AlertDialogHeader className="pb-4">
                                <Text className="text-lg font-semibold">Updates</Text>
                            </AlertDialogHeader>
                            <AlertDialogBody>
                                <VStack space="sm">
                                    {updates.map((update: any, index: number) => (
                                        <Box className="border border-outline-200 rounded-lg" key={index}>
                                            <HStack space="xl" className="items-center justify-between">
                                                <Text ellipsizeMode="tail" className="text-center font-semibold text-lg p-2 flex-1">
                                                    {update[0]}
                                                </Text>
                                                <Pressable className="pr-2" onPress={() => { setShowEditNotis(true); setCurrentlyEditing(update[1]); setValue('news', update[0]); }}>
                                                    <Icon as={EllipsisVertical} />
                                                </Pressable>
                                            </HStack>
                                        </Box>
                                    ))}
                                    <Controller
                                        control={control}
                                        name="news"
                                        render={({ field: { onChange, value } }) => (
                                            <Input variant="outline" size="md" className="mt-1">
                                                <InputField
                                                    size="2xl"
                                                    value={value}
                                                    onChangeText={onChange}
                                                    placeholder="Add news update..."
                                                    className="placeholder-gray-400 h-full"
                                                    multiline
                                                    numberOfLines={10} // Adjust height
                                                    textAlignVertical="top"
                                                />
                                            </Input>
                                        )}
                                    />
                                </VStack>
                            </AlertDialogBody>
                            <AlertDialogFooter className="flex justify-end space-x-3 pt-6">
                                <HStack space="md">
                                    <Button onPress={() => {
                                        const newsValue = getValues("news").trim(); // Get and trim the input value
                                        if (!newsValue) {
                                            openToast({
                                                title: "Error",
                                                description: "News update cannot be empty.",
                                                type: "error",
                                            });
                                            return;
                                        }
                                        addUpdate(newsValue);
                                        setValue("news", "");
                                        setShowNewsPopup(false);
                                    }}
                                        size="md"
                                        className="mt-4 py-2 rounded-md"
                                    >
                                        <ButtonText className="font-semibold">Add</ButtonText>
                                    </Button>
                                    <Button onPress={() => setShowNewsPopup(false)} size="md" variant="outline" className="mt-4 py-2 rounded-md">
                                        <ButtonText className="font-semibold">Done</ButtonText>
                                    </Button>
                                </HStack>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}

                {showEditNotis && (
                    <AlertDialog
                        isOpen={showEditNotis}
                        onClose={() => {
                            setValue('news', '');
                            setShowEditNotis(false);
                        }}
                    >
                        <AlertDialogBackdrop />
                        <AlertDialogContent className="w-11/12 max-w-2xl">
                            <AlertDialogHeader className="pb-4">
                                <Text className="text-lg font-semibold">Edit Update</Text>
                            </AlertDialogHeader>
                            <AlertDialogBody>
                                <VStack space="sm">
                                    <Controller
                                        control={control}
                                        name="news"
                                        render={({ field: { onChange, value } }) => (
                                            <Input variant="outline" size="md" className="mt-1">
                                                <InputField
                                                    size="2xl"
                                                    value={value}
                                                    onChangeText={onChange}
                                                    placeholder="Enter news updates..."
                                                    className="placeholder-gray-400 h-full"
                                                    multiline
                                                    numberOfLines={10} // Adjust height
                                                    style={{
                                                        minHeight: 30, // Minimum height for the input
                                                    }}
                                                />
                                            </Input>
                                        )}
                                    />
                                </VStack>
                            </AlertDialogBody>
                            <AlertDialogFooter className="flex justify-end space-x-3 pt-6">
                                <HStack space="md">
                                    <Button onPress={() => {
                                        removeUpdate(currentlyEditing);
                                        setValue('news', '');
                                        setShowEditNotis(false);
                                    }}
                                        size="md"
                                        className="mt-4 py-2 rounded-md" >
                                        <ButtonText className="font-semibold">Delete Update</ButtonText>
                                    </Button>
                                    <Button onPress={() => {
                                        updateUpdate(getValues("news"), currentlyEditing);
                                        setValue('news', '');
                                        setShowEditNotis(false);
                                    }}
                                        size="md"
                                        className="mt-4 py-2 rounded-md"
                                    >
                                        <ButtonText className="font-semibold">Save</ButtonText>
                                    </Button>
                                    <Button onPress={() => { setShowEditNotis(false); setValue("news", '') }} size="md" variant="outline" className="mt-4 py-2 rounded-md">
                                        <ButtonText className="font-semibold">Cancel</ButtonText>
                                    </Button>
                                </HStack>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}

            </ScrollView>
            <PremiumFAB
                onPress={toggleTheme}
                icon={theme === 'light' ? <MoonIcon color="#333333" size={24} /> : <SunIcon color="#F5F5F5" size={24} />}
                theme={theme}
            />
        </VStack>
    );
}

export default HomeScreen;