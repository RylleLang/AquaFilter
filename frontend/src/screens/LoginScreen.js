import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function LoginScreen() {
  const { login, register } = useAuth();
  const { colors: C, isDark, toggleTheme } = useTheme();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    setError('');
    if (!form.email || !form.password) return setError('Email and password are required.');
    if (mode === 'register' && !form.name) return setError('Full name is required.');
    setLoading(true);
    try {
      if (mode === 'register') {
        await register(form.name, form.email.trim().toLowerCase(), form.password);
      } else {
        await login(form.email.trim().toLowerCase(), form.password);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }} keyboardShouldPersistTaps="handled">

        {/* Theme toggle */}
        <TouchableOpacity onPress={toggleTheme} style={{ position: 'absolute', top: 52, right: 24, padding: 8 }}>
          <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={22} color={C.muted} />
        </TouchableOpacity>

        {/* Logo */}
        <View style={{ alignItems: 'center', marginBottom: 36 }}>
          <Ionicons name="water" size={56} color={C.primary} />
          <Text style={{ fontSize: 32, fontWeight: '800', color: C.primary, marginTop: 12 }}>AquaFilter</Text>
          <Text style={{ fontSize: 12, color: C.muted, marginTop: 4, textAlign: 'center' }}>
            Laundry Wastewater Filtration System
          </Text>
        </View>

        {/* Card */}
        <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: C.border }}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: C.text, marginBottom: 20 }}>
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </Text>

          {error ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.alertBg, padding: 10, borderRadius: 8, marginBottom: 16, gap: 8 }}>
              <Ionicons name="alert-circle" size={16} color={C.danger} />
              <Text style={{ color: C.danger, fontSize: 13, flex: 1 }}>{error}</Text>
            </View>
          ) : null}

          {mode === 'register' && (
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 13, color: C.muted, marginBottom: 6, fontWeight: '500' }}>Full Name</Text>
              <TextInput
                style={{ backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: C.text, fontSize: 15 }}
                placeholder="Juan Dela Cruz"
                placeholderTextColor={C.muted}
                value={form.name}
                onChangeText={set('name')}
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 13, color: C.muted, marginBottom: 6, fontWeight: '500' }}>Email</Text>
            <TextInput
              style={{ backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: C.text, fontSize: 15 }}
              placeholder="you@email.com"
              placeholderTextColor={C.muted}
              value={form.email}
              onChangeText={set('email')}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 13, color: C.muted, marginBottom: 6, fontWeight: '500' }}>Password</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TextInput
                style={{ flex: 1, backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: C.text, fontSize: 15 }}
                placeholder="••••••••"
                placeholderTextColor={C.muted}
                value={form.password}
                onChangeText={set('password')}
                secureTextEntry={!showPass}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPass((v) => !v)}
                style={{ padding: 12, backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border, borderRadius: 10 }}
              >
                <Ionicons name={showPass ? 'eye-off' : 'eye'} size={20} color={C.muted} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={{ backgroundColor: C.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8, marginBottom: 16 }}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={{ color: '#000', fontWeight: '700', fontSize: 16 }}>
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
            <Text style={{ color: C.muted, textAlign: 'center', fontSize: 14 }}>
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <Text style={{ color: C.primary }}>
                {mode === 'login' ? 'Register' : 'Sign In'}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={{ color: C.muted, textAlign: 'center', fontSize: 11, marginTop: 32 }}>
          Powered by ESP32 · ISO/IEC 25010
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
