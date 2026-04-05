import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DARK = {
  isDark: true,
  bg: '#06091F',
  card: '#0D1535',
  cardAlt: '#111C42',
  primary: '#3B82F6',
  primaryDeep: '#1D4ED8',
  text: '#F0F4FF',
  muted: '#6B7FAB',
  border: '#1E2D5A',
  inputBg: '#0A1225',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  ph: '#A78BFA',
  turbidity: '#F59E0B',
  tds: '#10B981',
  tabBar: '#0D1535',
  tabBorder: '#1E2D5A',
  modalOverlay: 'rgba(0,0,0,0.8)',
  alertBg: '#1F0A0A',
  filterBannerBg: '#071A10',
  filterBannerBorder: '#0F3020',
  ackBtnBg: '#0A1D3B',
};

const LIGHT = {
  isDark: false,
  bg: '#EEF2FF',
  card: '#FFFFFF',
  cardAlt: '#F5F7FF',
  primary: '#2563EB',
  primaryDeep: '#1D4ED8',
  text: '#0F172A',
  muted: '#64748B',
  border: '#C7D2FE',
  inputBg: '#F1F5FF',
  success: '#059669',
  warning: '#D97706',
  danger: '#DC2626',
  ph: '#7C3AED',
  turbidity: '#D97706',
  tds: '#059669',
  tabBar: '#FFFFFF',
  tabBorder: '#C7D2FE',
  modalOverlay: 'rgba(0,0,0,0.5)',
  alertBg: '#FFF1F2',
  filterBannerBg: '#ECFDF5',
  filterBannerBorder: '#A7F3D0',
  ackBtnBg: '#EFF6FF',
};

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('theme').then((saved) => {
      if (saved !== null) setIsDark(saved === 'dark');
    });
  }, []);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      AsyncStorage.setItem('theme', next ? 'dark' : 'light');
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ colors: isDark ? DARK : LIGHT, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
