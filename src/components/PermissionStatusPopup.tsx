// PermissionStatusPopup.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  Platform,
  Linking,
  PermissionsAndroid,
  View,
  ActivityIndicator,
} from "react-native";
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { useBLE } from "@/src/utils/BLE/BLEContext";
import { useLocation } from "@/src/utils/Context/LocationContext";
import { AndroidPermission, getRequiredPermissions } from "../utils/BLE/permissionHelper";

interface PermissionStatusPopupProps {
  visible: boolean;
  onClose: () => void;
}

interface AndroidPermissionStatus {
  permission: string;
  label: string;
  granted: boolean;
}

const PermissionStatusPopup: React.FC<PermissionStatusPopupProps> = ({ visible, onClose }) => {
  const { bluetoothState, fetchInitialBluetoothState } = useBLE();
  const { locationStatus, checkLocationServices } = useLocation();

  const [androidPermissions, setAndroidPermissions] = useState<AndroidPermissionStatus[]>([]);
  const [isRechecking, setIsRechecking] = useState<boolean>(false);

  // Fetch Android permissions when the popup becomes visible
  useEffect(() => {
    const fetchAndroidPermissions = async () => {
      if (Platform.OS !== "android") return;

      const permissionsToCheck = getRequiredPermissions();

      const statuses: AndroidPermissionStatus[] = await Promise.all(
        permissionsToCheck.map(async (perm) => {
          console.log("Checking permission:", perm.permission);
          const granted = await PermissionsAndroid.check(perm.permission);
          return { permission: perm.permission, label: perm.label, granted };
        })
      );

      setAndroidPermissions(statuses);
    };

    if (visible && Platform.OS === "android") {
      fetchAndroidPermissions();
    }
  }, [visible]);

  // Function to recheck permissions and Bluetooth state
  const handleRecheck = useCallback(async () => {
    setIsRechecking(true);
    try {
      if (Platform.OS === "android") {
        const permissionsToCheck = getRequiredPermissions();
        const updatedStatuses: AndroidPermissionStatus[] = await Promise.all(
          permissionsToCheck.map(async (perm) => {
            const granted = await PermissionsAndroid.check(perm.permission);
            return { permission: perm.permission, label: perm.label, granted };
          })
        );
        setAndroidPermissions(updatedStatuses);
      }
      await fetchInitialBluetoothState();
      await checkLocationServices();
    } catch (error) {
      console.error("Error during recheck:", error);
    } finally {
      setIsRechecking(false);
    }
  }, [fetchInitialBluetoothState, checkLocationServices]);

  const renderAndroidPermissions = () => (
    <>
      {androidPermissions.map((perm) => (
        <View key={perm.permission} className="flex-row justify-between items-center mb-2">
          <Text className="text-base">{perm.label}</Text>
          <Text className={`text-sm ${perm.granted ? "text-green-500" : "text-red-500"}`}>
            {perm.granted ? "Granted" : "Denied"}
          </Text>
        </View>
      ))}
    </>
  );

  const renderIOSDescriptions = () => (
    <View className="space-y-2">
      <View className="mb-4">
        <Text className="text-base font-semibold">Bluetooth</Text>
        <Text className="text-sm text-gray-600">
          {bluetoothState === "poweredOn"
            ? "Bluetooth is enabled."
            : bluetoothState === "poweredOff"
            ? "Bluetooth is disabled."
            : bluetoothState === "unauthorized"
            ? "Bluetooth permissions are not authorized."
            : "Bluetooth state is unknown."}
        </Text>
      </View>
      <View>
        <Text className="text-base font-semibold">Location</Text>
        <Text className="text-sm text-gray-600">
          {locationStatus === "enabled"
            ? "Location services are enabled."
            : locationStatus === "disabled"
            ? "Location services are disabled."
            : locationStatus === "unauthorized"
            ? "Location permissions are not authorized."
            : "Location status is unknown."}
        </Text>
      </View>
    </View>
  );

  return (
    <AlertDialog isOpen={visible} onClose={onClose} size="md">
      <AlertDialogBackdrop />
      <AlertDialogContent>
        <AlertDialogHeader>
          <Text className="text-lg font-semibold">Permission Status</Text>
        </AlertDialogHeader>
        <AlertDialogBody className="mt-3 mb-4">
          {Platform.OS === "android" ? renderAndroidPermissions() : renderIOSDescriptions()}
          {isRechecking && (
            <View className="flex-row items-center mt-4">
              <ActivityIndicator size="small" color="#0000ff" />
              <Text className="ml-2 text-sm text-gray-600">Rechecking...</Text>
            </View>
          )}
        </AlertDialogBody>
        <AlertDialogFooter className="flex-row justify-end space-x-2">
          <Button variant="outline" onPress={onClose} className="px-4 py-2">
            <Text>Close</Text>
          </Button>
          <Button onPress={() => Linking.openSettings()} className="px-4 py-2 bg-gray-500">
            <Text className="text-white">Open Settings</Text>
          </Button>
          <Button onPress={handleRecheck} className="px-4 py-2 bg-green-500">
            <Text className="text-white">Recheck</Text>
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default PermissionStatusPopup;