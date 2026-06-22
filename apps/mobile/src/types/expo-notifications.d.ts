declare module 'expo-notifications' {
  export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

  export enum SchedulableTriggerInputTypes {
    DAILY = 'daily'
  }

  export function setNotificationHandler(handler: {
    handleNotification: () => Promise<{
      shouldPlaySound: boolean;
      shouldSetBadge: boolean;
      shouldShowBanner: boolean;
      shouldShowList: boolean;
    }>;
  }): void;

  export function getPermissionsAsync(): Promise<{ status: PermissionStatus }>;
  export function requestPermissionsAsync(): Promise<{ status: PermissionStatus }>;
  export function scheduleNotificationAsync(request: {
    content: { title: string; body: string };
    trigger: { type: SchedulableTriggerInputTypes.DAILY; hour: number; minute: number };
  }): Promise<string>;
  export function cancelScheduledNotificationAsync(identifier: string): Promise<void>;
}
