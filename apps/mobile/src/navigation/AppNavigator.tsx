import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme/theme';
import { BusinessOnboardingScreen, CalendarScreen, CampaignsScreen, HomeScreen, LoginScreen, PlannerScreen, RecommendationsScreen, RegisterScreen, SettingsScreen, TasksScreen, WelcomeScreen } from '../screens/screens';

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tabs.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary, tabBarStyle: { height: 72, paddingBottom: 12, paddingTop: 8 } }}>
      <Tabs.Screen name="Home" component={HomeScreen} />
      <Tabs.Screen name="Tasks" component={TasksScreen} />
      <Tabs.Screen name="Planner" component={PlannerScreen} />
      <Tabs.Screen name="Calendar" component={CalendarScreen} />
      <Tabs.Screen name="Campaigns" component={CampaignsScreen} />
      <Tabs.Screen name="Tips" component={RecommendationsScreen} />
      <Tabs.Screen name="Settings" component={SettingsScreen} />
    </Tabs.Navigator>
  );
}

export function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="BusinessOnboarding" component={BusinessOnboardingScreen} />
      <Stack.Screen name="Main" component={MainTabs} />
    </Stack.Navigator>
  );
}
