import "@/global.css";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AuthProvider } from "./src/utils/Context/AuthContext";
import RoleBasedTabs from "./src/navigation/RoleBasedTabs";
import NotLoggedIn from "./src/navigation/NotLoggedInTabs";
import { ModalProvider } from "./src/utils/UI/CustomModalProvider";
import GlobalModal from "./src/components/GlobalModal";
import { ToastProvider } from "./src/utils/UI/CustomToastProvider";
import { ThemeProvider, useThemeContext } from './src/utils/UI/CustomThemeProvider';
import { LightTheme, DarkTheme, AppStackParamList } from './src/Constants';
import { BLEProvider } from './src/utils/BLE/BLEContext';
import { MeetingsProvider } from './src/utils/Context/MeetingContext';
import { UsersProvider } from './src/utils/Context/UsersContext';
import * as Linking from 'expo-linking';
import * as Sentry from '@sentry/react-native';
import { LocationProvider } from './src/utils/BLE/LocationContext';
import { AppStateProvider } from './src/utils/Context/AppStateContext';
import AppInitializer from './src/screens/Auth/AppInitializer';
import { AttendanceProvider } from "./src/utils/Context/AttendanceContext";

const prefix = Linking.createURL('/');

// Sentry.init({
//   _experiments: {
//     replaysSessionSampleRate: 1.0,
//     replaysOnErrorSampleRate: 1.0,
//   },
//   integrations: [
//     Sentry.mobileReplayIntegration({
//       maskAllText: false,
//       maskAllImages: false,
//       maskAllVectors: false,
//     }),
//     Sentry.reactNativeTracingIntegration()
//   ],
//   tracesSampleRate: 1.0,
//   dsn: 'https://7936f94eafb814c3209eb90c93eac658@o4508361827745792.ingest.us.sentry.io/4508361836527616',
//   debug: true, // If `true`, Sentry will try to print out useful debugging information if something goes wrong with sending the event. Set it to `false` in production
// });

const Stack = createNativeStackNavigator<AppStackParamList>();

function AppContent() {
  const { colorMode } = useThemeContext();
  const linking = {
    prefixes: [prefix],
  };

  return (
    <GluestackUIProvider mode={colorMode}>
      <AppStateProvider>
        <ToastProvider>
          <ModalProvider>
            <GlobalModal />
            <NavigationContainer theme={colorMode === 'light' ? LightTheme : DarkTheme} linking={linking}>
              <AuthProvider>
                <UsersProvider>
                  <MeetingsProvider>
                    <AttendanceProvider>
                      <BLEProvider>
                        <LocationProvider>
                          <Stack.Navigator screenOptions={{ headerShown: false }}>
                            <Stack.Screen
                              name="AppInitializer"
                              component={AppInitializer}
                              options={{ gestureEnabled: false }}
                            />
                            <Stack.Screen
                              name="RoleBasedTabs"
                              component={RoleBasedTabs}
                              options={{ gestureEnabled: false }}
                            />
                            <Stack.Screen
                              name="NotLoggedInTabs"
                              component={NotLoggedIn}
                              options={{ gestureEnabled: false }}
                            />
                          </Stack.Navigator>
                        </LocationProvider>
                      </BLEProvider>
                    </AttendanceProvider>
                  </MeetingsProvider>
                </UsersProvider>
              </AuthProvider>
            </NavigationContainer>
          </ModalProvider>
        </ToastProvider>
      </AppStateProvider>
    </GluestackUIProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}


export default Sentry.wrap(App);