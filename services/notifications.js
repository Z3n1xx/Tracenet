import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

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

// Registers this device for background push (works while the app is closed)
// by saving its raw FCM token to the user's Firestore doc. A separate
// server-side Cloud Function (outside mobile scope) reads this token to
// actually send the push when a report's status changes.
export async function registerPushToken() {
  if (Platform.OS === 'web') return;
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  const granted = await requestNotificationPermission();
  if (!granted) return;

  try {
    const { data: pushToken } = await Notifications.getDevicePushTokenAsync();
    await setDoc(
      doc(db, 'users', uid),
      { pushToken, pushTokenPlatform: Platform.OS },
      { merge: true }
    );
  } catch (e) {
    console.warn('Failed to register push token:', e);
  }
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
