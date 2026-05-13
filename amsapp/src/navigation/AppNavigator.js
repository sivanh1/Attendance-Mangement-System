import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../services/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import UserDashboard from '../screens/UserDashboard';
import ApplyWFH from '../screens/ApplyWFH';
import RequestHistory from '../screens/RequestHistory';
import AdminDashboard from '../screens/AdminDashboard';
import AdminWFH from '../screens/AdminWFH';
import AdminAttendance from '../screens/AdminAttendance';
import ApiConfigScreen from '../screens/ApiConfigScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

const headerOpts = (logout, user) => ({
  headerStyle:      { backgroundColor: '#1e3a8a' },
  headerTintColor:  '#fff',
  headerTitleStyle: { fontWeight: '700' },
  headerRight: () => (
    <View style={styles.headerRight}>
      {(user?.name || user?.username) && (
        <Text style={styles.headerUsername}>
          {user?.name || user?.username}
        </Text>
      )}
      <TouchableOpacity onPress={logout}>
        <Ionicons name="log-out-outline" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  ),
});

const tabIcon = {
  Dashboard:  { on: 'home',     off: 'home-outline'     },
  WFH:        { on: 'laptop',   off: 'laptop-outline'   },
  History:    { on: 'time',     off: 'time-outline'     },
  Admin:      { on: 'people',   off: 'people-outline'   },
  Attendance: { on: 'calendar', off: 'calendar-outline' },
};

function UserTabs({ logout, user }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const icons = tabIcon[route.name] || tabIcon.Dashboard;
          return <Ionicons name={focused ? icons.on : icons.off} size={size} color={color} />;
        },
        tabBarActiveTintColor:   '#1e3a8a',
        tabBarInactiveTintColor: '#94a3b8',
        ...headerOpts(logout, user),
      })}
    >
      <Tab.Screen name="Dashboard" component={UserDashboard} />
      <Tab.Screen name="WFH"       component={ApplyWFH} />
      <Tab.Screen name="History"   component={RequestHistory} />
    </Tab.Navigator>
  );
}

function AdminTabs({ logout, user }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const icons = tabIcon[route.name] || tabIcon.Admin;
          return <Ionicons name={focused ? icons.on : icons.off} size={size} color={color} />;
        },
        tabBarActiveTintColor:   '#1e3a8a',
        tabBarInactiveTintColor: '#94a3b8',
        ...headerOpts(logout, user),
      })}
    >
      <Tab.Screen name="Admin"      component={AdminWFH}        options={{ title: 'Requests' }} />
      <Tab.Screen name="Attendance" component={AdminAttendance} options={{ title: 'Attendance' }} />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login"     component={LoginScreen} />
      <Stack.Screen name="Register"  component={RegisterScreen} />
      <Stack.Screen name="ApiConfig" component={ApiConfigScreen} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading, logout } = useAuth();
  const [checkingApi, setCheckingApi] = useState(true);

  useEffect(() => {
    const checkApi = async () => {
      try {
        await AsyncStorage.getItem('API_URL');
      } catch (error) {
        console.log('API check error:', error);
      } finally {
        setCheckingApi(false);
      }
    };
    checkApi();
  }, []);

  if (loading || checkingApi) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashText}>AMS</Text>
        <ActivityIndicator color="rgba(255,255,255,0.6)" style={{ marginTop: 16 }} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!user ? (
        <AuthStack />
      ) : user.is_staff ? (
        <AdminTabs logout={logout} user={user} />
      ) : (
        <UserTabs logout={logout} user={user} />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex:            1,
    backgroundColor: '#1e3a8a',
    justifyContent:  'center',
    alignItems:      'center',
  },
  splashText: {
    fontSize:   40,
    fontWeight: '800',
    color:      '#fff',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems:    'center',
    paddingRight:  16,
    gap:           8,
  },
  headerUsername: {
    color:      '#fff',
    fontSize:   13,
    fontWeight: '600',
  },
});