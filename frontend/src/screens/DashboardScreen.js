import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, ActivityIndicator, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDevice } from '../context/DeviceContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { notify } from '../utils/notifications';

const formatTime = (secs) => {
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
};

const SensorCard = ({ icon, label, value, unit, color, status, C }) => (
  <View style={[card_s.sensorCard, { backgroundColor: C.card, borderColor: C.border }]}>
    <Ionicons name={icon} size={22} color={color} />
    <Text style={[card_s.sensorLabel, { color: C.muted }]}>{label}</Text>
    <Text style={[card_s.sensorValue, { color }]}>
      {value !== null ? value : '--'}
      <Text style={card_s.sensorUnit}> {unit}</Text>
    </Text>
    {status ? <Text style={[card_s.sensorStatus, { color }]}>{status}</Text> : null}
  </View>
);

const card_s = StyleSheet.create({
  sensorCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1 },
  sensorLabel: { fontSize: 11, marginTop: 6, marginBottom: 4 },
  sensorValue: { fontSize: 20, fontWeight: '800' },
  sensorUnit: { fontSize: 11, fontWeight: '400' },
  sensorStatus: { fontSize: 10, marginTop: 4, fontWeight: '600' },
});

export default function DashboardScreen() {
  const { deviceState, sensorData, loading, togglePower, startCycle, pauseCycle } = useDevice();
  const { user, logout } = useAuth();
  const { colors: C, isDark, toggleTheme } = useTheme();

  const { isOn, cycleRunning, cycleProgress, elapsedSeconds, filterHealthPct, filterCycleCount } = deviceState;
  const { ph, turbidity, tds } = sensorData;

  useEffect(() => {
    if (ph !== null && (ph < 6.5 || ph > 8.5)) notify.phAlert(ph);
    if (turbidity !== null && turbidity > 100) notify.highTurbidity(turbidity);
  }, [ph, turbidity]);

  const phStatus = ph === null ? '' : ph >= 6.5 && ph <= 8.5 ? 'Normal' : 'Out of Range';
  const phColor = ph === null ? C.muted : ph >= 6.5 && ph <= 8.5 ? C.success : C.danger;
  const tdsColor = tds === null ? C.muted : tds <= 500 ? C.success : tds <= 1000 ? C.warning : C.danger;
  const turbColor = turbidity === null ? C.muted : turbidity <= 50 ? C.success : turbidity <= 100 ? C.warning : C.danger;
  const filterBarColor = filterHealthPct > 50 ? C.success : filterHealthPct > 20 ? C.warning : C.danger;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <View>
            <Text style={{ fontSize: 22, fontWeight: '800', color: C.text }}>
              Hello, {user?.name?.split(' ')[0] || 'User'} 👋
            </Text>
            <Text style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>AquaFilter Control Center</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={toggleTheme} style={{ padding: 8 }}>
              <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={22} color={C.muted} />
            </TouchableOpacity>
            <TouchableOpacity onPress={logout} style={{ padding: 8 }}>
              <Ionicons name="log-out-outline" size={22} color={C.muted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Power Toggle */}
        <View style={{ backgroundColor: C.card, borderRadius: 14, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: C.border }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name={isOn ? 'power' : 'power-outline'} size={28} color={isOn ? C.primary : C.muted} />
              <View style={{ marginLeft: 12 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: C.text }}>System Power</Text>
                <Text style={{ color: isOn ? C.success : C.muted, fontSize: 13 }}>
                  {isOn ? 'ONLINE' : 'OFFLINE'}
                </Text>
              </View>
            </View>
            {loading ? (
              <ActivityIndicator color={C.primary} />
            ) : (
              <Switch
                value={isOn}
                onValueChange={togglePower}
                trackColor={{ false: C.border, true: C.isDark ? '#004D5E' : '#B2EBF2' }}
                thumbColor={isOn ? C.primary : C.muted}
              />
            )}
          </View>
        </View>

        {/* Cycle Control */}
        <View style={{ backgroundColor: C.card, borderRadius: 14, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: C.border }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: C.text }}>Filtration Cycle</Text>
          <Text style={{ fontSize: 48, fontWeight: '800', color: C.primary, textAlign: 'center', marginVertical: 12 }}>
            {formatTime(elapsedSeconds)}
          </Text>
          <View style={{ height: 8, backgroundColor: C.border, borderRadius: 4, overflow: 'hidden', marginVertical: 4 }}>
            <View style={{ height: '100%', width: `${cycleProgress}%`, backgroundColor: C.primary, borderRadius: 4 }} />
          </View>
          <Text style={{ color: C.muted, fontSize: 12, textAlign: 'right', marginBottom: 12 }}>
            {cycleProgress.toFixed(0)}% complete
          </Text>
          <TouchableOpacity
            style={{ flexDirection: 'row', backgroundColor: C.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', gap: 8, opacity: !isOn ? 0.4 : 1 }}
            onPress={cycleRunning ? pauseCycle : startCycle}
            disabled={!isOn || loading}
          >
            <Ionicons name={cycleRunning ? 'pause-circle' : 'play-circle'} size={20} color="#000" />
            <Text style={{ color: '#000', fontWeight: '700', fontSize: 15 }}>{cycleRunning ? 'Pause' : 'Start'} Cycle</Text>
          </TouchableOpacity>
        </View>

        {/* Sensor Readings */}
        <Text style={{ fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 10 }}>Live Sensor Data</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
          <SensorCard icon="flask" label="pH Level" value={ph} unit="" color={phColor} status={phStatus} C={C} />
          <SensorCard icon="eye" label="Turbidity" value={turbidity} unit="NTU" color={turbColor} C={C} />
          <SensorCard icon="beaker" label="TDS" value={tds} unit="ppm" color={tdsColor} C={C} />
        </View>

        {/* Filter Health */}
        <View style={{ backgroundColor: C.card, borderRadius: 14, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: C.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="leaf" size={20} color={filterBarColor} />
            <Text style={{ fontSize: 15, fontWeight: '600', color: C.text, marginLeft: 8 }}>Banana Peel Bio-Filter Health</Text>
          </View>
          <View style={{ height: 8, backgroundColor: C.border, borderRadius: 4, overflow: 'hidden', marginTop: 12, marginVertical: 4 }}>
            <View style={{ height: '100%', width: `${filterHealthPct}%`, backgroundColor: filterBarColor, borderRadius: 4 }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            <Text style={{ color: filterBarColor, fontWeight: '700' }}>{filterHealthPct}% remaining</Text>
            <Text style={{ color: C.muted, fontSize: 12 }}>{filterCycleCount} cycles used</Text>
          </View>
          {filterHealthPct <= 20 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.alertBg, padding: 10, borderRadius: 8, marginTop: 10, gap: 8 }}>
              <Ionicons name="warning" size={16} color={C.warning} />
              <Text style={{ color: C.warning, fontSize: 13, flex: 1 }}>Filter replacement recommended soon.</Text>
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
