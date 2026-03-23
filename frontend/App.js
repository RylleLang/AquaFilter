import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import { registerForPushNotifications } from './src/utils/notifications';

export default function App() {
  const [fontsLoaded] = useFonts(Ionicons.font);

  useEffect(() => {
    registerForPushNotifications().then((token) => {
      if (token) console.log('Expo Push Token:', token);
    });
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A1628', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#00D4FF" size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
