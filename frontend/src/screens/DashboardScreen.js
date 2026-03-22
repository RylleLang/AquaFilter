import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, ActivityIndicator, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDevice } from '../context/DeviceContext';
import { useAuth } from '../context/AuthContext';
import { notify } from '../utils/notifications';

const C = {
  bg: '#0A1628', card: '#0F2040', primary: '#00D4FF',
  text: '#E2E8F0', muted: '#718096', border: '#1A3050',
  success: '#68D391', warning: '#F6AD55', danger: '#FC8181',
};

const formatTime = (secs) => {
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
};

const SensorCard = ({ icon, label, value, unit, color, status }) => (
  <View style={s.sensorCard}>
    <Ionicons name={icon} size={22} color={color} />
    <Text style={s.sensorLabel}>{label}</Text>
    <Text style={[s.sensorValue, { color }]}>
      {value !== null ? value : '--'}
      <Text style={s.sensorUnit}> {unit}</Text>
    </Text>
    {status ? <Text style={[s.sensorStatus, { color }]}>{status}</Text> : null}
  </View>
);

export default function DashboardScreen() {
  const { deviceState, sensorData, loading, togglePower, startCycle, pauseCycle } = useDevice();
  const { user, logout } = useAuth();

  const { isOn, cycleRunning, cycleProgress, elapsedSeconds, filterHealthPct, filterCycleCount } = deviceState;
  const { ph, turbidity, tds } = sensorData;

  // Trigger local notifications based on sensor thresholds
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
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>Hello, {user?.name?.split(' ')[0] || 'User'} 👋</Text>
            <Text style={s.subtitle}>AquaFilter Control Center</Text>
          </View>
          <TouchableOpacity onPress={logout} style={s.logoutBtn}>
            <Ionicons name="log-out-outline" size={22} color={C.muted} />
          </TouchableOpacity>
        </View>

        {/* Power Toggle */}
        <View style={s.card}>
          <View style={s.row}>
            <View style={s.rowLeft}>
              <Ionicons name={isOn ? 'power' : 'power-outline'} size={28} color={isOn ? C.primary : C.muted} />
              <View style={{ marginLeft: 12 }}>
                <Text style={s.cardTitle}>System Power</Text>
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
                trackColor={{ false: C.border, true: '#004D5E' }}
                thumbColor={isOn ? C.primary : C.muted}
              />
            )}
          </View>
        </View>

        {/* Cycle Control */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Filtration Cycle</Text>
          <Text style={s.timerText}>{formatTime(elapsedSeconds)}</Text>

          {/* Progress Bar */}
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${cycleProgress}%` }]} />
          </View>
          <Text style={s.progressLabel}>{cycleProgress.toFixed(0)}% complete</Text>

          <View style={s.btnRow}>
            <TouchableOpacity
              style={[s.cycleBtn, !isOn && s.btnDisabled]}
              onPress={cycleRunning ? pauseCycle : startCycle}
              disabled={!isOn || loading}
            >
              <Ionicons name={cycleRunning ? 'pause-circle' : 'play-circle'} size={20} color="#000" />
              <Text style={s.cycleBtnText}>{cycleRunning ? 'Pause' : 'Start'} Cycle</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sensor Readings */}
        <Text style={s.sectionTitle}>Live Sensor Data</Text>
        <View style={s.sensorRow}>
          <SensorCard icon="flask" label="pH Level" value={ph} unit="" color={phColor} status={phStatus} />
          <SensorCard icon="eye" label="Turbidity" value={turbidity} unit="NTU" color={turbColor} />
          <SensorCard icon="beaker" label="TDS" value={tds} unit="ppm" color={tdsColor} />
        </View>

        {/* Filter Health */}
        <View style={s.card}>
          <View style={s.row}>
            <Ionicons name="leaf" size={20} color={filterBarColor} />
            <Text style={[s.cardTitle, { marginLeft: 8 }]}>Banana Peel Bio-Filter Health</Text>
          </View>
          <View style={[s.progressTrack, { marginTop: 12 }]}>
            <View style={[s.progressFill, { width: `${filterHealthPct}%`, backgroundColor: filterBarColor }]} />
          </View>
          <View style={[s.row, { marginTop: 8 }]}>
            <Text style={{ color: filterBarColor, fontWeight: '700' }}>{filterHealthPct}% remaining</Text>
            <Text style={s.muted}>{filterCycleCount} cycles used</Text>
          </View>
          {filterHealthPct <= 20 && (
            <View style={s.alertBox}>
              <Ionicons name="warning" size={16} color={C.warning} />
              <Text style={s.alertText}>Filter replacement recommended soon.</Text>
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 22, fontWeight: '800', color: C.text },
  subtitle: { fontSize: 13, color: C.muted, marginTop: 2 },
  logoutBtn: { padding: 8 },
  card: { backgroundColor: C.card, borderRadius: 14, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: C.border },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLeft: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: C.text },
  timerText: { fontSize: 48, fontWeight: '800', color: C.primary, textAlign: 'center', marginVertical: 12, fontVariant: ['tabular-nums'] },
  progressTrack: { height: 8, backgroundColor: C.border, borderRadius: 4, overflow: 'hidden', marginVertical: 4 },
  progressFill: { height: '100%', backgroundColor: C.primary, borderRadius: 4 },
  progressLabel: { color: C.muted, fontSize: 12, textAlign: 'right', marginBottom: 12 },
  btnRow: { flexDirection: 'row', gap: 10 },
  cycleBtn: { flex: 1, flexDirection: 'row', backgroundColor: C.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', gap: 8 },
  cycleBtnText: { color: '#000', fontWeight: '700', fontSize: 15 },
  btnDisabled: { opacity: 0.4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 10 },
  sensorRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  sensorCard: { flex: 1, backgroundColor: C.card, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  sensorLabel: { color: C.muted, fontSize: 11, marginTop: 6, marginBottom: 4 },
  sensorValue: { fontSize: 20, fontWeight: '800' },
  sensorUnit: { fontSize: 11, fontWeight: '400' },
  sensorStatus: { fontSize: 10, marginTop: 4, fontWeight: '600' },
  muted: { color: C.muted, fontSize: 12 },
  alertBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2D1E00', padding: 10, borderRadius: 8, marginTop: 10, gap: 8 },
  alertText: { color: C.warning, fontSize: 13, flex: 1 },
});
