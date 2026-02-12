# 🚴‍♂️ Kurye Uygulaması - Profesyonel Sistem

## 📋 Sistem Özeti

Bu sistem 3 ana bileşenden oluşur:

1. **Mobil Uygulama** (iOS & Android) - Kuryeler için
2. **Web Panel** - İşletme sahipleri için  
3. **Backend API** - Sunucu (kendi sunucunuzda çalışır)

---

## 🎯 Özellikler

### Mobil Uygulama (Kuryeler)
- ✅ İşletme kodu + kullanıcı adı/şifre ile giriş
- ✅ Tek tıkla navigasyon
- ✅ Tek tıkla müşteri arama
- ✅ Tek tuşla teslimat
- ✅ Gerçek zamanlı sipariş güncelleme
- ✅ İstatistikler

### Web Panel (İşletme Sahipleri)
- ✅ Sipariş yönetimi
- ✅ Kurye ekleme/çıkarma
- ✅ İstatistikler
- ✅ Webhook entegrasyonları
- ✅ İşletme ayarları

### Backend API
- ✅ Çoklu işletme desteği
- ✅ JWT kimlik doğrulama
- ✅ Webhook endpoints
- ✅ RESTful API

---

## 🚀 Kurulum

### 1. Backend Kurulumu (Kendi Sunucunuzda)

#### Gereksinimler
- Ubuntu/Debian sunucu
- Node.js 18+
- Port 3000 açık

#### Adımlar

```bash
# Sunucunuza SSH ile bağlanın
ssh kullanici@sunucu-ip

# Node.js yükleyin (yoksa)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Proje klasörü oluşturun
mkdir kurye-backend
cd kurye-backend

# server.js ve backend-package.json dosyalarını yükleyin
# (FTP, SFTP veya scp ile)

# package.json'u kopyalayın
cp backend-package.json package.json

# Bağımlılıkları yükleyin
npm install

# Sunucuyu başlatın
npm start

# Veya PM2 ile sürekli çalışır hale getirin
npm install -g pm2
pm2 start server.js --name kurye-backend
pm2 save
pm2 startup
```

#### Sunucu IP'sini Öğrenme
```bash
# Sunucunuzun IP adresini öğrenin
curl ifconfig.me
# Örnek: 185.123.45.67
```

**ÖNEMLİ:** App.js dosyasında API_URL'i güncelleyin:
```javascript
const API_URL = 'http://185.123.45.67:3000/api';
```

---

### 2. Mobil Uygulama Kurulumu

#### Gereksinimler
- Bilgisayarınızda Node.js 18+
- Expo CLI

#### Adımlar

```bash
# Proje klasörüne gidin
cd kurye-pro-system

# Expo CLI'yi kurun
npm install -g expo-cli

# Bağımlılıkları yükleyin
npm install

# Uygulamayı başlatın
npx expo start
```

#### APK Oluşturma (Android)

```bash
# EAS CLI'yi kurun
npm install -g eas-cli

# EAS'a giriş yapın (Expo hesabı gerekir)
eas login

# Build yapılandırması oluşturun
eas build:configure

# APK oluşturun
eas build --platform android --profile preview

# APK indirilecek, kuryelerinize dağıtın
```

**APK'yı telefonlara yüklemek:**
1. APK dosyasını indirin
2. WhatsApp/Email ile kuryelere gönderin
3. Kurye telefonunda "Bilinmeyen kaynaklardan yükleme" açık olmalı
4. APK'yı çalıştırıp yükleyin

---

### 3. Web Panel Kurulumu

#### Basit Yöntem (Statik Hosting)

```bash
# business-panel.html dosyasını sunucunuza yükleyin
# Örnek: /var/www/html/kurye-panel.html

# Nginx yapılandırması
sudo nano /etc/nginx/sites-available/default

# Ekleyin:
location /panel {
    alias /var/www/html;
    index kurye-panel.html;
}

# Nginx'i yeniden başlatın
sudo systemctl restart nginx
```

**Erişim:** `http://sunucu-ip/panel/kurye-panel.html`

---

## 🔐 Sistem Kullanımı

### Yeni İşletme Ekleme

1. **Admin olarak backend'e istek gönderin:**

```bash
curl -X POST http://sunucu-ip:3000/api/admin/businesses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin-token" \
  -d '{
    "name": "Burger Palace",
    "owner": "Ali Veli",
    "email": "info@burgerpalace.com",
    "phone": "+905551234567",
    "address": "İstanbul"
  }'
```

**Cevap:** İşletme kodu gelecek, örn: `BUR456`

2. **İşletme sahibine verin:**
   - İşletme Kodu: BUR456
   - Panel Adresi: http://sunucu-ip/panel/kurye-panel.html

### Kurye Ekleme

1. İşletme sahibi panele giriş yapar
2. "Kuryeler" sekmesine tıklar
3. "+ Yeni Kurye Ekle" butonuna basar
4. Bilgileri girer:
   - Ad Soyad
   - Kullanıcı Adı
   - Şifre
   - Telefon
5. Kaydeder

**Kurye'ye verin:**
- İşletme Kodu: BUR456
- Kullanıcı Adı: kurye1
- Şifre: 1234

### Sipariş Akışı

#### Otomatik (Webhook)

1. Trendyol/Yemeksepeti/Getir webhook ayarlarına gidin
2. Webhook URL'i ekleyin:
   ```
   http://sunucu-ip:3000/api/webhooks/trendyol/BUR456
   ```
3. Sipariş geldiğinde otomatik sisteme düşer
4. Kurye mobil uygulamada görür

#### Manuel

1. İşletme panelinden "+ Yeni Sipariş Ekle"
2. Bilgileri girin
3. Kaydet
4. Kurye uygulamada görür

---

## 📱 Kurye Kullanımı

1. **Giriş:**
   - İşletme Kodu: BUR456
   - Kullanıcı Adı: kurye1
   - Şifre: 1234

2. **Sipariş Görme:**
   - Ana ekranda tüm aktif siparişler
   - Aşağı çekerek yenile

3. **Navigasyon:**
   - "Yol Tarifi" → Google Maps açılır

4. **Müşteri Arama:**
   - "Ara" → Otomatik arama başlar

5. **Teslimat:**
   - "Teslim Et" → Onay ver → Tamamlandı

---

## 🔧 Yapılandırma

### Ortam Değişkenleri

Backend'de `.env` dosyası oluşturun:

```env
PORT=3000
JWT_SECRET=super-gizli-anahtar-degistir
NODE_ENV=production
```

### Güvenlik

**Önemli:**
1. JWT_SECRET'i değiştirin
2. HTTPS kullanın (Let's Encrypt ücretsiz)
3. Firewall kuralları ekleyin
4. Düzenli yedekleme yapın

---

## 🏢 İş Modeli

### Fiyatlandırma Önerisi

- **Kurulum Ücreti:** 2.000-5.000 TL
- **Aylık Abonelik:** 500-1.000 TL/işletme
- **Kurye Başı:** 50-100 TL/ay

### Satış Senaryosu

1. Restorana gidin
2. Demo gösterin (DEMO123 / kurye1 / 1234)
3. Sorunları anlatın:
   - Kod girme kaybı
   - Yanlış konum
   - Platform karmaşası
4. Çözümü gösterin
5. Kurulum yapın

### Kurulum Süreci

**Gün 1:** 
- Backend kurulumu
- İşletme oluşturma
- Web panel ayarları

**Gün 2:**
- Kurye bilgilerini alma
- Kullanıcı hesapları oluşturma
- APK yükleme

**Gün 3:**
- Eğitim
- Webhook kurulumu
- Test siparişleri

---

## 📞 Destek

### Demo Hesaplar

**Admin:**
- Kullanıcı: admin
- Şifre: admin123

**Demo İşletme:**
- Kod: DEMO123
- Panel Şifresi: admin123

**Demo Kurye:**
- İşletme: DEMO123
- Kullanıcı: kurye1
- Şifre: 1234

---

## 🐛 Sorun Giderme

### Backend Çalışmıyor
```bash
# Logları kontrol edin
pm2 logs kurye-backend

# Port kullanımda mı?
netof -tulpn | grep 3000

# Yeniden başlatın
pm2 restart kurye-backend
```

### Mobil Uygulama Bağlanamıyor
1. API_URL doğru mu kontrol edin
2. Sunucu erişilebilir mi: `ping sunucu-ip`
3. Port 3000 açık mı kontrol edin
4. Telefon ve sunucu aynı ağda değilse internet gerekir

### APK Yüklenmiyor
1. "Bilinmeyen kaynaklardan yükleme" açık olmalı
2. Eski sürümü silip tekrar deneyin
3. Yeterli alan var mı kontrol edin

---

## 📄 Lisans

MIT License - Ticari kullanım için uygundur

---

## ✅ Kontrol Listesi

- [ ] Backend sunucuya kuruldu
- [ ] Server.js'te JWT_SECRET değiştirildi
- [ ] App.js'te API_URL güncellendi
- [ ] APK oluşturuldu
- [ ] Web panel erişilebilir
- [ ] Test işletmesi oluşturuldu
- [ ] Test kuryesi oluşturuldu
- [ ] Demo sipariş test edildi
- [ ] Webhook URL'leri hazır

---

**Başarılar! 🚀**
