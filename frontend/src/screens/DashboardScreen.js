import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDevice } from '../context/DeviceContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { notify } from '../utils/notifications';
import client from '../api/client';

const formatTime = (secs) => {
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
};

const SensorCard = ({ icon, label, value, unit, color, status, C }) => (
  <View style={{
    flex: 1, backgroundColor: C.card, borderRadius: 16, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: C.border,
  }}>
    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: color + '20', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <Text style={{ fontSize: 22, fontWeight: '800', color }}>
      {value !== null ? value : '--'}
    </Text>
    <Text style={{ fontSize: 10, color, fontWeight: '600', marginTop: 1 }}>{unit}</Text>
    <Text style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>{label}</Text>
    {status ? (
      <View style={{ marginTop: 8, backgroundColor: color + '20', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
        <Text style={{ fontSize: 10, color, fontWeight: '700' }}>{status}</Text>
      </View>
    ) : null}
  </View>
);

export default function DashboardScreen() {
  const { deviceState, sensorData, loading, startCycle, pauseCycle } = useDevice();
  const { user, logout } = useAuth();
  const { colors: C, isDark, toggleTheme } = useTheme();

  const { cycleRunning, cycleProgress, elapsedSeconds, filterHealthPct, filterCycleCount } = deviceState;
  const { ph, turbidity, tds } = sensorData;

  const [wifiModal, setWifiModal] = useState(false);
  const [wifiForm, setWifiForm] = useState({ ssid: '', password: '' });
  const [wifiLoading, setWifiLoading] = useState(false);

  useEffect(() => {
    if (ph !== null && (ph < 6.5 || ph > 8.5)) notify.phAlert(ph);
    if (turbidity !== null && turbidity > 100) notify.highTurbidity(turbidity);
  }, [ph, turbidity]);

  const phStatus = ph === null ? '' : ph >= 6.5 && ph <= 8.5 ? 'Normal' : 'Alert';
  const phColor = ph === null ? C.muted : ph >= 6.5 && ph <= 8.5 ? C.success : C.danger;
  const tdsColor = tds === null ? C.muted : tds <= 500 ? C.success : tds <= 1000 ? C.warning : C.danger;
  const turbColor = turbidity === null ? C.muted : turbidity <= 50 ? C.success : turbidity <= 100 ? C.warning : C.danger;
  const filterBarColor = filterHealthPct > 50 ? C.success : filterHealthPct > 20 ? C.warning : C.danger;

  const handleWifiUpdate = async () => {
    if (!wifiForm.ssid.trim()) return Alert.alert('Error', 'Please enter WiFi name.');
    setWifiLoading(true);
    try {
      await client.post('/config/wifi', {
        deviceId: 'esp32-aquafilter-001',
        ssid: wifiForm.ssid.trim(),
        password: wifiForm.password,
      });
      Alert.alert('Success', 'WiFi credentials sent to device. ESP32 will reconnect shortly.');
      setWifiModal(false);
      setWifiForm({ ssid: '', password: '' });
    } catch {
      Alert.alert('Error', 'Failed to update WiFi. Try again.');
    } finally {
      setWifiLoading(false);
    }
  };

  const card = {
    backgroundColor: C.card, borderRadius: 18, padding: 18,
    marginBottom: 14, borderWidth: 1, borderColor: C.border,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <View>
            <Text style={{ fontSize: 13, color: C.muted, fontWeight: '500' }}>Welcome back,</Text>
            <Text style={{ fontSize: 24, fontWeight: '800', color: C.text, marginTop: 2 }}>
              {user?.name?.split(' ')[0] || 'User'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={() => setWifiModal(true)}
              style={{ width: 42, height: 42, backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="wifi" size={20} color={C.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={toggleTheme}
              style={{ width: 42, height: 42, backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={20} color={C.muted} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={logout}
              style={{ width: 42, height: 42, backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="log-out-outline" size={20} color={C.muted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Cycle Control */}
        <View style={card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: C.text }}>Filtration Cycle</Text>
            <View style={{ backgroundColor: cycleRunning ? C.success + '20' : C.border + '40', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: cycleRunning ? C.success : C.muted }}>
                {cycleRunning ? 'RUNNING' : 'IDLE'}
              </Text>
            </View>
          </View>

          <Text style={{ fontSize: 52, fontWeight: '800', color: C.primary, textAlign: 'center', letterSpacing: 2 }}>
            {formatTime(elapsedSeconds)}
          </Text>

          <View style={{ marginTop: 16, marginBottom: 8 }}>
            <View style={{ height: 8, backgroundColor: C.border, borderRadius: 8, overflow: 'hidden' }}>
              <View style={{ height: '100%', width: `${cycleProgress}%`, backgroundColor: C.primary, borderRadius: 8 }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
              <Text style={{ color: C.muted, fontSize: 12 }}>Progress</Text>
              <Text style={{ color: C.primary, fontSize: 12, fontWeight: '700' }}>{cycleProgress.toFixed(0)}%</Text>
            </View>
          </View>

          <TouchableOpacity
            style={{
              flexDirection: 'row', backgroundColor: C.primary,
              borderRadius: 14, paddingVertical: 14, alignItems: 'center',
              justifyContent: 'center', gap: 8, marginTop: 8,
            }}
            onPress={cycleRunning ? pauseCycle : startCycle}
            disabled={loading}
          >
            <Ionicons name={cycleRunning ? 'pause-circle' : 'play-circle'} size={22} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
              {cycleRunning ? 'Pause Cycle' : 'Start Cycle'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sensor Readings */}
        <Text style={{ fontSize: 13, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
          Live Sensor Data
        </Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
          <SensorCard icon="flask" label="pH Level" value={ph} unit="pH" color={phColor} status={phStatus} C={C} />
          <SensorCard icon="eye" label="Turbidity" value={turbidity} unit="NTU" color={turbColor} C={C} />
          <SensorCard icon="beaker" label="TDS" value={tds} unit="ppm" color={tdsColor} C={C} />
        </View>

        {/* Filter Health */}
        <View style={card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: filterBarColor + '20', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="leaf" size={18} color={filterBarColor} />
              </View>
              <View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>Bio-Filter Health</Text>
                <Text style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Banana Peel Adsorbent</Text>
              </View>
            </View>
            <Text style={{ fontSize: 22, fontWeight: '800', color: filterBarColor }}>{filterHealthPct}%</Text>
          </View>

          <View style={{ height: 8, backgroundColor: C.border, borderRadius: 8, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${filterHealthPct}%`, backgroundColor: filterBarColor, borderRadius: 8 }} />
          </View>
          <Text style={{ color: C.muted, fontSize: 12, marginTop: 8 }}>{filterCycleCount} cycles used</Text>

          {filterHealthPct <= 20 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.alertBg, padding: 12, borderRadius: 12, marginTop: 12, gap: 8, borderWidth: 1, borderColor: C.danger + '40' }}>
              <Ionicons name="warning" size={16} color={C.warning} />
              <Text style={{ color: C.warning, fontSize: 13, flex: 1, fontWeight: '500' }}>
                Filter replacement recommended soon.
              </Text>
            </View>
          )}
        </View>

      </ScrollView>

      {/* WiFi Config Modal */}
      <Modal visible={wifiModal} animationType="slide" transparent onRequestClose={() => setWifiModal(false)}>
        <View style={{ flex: 1, backgroundColor: C.modalOverlay, justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderWidth: 1, borderColor: C.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: C.text }}>ESP32 WiFi Settings</Text>
              <TouchableOpacity
                onPress={() => setWifiModal(false)}
                style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="close" size={18} color={C.muted} />
              </TouchableOpacity>
            </View>
            <Text style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>
              Update the WiFi network your ESP32 connects to.
            </Text>

            <Text style={{ color: C.muted, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>WiFi Name (SSID)</Text>
            <TextInput
              style={{ backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: C.text, fontSize: 15, marginBottom: 14 }}
              placeholder="Enter WiFi name"
              placeholderTextColor={C.muted}
              value={wifiForm.ssid}
              onChangeText={(v) => setWifiForm((f) => ({ ...f, ssid: v }))}
              autoCapitalize="none"
            />

            <Text style={{ color: C.muted, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Password</Text>
            <TextInput
              style={{ backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: C.text, fontSize: 15, marginBottom: 20 }}
              placeholder="Enter WiFi password"
              placeholderTextColor={C.muted}
              value={wifiForm.password}
              onChangeText={(v) => setWifiForm((f) => ({ ...f, password: v }))}
              secureTextEntry
              autoCapitalize="none"
            />

            <TouchableOpacity
              style={{ backgroundColor: C.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
              onPress={handleWifiUpdate}
              disabled={wifiLoading}
            >
              {wifiLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Update ESP32 WiFi</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
