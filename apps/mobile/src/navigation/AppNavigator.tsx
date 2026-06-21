import { ActivityIndicator, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthContext';
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

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function AppStack({ hasBusiness }: { hasBusiness: boolean }) {
  return (
    <Stack.Navigator initialRouteName={hasBusiness ? 'Main' : 'BusinessOnboarding'} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BusinessOnboarding" component={BusinessOnboardingScreen} />
      <Stack.Screen name="Main" component={MainTabs} />
    </Stack.Navigator>
  );
}

export function AppNavigator() {
  const { hasBusiness, isAuthenticated, isInitializing } = useAuth();

  if (isInitializing || (isAuthenticated && hasBusiness === null)) {
    return <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.primary} size="large" /></View>;
  }

  return isAuthenticated ? <AppStack key={hasBusiness ? 'business-ready' : 'needs-business'} hasBusiness={Boolean(hasBusiness)} /> : <AuthStack />;
}
