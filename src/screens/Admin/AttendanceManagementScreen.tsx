import React, { useState, useEffect } from 'react';
import { ScrollView, RefreshControl, FlatList } from 'react-native';
import { useAuth } from '../../utils/Context/AuthContext';
import { useTheme } from '../../utils/UI/CustomThemeProvider';
import { useAttendance } from '../../utils/Context/AttendanceContext';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Input, InputField } from '@/components/ui/input';
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
import { ChevronDownIcon, MinusIcon, PlusIcon } from 'lucide-react-native';
import { Box } from '@/components/ui/box';
import { useGlobalToast } from '../../utils/UI/CustomToastProvider';
import {
    AlertDialog,
    AlertDialogBackdrop,
    AlertDialogBody,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
} from '@/components/ui/alert-dialog';
import { useForm, Controller } from 'react-hook-form';
import { UserObject, AttendanceLogWithMeeting, AttendanceLog } from '../../Constants';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useMeetings } from '@/src/utils/Context/MeetingContext';
import {
    Accordion,
    AccordionItem,
    AccordionHeader,
    AccordionTrigger,
    AccordionTitleText,
    AccordionContent,
    AccordionIcon,
} from "@/components/ui/accordion";
import { getSystemAvailableFeatures } from 'react-native-device-info';
import { useUsers } from '@/src/utils/Context/UsersContext';

interface EditHoursFormData {
    hours: string;
}

const AttendanceManagementScreen: React.FC = () => {
    const { theme } = useTheme();
    const { user } = useAuth();
    if (!user) return null; // Add null check for user
    const { openToast } = useGlobalToast();

    const {
        allUsersAttendanceData,
        fetchAllUsersAttendanceLogs,
        isLoading,
        schoolYears,
        schoolTerms,
        addManualAttendanceLog,
    } = useAttendance();

    const {
        filteredUsers,
        setSearchQuery,
        applyFilters,
        users,
    } = useUsers();

    const { meetings } = useMeetings();

    const [refreshing, setRefreshing] = useState(false);
    const [searchQueryLocal, setsearchQueryLocal] = useState('');
    const [selectedYear, setSelectedYear] = useState<string>('All Years');
    const [selectedTerm, setSelectedTerm] = useState<string>('All Terms');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [filteredUsersLocal, setfilteredUsersLocal] = useState<
        {
            user: UserObject;
            attendanceLogs: AttendanceLogWithMeeting[];
            attendanceByTerm: Record<string, number>;
        }[]
    >([]);

    // **Define termOptions State**
    const [termOptions, setTermOptions] = useState<string[]>(['All Terms']);

    const [editUser, setEditUser] = useState<UserObject | null>(null);
    const [showEditDialog, setShowEditDialog] = useState(false);

    const { control, handleSubmit, reset } = useForm<EditHoursFormData>();

    useEffect(() => {
        if (user && ['admin', 'advisor', 'executive'].includes(user.role)) {
            fetchAllUsersAttendanceLogs();
        }
    }, [user]);

    useEffect(() => {
        const preparefilteredUsersLocal = () => {
            const usersData = Object.values(allUsersAttendanceData).map(data => ({
                user: data.user,
                attendanceLogs: data.attendanceLogs,
                attendanceByTerm: data.attendanceHours,
            }));

            // Apply search filter
            let filtered = usersData.filter(({ user }) => {
                const query = searchQueryLocal.toLowerCase();
                return (
                    user.first_name.toLowerCase().includes(query) ||
                    user.last_name.toLowerCase().includes(query)
                );
            });

            

            // Apply year and term filters
            if (selectedYear !== 'All Years' || selectedTerm !== 'All Terms') {
                filtered = filtered.map(({ user, attendanceLogs, attendanceByTerm }) => {
                    console.log(attendanceLogs)
                    const filteredLogs = attendanceLogs.filter(log => {
                        console.log(log)
                        const cleanedTerm = selectedTerm.replace('Term ', '');
                        const matchesYear = selectedYear === 'All Years' || log.year === selectedYear;
                        const matchesTerm = selectedTerm === 'All Terms' || log.term === parseInt(cleanedTerm);
                        return matchesYear && matchesTerm;
                    });

                    const filteredHours: Record<string, number> = {};
                    Object.keys(attendanceByTerm).forEach(key => {
                        const [year, term] = key.split('_');
                        const matchesYear = selectedYear === 'All Years' || year === selectedYear;
                        const matchesTerm = selectedTerm === 'All Terms' || term === selectedTerm;
                        if (matchesYear && matchesTerm) {
                            filteredHours[key] = attendanceByTerm[key];
                        }
                    });

                    return {
                        user,
                        attendanceLogs: filteredLogs,
                        attendanceByTerm: filteredHours,
                    };
                }).filter(user => user.attendanceLogs.length > 0);
            }

            // Sort users based on total hours
            filtered.sort((a, b) => {
                const aTotal = Object.values(a.attendanceByTerm).reduce((sum, h) => sum + h, 0);
                const bTotal = Object.values(b.attendanceByTerm).reduce((sum, h) => sum + h, 0);
                return sortOrder === 'asc' ? aTotal - bTotal : bTotal - aTotal;
            });

            setfilteredUsersLocal(filtered);
        };

        preparefilteredUsersLocal();
    }, [allUsersAttendanceData, searchQueryLocal, selectedYear, selectedTerm, sortOrder]);

    useEffect(() => {
        // Update term options based on selected year
        if (selectedYear !== 'All Years' && schoolTerms[selectedYear]) {
            const terms = Object.keys(schoolTerms[selectedYear]).sort((a, b) => parseInt(a) - parseInt(b));
            setTermOptions(['All Terms', ...terms]);
            if (!terms.includes(selectedTerm)) {
                setSelectedTerm('All Terms');
            }
        } else {
            setTermOptions(['All Terms']);
            setSelectedTerm('All Terms');
        }
    }, [selectedYear, schoolTerms, selectedTerm]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchAllUsersAttendanceLogs();
        setRefreshing(false);
    };

    const handleEditHours = (userObj: UserObject) => {
        if (selectedYear === 'All Years' || selectedTerm === 'All Terms') {
            openToast({
                title: 'Select Specific Year and Term',
                description: 'Please select a specific year and term to edit hours.',
                type: 'warning',
            });
            return;
        }
        setEditUser(userObj);
        reset({ hours: '' });
        setShowEditDialog(true);
    };

    const saveEditChanges = handleSubmit(async (data: EditHoursFormData) => {
        if (!editUser) return;

        const hoursAdjustment = parseFloat(data.hours);
        if (isNaN(hoursAdjustment) || hoursAdjustment === 0) {
            openToast({
                title: 'Invalid Input',
                description: 'Please enter a valid number of hours.',
                type: 'error',
            });
            return;
        }

        try {
            const attendanceLog: AttendanceLog = {
                meeting_id: -1,
                lead_id: user._id,
                time_received: Math.floor(Date.now() / 1000),
                flag: false,
                hours: hoursAdjustment,
                term: parseInt(selectedTerm),
                year: selectedYear,
            };
            await addManualAttendanceLog(editUser._id, attendanceLog);
            setShowEditDialog(false);
            await fetchAllUsersAttendanceLogs();

            
        } catch (error) {
            console.error('Error adjusting attendance:', error);
        }
    });

    const handleExport = async () => {
        let csvContent = 'Student ID,First Name,Last Name,Total Hours\n';

        filteredUsersLocal.forEach(({ user, attendanceLogs }) => {
            // Find the matching user directly from the users array instead of using state updates
            const matchingUser = users.find(u => 
                u.first_name.toLowerCase() === user.first_name.toLowerCase() &&
                u.last_name.toLowerCase() === user.last_name.toLowerCase()
            );
        
            if (matchingUser) {
                const totalHours = attendanceLogs.reduce((sum, log) => sum + log.hours, 0);
                csvContent += `${matchingUser.student_id},${matchingUser.first_name},${matchingUser.last_name},${Math.round(totalHours)}\n`;
            }
        });

        const filename = `attendance_data_${selectedYear}_${selectedTerm}.csv`;
        const filepath = `${FileSystem.cacheDirectory}${filename}`;

        try {
            await FileSystem.writeAsStringAsync(filepath, csvContent, {
                encoding: FileSystem.EncodingType.UTF8,
            });
        } catch (error) {
            console.error('Error writing file:', error);
            openToast({
                title: 'Error',
                description: 'Failed to write file.',
                type: 'error',
            });
            return;
        }

        const isAvailable = await Sharing.isAvailableAsync();
        if (!isAvailable) {
            openToast({
                title: 'Sharing Not Available',
                description: 'Sharing is not available on this device.',
                type: 'warning',
            });
            return;
        }

        try {
            await Sharing.shareAsync(filepath, {
                mimeType: 'text/csv',
                dialogTitle: 'Share Attendance Data',
                UTI: 'public.comma-separated-values-text',
            });
        } catch (error) {
            console.error('Error sharing file:', error);
            openToast({
                title: 'Error',
                description: 'Failed to share file.',
                type: 'error',
            });
        }
    };

    if (!user || !['admin', 'advisor', 'executive'].includes(user.role)) {
        return (
            <ScrollView
                contentContainerStyle={{
                    flexGrow: 1,
                    padding: 16,
                    backgroundColor: theme === 'light' ? '#FFFFFF' : '#1A202C',
                }}
            >
                <Text>You do not have permission to access this screen.</Text>
            </ScrollView>
        );
    }

    const renderItem = ({
        item,
    }: {
        item: {
            user: UserObject;
            attendanceLogs: AttendanceLogWithMeeting[];
            attendanceByTerm: Record<string, number>;
        };
    }) => {
        const { user, attendanceLogs } = item;

        // **Ensure user and user._id are defined**
        if (!user || typeof user._id === 'undefined' || user._id === null) {
            console.warn('Encountered a user without a valid _id:', user);
            return null; // Skip rendering this item
        }

        return (
            <AccordionItem
                key={user._id}
                value={user._id.toString()}
                className="mb-4"
            >
                <AccordionHeader>
                    <AccordionTrigger>
                        {({ isExpanded }) => (
                            <HStack className="justify-between items-center w-full">
                                <AccordionTitleText>
                                    {user.first_name} {user.last_name} - Total Hours: {Math.round(Object.values(item.attendanceByTerm).reduce((sum, h) => sum + h, 0))}
                                </AccordionTitleText>
                                <AccordionIcon as={isExpanded ? MinusIcon : PlusIcon} />
                            </HStack>
                        )}
                    </AccordionTrigger>
                </AccordionHeader>
                <AccordionContent className="ml-5 mt-2">
                    {attendanceLogs.length > 0 ? (
                        <>
                            {attendanceLogs.map(log => (
                                <VStack key={`${log.meeting_id}-${log.time_received}`} className="mb-2">
                                    <HStack className="justify-between">
                                        <Text>
                                            {log.meetingTitle} ({log.meetingDate ? log.meetingDate.toLocaleDateString() : 'No Date'})
                                        </Text>
                                        <Text>{Math.round(log.hours)} hours</Text>
                                    </HStack>
                                    <Text>Term {log.term}, {log.year}</Text>
                                </VStack>
                            ))}
                            <Button
                                onPress={() => handleEditHours(user)}
                                size="sm"
                                className="mt-4 self-end"
                            >
                                <ButtonText>Edit Hours</ButtonText>
                            </Button>
                        </>
                    ) : (
                        <Text className="text-sm text-gray-500">No attendance logs available.</Text>
                    )}
                </AccordionContent>
            </AccordionItem>
        );
    };

    return (
        <ScrollView
            contentContainerStyle={{
                flexGrow: 1,
                padding: 16,
                backgroundColor: theme === 'light' ? '#FFFFFF' : '#1A202C',
            }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
            <VStack space="lg" className="items-center">
                {/* Filters */}
                <VStack space="md" className="w-full max-w-[600px]">
                    {/* Search Bar */}
                    <Input variant="outline" size="md">
                        <InputField
                            value={searchQueryLocal}
                            onChangeText={setsearchQueryLocal}
                            placeholder="Search by first or last name"
                            placeholderTextColor={theme === 'light' ? '#A0AEC0' : '#4A5568'}
                        />
                    </Input>

                    {/* Year and Term Selectors */}
                    <HStack space="md">
                        {/* Year Select */}
                        <VStack className="flex-1">
                            <Text className="mb-2">Select Year:</Text>
                            <Select
                                selectedValue={selectedYear}
                                onValueChange={setSelectedYear}
                                className="w-full"
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
                                        {schoolYears.map(year => (
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
                                    className="w-full"
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

                    {/* Sort Order */}
                    <HStack space="md" className="items-center">
                        <Text>Sort by Hours:</Text>
                        <Button
                            variant="outline"
                            size="md"
                            onPress={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                        >
                            <ButtonText>
                                {sortOrder === 'asc' ? 'Lowest to Highest' : 'Highest to Lowest'}
                            </ButtonText>
                        </Button>
                    </HStack>

                    {/* Export Button */}
                    <Button onPress={handleExport} size="md" className="mt-2">
                        <ButtonText>Export Data</ButtonText>
                    </Button>
                </VStack>

                {/* Users List */}
                <Box className="w-full max-w-[600px] mt-4">
                    {isLoading ? (
                        <Text>Loading data...</Text>
                    ) : (
                        <Accordion
                            type="multiple" // "multiple" for multiple open items
                            className="w-full bg-transparent"
                        >
                            <FlatList
                                data={filteredUsersLocal}
                                renderItem={renderItem}
                                keyExtractor={item => {
                                    if (item.user && typeof item.user._id !== 'undefined' && item.user._id !== null) {
                                        return item.user._id.toString();
                                    }
                                    console.warn('Skipping user with invalid _id:', item.user);
                                    return Math.random().toString(); // Fallback key
                                }}
                                ListEmptyComponent={<Text className="text-center">No users found.</Text>}
                                contentContainerStyle={{ paddingBottom: 20 }}
                            />
                        </Accordion>
                    )}
                </Box>
            </VStack>

            {/* Edit Hours Dialog */}
            {editUser && (
                <AlertDialog isOpen={showEditDialog} onClose={() => setShowEditDialog(false)}>
                    <AlertDialogBackdrop />
                    <AlertDialogContent>
                        <AlertDialogHeader className="pb-4">
                            <Text className="text-lg font-semibold">Adjust Attendance Hours</Text>
                        </AlertDialogHeader>
                        <AlertDialogBody>
                            <Text>
                                Adjusting hours for {editUser.first_name} {editUser.last_name} in {selectedYear} Term {selectedTerm}
                            </Text>
                            <Text className="mt-2">
                                Enter a positive number to add hours or a negative number to subtract hours.
                            </Text>
                            <Controller
                                control={control}
                                name="hours"
                                render={({ field: { onChange, value } }) => (
                                    <Input variant="outline" size="md" className="mt-2">
                                        <InputField
                                            value={value}
                                            onChangeText={onChange}
                                            placeholder="Enter hours adjustment"
                                            keyboardType="numeric"
                                            placeholderTextColor={theme === 'light' ? '#A0AEC0' : '#4A5568'}
                                        />
                                    </Input>
                                )}
                            />
                        </AlertDialogBody>
                        <AlertDialogFooter className="flex justify-end space-x-3 pt-6">
                            <Button variant="outline" onPress={() => setShowEditDialog(false)}>
                                <ButtonText>Cancel</ButtonText>
                            </Button>
                            <Button onPress={saveEditChanges} action="primary">
                                <ButtonText>Save</ButtonText>
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </ScrollView>
    );
    };

export default AttendanceManagementScreen;
