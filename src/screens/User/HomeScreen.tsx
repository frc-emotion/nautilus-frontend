import React, { useState, useEffect } from 'react';
import { ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { useAuth } from '../../utils/Context/AuthContext';
import { useTheme } from '../../utils/UI/CustomThemeProvider';
import { useAttendance } from '../../utils/Context/AttendanceContext';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Progress, ProgressFilledTrack } from '@/components/ui/progress';
import { Button, ButtonText } from '@/components/ui/button';
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
import { MoonIcon, SunIcon, ChevronDownIcon } from 'lucide-react-native';
import { Fab, FabIcon } from '@/components/ui/fab';
import UpdateRibbon from '@/src/components/UpdateRibbon';
import { useGlobalToast } from '@/src/utils/UI/CustomToastProvider';
import { Box } from '@/components/ui/box';

const HomeScreen: React.FC = () => {
    const { theme, toggleTheme } = useTheme();
    const { user, refreshUser } = useAuth();
    const { userAttendanceHours, isLoading, currentYear, currentTerm, schoolYears, schoolTerms, refreshAttendanceData } = useAttendance();
    const { openToast } = useGlobalToast();
    const [refreshing, setRefreshing] = useState(false);
    const [selectedYear, setSelectedYear] = useState<string>('All Years');// (currentYear); // ('All Years');
    const [selectedTerm, setSelectedTerm] = useState<string>('All Terms');//(currentTerm.toString()); // ('All Terms');
    const [availableYears, setAvailableYears] = useState<string[]>([]);
    const [termsByYear, setTermsByYear] = useState<{ [year: string]: string[] }>({});
    const [termOptions, setTermOptions] = useState<string[]>(['All Terms']);

    const [timeLeft, setTimeLeft] = useState('');
    const [semesterEndDate, setSemesterEndDate] = useState<Date | null>(null);

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
        // Extract available years and terms from attendance data
        const yearsSet = new Set<string>();
        const tempTermsByYear: { [year: string]: Set<string> } = {};

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

        const yearsArray = Array.from(yearsSet).sort();
        setAvailableYears(yearsArray);

        const termsObj: { [year: string]: string[] } = {};
        yearsArray.forEach(year => {
            termsObj[year] = Array.from(tempTermsByYear[year]).sort((a, b) => parseInt(a) - parseInt(b));
        });
        setTermsByYear(termsObj);
        
        setSelectedYear(currentYear);
        setSelectedTerm(currentTerm.toString());

    }, [userAttendanceHours, schoolYears, schoolTerms]);

    useEffect(() => {
        handleRefresh();
    }, []);

    useEffect(() => {
        // Update term options based on selected year

        // If the current year is selected, default to the current term
        if (selectedYear !== 'All Years' && termsByYear[selectedYear]) {
            setTermOptions(['All Terms', ...termsByYear[selectedYear]]);
            // If the current term is not in the list of terms for the selected year, default to 'All Terms'
            if (!termsByYear[selectedYear].includes(selectedTerm)) {
                // setSelectedTerm('All Terms');
                setSelectedTerm(currentTerm.toString());
                
            }
        // If 'All Years' is selected, show all terms and default to 'All Terms'
        } else {
            setTermOptions(['All Terms']);
            setSelectedTerm('All Terms');
        }
    }, [selectedYear, termsByYear]); //, selectedTerm]);

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
                contentContainerStyle={{
                    flexGrow: 1,
                    padding: 16,
                    backgroundColor: theme === 'light' ? '#FFFFFF' : '#1A202C',
                }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            >
                <VStack space="lg" className="flex-1 justify-center items-center p-16">
                    <Text className="text-center">You are currently unverified. Please contact an administrator.</Text>
                    <Button onPress={handleRefresh} size="lg" className="mt-4 py-2 rounded-md" disabled={refreshing}>
                        {refreshing ? (
                            <ActivityIndicator size="small" />
                        ) : (
                            <ButtonText className="font-semibold">Refresh</ButtonText>
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
        <VStack className="flex-1">
            <UpdateRibbon />
            <ScrollView
                contentContainerStyle={{
                    flexGrow: 1,
                    padding: 16,
                    backgroundColor: theme === 'light' ? '#FFFFFF' : '#1A202C',
                }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            >
                <VStack space="lg" className="items-center">
                    <Text className="font-bold text-lg">Attendance Hours</Text>
                    {availableYears.length > 0 ? (
                        <>
                            <HStack className="w-full max-w-[600px] mb-4" space="md">
                                {/* Year Select */}
                                <VStack className="flex-1">
                                    <Text className="mb-2">Select Year:</Text>
                                    <Select
                                        selectedValue={selectedYear}
                                        onValueChange={setSelectedYear}
                                    >
                                        <SelectTrigger variant="outline" size="md" className="rounded justify-between">
                                            <SelectInput
                                                placeholder="Select Year"
                                                value={selectedYear}
                                            />
                                            <SelectIcon className="mr-3" as={ChevronDownIcon} />
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
                                </VStack>
                                {/* Term Select: Conditionally Rendered */}
                                {selectedYear !== 'All Years' && (
                                    <VStack className="flex-1">
                                        <Text className="mb-2">Select Term:</Text>
                                        <Select
                                            selectedValue={selectedTerm}
                                            onValueChange={setSelectedTerm}
                                            
                                        >
                                            <SelectTrigger variant="outline" size="md" className="rounded justify-between">
                                                <SelectInput
                                                    placeholder="Select Term"
                                                    value={selectedTerm}
                                                />
                                                <SelectIcon className="mr-3" as={ChevronDownIcon} />
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
                                    </VStack>
                                )}
                            </HStack>

                            {/* Attendance Display */}
                            <VStack className="w-full max-w-[600px]">
                                <VStack className="mb-4">
                                    <Text className="text-center font-semibold mb-2">
                                        {selectedYear === 'All Years' ? 'All Years' : selectedYear} {selectedTerm !== 'All Terms' ? `Term ${selectedTerm}` : ''}
                                    </Text>
                                    <Text className="text-center mb-2">
                                        You have completed {Math.round(totalHours)} out of 36 hours of attendance for this period.
                                    </Text>
                                    <HStack className="items-center justify-center">
                                        <Progress value={(totalHours / 36) * 100} className="w-80 h-2">
                                            <ProgressFilledTrack className="bg-emerald-600" />
                                        </Progress>
                                    </HStack>
                                </VStack>
                            </VStack>
                        </>
                    ) : (
                        <Text className="text-center">No attendance periods available.</Text>
                    )}
                    <Button onPress={handleRefresh} size="lg" className="py-2 rounded-md" disabled={refreshing}>
                        {refreshing ? (
                            <ActivityIndicator size="small" />
                        ) : (
                            <ButtonText className="font-semibold">Refresh</ButtonText>
                        )}
                    </Button>
                    {semesterEndDate ? (
                    <Box className={`w-full rounded ${theme === 'light' ? 'bg-gray-300' : 'bg-black'}`}>
                        <VStack className="w-full max-w-[600px] p-5">
                            <Text className="text-center font-semibold text-lg">Countdown to End of Term {currentTerm}:</Text>
                            <Text className="text-center text-xl font-bold">{timeLeft}</Text>
                        </VStack>
                    </Box>
                    ) : (
                        <Text className="text-center text-md">Loading countdown...</Text>
                    )}
                </VStack>

                <Fab size="md" placement="bottom right" onPress={toggleTheme}>
                    <FabIcon as={theme === 'light' ? MoonIcon : SunIcon} />
                </Fab>
            </ScrollView>
        </VStack>
    );
}

export default HomeScreen;