import { useState } from 'react';
import { Text } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { Screen, Button, Field, Row, ErrorMessage, Card } from '../components/UI';
import { colors } from '../theme/theme';

function cleanApiError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Something went wrong. Please try again.';
  if (message.includes('Expected') || message.includes('String must')) return 'Please check your details and try again.';
  return message;
}

export function WelcomeScreen({ navigation }: any) {
  return <Screen centered title="DigitalStep" subtitle="A simple marketing manager for small businesses. Plan your next move, keep campaigns organized, and stay consistent."><Card><Text style={{ color: colors.text, fontWeight: '700', fontSize: 18 }}>Marketing clarity starts here.</Text><Text style={{ color: colors.muted, marginTop: 8, lineHeight: 20 }}>Create your account, set up your business, and start with a practical dashboard built for action.</Text></Card><Button label="Create account" onPress={() => navigation.navigate('Register')} /><Button secondary label="Log in" onPress={() => navigation.navigate('Login')} /></Screen>;
}

export function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setError('');
    if (!email.trim() || !password) return setError('Enter your email and password.');
    setLoading(true);
    try {
      await login({ email: email.trim(), password });
    } catch (err) {
      setError(cleanApiError(err));
    } finally {
      setLoading(false);
    }
  }

  return <Screen title="Welcome back" subtitle="Log in to continue to your business setup and marketing dashboard."><Field placeholder="Email" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" value={email} onChangeText={setEmail} /><Field placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} /><ErrorMessage message={error} /><Button label="Log in" loading={loading} onPress={submit} /></Screen>;
}

export function RegisterScreen() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setError('');
    if (!name.trim() || !email.trim() || !password) return setError('Fill out your name, email, and password.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    setLoading(true);
    try {
      await register({ name: name.trim(), email: email.trim(), password });
    } catch (err) {
      setError(cleanApiError(err));
    } finally {
      setLoading(false);
    }
  }

  return <Screen title="Create account" subtitle="Start organizing your business marketing in minutes."><Field placeholder="Name" autoCapitalize="words" value={name} onChangeText={setName} /><Field placeholder="Email" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" value={email} onChangeText={setEmail} /><Field placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} /><ErrorMessage message={error} /><Button label="Create account" loading={loading} onPress={submit} /></Screen>;
}

export function BusinessOnboardingScreen({ navigation }: any) { return <Screen title="Tell us about your business" subtitle="DigitalStep uses this to shape your dashboard and default marketing plan."><Field placeholder="Business name" /><Field placeholder="Industry" /><Field placeholder="Primary marketing goal" /><Field placeholder="Main channels" /><Button label="Finish setup" onPress={() => navigation.replace('Main')} /></Screen>; }
export function HomeScreen() { return <Screen title="Dashboard" subtitle="Your marketing at a glance."><Row title="Today’s focus" detail="Post the weekly special and review the Friday email draft." /><Row title="Active campaign" detail="Weekday Breakfast Push is active through the next two weeks." /><Row title="Next planned content" detail="Behind the scenes reel scheduled for Instagram." /></Screen>; }
export function TasksScreen() { return <Screen title="Today’s tasks" subtitle="Small steps that keep marketing moving."><Row title="Post weekly pastry special" detail="Due today · Instagram" /><Row title="Draft Friday email" detail="Due tomorrow · In progress" /><Row title="Review campaign photos" detail="This week · To do" /></Screen>; }
export function PlannerScreen() { return <Screen title="Content planner" subtitle="Capture ideas, drafts, and scheduled content."><Row title="Behind the scenes: sourdough prep" detail="Scheduled · Instagram reel" /><Row title="June loyalty offer" detail="Draft · Email" /><Row title="Customer spotlight" detail="Idea · Facebook" /></Screen>; }
export function CalendarScreen() { return <Screen title="Calendar" subtitle="A mobile-first view of upcoming marketing moments."><Row title="Today" detail="Post weekly pastry special" /><Row title="Tomorrow" detail="Finish Friday email" /><Row title="Next week" detail="Plan July local partnership campaign" /></Screen>; }
export function CampaignsScreen() { return <Screen title="Campaigns" subtitle="Track focused marketing pushes without extra complexity."><Row title="Weekday Breakfast Push" detail="Active · Drive 15% more weekday morning orders" /><Row title="Summer Catering Leads" detail="Planned · Collect event inquiries" /></Screen>; }
export function RecommendationsScreen() { return <Screen title="Recommendations" subtitle="Practical, non-AI suggestions based on your plan and schedule."><Row title="Promote best-selling item earlier" detail="Schedule coffee-and-pastry content before 8 AM." /><Row title="Add a recurring planning block" detail="Reserve 30 minutes every Monday for content planning." /></Screen>; }
export function SettingsScreen() { const { logout } = useAuth(); return <Screen title="Settings" subtitle="Manage account, business profile, and workspace preferences."><Row title="Business profile" detail="Bloom & Bean Cafe" /><Row title="Channels" detail="Instagram, Facebook, Email" /><Button secondary label="Log out" onPress={logout} /></Screen>; }
