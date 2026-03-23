import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Modal, TextInput, ActivityIndicator, SafeAreaView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { maintenanceAPI } from '../api/client';
import { useDevice } from '../context/DeviceContext';
import { useTheme } from '../context/ThemeContext';

const TYPE_ICONS = {
  filter_replace: 'leaf',
  cleaning: 'sparkles',
  inspection: 'search',
  repair: 'build',
  other: 'ellipsis-horizontal',
};

const TYPES = ['filter_replace', 'cleaning', 'inspection', 'repair', 'other'];

const RecordCard = ({ record, onAck, C }) => {
  const TYPE_COLORS = {
    filter_replace: C.warning, cleaning: C.primary,
    inspection: C.success, repair: C.danger, other: C.muted,
  };
  const color = TYPE_COLORS[record.type] || C.muted;
  const icon = TYPE_ICONS[record.type] || 'ellipsis-horizontal';
  const dateStr = new Date(record.createdAt).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <View style={{ backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border, borderLeftWidth: 3, borderLeftColor: color }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name={icon} size={16} color={color} />
          <Text style={{ fontSize: 12, fontWeight: '700', color }}>{record.type.replace('_', ' ').toUpperCase()}</Text>
        </View>
        {!record.acknowledged ? (
          <TouchableOpacity style={{ backgroundColor: C.ackBtnBg, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 }} onPress={() => onAck(record._id)}>
            <Text style={{ color: C.primary, fontSize: 12, fontWeight: '600' }}>Acknowledge</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="checkmark-circle" size={14} color={C.success} />
            <Text style={{ color: C.success, fontSize: 11 }}>Done</Text>
          </View>
        )}
      </View>
      <Text style={{ color: C.text, fontSize: 14, lineHeight: 20 }}>{record.notes}</Text>
      <Text style={{ color: C.muted, fontSize: 11, marginTop: 8 }}>{dateStr}</Text>
    </View>
  );
};

export default function MaintenanceScreen() {
  const { deviceState } = useDevice();
  const { colors: C } = useTheme();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState({ type: 'filter_replace', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  const TYPE_COLORS = {
    filter_replace: C.warning, cleaning: C.primary,
    inspection: C.success, repair: C.danger, other: C.muted,
  };

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await maintenanceAPI.getAll();
      setRecords(data.records || []);
    } catch (err) {
      console.warn('Maintenance fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const handleAck = async (id) => {
    try {
      await maintenanceAPI.acknowledge(id);
      setRecords((prev) => prev.map((r) => r._id === id ? { ...r, acknowledged: true } : r));
    } catch {
      Alert.alert('Error', 'Could not acknowledge record.');
    }
  };

  const handleSubmit = async () => {
    if (!form.notes.trim()) return Alert.alert('Validation', 'Please enter maintenance notes.');
    setSubmitting(true);
    try {
      const { data } = await maintenanceAPI.create(form);
      setRecords((prev) => [data.record, ...prev]);
      setModalVisible(false);
      setForm({ type: 'filter_replace', notes: '' });
    } catch {
      Alert.alert('Error', 'Could not save maintenance record.');
    } finally {
      setSubmitting(false);
    }
  };

  const pending = records.filter((r) => !r.acknowledged);
  const completed = records.filter((r) => r.acknowledged);
  const card = { backgroundColor: C.card, borderRadius: 14, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: C.border };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: C.text }}>Maintenance Log</Text>
          <TouchableOpacity style={{ flexDirection: 'row', backgroundColor: C.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center', gap: 4 }} onPress={() => setModalVisible(true)}>
            <Ionicons name="add" size={20} color="#000" />
            <Text style={{ color: '#000', fontWeight: '700', fontSize: 14 }}>Log</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Health Banner */}
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: deviceState.filterHealthPct <= 20 ? C.alertBg : C.filterBannerBg, borderRadius: 12, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: deviceState.filterHealthPct <= 20 ? C.border : C.filterBannerBorder }}>
          <Ionicons name="leaf" size={20} color={deviceState.filterHealthPct <= 20 ? C.danger : C.success} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={{ color: C.text, fontWeight: '600', fontSize: 14 }}>Banana Peel Bio-Filter</Text>
            <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
              {deviceState.filterHealthPct}% remaining · {deviceState.filterCycleCount} cycles completed
            </Text>
          </View>
          {deviceState.filterHealthPct <= 20 && <Ionicons name="warning" size={18} color={C.danger} />}
        </View>

        {loading ? (
          <View style={{ paddingVertical: 60, alignItems: 'center' }}>
            <ActivityIndicator color={C.primary} />
          </View>
        ) : (
          <>
            {pending.length > 0 && (
              <>
                <Text style={{ color: C.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Pending ({pending.length})</Text>
                {pending.map((r) => <RecordCard key={r._id} record={r} onAck={handleAck} C={C} />)}
              </>
            )}
            {completed.length > 0 && (
              <>
                <Text style={{ color: C.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Completed</Text>
                {completed.map((r) => <RecordCard key={r._id} record={r} onAck={handleAck} C={C} />)}
              </>
            )}
            {records.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 60, gap: 8 }}>
                <Ionicons name="construct-outline" size={48} color={C.muted} />
                <Text style={{ color: C.muted, fontSize: 13 }}>No maintenance records yet.</Text>
                <Text style={{ color: C.muted, fontSize: 13 }}>Tap "Log" to create one.</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Add Record Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: C.modalOverlay, justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: C.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, borderWidth: 1, borderColor: C.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: C.text }}>Log Maintenance</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={C.muted} />
              </TouchableOpacity>
            </View>

            <Text style={{ color: C.muted, fontSize: 13, fontWeight: '500', marginBottom: 8 }}>Type</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: form.type === t ? TYPE_COLORS[t] : C.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: form.type === t ? C.inputBg : C.bg }}
                  onPress={() => setForm((f) => ({ ...f, type: t }))}
                >
                  <Ionicons name={TYPE_ICONS[t]} size={16} color={form.type === t ? TYPE_COLORS[t] : C.muted} />
                  <Text style={{ color: form.type === t ? TYPE_COLORS[t] : C.muted, fontSize: 12, textTransform: 'capitalize' }}>
                    {t.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ color: C.muted, fontSize: 13, fontWeight: '500', marginBottom: 8 }}>Notes</Text>
            <TextInput
              style={{ backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, color: C.text, fontSize: 14, minHeight: 100, marginBottom: 16, textAlignVertical: 'top' }}
              placeholder="Describe the maintenance performed..."
              placeholderTextColor={C.muted}
              value={form.notes}
              onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
              multiline
              numberOfLines={4}
            />

            <TouchableOpacity style={{ backgroundColor: C.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center' }} onPress={handleSubmit} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#000" /> : <Text style={{ color: '#000', fontWeight: '700', fontSize: 16 }}>Save Record</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
