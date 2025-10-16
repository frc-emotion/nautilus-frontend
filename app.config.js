const withCustomBeaconModule = require('./withCustomBeaconModule');
const withRemoveiOSNotificationEntitlement = require('./withRemoveiOSNotificationEntitlement');

export default ({ config }) => ({
  ...config,
  extra: {
    APP_UUID: "35a2ba12-25ba-4c79-9d0b-a88fc8d4255f",
    environment: "staging",
    API_URL: "http://api.team2658.org:7001",
    // API_URL: "http://0.0.0.0:7001/",
    // API_URL: "https://api.team2658.org",

    MAX_RETRIES: 3,
    eas: {
      projectId: "9a4e6a54-63ce-46b8-a978-ba046e0f2ae8"
    }
  },
  android: {
    ...config.android,
    usesCleartextTraffic: true, // Allows HTTP traffic on Android
  },
  ios: {
    ...config.ios,
    infoPlist: {
      ...config.ios?.infoPlist,
      NSAppTransportSecurity: {
        NSAllowsArbitraryLoads: true, // Allows HTTP traffic on iOS
        // Or more specifically for your domain:
        // NSExceptionDomains: {
        //   "api.team2658.org": {
        //     NSExceptionAllowsInsecureHTTPLoads: true,
        //     NSExceptionMinimumTLSVersion: "1.0"
        //   }
        // }
      }
    }
  },
  plugins: [
    withCustomBeaconModule,
    [withRemoveiOSNotificationEntitlement],
    ...(config.plugins || [])
  ],
});