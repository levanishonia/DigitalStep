import { ReactNode, useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../auth/AuthContext';
import { Screen, Button, Field, Row, ErrorMessage, Card, Badge, IconCircle, Skeleton } from '../components/UI';
import { colors, useTheme } from '../theme/theme';
import { BusinessInput, ContentItem, ContentItemInput, ContentStatus, ContentType, DashboardResponse, MarketingChannel, Task, TaskInput, TaskPriority, TaskStatus, WeeklyPlanResponse, acceptWeeklyPlan, createContentItem, createTask, deleteContentItem, deleteTask, getCalendar, getContentItems, getDashboard, getTasks, getWeeklyPlan, updateContentItem, updateTask } from '../services/api';

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

function dateOnly(value?: string) {
  return value?.trim() ? dateKey(new Date(`${value.trim()}T12:00:00`)) : undefined;
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
  return <Screen title={`${greeting}, ${user?.name?.split(' ')[0] ?? business?.name ?? 'there'} 👋`} subtitle={business ? `${business.name} marketing command center.` : 'Your marketing at a glance.'} refreshing={loading} onRefresh={reload}><ErrorMessage message={error} />{error ? <Button secondary label="Try again" icon="refresh" onPress={reload} /> : null}<View style={{ flexDirection: 'row', gap: 8 }}><View style={{ flex: 1 }}><SummaryCard label="Due today" value={dashboard?.tasks.length ?? 0} icon="today" tone="primary" /></View><View style={{ flex: 1 }}><SummaryCard label="Upcoming" value={dashboard?.contentItems.length ?? 0} icon="paper-plane" tone="info" /></View><View style={{ flex: 1 }}><SummaryCard label="Campaigns" value={dashboard?.campaigns.length ?? 0} icon="megaphone" tone="accent" /></View></View><Section title="Quick actions"><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}><View style={{ flexBasis: '48%', flexGrow: 1 }}><Button label="Create Task" icon="add-circle" onPress={() => navigation.navigate('Tasks')} /></View><View style={{ flexBasis: '48%', flexGrow: 1 }}><Button secondary label="Create Content" icon="create" onPress={() => navigation.navigate('Planner')} /></View><View style={{ flexBasis: '48%', flexGrow: 1 }}><Button secondary label="Create Campaign" icon="megaphone" onPress={() => navigation.navigate('Campaigns')} /></View><View style={{ flexBasis: '48%', flexGrow: 1 }}><Button secondary label="Open Calendar" icon="calendar" onPress={() => navigation.navigate('Calendar')} /></View></View></Section><Section title="Today’s marketing tasks">{dashboard?.tasks.length ? dashboard.tasks.map((task) => <Row key={task.id} icon="checkmark-circle" title={task.title} detail={`${labelText(task.status)} · ${formatDate(task.dueDate)}${task.description ? ` · ${task.description}` : ''}`} right={<Badge label={labelText(task.priority)} tone={priorityTone[task.priority]} />} />) : <EmptyState icon="checkmark-done" title="No tasks due today" detail="Enjoy the breathing room or create a quick action for tomorrow." />}</Section><Section title="Upcoming content">{dashboard?.contentItems.length ? dashboard.contentItems.map((item) => <Row key={item.id} icon={channelIcon[item.channel]} title={item.title} detail={`${labelText(item.type)} · ${labelChannel(item.channel)} · ${formatDate(item.publishDate ?? item.scheduledFor)}`} right={<Badge label={labelText(item.status)} tone={statusTone[item.status]} />} />) : <EmptyState icon="images" title="No upcoming content" detail="Planned posts, emails, and website updates will show up here." />}</Section><Section title="Active campaigns">{dashboard?.campaigns.length ? dashboard.campaigns.map((campaign) => <Row key={campaign.id} icon="megaphone" title={campaign.name} detail={campaign.objective} right={<Badge label={labelText(campaign.status)} tone={statusTone[campaign.status]} />} />) : <EmptyState icon="flag" title="No active campaigns" detail="Create campaigns when you are ready to track focused marketing pushes." />}</Section><Section title="Recommendations">{dashboard?.recommendations.length ? dashboard.recommendations.map((recommendation) => <Row key={recommendation.id} icon="bulb" title={recommendation.title} detail={recommendation.description} right={<Badge label={`P${recommendation.priority}`} tone="warning" />} />) : <EmptyState icon="bulb" title="No recommendations yet" detail="DigitalStep will surface practical suggestions as your plan fills in." />}</Section></Screen>;
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
  async function submit() { if (!token) return; if (!form.title.trim()) return setError('Add a task title.'); setSaving(true); setError(''); try { const payload = { ...form, title: form.title.trim(), description: form.description?.trim(), dueDate: dateOnly(form.dueDate) }; editingId ? await updateTask(editingId, payload, token) : await createTask(payload, token); reset(); await load(); } catch (err) { setError(cleanApiError(err)); } finally { setSaving(false); } }
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
  async function submit() { if (!token) return; if (!form.title.trim()) return setError('Add a content title.'); setSaving(true); setError(''); try { const payload = { ...form, title: form.title.trim(), description: form.description?.trim(), publishDate: dateOnly(form.publishDate) }; editingId ? await updateContentItem(editingId, payload, token) : await createContentItem(payload, token); reset(); await load(); } catch (err) { setError(cleanApiError(err)); } finally { setSaving(false); } }
  async function remove(id: string) { if (!token) return; setError(''); try { await deleteContentItem(id, token); await load(); } catch (err) { setError(cleanApiError(err)); } }
  return <Screen title="Content planner" subtitle="Plan posts, stories, reels, campaigns, and offers."><ErrorMessage message={error} /><Section title={editingId ? 'Edit content' : 'New content'}><Field placeholder="Title" value={form.title} onChangeText={(value) => setForm((current) => ({ ...current, title: value }))} /><Field placeholder="Description" multiline value={form.description} onChangeText={(value) => setForm((current) => ({ ...current, description: value }))} /><Text style={{ color: colors.text, fontWeight: '700' }}>Type</Text><ChoiceRow options={contentTypes} selected={form.type} onSelect={(type) => setForm((current) => ({ ...current, type }))} /><Text style={{ color: colors.text, fontWeight: '700' }}>Channel</Text><ChoiceRow options={channels.map((channel) => channel.value)} selected={form.channel} onSelect={(channel) => setForm((current) => ({ ...current, channel }))} /><Text style={{ color: colors.text, fontWeight: '700' }}>Status</Text><ChoiceRow options={contentStatuses} selected={form.status} onSelect={(status) => setForm((current) => ({ ...current, status }))} /><DatePickerField placeholder="Publish date" value={form.publishDate} onChange={(publishDate) => setForm((current) => ({ ...current, publishDate }))} /><Button label={editingId ? 'Save content' : 'Create content'} loading={saving} onPress={submit} />{editingId ? <Button secondary label="Cancel edit" onPress={reset} /> : null}</Section><Section title="Filters"><Text style={{ color: colors.text, fontWeight: '700' }}>Status</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}><Chip label="All" value="all" selected={statusFilter === 'all'} onPress={setStatusFilter} />{contentStatuses.map((status) => <Chip key={status} label={labelText(status)} value={status} selected={statusFilter === status} onPress={setStatusFilter} />)}</View><Text style={{ color: colors.text, fontWeight: '700' }}>Type</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}><Chip label="All" value="all" selected={typeFilter === 'all'} onPress={setTypeFilter} />{contentTypes.map((type) => <Chip key={type} label={labelText(type)} value={type} selected={typeFilter === type} onPress={setTypeFilter} />)}</View></Section><Section title="Content items">{loading ? <ActivityIndicator color={colors.primary} /> : items.length ? items.map((item) => <Card key={item.id}><View style={{ flexDirection: 'row', gap: 12 }}><IconCircle name={channelIcon[item.channel]} /><View style={{ flex: 1 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}><Text style={{ color: colors.text, fontWeight: '900', fontSize: 16, flex: 1 }}>{item.title}</Text><Badge label={labelText(item.status)} tone={statusTone[item.status]} /></View><Text style={{ color: colors.muted, marginTop: 6, lineHeight: 20 }}>{labelText(item.type)} · {labelChannel(item.channel)} · {formatDate(item.publishDate ?? item.scheduledFor)}{item.description ? ` · ${item.description}` : ''}</Text><View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}><Button secondary icon="create" label="Edit" onPress={() => edit(item)} /><Button secondary icon="trash" label="Delete" onPress={() => remove(item.id)} /></View></View></View></Card>) : <EmptyState title="No content planned" detail="Create your first content item above." />}</Section></Screen>;
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
  async function createFromDate(kind: 'content' | 'task') { if (!token) return; const title = kind === 'content' ? contentTitle.trim() : taskTitle.trim(); if (!title) return setError(kind === 'content' ? 'Add a content title.' : 'Add a task title.'); setSaving(true); setError(''); try { if (kind === 'content') { await createContentItem({ title, description: '', type: 'post', channel: 'instagram', status: 'planned', publishDate: dateOnly(selectedDate) }, token); setContentTitle(''); } else { await createTask({ title, description: '', dueDate: dateOnly(selectedDate), status: 'todo', priority: 'medium' }, token); setTaskTitle(''); } await load(); } catch (err) { setError(cleanApiError(err)); } finally { setSaving(false); } }
  return <Screen title="Calendar" subtitle="See planned content and marketing tasks by date."><ErrorMessage message={error} /><ChoiceRow options={['week', 'month'] as const} selected={view} onSelect={setView} /><Text style={{ color: colors.text, fontWeight: '800' }}>{displayLongDate(selectedDate)}</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{dates.map((key) => { const selected = key === selectedDate; const isToday = key === dateKey(today); const count = countFor(key); const date = new Date(`${key}T12:00:00`); return <Pressable key={key} onPress={() => setSelectedDate(key)} style={{ width: view === 'week' ? '13%' : '12.4%', minWidth: 42, borderRadius: 14, borderWidth: 1.5, borderColor: selected ? colors.primary : isToday ? colors.accent : colors.border, backgroundColor: selected ? colors.primary : isToday ? colors.accentSoft : colors.card, paddingVertical: 10, alignItems: 'center' }}><Text style={{ color: selected ? '#fff' : colors.muted, fontSize: 12 }}>{dayNames[(date.getDay() + 6) % 7]}</Text><Text style={{ color: selected ? '#fff' : colors.text, fontWeight: '800' }}>{date.getDate()}</Text><View style={{ flexDirection: 'row', gap: 3, marginTop: 5 }}>{Array.from({ length: Math.min(count, 3) }).map((_, index) => <View key={index} style={{ width: 5, height: 5, borderRadius: 999, backgroundColor: selected ? '#fff' : colors.primary }} />)}</View></Pressable>; })}</View><Section title="Selected day">{loading ? <ActivityIndicator color={colors.primary} /> : selectedTasks.length || selectedItems.length ? <>{selectedItems.map((item) => <Row key={item.id} title={item.title} detail={`Content · ${labelText(item.type)} · ${labelChannel(item.channel)} · ${labelText(item.status)}`} />)}{selectedTasks.map((task) => <Row key={task.id} title={task.title} detail={`Task · ${labelText(task.priority)} priority · ${labelText(task.status)}`} />)}</> : <EmptyState title="No items for this date" detail="Create a task or planned content item below." />}</Section><Section title="Create from selected date"><Field placeholder="Content title" value={contentTitle} onChangeText={setContentTitle} /><Button label="Create planned content" loading={saving} onPress={() => createFromDate('content')} /><Field placeholder="Task title" value={taskTitle} onChangeText={setTaskTitle} /><Button secondary label="Create task" loading={saving} onPress={() => createFromDate('task')} /></Section></Screen>;
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
  return <Screen title="Settings" subtitle="Manage account, business profile, and workspace preferences." refreshing={loading} onRefresh={reload}>{business ? <Section title="Business"><Row icon="business" title="Business Profile" detail={`${business.name} · ${business.industry}`} /><Row icon="location" title="Market" detail={`${business.audience}${business.location ? ` · ${business.location}` : ''}`} /><Row icon="share-social" title="Channels" detail={business.channels.map(labelChannel).join(', ')} /></Section> : <EmptyState icon="business" title="No business profile" detail="Complete onboarding to add your business details." />}<Section title="Preferences"><Row icon="notifications" title="Notifications" detail="Reminders for tasks, scheduled content, and campaigns." right={<Badge label="On" tone="success" />} /><Pressable onPress={toggleTheme}><Row icon={isDark ? 'sunny' : 'moon'} title="Dark Mode" detail={isDark ? 'Low-light interface is enabled.' : 'Switch to a low-light interface.'} right={<Badge label={isDark ? 'On' : 'Off'} tone={isDark ? 'purple' : 'neutral'} />} /></Pressable><Row icon="card" title="Subscription" detail="Manage plan, billing, and premium features." /><Row icon="help-circle" title="Help & Support" detail="Get answers, contact support, and view guides." /></Section><Button secondary label="Logout" icon="log-out" onPress={logout} /></Screen>;
}
