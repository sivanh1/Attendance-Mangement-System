import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, ScrollView,
} from 'react-native';
import { useAuth } from '../services/AuthContext';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) { setError('All fields required.'); return; }
    setError(''); setLoading(true);
    try {
      await login(username.trim(), password);
    } catch (e) {
      setError(e.response?.data?.error || 'Login failed.');
    } finally { setLoading(false); }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>AMS</Text>
        <Text style={styles.tagline}>Attendance Management System</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.title}>Sign In</Text>

        {!!error && <Text style={styles.error}>{error}</Text>}

        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          placeholder="Enter username"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Enter password"
          onSubmitEditing={handleLogin}
        />

        <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Sign In</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.link}>Don't have an account? Register</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#f0f4ff', alignItems: 'center', justifyContent: 'center', padding: 20 },
  header: { backgroundColor: '#1e3a8a', width: '100%', maxWidth: 380, padding: 24, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  logo: { fontSize: 24, fontWeight: '800', color: '#fff' },
  tagline: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 3 },
  form: { backgroundColor: '#fff', width: '100%', maxWidth: 380, padding: 24, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  title: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  error: { backgroundColor: '#fef2f2', color: '#dc2626', padding: 10, borderRadius: 6, marginBottom: 12, fontSize: 13 },
  label: { fontSize: 12, fontWeight: '600', color: '#64748b', marginBottom: 4 },
  input: { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 8, padding: 10, fontSize: 14, marginBottom: 14, color: '#0f172a' },
  btn: { backgroundColor: '#1e3a8a', borderRadius: 8, padding: 13, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  link: { textAlign: 'center', marginTop: 16, color: '#1e3a8a', fontWeight: '600', fontSize: 13 },
});
