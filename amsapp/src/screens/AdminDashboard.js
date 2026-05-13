import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import api from '../services/api';

const fmt = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function AdminWFH() {
  const [pending, setPending] = useState([]);
  const [done, setDone] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get('/api/admin/dashboard/');
      setPending(res.data.pending_wfh || []);
      setDone(res.data.done_wfh || []);
    } catch (e) { console.log(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const showMsg = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const action = (pk, act) => {
    Alert.alert(
      act === 'approved' ? 'Approve WFH' : 'Reject WFH',
      'Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              const res = await api.post(`/api/admin/wfh/${pk}/${act}/`);
              showMsg(res.data.message);
              await load();
            } catch (e) { showMsg('Failed.'); }
          },
        },
      ]
    );
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1e3a8a" /></View>;
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      {!!msg && (
        <View style={styles.msgBox}><Text style={styles.msgText}>{msg}</Text></View>
      )}

      <Text style={styles.sectionTitle}>Pending WFH Requests ({pending.length})</Text>
      <View style={styles.card}>
        {pending.length === 0 ? (
          <Text style={styles.empty}>No pending WFH requests.</Text>
        ) : pending.map(r => (
          <View key={r.id} style={styles.row}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {r.username.slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.username}>{r.username}</Text>
              <Text style={styles.muted}>
                {fmt(r.start_date)} → {fmt(r.end_date)} · {r.num_days} day(s)
              </Text>
              <Text style={styles.muted}>{r.reason}</Text>
            </View>
            <View style={styles.actionBtns}>
              <TouchableOpacity
                style={styles.approveBtn}
                onPress={() => action(r.id, 'approved')}
              >
                <Text style={styles.approveBtnText}>✓</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rejectBtn}
                onPress={() => action(r.id, 'rejected')}
              >
                <Text style={styles.rejectBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 16 }]}>WFH History ({done.length})</Text>
      <View style={[styles.card, { marginBottom: 24 }]}>
        {done.length === 0 ? (
          <Text style={styles.empty}>No actioned WFH requests.</Text>
        ) : done.map(r => (
          <View key={r.id} style={styles.row}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {r.username.slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.username}>{r.username}</Text>
              <Text style={styles.muted}>
                {fmt(r.start_date)} → {fmt(r.end_date)} · {r.num_days} day(s)
              </Text>
              <Text style={styles.muted}>{r.reason}</Text>
              {r.actioned_by_username && (
                <Text style={styles.muted}>By: {r.actioned_by_username}</Text>
              )}
            </View>
            <View style={[styles.badge, {
              backgroundColor: r.status === 'approved' ? '#f0fdf4' : '#fef2f2'
            }]}>
              <Text style={{
                fontSize: 11, fontWeight: '700',
                color: r.status === 'approved' ? '#15803d' : '#dc2626'
              }}>
                {r.status.toUpperCase()}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1, backgroundColor: '#f5f7fb' },
  content: { padding: 16 },
  msgBox: {
    backgroundColor: '#f0fdf4', borderRadius: 8, padding: 10,
    marginBottom: 12, borderWidth: 1, borderColor: '#bbf7d0',
  },
  msgText: { color: '#15803d', fontWeight: '600', fontSize: 13 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  card: {
    backgroundColor: '#fff', borderRadius: 10, borderWidth: 1,
    borderColor: '#e2e8f0', padding: 14,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  avatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#f5f3ff',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 12, fontWeight: '700', color: '#5b21b6' },
  username: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  muted: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  empty: { color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: 20 },
  actionBtns: { flexDirection: 'row', gap: 6 },
  approveBtn: {
    backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0',
    borderRadius: 6, width: 34, height: 34, justifyContent: 'center', alignItems: 'center',
  },
  approveBtnText: { color: '#15803d', fontWeight: '700', fontSize: 15 },
  rejectBtn: {
    backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca',
    borderRadius: 6, width: 34, height: 34, justifyContent: 'center', alignItems: 'center',
  },
  rejectBtnText: { color: '#dc2626', fontWeight: '700', fontSize: 15 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
});