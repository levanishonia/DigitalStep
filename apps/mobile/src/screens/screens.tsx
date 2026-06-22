import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../auth/AuthContext';
import { Screen, Button, Field, Row, ErrorMessage, Card, Badge, IconCircle, Skeleton } from '../components/UI';
import { colors, useTheme } from '../theme/theme';
import { disableDailyReminder, enableDailyReminder, loadReminderState, NotificationStatus, ReminderState, updateDailyReminderTime } from '../services/reminders';
import { BusinessInput, ContentItem, ContentItemInput, ContentStatus, ContentType, DashboardResponse, MarketingChannel, Task, TaskInput, TaskPriority, TaskStatus, WeeklyPlanResponse, acceptWeeklyPlan, createContentItem, createTask, deleteContentItem, deleteTask, getCalendar, getCampaigns, getContentItems, getDashboard, getTasks, getWeeklyPlan, updateContentItem, updateTask } from '../services/api';

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

function dateKeyFromValue(value?: string | null) {
  if (!value) return '';
  const dateOnlyMatch = value.match(/^\d{4}-\d{2}-\d{2}/);
  return dateOnlyMatch ? dateOnlyMatch[0] : dateKey(new Date(value));
}

function formatDate(value?: string | null) {
  const key = dateKeyFromValue(value);
  if (!key) return 'No date set';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(`${key}T12:00:00`));
}

function toDateInput(value?: string | null) {
  return dateKeyFromValue(value);
}

function labelText(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function localNoonTimestamp(value?: string) {
  const key = value?.trim();
  return key ? `${key}T12:00:00` : undefined;
}



type IconName = keyof typeof Ionicons.glyphMap;

const priorityTone: Record<TaskPriority, 'success' | 'warning' | 'danger'> = { low: 'success', medium: 'warning', high: 'danger' };
const statusTone: Record<string, 'neutral' | 'success' | 'warning' | 'info' | 'purple'> = { todo: 'neutral', in_progress: 'info', done: 'success', draft: 'neutral', planned: 'purple', published: 'success', active: 'success', paused: 'warning', completed: 'neutral' };
const channelIcon: Record<MarketingChannel, IconName> = { instagram: 'logo-instagram', facebook: 'logo-facebook', email: 'mail', website: 'globe', in_store: 'storefront' };

function EmptyState({ title, detail, icon = 'sparkles' }: { title: string; detail: string; icon?: IconName }) {
  return <Card><View style={{ alignItems: 'center', paddingVertical: 8 }}><IconCircle name={icon} size={22} background={colors.surface} /><Text style={{ color: colors.text, fontWeight: '900', marginTop: 12, textAlign: 'center' }}>{title}</Text><Text style={{ color: colors.muted, marginTop: 6, lineHeight: 20, textAlign: 'center' }}>{detail}</Text></View></Card>;
}

function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return <View style={{ gap: 10 }}><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}><Text style={{ color: colors.text, fontWeight: '900', fontSize: 19, letterSpacing: -0.2 }}>{title}</Text>{action}</View>{children}</View>;
}

function SummaryCard({ label, value, icon, tone }: { label: string; value: number | string; icon: IconName; tone: 'primary' | 'accent' | 'info' }) {
  const palette = tone === 'accent' ? [colors.accent, colors.accentSoft] : tone === 'info' ? [colors.info, colors.infoSoft] : [colors.primary, colors.primarySoft];
  return <Card><IconCircle name={icon} color={palette[0]} background={palette[1]} /><Text style={{ color: colors.text, fontWeight: '900', fontSize: 26, marginTop: 10 }}>{value}</Text><Text style={{ color: colors.muted, fontWeight: '700', marginTop: 2 }}>{label}</Text></Card>;
}

function DatePickerField({ value, onChange, placeholder = 'Select date' }: { value?: string; onChange: (value: string) => void; placeholder?: string }) {
  const [open, setOpen] = useState(false);
  const base = value ? new Date(`${value}T12:00:00`) : new Date();
  const start = startOfWeekDate(base);
  const dates = Array.from({ length: 21 }, (_, index) => dateKey(addDaysToDate(start, index - 7)));
  if (Platform.OS === 'web') return <Field placeholder={placeholder} value={value} onChangeText={onChange} inputMode="numeric" />;
  return <><Pressable onPress={() => setOpen(true)} style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: value ? colors.text : colors.muted, fontSize: 16 }}>{value ? displayLongDate(value) : placeholder}</Text><Ionicons name="calendar" size={20} color={colors.primary} /></Pressable><Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}><Pressable onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(15,32,29,0.32)', justifyContent: 'flex-end' }}><Pressable style={{ backgroundColor: colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, gap: 12 }}><Text style={{ color: colors.text, fontSize: 20, fontWeight: '900' }}>Choose a date</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{dates.map((key) => { const selected = key === value; const date = new Date(`${key}T12:00:00`); return <Pressable key={key} onPress={() => { onChange(key); setOpen(false); }} style={{ width: '30.5%', borderRadius: 16, borderWidth: 1, borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : colors.surface, padding: 12, alignItems: 'center' }}><Text style={{ color: selected ? '#fff' : colors.muted, fontWeight: '700', fontSize: 12 }}>{dayNames[(date.getDay() + 6) % 7]}</Text><Text style={{ color: selected ? '#fff' : colors.text, fontWeight: '900', marginTop: 2 }}>{formatDate(key)}</Text></Pressable>; })}</View><Button secondary label="Clear date" icon="close-circle" onPress={() => { onChange(''); setOpen(false); }} /></Pressable></Pressable></Modal></>;
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

export function HomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const { dashboard, loading, error, reload } = useDashboard();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  if (loading) return <Screen title="Dashboard" subtitle="Loading your marketing workspace."><Skeleton /><Skeleton /><Skeleton /></Screen>;
  const business = dashboard?.business;
  return <Screen title={`${greeting}, ${user?.name?.split(' ')[0] ?? business?.name ?? 'there'} 👋`} subtitle={business ? `${business.name} marketing command center.` : 'Your marketing at a glance.'} refreshing={loading} onRefresh={reload}><ErrorMessage message={error} />{error ? <Button secondary label="Try again" icon="refresh" onPress={reload} /> : null}<View style={{ flexDirection: 'row', gap: 8 }}><View style={{ flex: 1 }}><SummaryCard label="Due today" value={dashboard?.tasks.length ?? 0} icon="today" tone="primary" /></View><View style={{ flex: 1 }}><SummaryCard label="Upcoming" value={dashboard?.contentItems.length ?? 0} icon="paper-plane" tone="info" /></View><View style={{ flex: 1 }}><SummaryCard label="Campaigns" value={dashboard?.campaigns.length ?? 0} icon="megaphone" tone="accent" /></View></View><Section title="Quick actions"><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}><View style={{ flexBasis: '48%', flexGrow: 1 }}><Button label="Create Task" icon="add-circle" onPress={() => navigation.navigate('Tasks')} /></View><View style={{ flexBasis: '48%', flexGrow: 1 }}><Button secondary label="Create Content" icon="create" onPress={() => navigation.navigate('Planner')} /></View><View style={{ flexBasis: '48%', flexGrow: 1 }}><Button secondary label="Browse Templates" icon="library" onPress={() => navigation.navigate('Templates')} /></View><View style={{ flexBasis: '48%', flexGrow: 1 }}><Button secondary label="Create Campaign" icon="megaphone" onPress={() => navigation.navigate('Campaigns')} /></View><View style={{ flexBasis: '48%', flexGrow: 1 }}><Button secondary label="Open Calendar" icon="calendar" onPress={() => navigation.navigate('Calendar')} /></View></View></Section><Section title="Today’s marketing tasks">{dashboard?.tasks.length ? dashboard.tasks.map((task) => <Row key={task.id} icon="checkmark-circle" title={task.title} detail={`${labelText(task.status)} · ${formatDate(task.dueDate)}${task.description ? ` · ${task.description}` : ''}`} right={<Badge label={labelText(task.priority)} tone={priorityTone[task.priority]} />} />) : <EmptyState icon="checkmark-done" title="No tasks due today" detail="Enjoy the breathing room or create a quick action for tomorrow." />}</Section><Section title="Upcoming content">{dashboard?.contentItems.length ? dashboard.contentItems.map((item) => <Row key={item.id} icon={channelIcon[item.channel]} title={item.title} detail={`${labelText(item.type)} · ${labelChannel(item.channel)} · ${formatDate(item.publishDate ?? item.scheduledFor)}`} right={<Badge label={labelText(item.status)} tone={statusTone[item.status]} />} />) : <EmptyState icon="images" title="No upcoming content" detail="Planned posts, emails, and website updates will show up here." />}</Section><Section title="Active campaigns">{dashboard?.campaigns.length ? dashboard.campaigns.map((campaign) => <Row key={campaign.id} icon="megaphone" title={campaign.name} detail={campaign.objective} right={<Badge label={labelText(campaign.status)} tone={statusTone[campaign.status]} />} />) : <EmptyState icon="flag" title="No active campaigns" detail="Create campaigns when you are ready to track focused marketing pushes." />}</Section><Section title="Recommendations">{dashboard?.recommendations.length ? dashboard.recommendations.map((recommendation) => <Row key={recommendation.id} icon="bulb" title={recommendation.title} detail={recommendation.description} right={<Badge label={`P${recommendation.priority}`} tone="warning" />} />) : <EmptyState icon="bulb" title="No recommendations yet" detail="DigitalStep will surface practical suggestions as your plan fills in." />}</Section></Screen>;
}

function Chip<T extends string>({ label, value, selected, onPress }: { label: string; value: T; selected: boolean; onPress: (value: T) => void }) {
  return <Pressable onPress={() => onPress(value)} style={{ borderRadius: 999, borderWidth: 1, borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : colors.card, paddingHorizontal: 12, paddingVertical: 9 }}><Text style={{ color: selected ? '#fff' : colors.text, fontWeight: '700' }}>{label}</Text></Pressable>;
}

function ChoiceRow<T extends string>({ options, selected, onSelect }: { options: readonly T[]; selected: T; onSelect: (value: T) => void }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{options.map((option) => <Chip key={option} label={labelText(option)} value={option} selected={selected === option} onPress={onSelect} />)}</View>;
}

const taskStatuses: TaskStatus[] = ['todo', 'in_progress', 'done'];
const taskPriorities: TaskPriority[] = ['low', 'medium', 'high'];
const contentStatuses: ContentStatus[] = ['draft', 'planned', 'published'];
const contentTypes: ContentType[] = ['post', 'story', 'reel', 'campaign', 'offer'];

export function TasksScreen() {
  const { token } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<TaskStatus | 'all'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TaskInput>({ title: '', description: '', dueDate: '', status: 'todo', priority: 'medium' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => { if (!token) return; setLoading(true); setError(''); try { setTasks((await getTasks(token, { status: filter })).tasks); } catch (err) { setError(cleanApiError(err)); } finally { setLoading(false); } }, [filter, token]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  function edit(task: Task) { setEditingId(task.id); setForm({ title: task.title, description: task.description ?? '', dueDate: toDateInput(task.dueDate), status: task.status, priority: task.priority }); }
  function reset() { setEditingId(null); setForm({ title: '', description: '', dueDate: '', status: 'todo', priority: 'medium' }); }
  async function submit() { if (!token) return; if (!form.title.trim()) return setError('Add a task title.'); setSaving(true); setError(''); try { const payload = { ...form, title: form.title.trim(), description: form.description?.trim(), dueDate: localNoonTimestamp(form.dueDate) }; editingId ? await updateTask(editingId, payload, token) : await createTask(payload, token); reset(); await load(); } catch (err) { setError(cleanApiError(err)); } finally { setSaving(false); } }
  async function remove(id: string) { if (!token) return; setError(''); try { await deleteTask(id, token); await load(); } catch (err) { setError(cleanApiError(err)); } }
  return <Screen title="Marketing tasks" subtitle="Create and prioritize small steps that keep marketing moving."><ErrorMessage message={error} /><Section title={editingId ? 'Edit task' : 'New task'}><Field placeholder="Title" value={form.title} onChangeText={(value) => setForm((current) => ({ ...current, title: value }))} /><Field placeholder="Description" multiline value={form.description} onChangeText={(value) => setForm((current) => ({ ...current, description: value }))} /><DatePickerField placeholder="Due date" value={form.dueDate} onChange={(dueDate) => setForm((current) => ({ ...current, dueDate }))} /><Text style={{ color: colors.text, fontWeight: '700' }}>Status</Text><ChoiceRow options={taskStatuses} selected={form.status} onSelect={(status) => setForm((current) => ({ ...current, status }))} /><Text style={{ color: colors.text, fontWeight: '700' }}>Priority</Text><ChoiceRow options={taskPriorities} selected={form.priority} onSelect={(priority) => setForm((current) => ({ ...current, priority }))} /><Button label={editingId ? 'Save task' : 'Create task'} loading={saving} onPress={submit} />{editingId ? <Button secondary label="Cancel edit" onPress={reset} /> : null}</Section><Section title="Filter tasks"><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}><Chip label="All" value="all" selected={filter === 'all'} onPress={setFilter} />{taskStatuses.map((status) => <Chip key={status} label={labelText(status)} value={status} selected={filter === status} onPress={setFilter} />)}</View></Section><Section title="Tasks">{loading ? <ActivityIndicator color={colors.primary} /> : tasks.length ? tasks.map((task) => <Card key={task.id}><View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}><View style={{ width: 5, alignSelf: 'stretch', borderRadius: 999, backgroundColor: priorityTone[task.priority] === 'danger' ? colors.danger : priorityTone[task.priority] === 'warning' ? colors.accent : colors.success }} /><View style={{ flex: 1 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}><Text style={{ color: colors.text, fontWeight: '900', fontSize: 16, flex: 1 }}>{task.title}</Text><Badge label={labelText(task.status)} tone={statusTone[task.status]} /></View><Text style={{ color: colors.muted, marginTop: 6, lineHeight: 20 }}>{labelText(task.priority)} priority · {formatDate(task.dueDate)}{task.description ? ` · ${task.description}` : ''}</Text><View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}><Button secondary icon="create" label="Edit" onPress={() => edit(task)} /><Button secondary icon="trash" label="Delete" onPress={() => remove(task.id)} /></View></View></View></Card>) : <EmptyState title="No tasks yet" detail="Create your first marketing task above." />}</Section></Screen>;
}

export function PlannerScreen() {
  const { token } = useAuth();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<ContentStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<ContentType | 'all'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ContentItemInput>({ title: '', description: '', type: 'post', channel: 'instagram', status: 'draft', publishDate: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => { if (!token) return; setLoading(true); setError(''); try { setItems((await getContentItems(token, { status: statusFilter, type: typeFilter })).contentItems); } catch (err) { setError(cleanApiError(err)); } finally { setLoading(false); } }, [statusFilter, token, typeFilter]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  function edit(item: ContentItem) { setEditingId(item.id); setForm({ title: item.title, description: item.description ?? item.notes ?? '', type: item.type, channel: item.channel, status: item.status, publishDate: toDateInput(item.publishDate ?? item.scheduledFor) }); }
  function reset() { setEditingId(null); setForm({ title: '', description: '', type: 'post', channel: 'instagram', status: 'draft', publishDate: '' }); }
  async function submit() { if (!token) return; if (!form.title.trim()) return setError('Add a content title.'); setSaving(true); setError(''); try { const payload = { ...form, title: form.title.trim(), description: form.description?.trim(), publishDate: localNoonTimestamp(form.publishDate) }; editingId ? await updateContentItem(editingId, payload, token) : await createContentItem(payload, token); reset(); await load(); } catch (err) { setError(cleanApiError(err)); } finally { setSaving(false); } }
  async function remove(id: string) { if (!token) return; setError(''); try { await deleteContentItem(id, token); await load(); } catch (err) { setError(cleanApiError(err)); } }
  return <Screen title="Content planner" subtitle="Plan posts, stories, reels, campaigns, and offers."><ErrorMessage message={error} /><Section title={editingId ? 'Edit content' : 'New content'}><Field placeholder="Title" value={form.title} onChangeText={(value) => setForm((current) => ({ ...current, title: value }))} /><Field placeholder="Description" multiline value={form.description} onChangeText={(value) => setForm((current) => ({ ...current, description: value }))} /><Text style={{ color: colors.text, fontWeight: '700' }}>Type</Text><ChoiceRow options={contentTypes} selected={form.type} onSelect={(type) => setForm((current) => ({ ...current, type }))} /><Text style={{ color: colors.text, fontWeight: '700' }}>Channel</Text><ChoiceRow options={channels.map((channel) => channel.value)} selected={form.channel} onSelect={(channel) => setForm((current) => ({ ...current, channel }))} /><Text style={{ color: colors.text, fontWeight: '700' }}>Status</Text><ChoiceRow options={contentStatuses} selected={form.status} onSelect={(status) => setForm((current) => ({ ...current, status }))} /><DatePickerField placeholder="Publish date" value={form.publishDate} onChange={(publishDate) => setForm((current) => ({ ...current, publishDate }))} /><Button label={editingId ? 'Save content' : 'Create content'} loading={saving} onPress={submit} />{editingId ? <Button secondary label="Cancel edit" onPress={reset} /> : null}</Section><Section title="Filters"><Text style={{ color: colors.text, fontWeight: '700' }}>Status</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}><Chip label="All" value="all" selected={statusFilter === 'all'} onPress={setStatusFilter} />{contentStatuses.map((status) => <Chip key={status} label={labelText(status)} value={status} selected={statusFilter === status} onPress={setStatusFilter} />)}</View><Text style={{ color: colors.text, fontWeight: '700' }}>Type</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}><Chip label="All" value="all" selected={typeFilter === 'all'} onPress={setTypeFilter} />{contentTypes.map((type) => <Chip key={type} label={labelText(type)} value={type} selected={typeFilter === type} onPress={setTypeFilter} />)}</View></Section><Section title="Content items">{loading ? <ActivityIndicator color={colors.primary} /> : items.length ? items.map((item) => <Card key={item.id}><View style={{ flexDirection: 'row', gap: 12 }}><IconCircle name={channelIcon[item.channel]} /><View style={{ flex: 1 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}><Text style={{ color: colors.text, fontWeight: '900', fontSize: 16, flex: 1 }}>{item.title}</Text><Badge label={labelText(item.status)} tone={statusTone[item.status]} /></View><Text style={{ color: colors.muted, marginTop: 6, lineHeight: 20 }}>{labelText(item.type)} · {labelChannel(item.channel)} · {formatDate(item.publishDate ?? item.scheduledFor)}{item.description ? ` · ${item.description}` : ''}</Text><View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}><Button secondary icon="create" label="Edit" onPress={() => edit(item)} /><Button secondary icon="trash" label="Delete" onPress={() => remove(item.id)} /></View></View></View></Card>) : <EmptyState title="No content planned" detail="Create your first content item above." />}</Section></Screen>;
}


type TemplateCategory = 'promotions' | 'product_showcase' | 'customer_reviews' | 'behind_the_scenes' | 'educational_tips' | 'seasonal_campaigns' | 'weekend_offers';
type TemplateIndustry = 'all' | 'retail' | 'food' | 'beauty' | 'fitness' | 'services';
type ContentTemplate = { id: string; category: TemplateCategory; industries: TemplateIndustry[]; title: string; description: string; channel: MarketingChannel; type: ContentType; exampleCaption: string; recommendedTask: string };

const templateCategories: { value: TemplateCategory; label: string; icon: IconName }[] = [
  { value: 'promotions', label: 'Promotions', icon: 'pricetag' },
  { value: 'product_showcase', label: 'Product showcase', icon: 'cube' },
  { value: 'customer_reviews', label: 'Customer reviews', icon: 'star' },
  { value: 'behind_the_scenes', label: 'Behind the scenes', icon: 'camera' },
  { value: 'educational_tips', label: 'Educational tips', icon: 'school' },
  { value: 'seasonal_campaigns', label: 'Seasonal campaigns', icon: 'leaf' },
  { value: 'weekend_offers', label: 'Weekend offers', icon: 'calendar' }
];
const industryFilters: { value: TemplateIndustry | 'business'; label: string }[] = [
  { value: 'business', label: 'My industry' }, { value: 'all', label: 'Any business' }, { value: 'retail', label: 'Retail' }, { value: 'food', label: 'Food' }, { value: 'beauty', label: 'Beauty' }, { value: 'fitness', label: 'Fitness' }, { value: 'services', label: 'Services' }
];
const contentTemplates: ContentTemplate[] = [
  { id: 'promo-flash', category: 'promotions', industries: ['all', 'retail', 'food', 'beauty'], title: '48-hour flash promotion', description: 'Create urgency around one clear offer with a short deadline.', channel: 'instagram', type: 'offer', exampleCaption: 'This week only: enjoy a limited-time deal on one of our customer favorites. Tap to claim yours before it ends!', recommendedTask: 'Choose the offer, discount, deadline, and redemption instructions.' },
  { id: 'showcase-best', category: 'product_showcase', industries: ['all', 'retail', 'food', 'beauty', 'fitness'], title: 'Best-seller spotlight', description: 'Feature one product or service with benefits, proof, and a simple call-to-action.', channel: 'facebook', type: 'post', exampleCaption: 'Meet our most-requested pick: it solves [problem] and customers love it because [benefit]. Message us to learn more.', recommendedTask: 'Capture one bright photo and list three customer-friendly benefits.' },
  { id: 'review-trust', category: 'customer_reviews', industries: ['all', 'services', 'beauty', 'fitness', 'food'], title: 'Customer quote card', description: 'Turn a happy customer comment into social proof.', channel: 'instagram', type: 'story', exampleCaption: 'Kind words from a recent customer ❤️ Thank you for trusting us with [service/product].', recommendedTask: 'Ask one recent customer for permission to share their feedback.' },
  { id: 'bts-process', category: 'behind_the_scenes', industries: ['all', 'retail', 'food', 'beauty', 'services'], title: 'How we prepare', description: 'Show the care, setup, or craft that happens before customers arrive.', channel: 'instagram', type: 'reel', exampleCaption: 'A quick peek at what goes into getting [product/service] ready for you. Small details make the difference.', recommendedTask: 'Film three short clips: prep, detail close-up, and finished result.' },
  { id: 'tips-faq', category: 'educational_tips', industries: ['all', 'fitness', 'beauty', 'services'], title: 'One helpful tip', description: 'Answer a common customer question in a quick, useful format.', channel: 'email', type: 'post', exampleCaption: 'Quick tip: If you want better results with [topic], start by [simple action]. Save this for later!', recommendedTask: 'Write down one question customers ask every week and answer it in plain language.' },
  { id: 'seasonal-local', category: 'seasonal_campaigns', industries: ['all', 'retail', 'food', 'services'], title: 'Seasonal reminder', description: 'Connect your offer to the current season, local moment, or upcoming holiday.', channel: 'website', type: 'campaign', exampleCaption: 'Seasonal favorite is here! Plan ahead for [occasion] with [product/service] made for this time of year.', recommendedTask: 'Update your homepage or profile bio with the seasonal offer and end date.' },
  { id: 'weekend-bundle', category: 'weekend_offers', industries: ['all', 'food', 'retail', 'fitness'], title: 'Weekend bundle', description: 'Package a simple weekend-only deal that is easy to understand and buy.', channel: 'facebook', type: 'offer', exampleCaption: 'Weekend special: grab our [bundle] from Friday to Sunday only. Perfect for [audience/use case].', recommendedTask: 'Create a weekend graphic and schedule a Friday morning reminder post.' }
];
function inferIndustry(industry?: string): TemplateIndustry { const value = industry?.toLowerCase() ?? ''; if (/restaurant|food|cafe|bakery|bar|coffee/.test(value)) return 'food'; if (/shop|retail|store|boutique|ecommerce/.test(value)) return 'retail'; if (/salon|spa|beauty|hair|nail/.test(value)) return 'beauty'; if (/gym|fitness|yoga|coach|wellness/.test(value)) return 'fitness'; if (/service|consult|repair|agency|studio/.test(value)) return 'services'; return 'all'; }

export function TemplatesScreen({ navigation }: any) {
  const { token } = useAuth();
  const { dashboard, loading, reload } = useDashboard();
  const business = dashboard?.business;
  const businessIndustry = inferIndustry(business?.industry);
  const [industry, setIndustry] = useState<TemplateIndustry | 'business'>('business');
  const [channel, setChannel] = useState<MarketingChannel | 'all'>('all');
  const [category, setCategory] = useState<TemplateCategory | 'all'>('all');
  const [includeTask, setIncludeTask] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const activeIndustry = industry === 'business' ? businessIndustry : industry;
  const templates = contentTemplates.filter((template) => (category === 'all' || template.category === category) && (channel === 'all' || template.channel === channel) && (activeIndustry === 'all' || template.industries.includes(activeIndustry)));
  async function useTemplate(template: ContentTemplate) {
    if (!token) return;
    setSavingId(template.id); setError(''); setNotice('');
    try {
      await createContentItem({ title: template.title, description: `${template.description}\n\nExample caption: ${template.exampleCaption}`, type: template.type, channel: template.channel, status: 'draft', publishDate: '' }, token);
      if (includeTask) await createTask({ title: template.recommendedTask, description: `Recommended next step for template: ${template.title}`, dueDate: '', status: 'todo', priority: 'medium' }, token);
      setNotice(includeTask ? 'Template added as draft content with a recommended task.' : 'Template added as draft content.');
      navigation.navigate('Planner');
    } catch (err) { setError(cleanApiError(err)); } finally { setSavingId(''); }
  }
  return <Screen title="Templates" subtitle="Ready-to-use, rule-based marketing ideas matched to your business type." refreshing={loading} onRefresh={reload}><ErrorMessage message={error} />{notice ? <Card><Text style={{ color: colors.success, fontWeight: '800' }}>{notice}</Text></Card> : null}<Section title="Filters"><Text style={{ color: colors.text, fontWeight: '700' }}>Industry</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{industryFilters.map((item) => <Chip key={item.value} label={item.value === 'business' && business ? `${item.label}: ${labelText(businessIndustry)}` : item.label} value={item.value} selected={industry === item.value} onPress={setIndustry} />)}</View><Text style={{ color: colors.text, fontWeight: '700' }}>Channel</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}><Chip label="All" value="all" selected={channel === 'all'} onPress={setChannel} />{channels.map((item) => <Chip key={item.value} label={item.label} value={item.value} selected={channel === item.value} onPress={setChannel} />)}</View><Text style={{ color: colors.text, fontWeight: '700' }}>Category</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}><Chip label="All" value="all" selected={category === 'all'} onPress={setCategory} />{templateCategories.map((item) => <Chip key={item.value} label={item.label} value={item.value} selected={category === item.value} onPress={setCategory} />)}</View><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}><Text style={{ color: colors.text, fontWeight: '800', flex: 1 }}>Also create recommended task</Text><Switch value={includeTask} onValueChange={setIncludeTask} trackColor={{ false: colors.border, true: colors.primarySoft }} thumbColor={includeTask ? colors.primary : colors.muted} /></View></Section><Section title={`${templates.length} templates`} action={<Badge label="Local rules" tone="info" />}>{templates.length ? templates.map((template) => { const meta = templateCategories.find((item) => item.value === template.category); return <Card key={template.id} elevated><View style={{ flexDirection: 'row', gap: 12 }}><IconCircle name={meta?.icon ?? 'library'} background={colors.primarySoft} color={colors.primary} /><View style={{ flex: 1 }}><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}><Badge label={meta?.label ?? labelText(template.category)} tone="purple" /><Badge label={labelChannel(template.channel)} tone="info" /><Badge label={labelText(template.type)} tone="neutral" /></View><Text style={{ color: colors.text, fontWeight: '900', fontSize: 18, marginTop: 10 }}>{template.title}</Text><Text style={{ color: colors.muted, marginTop: 6, lineHeight: 20 }}>{template.description}</Text><Card><Text style={{ color: colors.text, fontWeight: '800' }}>Example caption</Text><Text style={{ color: colors.muted, marginTop: 6, lineHeight: 20 }}>{template.exampleCaption}</Text></Card><Text style={{ color: colors.text, fontWeight: '800', marginTop: 10 }}>Recommended task</Text><Text style={{ color: colors.muted, marginTop: 4, lineHeight: 20 }}>{template.recommendedTask}</Text><Button label="Use template" icon="add-circle" loading={savingId === template.id} onPress={() => useTemplate(template)} /></View></View></Card>; }) : <EmptyState icon="search" title="No templates match" detail="Try another industry, channel, or category filter." />}</Section></Screen>;
}


const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
function displayLongDate(key: string) { return new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(`${key}T12:00:00`)); }
function startOfWeekDate(date: Date) { const next = new Date(date); const day = next.getDay(); next.setDate(next.getDate() + (day === 0 ? -6 : 1 - day)); next.setHours(12, 0, 0, 0); return next; }
function addDaysToDate(date: Date, days: number) { const next = new Date(date); next.setDate(next.getDate() + days); return next; }
function startOfMonthDate(date: Date) { return new Date(date.getFullYear(), date.getMonth(), 1, 12); }
function endOfMonthDate(date: Date) { return new Date(date.getFullYear(), date.getMonth() + 1, 0, 12); }

export function CalendarScreen() {
  const { token } = useAuth();
  const today = useMemo(() => new Date(), []);
  const [view, setView] = useState<'week' | 'month'>('week');
  const [selectedDate, setSelectedDate] = useState(dateKey(today));
  const [items, setItems] = useState<ContentItem[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [contentTitle, setContentTitle] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const range = useMemo(() => {
    const selected = new Date(`${selectedDate}T12:00:00`);
    if (view === 'week') return { start: dateKey(startOfWeekDate(selected)), end: dateKey(addDaysToDate(startOfWeekDate(selected), 6)) };
    return { start: dateKey(startOfMonthDate(selected)), end: dateKey(endOfMonthDate(selected)) };
  }, [selectedDate, view]);
  const dates = useMemo(() => {
    const start = new Date(`${range.start}T12:00:00`);
    const total = view === 'week' ? 7 : endOfMonthDate(start).getDate();
    return Array.from({ length: total }, (_, index) => dateKey(addDaysToDate(start, index)));
  }, [range.start, view]);
  const load = useCallback(async () => { if (!token) return; setLoading(true); setError(''); try { const data = await getCalendar(token, range.start, range.end); setTasks(data.tasks); setItems(data.contentItems); } catch (err) { setError(cleanApiError(err)); } finally { setLoading(false); } }, [range.end, range.start, token]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const selectedTasks = tasks.filter((task) => toDateInput(task.dueDate) === selectedDate);
  const selectedItems = items.filter((item) => toDateInput(item.publishDate ?? item.scheduledFor) === selectedDate);
  function countFor(key: string) { return tasks.filter((task) => toDateInput(task.dueDate) === key).length + items.filter((item) => toDateInput(item.publishDate ?? item.scheduledFor) === key).length; }
  async function createFromDate(kind: 'content' | 'task') { if (!token) return; const title = kind === 'content' ? contentTitle.trim() : taskTitle.trim(); if (!title) return setError(kind === 'content' ? 'Add a content title.' : 'Add a task title.'); setSaving(true); setError(''); try { if (kind === 'content') { await createContentItem({ title, description: '', type: 'post', channel: 'instagram', status: 'planned', publishDate: localNoonTimestamp(selectedDate) }, token); setContentTitle(''); } else { await createTask({ title, description: '', dueDate: localNoonTimestamp(selectedDate), status: 'todo', priority: 'medium' }, token); setTaskTitle(''); } await load(); } catch (err) { setError(cleanApiError(err)); } finally { setSaving(false); } }
  return <Screen title="Calendar" subtitle="See planned content and marketing tasks by date."><ErrorMessage message={error} /><ChoiceRow options={['week', 'month'] as const} selected={view} onSelect={setView} /><Text style={{ color: colors.text, fontWeight: '800' }}>{displayLongDate(selectedDate)}</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{dates.map((key) => { const selected = key === selectedDate; const isToday = key === dateKey(today); const count = countFor(key); const date = new Date(`${key}T12:00:00`); return <Pressable key={key} onPress={() => setSelectedDate(key)} style={{ width: view === 'week' ? '13%' : '12.4%', minWidth: 42, borderRadius: 14, borderWidth: 1.5, borderColor: selected ? colors.primary : isToday ? colors.accent : colors.border, backgroundColor: selected ? colors.primary : isToday ? colors.accentSoft : colors.card, paddingVertical: 10, alignItems: 'center' }}><Text style={{ color: selected ? '#fff' : colors.muted, fontSize: 12 }}>{dayNames[(date.getDay() + 6) % 7]}</Text><Text style={{ color: selected ? '#fff' : colors.text, fontWeight: '800' }}>{date.getDate()}</Text><View style={{ flexDirection: 'row', gap: 3, marginTop: 5 }}>{Array.from({ length: Math.min(count, 3) }).map((_, index) => <View key={index} style={{ width: 5, height: 5, borderRadius: 999, backgroundColor: selected ? '#fff' : colors.primary }} />)}</View></Pressable>; })}</View><Section title="Selected day">{loading ? <ActivityIndicator color={colors.primary} /> : selectedTasks.length || selectedItems.length ? <>{selectedItems.map((item) => <Row key={item.id} title={item.title} detail={`Content · ${labelText(item.type)} · ${labelChannel(item.channel)} · ${labelText(item.status)}`} />)}{selectedTasks.map((task) => <Row key={task.id} title={task.title} detail={`Task · ${labelText(task.priority)} priority · ${labelText(task.status)}`} />)}</> : <EmptyState title="No items for this date" detail="Create a task or planned content item below." />}</Section><Section title="Create from selected date"><Field placeholder="Content title" value={contentTitle} onChangeText={setContentTitle} /><Button label="Create planned content" loading={saving} onPress={() => createFromDate('content')} /><Field placeholder="Task title" value={taskTitle} onChangeText={setTaskTitle} /><Button secondary label="Create task" loading={saving} onPress={() => createFromDate('task')} /></Section></Screen>;
}



type AnalyticsMetrics = {
  marketingScore: number;
  completedTasks: number;
  pendingTasks: number;
  publishedContent: number;
  scheduledContent: number;
  activeCampaigns: number;
  weeklyCompletion: number;
  currentStreak: number;
  longestStreak: number;
  missedDays: number;
  weekSeries: { label: string; tasks: number; content: number }[];
  monthCompleted: number;
  monthContent: number;
  monthCompletion: number;
  badges: { label: string; detail: string; earned: boolean; icon: IconName }[];
};

function AnalyticsStat({ label, value, icon, tone = 'primary' }: { label: string; value: string | number; icon: IconName; tone?: 'primary' | 'success' | 'warning' | 'info' | 'purple' }) {
  const palette = tone === 'success' ? [colors.success, colors.successSoft] : tone === 'warning' ? [colors.accent, colors.accentSoft] : tone === 'info' ? [colors.info, colors.infoSoft] : tone === 'purple' ? [colors.purple, colors.purpleSoft] : [colors.primary, colors.primarySoft];
  return <Card><View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><IconCircle name={icon} color={palette[0]} background={palette[1]} /><View style={{ flex: 1 }}><Text style={{ color: colors.text, fontWeight: '900', fontSize: 22 }}>{value}</Text><Text style={{ color: colors.muted, fontWeight: '700', marginTop: 2 }}>{label}</Text></View></View></Card>;
}

function ProgressBar({ value, color = colors.primary }: { value: number; color?: string }) {
  return <View style={{ height: 10, borderRadius: 999, backgroundColor: colors.surface, overflow: 'hidden' }}><View style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: '100%', borderRadius: 999, backgroundColor: color }} /></View>;
}

function MiniChart({ data, field, color }: { data: { label: string; tasks: number; content: number }[]; field: 'tasks' | 'content'; color: string }) {
  const max = Math.max(1, ...data.map((item) => item[field]));
  return <Card><View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 132 }}>{data.map((item) => { const height = Math.max(10, (item[field] / max) * 96); return <View key={item.label} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}><Text style={{ color: colors.text, fontWeight: '900', fontSize: 12 }}>{item[field]}</Text><View style={{ width: '100%', maxWidth: 34, height, borderRadius: 10, backgroundColor: color }} /><Text style={{ color: colors.muted, fontSize: 11, fontWeight: '700' }}>{item.label}</Text></View>; })}</View></Card>;
}

function buildAnalyticsMetrics(tasks: Task[], contentItems: ContentItem[], campaigns: Awaited<ReturnType<typeof getCampaigns>>['campaigns']): AnalyticsMetrics {
  const today = new Date();
  const weekStart = startOfWeekDate(today);
  const weekEnd = addDaysToDate(weekStart, 6);
  const monthStart = startOfMonthDate(today);
  const monthEnd = endOfMonthDate(today);
  const inRange = (key: string, start: Date, end: Date) => key >= dateKey(start) && key <= dateKey(end);
  const taskKey = (task: Task) => toDateInput(task.dueDate);
  const contentKey = (item: ContentItem) => toDateInput(item.publishDate ?? item.scheduledFor);
  const weekTasks = tasks.filter((task) => taskKey(task) && inRange(taskKey(task), weekStart, weekEnd));
  const weekContent = contentItems.filter((item) => contentKey(item) && inRange(contentKey(item), weekStart, weekEnd));
  const monthTasks = tasks.filter((task) => taskKey(task) && inRange(taskKey(task), monthStart, monthEnd));
  const monthContent = contentItems.filter((item) => contentKey(item) && inRange(contentKey(item), monthStart, monthEnd));
  const completedTasks = weekTasks.filter((task) => task.status === 'done').length;
  const pendingTasks = weekTasks.filter((task) => task.status !== 'done').length;
  const publishedContent = weekContent.filter((item) => item.status === 'published').length;
  const scheduledContent = weekContent.filter((item) => item.status === 'planned').length;
  const activeCampaigns = campaigns.filter((campaign) => campaign.status === 'active').length;
  const weeklyCompletion = weekTasks.length ? Math.round((completedTasks / weekTasks.length) * 100) : 0;
  const activeDays = new Set<string>();
  tasks.filter((task) => task.status === 'done' && taskKey(task)).forEach((task) => activeDays.add(taskKey(task)));
  contentItems.filter((item) => item.status === 'published' && contentKey(item)).forEach((item) => activeDays.add(contentKey(item)));
  let currentStreak = 0;
  for (let index = 0; index < 365; index += 1) { const key = dateKey(addDaysToDate(today, -index)); if (!activeDays.has(key)) break; currentStreak += 1; }
  let longestStreak = 0; let rolling = 0;
  Array.from(activeDays).sort().forEach((key, index, arr) => { rolling = index > 0 && dateKey(addDaysToDate(new Date(`${arr[index - 1]}T12:00:00`), 1)) === key ? rolling + 1 : 1; longestStreak = Math.max(longestStreak, rolling); });
  const missedDays = Array.from({ length: 30 }, (_, index) => dateKey(addDaysToDate(today, -index))).filter((key) => !activeDays.has(key)).length;
  const weekSeries = Array.from({ length: 7 }, (_, index) => { const date = addDaysToDate(weekStart, index); const key = dateKey(date); return { label: dayNames[index], tasks: weekTasks.filter((task) => task.status === 'done' && taskKey(task) === key).length, content: weekContent.filter((item) => item.status === 'published' && contentKey(item) === key).length }; });
  const monthCompleted = monthTasks.filter((task) => task.status === 'done').length;
  const monthPublishedContent = monthContent.filter((item) => item.status === 'published').length;
  const monthCompletion = monthTasks.length ? Math.round((monthCompleted / monthTasks.length) * 100) : 0;
  const consistencyDays = weekSeries.filter((item) => item.tasks + item.content > 0).length;
  const marketingScore = Math.min(100, Math.round((weeklyCompletion * 0.35) + (Math.min(scheduledContent, 5) / 5 * 20) + (Math.min(activeCampaigns, 2) / 2 * 20) + (consistencyDays / 7 * 25)));
  const totalCompleted = tasks.filter((task) => task.status === 'done').length;
  return { marketingScore, completedTasks, pendingTasks, publishedContent, scheduledContent, activeCampaigns, weeklyCompletion, currentStreak, longestStreak, missedDays, weekSeries, monthCompleted, monthContent: monthPublishedContent, monthCompletion, badges: [
    { label: 'First Campaign', detail: 'Create or run your first campaign.', earned: campaigns.length > 0, icon: 'megaphone' },
    { label: '7 Day Streak', detail: 'Log marketing activity for 7 days straight.', earned: longestStreak >= 7, icon: 'flame' },
    { label: '30 Completed Tasks', detail: 'Complete 30 marketing tasks.', earned: totalCompleted >= 30, icon: 'checkmark-done' },
    { label: 'Content Master', detail: 'Publish 10 content items.', earned: contentItems.filter((item) => item.status === 'published').length >= 10, icon: 'trophy' }
  ] };
}

export function AnalyticsScreen() {
  const { token } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [campaigns, setCampaigns] = useState<Awaited<ReturnType<typeof getCampaigns>>['campaigns']>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const range = useMemo(() => ({ start: dateKey(addDaysToDate(startOfMonthDate(new Date()), -35)), end: dateKey(endOfMonthDate(new Date())) }), []);
  const load = useCallback(async () => { if (!token) return; setLoading(true); setError(''); try { const [taskData, contentData, campaignData] = await Promise.all([getTasks(token, { startDate: range.start, endDate: range.end }), getContentItems(token, { startDate: range.start, endDate: range.end }), getCampaigns(token)]); setTasks(taskData.tasks); setContentItems(contentData.contentItems); setCampaigns(campaignData.campaigns); } catch (err) { setError(cleanApiError(err)); } finally { setLoading(false); } }, [range.end, range.start, token]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const metrics = useMemo(() => buildAnalyticsMetrics(tasks, contentItems, campaigns), [campaigns, contentItems, tasks]);
  const empty = !tasks.length && !contentItems.length && !campaigns.length;
  if (loading) return <Screen title="Analytics" subtitle="Calculating your marketing consistency."><Skeleton /><Skeleton /><Skeleton /></Screen>;
  return <Screen title="Analytics" subtitle="Measure consistency, activity, streaks, and business momentum." refreshing={loading} onRefresh={load}><ErrorMessage message={error} />{error ? <Button secondary label="Try again" icon="refresh" onPress={load} /> : null}{empty ? <EmptyState icon="bar-chart" title="No analytics yet" detail="Create tasks, schedule content, or start a campaign to unlock your marketing score and streaks." /> : null}<Card elevated><View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}><IconCircle name="speedometer" size={24} /><View style={{ flex: 1 }}><Text style={{ color: colors.muted, fontWeight: '800' }}>Marketing Score</Text><Text style={{ color: colors.text, fontWeight: '900', fontSize: 42, letterSpacing: -1 }}>{metrics.marketingScore}<Text style={{ fontSize: 20 }}>/100</Text></Text><ProgressBar value={metrics.marketingScore} /></View></View></Card><Section title="Dashboard widgets"><View style={{ gap: 8 }}><AnalyticsStat label="Current streak" value={`${metrics.currentStreak} days`} icon="flame" tone="warning" /><AnalyticsStat label="Weekly completion" value={`${metrics.weeklyCompletion}%`} icon="pie-chart" tone="success" /><AnalyticsStat label="Marketing score" value={metrics.marketingScore} icon="analytics" tone="info" /></View></Section><Section title="Weekly statistics"><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}><View style={{ flexBasis: '48%', flexGrow: 1 }}><AnalyticsStat label="Tasks completed" value={metrics.completedTasks} icon="checkmark-done" tone="success" /></View><View style={{ flexBasis: '48%', flexGrow: 1 }}><AnalyticsStat label="Tasks pending" value={metrics.pendingTasks} icon="time" tone="warning" /></View><View style={{ flexBasis: '48%', flexGrow: 1 }}><AnalyticsStat label="Content published" value={metrics.publishedContent} icon="paper-plane" tone="info" /></View><View style={{ flexBasis: '48%', flexGrow: 1 }}><AnalyticsStat label="Campaigns running" value={metrics.activeCampaigns} icon="megaphone" tone="purple" /></View></View></Section><Section title="Streak system"><View style={{ flexDirection: 'row', gap: 8 }}><View style={{ flex: 1 }}><AnalyticsStat label="Current" value={metrics.currentStreak} icon="flame" tone="warning" /></View><View style={{ flex: 1 }}><AnalyticsStat label="Longest" value={metrics.longestStreak} icon="ribbon" tone="success" /></View><View style={{ flex: 1 }}><AnalyticsStat label="Missed" value={metrics.missedDays} icon="moon" tone="info" /></View></View></Section><Section title="Progress cards"><Card><Text style={{ color: colors.text, fontWeight: '900', fontSize: 18 }}>This week performance</Text><Text style={{ color: colors.muted, marginTop: 6, lineHeight: 20 }}>{metrics.completedTasks} completed tasks, {metrics.scheduledContent} scheduled content items, and {metrics.activeCampaigns} active campaigns.</Text><ProgressBar value={metrics.weeklyCompletion} color={colors.success} /></Card><Card><Text style={{ color: colors.text, fontWeight: '900', fontSize: 18 }}>Monthly performance</Text><Text style={{ color: colors.muted, marginTop: 6, lineHeight: 20 }}>{metrics.monthCompleted} completed tasks and {metrics.monthContent} published content items this month.</Text><ProgressBar value={metrics.monthCompletion} color={colors.info} /></Card></Section><Section title="Tasks completed over time"><MiniChart data={metrics.weekSeries} field="tasks" color={colors.primary} /></Section><Section title="Content activity over time"><MiniChart data={metrics.weekSeries} field="content" color={colors.accent} /></Section><Section title="Achievement badges">{metrics.badges.map((badge) => <Card key={badge.label}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, opacity: badge.earned ? 1 : 0.55 }}><IconCircle name={badge.icon} background={badge.earned ? colors.successSoft : colors.surface} color={badge.earned ? colors.success : colors.muted} /><View style={{ flex: 1 }}><Text style={{ color: colors.text, fontWeight: '900' }}>{badge.label}</Text><Text style={{ color: colors.muted, marginTop: 4, lineHeight: 19 }}>{badge.detail}</Text></View><Badge label={badge.earned ? 'Earned' : 'Locked'} tone={badge.earned ? 'success' : 'neutral'} /></View></Card>)}</Section></Screen>;
}

export function WeeklyPlanScreen() {
  const { token } = useAuth();
  const [plan, setPlan] = useState<WeeklyPlanResponse | null>(null);
  const [draftTasks, setDraftTasks] = useState<NonNullable<WeeklyPlanResponse['generatedPlan']>['tasks']>([]);
  const [draftContent, setDraftContent] = useState<NonNullable<WeeklyPlanResponse['generatedPlan']>['contentItems']>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const weekStart = dateKey(startOfWeekDate(new Date()));
  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const nextPlan = await getWeeklyPlan(token, weekStart);
      setPlan(nextPlan);
      setDraftTasks(nextPlan.generatedPlan?.tasks ?? []);
      setDraftContent(nextPlan.generatedPlan?.contentItems ?? []);
    } catch (err) {
      setError(cleanApiError(err));
    } finally {
      setLoading(false);
    }
  }, [token, weekStart]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  function regenerate() {
    if (!plan?.generatedPlan) return;
    const stamp = Date.now().toString().slice(-4);
    setNotice('A fresh rule-based plan was generated. Review, edit, then accept it.');
    setDraftTasks(plan.generatedPlan.tasks.map((task, index) => ({ ...task, id: `${task.id}-${stamp}`, dueDate: dateKey(addDaysToDate(startOfWeekDate(new Date()), [1, 3, 5, 6][index] ?? index)) })));
    setDraftContent(plan.generatedPlan.contentItems.map((item, index) => ({ ...item, id: `${item.id}-${stamp}`, publishDate: dateKey(addDaysToDate(startOfWeekDate(new Date()), [0, 1, 3, 4][index] ?? index)) })));
  }
  async function accept() {
    if (!token || (!draftTasks.length && !draftContent.length)) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await acceptWeeklyPlan({ tasks: draftTasks.map(({ id, day, ...task }) => task), contentItems: draftContent.map(({ id, day, ...item }) => item) }, token);
      setNotice('Smart weekly plan accepted and added to your tasks and content planner.');
      await load();
    } catch (err) {
      setError(cleanApiError(err));
    } finally {
      setSaving(false);
    }
  }
  return <Screen title="Weekly Plan" subtitle="Smart rule-based weekly plan generated from your business profile."><ErrorMessage message={error} />{notice ? <Card><Text style={{ color: colors.success, fontWeight: '800' }}>{notice}</Text></Card> : null}{loading ? <ActivityIndicator color={colors.primary} /> : <>{plan?.generatedPlan ? <Section title="Smart Marketing Plan" action={<Badge label={plan.generatedPlan.industryTemplate} tone="info" />}><Card elevated><Text style={{ color: colors.text, fontWeight: '900', fontSize: 17 }}>Weekly focus</Text><Text style={{ color: colors.muted, marginTop: 8, lineHeight: 20 }}>{plan.generatedPlan.focus}</Text><Text style={{ color: colors.muted, marginTop: 8 }}>{formatDate(plan.generatedPlan.weekStart)} – {formatDate(plan.generatedPlan.weekEnd)}</Text></Card><Text style={{ color: colors.text, fontWeight: '800' }}>Recommended tasks</Text>{draftTasks.map((task, index) => <Card key={task.id}><Text style={{ color: colors.muted, fontWeight: '800' }}>{task.day} · {formatDate(task.dueDate)} · {labelText(task.priority)} priority</Text><Field placeholder="Task title" value={task.title} onChangeText={(title) => setDraftTasks((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, title } : item))} /><Field placeholder="Task details" multiline value={task.description} onChangeText={(description) => setDraftTasks((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, description } : item))} /></Card>)}<Text style={{ color: colors.text, fontWeight: '800' }}>Recommended content</Text>{draftContent.map((item, index) => <Card key={item.id}><Text style={{ color: colors.muted, fontWeight: '800' }}>{item.day} · {formatDate(item.publishDate)} · {labelText(item.type)} · {labelChannel(item.channel)}</Text><Field placeholder="Content title" value={item.title} onChangeText={(title) => setDraftContent((items) => items.map((content, itemIndex) => itemIndex === index ? { ...content, title } : content))} /><Field placeholder="Content details" multiline value={item.description} onChangeText={(description) => setDraftContent((items) => items.map((content, itemIndex) => itemIndex === index ? { ...content, description } : content))} /></Card>)}<Button label="Accept plan" icon="checkmark-circle" loading={saving} disabled={!draftTasks.length && !draftContent.length} onPress={accept} /><Button secondary label="Regenerate plan" icon="refresh" onPress={regenerate} /></Section> : <EmptyState title="No business profile" detail="Complete onboarding to generate a weekly marketing plan." />}<Section title="Accepted tasks this week">{plan?.tasks.length ? plan.tasks.map((task) => <Row key={task.id} title={task.title} detail={`${formatDate(task.dueDate)} · ${labelText(task.priority)} priority · ${labelText(task.status)}`} />) : <EmptyState title="No accepted tasks yet" detail="Accept the smart plan to create recommended tasks." />}</Section><Section title="Accepted content this week">{plan?.plannedPosts.length ? plan.plannedPosts.map((item) => <Row key={item.id} title={item.title} detail={`${formatDate(item.publishDate ?? item.scheduledFor)} · ${labelText(item.type)} · ${labelChannel(item.channel)}`} />) : <EmptyState title="No accepted content yet" detail="Accept the smart plan to create posts, stories, emails, offers, or website updates." />}</Section><Section title="Campaigns">{plan?.campaigns.length ? plan.campaigns.map((campaign) => <Row key={campaign.id} title={campaign.name} detail={`${labelText(campaign.status)} · ${campaign.objective}`} />) : <EmptyState title="No campaigns this week" detail="Planned and active campaigns will show here." />}</Section><Section title="Missing actions">{plan?.missingActions.length ? plan.missingActions.map((action) => <Row key={action.id} title={action.title} detail={action.description} />) : <EmptyState title="You are covered" detail="This week has tasks, planned content, and campaign coverage." />}</Section></>}</Screen>;
}

export function CampaignsScreen() {
  const sample = [
    { name: 'Summer loyalty push', status: 'Active', goal: 'Bring repeat customers back this month', duration: 'Jun 1–Jun 30', channels: ['Email', 'Instagram'] },
    { name: 'Local awareness sprint', status: 'Planned', goal: 'Increase neighborhood discovery', duration: 'Next 14 days', channels: ['Facebook', 'Website'] }
  ];
  return <Screen title="Campaigns" subtitle="Track focused marketing pushes without extra complexity."><Section title="Campaign overview">{sample.map((campaign) => <Card key={campaign.name} elevated><View style={{ flexDirection: 'row', gap: 12 }}><IconCircle name="megaphone" background={campaign.status === 'Active' ? colors.successSoft : colors.purpleSoft} color={campaign.status === 'Active' ? colors.success : colors.purple} /><View style={{ flex: 1 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}><Text style={{ color: colors.text, fontWeight: '900', fontSize: 17, flex: 1 }}>{campaign.name}</Text><Badge label={campaign.status} tone={campaign.status === 'Active' ? 'success' : 'purple'} /></View><Text style={{ color: colors.muted, marginTop: 8, lineHeight: 20 }}>Goal: {campaign.goal}</Text><Text style={{ color: colors.muted, marginTop: 4 }}>Duration: {campaign.duration}</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>{campaign.channels.map((channel) => <Badge key={channel} label={channel} tone="info" />)}</View></View></View></Card>)}</Section><EmptyState icon="add-circle" title="Campaign creation is coming soon" detail="Existing campaign tracking is preserved; polished cards are ready for live campaign data." /></Screen>;
}
export function RecommendationsScreen() {
  const recommendations = [
    { title: 'Batch three posts for the week', detail: 'Use one customer question as a post, story, and email tip.', icon: 'albums' as IconName },
    { title: 'Promote your highest-margin offer', detail: 'Pin it to your profile and add a clear call-to-action.', icon: 'trending-up' as IconName },
    { title: 'Follow up after every booking', detail: 'A simple thank-you message can drive reviews and repeat visits.', icon: 'chatbubble-ellipses' as IconName }
  ];
  return <Screen title="Recommendations" subtitle="Practical suggestions based on your plan and schedule."><Section title="Actionable next steps">{recommendations.map((item) => <Row key={item.title} icon={item.icon} title={item.title} detail={item.detail} right={<Ionicons name="chevron-forward" size={18} color={colors.muted} />} />)}</Section></Screen>;
}
export function SettingsScreen() {
  const { logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { dashboard, loading, reload } = useDashboard();
  const business = dashboard?.business;
  const [reminder, setReminder] = useState<ReminderState>({ enabled: false, time: '09:00', notificationStatus: 'undetermined' });
  const [reminderSaving, setReminderSaving] = useState(false);
  const [reminderError, setReminderError] = useState('');
  const reminderTimes = ['08:00', '09:00', '12:00', '17:00'];

  useEffect(() => {
    let mounted = true;
    loadReminderState().then((state) => { if (mounted) setReminder(state); }).catch(() => { if (mounted) setReminderError('Unable to load reminder settings.'); });
    return () => { mounted = false; };
  }, []);

  async function toggleReminder(enabled: boolean) {
    setReminderSaving(true);
    setReminderError('');
    try {
      const next = enabled ? await enableDailyReminder(reminder.time) : await disableDailyReminder(reminder.time);
      setReminder(next);
      if (enabled && next.notificationStatus !== 'granted') setReminderError('Notifications are not enabled. Allow notifications in your device settings to use daily reminders.');
    } catch {
      setReminderError('Unable to update daily reminders. Please try again.');
    } finally {
      setReminderSaving(false);
    }
  }

  async function changeReminderTime(time: string) {
    setReminder((current) => ({ ...current, time }));
    setReminderSaving(true);
    setReminderError('');
    try {
      setReminder(await updateDailyReminderTime(time));
    } catch {
      setReminderError('Unable to update reminder time. Please try again.');
    } finally {
      setReminderSaving(false);
    }
  }

  return <Screen title="Settings" subtitle="Manage account, business profile, and workspace preferences." refreshing={loading} onRefresh={reload}>{business ? <Section title="Business"><Row icon="business" title="Business Profile" detail={`${business.name} · ${business.industry}`} /><Row icon="location" title="Market" detail={`${business.audience}${business.location ? ` · ${business.location}` : ''}`} /><Row icon="share-social" title="Channels" detail={business.channels.map(labelChannel).join(', ')} /></Section> : <EmptyState icon="business" title="No business profile" detail="Complete onboarding to add your business details." />}<Section title="Preferences"><DailyReminderCard reminder={reminder} reminderTimes={reminderTimes} saving={reminderSaving} error={reminderError} onToggle={toggleReminder} onChangeTime={changeReminderTime} /><Pressable onPress={toggleTheme}><Row icon={isDark ? 'sunny' : 'moon'} title="Dark Mode" detail={isDark ? 'Low-light interface is enabled.' : 'Switch to a low-light interface.'} right={<Badge label={isDark ? 'On' : 'Off'} tone={isDark ? 'purple' : 'neutral'} />} /></Pressable><Row icon="card" title="Subscription" detail="Manage plan, billing, and premium features." /><Row icon="help-circle" title="Help & Support" detail="Get answers, contact support, and view guides." /></Section><Button secondary label="Logout" icon="log-out" onPress={logout} /></Screen>;
}

function DailyReminderCard({ reminder, reminderTimes, saving, error, onToggle, onChangeTime }: { reminder: ReminderState; reminderTimes: string[]; saving: boolean; error: string; onToggle: (enabled: boolean) => void; onChangeTime: (time: string) => void }) {
  const status = notificationStatusLabel(reminder.notificationStatus);
  const statusTone = reminder.enabled && reminder.notificationStatus === 'granted' ? 'success' : reminder.notificationStatus === 'denied' ? 'danger' : 'neutral';
  return <Card><View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><IconCircle name="notifications" /><View style={{ flex: 1 }}><Text style={{ color: colors.text, fontWeight: '900', fontSize: 16 }}>Enable daily reminders</Text><Text style={{ color: colors.muted, marginTop: 4, lineHeight: 20 }}>{reminder.enabled ? `Daily local reminder scheduled for ${formatReminderTime(reminder.time)}.` : 'Get a simple daily nudge to finish your marketing plan.'}</Text></View><Switch value={reminder.enabled} disabled={saving || reminder.notificationStatus === 'unavailable'} onValueChange={onToggle} trackColor={{ false: colors.border, true: colors.primarySoft }} thumbColor={reminder.enabled ? colors.primary : colors.muted} /></View><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14, alignItems: 'center' }}><Badge label={status} tone={statusTone} /><Badge label={reminder.enabled ? 'Reminders on' : 'Reminders off'} tone={reminder.enabled ? 'success' : 'neutral'} /></View><Text style={{ color: colors.text, fontWeight: '800', marginTop: 16 }}>Reminder time</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>{reminderTimes.map((time) => <Chip key={time} label={formatReminderTime(time)} value={time} selected={reminder.time === time} onPress={onChangeTime} />)}</View><Text style={{ color: colors.muted, marginTop: 12, lineHeight: 20 }}>Local notifications only. No push server notifications are used.</Text><ErrorMessage message={error} /></Card>;
}

function notificationStatusLabel(status: NotificationStatus) {
  if (status === 'granted') return 'Notifications allowed';
  if (status === 'denied') return 'Notifications blocked';
  if (status === 'unavailable') return 'Unavailable on web';
  return 'Permission not requested';
}

function formatReminderTime(time: string) {
  const [hour, minute] = time.split(':').map(Number);
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(2026, 0, 1, hour, minute));
}
