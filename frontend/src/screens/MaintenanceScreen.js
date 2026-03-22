import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, ActivityIndicator, SafeAreaView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { maintenanceAPI } from '../api/client';
import { useDevice } from '../context/DeviceContext';

const C = {
  bg: '#0A1628', card: '#0F2040', primary: '#00D4FF',
  text: '#E2E8F0', muted: '#718096', border: '#1A3050',
  success: '#68D391', warning: '#F6AD55', danger: '#FC8181',
};

const TYPE_COLORS = {
  filter_replace: C.warning,
  cleaning: C.primary,
  inspection: C.success,
  repair: C.danger,
  other: C.muted,
};

const TYPE_ICONS = {
  filter_replace: 'leaf',
  cleaning: 'sparkles',
  inspection: 'search',
  repair: 'build',
  other: 'ellipsis-horizontal',
};

const TYPES = ['filter_replace', 'cleaning', 'inspection', 'repair', 'other'];

const RecordCard = ({ record, onAck }) => {
  const color = TYPE_COLORS[record.type] || C.muted;
  const icon = TYPE_ICONS[record.type] || 'ellipsis-horizontal';
  const dateStr = new Date(record.createdAt).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <View style={[s.recordCard, { borderLeftColor: color }]}>
      <View style={s.recordHeader}>
        <View style={s.recordTitleRow}>
          <Ionicons name={icon} size={16} color={color} />
          <Text style={[s.recordType, { color }]}>
            {record.type.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
        {!record.acknowledged && (
          <TouchableOpacity style={s.ackBtn} onPress={() => onAck(record._id)}>
            <Text style={s.ackBtnText}>Acknowledge</Text>
          </TouchableOpacity>
        )}
        {record.acknowledged && (
          <View style={s.ackedBadge}>
            <Ionicons name="checkmark-circle" size={14} color={C.success} />
            <Text style={{ color: C.success, fontSize: 11 }}>Done</Text>
          </View>
        )}
      </View>
      <Text style={s.recordNotes}>{record.notes}</Text>
      <Text style={s.recordDate}>{dateStr}</Text>
    </View>
  );
};

export default function MaintenanceScreen() {
  const { deviceState } = useDevice();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState({ type: 'filter_replace', notes: '' });
  const [submitting, setSubmitting] = useState(false);

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

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Maintenance Log</Text>
          <TouchableOpacity style={s.addBtn} onPress={() => setModalVisible(true)}>
            <Ionicons name="add" size={20} color="#000" />
            <Text style={s.addBtnText}>Log</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Health Banner */}
        <View style={[s.banner, deviceState.filterHealthPct <= 20 && s.bannerDanger]}>
          <Ionicons name="leaf" size={20} color={deviceState.filterHealthPct <= 20 ? C.danger : C.success} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={s.bannerTitle}>Banana Peel Bio-Filter</Text>
            <Text style={s.bannerSub}>
              {deviceState.filterHealthPct}% remaining · {deviceState.filterCycleCount} cycles completed
            </Text>
          </View>
          {deviceState.filterHealthPct <= 20 && (
            <Ionicons name="warning" size={18} color={C.danger} />
          )}
        </View>

        {loading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator color={C.primary} />
          </View>
        ) : (
          <>
            {/* Pending */}
            {pending.length > 0 && (
              <>
                <Text style={s.sectionLabel}>Pending ({pending.length})</Text>
                {pending.map((r) => <RecordCard key={r._id} record={r} onAck={handleAck} />)}
              </>
            )}

            {/* Completed */}
            {completed.length > 0 && (
              <>
                <Text style={s.sectionLabel}>Completed</Text>
                {completed.map((r) => <RecordCard key={r._id} record={r} onAck={handleAck} />)}
              </>
            )}

            {records.length === 0 && (
              <View style={s.emptyBox}>
                <Ionicons name="construct-outline" size={48} color={C.muted} />
                <Text style={s.muted}>No maintenance records yet.</Text>
                <Text style={s.muted}>Tap "Log" to create one.</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Add Record Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Log Maintenance</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={C.muted} />
              </TouchableOpacity>
            </View>

            <Text style={s.label}>Type</Text>
            <View style={s.typeGrid}>
              {TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[s.typeBtn, form.type === t && { borderColor: TYPE_COLORS[t], backgroundColor: '#0A1628' }]}
                  onPress={() => setForm((f) => ({ ...f, type: t }))}
                >
                  <Ionicons name={TYPE_ICONS[t]} size={16} color={form.type === t ? TYPE_COLORS[t] : C.muted} />
                  <Text style={[s.typeBtnText, form.type === t && { color: TYPE_COLORS[t] }]}>
                    {t.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>Notes</Text>
            <TextInput
              style={s.textarea}
              placeholder="Describe the maintenance performed..."
              placeholderTextColor={C.muted}
              value={form.notes}
              onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#000" /> : <Text style={s.submitBtnText}>Save Record</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '800', color: C.text },
  addBtn: { flexDirection: 'row', backgroundColor: C.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center', gap: 4 },
  addBtnText: { color: '#000', fontWeight: '700', fontSize: 14 },
  banner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0D2A1A', borderRadius: 12, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: '#1A4A2A' },
  bannerDanger: { backgroundColor: '#2D1515', borderColor: '#4A1515' },
  bannerTitle: { color: C.text, fontWeight: '600', fontSize: 14 },
  bannerSub: { color: C.muted, fontSize: 12, marginTop: 2 },
  sectionLabel: { color: C.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  recordCard: { backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border, borderLeftWidth: 3 },
  recordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  recordTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  recordType: { fontSize: 12, fontWeight: '700' },
  recordNotes: { color: C.text, fontSize: 14, lineHeight: 20 },
  recordDate: { color: C.muted, fontSize: 11, marginTop: 8 },
  ackBtn: { backgroundColor: '#004D5E', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  ackBtnText: { color: C.primary, fontSize: 12, fontWeight: '600' },
  ackedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  loadingBox: { paddingVertical: 60, alignItems: 'center' },
  emptyBox: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  muted: { color: C.muted, fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: C.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, borderWidth: 1, borderColor: C.border },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: C.text },
  label: { color: C.muted, fontSize: 13, fontWeight: '500', marginBottom: 8 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  typeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: C.bg },
  typeBtnText: { color: C.muted, fontSize: 12, textTransform: 'capitalize' },
  textarea: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, color: C.text, fontSize: 14, minHeight: 100, marginBottom: 16 },
  submitBtn: { backgroundColor: C.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  submitBtnText: { color: '#000', fontWeight: '700', fontSize: 16 },
});
