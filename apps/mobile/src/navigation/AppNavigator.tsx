import { ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthContext';
import { colors, useTheme } from '../theme/theme';
import { useI18n } from '../i18n/i18n';
import { AnalyticsScreen, BusinessOnboardingScreen, CalendarScreen, CampaignsScreen, HomeScreen, LoginScreen, PlannerScreen, RecommendationsScreen, TemplatesScreen, RegisterScreen, SettingsScreen, TasksScreen, WelcomeScreen } from '../screens/screens';

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

const tabIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: 'home',
  Tasks: 'checkmark-circle',
  Planner: 'clipboard',
  Templates: 'library',
  Calendar: 'calendar',
  Analytics: 'bar-chart',
  Campaigns: 'megaphone',
  Tips: 'bulb',
  Settings: 'settings'
};

function MainTabs() {
  useTheme();
  const { t } = useI18n();
  const labels: Record<string, string> = { Home: t('nav.dashboard'), Tasks: t('nav.tasks'), Planner: t('nav.planner'), Templates: t('nav.templates'), Calendar: t('nav.calendar'), Analytics: t('nav.analytics'), Campaigns: t('nav.campaigns'), Tips: t('nav.recommendations'), Settings: t('nav.settings') };
  return (
    <Tabs.Navigator screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.inactiveIcon,
      tabBarLabelStyle: { fontSize: 11, fontWeight: '800', marginTop: 2 },
      tabBarItemStyle: { paddingVertical: 6, borderRadius: 16, marginHorizontal: 1 },
      tabBarStyle: { height: 78, paddingBottom: 12, paddingTop: 8, paddingHorizontal: 8, borderTopWidth: 0, backgroundColor: colors.tabBackground, shadowColor: '#0f172a', shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: -8 }, elevation: 12 },
      tabBarLabel: labels[route.name],
      tabBarIcon: ({ color, focused, size }) => <View style={{ width: 34, height: 30, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: focused ? colors.primarySoft : 'transparent' }}><Ionicons name={tabIcons[route.name]} size={focused ? size + 1 : size} color={color} /></View>
    })}>
      <Tabs.Screen name="Home" component={HomeScreen} />
      <Tabs.Screen name="Tasks" component={TasksScreen} />
      <Tabs.Screen name="Planner" component={PlannerScreen} />
      <Tabs.Screen name="Templates" component={TemplatesScreen} />
      <Tabs.Screen name="Calendar" component={CalendarScreen} />
      <Tabs.Screen name="Analytics" component={AnalyticsScreen} />
      <Tabs.Screen name="Campaigns" component={CampaignsScreen} />
      <Tabs.Screen name="Tips" component={RecommendationsScreen} />
      <Tabs.Screen name="Settings" component={SettingsScreen} />
    </Tabs.Navigator>
  );
}

function AuthStack() { return <Stack.Navigator screenOptions={{ headerShown: false }}><Stack.Screen name="Welcome" component={WelcomeScreen} /><Stack.Screen name="Login" component={LoginScreen} /><Stack.Screen name="Register" component={RegisterScreen} /></Stack.Navigator>; }
function AppStack({ hasBusiness }: { hasBusiness: boolean }) { return <Stack.Navigator initialRouteName={hasBusiness ? 'Main' : 'BusinessOnboarding'} screenOptions={{ headerShown: false }}><Stack.Screen name="BusinessOnboarding" component={BusinessOnboardingScreen} /><Stack.Screen name="Main" component={MainTabs} /></Stack.Navigator>; }

export function AppNavigator() {
  useTheme();
  const { hasBusiness, isAuthenticated, isInitializing } = useAuth();
  if (isInitializing || (isAuthenticated && hasBusiness === null)) return <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.primary} size="large" /></View>;
  return isAuthenticated ? <AppStack key={hasBusiness ? 'business-ready' : 'needs-business'} hasBusiness={Boolean(hasBusiness)} /> : <AuthStack />;
}
