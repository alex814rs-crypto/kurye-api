import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
  Platform,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

// API Configuration
const API_URL = 'https://kurye-api-production.up.railway.app/api';

// Ana Uygulama
const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
        setIsLoggedIn(true);
      }
    } catch (error) {
      console.error('Login kontrol hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Çıkış Yap',
      'Çıkış yapmak istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Evet',
          onPress: async () => {
            await AsyncStorage.removeItem('user');
            await AsyncStorage.removeItem('token');
            setIsLoggedIn(false);
            setUser(null);
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E63946" />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  if (!isLoggedIn) {
    return <LoginScreen onLogin={(userData) => {
      setUser(userData);
      setIsLoggedIn(true);
    }} />;
  }

  // Admin ise AdminPanel'e yönlendir
  if (user && user.role === 'admin') {
    return <AdminPanel user={user} onLogout={handleLogout} />;
  }

  return <MainApp user={user} onLogout={handleLogout} />;
};
// Admin Paneli ve Ayarlar
const AdminPanel = ({ user, onLogout }) => {
  const [currentScreen, setCurrentScreen] = useState('main');

  if (currentScreen === 'settings') {
    return <AdminSettingsScreen onBack={() => setCurrentScreen('main')} />;
  }
  if (currentScreen === 'couriers') {
    return <CourierManagementScreen user={user} onBack={() => setCurrentScreen('main')} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2A9D8F" />
      <View style={[styles.header, { backgroundColor: '#2A9D8F' }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Yönetici Paneli</Text>
            <Text style={styles.headerSubtitle}>Hoşgeldin, {user.username}</Text>
          </View>
          <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
            <Ionicons name="log-out" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Yönetim Araçları</Text>

          <TouchableOpacity
            style={styles.adminCard}
            onPress={() => setCurrentScreen('couriers')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#457B9D' }]}>
              <Ionicons name="people" size={32} color="#fff" />
            </View>
            <View style={styles.adminCardContent}>
              <Text style={styles.adminCardTitle}>Kurye Yönetimi</Text>
              <Text style={styles.adminCardSubtitle}>Kurye ekle, düzenle, yetki ata</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.adminCard}
            onPress={() => setCurrentScreen('settings')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#E9C46A' }]}>
              <Ionicons name="settings" size={32} color="#fff" />
            </View>
            <View style={styles.adminCardContent}>
              <Text style={styles.adminCardTitle}>API Ayarları</Text>
              <Text style={styles.adminCardSubtitle}>Trendyol, Yemeksepeti, Getir entegrasyonları</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Kurye Yönetimi Ekranı
const CourierManagementScreen = ({ user, onBack }) => {
  const [courierList, setCourierList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newCourier, setNewCourier] = useState({ name: '', username: '', password: '', phone: '', role: 'courier' });

  useEffect(() => { loadCouriers(); }, []);

  const loadCouriers = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/businesses/1/couriers`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) setCourierList(data.data);
    } catch (error) {
      console.error('Kurye yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const addCourier = async () => {
    if (!newCourier.name || !newCourier.username || !newCourier.password) {
      Alert.alert('Hata', 'Ad, kullanıcı adı ve şifre zorunludur');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/businesses/1/couriers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(newCourier),
      });
      const data = await response.json();
      if (data.success) {
        Alert.alert('Başarılı', 'Kurye eklendi!');
        setNewCourier({ name: '', username: '', password: '', phone: '', role: 'courier' });
        setShowForm(false);
        loadCouriers();
      } else {
        Alert.alert('Hata', data.message);
      }
    } catch (error) {
      Alert.alert('Hata', 'Sunucuya bağlanılamadı');
    }
  };

  const deactivateCourier = (id, name) => {
    Alert.alert('Kurye Sil', `${name} adlı kuryeyi silmek istediğinize emin misiniz?`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Evet, Sil', style: 'destructive',
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('token');
            await fetch(`${API_URL}/couriers/${id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` },
            });
            loadCouriers();
          } catch (error) {
            Alert.alert('Hata', 'Silinemedi');
          }
        },
      },
    ]);
  };

  const getRoleBadge = (role) => {
    if (role === 'chief') return { label: 'Kurye Şefi', color: '#E63946' };
    return { label: 'Kurye', color: '#457B9D' };
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { backgroundColor: '#457B9D' }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={onBack} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
            <Text style={[styles.headerTitle, { marginLeft: 10 }]}>Kurye Yönetimi</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowForm(!showForm)} style={{ padding: 8 }}>
            <Ionicons name={showForm ? "close" : "add-circle"} size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {showForm && (
          <View style={{ backgroundColor: '#fff', margin: 16, borderRadius: 12, padding: 16 }}>
            <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Yeni Kurye Ekle</Text>
            <TextInput style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 8, fontSize: 15 }}
              placeholder="Ad Soyad" value={newCourier.name} onChangeText={t => setNewCourier({ ...newCourier, name: t })} />
            <TextInput style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 8, fontSize: 15 }}
              placeholder="Kullanıcı Adı" value={newCourier.username} onChangeText={t => setNewCourier({ ...newCourier, username: t })} autoCapitalize="none" />
            <TextInput style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 8, fontSize: 15 }}
              placeholder="Şifre" value={newCourier.password} onChangeText={t => setNewCourier({ ...newCourier, password: t })} secureTextEntry />
            <TextInput style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 15 }}
              placeholder="Telefon" value={newCourier.phone} onChangeText={t => setNewCourier({ ...newCourier, phone: t })} keyboardType="phone-pad" />

            <Text style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 15 }}>Yetki:</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              <TouchableOpacity
                onPress={() => setNewCourier({ ...newCourier, role: 'courier' })}
                style={{
                  flex: 1, padding: 12, borderRadius: 8, borderWidth: 2,
                  borderColor: newCourier.role === 'courier' ? '#457B9D' : '#ddd',
                  backgroundColor: newCourier.role === 'courier' ? '#EBF2F7' : '#fff'
                }}>
                <Text style={{ textAlign: 'center', fontWeight: 'bold', color: newCourier.role === 'courier' ? '#457B9D' : '#999' }}>🏍️ Kurye</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setNewCourier({ ...newCourier, role: 'chief' })}
                style={{
                  flex: 1, padding: 12, borderRadius: 8, borderWidth: 2,
                  borderColor: newCourier.role === 'chief' ? '#E63946' : '#ddd',
                  backgroundColor: newCourier.role === 'chief' ? '#FDECEE' : '#fff'
                }}>
                <Text style={{ textAlign: 'center', fontWeight: 'bold', color: newCourier.role === 'chief' ? '#E63946' : '#999' }}>👑 Kurye Şefi</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={{ backgroundColor: '#2A9D8F', padding: 14, borderRadius: 8, alignItems: 'center' }} onPress={addCourier}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Kurye Ekle</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          {loading ? <ActivityIndicator size="large" color="#457B9D" /> : (
            courierList.length === 0 ? (
              <View style={{ alignItems: 'center', padding: 40 }}>
                <Ionicons name="people-outline" size={64} color="#ccc" />
                <Text style={{ color: '#999', marginTop: 12 }}>Henüz kurye yok</Text>
              </View>
            ) : (
              courierList.map(c => {
                const badge = getRoleBadge(c.role);
                return (
                  <View key={c.id} style={[styles.orderCard, { flexDirection: 'row', alignItems: 'center' }]}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#333' }}>{c.name}</Text>
                        <View style={{ backgroundColor: badge.color, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                          <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{badge.label}</Text>
                        </View>
                      </View>
                      <Text style={{ color: '#666', fontSize: 13 }}>@{c.username}</Text>
                      {c.phone ? <Text style={{ color: '#999', fontSize: 12 }}>{c.phone}</Text> : null}
                    </View>
                    <TouchableOpacity onPress={() => deactivateCourier(c.id, c.name)} style={{ padding: 8 }}>
                      <Ionicons name="trash-outline" size={22} color="#E63946" />
                    </TouchableOpacity>
                  </View>
                );
              })
            )
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const AdminSettingsScreen = ({ onBack }) => {
  const [keys, setKeys] = useState({
    TRENDYOL_API_KEY: '',
    TRENDYOL_SUPPLIER_ID: '',
    YEMEKSEPETI_API_KEY: '',
    GETIR_API_KEY: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Mevcut ayarları yükle (GET isteği eklenecek)
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/admin/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(keys),
      });
      const data = await response.json();
      if (data.success) {
        Alert.alert('Başarılı', 'Ayarlar kaydedildi!');
      } else {
        Alert.alert('Hata', 'Kaydedilemedi');
      }
    } catch (error) {
      Alert.alert('Hata', 'Sunucuya bağlanılamadı');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { backgroundColor: '#E9C46A' }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={onBack} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
            <Text style={[styles.headerTitle, { marginLeft: 10 }]}>Ayarlar</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trendyol Yemek</Text>
          <TextInput
            style={styles.input}
            placeholder="API Key"
            value={keys.TRENDYOL_API_KEY}
            onChangeText={(t) => setKeys({ ...keys, TRENDYOL_API_KEY: t })}
          />
          <TextInput
            style={styles.input}
            placeholder="Supplier ID"
            value={keys.TRENDYOL_SUPPLIER_ID}
            onChangeText={(t) => setKeys({ ...keys, TRENDYOL_SUPPLIER_ID: t })}
            keyboardType="numeric"
          />

          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Yemeksepeti</Text>
          <TextInput
            style={styles.input}
            placeholder="API Key"
            value={keys.YEMEKSEPETI_API_KEY}
            onChangeText={(t) => setKeys({ ...keys, YEMEKSEPETI_API_KEY: t })}
          />

          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Getir Yemek</Text>
          <TextInput
            style={styles.input}
            placeholder="API Key"
            value={keys.GETIR_API_KEY}
            onChangeText={(t) => setKeys({ ...keys, GETIR_API_KEY: t })}
          />

          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#2A9D8F', marginTop: 30 }]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Kaydet</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Giriş Ekranı (Revize Edilmiş)
const LoginScreen = ({ onLogin }) => {
  const [isAdmin, setIsAdmin] = useState(false); // Toggle state
  const [businessCode, setBusinessCode] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if ((!isAdmin && !businessCode) || !username || !password) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun');
      return;
    }

    setLoading(true);

    try {
      // Endpoint seçimi: Admin ise /auth/admin-login, değilse /auth/login
      const endpoint = isAdmin ? '/auth/admin-login' : '/auth/login';
      const body = isAdmin
        ? { username, password }
        : { businessCode, username, password };

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
        await AsyncStorage.setItem('token', data.token);
        onLogin(data.user);
      } else {
        Alert.alert('Hata', data.message || 'Giriş başarısız');
      }
    } catch (error) {
      Alert.alert('Hata', 'Sunucuya bağlanılamadı.');
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.loginContainer}>
      <StatusBar barStyle="light-content" backgroundColor={isAdmin ? "#2A9D8F" : "#E63946"} />

      <View style={[styles.loginHeader, { backgroundColor: isAdmin ? "#2A9D8F" : "#E63946" }]}>
        <Ionicons name={isAdmin ? "settings" : "bicycle"} size={80} color="#fff" />
        <Text style={[styles.loginTitle, { color: '#fff' }]}>Kurye Uygulaması</Text>
        <Text style={[styles.loginSubtitle, { color: '#fff' }]}>
          {isAdmin ? 'Yönetici Girişi' : 'Kurye Girişi'}
        </Text>
      </View>

      <View style={styles.loginForm}>
        {/* Toggle Switch */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 20 }}>
          <TouchableOpacity
            style={{ padding: 10, borderBottomWidth: !isAdmin ? 2 : 0, borderColor: '#E63946' }}
            onPress={() => setIsAdmin(false)}
          >
            <Text style={{ fontWeight: 'bold', color: !isAdmin ? '#E63946' : '#999' }}>Kurye</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ padding: 10, borderBottomWidth: isAdmin ? 2 : 0, borderColor: '#2A9D8F' }}
            onPress={() => setIsAdmin(true)}
          >
            <Text style={{ fontWeight: 'bold', color: isAdmin ? '#2A9D8F' : '#999' }}>Yönetici</Text>
          </TouchableOpacity>
        </View>

        {!isAdmin && (
          <View style={styles.inputContainer}>
            <Ionicons name="business" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="İşletme Kodu"
              value={businessCode}
              onChangeText={setBusinessCode}
              autoCapitalize="characters"
            />
          </View>
        )}

        <View style={styles.inputContainer}>
          <Ionicons name="person" size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Kullanıcı Adı"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed" size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Şifre"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          style={[styles.loginButton, loading && styles.loginButtonDisabled, { backgroundColor: isAdmin ? "#2A9D8F" : "#E63946" }]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="log-in" size={24} color="#fff" />
              <Text style={styles.loginButtonText}>Giriş Yap</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// Ana Uygulama
const MainApp = ({ user, onLogout }) => {
  const [orders, setOrders] = useState([]);
  const [poolOrders, setPoolOrders] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [team, setTeam] = useState([]);
  const [showTeam, setShowTeam] = useState(false);
  const [stats, setStats] = useState({
    today: 0,
    thisWeek: 0,
    avgTime: '0 dk',
  });

  useEffect(() => {
    loadOrders();
    loadStats();
    if (user.role === 'chief') loadTeam();
    const interval = setInterval(() => {
      loadOrders();
      if (user.role === 'chief') loadTeam();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadOrders = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/orders?courierId=${user.id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setOrders(data.data);
        // Havuz: atanmamış siparişler
        setPoolOrders(data.data.filter(o => o.courierId === null && o.status === 'active'));
        // Aktif: bana atanmış ve aktif
        setActiveOrders(data.data.filter(o => o.courierId === user.id && o.status === 'active'));
        // Tamamlanan: benim teslim ettiklerim
        setCompletedOrders(data.data.filter(o => o.courierId === user.id && o.status === 'completed'));
      }
    } catch (error) {
      console.error('Siparişler yüklenemedi:', error);
    }
  };

  const loadStats = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/couriers/${user.id}/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('İstatistikler yüklenemedi:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    await loadStats();
    if (user.role === 'chief') await loadTeam();
    setRefreshing(false);
  };

  const loadTeam = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/couriers/team`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) setTeam(data.data);
    } catch (error) {
      console.error('Ekip yüklenemedi:', error);
    }
  };

  const openNavigation = (order) => {
    const scheme = Platform.select({
      ios: 'maps:',
      android: 'geo:',
    });

    const latLng = `${order.latitude},${order.longitude}`;
    const label = order.customerName;

    const url = Platform.select({
      ios: `${scheme}?daddr=${latLng}&q=${encodeURIComponent(label)}`,
      android: `${scheme}${latLng}?q=${latLng}(${encodeURIComponent(label)})`,
    });

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latLng}`;
          return Linking.openURL(googleMapsUrl);
        }
      })
      .catch((err) => Alert.alert('Hata', 'Navigasyon açılamadı'));
  };

  const callCustomer = (phoneNumber) => {
    const url = `tel:${phoneNumber}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          Alert.alert('Hata', 'Telefon araması yapılamıyor');
        }
      })
      .catch((err) => Alert.alert('Hata', 'Arama başlatılamadı'));
  };

  const deliverOrder = async (orderId) => {
    Alert.alert(
      'Sipariş Teslimi',
      'Siparişi teslim ettiğinizi onaylıyor musunuz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Evet, Teslim Et',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              const response = await fetch(`${API_URL}/orders/${orderId}`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                  status: 'completed',
                  courierId: user.id,
                }),
              });

              const data = await response.json();
              if (data.success) {
                Alert.alert('Başarılı', 'Sipariş teslim edildi!');
                loadOrders();
                loadStats();
              } else {
                Alert.alert('Hata', data.message || 'Teslimat kaydedilemedi');
              }
            } catch (error) {
              Alert.alert('Hata', 'Sunucu hatası');
              console.error('Delivery error:', error);
            }
          },
        },
      ]
    );
  };

  const claimOrder = async (orderId, orderNumber) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/orders/${orderId}/claim`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        Alert.alert('Üzerinize Alındı! 📦', `${orderNumber} numaralı sipariş artık sizde.`);
        loadOrders();
        loadStats();
      } else {
        Alert.alert('Hata', data.message);
      }
    } catch (error) {
      Alert.alert('Hata', 'Sunucu hatası');
    }
  };

  const getPlatformColor = (platform) => {
    switch (platform) {
      case 'Trendyol Yemek':
        return '#F27A1A';
      case 'Yemeksepeti':
        return '#FF6600';
      case 'Getir Yemek':
        return '#5D3EBC';
      default:
        return '#666';
    }
  };

  const OrderCard = ({ order }) => (
    <View style={styles.orderCard}>
      <View style={[styles.platformBadge, { backgroundColor: getPlatformColor(order.platform) }]}>
        <Text style={styles.platformText}>{order.platform}</Text>
      </View>

      <View style={styles.orderHeader}>
        <Text style={styles.orderNumber}>{order.orderNumber}</Text>
        <Text style={styles.orderTime}>
          {new Date(order.orderTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>

      <View style={styles.customerInfo}>
        <Ionicons name="person" size={20} color="#333" />
        <Text style={styles.customerName}>{order.customerName}</Text>
      </View>

      <View style={styles.addressInfo}>
        <Ionicons name="location" size={20} color="#E63946" />
        <Text style={styles.address}>{order.address}</Text>
      </View>

      <View style={styles.itemsContainer}>
        <Text style={styles.itemsLabel}>Ürünler:</Text>
        {order.items.map((item, index) => (
          <Text key={index} style={styles.item}>• {item}</Text>
        ))}
      </View>

      <View style={styles.priceContainer}>
        <Text style={styles.priceLabel}>Toplam:</Text>
        <Text style={styles.price}>{order.totalPrice}</Text>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.button, styles.navButton]}
          onPress={() => openNavigation(order)}
        >
          <Ionicons name="navigate" size={24} color="#fff" />
          <Text style={styles.buttonText}>Yol Tarifi</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.callButton]}
          onPress={() => callCustomer(order.phone)}
        >
          <Ionicons name="call" size={24} color="#fff" />
          <Text style={styles.buttonText}>Ara</Text>
        </TouchableOpacity>

        {order.status === 'active' && order.courierId === user.id && (
          <TouchableOpacity
            style={[styles.button, styles.deliverButton]}
            onPress={() => deliverOrder(order.id)}
          >
            <Ionicons name="checkmark-circle" size={24} color="#fff" />
            <Text style={styles.buttonText}>Teslim Et</Text>
          </TouchableOpacity>
        )}

        {order.courierId === null && (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#457B9D' }]}
            onPress={() => claimOrder(order.id, order.orderNumber)}
          >
            <Ionicons name="hand-left" size={24} color="#fff" />
            <Text style={styles.buttonText}>Üzerime Al</Text>
          </TouchableOpacity>
        )}
      </View>

      {order.courierName && order.courierId !== user.id && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: '#EBF2F7', padding: 6, borderRadius: 6 }}>
          <Ionicons name="person-circle" size={18} color="#457B9D" />
          <Text style={{ color: '#457B9D', fontSize: 12, marginLeft: 4, fontWeight: 'bold' }}>{order.courierName} üzerinde</Text>
        </View>
      )}

      {order.status === 'completed' && order.deliveryTime && (
        <View style={styles.completedBadge}>
          <Ionicons name="checkmark-circle" size={18} color="#2A9D8F" />
          <Text style={styles.completedText}>
            Teslim Edildi - {new Date(order.deliveryTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#E63946" />

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Kurye Uygulaması</Text>
            <Text style={styles.headerSubtitle}>{user.businessName}</Text>
          </View>
          <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
            <Ionicons name="log-out" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.today}</Text>
            <Text style={styles.statLabel}>Bugün</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.thisWeek}</Text>
            <Text style={styles.statLabel}>Bu Hafta</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.avgTime}</Text>
            <Text style={styles.statLabel}>Ort. Süre</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {poolOrders.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="cube" size={24} color="#F27A1A" />
              <Text style={styles.sectionTitle}>Sipariş Havuzu ({poolOrders.length})</Text>
              <View style={{ marginLeft: 'auto', backgroundColor: '#F27A1A', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>Sahipsiz</Text>
              </View>
            </View>
            {poolOrders.map(order => <OrderCard key={order.id} order={order} />)}
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="bicycle" size={24} color="#E63946" />
            <Text style={styles.sectionTitle}>Aktif Siparişlerim ({activeOrders.length})</Text>
          </View>

          {activeOrders.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-done-circle-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>Aktif sipariş yok</Text>
              <Text style={styles.emptySubtext}>Aşağı çekerek yenileyin</Text>
            </View>
          ) : (
            activeOrders.map(order => <OrderCard key={order.id} order={order} />)
          )}
        </View>

        {completedOrders.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="checkmark-done" size={24} color="#2A9D8F" />
              <Text style={styles.sectionTitle}>Teslim Edilenler ({completedOrders.length})</Text>
            </View>
            {completedOrders.slice(0, 5).map(order => <OrderCard key={order.id} order={order} />)}
          </View>
        )}

        {user.role === 'chief' && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => setShowTeam(!showTeam)}
            >
              <Ionicons name="people" size={24} color="#457B9D" />
              <Text style={styles.sectionTitle}>Ekibim ({team.length} kişi)</Text>
              <Ionicons name={showTeam ? 'chevron-up' : 'chevron-down'} size={20} color="#666" style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>

            {showTeam && team.map(member => (
              <View key={member.id} style={[styles.orderCard, { borderLeftWidth: 3, borderLeftColor: member.role === 'chief' ? '#E63946' : '#457B9D' }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <View>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#333' }}>{member.name}</Text>
                    <Text style={{ fontSize: 12, color: member.role === 'chief' ? '#E63946' : '#457B9D' }}>
                      {member.role === 'chief' ? '👑 Kurye Şefi' : '🏃 Kurye'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: member.activeOrders > 0 ? '#E63946' : '#2A9D8F' }}>
                      {member.activeOrders}
                    </Text>
                    <Text style={{ fontSize: 10, color: '#999' }}>Aktif Paket</Text>
                  </View>
                </View>
                {member.orders && member.orders.length > 0 && (
                  <View style={{ backgroundColor: '#F9F9F9', borderRadius: 8, padding: 8 }}>
                    {member.orders.map(o => (
                      <View key={o.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                        <Text style={{ fontSize: 12, color: '#666' }}>{o.orderNumber} - {o.customerName}</Text>
                        <Text style={{ fontSize: 11, color: getPlatformColor(o.platform), fontWeight: 'bold' }}>{o.platform}</Text>
                      </View>
                    ))}
                  </View>
                )}
                <Text style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                  Bugün {member.completedToday} teslim
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  loginContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loginHeader: {
    backgroundColor: '#fff',
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  loginTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  loginSubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  loginForm: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#333',
  },
  loginButton: {
    flexDirection: 'row',
    backgroundColor: '#E63946',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  loginButtonDisabled: {
    backgroundColor: '#999',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  loginFooter: {
    marginTop: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#E63946',
    paddingVertical: 16,
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginTop: 2,
  },
  logoutButton: {
    padding: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 12,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#fff',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 8,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  platformBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  platformText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  orderTime: {
    fontSize: 14,
    color: '#666',
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  customerName: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
    fontWeight: '600',
  },
  addressInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  address: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  itemsContainer: {
    backgroundColor: '#F9F9F9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  itemsLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  item: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  priceLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E63946',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  navButton: {
    backgroundColor: '#457B9D',
  },
  callButton: {
    backgroundColor: '#2A9D8F',
  },
  deliverButton: {
    backgroundColor: '#E63946',
  },
  buttonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 8,
    backgroundColor: '#E6F7F5',
    borderRadius: 8,
  },
  completedText: {
    marginLeft: 6,
    color: '#2A9D8F',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#999',
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 14,
    color: '#ccc',
  },
});

export default App;
