import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthContext';
import { colors, useTheme } from '../theme/theme';
import { useI18n } from '../i18n/i18n';
import { AnalyticsScreen, BusinessOnboardingScreen, CalendarScreen, CampaignsScreen, DSStudioScreen, HomeScreen, LoginScreen, PlannerScreen, RecommendationsScreen, TemplatesScreen, RegisterScreen, SettingsScreen, TasksScreen, WelcomeScreen, WeeklyPlanScreen, MoreScreen } from '../screens/screens';

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

const tabIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  HomeTab: 'home', TasksTab: 'checkmark-circle', DSStudioTab: 'sparkles', AnalyticsTab: 'bar-chart', MoreTab: 'menu'
};

function HeaderBack({ navigation, title }: any) {
  return <View style={{ height: 58, backgroundColor: colors.background, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10 }}><Pressable onPress={() => navigation.goBack()} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="chevron-back" size={22} color={colors.text} /></Pressable><Text style={{ color: colors.text, fontWeight: '900', fontSize: 18 }}>{title}</Text></View>;
}

function nestedOptions(title: string) { return ({ navigation }: any) => ({ header: () => <HeaderBack navigation={navigation} title={title} /> }); }
function HomeStack() { const { t } = useI18n(); return <Stack.Navigator screenOptions={{ headerShown: false }}><Stack.Screen name="HomeMain" component={HomeScreen} /></Stack.Navigator>; }
function TasksStack() { const { t } = useI18n(); return <Stack.Navigator screenOptions={{ headerShown: false }}><Stack.Screen name="TasksMain" component={TasksScreen} /></Stack.Navigator>; }
function DSStudioStack() { return <Stack.Navigator screenOptions={{ headerShown: false }}><Stack.Screen name="DSStudioMain" component={DSStudioScreen} /></Stack.Navigator>; }
function AnalyticsStack() { const { t } = useI18n(); return <Stack.Navigator><Stack.Screen name="AnalyticsMain" component={AnalyticsScreen} options={{ headerShown: false }} /><Stack.Screen name="Campaigns" component={CampaignsScreen} options={nestedOptions(t('nav.campaigns'))} /></Stack.Navigator>; }
function MoreStack() { const { t } = useI18n(); return <Stack.Navigator><Stack.Screen name="MoreMain" component={MoreScreen} options={{ headerShown: false }} /><Stack.Screen name="Templates" component={TemplatesScreen} options={nestedOptions(t('nav.templates'))} /><Stack.Screen name="Tips" component={RecommendationsScreen} options={nestedOptions(t('nav.tips'))} /><Stack.Screen name="WeeklyPlan" component={WeeklyPlanScreen} options={nestedOptions(t('nav.weeklyPlanner'))} /><Stack.Screen name="Calendar" component={CalendarScreen} options={nestedOptions(t('nav.calendar'))} /><Stack.Screen name="ContentPlanner" component={PlannerScreen} options={nestedOptions(t('nav.contentPlanner'))} /><Stack.Screen name="Settings" component={SettingsScreen} options={nestedOptions(t('nav.settings'))} /></Stack.Navigator>; }

function MainTabs() {
  useTheme();
  const { t } = useI18n();
  const labels: Record<string, string> = { HomeTab: t('nav.home'), TasksTab: t('nav.tasks'), DSStudioTab: t('nav.dsStudio'), AnalyticsTab: t('nav.analytics'), MoreTab: t('nav.more') };
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
      <Tabs.Screen name="HomeTab" component={HomeStack} />
      <Tabs.Screen name="TasksTab" component={TasksStack} />
      <Tabs.Screen name="DSStudioTab" component={DSStudioStack} />
      <Tabs.Screen name="AnalyticsTab" component={AnalyticsStack} />
      <Tabs.Screen name="MoreTab" component={MoreStack} />
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
