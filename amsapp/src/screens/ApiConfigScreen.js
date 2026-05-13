import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ApiConfigScreen({ navigation }) {
  const [url, setUrl] = useState('');

  const saveUrl = async () => {
    if (!url) return;
    await AsyncStorage.setItem('API_URL', url);
    navigation.replace('Login'); 
  };

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Enter API URL"
        value={url}
        onChangeText={setUrl}
        style={styles.input}
      />
      <Button title="Save & Continue" onPress={saveUrl} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  input: {
    borderWidth: 1,
    padding: 10,
    marginBottom: 20,
    borderRadius: 5,
  },
});