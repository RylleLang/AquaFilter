import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

export const registerForPushNotifications = async () => {
  // Must be called inside a function — NOT at module level
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Push notification permission denied');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('aquafilter', {
      name: 'AquaFilter Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00D4FF',
    });
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  return token;
};

export const sendLocalNotification = async (title, body, data = {}) => {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data, sound: true },
    trigger: null, // immediate
  });
};

// Pre-built notification templates
export const notify = {
  cycleComplete: () =>
    sendLocalNotification(
      'Filtration Complete ✅',
      'The laundry wastewater filtration cycle has finished.'
    ),
  filterReplace: (cyclesLeft) =>
    sendLocalNotification(
      'Filter Replacement Required ⚠️',
      `Banana peel bio-adsorbent filter needs replacement. ${cyclesLeft} cycle(s) remaining.`
    ),
  deviceOn: () =>
    sendLocalNotification('AquaFilter ON 💧', 'Filtration device is now active.'),
  deviceOff: () =>
    sendLocalNotification('AquaFilter OFF', 'Filtration device has been switched off.'),
  highTurbidity: (ntu) =>
    sendLocalNotification(
      'High Turbidity Alert ⚠️',
      `Turbidity reading: ${ntu} NTU — exceeds safe threshold.`
    ),
  phAlert: (ph) =>
    sendLocalNotification(
      'pH Level Alert ⚠️',
      `pH reading: ${ph} — outside acceptable range (6.5–8.5).`
    ),
};
