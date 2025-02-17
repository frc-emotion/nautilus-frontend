const withCustomBeaconModule = require('./withCustomBeaconModule');
const withRemoveiOSNotificationEntitlement = require('./withRemoveiOSNotificationEntitlement');

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
        projectId: "9a4e6a54-63ce-46b8-a978-ba046e0f2ae8"
      }
    },
    plugins: [
      withCustomBeaconModule,
      [withRemoveiOSNotificationEntitlement],
      ...(config.plugins || [])
      
    ],
  });