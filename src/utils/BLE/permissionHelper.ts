// permissionHelper.ts
import { Platform, PermissionsAndroid, Permission } from "react-native";

export interface AndroidPermission {
  permission: Permission;
  label: string;
}

export const getRequiredPermissions = (): AndroidPermission[] => {
  console.log("Platform.Version", Platform.Version);
  if (Platform.OS !== "android") return [];
  const permissions: AndroidPermission[] = [];

  if (Platform.Version >= 31) {
    // Android 12+ – request the new Bluetooth runtime permissions.
    if (PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN) {
      permissions.push({
        permission: PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        label: "Bluetooth Scan",
      });
    } else {
      console.log(
        "PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN is null/undefined"
      );
    }
    if (PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT) {
      permissions.push({
        permission: PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        label: "Bluetooth Connect",
      });
    } else {
      console.log(
        "PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT is null/undefined"
      );
    }
    if (PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE) {
      permissions.push({
        permission: PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
        label: "Bluetooth Advertise",
      });
    } else {
      console.log(
        "PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE is null/undefined"
      );
    }
    // If your app does NOT derive location from scan results, do not request location here.
  } else {
    // Android 11 and below – use legacy permissions.
    if (PermissionsAndroid.PERMISSIONS.BLUETOOTH) {
      permissions.push({
        permission: PermissionsAndroid.PERMISSIONS.BLUETOOTH,
        label: "Bluetooth",
      });
    } else {
      console.log("PermissionsAndroid.PERMISSIONS.BLUETOOTH is null/undefined");
    }
    if (PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADMIN) {
      permissions.push({
        permission: PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADMIN,
        label: "Bluetooth Admin",
      });
    } else {
      console.log(
        "PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADMIN is null/undefined"
      );
    }

    // Uncomment and add logging if you need background location for API 29+:
    // if (Platform.Version >= 29) {
    //   if (PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION) {
    //     permissions.push({
    //       permission: PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
    //       label: "Access Background Location",
    //     });
    //   } else {
    //     console.log("PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION is null/undefined");
    //   }
    // }
  }

  if (PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION) {
    permissions.push({
      permission: PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      label: "Access Fine Location",
    });
  } else {
    console.log(
      "PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION is null/undefined"
    );
  }

  if (PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION) {
    permissions.push({
      permission: PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      label: "Access Coarse Location",
    });
  } else {
    console.log(
      "PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION is null/undefined"
    );
  }

  if (
    Platform.Version >= 29 &&
    PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION
  ) {
    permissions.push({
      permission: PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
      label: "Access Background Location",
    });
  } else {
    console.log(
      "PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION is null/undefined"
    );
  }

  return permissions;
};
