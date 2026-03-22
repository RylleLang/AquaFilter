import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { sensorAPI } from '../api/client';
import LineChart from '../components/LineChart';

const C = {
  bg: '#0A1628', card: '#0F2040', primary: '#00D4FF',
  text: '#E2E8F0', muted: '#718096', border: '#1A3050',
  success: '#68D391', warning: '#F6AD55', danger: '#FC8181',
  ph: '#A78BFA', turbidity: '#F6AD55', tds: '#68D391',
};

const RANGES = ['1h', '6h', '24h', '7d'];

const StatBadge = ({ label, value, unit, color }) => (
  <View style={s.badge}>
    <Text style={[s.badgeValue, { color }]}>
      {value ?? '--'}<Text style={s.badgeUnit}> {unit}</Text>
    </Text>
    <Text style={s.badgeLabel}>{label}</Text>
  </View>
);

export default function AnalyticsScreen() {
  const [range, setRange] = useState('24h');
  const [readings, setReadings] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [histRes, statRes] = await Promise.all([
        sensorAPI.getHistory({ range, limit: 20 }),
        sensorAPI.getStats(range),
      ]);
      setReadings(histRes.data?.readings || []);
      setStats(statRes.data);
    } catch (err) {
      console.warn('Analytics fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toChartData = (field) =>
    [...readings].reverse().map((r) => ({ value: r[field] ?? 0, timestamp: r.timestamp }));

  const phData = toChartData('ph');
  const turbData = toChartData('turbidity');
  const tdsData = toChartData('tds');

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Water Analytics</Text>
          <TouchableOpacity onPress={fetchData} style={s.refreshBtn}>
            <Ionicons name="refresh" size={20} color={C.primary} />
          </TouchableOpacity>
        </View>

        {/* Range Selector */}
        <View style={s.rangeRow}>
          {RANGES.map((r) => (
            <TouchableOpacity
              key={r}
              style={[s.rangeBtn, range === r && s.rangeBtnActive]}
              onPress={() => setRange(r)}
            >
              <Text style={[s.rangeBtnText, range === r && s.rangeBtnTextActive]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator color={C.primary} size="large" />
            <Text style={s.muted}>Loading sensor data...</Text>
          </View>
        ) : (
          <>
            {/* Stats Summary */}
            {stats && (
              <View style={s.card}>
                <Text style={s.sectionTitle}>Summary ({range})</Text>
                <View style={s.badgeRow}>
                  <StatBadge label="Avg pH" value={stats.ph?.avg?.toFixed(2)} unit="" color={C.ph} />
                  <StatBadge label="Avg Turbidity" value={stats.turbidity?.avg?.toFixed(1)} unit="NTU" color={C.turbidity} />
                  <StatBadge label="Avg TDS" value={stats.tds?.avg?.toFixed(0)} unit="ppm" color={C.tds} />
                </View>
              </View>
            )}

            {/* pH Chart */}
            <View style={s.card}>
              <View style={s.chartHeader}>
                <Ionicons name="flask" size={18} color={C.ph} />
                <Text style={[s.sectionTitle, { marginLeft: 8 }]}>pH Level</Text>
                <View style={[s.tag, { backgroundColor: '#2D1F5E' }]}>
                  <Text style={{ color: C.ph, fontSize: 11 }}>Safe: 6.5 – 8.5</Text>
                </View>
              </View>
              <LineChart data={phData} color={C.ph} unit="" height={130} />
            </View>

            {/* Turbidity Chart */}
            <View style={s.card}>
              <View style={s.chartHeader}>
                <Ionicons name="eye" size={18} color={C.turbidity} />
                <Text style={[s.sectionTitle, { marginLeft: 8 }]}>Turbidity</Text>
                <View style={[s.tag, { backgroundColor: '#2D1E00' }]}>
                  <Text style={{ color: C.turbidity, fontSize: 11 }}>Safe: ≤ 50 NTU</Text>
                </View>
              </View>
              <LineChart data={turbData} color={C.turbidity} unit="NTU" height={130} />
            </View>

            {/* TDS Chart */}
            <View style={s.card}>
              <View style={s.chartHeader}>
                <Ionicons name="beaker" size={18} color={C.tds} />
                <Text style={[s.sectionTitle, { marginLeft: 8 }]}>Total Dissolved Solids</Text>
                <View style={[s.tag, { backgroundColor: '#0D2A1A' }]}>
                  <Text style={{ color: C.tds, fontSize: 11 }}>Safe: ≤ 500 ppm</Text>
                </View>
              </View>
              <LineChart data={tdsData} color={C.tds} unit="ppm" height={130} />
            </View>

            {!readings.length && (
              <View style={s.emptyBox}>
                <Ionicons name="stats-chart-outline" size={48} color={C.muted} />
                <Text style={s.muted}>No sensor data for this range.</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '800', color: C.text },
  refreshBtn: { padding: 8, backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.border },
  rangeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  rangeBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: C.card, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  rangeBtnActive: { backgroundColor: '#004D5E', borderColor: C.primary },
  rangeBtnText: { color: C.muted, fontSize: 13, fontWeight: '600' },
  rangeBtnTextActive: { color: C.primary },
  card: { backgroundColor: C.card, borderRadius: 14, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: C.border },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: C.text },
  chartHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  tag: { marginLeft: 'auto', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 12 },
  badge: { alignItems: 'center' },
  badgeValue: { fontSize: 22, fontWeight: '800' },
  badgeUnit: { fontSize: 12, fontWeight: '400' },
  badgeLabel: { color: C.muted, fontSize: 11, marginTop: 4 },
  loadingBox: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyBox: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  muted: { color: C.muted, fontSize: 13 },
});
