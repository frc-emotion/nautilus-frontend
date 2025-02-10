import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useUsers } from './UsersContext';
import { useGlobalToast } from '../UI/CustomToastProvider';
import { AttendanceContextProps, SchoolYear, AttendanceHours, QueuedRequest, UserObject, AttendanceLog, AttendanceLogWithMeeting } from '@/src/Constants';
import { useMeetings } from './MeetingContext';
import { useGlobalModal } from '../UI/CustomModalProvider';
import { handleErrorWithModalOrToast } from '../Helpers';
import { useNetworking } from './NetworkingContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';
import { AxiosError, AxiosResponse } from 'axios';

const AttendanceContext = createContext<AttendanceContextProps | undefined>(undefined);
const DEBUG_PREFIX = '[AttendanceProvider]';

export const AttendanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, isLoggedIn } = useAuth();
    const { users, fetchUsers, isLoading: usersLoading } = useUsers();
    const { meetings } = useMeetings();
    const { openToast } = useGlobalToast();
    const { openModal } = useGlobalModal();
    const { handleRequest } = useNetworking();

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

    const hasInitialized = useRef(false);

    const computeAttendanceHours = useCallback((logs: AttendanceLog[]): AttendanceHours => {
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
    }, []);

    const determineCurrentYearAndTerm = useCallback(() => {
        console.log(`${DEBUG_PREFIX} Determining current year and term based on timestamp.`);
        const currentTimestamp = Math.floor(Date.now() / 1000);
        let found = false;

        console.log(`${DEBUG_PREFIX} School Years:`, schoolYears);
        console.log(`${DEBUG_PREFIX} School Terms:`, schoolTerms);

        for (const year of schoolYears) {
            console.log(`${DEBUG_PREFIX} Checking year: ${year}`);
            const terms = schoolTerms[year];
            if (terms) {
                console.log(`${DEBUG_PREFIX} Terms found for year:`, terms);
                for (const termNumber in terms) {
                    console.log(`${DEBUG_PREFIX} Checking term: ${termNumber}`);
                    const term = terms[termNumber];
                    if (term?.start && term?.end) {
                        console.log(`${DEBUG_PREFIX} Term start and end:`, term.start, term.end);
                        if (currentTimestamp >= term.start && currentTimestamp <= term.end) {
                            console.log(`${DEBUG_PREFIX} Current timestamp is within term.`);
                            setCurrentYear(year);
                            setCurrentTerm(parseInt(termNumber));
                            found = true;
                            console.log(`${DEBUG_PREFIX} Current year and term set to: ${year}, Term ${termNumber}`);
                            break;
                        }
                    } else {
                        console.warn(`${DEBUG_PREFIX} Term ${termNumber} for year ${year} lacks start or end timestamp.`);
                    }
                }
            } else {
                console.warn(`${DEBUG_PREFIX} No terms found for year: ${year}`);
            }
            if (found) break;
        }

        if (!found && schoolYears.length > 0) {
            const latestYear = schoolYears[schoolYears.length - 1];
            const terms = schoolTerms[latestYear];
            if (terms) {
                const sortedTermKeys = Object.keys(terms).sort((a, b) => parseInt(b) - parseInt(a));
                const latestTermKey = sortedTermKeys[0];
                const latestTerm = parseInt(latestTermKey);
                setCurrentYear(latestYear);
                setCurrentTerm(latestTerm);
                console.warn(`${DEBUG_PREFIX} Defaulting to latest year and term: ${latestYear}, Term ${latestTerm}`);
            } else {
                console.error(`${DEBUG_PREFIX} No terms available for the latest year: ${latestYear}`);
            }
        }
    }, [schoolYears, schoolTerms]);

    const fetchYearsAndTerms = useCallback(async () => {
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
                Sentry.captureException(error);
                console.error(`${DEBUG_PREFIX} Error fetching years and terms:`, error);
                handleErrorWithModalOrToast({
                    actionName: 'Fetch Years and Terms',
                    error,
                    showModal: false,
                    showToast: true,
                    openModal,
                    openToast,
                });
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
            await handleRequest(request);
        } catch (error) {
            Sentry.captureException(error);
            console.error(`${DEBUG_PREFIX} Unexpected error during fetchYearsAndTerms:`, error);
        }
    }, [handleRequest, openModal, openToast]);

    const fetchUserAttendanceLogs = useCallback(async () => {
        if (!user) return;
        console.log(`${DEBUG_PREFIX} Fetching attendance logs for user: ${user._id}`);
        const request: QueuedRequest = {
            url: '/api/attendance/log',
            method: 'get',
            retryCount: 0,
            successHandler: async (response: AxiosResponse) => {
                const data = response.data.data;
                if (!data) {
                    console.log(`${DEBUG_PREFIX} No attendance logs found for user.`);
                    setUserAttendanceHours({});
                    return;
                }
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
                
                // If 404 then no attendance logs found for user
                if (error.response?.status === 404) {
                    console.log(`${DEBUG_PREFIX} No attendance logs found for user.`);
                    setUserAttendanceHours({});
                    return;
                }

                Sentry.captureException(error);
                console.error(`${DEBUG_PREFIX} Error fetching user attendance logs:`, error);
                handleErrorWithModalOrToast({
                    actionName: 'Fetch User Attendance Logs',
                    error,
                    showModal: false,
                    showToast: true,
                    openModal,
                    openToast,
                });
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
            await handleRequest(request);
        } catch (error) {
            Sentry.captureException(error);
            console.error(`${DEBUG_PREFIX} Unexpected error during fetchUserAttendanceLogs:`, error);
        }
    }, [user, computeAttendanceHours, handleRequest, openModal, openToast]);

    const fetchAllUsersAttendanceLogs = useCallback(async () => {
        if (!user || !['admin', 'advisor', 'executive'].includes(user.role)) return;
        console.log(`${DEBUG_PREFIX} Fetching attendance logs for all users.`);
        const request: QueuedRequest = {
            url: '/api/attendance/all',
            method: 'get',
            retryCount: 0,
            successHandler: async (response: AxiosResponse) => {
                const data = response.data.data;
                const attendanceData = data.attendance;

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
                Sentry.captureException(error);
                console.error(`${DEBUG_PREFIX} Error fetching all users attendance logs:`, error);
                handleErrorWithModalOrToast({
                    actionName: 'Fetch All Users Attendance Logs',
                    error,
                    showModal: false,
                    showToast: true,
                    openModal,
                    openToast,
                });
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
            await handleRequest(request);
        } catch (error) {
            Sentry.captureException(error);
            console.error(`${DEBUG_PREFIX} Unexpected error during fetchAllUsersAttendanceLogs:`, error);
        }
    }, [user, users, meetings, computeAttendanceHours, handleRequest, openModal, openToast]);

    const addManualAttendanceLog = useCallback(async (userId: number, attendanceLog: AttendanceLog) => {
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
                Sentry.captureException(error);
                console.error(`${DEBUG_PREFIX} Error adding manual attendance log:`, error);
                handleErrorWithModalOrToast({
                    actionName: 'Add Manual Attendance Log',
                    error,
                    showModal: false,
                    showToast: true,
                    openModal,
                    openToast,
                });
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
            await handleRequest(request);
            await fetchAllUsersAttendanceLogs();
        } catch (error) {
            Sentry.captureException(error);
            console.error(`${DEBUG_PREFIX} Unexpected error during addManualAttendanceLog:`, error);
        }
    }, [user, openToast, openModal, handleRequest, fetchAllUsersAttendanceLogs]);

    const removeManualAttendanceLogs = useCallback(async (
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
                Sentry.captureException(error);
                console.error(`${DEBUG_PREFIX} Error removing manual attendance logs:`, error);
                handleErrorWithModalOrToast({
                    actionName: 'Remove Manual Attendance Logs',
                    error,
                    showModal: false,
                    showToast: true,
                    openModal,
                    openToast,
                });
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
            await handleRequest(request);
            await fetchAllUsersAttendanceLogs();
        } catch (error) {
            Sentry.captureException(error);
            console.error(`${DEBUG_PREFIX} Unexpected error during removeManualAttendanceLogs:`, error);
        }
    }, [user, openToast, openModal, handleRequest, fetchAllUsersAttendanceLogs]);

    // useEffect(() => {
    //     try {
    //         fetchYearsAndTerms();
    //         fetchUserAttendanceLogs();
    //     } catch (error) {
    //         Sentry.captureException(error);
    //         console.error(`${DEBUG_PREFIX} Unexpected error during useEffect:`, error);
    //     }
    // }, [isLoggedIn]);

    const loadYearsAndTerms = async () => {
        try {
            await fetchYearsAndTerms();
            await determineCurrentYearAndTerm();
        } catch (error) {
            Sentry.captureException(error);
            console.error(`${DEBUG_PREFIX} Error loading years and terms:`, error);
            openToast({
                title: 'Error',
                description: 'An error occurred while loading school years and terms.',
                type: 'error',
            });
        }
    }


    const initializeAttendanceData = useCallback(async () => {
        console.log(`${DEBUG_PREFIX} Initializing attendance data.`);
        
        if (!user || user.role === 'unverified') {
            console.warn(`${DEBUG_PREFIX} Initialization skipped: User is unverified or undefined.`);
            return;
        }

        setIsLoading(true);
        try {
            if (users.length === 0 && !usersLoading) {
                console.log(`${DEBUG_PREFIX} Fetching users.`);
                await fetchUsers();
                console.log(`${DEBUG_PREFIX} Users fetched.`);
            }
            await fetchYearsAndTerms();
            await fetchUserAttendanceLogs();

            if (user && ['admin', 'advisor', 'executive'].includes(user.role)) {
                await fetchAllUsersAttendanceLogs();
            }
        } catch (error) {
            Sentry.captureException(error);
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
    }, [user, users, usersLoading, fetchUsers, fetchYearsAndTerms, fetchUserAttendanceLogs, fetchAllUsersAttendanceLogs, openToast]);

    useEffect(() => {
        if (schoolYears.length > 0 && Object.keys(schoolTerms).length > 0) {
            determineCurrentYearAndTerm();
        }
    }, [schoolYears, schoolTerms, determineCurrentYearAndTerm]);

    const init = useCallback(async () => {
        if (hasInitialized.current) {
            return; 
        }

        if (!user) {
            await fetchYearsAndTerms();
            await determineCurrentYearAndTerm();
            return;
        }

        hasInitialized.current = true;
        await initializeAttendanceData();
    }, [user, initializeAttendanceData]);

    const refreshAttendanceData = useCallback(async () => {
        console.log(`${DEBUG_PREFIX} Refreshing attendance data.`);
        await initializeAttendanceData();
    }, [initializeAttendanceData]);

    const value = useMemo(() => ({
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
        init,
        refreshAttendanceData,
        loadYearsAndTerms
    }), [schoolYears, schoolTerms, currentYear, currentTerm, userAttendanceHours, isLoading, allUsersAttendanceData, fetchAllUsersAttendanceLogs, addManualAttendanceLog, removeManualAttendanceLogs, init, refreshAttendanceData]);

    return (
        <AttendanceContext.Provider value={value}>
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