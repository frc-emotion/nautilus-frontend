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
import { useThemeContext } from "../../utils/UI/CustomThemeProvider";
import { useForm, Controller } from "react-hook-form";
import { useModal } from "@/src/utils/UI/CustomModalProvider";
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
  const { colorMode } = useThemeContext();

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
      className="p-4 mb-3 rounded-lg"
    >
      <Pressable onPress={() => handleViewMeeting(item)}>
        <Text className="text-lg font-semibold">{item.title}</Text>
        <Text>{item.location}</Text>
        <Text>
          {formatDateTime(item.time_start)} - {formatDateTime(item.time_end)}
        </Text>
      </Pressable>
    </Card>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{
        flex: 1,
        backgroundColor: colorMode === "light" ? "#FFFFFF" : "#1A202C",
      }}
    >
      <Box className="p-4 flex-1">
        {/* Search Bar */}
        <Controller
          control={control}
          name="searchQuery"
          render={({ field: { onChange, value } }) => (
            <Input variant="outline" size="md" className="mb-4">
              <InputField
                value={value}
                onChangeText={(text) => {
                  onChange(text);
                  setSearchQuery(text);
                }}
                placeholder="Search your meetings by title, location, or description..."
                placeholderTextColor={colorMode === 'light' ? '#A0AEC0' : '#4A5568'}
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
                <Box className="p-3">
                  <Text className="text-center">You have no meetings marked for attendance.</Text>
                </Box>
              ) : null
            }
            ListHeaderComponent={
              (isLoadingMeetings || isLoadingUsers) ? (
                <Box className="p-3">
                  <Spinner />
                  <Text className="text-center">Loading your meetings...</Text>
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
                <Text className="text-lg font-semibold">Meeting Details</Text>
              </AlertDialogHeader>
              <AlertDialogBody>
                <VStack space="sm">
                  <Text className="font-medium">Title:</Text>
                  <Text>{viewingMeeting.title}</Text>

                  <Text className="font-medium">Description:</Text>
                  <Text>{viewingMeeting.description}</Text>

                  <Text className="font-medium">Location:</Text>
                  <Text>{viewingMeeting.location}</Text>

                  <Text className="font-medium">Start Time:</Text>
                  <Text>{formatDateTime(viewingMeeting.time_start)}</Text>

                  <Text className="font-medium">End Time:</Text>
                  <Text>{formatDateTime(viewingMeeting.time_end)}</Text>

                  <Text className="font-medium">Hours:</Text>
                  <Text>{viewingMeeting.hours}</Text>

                  <Text className="font-medium">Created By:</Text>
                  <Text>{getUserName(viewingMeeting.created_by)}</Text>
                </VStack>
              </AlertDialogBody>
              <AlertDialogFooter className="flex justify-end space-x-3 pt-6">
                <Button
                  onPress={() => setShowViewMeetingDialog(false)}
                >
                  <ButtonText>Close</ButtonText>
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
