import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  FlatList,
  RefreshControl,
} from "react-native";
import { Button, ButtonText } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
} from "@/components/ui/alert-dialog";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { useAuth } from "../../utils/Context/AuthContext";
import { useGlobalToast } from "../../utils/UI/CustomToastProvider";
import { useTheme } from "../../utils/UI/CustomThemeProvider";
import { useForm, Controller } from "react-hook-form";
import { useGlobalModal } from "@/src/utils/UI/CustomModalProvider";
import { Card } from "@/components/ui/card";
import { Input, InputField } from "@/components/ui/input";
import { Pressable } from "@/components/ui/pressable";
import { useMeetings } from "@/src/utils/Context/MeetingContext";
import { useUsers } from "@/src/utils/Context/UsersContext";
import { Spinner } from "@/components/ui/spinner";
import { MeetingObject } from "@/src/Constants";

export interface FormData {
  searchQuery: string;
}

const AttendanceHistoryScreen: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useTheme();

  const { meetings, isLoadingMeetings, fetchMeetings, init } = useMeetings();
  const { users, isLoading: isLoadingUsers, fetchUsers } = useUsers();

  const [refreshing, setRefreshing] = useState(false);
  const [filteredMeetings, setFilteredMeetings] = useState<MeetingObject[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // State for viewing meeting details
  const [viewingMeeting, setViewingMeeting] = useState<MeetingObject | null>(null);
  const [showViewMeetingDialog, setShowViewMeetingDialog] = useState<boolean>(false);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      searchQuery: "",
    },
  });

  useEffect(() => {
    if (user) {
      init(); // Initialize meetings data
      if (users.length === 0) {
        fetchUsers(); // Ensure users are fetched
      }
    }
  }, [user]);

  useEffect(() => {
    if (user && meetings.length > 0) {
      filterMeetings();
    }
  }, [meetings, users, searchQuery]);

  const filterMeetings = () => {
    const userId = user?._id;
    if (!userId) return;

    let filtered = meetings.filter(
      (meeting) => meeting.members_logged && meeting.members_logged.includes(userId)
    );

    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (meeting) =>
          meeting.title.toLowerCase().includes(query) ||
          meeting.description.toLowerCase().includes(query) ||
          meeting.location.toLowerCase().includes(query)
      );
    }

    setFilteredMeetings(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMeetings();
    setRefreshing(false);
  };

  const handleViewMeeting = (meeting: MeetingObject) => {
    setViewingMeeting(meeting);
    setShowViewMeetingDialog(true);
  };

  // Helper function to format date and time
  const formatDateTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getUserName = (userId: number): string => {
    const user = users.find((u) => u._id === userId);
    return user ? `${user.first_name} ${user.last_name}` : `User ID: ${userId}`;
  };

  // Render Item for FlatList
  const renderMeetingItem = ({ item }: { item: MeetingObject }) => (
    <Card
      key={item._id}
      variant="outline"
      className="p-5 mb-4 rounded-xl shadow-sm border-outline-200"
    >
      <Pressable onPress={() => handleViewMeeting(item)}>
        <VStack space="sm">
          <Text className="text-lg font-semibold text-typography-950">{item.title}</Text>
          <Text className="text-sm text-typography-600">{item.location}</Text>
          <Text className="text-xs text-typography-500">
            {formatDateTime(item.time_start)}
          </Text>
        </VStack>
      </Pressable>
    </Card>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-background-0"
    >
      <Box className="px-6 py-6 flex-1">
        {/* Search Bar */}
        <Controller
          control={control}
          name="searchQuery"
          render={({ field: { onChange, value } }) => (
            <Input variant="outline" size="md" className="mb-6 rounded-lg shadow-sm border-outline-200">
              <InputField
                value={value}
                onChangeText={(text) => {
                  onChange(text);
                  setSearchQuery(text);
                }}
                placeholder="Search your meetings by title, location, or description..."
                className="text-typography-900"
              />
            </Input>
          )}
        />
        {errors.searchQuery && (
          <Text className="text-red-500">{errors.searchQuery.message}</Text>
        )}

        {/* Meetings List */}
        <Box className="rounded-lg overflow-hidden flex-1">
          <FlatList
            data={filteredMeetings}
            renderItem={renderMeetingItem}
            keyExtractor={(item) => item._id.toString()}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              !isLoadingMeetings && !isLoadingUsers ? (
                <Box className="p-6">
                  <Text className="text-center text-base text-typography-600">You have no meetings marked for attendance.</Text>
                </Box>
              ) : null
            }
            ListHeaderComponent={
              (isLoadingMeetings || isLoadingUsers) ? (
                <Box className="p-6">
                  <Spinner />
                  <Text className="text-center text-base text-typography-600">Loading your meetings...</Text>
                </Box>
              ) : null
            }
            contentContainerStyle={{
              paddingBottom: 20,
            }}
          />
        </Box>

        {/* View Meeting Details Dialog */}
        {viewingMeeting && showViewMeetingDialog && (
          <AlertDialog
            isOpen={showViewMeetingDialog}
            onClose={() => setShowViewMeetingDialog(false)}
          >
            <AlertDialogBackdrop />
            <AlertDialogContent>
              <AlertDialogHeader className="pb-4">
                <Text className="text-xl font-semibold text-typography-950">Meeting Details</Text>
              </AlertDialogHeader>
              <AlertDialogBody>
                <VStack space="md">
                  <VStack space="xs">
                    <Text className="text-sm font-medium text-typography-600">Title</Text>
                    <Text className="text-base text-typography-950">{viewingMeeting.title}</Text>
                  </VStack>

                  <VStack space="xs">
                    <Text className="text-sm font-medium text-typography-600">Description</Text>
                    <Text className="text-base text-typography-950">{viewingMeeting.description}</Text>
                  </VStack>

                  <VStack space="xs">
                    <Text className="text-sm font-medium text-typography-600">Location</Text>
                    <Text className="text-base text-typography-950">{viewingMeeting.location}</Text>
                  </VStack>

                  <VStack space="xs">
                    <Text className="text-sm font-medium text-typography-600">Start Time</Text>
                    <Text className="text-base text-typography-950">{formatDateTime(viewingMeeting.time_start)}</Text>
                  </VStack>

                  <VStack space="xs">
                    <Text className="text-sm font-medium text-typography-600">End Time</Text>
                    <Text className="text-base text-typography-950">{formatDateTime(viewingMeeting.time_end)}</Text>
                  </VStack>

                  <VStack space="xs">
                    <Text className="text-sm font-medium text-typography-600">Hours</Text>
                    <Text className="text-base text-typography-950">{viewingMeeting.hours}</Text>
                  </VStack>

                  <VStack space="xs">
                    <Text className="text-sm font-medium text-typography-600">Created By</Text>
                    <Text className="text-base text-typography-950">{getUserName(viewingMeeting.created_by)}</Text>
                  </VStack>
                </VStack>
              </AlertDialogBody>
              <AlertDialogFooter className="flex justify-end pt-6">
                <Button
                  onPress={() => setShowViewMeetingDialog(false)}
                  size="md"
                  className="rounded-lg shadow-sm"
                >
                  <ButtonText className="font-semibold">Close</ButtonText>
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </Box>
    </KeyboardAvoidingView>
  );
};

export default AttendanceHistoryScreen;
