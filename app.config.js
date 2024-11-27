const withCustomBeaconModule = require('./withCustomBeaconModule');
const withRemoveiOSNotificationEntitlement = require('./withRemoveiOSNotificationEntitlement');

export default ({ config }) => ({
  ...config,
    extra: {
      APP_UUID: "35a2ba12-25ba-4c79-9d0b-a88fc8d4255f",
      environment: "production",
      API_URL: "http://192.168.0.239:7001",
      MAX_RETRIES: 3
    },
    plugins: [
      ...(config.plugins || []),
      withCustomBeaconModule,
      [withRemoveiOSNotificationEntitlement]
    ],
  });