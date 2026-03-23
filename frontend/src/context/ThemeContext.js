import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DARK = {
  isDark: true,
  bg: '#0A1628',
  card: '#0F2040',
  primary: '#00D4FF',
  text: '#E2E8F0',
  muted: '#718096',
  border: '#1A3050',
  inputBg: '#0A1628',
  success: '#68D391',
  warning: '#F6AD55',
  danger: '#FC8181',
  ph: '#A78BFA',
  turbidity: '#F6AD55',
  tds: '#68D391',
  tabBar: '#0F2040',
  tabBorder: '#1A3050',
  modalOverlay: 'rgba(0,0,0,0.7)',
  alertBg: '#2D1515',
  filterBannerBg: '#0D2A1A',
  filterBannerBorder: '#1A4A2A',
  ackBtnBg: '#004D5E',
};

const LIGHT = {
  isDark: false,
  bg: '#F0F6FF',
  card: '#FFFFFF',
  primary: '#0099BB',
  text: '#1A202C',
  muted: '#718096',
  border: '#CBD5E0',
  inputBg: '#EDF2F7',
  success: '#38A169',
  warning: '#C05621',
  danger: '#E53E3E',
  ph: '#6B46C1',
  turbidity: '#C05621',
  tds: '#276749',
  tabBar: '#FFFFFF',
  tabBorder: '#CBD5E0',
  modalOverlay: 'rgba(0,0,0,0.5)',
  alertBg: '#FFF5F5',
  filterBannerBg: '#F0FFF4',
  filterBannerBorder: '#C6F6D5',
  ackBtnBg: '#E6FFFA',
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
