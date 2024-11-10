export default ({ config }) => ({
    ...config,
    extra: {
      APP_UUID: "35a2ba12-25ba-4c79-9d0b-a88fc8d4255f",
      environment: "production",
      API_URL: "https://api.example.com",
      MAX_RETRIES: 3
    },
  });