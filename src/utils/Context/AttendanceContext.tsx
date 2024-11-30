import React, { createContext, useContext, useState, useEffect } from 'react';
import ApiClient from '../Networking/APIClient';
import { AxiosResponse, AxiosError } from 'axios';
import { useAuth } from './AuthContext';
import { useUsers } from './UsersContext';
import { useGlobalToast } from '../UI/CustomToastProvider';
import {
    AttendanceContextProps,
    SchoolYear,
    AttendanceHours,
    QueuedRequest,
    UserObject,
    AttendanceLog,
    AttendanceLogWithMeeting,
} from '@/src/Constants';
import { useMeetings } from './MeetingContext';
import { useModal } from '../UI/CustomModalProvider';
import { handleErrorWithModalOrToast } from '../Helpers';

const AttendanceContext = createContext<AttendanceContextProps | undefined>(undefined);
const DEBUG_PREFIX = '[AttendanceProvider]';

export const AttendanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const { users, fetchUsers, isLoading: usersLoading } = useUsers();
    const { meetings } = useMeetings();
    const { openToast } = useGlobalToast();
    const { openModal } = useModal();

    const [schoolYears, setSchoolYears] = useState<string[]>([]);
    const [schoolTerms, setSchoolTerms] = useState<SchoolYear>({});
    const [currentYear, setCurrentYear] = useState<string>('');
    const [currentTerm, setCurrentTerm] = useState<number>(1);
    const [userAttendanceHours, setUserAttendanceHours] = useState<AttendanceHours>({});
    const [allUsersAttendanceData, setAllUsersAttendanceData] = useState<{
        [userId: string]: {
            user: UserObject;
            attendanceLogs: AttendanceLogWithMeeting[];
            attendanceHours: AttendanceHours;
        };
    }>({});
    const [isLoading, setIsLoading] = useState<boolean>(false);

    async function init() {
        if (user) {
            initializeAttendanceData();
        } else {
            resetContext();
        }
    }

    const resetContext = () => {
        console.log(`${DEBUG_PREFIX} Resetting context state.`);
        setSchoolYears([]);
        setSchoolTerms({});
        setCurrentYear('');
        setCurrentTerm(1);
        setUserAttendanceHours({});
        setAllUsersAttendanceData({});
    };

    const initializeAttendanceData = async () => {
        console.log(`${DEBUG_PREFIX} Initializing attendance data.`);
        setIsLoading(true);
        try {
            if (users.length === 0 && !usersLoading) {
                console.log(`${DEBUG_PREFIX} Fetching users.`);
                await fetchUsers();
                console.log(`${DEBUG_PREFIX} Users fetched.`);
            }
            await fetchYearsAndTerms();
            determineCurrentYearAndTerm();
            await fetchUserAttendanceLogs();

            if (['admin', 'advisor', 'executive'].includes(user.role)) {
                await fetchAllUsersAttendanceLogs();
            }
        } catch (error) {
            console.error(`${DEBUG_PREFIX} Initialization error:`, error);
            openToast({
                title: 'Initialization Error',
                description: 'An error occurred while initializing attendance data.',
                type: 'error',
            });
        } finally {
            setIsLoading(false);
            console.log(`${DEBUG_PREFIX} Attendance data initialization complete.`);
        }
    };

    const fetchYearsAndTerms = async () => {
        console.log(`${DEBUG_PREFIX} Fetching school years and terms.`);
        const request: QueuedRequest = {
            url: '/api/attendance/years',
            method: 'get',
            retryCount: 0,
            successHandler: async (response: AxiosResponse) => {
                const data = response.data;
                console.log(`${DEBUG_PREFIX} Received years and terms:`, data);
                const years = Object.keys(data);
                setSchoolYears(years || []);
                setSchoolTerms(data || {});
            },
            errorHandler: async (error: AxiosError) => {
                console.error(`${DEBUG_PREFIX} Error fetching years and terms:`, error);
                handleErrorWithModalOrToast({
                    actionName: 'Fetch Years and Terms',
                    error,
                    showModal: false,
                    showToast: true,
                    openModal,
                    openToast,
                })
            },
            offlineHandler: async () => {
                console.warn(`${DEBUG_PREFIX} Offline while fetching years and terms.`);
                openToast({
                    title: 'Offline',
                    description: 'Cannot fetch school years and terms while offline.',
                    type: 'warning',
                });
            },
        };

        try {
            await ApiClient.handleRequest(request);
        } catch (error) {
            console.error(`${DEBUG_PREFIX} Unexpected error during fetchYearsAndTerms:`, error);
        }
    };

    const determineCurrentYearAndTerm = () => {
        console.log(`${DEBUG_PREFIX} Determining current year and term based on timestamp.`);
        const currentTimestamp = Math.floor(Date.now() / 1000);
        let found = false;

        for (const year of schoolYears) {
            const terms = schoolTerms[year];
            if (terms) {
                for (const termNumber in terms) {
                    const term = terms[termNumber];
                    if (term?.start && term?.end) {
                        if (currentTimestamp >= term.start && currentTimestamp <= term.end) {
                            setCurrentYear(year);
                            setCurrentTerm(parseInt(termNumber));
                            found = true;
                            console.log(`${DEBUG_PREFIX} Current year and term set to: ${year}, Term ${termNumber}`);
                            break;
                        }
                    }
                }
            }
            if (found) break;
        }

        if (!found && schoolYears.length > 0) {
            const latestYear = schoolYears[schoolYears.length - 1];
            const terms = schoolTerms[latestYear];
            if (terms) {
                const latestTermKey = Object.keys(terms).sort((a, b) => parseInt(b) - parseInt(a))[0];
                const latestTerm = parseInt(latestTermKey);
                setCurrentYear(latestYear);
                setCurrentTerm(latestTerm);
                console.warn(`${DEBUG_PREFIX} Defaulting to latest year and term: ${latestYear}, Term ${latestTerm}`);
            } else {
                console.error(`${DEBUG_PREFIX} No terms available for the latest year: ${latestYear}`);
            }
        }
    };

    const fetchUserAttendanceLogs = async () => {
        if (!user) return;
        console.log(`${DEBUG_PREFIX} Fetching attendance logs for user: ${user._id}`);
        const request: QueuedRequest = {
            url: '/api/attendance/log',
            method: 'get',
            retryCount: 0,
            successHandler: async (response: AxiosResponse) => {
                const data = response.data.data;
                const attendanceLogs = data.attendance?.logs;
                if (attendanceLogs) {
                    const hoursData = computeAttendanceHours(attendanceLogs);
                    setUserAttendanceHours(hoursData);
                    console.log(`${DEBUG_PREFIX} User attendance hours set:`, hoursData);
                } else {
                    console.log(`${DEBUG_PREFIX} No attendance logs found for user.`);
                    setUserAttendanceHours({});
                }
            },
            errorHandler: async (error: AxiosError) => {
                console.error(`${DEBUG_PREFIX} Error fetching user attendance logs:`, error);
                handleErrorWithModalOrToast({
                    actionName: 'Fetch User Attendance Logs',
                    error,
                    showModal: false,
                    showToast: true,
                    openModal,
                    openToast,
                })
            },
            offlineHandler: async () => {
                console.warn(`${DEBUG_PREFIX} Offline while fetching user attendance logs.`);
                openToast({
                    title: 'Offline',
                    description: 'Cannot fetch attendance logs while offline.',
                    type: 'warning',
                });
            },
        };

        try {
            await ApiClient.handleRequest(request);
        } catch (error) {
            console.error(`${DEBUG_PREFIX} Unexpected error during fetchUserAttendanceLogs:`, error);
        }
    };

    const fetchAllUsersAttendanceLogs = async () => {
        if (!user || !['admin', 'advisor', 'executive'].includes(user.role)) return;
        console.log(`${DEBUG_PREFIX} Fetching attendance logs for all users.`);
        const request: QueuedRequest = {
            url: '/api/attendance/all',
            method: 'get',
            retryCount: 0,
            successHandler: async (response: AxiosResponse) => {
                const data = response.data.data;
                const attendanceData = data.attendance; // Array of { _id: userId, logs: AttendanceLog[] }

                if (attendanceData && Array.isArray(attendanceData)) {
                    const userAttendanceData: {
                        [userId: string]: {
                            user: UserObject;
                            attendanceLogs: AttendanceLogWithMeeting[];
                            attendanceHours: AttendanceHours;
                        };
                    } = {};

                    attendanceData.forEach(({ _id: userId, logs }: { _id: string; logs: AttendanceLog[] }) => {
                        const userObj = users.find((u) => u._id === parseInt(userId));
                        if (userObj) {
                            const attendanceLogsWithMeetings = logs.map((log) => {
                                const meeting = meetings.find((m) => m._id === log.meeting_id);
                                return {
                                    ...log,
                                    meetingTitle: meeting ? meeting.title : 'Advisor Override',
                                    meetingDate: meeting ? new Date(meeting.time_start * 1000) : null,
                                };
                            });

                            const attendanceHours = computeAttendanceHours(logs);
                            userAttendanceData[userId] = {
                                user: userObj,
                                attendanceLogs: attendanceLogsWithMeetings,
                                attendanceHours,
                            };
                        } else {
                            console.warn(`${DEBUG_PREFIX} User with ID ${userId} not found.`);
                        }
                    });

                    setAllUsersAttendanceData(userAttendanceData);
                    console.log(`${DEBUG_PREFIX} All users' attendance data set.`);
                } else {
                    console.log(`${DEBUG_PREFIX} No attendance data found for all users.`);
                    setAllUsersAttendanceData({});
                }
            },
            errorHandler: async (error: AxiosError) => {
                console.error(`${DEBUG_PREFIX} Error fetching all users attendance logs:`, error);
                handleErrorWithModalOrToast({
                    actionName: 'Fetch All Users Attendance Logs',
                    error,
                    showModal: false,
                    showToast: true,
                    openModal,
                    openToast,
                })
            },
            offlineHandler: async () => {
                console.warn(`${DEBUG_PREFIX} Offline while fetching all users attendance logs.`);
                openToast({
                    title: 'Offline',
                    description: 'Cannot fetch attendance logs for all users while offline.',
                    type: 'warning',
                });
            },
        };

        try {
            await ApiClient.handleRequest(request);
        } catch (error) {
            console.error(`${DEBUG_PREFIX} Unexpected error during fetchAllUsersAttendanceLogs:`, error);
        }
    };

    const computeAttendanceHours = (logs: AttendanceLog[]): AttendanceHours => {
        const attendanceHours: AttendanceHours = {};
        logs.forEach((log) => {
            const { term, year, hours } = log;
            if (year && term) {
                const key = `${year}_${term}`;
                attendanceHours[key] = (attendanceHours[key] || 0) + hours;
            } else {
                console.warn(`${DEBUG_PREFIX} Invalid attendance log:`, log);
            }
        });
        return attendanceHours;
    };

    const addManualAttendanceLog = async (userId: number, attendanceLog: AttendanceLog) => {
        if (!user || !['admin', 'advisor', 'executive'].includes(user.role)) return;
        console.log(`${DEBUG_PREFIX} Adding manual attendance log for user ${userId}.`);

        const request: QueuedRequest = {
            url: '/api/attendance/manual/add',
            method: 'post',
            data: {
                user_id: userId,
                attendanceLog,
            },
            retryCount: 0,
            successHandler: async () => {
                console.log(`${DEBUG_PREFIX} Manual attendance log added.`);
                openToast({
                    title: 'Success',
                    description: 'Attendance hours adjusted successfully.',
                    type: 'success',
                });
            },
            errorHandler: async (error: AxiosError) => {
                console.error(`${DEBUG_PREFIX} Error adding manual attendance log:`, error);
                handleErrorWithModalOrToast({
                    actionName: 'Add Manual Attendance Log',
                    error,
                    showModal: false,
                    showToast: true,
                    openModal,
                    openToast,
                })
            },
            offlineHandler: async () => {
                console.warn(`${DEBUG_PREFIX} Offline while adding manual attendance log.`);
                openToast({
                    title: 'Offline',
                    description: 'Cannot adjust attendance hours while offline.',
                    type: 'warning',
                });
            },
        };

        try {
            await ApiClient.handleRequest(request);
            await fetchAllUsersAttendanceLogs();
        } catch (error) {
            console.error(`${DEBUG_PREFIX} Unexpected error during addManualAttendanceLog:`, error);
        }
    };

    const removeManualAttendanceLogs = async (
        userId: number,
        hours: number,
        term: number,
        year: string
    ) => {
        if (!user || !['admin', 'advisor', 'executive'].includes(user.role)) return;
        console.log(`${DEBUG_PREFIX} Removing manual attendance logs for user ${userId}.`);

        const request: QueuedRequest = {
            url: '/api/attendance/manual/remove',
            method: 'post',
            data: {
                user_id: userId,
                hours,
                term,
                year,
            },
            retryCount: 0,
            successHandler: async () => {
                console.log(`${DEBUG_PREFIX} Manual attendance logs removed.`);
                openToast({
                    title: 'Success',
                    description: 'Attendance hours adjusted successfully.',
                    type: 'success',
                });
            },
            errorHandler: async (error: AxiosError) => {
                console.error(`${DEBUG_PREFIX} Error removing manual attendance logs:`, error);
                handleErrorWithModalOrToast({
                    actionName: 'Remove Manual Attendance Logs',
                    error,
                    showModal: false,
                    showToast: true,
                    openModal,
                    openToast,
                })
            },
            offlineHandler: async () => {
                console.warn(`${DEBUG_PREFIX} Offline while removing manual attendance logs.`);
                openToast({
                    title: 'Offline',
                    description: 'Cannot adjust attendance hours while offline.',
                    type: 'warning',
                });
            },
        };

        try {
            await ApiClient.handleRequest(request);
            await fetchAllUsersAttendanceLogs();
        } catch (error) {
            console.error(`${DEBUG_PREFIX} Unexpected error during removeManualAttendanceLogs:`, error);
        }
    };

    return (
        <AttendanceContext.Provider
            value={{
                schoolYears,
                schoolTerms,
                currentYear,
                currentTerm,
                userAttendanceHours,
                isLoading,
                allUsersAttendanceData,
                fetchAllUsersAttendanceLogs,
                addManualAttendanceLog,
                removeManualAttendanceLogs,
                init
            }}
        >
            {children}
        </AttendanceContext.Provider>
    );
};

export const useAttendance = (): AttendanceContextProps => {
    const context = useContext(AttendanceContext);
    if (!context) {
        throw new Error('useAttendance must be used within an AttendanceProvider');
    }
    return context;
};
