import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import api from '../services/api';

const fmt = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const statusStyles = {
  approved: { bg: '#f0fdf4', color: '#15803d' },
  rejected: { bg: '#fef2f2', color: '#dc2626' },
  pending:  { bg: '#fef3c7', color: '#d97706' },
};

export default function RequestHistory() {
  const [tab, setTab] = useState('leave');
  const [leaves, setLeaves] = useState([]);
  const [wfhs, setWFHs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/api/dashboard/');
      setLeaves(res.data.leave_requests || []);
      setWFHs(res.data.wfh_requests || []);
    } catch (e) { console.log(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1e3a8a" /></View>;
  }

  const data = tab === 'leave' ? leaves : wfhs;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, tab === 'leave' && styles.tabActive]}
          onPress={() => setTab('leave')}
        >
          <Text style={[styles.tabText, tab === 'leave' && styles.tabTextActive]}>
            Leave ({leaves.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'wfh' && styles.tabActive]}
          onPress={() => setTab('wfh')}
        >
          <Text style={[styles.tabText, tab === 'wfh' && styles.tabTextActive]}>
            WFH ({wfhs.length})
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        {data.length === 0 ? (
          <Text style={styles.empty}>
            No {tab === 'leave' ? 'leave' : 'WFH'} requests yet.
          </Text>
        ) : data.map(r => {
          const st = statusStyles[r.status] || statusStyles.pending;
          return (
            <View key={r.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>
                  {fmt(r.start_date)} → {fmt(r.end_date)}
                </Text>
                <Text style={styles.rowSub}>
                  {r.reason} · {r.num_days} day(s)
                </Text>
                {r.actioned_by_username && (
                  <Text style={styles.rowMeta}>
                    {r.status === 'approved' ? '✓' : '✕'} by {r.actioned_by_username}
                  </Text>
                )}
              </View>
              <View style={[styles.badge, { backgroundColor: st.bg }]}>
                <Text style={[styles.badgeText, { color: st.color }]}>
                  {r.status.toUpperCase()}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1, backgroundColor: '#f5f7fb' },
  content: { padding: 16 },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  tab: {
    flex: 1, padding: 10, borderRadius: 8, borderWidth: 1.5,
    borderColor: '#e2e8f0', alignItems: 'center', backgroundColor: '#fff',
  },
  tabActive: { backgroundColor: '#1e3a8a', borderColor: '#1e3a8a' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  tabTextActive: { color: '#fff' },
  card: {
    backgroundColor: '#fff', borderRadius: 10, borderWidth: 1,
    borderColor: '#e2e8f0', padding: 14,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  rowTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  rowSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  rowMeta: { fontSize: 11, color: '#94a3b8', marginTop: 2, fontStyle: 'italic' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  empty: { color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: 20 },
});