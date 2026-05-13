import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, TextInput,
} from 'react-native';
import api from '../services/api';

const fmt = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};
const statusColor = { present: '#1e40af', wfh: '#5b21b6', leave: '#c2410c' };
const statusBg    = { present: '#eff6ff', wfh: '#f5f3ff', leave: '#fff7ed' };

export default function AdminAttendance() {
  const [allAtt, setAllAtt] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get('/api/admin/dashboard/');
      setAllAtt(res.data.all_attendance || []);
    } catch (e) { console.log(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const filtered = allAtt
    .filter(a => filter === 'all' || a.status === filter)
    .filter(a => search.trim() === '' || a.username.toLowerCase().includes(search.trim().toLowerCase()));

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1e3a8a" /></View>;
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      

      <View style={styles.filterRow}>
        {['all', 'present', 'wfh', 'leave'].map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.pill, filter === f && styles.pillActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.pillText, filter === f && styles.pillTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Records ({filtered.length})</Text>
      <View style={styles.card}>
        {filtered.length === 0 ? (
          <Text style={styles.empty}>No records found.</Text>
        ) : filtered.slice(0, 200).map(a => (
          <View key={a.id} style={styles.row}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{a.username.slice(0, 2).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.username}>{a.username}</Text>
              <Text style={styles.muted}>{fmt(a.date)}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: statusBg[a.status] }]}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: statusColor[a.status] }}>
                {a.status.toUpperCase()}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll:         { flex: 1, backgroundColor: '#f5f7fb' },
  content:        { padding: 16 },
  searchInput:    { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 8, padding: 10, fontSize: 13, color: '#0f172a', marginBottom: 10 },
  filterRow:      { flexDirection: 'row', gap: 8, marginBottom: 12 },
  pill:           { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#fff' },
  pillActive:     { backgroundColor: '#1e3a8a', borderColor: '#1e3a8a' },
  pillText:       { fontSize: 12, fontWeight: '600', color: '#64748b' },
  pillTextActive: { color: '#fff' },
  sectionTitle:   { fontSize: 13, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  card:           { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', padding: 14, marginBottom: 24 },
  row:            { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  avatar:         { width: 36, height: 36, borderRadius: 18, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center' },
  avatarText:     { fontSize: 12, fontWeight: '700', color: '#1e40af' },
  username:       { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  muted:          { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  badge:          { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  empty:          { color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: 20 },
});