export default ({ config }) => ({
    ...config,
    extra: {
      APP_UUID: "35a2ba12-25ba-4c79-9d0b-a88fc8d4255f",
      environment: "production",
      API_URL: "http://192.168.12.219:7001",
      MAX_RETRIES: 3
    },
  });