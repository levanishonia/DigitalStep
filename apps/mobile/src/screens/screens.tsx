import { ReactNode, useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../auth/AuthContext';
import { Screen, Button, Field, Row, ErrorMessage, Card } from '../components/UI';
import { colors } from '../theme/theme';
import { BusinessInput, DashboardResponse, MarketingChannel, getDashboard } from '../services/api';

const channels: { label: string; value: MarketingChannel }[] = [
  { label: 'Instagram', value: 'instagram' },
  { label: 'Facebook', value: 'facebook' },
  { label: 'Email', value: 'email' },
  { label: 'Website', value: 'website' },
  { label: 'In store', value: 'in_store' }
];

function cleanApiError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Something went wrong. Please try again.';
  if (message.includes('Expected') || message.includes('String must')) return 'Please check your details and try again.';
  return message;
}

function labelChannel(channel: string) {
  return channels.find((item) => item.value === channel)?.label ?? channel;
}

function formatDate(value?: string | null) {
  if (!value) return 'No date set';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(value));
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <Card><Text style={{ color: colors.text, fontWeight: '700' }}>{title}</Text><Text style={{ color: colors.muted, marginTop: 6, lineHeight: 20 }}>{detail}</Text></Card>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <View style={{ gap: 10 }}><Text style={{ color: colors.text, fontWeight: '800', fontSize: 19 }}>{title}</Text>{children}</View>;
}

function useDashboard() {
  const { token, refreshBusinessStatus } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setError('');
    setLoading(true);
    try {
      const nextDashboard = await getDashboard(token);
      setDashboard(nextDashboard);
      if (!nextDashboard.business) await refreshBusinessStatus();
    } catch (err) {
      setError(cleanApiError(err));
    } finally {
      setLoading(false);
    }
  }, [refreshBusinessStatus, token]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  return { dashboard, loading, error, reload: load };
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
    try { await login({ email: email.trim(), password }); } catch (err) { setError(cleanApiError(err)); } finally { setLoading(false); }
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
    try { await register({ name: name.trim(), email: email.trim(), password }); } catch (err) { setError(cleanApiError(err)); } finally { setLoading(false); }
  }

  return <Screen title="Create account" subtitle="Start organizing your business marketing in minutes."><Field placeholder="Name" autoCapitalize="words" value={name} onChangeText={setName} /><Field placeholder="Email" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" value={email} onChangeText={setEmail} /><Field placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} /><ErrorMessage message={error} /><Button label="Create account" loading={loading} onPress={submit} /></Screen>;
}

export function BusinessOnboardingScreen({ navigation }: any) {
  const { completeBusinessOnboarding } = useAuth();
  const [form, setForm] = useState<BusinessInput>({ name: '', industry: '', audience: '', location: '', primaryGoal: '', channels: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const canSubmit = form.name.trim() && form.industry.trim() && form.audience.trim() && form.primaryGoal.trim() && form.channels.length > 0;
  const update = (key: keyof BusinessInput, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const toggleChannel = (channel: MarketingChannel) => setForm((current) => ({ ...current, channels: current.channels.includes(channel) ? current.channels.filter((item) => item !== channel) : [...current.channels, channel] }));

  async function submit() {
    setError('');
    if (!canSubmit) return setError('Add your business details and at least one marketing channel.');
    setLoading(true);
    try {
      await completeBusinessOnboarding({ ...form, name: form.name.trim(), industry: form.industry.trim(), audience: form.audience.trim(), location: form.location?.trim(), primaryGoal: form.primaryGoal.trim() });
      navigation.replace('Main');
    } catch (err) {
      setError(cleanApiError(err));
    } finally {
      setLoading(false);
    }
  }

  return <Screen title="Tell us about your business" subtitle="Set up your profile once, then jump into a dashboard built around your marketing work."><Field placeholder="Business name" value={form.name} onChangeText={(value) => update('name', value)} /><Field placeholder="Industry" value={form.industry} onChangeText={(value) => update('industry', value)} /><Field placeholder="Target audience" value={form.audience} onChangeText={(value) => update('audience', value)} /><Field placeholder="Location (optional)" value={form.location} onChangeText={(value) => update('location', value)} /><Field placeholder="Primary marketing goal" value={form.primaryGoal} onChangeText={(value) => update('primaryGoal', value)} /><Text style={{ color: colors.text, fontWeight: '700' }}>Marketing channels</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{channels.map((channel) => { const selected = form.channels.includes(channel.value); return <Pressable key={channel.value} onPress={() => toggleChannel(channel.value)} style={{ borderRadius: 999, borderWidth: 1, borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : colors.card, paddingHorizontal: 13, paddingVertical: 10 }}><Text style={{ color: selected ? '#fff' : colors.text, fontWeight: '700' }}>{channel.label}</Text></Pressable>; })}</View><ErrorMessage message={error} /><Button label="Finish setup" loading={loading} disabled={!canSubmit} onPress={submit} /></Screen>;
}

export function HomeScreen() {
  const { dashboard, loading, error, reload } = useDashboard();
  if (loading) return <Screen title="Dashboard" subtitle="Loading your marketing workspace."><ActivityIndicator color={colors.primary} /></Screen>;
  const business = dashboard?.business;
  return <Screen title={business?.name ?? 'Dashboard'} subtitle="Your marketing at a glance."><ErrorMessage message={error} />{error ? <Button secondary label="Try again" onPress={reload} /> : null}<Section title="Today’s marketing tasks">{dashboard?.tasks.length ? dashboard.tasks.map((task) => <Row key={task.id} title={task.title} detail={`${task.status.replace('_', ' ')} · ${formatDate(task.dueDate)}${task.description ? ` · ${task.description}` : ''}`} />) : <EmptyState title="No tasks due today" detail="Add tasks later to keep daily marketing steps visible here." />}</Section><Section title="Upcoming content items">{dashboard?.contentItems.length ? dashboard.contentItems.map((item) => <Row key={item.id} title={item.title} detail={`${labelChannel(item.channel)} · ${item.status} · ${formatDate(item.scheduledFor)}`} />) : <EmptyState title="No upcoming content" detail="Planned posts, emails, and website updates will show up here." />}</Section><Section title="Active campaigns">{dashboard?.campaigns.length ? dashboard.campaigns.map((campaign) => <Row key={campaign.id} title={campaign.name} detail={`${campaign.status} · ${campaign.objective}`} />) : <EmptyState title="No active campaigns" detail="Create campaigns later when you are ready to track focused marketing pushes." />}</Section><Section title="Recommendations">{dashboard?.recommendations.length ? dashboard.recommendations.map((recommendation) => <Row key={recommendation.id} title={recommendation.title} detail={recommendation.description} />) : <EmptyState title="No recommendations yet" detail="DigitalStep will surface practical, non-AI suggestions as your plan fills in." />}</Section></Screen>;
}

export function TasksScreen() { return <Screen title="Today’s tasks" subtitle="Small steps that keep marketing moving."><EmptyState title="No tasks yet" detail="Today’s tasks from your business dashboard will appear here." /></Screen>; }
export function PlannerScreen() { return <Screen title="Content planner" subtitle="Capture ideas, drafts, and scheduled content."><EmptyState title="No content planned" detail="Upcoming content items will appear here once created." /></Screen>; }
export function CalendarScreen() { return <Screen title="Calendar" subtitle="A mobile-first view of upcoming marketing moments."><EmptyState title="Nothing scheduled" detail="Scheduled content and campaign dates will appear here." /></Screen>; }
export function CampaignsScreen() { return <Screen title="Campaigns" subtitle="Track focused marketing pushes without extra complexity."><EmptyState title="No campaigns yet" detail="Active campaigns will appear here after you create them." /></Screen>; }
export function RecommendationsScreen() { return <Screen title="Recommendations" subtitle="Practical, non-AI suggestions based on your plan and schedule."><EmptyState title="No recommendations yet" detail="Recommendations will appear as your marketing workspace grows." /></Screen>; }
export function SettingsScreen() { const { logout } = useAuth(); const { dashboard } = useDashboard(); const business = dashboard?.business; return <Screen title="Settings" subtitle="Manage account, business profile, and workspace preferences.">{business ? <><Row title="Business profile" detail={business.name} /><Row title="Channels" detail={business.channels.map(labelChannel).join(', ')} /></> : <EmptyState title="No business profile" detail="Complete onboarding to add your business details." />}<Button secondary label="Log out" onPress={logout} /></Screen>; }
