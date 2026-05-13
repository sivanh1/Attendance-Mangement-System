import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const WEB_API_URL = "http://127.0.0.1:8000";
const MOBILE_API_URL = "https://unshabbily-pseudoinspiring-alfonso.ngrok-free.dev";

const api = axios.create({
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const storage = {
  getItem: async (key) => await AsyncStorage.getItem(key),
  setItem: async (key, value) => await AsyncStorage.setItem(key, value),
  removeItem: async (key) => await AsyncStorage.removeItem(key),
  clear: async () => await AsyncStorage.clear(),
};

api.interceptors.request.use(async (config) => {


  let baseURL = Platform.OS === 'web' ? WEB_API_URL : MOBILE_API_URL;

  config.baseURL = baseURL;

  const token = await AsyncStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export { storage };
export default api;