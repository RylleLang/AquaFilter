import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const C = {
  bg: '#0A1628',
  card: '#0F2040',
  primary: '#00D4FF',
  text: '#E2E8F0',
  muted: '#718096',
  border: '#1A3050',
  error: '#FC8181',
};

export default function LoginScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
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
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* Logo / Brand */}
        <View style={s.brand}>
          <Ionicons name="water" size={56} color={C.primary} />
          <Text style={s.brandName}>AquaFilter</Text>
          <Text style={s.brandSub}>Laundry Wastewater Filtration System</Text>
        </View>

        {/* Card */}
        <View style={s.card}>
          <Text style={s.title}>{mode === 'login' ? 'Sign In' : 'Create Account'}</Text>

          {error ? (
            <View style={s.errorBox}>
              <Ionicons name="alert-circle" size={16} color={C.error} />
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

          {mode === 'register' && (
            <View style={s.inputGroup}>
              <Text style={s.label}>Full Name</Text>
              <TextInput
                style={s.input}
                placeholder="Juan Dela Cruz"
                placeholderTextColor={C.muted}
                value={form.name}
                onChangeText={set('name')}
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={s.inputGroup}>
            <Text style={s.label}>Email</Text>
            <TextInput
              style={s.input}
              placeholder="you@email.com"
              placeholderTextColor={C.muted}
              value={form.email}
              onChangeText={set('email')}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>Password</Text>
            <View style={s.passRow}>
              <TextInput
                style={[s.input, { flex: 1, marginBottom: 0 }]}
                placeholder="••••••••"
                placeholderTextColor={C.muted}
                value={form.password}
                onChangeText={set('password')}
                secureTextEntry={!showPass}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPass((v) => !v)} style={s.eyeBtn}>
                <Ionicons name={showPass ? 'eye-off' : 'eye'} size={20} color={C.muted} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={s.btn} onPress={handleSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={s.btnText}>{mode === 'login' ? 'Sign In' : 'Create Account'}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
            <Text style={s.toggle}>
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <Text style={{ color: C.primary }}>
                {mode === 'login' ? 'Register' : 'Sign In'}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={s.footer}>Powered by ESP32 · ISO/IEC 25010</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  brand: { alignItems: 'center', marginBottom: 36 },
  brandName: { fontSize: 32, fontWeight: '800', color: C.primary, marginTop: 12 },
  brandSub: { fontSize: 12, color: C.muted, marginTop: 4, textAlign: 'center' },
  card: { backgroundColor: C.card, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: C.border },
  title: { fontSize: 22, fontWeight: '700', color: C.text, marginBottom: 20 },
  errorBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2D1515', padding: 10, borderRadius: 8, marginBottom: 16, gap: 8 },
  errorText: { color: C.error, fontSize: 13, flex: 1 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, color: C.muted, marginBottom: 6, fontWeight: '500' },
  input: { backgroundColor: '#0A1628', borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: C.text, fontSize: 15 },
  passRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn: { padding: 12, backgroundColor: '#0A1628', borderWidth: 1, borderColor: C.border, borderRadius: 10 },
  btn: { backgroundColor: C.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8, marginBottom: 16 },
  btnText: { color: '#000', fontWeight: '700', fontSize: 16 },
  toggle: { color: C.muted, textAlign: 'center', fontSize: 14 },
  footer: { color: C.muted, textAlign: 'center', fontSize: 11, marginTop: 32 },
});
