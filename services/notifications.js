import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'TraceNet Updates',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function notifyStatusChange(name, status) {
  if (Platform.OS === 'web') return;
  const granted = await requestNotificationPermission();
  if (!granted) return;

  const STATUS_MESSAGES = {
    verified: `Your report for ${name} has been verified by the barangay.`,
    forwarded: `Your report for ${name} has been forwarded to CCPO.`,
    resolved: `Your report for ${name} has been resolved.`,
  };

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'TraceNet Update',
      body: STATUS_MESSAGES[status] || `Your report for ${name} was updated: ${status}.`,
    },
    trigger: null,
  });
}
