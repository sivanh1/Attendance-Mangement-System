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
  const [tab, setTab] = useState('wfh'); 

  const [pendingWFH, setPendingWFH] = useState([]);
  const [doneWFH, setDoneWFH] = useState([]);
  const [pendingLeave, setPendingLeave] = useState([]);
  const [doneLeave, setDoneLeave] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  const load = useCallback(async () => {
    try {
      const res = await api.get('/api/admin/dashboard/');
      setPendingWFH(res.data.pending_wfh || []);
      setDoneWFH(res.data.all_wfh || []);
      setPendingLeave(res.data.pending_leaves || []);
      setDoneLeave(res.data.done_leaves || []);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 3000);
  };

  const actionWFH = (pk, act) => {
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
              showMsg(res.data.message || `WFH ${act}.`);
              await load();
            } catch (e) { showMsg('Failed.', 'error'); }
          },
        },
      ]
    );
  };

  const actionLeave = (pk, act) => {
    Alert.alert(
      act === 'approved' ? 'Approve Leave' : 'Reject Leave',
      'Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              const res = await api.post(`/api/admin/leave/${pk}/${act}/`);
              showMsg(res.data.message || `Leave ${act}.`);
              await load();
            } catch (e) { showMsg('Failed.', 'error'); }
          },
        },
      ]
    );
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1e3a8a" /></View>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f7fb' }}>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'wfh' && styles.tabBtnActive]}
          onPress={() => setTab('wfh')}
        >
          <Text style={[styles.tabText, tab === 'wfh' && styles.tabTextActive]}>
            WFH {pendingWFH.length > 0 ? `(${pendingWFH.length})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'leave' && styles.tabBtnActive]}
          onPress={() => setTab('leave')}
        >
          <Text style={[styles.tabText, tab === 'leave' && styles.tabTextActive]}>
            Leave {pendingLeave.length > 0 ? `(${pendingLeave.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {!!msg.text && (
        <View style={[styles.msgBox, msg.type === 'error' && styles.msgBoxError]}>
          <Text style={[styles.msgText, msg.type === 'error' && styles.msgTextError]}>
            {msg.text}
          </Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >

        {tab === 'wfh' && (
          <>
            <Text style={styles.sectionTitle}>
              Pending WFH Requests ({pendingWFH.length})
            </Text>
            <View style={styles.card}>
              {pendingWFH.length === 0 ? (
                <Text style={styles.empty}>No pending WFH requests.</Text>
              ) : pendingWFH.map(r => (
                <View key={r.id} style={styles.row}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {r.username.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.username}>{r.username}</Text>

                    
                    <Text style={styles.muted}>
                      {fmt(r.start_date)} → {fmt(r.end_date)}
                    </Text>

                    <Text style={styles.muted}>
                      {r.reason} · {r.num_days} day(s)
                    </Text>
                  </View>
                  <View style={styles.actionBtns}>
                    <TouchableOpacity style={styles.approveBtn} onPress={() => actionWFH(r.id, 'approved')}>
                      <Text style={styles.approveBtnText}>✓</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.rejectBtn} onPress={() => actionWFH(r.id, 'rejected')}>
                      <Text style={styles.rejectBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>

            {doneWFH.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: 16 }]}>
                  WFH History ({doneWFH.length})
                </Text>
                <View style={[styles.card, { marginBottom: 24 }]}>
                  {doneWFH.map(r => (
                    <View key={r.id} style={styles.row}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                          {r.username.slice(0, 2).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.username}>{r.username}</Text>
                        <Text style={styles.muted}>{fmt(r.date)}</Text>
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
                          color: r.status === 'approved' ? '#15803d' : '#dc2626',
                        }}>
                          {r.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}
          </>
        )}


        {tab === 'leave' && (
          <>
            <Text style={styles.sectionTitle}>
              Pending Leave Requests ({pendingLeave.length})
            </Text>
            <View style={styles.card}>
              {pendingLeave.length === 0 ? (
                <Text style={styles.empty}>No pending leave requests.</Text>
              ) : pendingLeave.map(r => (
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
                    <TouchableOpacity style={styles.approveBtn} onPress={() => actionLeave(r.id, 'approved')}>
                      <Text style={styles.approveBtnText}>✓</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.rejectBtn} onPress={() => actionLeave(r.id, 'rejected')}>
                      <Text style={styles.rejectBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>

            {doneLeave.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: 16 }]}>
                  Leave History ({doneLeave.length})
                </Text>
                <View style={[styles.card, { marginBottom: 24 }]}>
                  {doneLeave.map(r => (
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
                          color: r.status === 'approved' ? '#15803d' : '#dc2626',
                        }}>
                          {r.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}
          </>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16 },
  tabBar: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  tabBtn: {
    flex: 1, paddingVertical: 14, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: '#1e3a8a' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
  tabTextActive: { color: '#1e3a8a' },
  msgBox: {
    backgroundColor: '#f0fdf4', padding: 10, marginHorizontal: 16,
    marginTop: 10, borderRadius: 8, borderWidth: 1, borderColor: '#bbf7d0',
  },
  msgBoxError: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  msgText: { color: '#15803d', fontWeight: '600', fontSize: 13 },
  msgTextError: { color: '#dc2626' },
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