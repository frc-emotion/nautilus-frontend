const withCustomBeaconModule = require('./withCustomBeaconModule');

export default ({ config }) => ({
  ...config,
    extra: {
      APP_UUID: "35a2ba12-25ba-4c79-9d0b-a88fc8d4255f",
      environment: "development",
      API_URL: "http://staging.team2658.org:7001",
      MAX_RETRIES: 3,
      eas: {
        projectId: "9a4e6a54-63ce-46b8-a978-ba046e0f2ae8"
      }
    },
    plugins: [
      ...(config.plugins || []),
      withCustomBeaconModule,
    ],
  });