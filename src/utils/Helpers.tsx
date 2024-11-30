import { View } from "@/components/ui/view";
import { Lock, AlertCircle, Bluetooth, BluetoothOff, RefreshCw, MapPinOff, MapPin } from 'lucide-react-native';
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { ErrorHandlerOptions, FailedRequest } from "@/src/Constants";

export const formatPhoneNumber = (input: string): string => {
  // Remove all non-digit characters
  const digits = input.replace(/\D/g, "");

  // Format the phone number based on the length of the digits
  if (digits.length <= 3) {
    return `(${digits}`;
  } else if (digits.length <= 6) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  } else {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }
};

export const cleanPhoneNumber = (input: string): string => {
  return input.replace(/\D/g, "");
}

export const handleErrorWithModalOrToast = ({
  actionName,
  error,
  showModal = true,
  showToast = true,
  openModal,
  openToast,
}: ErrorHandlerOptions) => {
  console.log("running")
  const statusCode = error.response?.status;

  if (!statusCode) {
    const message = `${error.message}\nCode: ${error.code}`;

    // Fallback for unexpected errors
    if (showModal) {
      openModal({
        title: `Unexpected Error: ${error.name}`,
        message,
        type: "error",
      });
    }

    if (showToast) {
      openToast({
        title: `Unexpected Error: ${error.name}`,
        description: message,
        type: "error",
      });
    }

    return;
  }

  console.log(error)

  const errorData = error.response?.data as FailedRequest;

  console.log(errorData)

  const errorMessage = errorData?.error || "An error occurred.";

  if (showModal) {
    openModal({
      title: `${actionName} failed: ${statusCode}`,
      message: errorMessage,
      type: "error",
    });
  }

  if (showToast) {
    openToast({
      title: `${actionName} failed: ${statusCode}`,
      description: errorMessage,
      type: "error",
    });
  }
};

export const BluetoothStatusIndicator = ({ state }: { state: string }) => {
  let IconComponent = Bluetooth;
  let color = 'gray';
  let statusText = 'Unknown';

  switch (state) {
    case 'poweredOn':
      IconComponent = Bluetooth;
      color = 'green';
      statusText = 'Powered On';
      break;
    case 'poweredOff':
      IconComponent = BluetoothOff;
      color = 'red';
      statusText = 'Powered Off';
      break;
    case 'unsupported':
      IconComponent = AlertCircle;
      color = 'orange';
      statusText = 'Unsupported';
      break;
    case 'unauthorized':
      IconComponent = Lock;
      color = 'purple';
      statusText = 'Unauthorized';
      break;
    case 'resetting':
      IconComponent = RefreshCw;
      color = 'yellow';
      statusText = 'Resetting';
      break;
    default:
      IconComponent = Bluetooth;
      color = 'gray';
      statusText = 'Unknown';
      break;
  }

  return (
    <View className="flex-row items-center" >
      <Icon as={IconComponent} size="xl" color={color} />
      <Text className={`ml-2`} size="md" >
        Bluetooth: {statusText}
      </Text>
    </View>
  );
};


export const LocationStatusIndicator = ({ state }: { state: string }) => {
  let IconComponent = MapPin;
  let color = 'gray';
  let statusText = 'Unknown';

  switch (state) {
    case 'enabled':
      IconComponent = MapPin;
      color = 'green';
      statusText = 'Enabled';
      break;
    case 'disabled':
      IconComponent = MapPinOff;
      color = 'red';
      statusText = 'Disabled';
      break;
    case 'unauthorized':
      IconComponent = Lock;
      color = 'purple';
      statusText = 'Unauthorized';
      break;
    default:
      IconComponent = AlertCircle;
      color = 'gray';
      statusText = 'Unknown';
      break;
  }
  return (
    <View className="flex-row items-center" >
      <Icon as={IconComponent} size="xl" color={color} />
      <Text className={`ml-2`} size="md" >
        Location Services: {statusText}
      </Text>
    </View>
  );
}

/**
* Compares two semantic version strings.
* Returns:
* -1 if v1 < v2
*  0 if v1 == v2
*  1 if v1 > v2
*/
export const compareVersions = (v1: string, v2: string): number => {
 const v1Parts = v1.split('.').map(Number);
 const v2Parts = v2.split('.').map(Number);

 const maxLength = Math.max(v1Parts.length, v2Parts.length);

 for (let i = 0; i < maxLength; i++) {
   const a = v1Parts[i] || 0;
   const b = v2Parts[i] || 0;

   if (a > b) return 1;
   if (a < b) return -1;
 }

 return 0;
};