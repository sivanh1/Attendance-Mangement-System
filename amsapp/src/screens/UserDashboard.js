import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Modal, Platform,
} from 'react-native';
import api from '../services/api';

let DateTimePicker = null;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

const fmt = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const statusColor = { present: '#1e40af', wfh: '#5b21b6', leave: '#c2410c' };
const statusBg   = { present: '#eff6ff', wfh: '#f5f3ff', leave: '#fff7ed' };

function DatePickerField({ label, value, onChange }) {
  const [showPicker, setShowPicker] = useState(false);
  const formatted = value?.toISOString().split('T')[0];

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
            color: '#0f172a',
            fontWeight: '600',
            width: '100%',
            boxSizing: 'border-box',
            marginTop: 2,
            fontFamily: 'inherit',
            outline: 'none',
            cursor: 'pointer',
          }}
        />
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.dateBtn}
        onPress={() => setShowPicker(true)}
      >
        <Text style={styles.dateBtnText}>{formatted}</Text>
      </TouchableOpacity>
      {showPicker && DateTimePicker && (
        <DateTimePicker
          value={value}
          mode="date"
          display="spinner"
          onChange={(e, date) => {
            setShowPicker(false);
            if (date) onChange(date);
          }}
        />
      )}
    </View>
  );
}

export default function UserDashboard() {
  const [data, setData]             = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected]     = useState('present');
  const [marking, setMarking]       = useState(false);
  const [msg, setMsg]               = useState({ text: '', type: '' });
  const [leaveModal, setLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm]   = useState({
    start_date: new Date(),
    end_date: new Date(),
    reason: 'Casual Leave',
  });
  const [leaveLoading, setLeaveLoading] = useState(false);

  const formatDate = (date) => date?.toISOString().split('T')[0];

  const load = useCallback(async () => {
    try {
      const res = await api.get('/api/dashboard/');
      setData(res.data);
    } catch (e) { console.log(e); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 3000);
  };

  const markAttendance = async () => {
    setMarking(true);
    const status = (!data.attendance_today && data.has_approved_wfh_today) ? 'wfh' : selected;
    try {
      const res = await api.post('/api/mark-attendance/', { status });
      showMsg(res.data.message);
      await load();
    } catch (e) { showMsg(e.response?.data?.error || 'Failed.', 'error'); }
    finally { setMarking(false); }
  };

  const submitLeave = async () => {
    if (!leaveForm.start_date || !leaveForm.end_date) { showMsg('Enter dates.', 'error'); return; }
    setLeaveLoading(true);
    try {
      const res = await api.post('/api/submit-leave/', {
        start_date: formatDate(leaveForm.start_date),
        end_date: formatDate(leaveForm.end_date),
        reason: leaveForm.reason,
      });
      showMsg(res.data.message);
      setLeaveModal(false);
      setLeaveForm({ start_date: new Date(), end_date: new Date(), reason: 'Casual Leave' });
      await load();
    } catch (e) { showMsg(e.response?.data?.error || 'Failed.', 'error'); }
    finally { setLeaveLoading(false); }
  };

  if (!data) return <View style={styles.loading}><ActivityIndicator size="large" color="#1e3a8a" /></View>;

  const att      = data.attendance_today;
  const forceWFH = !att && data.has_approved_wfh_today;

  const sortedAttendance = [...(data.attendance_records || [])]
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const sortedLeave = [...(data.leave_requests || [])]
    .sort((a, b) => new Date(b.start_date) - new Date(a.start_date));

  const sortedWFH = [...(data.wfh_requests || [])]
    .sort((a, b) => new Date(b.start_date) - new Date(a.start_date));

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      {!!msg.text && (
        <View style={[styles.msgBox, msg.type === 'error' && styles.msgBoxError]}>
          <Text style={[styles.msgText, msg.type === 'error' && styles.msgTextError]}>
            {msg.text}
          </Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardLabel}>TODAY ATTENDANCE</Text>

        {att ? (
          <View style={[styles.statusBox, { backgroundColor: statusBg[att.status] }]}>
            <Text style={[styles.statusText, { color: statusColor[att.status] }]}>
              {att.status === 'present' ? 'Present' : att.status === 'wfh' ? 'Work From Home' : 'On Leave'}
            </Text>
          </View>

        ) : data.has_approved_leave_today ? (
          <View style={[styles.statusBox, { backgroundColor: '#fff7ed' }]}>
            <Text style={[styles.statusText, { color: '#c2410c' }]}>On Approved Leave</Text>
            <Text style={styles.timeText}>Attendance is disabled for today</Text>
          </View>

        ) : (
          <View>
            {forceWFH ? (
              <View style={[styles.statusBox, { backgroundColor: '#f5f3ff', marginBottom: 12 }]}>
                <Text style={{ fontSize: 12, color: '#5b21b6', fontWeight: '600' }}>
                  Approved WFH — attendance will be marked as WFH
                </Text>
              </View>
            ) : (
              <View style={styles.optRow}>
                {['present', 'wfh'].map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.opt, selected === s && styles.optSelected]}
                    onPress={() => setSelected(s)}
                  >
                    <Text style={[styles.optText, selected === s && styles.optTextSelected]}>
                      {s === 'present' ? 'In Office' : 'WFH'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <TouchableOpacity style={styles.markBtn} onPress={markAttendance} disabled={marking}>
              {marking
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.markBtnText}>Mark Attendance</Text>}
            </TouchableOpacity>
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.leaveBtn} onPress={() => setLeaveModal(true)}>
        <Text style={styles.leaveBtnText}>Request Leave</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>My Leave Requests</Text>
      <View style={styles.card}>
        {sortedLeave.length === 0 ? (
          <Text style={styles.empty}>No leave requests yet.</Text>
        ) : sortedLeave.slice(0, 5).map(r => (
          <View key={r.id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowDate}>{fmt(r.start_date)} → {fmt(r.end_date)}</Text>
              <Text style={styles.rowSub}>{r.reason} · {r.num_days} day(s)</Text>
            </View>
            <View style={[styles.badge, {
              backgroundColor:
                r.status === 'approved' ? '#f0fdf4' :
                r.status === 'rejected' ? '#fef2f2' : '#fef3c7',
            }]}>
              <Text style={{
                fontSize: 11, fontWeight: '700',
                color:
                  r.status === 'approved' ? '#15803d' :
                  r.status === 'rejected' ? '#dc2626' : '#d97706',
              }}>
                {r.status.toUpperCase()}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {sortedWFH.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>My WFH Requests</Text>
          <View style={styles.card}>
            {sortedWFH.slice(0, 5).map(r => (
              <View key={r.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowDate}>{fmt(r.start_date)} → {fmt(r.end_date)}</Text>
                  <Text style={styles.rowSub}>{r.reason}</Text>
                </View>
                <View style={[styles.badge, {
                  backgroundColor:
                    r.status === 'approved' ? '#f0fdf4' :
                    r.status === 'rejected' ? '#fef2f2' : '#fef3c7',
                }]}>
                  <Text style={{
                    fontSize: 11, fontWeight: '700',
                    color:
                      r.status === 'approved' ? '#15803d' :
                      r.status === 'rejected' ? '#dc2626' : '#d97706',
                  }}>
                    {r.status.toUpperCase()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}
      <Text style={styles.sectionTitle}>My Attendance</Text>
      <View style={styles.card}>
        {sortedAttendance.length === 0 ? (
          <Text style={styles.empty}>No records yet.</Text>
        ) : sortedAttendance.slice(0, 10).map(a => (
          <View key={a.id} style={styles.row}>
            <Text style={styles.rowDate}>{fmt(a.date)}</Text>
            <View style={[styles.badge, { backgroundColor: statusBg[a.status] }]}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: statusColor[a.status] }}>
                {a.status.toUpperCase()}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <Modal visible={leaveModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Request Leave</Text>

            <DatePickerField
              label="From"
              value={leaveForm.start_date}
              onChange={(date) => setLeaveForm({ ...leaveForm, start_date: date })}
            />

            <DatePickerField
              label="To"
              value={leaveForm.end_date}
              onChange={(date) => setLeaveForm({ ...leaveForm, end_date: date })}
            />

            <Text style={styles.label}>Type</Text>
            {['Casual Leave', 'Sick Leave'].map(opt => (
              <TouchableOpacity
                key={opt}
                style={[styles.radioRow, leaveForm.reason === opt && styles.radioSelected]}
                onPress={() => setLeaveForm({ ...leaveForm, reason: opt })}
              >
                <Text style={{ color: leaveForm.reason === opt ? '#1e3a8a' : '#64748b', fontWeight: '600' }}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[styles.markBtn, { marginTop: 16 }]}
              onPress={submitLeave}
              disabled={leaveLoading}
            >
              {leaveLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.markBtnText}>Submit</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setLeaveModal(false)}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loading:         { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll:          { flex: 1, backgroundColor: '#f5f7fb' },
  content:         { padding: 16 },
  msgBox:          { backgroundColor: '#f0fdf4', borderRadius: 8, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#bbf7d0' },
  msgBoxError:     { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  msgText:         { color: '#15803d', fontWeight: '600', fontSize: 13 },
  msgTextError:    { color: '#dc2626' },
  card:            { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', padding: 14, marginBottom: 12 },
  cardLabel:       { fontSize: 10, fontWeight: '700', color: '#94a3b8', letterSpacing: 1, marginBottom: 12 },
  statusBox:       { borderRadius: 8, padding: 14 },
  statusText:      { fontSize: 18, fontWeight: '800' },
  timeText:        { fontSize: 12, color: '#64748b', marginTop: 4 },
  optRow:          { flexDirection: 'row', gap: 10, marginBottom: 12 },
  opt:             { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1.5, borderColor: '#e2e8f0', alignItems: 'center' },
  optSelected:     { backgroundColor: '#1e3a8a', borderColor: '#1e3a8a' },
  optText:         { fontSize: 13, fontWeight: '600', color: '#64748b' },
  optTextSelected: { color: '#fff' },
  markBtn:         { backgroundColor: '#1e3a8a', borderRadius: 8, padding: 12, alignItems: 'center' },
  markBtnText:     { color: '#fff', fontWeight: '700', fontSize: 14 },
  leaveBtn:        { backgroundColor: '#eff6ff', borderWidth: 1.5, borderColor: '#bfdbfe', borderRadius: 8, padding: 12, alignItems: 'center', marginBottom: 16 },
  leaveBtnText:    { color: '#1e40af', fontWeight: '700', fontSize: 14 },
  sectionTitle:    { fontSize: 13, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  row:             { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  rowDate:         { fontSize: 13, fontWeight: '600', color: '#0f172a', flex: 1 },
  rowSub:          { fontSize: 12, color: '#64748b', marginTop: 2 },
  badge:           { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  empty:           { color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: 16 },
  modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard:       { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20 },
  modalTitle:      { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  label:           { fontSize: 12, fontWeight: '600', color: '#64748b', marginBottom: 4, marginTop: 10 },
  dateBtn:         { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 8, padding: 10, marginTop: 2 },
  dateBtnText:     { fontSize: 14, color: '#0f172a', fontWeight: '600' },
  radioRow:        { padding: 11, borderRadius: 8, borderWidth: 1.5, borderColor: '#e2e8f0', marginTop: 6 },
  radioSelected:   { borderColor: '#1e3a8a', backgroundColor: '#eff6ff' },
  cancelBtn:       { marginTop: 10, padding: 12, alignItems: 'center' },
  cancelBtnText:   { color: '#64748b', fontWeight: '600' },
});