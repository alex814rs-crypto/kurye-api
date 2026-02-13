# PROJE DURUM RAPORU - Kurye Takip Uygulaması
**Tarih:** 13 Şubat 2026
**Versiyon:** 2.10.12
**Platform:** Android (React Native / Expo) & Web (PWA)
**Durum:** ✅ Canlı (Production)

---

## 📋 Proje Özeti

Restoran ve yemek işletmelerinin kurye operasyonlarını dijitalleştiren mobil uygulama. Birden fazla yemek platformundan (Trendyol Yemek, Yemeksepeti, Getir Yemek) gelen siparişleri tek merkezden yönetir.

---

## 🏗️ Sistem Mimarisi

```
┌──────────────┐     HTTPS      ┌──────────────────┐     MongoDB     ┌──────────────┐
│  Mobil App   │ ◄────────────► │  Railway Server  │ ◄────────────► │ MongoDB Atlas│
│  (Expo/RN)   │                │  (Node/Express)  │                │  (Cloud DB)  │
└──────────────┘                └──────────────────┘                └──────────────┘
                                        ▲
                                        │ Webhook
                            ┌───────────┴───────────┐
                            │  Yemek Platformları    │
                            │  (TY / YS / Getir)     │
                            └────────────────────────┘
```

| Katman | Teknoloji | Detay |
|--------|-----------|-------|
| **Frontend** | React Native + Expo | Tek codebase, Android & iOS & Web |
| **Backend** | Node.js + Express | RESTful API, JWT Auth |
| **Veritabanı** | MongoDB Atlas | Bulut, kalıcı (Kurye, Sipariş, **Ayar** modelleri) |
| **Hosting** | Railway & Vercel | Backend Railway, Frontend Vercel (PWA) |
| **Auth** | JWT + bcrypt | 7 gün token süresi |

---

## ✅ Tamamlanan Özellikler

### Faz 1: Temel Altyapı
- [x] Express.js REST API sunucusu
- [x] JWT tabanlı kimlik doğrulama
- [x] CORS desteği (mobil erişim)
- [x] Health check endpoint

### Faz 2: Kullanıcı Yönetimi
- [x] Kurye girişi (işletme kodu + kullanıcı adı + şifre)
- [x] Admin girişi
- [x] Rol sistemi: `courier` (Kurye), `chief` (Şef), `manager` (Yönetici), `admin`
- [x] Şifre hash'leme (bcrypt)

### Faz 3: Sipariş Yönetimi
- [x] Sipariş listeleme (aktif / tamamlanmış)
- [x] Sipariş havuzu (atanmamış siparişler)
- [x] Sipariş üzerine alma (claim) sistemi
- [x] Sipariş teslim etme
- [x] Yol tarifi (Google Maps entegrasyonu)
- [x] Müşteri arama özelliği

### Faz 4: Admin & Yönetici Paneli
- [x] Kurye ekleme/silme/listeleme (Rol bazlı: Manager sadece kendi işletmesini görür)
- [x] **API Ayarları (V2.10.12)**: Trendyol, Yemeksepeti, Getir anahtarlarının DB'ye kalıcı kaydı
- [x] **Webhook Güvenliği**: Dış siparişler için `x-webhook-key` doğrulama sistemi
- [x] **Gelişmiş Saha Takibi**: Kuryenin konumuna ek olarak üzerindeki paket detaylarını görme
- [x] Performans raporları ve grafikler (Günlük/Haftalık/Aylık)

### Faz 5: Kurye Şefi Paneli
- [x] Ekip görüntüleme (Saha ve Ofis personeli ayrımı)
- [x] Kuryeların aktif paket sayıları ve detaylı paket listesi

### Faz 6: Bulut Deployment
- [x] Railway Backend (Auto-deploy via GitHub)
- [x] Vercel Frontend (PWA desteği)
- [x] HTTPS güvenli bağlantı

---

## 📁 Dosya Yapısı

```
kurye uygulamasi/
├── App.js                  # Ana mobil uygulama
├── app.json                # Expo yapılandırması
├── KULLANIM_KILAVUZU.md    # Kullanıcı rehberi
├── assets/                 # Resim ve ikonlar
└── server/                 # Backend sunucu
    ├── server.js           # Ana API sunucusu (Gelişmiş)
    ├── database.js         # MongoDB bağlantı yönetimi
    └── models/
        ├── Business.js     # İşletme modeli
        ├── Courier.js      # Kurye modeli
        ├── Order.js        # Sipariş modeli
        ├── Setting.js      # Kalıcı ayarlar modeli (Yeni)
        └── Admin.js        # Admin modeli
```

---

## 🔌 API Endpoint'leri (Özet)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/api/auth/login` | Kurye/İşletme girişi |
| GET | `/api/orders` | Siparişleri listeler |
| GET | `/api/couriers/locations` | Canlı kurye konumları |
| GET | `/api/couriers/team` | Kurye yükleri ve ekip durumu |
| GET/POST | `/api/admin/settings` | API anahtarlarını oku/yaz (Kalıcı) |
| POST | `/api/webhooks/*` | Platform entegrasyonları |

---

## 🌐 Canlı Sistem Bilgileri

| Bilgi | Değer |
|-------|-------|
| **API URL** | `https://kurye-api-production.up.railway.app` |
| **Panel URL** | `https://kurye-app-zeta.vercel.app` |
| **Veritabanı** | MongoDB Atlas (Kalıcı) |

---

## 📈 Gelecek Planları

| Faz | Özellik | Durum |
|-----|---------|-------|
| — | Gerçek zamanlı bildirimler (Push) | ✅ Tamamlandı |
| — | Kurye konum takibi (GPS) | ✅ Tamamlandı |
| — | Performans raporları & grafikler | ✅ Tamamlandı |
| — | Sipariş geçmişi & arama | ✅ Tamamlandı |
| — | Manuel sipariş ekleme (Mobil) | ✅ Tamamlandı |
| — | Çoklu dil desteği (TR/EN/AR) | ✅ Tamamlandı |
| — | Paket & Konum Senkronizasyonu | ✅ Tamamlandı |

---

## 📁 Dosya Yapısı

```
kurye uygulamasi/
├── App.js                  # Ana mobil uygulama (1200+ satır)
├── app.json                # Expo yapılandırması
├── eas.json                # APK build yapılandırması
├── package.json            # Mobil bağımlılıklar
├── KULLANIM_KILAVUZU.md    # Kullanıcı rehberi
├── PROJE_RAPORU.md         # Bu dosya
├── assets/                 # İkon, splash screen
└── server/                 # Backend sunucu
    ├── server.js           # Ana API sunucusu (400+ satır)
    ├── database.js         # MongoDB bağlantı yönetimi
    ├── seed.js             # Demo veri yükleme scripti
    ├── package.json        # Sunucu bağımlılıkları
    ├── .env                # Ortam değişkenleri (lokal)
    └── models/
        ├── Business.js     # İşletme modeli
        ├── Courier.js      # Kurye modeli
        ├── Order.js        # Sipariş modeli
        └── Admin.js        # Admin modeli
```

---

## 🔌 API Endpoint'leri

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/api/auth/login` | Kurye girişi |
| POST | `/api/auth/admin-login` | Admin girişi |
| GET | `/api/orders` | Sipariş listele |
| POST | `/api/orders` | Yeni sipariş |
| PATCH | `/api/orders/:id` | Sipariş güncelle |
| PATCH | `/api/orders/:id/claim` | Sipariş üzerine al |
| GET | `/api/couriers/team` | Ekip bilgisi (şef) |
| GET | `/api/businesses/:id/couriers` | Kurye listesi |
| POST | `/api/businesses/:id/couriers` | Kurye ekle |
| DELETE | `/api/couriers/:id` | Kurye sil |
| GET | `/api/couriers/:id/stats` | Kurye istatistik |
| POST | `/api/webhooks/trendyol/:code` | TY webhook |
| POST | `/api/webhooks/yemeksepeti/:code` | YS webhook |
| POST | `/api/webhooks/getir/:code` | Getir webhook |
| GET | `/health` | Sağlık kontrolü |

---

## 🔧 Kurulum Rehberi (Teknik)

### Gereksinimler
- Node.js 18+
- npm
- Expo CLI
- MongoDB Atlas hesabı
- Railway hesabı (veya başka PaaS)

### Yerel Geliştirme
```bash
# Mobil uygulama
cd "kurye uygulamasi"
npm install
npx expo start --tunnel

# Backend (ayrı terminal)
cd server
npm install
echo "MONGODB_URI=mongodb+srv://..." > .env
node seed.js   # İlk kez
node server.js
```

### Production Deployment
1. `server/` klasörünü GitHub'a push
2. Railway'de GitHub repo'yu bağla
3. Railway Variables: `MONGODB_URI`, `JWT_SECRET` ekle
4. Otomatik deploy

---

## 🌐 Canlı Sistem Bilgileri

| Bilgi | Değer |
|-------|-------|
| **API URL** | `https://kurye-api-production.up.railway.app` |
| **Veritabanı** | MongoDB Atlas (M0 Free, Frankfurt) |
| **Hosting** | Railway (Auto-deploy) |
| **Protokol** | HTTPS |

### Demo Hesaplar
| Rol | Giriş Bilgileri |
|-----|----------------|
| Admin | `admin` / `admin123` |
| Kurye | İşletme: `DEMO123`, Kullanıcı: `kurye1`, Şifre: `1234` |
| Kurye Şefi | İşletme: `DEMO123`, Kullanıcı: `sef1`, Şifre: `1234` |

---

## 📈 Gelecek Planları

| Faz | Özellik | Durum |
|-----|---------|-------|
| Faz 3 | Gerçek platform API entegrasyonları | ⏳ Partner anlaşması gerekli |
| Faz 4 | APK oluşturma & mağaza yayını | ✅ Tamamlandı |
| Faz 5 | Güvenlik güçlendirme | ✅ Tamamlandı |
| — | Gerçek zamanlı bildirimler (Push) | ✅ Tamamlandı |
| — | Kurye konum takibi (GPS) | ✅ Tamamlandı |
| — | Performans raporları & grafikler | ✅ Tamamlandı |
| — | Sipariş geçmişi & arama | ✅ Tamamlandı |
| — | Manuel sipariş ekleme (Mobil) | ✅ Tamamlandı |
| — | Karanlık mod | ✅ Tamamlandı |
| — | Teslimat fotoğrafı | ✅ Tamamlandı |
| — | Çoklu dil desteği (TR/EN/AR) | ✅ Tamamlandı |
| — | Rota optimizasyonu | ✅ Tamamlandı |
| — | Müşteri değerlendirmesi (yıldız) | ✅ Tamamlandı |
