import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, KeyboardAvoidingView,
  Platform,
} from 'react-native';
import api from '../services/api';

let DateTimePicker = null;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

function DatePickerField({ label, value, onChange }) {
  const [showPicker, setShowPicker] = useState(false);
  const formatted = value ? value.toISOString().split('T')[0] : '';

  if (Platform.OS === 'web') {
    return (
      <View>
        <Text style={styles.label}>{label}</Text>
        <input
          type="date"
          value={formatted}
          onChange={(e) => {
            if (e.target.value) onChange(new Date(e.target.value + 'T00:00:00'));
          }}
          style={{
            border: '1.5px solid #e2e8f0',
            borderRadius: 8,
            padding: '10px 12px',
            fontSize: 14,
            color: formatted ? '#0f172a' : '#94a3b8',
            fontWeight: '600',
            width: '100%',
            boxSizing: 'border-box',
            marginTop: 2,
            fontFamily: 'inherit',
            outline: 'none',
            cursor: 'pointer',
            minHeight: 42,
          }}
        />
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.input}
        onPress={() => setShowPicker(true)}
      >
        <Text style={{ color: formatted ? '#0f172a' : '#94a3b8', fontSize: 14, fontWeight: '600' }}>
          {formatted || 'Select Date'}
        </Text>
      </TouchableOpacity>
      {showPicker && DateTimePicker && (
        <DateTimePicker
          value={value || new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowPicker(false);
            if (selectedDate) onChange(selectedDate);
          }}
        />
      )}
    </View>
  );
}

export default function ApplyWFH() {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [reason, setReason] = useState('WFH - Personal');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  const reasons = ['WFH - Personal', 'WFH - Health', 'WFH - Weather', 'WFH - Other'];

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 4000);
  };

  const formatDate = (date) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  const calcDays = () => {
    if (!startDate || !endDate) return null;
    if (endDate < startDate) return null;
    return Math.round((endDate - startDate) / 86400000) + 1;
  };

  const submit = async () => {
    if (!startDate || !endDate) {
      showMsg('Please select both dates.', 'error');
      return;
    }
    const days = calcDays();
    if (!days) {
      showMsg('End date must be after start date.', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/api/submit-wfh/', {
        start_date: formatDate(startDate),
        end_date: formatDate(endDate),
        reason,
      });
      showMsg(res.data.message);
      setStartDate(null);
      setEndDate(null);
    } catch (e) {
      showMsg(e.response?.data?.error || 'Failed to submit.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const days = calcDays();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

        {!!msg.text && (
          <View style={[styles.msgBox, msg.type === 'error' && styles.msgBoxError]}>
            <Text style={[styles.msgText, msg.type === 'error' && styles.msgTextError]}>
              {msg.text}
            </Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Apply for Work From Home</Text>

      
          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <DatePickerField
                label="From"
                value={startDate}
                onChange={setStartDate}
              />
            </View>
            <View style={styles.dateField}>
              <DatePickerField
                label="To"
                value={endDate}
                onChange={setEndDate}
              />
            </View>
          </View>

          {days && (
            <View style={styles.daysChip}>
              <Text style={styles.daysChipText}>
                {days} day{days > 1 ? 's' : ''} selected
              </Text>
            </View>
          )}

          <Text style={styles.label}>Reason</Text>
          {reasons.map(r => (
            <TouchableOpacity
              key={r}
              style={[styles.radioRow, reason === r && styles.radioSelected]}
              onPress={() => setReason(r)}
            >
              <View style={[styles.radioDot, reason === r && styles.radioDotActive]} />
              <Text style={[styles.radioText, reason === r && styles.radioTextActive]}>
                {r}
              </Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.submitBtn} onPress={submit} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitBtnText}>Submit WFH Request</Text>
            }
          </TouchableOpacity>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll:          { flex: 1, backgroundColor: '#f5f7fb' },
  content:         { padding: 16 },
  msgBox:          { backgroundColor: '#f0fdf4', borderRadius: 8, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#bbf7d0' },
  msgBoxError:     { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  msgText:         { color: '#15803d', fontWeight: '600', fontSize: 13 },
  msgTextError:    { color: '#dc2626' },
  card:            { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 18 },
  cardTitle:       { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 18 },
  dateRow:         { flexDirection: 'row', gap: 10 },
  dateField:       { flex: 1 },
  label:           { fontSize: 12, fontWeight: '600', color: '#64748b', marginBottom: 6, marginTop: 12 },
  input:           { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 8, padding: 11, minHeight: 42, justifyContent: 'center' },
  daysChip:        { backgroundColor: '#f5f3ff', borderWidth: 1, borderColor: '#ddd6fe', borderRadius: 6, padding: 8, marginTop: 10, alignItems: 'center' },
  daysChipText:    { color: '#5b21b6', fontWeight: '700', fontSize: 13 },
  radioRow:        { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, borderWidth: 1.5, borderColor: '#e2e8f0', marginTop: 6 },
  radioSelected:   { borderColor: '#1e3a8a', backgroundColor: '#eff6ff' },
  radioDot:        { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#cbd5e1', marginRight: 10 },
  radioDotActive:  { borderColor: '#1e3a8a', backgroundColor: '#1e3a8a' },
  radioText:       { fontSize: 14, color: '#64748b', fontWeight: '500' },
  radioTextActive: { color: '#1e3a8a', fontWeight: '600' },
  submitBtn:       { backgroundColor: '#1e3a8a', borderRadius: 8, padding: 13, alignItems: 'center', marginTop: 20 },
  submitBtnText:   { color: '#fff', fontWeight: '700', fontSize: 15 },
});