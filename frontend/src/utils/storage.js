import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Lazy-load SecureStore to avoid module-level native access
const getSecureStore = () => {
  if (Platform.OS === 'web') return null;
  return require('expo-secure-store');
};

export const storage = {
  setItem: async (key, value) => {
    const SecureStore = getSecureStore();
    if (SecureStore) return SecureStore.setItemAsync(key, value);
    return AsyncStorage.setItem(key, value);
  },
  getItem: async (key) => {
    const SecureStore = getSecureStore();
    if (SecureStore) return SecureStore.getItemAsync(key);
    return AsyncStorage.getItem(key);
  },
  deleteItem: async (key) => {
    const SecureStore = getSecureStore();
    if (SecureStore) return SecureStore.deleteItemAsync(key);
    return AsyncStorage.removeItem(key);
  },
};
