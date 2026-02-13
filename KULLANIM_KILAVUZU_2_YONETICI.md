# 🛠️ Kurye Takip Uygulaması — Yönetici / Geliştirici Kılavuzu (v2.10.12)

> Bu kılavuz **seni** (proje sahibi/geliştirici) içindir.

---

## 📂 Proje Yapısı (v2.10.12 Güncel)

```
kurye uygulamasi/
├── App.js                  ← Mobil uygulama & PWA ana dosyası
├── server/                 ← ✅ SUNUCU KODU (Railway)
│   ├── server.js           ← Backend API (v2.10.12: Kalıcı Ayarlar & Güvenlik)
│   ├── models/
│   │   ├── Setting.js      ← ✅ YENİ: Platform API anahtarları modeli
│   │   ├── Business.js
│   │   ├── Order.js
│   │   └── Courier.js
└── public/                 ← Web Admin Paneli dosyaları
```

---

## 🚀 Önemli Teknik Yenilikler (v2.10.12)

### 1. Kalıcı Ayarlar Sistemi (Persistence)
Eski sürümlerde `.env` veya sunucu hafızasında tutulan API keyleri artık tamamen MongoDB'de `Setting` koleksiyonunda saklanır.
- **Endpoint:** `GET/POST /api/admin/settings`
- **İşleyiş:** Sunucu açıldığında DB'deki ayarları `process.env` üzerine yükler. Admin panelinden yapılan güncellemeler anlık olarak DB'ye yazılır.

### 2. Saha İzleme (Fleet Monitoring)
Konum takibi artık sipariş verisiyle birleşiktir.
- **Detay:** `/api/couriers/team` endpoint'i artık kuryelerin üzerindeki aktif paketlerin IDsini ve detaylarını döndürür.
- **Frontend:** `LiveLocationPanel` içinde bu veriler bir "badges" ve liste yapısında gösterilir.

### 3. Webhook Güvenliği
Platform entegrasyonlarını (Yemeksepeti vb.) korumak için:
- **Header:** Tüm webhook isteklerinde `x-webhook-key` başlığı aranır.
- **Eşleşme:** Bu değer, veritabanına kaydedilen `WEBHOOK_SECRET` ile eşleşmelidir.

---

## 📦 Deployment & APK Build

### Backend (Railway)
Güncellemeleri GitHub'a pushlamanız yeterlidir:
```powershell
git add .
git commit -m "v2.10.12: Fleet Monitoring & Persistence"
git push origin main
```

### Frontend (Vercel)
Web panelini güncellemek için:
```powershell
npx vercel --prod
```

### APK (EAS Build)
Yeni native özellikler eklendiğinde APK'yı güncelleyin:
```powershell
npx eas-cli build -p android --profile preview
```

---

## 🌐 Ortam Değişkenleri (Railway Variables)
Minimum gereksinimler:
- `MONGODB_URI`: MongoDB bağlantı linki.
- `JWT_SECRET`: Token şifreleme anahtarı.
- `WEBHOOK_SECRET`: İlk kurulumda manuel set edilebilir veya Admin panelinden güncellenebilir.

---
**Durum:** v2.10.12 Yayında ✅
**Son Güncelleme:** 13 Şubat 2026
