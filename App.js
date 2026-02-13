import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Dimensions,
  KeyboardAvoidingView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import * as TaskManager from 'expo-task-manager';

// API Configuration
const API_URL = 'https://kurye-api-production.up.railway.app/api';

const LOCATION_TASK_NAME = 'background-location-task';

// Arka plan görevi tanımla
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('[BACKGROUND LOCATION] Task Error:', error);
    return;
  }
  if (data) {
    const { locations } = data;
    const location = locations[0];
    if (location) {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) return;

        await fetch(`${API_URL}/couriers/location`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          }),
        });
        console.log('[BACKGROUND LOCATION] Sent:', location.coords.latitude, location.coords.longitude);
      } catch (err) {
        console.error('[BACKGROUND LOCATION] Network Error:', err);
      }
    }
  }
});

// Bildirim handler ayarları
// Bildirim handler ayarları
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch (error) {
  console.log('Notification handler error:', error);
}

// Push token alma fonksiyonu
async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Varsayılan',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#E63946',
        sound: 'default',
      });
    } catch (e) {
      console.log('Notification channel error:', e);
    }
  }

  if (!Device.isDevice) {
    console.log('Push bildirimleri fiziksel cihaz gerektirir');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.log('Bildirim izni verilmedi');
    return null;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    console.log('Project ID bulunamadı');
    return null;
  }

  try {
    // 3 saniye timeout ekle
    const tokenData = await Promise.race([
      Notifications.getExpoPushTokenAsync({ projectId }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Push token timeout')), 3000))
    ]);
    token = tokenData.data;
    console.log('[PUSH] Token:', token);
  } catch (error) {
    console.log('Push token hatası:', error);
  }

  return token;
}

// ============= KARANLIK MOD & ÇOKLU DİL ALTYAPISI =============

const ThemeContext = React.createContext();
const LanguageContext = React.createContext();

const lightTheme = {
  bg: '#F5F5F5', card: '#fff', text: '#333', subText: '#666', muted: '#999', border: '#E5E7EB', inputBg: '#fff', headerBg: '#E63946',
};
const darkTheme = {
  bg: '#121212', card: '#1E1E1E', text: '#E5E7EB', subText: '#9CA3AF', muted: '#6B7280', border: '#374151', inputBg: '#2A2A2A', headerBg: '#1A1A2E',
};

const translations = {
  tr: {
    appName: 'Kurye Uygulaması', login: 'Giriş Yap', logout: 'Çıkış Yap', orders: 'Siparişler', pool: 'Havuz', active: 'Aktif',
    delivered: 'Teslim Edilenler', deliver: 'Teslim Et', claim: 'Üzerime Al', today: 'Bugün', thisWeek: 'Bu Hafta', avgTime: 'Ort. Süre',
    settings: 'Ayarlar', darkMode: 'Karanlık Mod', language: 'Dil', profile: 'Profil', team: 'Ekibim', search: 'Ara...',
    reports: 'Performans Raporları', history: 'Sipariş Geçmişi', addOrder: 'Manuel Sipariş Ekle', route: 'Rota Optimize',
    rate: 'Değerlendir', skip: 'Geç', send: 'Gönder', cancel: 'İptal', save: 'Kaydet',
    takePhoto: 'Fotoğraf Çek', deliverWithoutPhoto: 'Fotoğrafsız Teslim Et', admin: 'Yönetici', courier: 'Kurye',
    items: 'Ürünler', total: 'Toplam', call: 'Ara', directions: 'Yol Tarifi', onCourier: 'üzerinde', deliveredMsg: 'Teslim Edildi',
    customerName: 'Müşteri Adı', address: 'Adres', phone: 'Telefon', createOrder: 'Sipariş Oluştur', platform: 'Platform',
    enterCustomerName: 'Müşteri adı giriniz', enterAddress: 'Teslimat adresi giriniz', enterPhone: '0555 123 45 67',
    enterItems: 'Ürünleri virgülle ayırarak giriniz', enterTotal: 'Toplam tutar (örn: 150 TL)',
  },
  en: {
    appName: 'Courier App', login: 'Login', logout: 'Logout', orders: 'Orders', pool: 'Pool', active: 'Active',
    delivered: 'Delivered', deliver: 'Deliver', claim: 'Claim', today: 'Today', thisWeek: 'This Week', avgTime: 'Avg. Time',
    settings: 'Settings', darkMode: 'Dark Mode', language: 'Language', profile: 'Profile', team: 'My Team', search: 'Search...',
    reports: 'Performance Reports', history: 'Order History', addOrder: 'Manual Order', route: 'Route Optimize',
    rate: 'Rate', skip: 'Skip', send: 'Send', cancel: 'Cancel', save: 'Save',
    takePhoto: 'Take Photo', deliverWithoutPhoto: 'Deliver Without Photo', admin: 'Admin', courier: 'Courier',
    items: 'Items', total: 'Total', call: 'Call', directions: 'Directions', onCourier: 'assigned to', deliveredMsg: 'Delivered',
    customerName: 'Customer Name', address: 'Address', phone: 'Phone', createOrder: 'Create Order', platform: 'Platform',
    enterCustomerName: 'Enter customer name', enterAddress: 'Enter delivery address', enterPhone: '0555 123 45 67',
    enterItems: 'Enter items separated by comma', enterTotal: 'Total amount (e.g. 150 TL)',
  },
  ar: {
    appName: 'تطبيق التوصيل', login: 'تسجيل الدخول', logout: 'تسجيل الخروج', orders: 'الطلبات', pool: 'المجموعة', active: 'نشط',
    delivered: 'تم التسليم', deliver: 'تسليم', claim: 'قبول', today: 'اليوم', thisWeek: 'هذا الأسبوع', avgTime: 'متوسط الوقت',
    settings: 'الإعدادات', darkMode: 'الوضع الداكن', language: 'اللغة', profile: 'الملف الشخصي', team: 'فريقي', search: '...بحث',
    reports: 'تقارير الأداء', history: 'سجل الطلبات', addOrder: 'طلب يدوي', route: 'تحسين المسار',
    rate: 'تقييم', skip: 'تخطي', send: 'إرسال', cancel: 'إلغاء', save: 'حفظ',
    takePhoto: 'التقاط صورة', deliverWithoutPhoto: 'تسليم بدون صورة', admin: 'المسؤول', courier: 'ساعي',
    items: 'المنتجات', total: 'الإجمالي', call: 'اتصال', directions: 'الاتجاهات', onCourier: 'مع', deliveredMsg: 'تم التسليم',
    customerName: 'اسم العميل', address: 'العنوان', phone: 'الهاتف', createOrder: 'إنشاء طلب', platform: 'المنصة',
    enterCustomerName: 'أدخل اسم العميل', enterAddress: 'أدخل عنوان التوصيل', enterPhone: '0555 123 45 67',
    enterItems: 'أدخل المنتجات مفصولة بفواصل', enterTotal: 'المبلغ الإجمالي',
  },
};

// Web İkon & PWA Sabitleme (v2.10.7 - Emoji Solution)
const WebIcon = ({ name, size, color, style }) => {
  if (Platform.OS !== 'web') {
    return <Ionicons name={name} size={size} color={color} style={style} />;
  }

  // Web için Emoji Eşleşmeleri
  const emojiMap = {
    'bicycle': '🚲',
    'settings': '⚙️',
    'business': '🏢',
    'person': '👤',
    'lock-closed': '🔒',
    'log-in': '🚪',
    'log-out': '🚪',
    'download-outline': '📥',
    'share-outline': '📤',
    'add-circle-outline': '➕',
    'search': '🔍',
    'notifications': '🔔',
    'person-circle': '👤',
    'chevron-forward': '▶️',
    'star': '⭐',
    'star-outline': '☆',
    'time-outline': '🕒',
    'time': '🕒',
    'location-outline': '📍',
    'location': '📍',
    'call-outline': '📞',
    'logo-whatsapp': '💬',
    'image-outline': '🖼️',
    'camera-outline': '📷',
    'close': '❌',
    'checkmark-circle': '✅',
    'alert-circle': '⚠️',
    'people': '👥',
    'bar-chart': '📊',
    'add-circle': '➕',
    'cube': '📦',
    'stats-chart': '📈',
    'chevron-up': '🔼',
    'chevron-down': '🔽',
    'navigate': '🧭',
    'close-circle': '⭕',
    'checkmark-done': '✅',
    'checkmark-done-circle-outline': '✔️',
  };

  return (
    <Text style={[{ fontSize: size, color: color }, style]}>
      {emojiMap[name] || '📍'}
    </Text>
  );
};

import * as Font from 'expo-font';

// Web İkon & PWA Sabitleme (v2.10.8 - Stability Fix)
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  // 1. Meta Etiketlerini ve Manifest'i Dinamik Ekle
  const metaTags = [
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
    { name: 'apple-mobile-web-app-title', content: 'Kurye App' },
    { name: 'theme-color', content: '#E63946' }
  ];

  metaTags.forEach(tag => {
    if (!document.querySelector(`meta[name="${tag.name}"]`)) {
      const m = document.createElement('meta');
      m.name = tag.name;
      m.content = tag.content;
      document.head.appendChild(m);
    }
  });

  if (!document.querySelector('link[rel="manifest"]')) {
    const l = document.createElement('link');
    l.rel = 'manifest';
    l.href = '/manifest.json';
    document.head.appendChild(l);
  }

  // AGRESİF FONT ENJEKSİYONU KALDIRILDI - WEB-ICON BİLEŞENİ ARTIK YETERLİ
}


// Hata Sınırı Bileşeni (ErrorBoundary)
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#E63946', marginBottom: 10 }}>Bir hata oluştu!</Text>
          <Text style={{ color: '#333', textAlign: 'center', marginHorizontal: 20, marginBottom: 20 }}>
            {this.state.error?.toString()}
          </Text>
          <TouchableOpacity
            onPress={() => { this.setState({ hasError: false }); if (this.props.onReset) this.props.onReset(); }}
            style={{ backgroundColor: '#2A9D8F', padding: 12, borderRadius: 8 }}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Tekrar Dene</Text>
          </TouchableOpacity>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

// Ana Uygulama
const App = () => {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      try {
        // Native'de fontlar otomatik yüklenir veya build içine gömülüdür.
        // Web'de veya özel durumlarda buraya ekleme yapılabilir.
        setFontsLoaded(true);
      } catch (e) {
        console.warn('Font loading error:', e);
        setFontsLoaded(true);
      }
    }
    loadFonts();
  }, []);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  // ... diğer state'ler

  const [user, setUser] = useState(null);
  const [isDark, setIsDark] = useState(false);
  const [language, setLanguage] = useState('tr');
  const theme = isDark ? darkTheme : lightTheme;
  const t = translations[language] || translations.tr;

  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    checkLoginStatus();

    // Bildirim dinleyicileri
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('[PUSH] Bildirim alındı:', notification.request.content.title);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('[PUSH] Bildirime tıklandı:', response.notification.request.content.data);
    });

    return () => {
      if (notificationListener.current) Notifications.removeNotificationSubscription(notificationListener.current);
      if (responseListener.current) Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  const checkLoginStatus = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      const savedTheme = await AsyncStorage.getItem('theme');
      const savedLang = await AsyncStorage.getItem('language');
      if (savedTheme === 'dark') setIsDark(true);
      if (savedLang) setLanguage(savedLang);
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
    console.log('[LOGOUT] Çıkış tuşuna basıldı');

    if (Platform.OS === 'web') {
      const confirmLogout = window.confirm('Çıkış yapmak istediğinizden emin misiniz?');
      if (confirmLogout) {
        await processLogout();
      }
      return;
    }

    Alert.alert(
      'Çıkış Yap',
      'Çıkış yapmak istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Evet',
          onPress: async () => {
            await processLogout();
          },
        },
      ]
    );
  };

  const processLogout = async () => {
    console.log('[LOGOUT] İşlem başlatılıyor...');
    // Push token'ı sunucudan sil
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        await fetch(`${API_URL}/push-token`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        });
      }
    } catch (e) {
      console.log('Push token silme hatası:', e);
    }
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('token');
    setIsLoggedIn(false);
    setUser(null);
    console.log('[LOGOUT] Çıkış başarılı');
  };

  const toggleTheme = async () => {
    const newVal = !isDark;
    setIsDark(newVal);
    await AsyncStorage.setItem('theme', newVal ? 'dark' : 'light');
  };

  const changeLanguage = async (lang) => {
    setLanguage(lang);
    await AsyncStorage.setItem('language', lang);
  };

  if (loading || !fontsLoaded) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color="#E63946" />
        <Text style={[styles.loadingText, { color: theme.text }]}>Yükleniyor...</Text>
      </View>
    );
  }

  const appContent = (!isLoggedIn || !user) ? (
    <LoginScreen onLogin={(userData) => { setUser(userData); setIsLoggedIn(true); }} />
  ) : (user.role === 'admin' || user.role === 'manager') ? (
    <AdminPanel user={user} onLogout={handleLogout} />
  ) : (
    <MainApp user={user} onLogout={handleLogout} />
  );

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      <LanguageContext.Provider value={{ t, language, changeLanguage }}>
        <ErrorBoundary onReset={() => { setIsLoggedIn(false); setUser(null); }}>
          <View key={isLoggedIn ? 'loggedin' : 'loggedout'} style={{ flex: 1 }}>
            {appContent}
          </View>
        </ErrorBoundary>
        <PWAInstallGuide />
      </LanguageContext.Provider>
    </ThemeContext.Provider>
  );
};

// iOS PWA Kurulum Rehberi
const PWAInstallGuide = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Sadece iOS ve Web ise ve "Ana Ekrana Ekle" yapılmamışsa göster
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
      if (isIOS && !isStandalone) {
        setShow(true);
      }
    }
  }, []);

  if (!show) return null;

  return (
    <View style={styles.pwaOverlay}>
      <View style={styles.pwaModal}>
        <View style={{ alignItems: 'center', marginBottom: 15 }}>
          <WebIcon name="download-outline" size={40} color="#E63946" />
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginTop: 10, textAlign: 'center' }}>
            Uygulamayı Yükleyin
          </Text>
        </View>
        <Text style={{ textAlign: 'center', color: '#666', marginBottom: 20, lineHeight: 20 }}>
          Bu uygulamayı ana ekranınıza ekleyerek tam ekran ve daha hızlı kullanabilirsiniz.
        </Text>
        <View style={styles.pwaStep}>
          <WebIcon name="share-outline" size={24} color="#007AFF" />
          <Text style={styles.pwaStepText}>1. Safari'de alttaki 'Paylaş' butonuna basın.</Text>
        </View>
        <View style={styles.pwaStep}>
          <WebIcon name="add-circle-outline" size={24} color="#333" />
          <Text style={styles.pwaStepText}>2. 'Ana Ekrana Ekle' seçeneğini seçin.</Text>
        </View>
        <TouchableOpacity
          style={styles.pwaCloseButton}
          onPress={() => setShow(false)}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Anladım</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
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
  if (currentScreen === 'locations') {
    return <LiveLocationPanel user={user} onBack={() => setCurrentScreen('main')} />;
  }
  if (currentScreen === 'reports') {
    return <PerformanceReportsScreen user={user} onBack={() => setCurrentScreen('main')} />;
  }
  if (currentScreen === 'history') {
    return <OrderHistoryScreen user={user} onBack={() => setCurrentScreen('main')} />;
  }
  if (currentScreen === 'addorder') {
    return <AddOrderScreen user={user} onBack={() => setCurrentScreen('main')} />;
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
            <WebIcon name="log-out" size={24} color="#fff" />
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
              <WebIcon name="people" size={32} color="#fff" />
            </View>
            <View style={styles.adminCardContent}>
              <Text style={styles.adminCardTitle}>Kurye Yönetimi</Text>
              <Text style={styles.adminCardSubtitle}>Kurye ekle, düzenle, yetki ata</Text>
            </View>
            <WebIcon name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.adminCard}
            onPress={() => setCurrentScreen('locations')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#E63946' }]}>
              <WebIcon name="location" size={32} color="#fff" />
            </View>
            <View style={styles.adminCardContent}>
              <Text style={styles.adminCardTitle}>Canlı Konum Takibi</Text>
              <Text style={styles.adminCardSubtitle}>Kuryelerin anlık konumlarını izle</Text>
            </View>
            <WebIcon name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.adminCard}
            onPress={() => setCurrentScreen('settings')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#E9C46A' }]}>
              <WebIcon name="settings" size={32} color="#fff" />
            </View>
            <View style={styles.adminCardContent}>
              <Text style={styles.adminCardTitle}>API Ayarları</Text>
              <Text style={styles.adminCardSubtitle}>Trendyol, Yemeksepeti, Getir entegrasyonları</Text>
            </View>
            <WebIcon name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.adminCard}
            onPress={() => setCurrentScreen('reports')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#6C63FF' }]}>
              <WebIcon name="bar-chart" size={32} color="#fff" />
            </View>
            <View style={styles.adminCardContent}>
              <Text style={styles.adminCardTitle}>Performans Raporları</Text>
              <Text style={styles.adminCardSubtitle}>Detaylı istatistik ve grafikler</Text>
            </View>
            <WebIcon name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.adminCard}
            onPress={() => setCurrentScreen('history')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#FF6B6B' }]}>
              <WebIcon name="time" size={32} color="#fff" />
            </View>
            <View style={styles.adminCardContent}>
              <Text style={styles.adminCardTitle}>Sipariş Geçmişi</Text>
              <Text style={styles.adminCardSubtitle}>Tüm siparişleri ara ve filtrele</Text>
            </View>
            <WebIcon name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.adminCard}
            onPress={() => setCurrentScreen('addorder')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#2A9D8F' }]}>
              <WebIcon name="add-circle" size={32} color="#fff" />
            </View>
            <View style={styles.adminCardContent}>
              <Text style={styles.adminCardTitle}>Manuel Sipariş Ekle</Text>
              <Text style={styles.adminCardSubtitle}>Platform dışı sipariş girişi</Text>
            </View>
            <WebIcon name="chevron-forward" size={24} color="#ccc" />
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
      // Business ID, user nesnesinden gelir (Manager için)
      // Admin için fallback olarak 1 kullanılabilir veya seçim yaptırılabilir.
      // Şimdilik manager'ın kendi businessId'sini kullanıyoruz.
      const businessId = user.businessId || '1';
      const response = await fetch(`${API_URL}/businesses/${businessId}/couriers`, {
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
      const businessId = user.businessId || '1';
      const response = await fetch(`${API_URL}/businesses/${businessId}/couriers`, {
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

  const renderCourierItem = (c) => {
    const badge = getRoleBadge(c.role);
    return (
      <View key={c.id} style={[styles.orderCard, { flexDirection: 'row', alignItems: 'center', marginBottom: 10 }]}>
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
          <WebIcon name="trash-outline" size={22} color="#E63946" />
        </TouchableOpacity>
      </View>
    );
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
    if (role === 'manager') return { label: 'Yönetici', color: '#2A9D8F' };
    if (role === 'chief') return { label: 'Kurye Şefi', color: '#E63946' };
    return { label: 'Kurye', color: '#457B9D' };
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { backgroundColor: '#457B9D' }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={onBack} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <WebIcon name="arrow-back" size={24} color="#fff" />
            <Text style={[styles.headerTitle, { marginLeft: 10 }]}>Kurye Yönetimi</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowForm(!showForm)} style={{ padding: 8 }}>
            <WebIcon name={showForm ? "close" : "add-circle"} size={28} color="#fff" />
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

            <Text style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 15 }}>Yetki Seviyesi:</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              <TouchableOpacity
                onPress={() => setNewCourier({ ...newCourier, role: 'courier' })}
                style={{
                  flex: 1, minWidth: '30%', padding: 12, borderRadius: 8, borderWidth: 2,
                  borderColor: newCourier.role === 'courier' ? '#457B9D' : '#ddd',
                  backgroundColor: newCourier.role === 'courier' ? '#EBF2F7' : '#fff'
                }}>
                <Text style={{ textAlign: 'center', fontWeight: 'bold', color: newCourier.role === 'courier' ? '#457B9D' : '#999' }}>🏍️ Kurye</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setNewCourier({ ...newCourier, role: 'chief' })}
                style={{
                  flex: 1, minWidth: '30%', padding: 12, borderRadius: 8, borderWidth: 2,
                  borderColor: newCourier.role === 'chief' ? '#E63946' : '#ddd',
                  backgroundColor: newCourier.role === 'chief' ? '#FDECEE' : '#fff'
                }}>
                <Text style={{ textAlign: 'center', fontWeight: 'bold', color: newCourier.role === 'chief' ? '#E63946' : '#999' }}>👑 Şef</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setNewCourier({ ...newCourier, role: 'manager' })}
                style={{
                  flex: 1, minWidth: '30%', padding: 12, borderRadius: 8, borderWidth: 2,
                  borderColor: newCourier.role === 'manager' ? '#2A9D8F' : '#ddd',
                  backgroundColor: newCourier.role === 'manager' ? '#E9F5F3' : '#fff'
                }}>
                <Text style={{ textAlign: 'center', fontWeight: 'bold', color: newCourier.role === 'manager' ? '#2A9D8F' : '#999' }}>💼 Müd.</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={{ backgroundColor: '#2A9D8F', padding: 14, borderRadius: 8, alignItems: 'center' }} onPress={addCourier}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Kurye Ekle</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          {loading ? (
            <ActivityIndicator size="large" color="#457B9D" />
          ) : courierList.length === 0 ? (
            <View style={{ alignItems: 'center', padding: 40 }}>
              <WebIcon name="people-outline" size={64} color="#ccc" />
              <Text style={{ color: '#999', marginTop: 12 }}>Henüz personel yok</Text>
            </View>
          ) : (
            <View>
              {/* YÖNETİM GRUBU */}
              <View style={{ marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <WebIcon name="business" size={20} color="#333" />
                  <Text style={{ fontSize: 16, fontWeight: 'bold', marginLeft: 8, color: '#333' }}>Yönetim & Ofis</Text>
                </View>
                {courierList.filter(c => c.role === 'manager' || c.role === 'chief').map(c => renderCourierItem(c))}
                {courierList.filter(c => c.role === 'manager' || c.role === 'chief').length === 0 && (
                  <Text style={{ color: '#999', fontSize: 12, marginLeft: 28 }}>Yönetici personeli bulunmuyor.</Text>
                )}
              </View>

              {/* SAHA GRUBU */}
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <WebIcon name="bicycle" size={20} color="#333" />
                  <Text style={{ fontSize: 16, fontWeight: 'bold', marginLeft: 8, color: '#333' }}>Saha / Kurye Ekibi</Text>
                </View>
                {courierList.filter(c => c.role === 'courier' || c.role === 'chief').map(c => renderCourierItem(c))}
                {courierList.filter(c => c.role === 'courier' || c.role === 'chief').length === 0 && (
                  <Text style={{ color: '#999', fontSize: 12, marginLeft: 28 }}>Aktif kurye bulunmuyor.</Text>
                )}
              </View>
            </View>
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
    WEBHOOK_SECRET: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/admin/settings`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success && data.data) {
        setKeys(prev => ({ ...prev, ...data.data }));
        // Alert.alert('Debug', 'Ayarlar sunucudan yüklendi');
      }
    } catch (error) {
      console.error('Ayarlar yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

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
        Alert.alert('Başarılı', 'Ayarlar veritabanına kaydedildi!');
      } else {
        Alert.alert('Hata', data.message || 'Kaydedilemedi');
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
            <WebIcon name="arrow-back" size={24} color="#fff" />
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

          <View style={{ marginTop: 25, padding: 15, backgroundColor: '#FFF9E6', borderRadius: 10, borderWidth: 1, borderColor: '#FFEAA7' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <WebIcon name="shield-checkmark" size={24} color="#F39C12" />
              <Text style={{ fontSize: 16, fontWeight: 'bold', marginLeft: 10, color: '#D35400' }}>Webhook Güvenliği</Text>
            </View>
            <Text style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>
              Yemek platformlarına tanımladığınız webhook adreslerini korumak için bir anahtar belirleyin. Platform tarafında "API Header" olarak gönderilmelidir.
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: '#fff', marginBottom: 0 }]}
              placeholder="x-webhook-key için bir değer girin"
              value={keys.WEBHOOK_SECRET}
              onChangeText={(t) => setKeys({ ...keys, WEBHOOK_SECRET: t })}
              secureTextEntry={true}
            />
          </View>

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

// ============= CANLI KONUM TAKİP PANELİ =============
const LiveLocationPanel = ({ user, onBack }) => {
  const [locations, setLocations] = useState([]);
  const [teamData, setTeamData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourier, setSelectedCourier] = useState(null);
  const refreshInterval = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');

      // Hem konumları hem de ekip verilerini (siparişli) paralel çek
      const [locRes, teamRes] = await Promise.all([
        fetch(`${API_URL}/couriers/locations`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/couriers/team`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const locData = await locRes.json();
      const tData = await teamRes.json();

      if (locData.success) {
        // Konum verilerini sipariş verileriyle eşleştir
        const combined = locData.data.map(loc => {
          const courierInfo = tData.success ? tData.data.find(c => c.id === loc.courierId) : null;
          return {
            ...loc,
            activeOrders: courierInfo ? courierInfo.activeOrders : 0,
            orders: courierInfo ? courierInfo.orders : []
          };
        });
        setLocations(combined);
      }
      if (tData.success) setTeamData(tData.data);

    } catch (err) {
      console.error('Veri çekme hatası:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    refreshInterval.current = setInterval(fetchData, 15000); // 15s yenile
    return () => clearInterval(refreshInterval.current);
  }, [fetchData]);

  const getTimeSince = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Az önce';
    if (minutes < 60) return `${minutes} dk önce`;
    return `${Math.floor(minutes / 60)} saat önce`;
  };

  const openInMaps = (lat, lng, name) => {
    const safeLat = parseFloat(lat);
    const safeLng = parseFloat(lng);

    if (isNaN(safeLat) || isNaN(safeLng)) {
      Alert.alert('Hata', 'Geçersiz konum verisi');
      return;
    }

    const universalUrl = `https://www.google.com/maps/search/?api=1&query=${safeLat},${safeLng}`;

    if (Platform.OS === 'web') {
      if (window.confirm(`Konum: ${safeLat}, ${safeLng}\nHaritada açmak istiyor musunuz?`)) {
        window.open(universalUrl, '_blank');
      }
      return;
    }

    const schemeUrl = Platform.select({
      ios: `maps:?q=${encodeURIComponent(name)}&ll=${safeLat},${safeLng}`,
      android: `geo:${safeLat},${safeLng}?q=${safeLat},${safeLng}(${encodeURIComponent(name)})`,
    });

    Linking.canOpenURL(schemeUrl)
      .then(supported => {
        if (supported) return Linking.openURL(schemeUrl);
        return Linking.openURL(universalUrl);
      })
      .catch(() => Linking.openURL(universalUrl));
  };

  const sortedLocations = [...locations].sort((a, b) => {
    // Önce aktifleri, sonra yenileri göster
    if (a.isStale !== b.isStale) return a.isStale ? 1 : -1;
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });

  const activeLocations = sortedLocations.filter(l => !l.isStale);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#E63946" />
      <View style={[styles.header, { backgroundColor: '#E63946' }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={onBack} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <WebIcon name="arrow-back" size={24} color="#fff" />
            <Text style={[styles.headerTitle, { marginLeft: 10 }]}>Canlı Konum Takibi</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setLoading(true); fetchLocations(); }} style={{ padding: 8 }}>
            <WebIcon name="refresh" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 12, gap: 12 }}>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#4ADE80' }} />
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>{locations.length} Kurye</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <View style={{ alignItems: 'center', padding: 60 }}>
            <ActivityIndicator size="large" color="#E63946" />
            <Text style={{ color: '#999', marginTop: 12 }}>Konumlar yükleniyor...</Text>
          </View>
        ) : locations.length === 0 ? (
          <View style={{ alignItems: 'center', padding: 60 }}>
            <WebIcon name="location-outline" size={80} color="#ccc" />
            <Text style={{ color: '#999', fontSize: 16, marginTop: 12, textAlign: 'center' }}>Henüz konum verisi yok</Text>
            <Text style={{ color: '#bbb', fontSize: 13, marginTop: 4, textAlign: 'center' }}>Kuryeler uygulamayı açtığında konumları burada görünecek</Text>
          </View>
        ) : (
          <>
            {sortedLocations.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <WebIcon name="pulse" size={22} color="#4ADE80" />
                  <Text style={styles.sectionTitle}>Aktif Kuryeler ({activeLocations.length})</Text>
                  <TouchableOpacity onPress={startLocationTracking} style={{ marginLeft: 'auto', backgroundColor: '#E63946', padding: 5, borderRadius: 5 }}>
                    <Text style={{ color: '#fff', fontSize: 10 }}>Konumu Zorla</Text>
                  </TouchableOpacity>
                </View>
                {sortedLocations.map(loc => (
                  <TouchableOpacity
                    key={loc.courierId}
                    style={[styles.orderCard, {
                      borderLeftWidth: 4,
                      borderLeftColor: loc.isStale ? '#9CA3AF' : '#4ADE80',
                      backgroundColor: selectedCourier === loc.courierId ? '#F0FFF4' : '#fff',
                      opacity: loc.isStale ? 0.9 : 1
                    }]}
                    onPress={() => setSelectedCourier(selectedCourier === loc.courierId ? null : loc.courierId)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                        <View style={{
                          width: 44, height: 44, borderRadius: 22,
                          backgroundColor: loc.role === 'chief' ? '#FEE2E2' : loc.role === 'manager' ? '#E9F5F3' : '#EBF2F7',
                          alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Text style={{ fontSize: 20 }}>
                            {loc.role === 'chief' ? '👑' : loc.role === 'manager' ? '💼' : '🏍️'}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#333' }}>{loc.name}</Text>
                            {loc.activeOrders > 0 && (
                              <View style={{ backgroundColor: '#E63946', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                                <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{loc.activeOrders} Paket</Text>
                              </View>
                            )}
                          </View>
                          <Text style={{ fontSize: 12, color: loc.isStale ? '#6B7280' : '#4ADE80', fontWeight: '600' }}>
                            ● {loc.isStale ? 'Çevrimdışı' : 'Çevrimiçi'} · {getTimeSince(loc.updatedAt)}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => openInMaps(loc.latitude, loc.longitude, loc.name)}
                        style={{ backgroundColor: '#007AFF', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <WebIcon name="navigate" size={20} color="#fff" />
                      </TouchableOpacity>
                    </View>
                    {selectedCourier === loc.courierId && (
                      <View style={{ marginTop: 12, backgroundColor: '#F8F9FA', borderRadius: 10, padding: 12 }}>
                        {loc.orders && loc.orders.length > 0 ? (
                          <View style={{ marginBottom: 12 }}>
                            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#666', marginBottom: 6 }}>📦 AKTİF PAKETLER</Text>
                            {loc.orders.map(o => (
                              <View key={o.id} style={{ backgroundColor: '#fff', padding: 8, borderRadius: 6, marginBottom: 4, borderWidth: 1, borderColor: '#eee' }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#333' }}>{o.orderNumber}</Text>
                                  <Text style={{ fontSize: 11, color: '#E63946', fontWeight: 'bold' }}>{o.platform}</Text>
                                </View>
                                <Text style={{ fontSize: 11, color: '#666', marginTop: 2 }}>👤 {o.customerName}</Text>
                                <Text style={{ fontSize: 11, color: '#999' }}>📍 {o.address}</Text>
                              </View>
                            ))}
                          </View>
                        ) : (
                          <Text style={{ fontSize: 12, color: '#999', fontStyle: 'italic', marginBottom: 10 }}>Üzerinde aktif paket bulunmuyor.</Text>
                        )}

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 8 }}>
                          <Text style={{ color: '#666', fontSize: 13 }}>📍 Konum</Text>
                          <Text style={{ color: '#333', fontSize: 13, fontWeight: '600' }}>{loc.latitude.toFixed(6)}, {loc.longitude.toFixed(6)}</Text>
                        </View>
                        {loc.phone && (
                          <TouchableOpacity
                            onPress={() => Linking.openURL(`tel:${loc.phone}`)}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}
                          >
                            <WebIcon name="call" size={16} color="#2A9D8F" />
                            <Text style={{ color: '#2A9D8F', fontSize: 13, fontWeight: '600' }}>{loc.phone}</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          onPress={() => openInMaps(loc.latitude, loc.longitude, loc.name)}
                          style={{ backgroundColor: '#E63946', padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 10, flexDirection: 'row', justifyContent: 'center', gap: 6 }}
                        >
                          <WebIcon name="map" size={18} color="#fff" />
                          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>Haritada Göster</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}


          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// ============= PERFORMANS RAPORLARI EKRANI =============
const PerformanceReportsScreen = ({ user, onBack }) => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const response = await fetch(`${API_URL}/reports/performance`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await response.json();
        if (data.success) setReport(data.data);
      } catch (err) {
        console.error('Rapor hatası:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, []);

  const StatBox = ({ label, value, icon, color }) => (
    <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, marginHorizontal: 4 }}>
      <WebIcon name={icon} size={24} color={color} />
      <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#333', marginTop: 6 }}>{value}</Text>
      <Text style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{label}</Text>
    </View>
  );

  const BarItem = ({ label, value, maxValue, color }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 4 }}>
      <Text style={{ width: 80, fontSize: 12, color: '#666' }}>{label}</Text>
      <View style={{ flex: 1, height: 22, backgroundColor: '#F3F4F6', borderRadius: 11, overflow: 'hidden' }}>
        <View style={{ width: `${maxValue > 0 ? (value / maxValue) * 100 : 0}%`, height: '100%', backgroundColor: color, borderRadius: 11, minWidth: value > 0 ? 20 : 0, justifyContent: 'center', alignItems: 'flex-end', paddingRight: 8 }}>
          {value > 0 && <Text style={{ fontSize: 10, color: '#fff', fontWeight: 'bold' }}>{value}</Text>}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6C63FF" />
      <View style={[styles.header, { backgroundColor: '#6C63FF' }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={onBack} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <WebIcon name="arrow-back" size={24} color="#fff" />
            <Text style={[styles.headerTitle, { marginLeft: 10 }]}>Performans Raporları</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <View style={{ alignItems: 'center', padding: 60 }}>
            <ActivityIndicator size="large" color="#6C63FF" />
          </View>
        ) : report ? (
          <>
            {/* Özet Kartları */}
            <View style={{ flexDirection: 'row', marginBottom: 16 }}>
              <StatBox label="Bugün" value={report.summary.todayCompleted} icon="today" color="#4ADE80" />
              <StatBox label="Bu Hafta" value={report.summary.weekCompleted} icon="calendar" color="#6C63FF" />
              <StatBox label="Bu Ay" value={report.summary.monthCompleted} icon="stats-chart" color="#F59E0B" />
            </View>

            <View style={{ flexDirection: 'row', marginBottom: 16 }}>
              <StatBox label="Aktif" value={report.summary.activeOrders} icon="bicycle" color="#E63946" />
              <StatBox label="Ort. Süre" value={`${report.summary.avgDeliveryMinutes} dk`} icon="timer" color="#2A9D8F" />
              <StatBox label="Ort. Puan" value={`${report.avgRating.score}⭐`} icon="star" color="#F59E0B" />
            </View>

            {/* Platform Dağılımı */}
            {report.platformStats.length > 0 && (
              <View style={[styles.orderCard, { marginBottom: 12 }]}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 12 }}>📊 Platform Dağılımı (Bu Ay)</Text>
                {report.platformStats.map((p, i) => (
                  <BarItem key={i} label={p.platform} value={p.count}
                    maxValue={Math.max(...report.platformStats.map(x => x.count))}
                    color={p.platform.includes('Trendyol') ? '#F27A1A' : p.platform.includes('Yemeksepeti') ? '#FF6600' : p.platform.includes('Getir') ? '#5D3EBC' : '#2A9D8F'} />
                ))}
              </View>
            )}

            {/* Günlük Trend */}
            {report.dailyTrend.length > 0 && (
              <View style={[styles.orderCard, { marginBottom: 12 }]}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 12 }}>📈 Son 7 Gün</Text>
                {report.dailyTrend.map((d, i) => {
                  const dayName = new Date(d.date).toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric' });
                  return <BarItem key={i} label={dayName} value={d.count}
                    maxValue={Math.max(...report.dailyTrend.map(x => x.count))} color="#6C63FF" />;
                })}
              </View>
            )}

            {/* Kurye Performansları */}
            {report.courierPerformance.length > 0 && (
              <View style={[styles.orderCard, { marginBottom: 12 }]}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 12 }}>🏆 Kurye Sıralaması (Haftalık)</Text>
                {report.courierPerformance.map((c, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: i < report.courierPerformance.length - 1 ? 1 : 0, borderBottomColor: '#F3F4F6' }}>
                    <Text style={{ fontSize: 20, width: 36, textAlign: 'center' }}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#333' }}>{c.name}</Text>
                      <Text style={{ fontSize: 12, color: '#999' }}>Ort. {c.avgMinutes} dk · {c.avgRating} ⭐</Text>
                    </View>
                    <View style={{ backgroundColor: '#6C63FF', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 4 }}>
                      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>{c.deliveries}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Saatlik Yoğunluk */}
            {report.hourlyStats.length > 0 && (
              <View style={[styles.orderCard, { marginBottom: 20 }]}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 12 }}>🕐 Bugünün Saatlik Dağılımı</Text>
                {report.hourlyStats.map((h, i) => (
                  <BarItem key={i} label={`${String(h.hour).padStart(2, '0')}:00`} value={h.count}
                    maxValue={Math.max(...report.hourlyStats.map(x => x.count))} color="#2A9D8F" />
                ))}
              </View>
            )}
          </>
        ) : (
          <View style={{ alignItems: 'center', padding: 60 }}>
            <WebIcon name="alert-circle-outline" size={60} color="#ccc" />
            <Text style={{ color: '#999', marginTop: 12 }}>Rapor verileri yüklenemedi</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// ============= SİPARİŞ GEÇMİŞİ EKRANI =============
const OrderHistoryScreen = ({ user, onBack }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const fetchOrders = useCallback(async (pageNum = 1, searchQuery = '', statusF = '') => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      let url = `${API_URL}/orders/history?page=${pageNum}&limit=15`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      if (statusF) url += `&status=${statusF}`;

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setOrders(pageNum === 1 ? data.data : [...orders, ...data.data]);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error('Sipariş geçmişi hatası:', err);
    } finally {
      setLoading(false);
    }
  }, [orders]);

  useEffect(() => { fetchOrders(); }, []);

  const handleSearch = () => {
    setPage(1);
    fetchOrders(1, search, statusFilter);
  };

  const loadMore = () => {
    if (pagination && page < pagination.pages) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchOrders(nextPage, search, statusFilter);
    }
  };

  const getStatusBadge = (status) => {
    const map = { active: { label: 'Aktif', color: '#E63946' }, completed: { label: 'Teslim', color: '#2A9D8F' }, cancelled: { label: 'İptal', color: '#999' } };
    const s = map[status] || { label: status, color: '#666' };
    return (
      <View style={{ backgroundColor: s.color, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
        <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{s.label}</Text>
      </View>
    );
  };

  const filters = [
    { label: 'Tümü', value: '' },
    { label: 'Aktif', value: 'active' },
    { label: 'Teslim', value: 'completed' },
    { label: 'İptal', value: 'cancelled' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#FF6B6B" />
      <View style={[styles.header, { backgroundColor: '#FF6B6B' }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={onBack} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <WebIcon name="arrow-back" size={24} color="#fff" />
            <Text style={[styles.headerTitle, { marginLeft: 10 }]}>Sipariş Geçmişi</Text>
          </TouchableOpacity>
          {pagination && <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>{pagination.total} sipariş</Text>}
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput
            style={{ flex: 1, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, elevation: 1 }}
            placeholder="Sipariş no, müşteri, adres ara..."
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity onPress={handleSearch} style={{ backgroundColor: '#FF6B6B', borderRadius: 10, width: 44, alignItems: 'center', justifyContent: 'center' }}>
            <WebIcon name="search" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10, marginBottom: 6 }}>
          {filters.map(f => (
            <TouchableOpacity key={f.value}
              onPress={() => { setStatusFilter(f.value); setPage(1); fetchOrders(1, search, f.value); }}
              style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: statusFilter === f.value ? '#FF6B6B' : '#F3F4F6', marginRight: 8 }}>
              <Text style={{ color: statusFilter === f.value ? '#fff' : '#666', fontWeight: 'bold', fontSize: 13 }}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.content}>
        {loading && page === 1 ? (
          <ActivityIndicator size="large" color="#FF6B6B" style={{ marginTop: 40 }} />
        ) : orders.length === 0 ? (
          <View style={{ alignItems: 'center', padding: 50 }}>
            <WebIcon name="document-text-outline" size={60} color="#ccc" />
            <Text style={{ color: '#999', marginTop: 12 }}>Sipariş bulunamadı</Text>
          </View>
        ) : (
          <>
            {orders.map((order, i) => (
              <View key={order._id || i} style={[styles.orderCard, { marginBottom: 8 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={{ fontWeight: 'bold', color: '#333', fontSize: 14 }}>{order.orderNumber}</Text>
                  {getStatusBadge(order.status)}
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ color: '#666', fontSize: 13 }}>{order.customerName}</Text>
                  <Text style={{ color: order.platform?.includes('Trendyol') ? '#F27A1A' : order.platform?.includes('Yemeksepeti') ? '#FF6600' : '#5D3EBC', fontSize: 12, fontWeight: 'bold' }}>{order.platform}</Text>
                </View>
                {order.courierName && <Text style={{ color: '#999', fontSize: 12 }}>🏍️ {order.courierName}</Text>}
                <Text style={{ color: '#bbb', fontSize: 11, marginTop: 4 }}>
                  {new Date(order.orderTime).toLocaleDateString('tr-TR')} {new Date(order.orderTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  {order.totalPrice ? ` · ${order.totalPrice}` : ''}
                  {order.rating ? ` · ${order.rating}⭐` : ''}
                </Text>
              </View>
            ))}
            {pagination && page < pagination.pages && (
              <TouchableOpacity onPress={loadMore} style={{ padding: 16, alignItems: 'center' }}>
                {loading ? <ActivityIndicator color="#FF6B6B" /> : <Text style={{ color: '#FF6B6B', fontWeight: 'bold' }}>Daha Fazla Yükle</Text>}
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// ============= MANUEL SİPARİŞ EKLEME EKRANI =============
const AddOrderScreen = ({ user, onBack }) => {
  const { theme } = React.useContext(ThemeContext); // Tema desteği eklendi
  const { t } = React.useContext(LanguageContext); // Dil desteği eklendi
  const [form, setForm] = useState({ customerName: '', phone: '', address: '', items: '', totalPrice: '', platform: 'Manuel' });
  const [submitting, setSubmitting] = useState(false);

  const platforms = ['Manuel', 'Telefon', 'WhatsApp', 'Diğer'];

  const handleSubmit = async () => {
    if (!form.customerName.trim() || !form.address.trim()) {
      Alert.alert('Hata', 'Müşteri adı ve adres zorunludur');
      return;
    }
    setSubmitting(true);
    try {
      // Adresi koordinata çevir (Geocoding)
      let latitude = 0;
      let longitude = 0;
      try {
        const geocoded = await Location.geocodeAsync(form.address);
        if (geocoded && geocoded.length > 0) {
          latitude = geocoded[0].latitude;
          longitude = geocoded[0].longitude;
        }
      } catch (geoError) {
        console.log('Geocoding hatası:', geoError);
        // Hata olsa bile siparişi oluşturmaya devam et
      }

      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/orders/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          items: form.items ? form.items.split(',').map(i => i.trim()) : [],
          latitude,
          longitude,
        }),
      });
      const data = await response.json();
      if (data.success) {
        Alert.alert('Başarılı', `Sipariş oluşturuldu: ${data.data.orderNumber}`, [{ text: 'Tamam', onPress: onBack }]);
      } else {
        Alert.alert('Hata', data.message);
      }
    } catch (err) {
      Alert.alert('Hata', 'Sunucuya bağlanılamadı');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor="#2A9D8F" />
      <View style={[styles.header, { backgroundColor: '#2A9D8F' }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={onBack} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <WebIcon name="arrow-back" size={24} color="#fff" />
            <Text style={[styles.headerTitle, { marginLeft: 10 }]}>{t.addOrder}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={[styles.content, { backgroundColor: theme.bg }]}>
        <View style={[styles.orderCard, { marginBottom: 16, backgroundColor: theme.card }]}>
          <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.subText, marginBottom: 6 }}>{t.platform.toUpperCase()}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {platforms.map(p => (
              <TouchableOpacity key={p}
                onPress={() => setForm({ ...form, platform: p })}
                style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: form.platform === p ? '#2A9D8F' : theme.bg, borderWidth: 1, borderColor: form.platform === p ? '#2A9D8F' : theme.border }}>
                <Text style={{ color: form.platform === p ? '#fff' : theme.text, fontWeight: 'bold', fontSize: 13 }}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.subText, marginBottom: 6 }}>{t.customerName.toUpperCase()} *</Text>
          <TextInput style={[styles.input, { marginBottom: 12, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholder={t.enterCustomerName} placeholderTextColor={theme.muted} value={form.customerName} onChangeText={v => setForm({ ...form, customerName: v })} />

          <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.subText, marginBottom: 6 }}>{t.phone.toUpperCase()}</Text>
          <TextInput style={[styles.input, { marginBottom: 12, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholder={t.enterPhone} placeholderTextColor={theme.muted} keyboardType="phone-pad" value={form.phone} onChangeText={v => setForm({ ...form, phone: v })} />

          <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.subText, marginBottom: 6 }}>{t.address.toUpperCase()} *</Text>
          <TextInput style={[styles.input, { marginBottom: 12, minHeight: 60, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholder={t.enterAddress} placeholderTextColor={theme.muted} multiline value={form.address} onChangeText={v => setForm({ ...form, address: v })} />

          <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.subText, marginBottom: 6 }}>{t.items.toUpperCase()} (virgülle ayırın)</Text>
          <TextInput style={[styles.input, { marginBottom: 12, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholder={t.enterItems} placeholderTextColor={theme.muted} value={form.items} onChangeText={v => setForm({ ...form, items: v })} />

          <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.subText, marginBottom: 6 }}>{t.total.toUpperCase()}</Text>
          <TextInput style={[styles.input, { marginBottom: 20, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholder={t.enterTotal} placeholderTextColor={theme.muted} value={form.totalPrice} onChangeText={v => setForm({ ...form, totalPrice: v })} />

          <TouchableOpacity onPress={handleSubmit} disabled={submitting}
            style={{ backgroundColor: '#2A9D8F', padding: 16, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, opacity: submitting ? 0.7 : 1 }}>
            {submitting ? <ActivityIndicator color="#fff" /> : <WebIcon name="add-circle" size={22} color="#fff" />}
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>{t.createOrder}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Giriş Ekranı (Stabilize Edilmiş v2.10.9)
const LoginScreen = ({ onLogin }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [businessCode, setBusinessCode] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    const cleanUsername = username.trim().toLowerCase();
    const cleanBizCode = businessCode.trim().toUpperCase();
    const cleanPassword = password.trim();

    console.log('[LOGIN] Giriş denemesi:', { isAdmin, username: cleanUsername });

    if ((!isAdmin && !cleanBizCode) || !cleanUsername || !cleanPassword) {
      setError('Lütfen tüm alanları doldurun');
      return;
    }

    setLoading(true);

    try {
      const endpoint = isAdmin ? '/auth/admin-login' : '/auth/login';
      const body = isAdmin
        ? { username: cleanUsername, password: cleanPassword }
        : { businessCode: cleanBizCode, username: cleanUsername, password: cleanPassword };

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
        await AsyncStorage.setItem('token', data.token);

        try {
          const pushToken = await registerForPushNotificationsAsync();
          if (pushToken) {
            await fetch(`${API_URL}/push-token`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${data.token}`,
              },
              body: JSON.stringify({ token: pushToken }),
            });
          }
        } catch (pushErr) {
          console.log('Push token kayıt hatası:', pushErr);
        }

        onLogin(data.user);
      } else {
        setError(data.message || 'Giriş başarısız. Bilgilerinizi kontrol edin.');
      }
    } catch (err) {
      setError('Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.loginContainer}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <StatusBar barStyle="light-content" backgroundColor={isAdmin ? "#2A9D8F" : "#E63946"} />

          <View style={[styles.loginHeader, { backgroundColor: isAdmin ? "#2A9D8F" : "#E63946" }]}>
            <WebIcon name={isAdmin ? "settings" : "bicycle"} size={80} color="#fff" />
            <Text style={[styles.loginTitle, { color: '#fff' }]}>Kurye Uygulaması</Text>
            <Text style={[styles.loginSubtitle, { color: '#fff' }]}>
              {isAdmin ? 'Sistem Yönetimi' : 'İşletme Girişi'}
            </Text>
          </View>

          <View style={styles.loginForm}>
            {/* Toggle Switch */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 25 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 12,
                  borderBottomWidth: !isAdmin ? 3 : 0,
                  borderColor: '#E63946',
                  alignItems: 'center'
                }}
                onPress={() => { setIsAdmin(false); setError(''); }}
              >
                <Text style={{ fontWeight: 'bold', color: !isAdmin ? '#E63946' : '#999' }}>EKİP GİRİŞİ</Text>
                <Text style={{ fontSize: 10, color: '#999' }}>Kurye / Yönetici</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 12,
                  borderBottomWidth: isAdmin ? 3 : 0,
                  borderColor: '#2A9D8F',
                  alignItems: 'center'
                }}
                onPress={() => { setIsAdmin(true); setError(''); }}
              >
                <Text style={{ fontWeight: 'bold', color: isAdmin ? '#2A9D8F' : '#999' }}>SİSTEM ADMIN</Text>
                <Text style={{ fontSize: 10, color: '#999' }}>Genel Paneli</Text>
              </TouchableOpacity>
            </View>

            {error ? (
              <View style={{ backgroundColor: '#FDECEA', padding: 12, borderRadius: 8, marginBottom: 15, borderLeftWidth: 4, borderLeftColor: '#E63946' }}>
                <Text style={{ color: '#E63946', fontWeight: 'bold', fontSize: 13 }}>⚠️ {error}</Text>
              </View>
            ) : null}

            {!isAdmin && (
              <View style={styles.inputContainer}>
                <WebIcon name="business" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="İşletme Kodu (Örn: DEMO123)"
                  value={businessCode}
                  onChangeText={setBusinessCode}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <WebIcon name="person" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Kullanıcı Adı"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <WebIcon name="lock-closed" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Şifre"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={[
                styles.loginButton,
                loading && styles.loginButtonDisabled,
                { backgroundColor: isAdmin ? "#2A9D8F" : "#E63946", marginTop: 10 }
              ]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <WebIcon name="log-in" size={24} color="#fff" />
                  <Text style={styles.loginButtonText}>Sisteme Giriş Yap</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={{ textAlign: 'center', marginTop: 30, color: '#ccc', fontSize: 10 }}>v2.10.13 - Navigation Fix Final</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};



// Merkezi Harita Açma Fonksiyonu - ULTRA SAFE MODE (Global Scope)
const openMap = (latitude, longitude, address, label) => {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  const isValidLocation = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0 && lat > -90 && lat < 90 && lng > -180 && lng < 180;

  console.log('[NAV DEBUG]', { lat, lng, isValidLocation, address });

  let universalUrl;
  if (isValidLocation) {
    universalUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  } else {
    let safeAddress = address ? address.trim() : '';
    if (!safeAddress) {
      Alert.alert('Hata', 'Konum veya adres bilgisi bulunamadı.');
      return;
    }
    const query = encodeURIComponent(safeAddress);
    universalUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
  }

  if (Platform.OS === 'web') {
    const userConfirmed = window.confirm(`Harita açılıyor: ${universalUrl}\nDevam edilsin mi?`);
    if (userConfirmed) {
      window.open(universalUrl, '_blank');
    }
    return;
  }

  const mapLabel = label ? encodeURIComponent(label) : 'Konum';
  const schemeUrl = Platform.select({
    ios: isValidLocation ? `maps:0,0?daddr=${lat},${lng}&q=${mapLabel}` : `maps:0,0?q=${encodeURIComponent(address)}`,
    android: isValidLocation ? `geo:${lat},${lng}?q=${lat},${lng}(${mapLabel})` : `geo:0,0?q=${encodeURIComponent(address)}`
  });

  Linking.canOpenURL(schemeUrl).then((supported) => {
    if (supported) Linking.openURL(schemeUrl);
    else Linking.openURL(universalUrl);
  }).catch(() => Linking.openURL(universalUrl));
};

const openNavigation = (order) => {
  openMap(order.latitude, order.longitude, order.address, order.customerName);
};

const callCustomer = (phoneNumber) => {
  const url = `tel:${phoneNumber}`;
  Linking.canOpenURL(url).then((supported) => {
    if (supported) return Linking.openURL(url);
    else Alert.alert('Hata', 'Telefon araması yapılamıyor');
  }).catch((err) => Alert.alert('Hata', 'Arama başlatılamadı'));
};

// Platform Renkleri (Performans İçin Dışarı Alındı)
const getPlatformColor = (platform) => {
  switch (platform) {
    case 'Trendyol Yemek': return '#F27A1A';
    case 'Yemeksepeti': return '#FF6600';
    case 'Getir Yemek': return '#5D3EBC';
    default: return '#666';
  }
};

// Sipariş Kartı Bileşeni (Performans İçin Dışarı Alındı)
const OrderCard = React.memo(({ order, user, theme, t, onNavigate, onCall, onDeliver, onClaim }) => (
  <View style={[styles.orderCard, { backgroundColor: theme.card }]}>
    <View style={[styles.platformBadge, { backgroundColor: getPlatformColor(order.platform) }]}>
      <Text style={styles.platformText}>{order.platform}</Text>
    </View>

    <View style={styles.orderHeader}>
      <Text style={[styles.orderNumber, { color: theme.text }]}>{order.orderNumber}</Text>
      <Text style={[styles.orderTime, { color: theme.subText }]}>
        {new Date(order.orderTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>

    <View style={styles.customerInfo}>
      <WebIcon name="person" size={20} color={theme.text} />
      <Text style={[styles.customerName, { color: theme.text }]}>{order.customerName}</Text>
    </View>

    <View style={styles.addressInfo}>
      <WebIcon name="location" size={20} color="#E63946" />
      <Text style={[styles.address, { color: theme.subText }]}>{order.address}</Text>
    </View>

    <View style={styles.itemsContainer}>
      <Text style={[styles.itemsLabel, { color: theme.text }]}>{t.items}:</Text>
      {order.items.map((item, index) => (
        <Text key={index} style={[styles.item, { color: theme.subText }]}>• {item}</Text>
      ))}
    </View>

    <View style={styles.priceContainer}>
      <Text style={[styles.priceLabel, { color: theme.text }]}>{t.total}:</Text>
      <Text style={styles.price}>{order.totalPrice}</Text>
    </View>

    <View style={styles.actionButtons}>
      <TouchableOpacity
        style={[styles.button, styles.navButton]}
        onPress={() => onNavigate(order)}
      >
        <WebIcon name="navigate" size={24} color="#fff" />
        <Text style={styles.buttonText}>{t.directions}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.callButton]}
        onPress={() => onCall(order.phone)}
      >
        <WebIcon name="call" size={24} color="#fff" />
        <Text style={styles.buttonText}>{t.call}</Text>
      </TouchableOpacity>

      {order.status === 'active' && order.courierId === user.id && (
        <TouchableOpacity
          style={[styles.button, styles.deliverButton]}
          onPress={() => onDeliver(order.id)}
        >
          <WebIcon name="checkmark-circle" size={24} color="#fff" />
          <Text style={styles.buttonText}>{t.deliver}</Text>
        </TouchableOpacity>
      )}

      {order.courierId === null && (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#457B9D' }]}
          onPress={() => onClaim(order.id, order.orderNumber)}
        >
          <WebIcon name="hand-left" size={24} color="#fff" />
          <Text style={styles.buttonText}>{t.claim}</Text>
        </TouchableOpacity>
      )}
    </View>

    {order.courierName && order.courierId !== user.id && (
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: '#EBF2F7', padding: 6, borderRadius: 6 }}>
        <WebIcon name="person-circle" size={18} color="#457B9D" />
        <Text style={{ color: '#457B9D', fontSize: 12, marginLeft: 4, fontWeight: 'bold' }}>{order.courierName} {t.onCourier}</Text>
      </View>
    )}

    {order.status === 'completed' && order.deliveryTime && (
      <View style={styles.completedBadge}>
        <WebIcon name="checkmark-circle" size={18} color="#2A9D8F" />
        <Text style={styles.completedText}>
          {t.deliveredMsg} - {new Date(order.deliveryTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    )}
  </View>
));

// Ana Uygulama
const MainApp = ({ user, onLogout }) => {
  // Guard against null user during logout transition
  if (!user) return null;

  const { theme, isDark, toggleTheme } = React.useContext(ThemeContext);
  const { t, language, changeLanguage } = React.useContext(LanguageContext);
  const isDarkMode = isDark;
  const currentLang = language;
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

  const [showLocationPanel, setShowLocationPanel] = useState(false);
  const locationWatchRef = useRef(null);
  const [ratingModal, setRatingModal] = useState({ visible: false, orderId: null, orderNumber: '' });
  const [selectedRating, setSelectedRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [optimizedRoute, setOptimizedRoute] = useState(null);
  const [showRoute, setShowRoute] = useState(false);

  // Konum takibi başlat (kurye/şef)
  const startLocationTracking = useCallback(async () => {
    console.log('[LOCATION] Starting tracking service...');
    try {
      // 1. İzinleri al (Foreground + Background)
      const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
      if (fgStatus !== 'granted') {
        console.log('Ön plan konum izni yok');
        if (Platform.OS === 'web') alert('Konum izni gerekli');
        return;
      }

      // Sadece mobilde arka plan izni iste
      if (Platform.OS !== 'web') {
        const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
        if (bgStatus === 'granted') {
          console.log('[LOCATION] Background permission granted');
          await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 30000, // 30 sn
            distanceInterval: 50, // 50 metre
            deferredUpdatesInterval: 30000,
            deferredUpdatesDistance: 50,
            foregroundService: {
              notificationTitle: "Kurye Takip",
              notificationBody: "Konumunuz paylaşılıyor",
              notificationColor: "#FF385C"
            }
          });
        }
      }

      // Ön plan takibi (Web ve Mobil için ortak yedek)
      const token = await AsyncStorage.getItem('token');
      locationWatchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 30000,
          distanceInterval: 50,
        },
        async (loc) => {
          // Zaten arka plan görevi çalışıyorsa mobilde bunu göndermeyebiliriz, 
          // ama çakışma olmaması için basit bir check veya double-send kabul edilebilir.
          // Basitlik adına: Web için kesin gerekli, mobil için foreground yedeği.
          try {
            await fetch(`${API_URL}/couriers/location`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
              }),
            });
            console.log('[LOCATION DEBUG] Location SENT successfully:', loc.coords.latitude, loc.coords.longitude);
          } catch (err) { console.error('Foreground location error:', err); }
        }
      );
    } catch (err) {
      console.error('Konum servisi başlatılamadı:', err);
    }
  }, []);

  useEffect(() => {
    loadOrders();
    loadStats();
    if (user.role === 'chief') loadTeam();

    // Uygulama açılışında UI'ı bloklamamak için gecikmeli başlat
    const timer = setTimeout(() => {
      startLocationTracking();
    }, 1000);

    const interval = setInterval(() => {
      loadOrders();
      if (user.role === 'chief') loadTeam();
    }, 30000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      if (locationWatchRef.current) locationWatchRef.current.remove();
    };
  }, []);

  const loadOrders = useCallback(async () => {
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
  }, [user.id]);

  const loadStats = useCallback(async () => {
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
  }, [user.id]);

  const loadTeam = useCallback(async () => {
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
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadOrders();
    await loadStats();
    if (user.role === 'chief') await loadTeam();
    setRefreshing(false);
  }, [loadOrders, loadStats, loadTeam, user.role]);

  const renderTeamMember = (member) => {
    const isChief = member.role === 'chief';
    const isManager = member.role === 'manager';

    return (
      <View key={member.id} style={[styles.orderCard, {
        borderLeftWidth: 3,
        borderLeftColor: isChief ? '#E63946' : isManager ? '#2A9D8F' : '#457B9D'
      }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <View>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#333' }}>{member.name}</Text>
            <Text style={{ fontSize: 12, color: isChief ? '#E63946' : isManager ? '#2A9D8F' : '#457B9D' }}>
              {isChief ? '👑 Kurye Şefi' : isManager ? '💼 Yönetici' : '🏃 Kurye'}
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
    );
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      // Stop location tracking
      if (locationWatchRef.current) {
        await locationWatchRef.current.remove();
        locationWatchRef.current = null;
      }
      if (Platform.OS !== 'web') {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => { });
      }

      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('lastReadAnnouncement'); // Optional cleanup

      setUser(null);
      setIsLoggedIn(false);
    } catch (e) {
      console.error('Logout error:', e);
      // Force state clear even on error
      setUser(null);
      setIsLoggedIn(false);
    } finally {
      setLoading(false);
    }
  };

  // ... (existing helper functions) ...



  const completeDelivery = useCallback(async (orderId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: 'completed', courierId: user.id }),
      });
      const data = await response.json();
      if (data.success) {
        Alert.alert('Başarılı', 'Sipariş teslim edildi!');
        loadOrders();
        loadStats();
        // Değerlendirme iste
        setRatingModal({ visible: true, orderId, orderNumber: data.data?.orderNumber || '' });
      } else {
        Alert.alert('Hata', data.message || 'Teslimat kaydedilemedi');
      }
    } catch (error) {
      Alert.alert('Hata', 'Sunucu hatası');
    }
  }, [loadOrders, loadStats, user.id]);

  const deliverOrder = useCallback(async (orderId) => {
    console.log('[WEB DEBUG] Deliver button pressed for:', orderId);
    if (Platform.OS === 'web') {
      console.log('[WEB DEBUG] Platform detected as WEB');
      // Basit web onayı
      if (window.confirm('Siparişi teslim etmek istiyor musunuz?')) {
        console.log('[WEB DEBUG] User confirmed. Calling completeDelivery...');
        completeDelivery(orderId).catch(err => {
          console.error('[WEB DEBUG] completeDelivery failed:', err);
          alert('Teslimat sırasında bir hata oluştu: ' + err.message);
        });
      } else {
        console.log('[WEB DEBUG] User cancelled.');
      }
      return;
    }

    Alert.alert(
      'Sipariş Teslimi',
      'Teslimat fotoğrafı çekmek ister misiniz?',
      [
        {
          text: 'Fotoğraf Çek',
          onPress: async () => {
            try {
              const { status } = await ImagePicker.requestCameraPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('Hata', 'Kamera izni gerekli');
                return;
              }
              const result = await ImagePicker.launchCameraAsync({
                quality: 0.5,
                base64: true,
                allowsEditing: false,
              });
              if (!result.canceled && result.assets[0]) {
                const token = await AsyncStorage.getItem('token');
                // Fotoğrafı kaydet
                await fetch(`${API_URL}/orders/${orderId}/photo`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                  body: JSON.stringify({ photo: result.assets[0].base64.substring(0, 5000) }),
                });
              }
            } catch (e) {
              console.log('Fotoğraf hatası:', e);
            }
            await completeDelivery(orderId);
          },
        },
        {
          text: 'Fotoğrafsız Teslim Et',
          onPress: () => completeDelivery(orderId),
        },
        { text: 'İptal', style: 'cancel' },
      ]
    );
  }, [completeDelivery]);

  const submitRating = useCallback(async () => {
    if (selectedRating === 0) {
      setRatingModal({ ...ratingModal, visible: false });
      return;
    }
    try {
      const token = await AsyncStorage.getItem('token');
      await fetch(`${API_URL}/orders/${ratingModal.orderId}/rating`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ rating: selectedRating, comment: ratingComment }),
      });
      Alert.alert('Teşekkürler!', `${selectedRating} yıldız değerlendirmeniz kaydedildi.`);
    } catch (e) {
      console.log('Rating hatası:', e);
    }
    setRatingModal({ visible: false, orderId: null, orderNumber: '' });
    setSelectedRating(0);
    setRatingComment('');
  }, [ratingModal, selectedRating, ratingComment]);


  const loadOptimizedRoute = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/orders/optimized-route?lat=${loc.coords.latitude}&lng=${loc.coords.longitude}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success && data.data.length > 0) {
        setOptimizedRoute(data);
        setShowRoute(true);
      } else {
        Alert.alert('Bilgi', 'Optimize edilecek aktif siparişiniz yok.');
      }
    } catch (err) {
      console.error('Rota hatası:', err);
    }
  }, []);

  const claimOrder = useCallback(async (orderId, orderNumber) => {
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
  }, [loadOrders, loadStats]);

  const seedDemoData = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Hata', 'Oturum açılmamış. Lütfen tekrar giriş yapın.');
        return;
      }

      const sampleOrders = [
        {
          customerName: 'Ahmet Yılmaz (Valid)',
          address: 'Atatürk Cd. No:1, İstanbul',
          totalPrice: '150 TL',
          items: ['Burger', 'Cola'],
          platform: 'Getir Yemek',
          latitude: 41.0082,
          longitude: 28.9784,
          phone: '5551234567'
        },
        {
          customerName: 'Mehmet Demir (No Coords)',
          address: 'Bağdat Cd. No:15, İstanbul',
          totalPrice: '220 TL',
          items: ['Pizza', 'Ayran'],
          platform: 'Yemeksepeti',
          latitude: 0,
          longitude: 0,
          phone: '5559876543'
        }
      ];

      let count = 0;
      for (const order of sampleOrders) {
        const response = await fetch(`${API_URL}/orders/manual`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(order)
        });

        const resData = await response.json();
        if (!response.ok) {
          throw new Error(resData.message || 'Sunucu hatası');
        }
        count++;
      }
      Alert.alert('Başarılı', `${count} adet demo sipariş eklendi.`);
      loadOrders();
    } catch (err) {
      console.error('Demo seed error:', err);
      Alert.alert('Hata', 'Demo veri eklenemedi: ' + err.message);
    }
  };



  if (showLocationPanel && user.role === 'chief') {
    return <LiveLocationPanel user={user} onBack={() => setShowLocationPanel(false)} />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.headerBg} />

      <View style={[styles.header, { backgroundColor: theme.headerBg }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>{t.appName}</Text>
            <Text style={styles.headerSubtitle}>{user.businessName}</Text>
          </View>
          <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
            <WebIcon name="log-out" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.today}</Text>
            <Text style={styles.statLabel}>{t.today}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.thisWeek}</Text>
            <Text style={styles.statLabel}>{t.thisWeek}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.avgTime}</Text>
            <Text style={styles.statLabel}>{t.avgTime}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={[styles.content, { backgroundColor: theme.bg }]}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.headerBg]} tintColor={theme.headerBg} />
        }
      >
        {poolOrders.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <WebIcon name="cube" size={24} color="#F27A1A" />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.pool} ({poolOrders.length})</Text>
              <View style={{ marginLeft: 'auto', backgroundColor: '#F27A1A', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>Sahipsiz</Text>
              </View>
            </View>
            {poolOrders.map(order => <OrderCard
              key={order.id}
              order={order}
              user={user}
              theme={theme}
              t={t}
              onNavigate={openNavigation}
              onCall={callCustomer}
              onDeliver={deliverOrder}
              onClaim={claimOrder}
            />)}
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <WebIcon name="bicycle" size={24} color="#E63946" />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.active} ({activeOrders.length})</Text>
          </View>

          {activeOrders.length === 0 ? (
            <View style={styles.emptyState}>
              <WebIcon name="checkmark-done-circle-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>Aktif sipariş yok</Text>
              <Text style={styles.emptySubtext}>Aşağı çekerek yenileyin</Text>
            </View>
          ) : (
            activeOrders.map(order => <OrderCard
              key={order.id}
              order={order}
              user={user}
              theme={theme}
              t={t}
              onNavigate={openNavigation}
              onCall={callCustomer}
              onDeliver={deliverOrder}
              onClaim={claimOrder}
            />)
          )}
        </View>

        {completedOrders.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <WebIcon name="checkmark-done" size={24} color="#2A9D8F" />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.delivered} ({completedOrders.length})</Text>
            </View>
            {completedOrders.slice(0, 5).map(order => <OrderCard
              key={order.id}
              order={order}
              user={user}
              theme={theme}
              t={t}
              onNavigate={openNavigation}
              onCall={callCustomer}
              onDeliver={deliverOrder}
              onClaim={claimOrder}
            />)}
          </View>
        )}

        {user.role === 'chief' && (
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.adminCard, { marginBottom: 12, backgroundColor: '#FEE2E2' }]}
              onPress={() => setShowLocationPanel(true)}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#E63946' }]}>
                <WebIcon name="location" size={28} color="#fff" />
              </View>
              <View style={styles.adminCardContent}>
                <Text style={styles.adminCardTitle}>Canlı Konum Takibi</Text>
                <Text style={styles.adminCardSubtitle}>Ekibinin anlık konumlarını gör</Text>
              </View>
              <WebIcon name="chevron-forward" size={24} color="#E63946" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => setShowTeam(!showTeam)}
            >
              <WebIcon name="people" size={24} color="#457B9D" />
              <Text style={styles.sectionTitle}>Ekibim ({team.length} kişi)</Text>
              <WebIcon name={showTeam ? 'chevron-up' : 'chevron-down'} size={20} color="#666" style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>

            {showTeam && (
              <View>
                {/* YÖNETİM GRUBU */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#666', marginBottom: 8, marginLeft: 4 }}>💼 YÖNETİM VE OFİS</Text>
                  {team.filter(m => m.role === 'manager' || m.role === 'chief').length === 0 ? (
                    <Text style={{ fontSize: 12, color: '#999', marginLeft: 12 }}>Yönetici personeli bulunmuyor.</Text>
                  ) : (
                    team.filter(m => m.role === 'manager' || m.role === 'chief').map(member => renderTeamMember(member))
                  )}
                </View>

                {/* SAHA GRUBU */}
                <View>
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#666', marginBottom: 8, marginLeft: 4 }}>🏍️ SAHA VE KURYE EKİBİ</Text>
                  {team.filter(m => m.role === 'courier' || m.role === 'chief').length === 0 ? (
                    <Text style={{ fontSize: 12, color: '#999', marginLeft: 12 }}>Aktif kurye bulunmuyor.</Text>
                  ) : (
                    team.filter(m => m.role === 'courier' || m.role === 'chief').map(member => renderTeamMember(member))
                  )}
                </View>
              </View>
            )}
          </View>
        )}


        <View style={{ marginTop: 16, marginBottom: 20 }}>
          <Text style={[styles.sectionTitle, { marginBottom: 12, color: theme.text }]}>⚙️ {t.settings}</Text>

          <View style={[styles.orderCard, { marginBottom: 8, backgroundColor: theme.card }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <WebIcon name={isDarkMode ? 'moon' : 'sunny'} size={22} color={isDarkMode ? '#F59E0B' : '#F97316'} />
                <Text style={{ fontSize: 15, fontWeight: 'bold', color: theme.text }}>{t.darkMode}</Text>
              </View>
              <TouchableOpacity onPress={toggleTheme}
                style={{ width: 50, height: 28, borderRadius: 14, backgroundColor: isDarkMode ? '#6C63FF' : '#E5E7EB', justifyContent: 'center', padding: 2 }}>
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', alignSelf: isDarkMode ? 'flex-end' : 'flex-start' }} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.orderCard, { backgroundColor: theme.card }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <WebIcon name="language" size={22} color="#6C63FF" />
              <Text style={{ fontSize: 15, fontWeight: 'bold', color: theme.text }}>{t.language} / Language</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[{ code: 'tr', label: '🇹🇷 Türkçe' }, { code: 'en', label: '🇬🇧 English' }, { code: 'ar', label: '🇸🇦 العربية' }].map(lang => (
                <TouchableOpacity key={lang.code}
                  onPress={() => changeLanguage(lang.code)}
                  style={{ flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: currentLang === lang.code ? '#6C63FF' : theme.bg, alignItems: 'center', borderWidth: 1, borderColor: theme.border }}>
                  <Text style={{ color: currentLang === lang.code ? '#fff' : theme.text, fontWeight: 'bold', fontSize: 12 }}>{lang.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* DEMO VERİ BUTONU */}
          {(user.role === 'manager' || user.role === 'chief' || user.username === 'kurye1') && (
            <TouchableOpacity onPress={seedDemoData} style={{ marginTop: 12, backgroundColor: '#457B9D', padding: 12, borderRadius: 10, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>🛠️ Demo Veri Ekle (+2 Sipariş)</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Rota Optimizasyonu Butonu */}
      {activeOrders.length > 1 && (
        <TouchableOpacity onPress={loadOptimizedRoute}
          style={{ position: 'absolute', bottom: 16, right: 16, backgroundColor: '#6C63FF', borderRadius: 28, width: 56, height: 56, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#6C63FF', shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { height: 3 } }}>
          <WebIcon name="navigate" size={26} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Rota Optimizasyonu Paneli */}
      {showRoute && optimizedRoute && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '70%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#333' }}>🗺️ Optimize Rota</Text>
                <Text style={{ fontSize: 13, color: '#999' }}>Toplam: {optimizedRoute.totalDistance} · {optimizedRoute.orderCount} durak</Text>
              </View>
              <TouchableOpacity onPress={() => setShowRoute(false)}>
                <WebIcon name="close-circle" size={28} color="#ccc" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {optimizedRoute.data.map((stop, i) => (
                <View key={stop.orderId} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: i < optimizedRoute.data.length - 1 ? 1 : 0, borderBottomColor: '#F3F4F6' }}>
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#6C63FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: 'bold', color: '#333', fontSize: 14 }}>{stop.customerName}</Text>
                    <Text style={{ color: '#999', fontSize: 12 }}>{stop.address?.substring(0, 50)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: '#6C63FF', fontWeight: 'bold', fontSize: 13 }}>{stop.distance}</Text>
                    <TouchableOpacity onPress={() => openMap(stop.latitude, stop.longitude, stop.address, stop.customerName)}>
                      <Text style={{ color: '#E63946', fontSize: 11, fontWeight: 'bold' }}>Yol Tarifi →</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Değerlendirme Modal */}
      {ratingModal.visible && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 30 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 340, alignItems: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 6 }}>⭐ Değerlendir</Text>
            <Text style={{ fontSize: 13, color: '#999', marginBottom: 16 }}>{ratingModal.orderNumber}</Text>

            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity key={star} onPress={() => setSelectedRating(star)}>
                  <WebIcon name={star <= selectedRating ? 'star' : 'star-outline'} size={36} color={star <= selectedRating ? '#F59E0B' : '#ddd'} />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={{ width: '100%', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, fontSize: 14, minHeight: 60, textAlignVertical: 'top', marginBottom: 16 }}
              placeholder="Yorum ekle (isteğe bağlı)"
              multiline
              value={ratingComment}
              onChangeText={setRatingComment}
            />

            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              <TouchableOpacity onPress={() => { setRatingModal({ visible: false, orderId: null, orderNumber: '' }); setSelectedRating(0); }}
                style={{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center' }}>
                <Text style={{ color: '#999', fontWeight: 'bold' }}>Geç</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={submitRating}
                style={{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#F59E0B', alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Gönder</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
  pwaOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    zIndex: 9999,
  },
  pwaModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 25,
    paddingBottom: 40,
  },
  pwaStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 10,
  },
  pwaStepText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    marginLeft: 12,
  },
  pwaCloseButton: {
    backgroundColor: '#E63946',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
});

export default App;
