const withRemoveiOSNotificationEntitlement = require('./withRemoveiOSNotificationEntitlement');
const withCustomBeaconModule = require('./withCustomBeaconModule');

export default ({ config }) => ({
  ...config,
    extra: {
      APP_UUID: "35a2ba12-25ba-4c79-9d0b-a88fc8d4255f",
      environment: "prod",
      API_URL: "https://api.team2658.org",
      // API_URL: "http://0.0.0.0:7001/",
      // API_URL: "https://api.team2658.org",

      MAX_RETRIES: 3,
      eas: {
        projectId: "f1196ac6-e7c1-42a6-a6d8-051b096d2963"
      }
    },
    plugins: [
      withCustomBeaconModule,
      [withRemoveiOSNotificationEntitlement],
      ...(config.plugins || [])
      
    ],
  });