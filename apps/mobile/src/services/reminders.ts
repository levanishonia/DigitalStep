import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const REMINDER_SETTINGS_KEY = 'digitalstep.dailyReminderSettings';
const REMINDER_NOTIFICATION_ID_KEY = 'digitalstep.dailyReminderNotificationId';

const reminderMessages = [
  'Your marketing tasks are waiting.',
  'Complete today’s DigitalStep plan.',
  'You have content planned for today.'
];

export type NotificationStatus = 'granted' | 'denied' | 'undetermined' | 'unavailable';

export type ReminderSettings = {
  enabled: boolean;
  time: string;
};

export type ReminderState = ReminderSettings & {
  notificationStatus: NotificationStatus;
};

const defaultSettings: ReminderSettings = {
  enabled: false,
  time: '09:00'
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true
  })
});

export async function getStoredReminderSettings(): Promise<ReminderSettings> {
  const raw = await AsyncStorage.getItem(REMINDER_SETTINGS_KEY);
  if (!raw) return defaultSettings;
  try {
    const parsed = JSON.parse(raw) as Partial<ReminderSettings>;
    return {
      enabled: Boolean(parsed.enabled),
      time: isValidReminderTime(parsed.time) ? parsed.time : defaultSettings.time
    };
  } catch {
    return defaultSettings;
  }
}

export async function getNotificationStatus(): Promise<NotificationStatus> {
  if (Platform.OS === 'web') return 'unavailable';
  const permissions = await Notifications.getPermissionsAsync();
  return permissions.status as NotificationStatus;
}

export async function loadReminderState(): Promise<ReminderState> {
  const [settings, notificationStatus] = await Promise.all([getStoredReminderSettings(), getNotificationStatus()]);
  return { ...settings, notificationStatus };
}

export async function saveReminderSettings(settings: ReminderSettings) {
  await AsyncStorage.setItem(REMINDER_SETTINGS_KEY, JSON.stringify(settings));
}

export async function enableDailyReminder(time: string): Promise<ReminderState> {
  if (Platform.OS === 'web') {
    const settings = { enabled: false, time };
    await saveReminderSettings(settings);
    return { ...settings, notificationStatus: 'unavailable' };
  }

  let status = await getNotificationStatus();
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status as NotificationStatus;
  }

  if (status !== 'granted') {
    const settings = { enabled: false, time };
    await saveReminderSettings(settings);
    await cancelDailyReminder();
    return { ...settings, notificationStatus: status };
  }

  const settings = { enabled: true, time };
  await saveReminderSettings(settings);
  await scheduleDailyReminder(time);
  return { ...settings, notificationStatus: status };
}

export async function disableDailyReminder(time: string): Promise<ReminderState> {
  const settings = { enabled: false, time };
  await saveReminderSettings(settings);
  await cancelDailyReminder();
  return { ...settings, notificationStatus: await getNotificationStatus() };
}

export async function updateDailyReminderTime(time: string): Promise<ReminderState> {
  const current = await getStoredReminderSettings();
  const settings = { ...current, time };
  await saveReminderSettings(settings);
  const notificationStatus = await getNotificationStatus();
  if (settings.enabled && notificationStatus === 'granted') await scheduleDailyReminder(time);
  return { ...settings, notificationStatus };
}

async function scheduleDailyReminder(time: string) {
  const [hour, minute] = parseReminderTime(time);
  await cancelDailyReminder();
  const message = reminderMessages[new Date().getDay() % reminderMessages.length];
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'DigitalStep reminder',
      body: message
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute
    }
  });
  await AsyncStorage.setItem(REMINDER_NOTIFICATION_ID_KEY, identifier);
}

async function cancelDailyReminder() {
  const identifier = await AsyncStorage.getItem(REMINDER_NOTIFICATION_ID_KEY);
  if (identifier) {
    await Notifications.cancelScheduledNotificationAsync(identifier);
    await AsyncStorage.removeItem(REMINDER_NOTIFICATION_ID_KEY);
  }
}

function isValidReminderTime(value?: string): value is string {
  return Boolean(value?.match(/^([01]\d|2[0-3]):[0-5]\d$/));
}

function parseReminderTime(time: string) {
  const [hour, minute] = time.split(':').map(Number);
  return [hour, minute] as const;
}
