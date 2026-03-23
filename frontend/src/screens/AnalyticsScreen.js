import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { sensorAPI } from '../api/client';
import { useTheme } from '../context/ThemeContext';
import LineChart from '../components/LineChart';

const RANGES = ['1h', '6h', '24h', '7d'];

const StatBadge = ({ label, value, unit, color, C }) => (
  <View style={{ alignItems: 'center' }}>
    <Text style={{ fontSize: 22, fontWeight: '800', color }}>
      {value ?? '--'}<Text style={{ fontSize: 12, fontWeight: '400' }}> {unit}</Text>
    </Text>
    <Text style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>{label}</Text>
  </View>
);

export default function AnalyticsScreen() {
  const { colors: C } = useTheme();
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

  const card = { backgroundColor: C.card, borderRadius: 14, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: C.border };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: C.text }}>Water Analytics</Text>
          <TouchableOpacity onPress={fetchData} style={{ padding: 8, backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.border }}>
            <Ionicons name="refresh" size={20} color={C.primary} />
          </TouchableOpacity>
        </View>

        {/* Range Selector */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {RANGES.map((r) => (
            <TouchableOpacity
              key={r}
              style={{ flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: range === r ? C.primary : C.card, alignItems: 'center', borderWidth: 1, borderColor: range === r ? C.primary : C.border }}
              onPress={() => setRange(r)}
            >
              <Text style={{ color: range === r ? '#000' : C.muted, fontSize: 13, fontWeight: '600' }}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={{ alignItems: 'center', paddingVertical: 60, gap: 12 }}>
            <ActivityIndicator color={C.primary} size="large" />
            <Text style={{ color: C.muted, fontSize: 13 }}>Loading sensor data...</Text>
          </View>
        ) : (
          <>
            {stats && (
              <View style={card}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 12 }}>Summary ({range})</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                  <StatBadge label="Avg pH" value={stats.ph?.avg?.toFixed(2)} unit="" color={C.ph} C={C} />
                  <StatBadge label="Avg Turbidity" value={stats.turbidity?.avg?.toFixed(1)} unit="NTU" color={C.turbidity} C={C} />
                  <StatBadge label="Avg TDS" value={stats.tds?.avg?.toFixed(0)} unit="ppm" color={C.tds} C={C} />
                </View>
              </View>
            )}

            {/* pH Chart */}
            <View style={card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <Ionicons name="flask" size={18} color={C.ph} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: C.text, marginLeft: 8 }}>pH Level</Text>
                <View style={{ marginLeft: 'auto', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: C.isDark ? '#2D1F5E' : '#EDE9FE' }}>
                  <Text style={{ color: C.ph, fontSize: 11 }}>Safe: 6.5 – 8.5</Text>
                </View>
              </View>
              <LineChart data={toChartData('ph')} color={C.ph} unit="" height={130} />
            </View>

            {/* Turbidity Chart */}
            <View style={card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <Ionicons name="eye" size={18} color={C.turbidity} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: C.text, marginLeft: 8 }}>Turbidity</Text>
                <View style={{ marginLeft: 'auto', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: C.isDark ? '#2D1E00' : '#FEEBC8' }}>
                  <Text style={{ color: C.turbidity, fontSize: 11 }}>Safe: ≤ 50 NTU</Text>
                </View>
              </View>
              <LineChart data={toChartData('turbidity')} color={C.turbidity} unit="NTU" height={130} />
            </View>

            {/* TDS Chart */}
            <View style={card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <Ionicons name="beaker" size={18} color={C.tds} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: C.text, marginLeft: 8 }}>Total Dissolved Solids</Text>
                <View style={{ marginLeft: 'auto', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: C.isDark ? '#0D2A1A' : '#C6F6D5' }}>
                  <Text style={{ color: C.tds, fontSize: 11 }}>Safe: ≤ 500 ppm</Text>
                </View>
              </View>
              <LineChart data={toChartData('tds')} color={C.tds} unit="ppm" height={130} />
            </View>

            {!readings.length && (
              <View style={{ alignItems: 'center', paddingVertical: 60, gap: 12 }}>
                <Ionicons name="stats-chart-outline" size={48} color={C.muted} />
                <Text style={{ color: C.muted, fontSize: 13 }}>No sensor data for this range.</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
