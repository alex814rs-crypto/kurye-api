# 🍎 iOS Kurulum Kılavuzu

## 📋 Gereksinimler

### Zorunlu
- ✅ Mac bilgisayar (macOS 12+)
- ✅ Xcode 15+ 
- ✅ Apple Developer hesabı (99$/yıl)
- ✅ iPhone test cihazı

### Mac'iniz Yoksa?
**Alternatif Çözümler:**
1. **EAS Build kullanın** - Bulutta build yapar, Mac'e gerek yok ✅ (Önerilen)
2. Mac kiralamaya (MacinCloud, MacStadium)
3. Arkadaşınızdan/işletmeden Mac ödünç alın

---

## 🚀 Yöntem 1: EAS Build (Mac Gerekmez!) ⭐

En kolay yöntem - Expo bulutta build yapar.

### Adım 1: Apple Developer Hesabı

1. https://developer.apple.com/programs/enroll/ adresine gidin
2. "Start Your Enrollment" tıklayın
3. Apple ID ile giriş yapın
4. 99$ ödeme yapın
5. Onay bekleyin (1-2 gün)

### Adım 2: EAS CLI Kurulumu

```bash
# Terminal'de:
npm install -g eas-cli

# EAS'a giriş (Expo hesabı oluşturun)
eas login
```

### Adım 3: Projeyi Hazırlayın

```bash
cd kurye-pro-system

# Build yapılandırması
eas build:configure

# eas.json dosyası oluşturulur
```

**eas.json'u düzenleyin:**
```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "ios": {
        "buildType": "release"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "sizin@email.com",
        "ascAppId": "12345678",
        "appleTeamId": "ABCD123456"
      }
    }
  }
}
```

### Adım 4: iOS Build

```bash
# TestFlight için build
eas build --platform ios --profile production

# Süreç:
# 1. Apple hesabınızı bağlamanız istenecek
# 2. Bundle ID onayı
# 3. Build başlar (bulutta, 15-20 dk)
# 4. Tamamlanınca link gelir
```

### Adım 5: TestFlight'a Yükleme

```bash
# Otomatik submit
eas submit --platform ios

# Veya manuel:
# 1. IPA dosyasını indirin
# 2. Transporter uygulamasıyla yükleyin
```

### Adım 6: TestFlight'tan Dağıtım

1. **App Store Connect**'e gidin: https://appstoreconnect.apple.com
2. **TestFlight** sekmesi → **My Apps**
3. Uygulamanızı seçin
4. **External Testing** → **Create Group**
5. Grup adı: "Kuryeler"
6. **Add Testers** → Email adresleri ekleyin

**Kuryeler için:**
- Email'e davet gelir
- TestFlight uygulamasını indirirler (App Store'dan ücretsiz)
- Davet linkine tıklarlar
- Uygulamayı yüklerler

---

## 🚀 Yöntem 2: Xcode ile (Mac Gerekir)

### Adım 1: Xcode Kurulumu

```bash
# Mac App Store'dan Xcode'u indirin (ücretsiz, ~15GB)
# Veya:
xcode-select --install
```

### Adım 2: Certificates & Provisioning

1. **Xcode'u açın**
2. **Preferences** → **Accounts**
3. **+** butonuna tıklayın → Apple ID ekleyin
4. **Manage Certificates** → **+** → **Apple Development**

### Adım 3: Expo Eject (Gerekirse)

```bash
# Bare workflow'a geçiş
expo eject

# Veya
expo prebuild
```

### Adım 4: Xcode'da Aç

```bash
# iOS klasörünü Xcode'da açın
open ios/KuryeApp.xcworkspace
```

### Adım 5: Signing & Capabilities

1. Project Navigator'da projeyi seçin
2. **Signing & Capabilities** sekmesi
3. **Team**: Apple Developer hesabınızı seçin
4. **Bundle Identifier**: com.kuryeapp.delivery

### Adım 6: Build

1. **Product** → **Archive**
2. Build tamamlandığında **Organizer** açılır
3. **Distribute App** → **TestFlight**
4. **Upload** → Tamamlanmasını bekleyin

---

## 🎯 TestFlight Kullanımı

### İşletme Sahipleri İçin

**Her yeni işletme için:**

1. App Store Connect → **TestFlight**
2. **Groups** → "İşletme-X" adında grup oluştur
3. O işletmenin kuryelerini ekle
4. Davet gönder

**Avantajlar:**
- Gruplar halinde yönetim
- İstediğiniz zaman kaldırabilirsiniz
- Her işletme için ayrı grup
- 10.000'e kadar test kullanıcısı

### Kurye Kurulumu

**Kuryeye göndereceğiniz talimat:**

```
Merhaba,

Kurye uygulamasını yüklemek için:

1. iPhone'unuzda App Store'u açın
2. "TestFlight" uygulamasını indirin (ücretsiz)
3. Email'inizde gelen daveti açın
4. "View in TestFlight" butonuna tıklayın
5. "Install" butonuna basın
6. Uygulama yüklendi!

Giriş Bilgileriniz:
İşletme Kodu: BUR456
Kullanıcı Adı: kurye1
Şifre: 1234

İyi teslimatlar!
```

---

## 💰 Maliyetler

### EAS Build
- **Free Plan**: 30 build/ay (küçük işletmeler için yeterli)
- **Production Plan**: $29/ay (sınırsız build)

### Apple Developer
- **$99/yıl** (zorunlu)

### Toplam Maliyet
- **İlk yıl:** $99 (Apple) + $0-348 (EAS) = $99-447
- **Sonraki yıllar:** $99-447/yıl

---

## 🔄 Güncelleme Süreci

### Yeni Versiyon Yayınlama

```bash
# 1. Versiyon numarasını artırın (app.json)
"version": "2.0.1",
"ios": {
  "buildNumber": "2"
}

# 2. Yeni build
eas build --platform ios --profile production

# 3. TestFlight'a submit
eas submit --platform ios

# 4. Kuryeler otomatik güncellemeleri alır
```

---

## 🆚 TestFlight vs App Store

| Özellik | TestFlight | App Store |
|---------|------------|-----------|
| Onay süresi | Yok | 1-3 gün |
| Kullanıcı sayısı | 10.000 | Sınırsız |
| Kullanım süresi | 90 gün | Sınırsız |
| Kontrol | Tam | Orta |
| Gizlilik | Yüksek | Düşük |
| Ücret | $99/yıl | $99/yıl |

**Önerim:** İlk başta TestFlight, büyüdükçe App Store

---

## 📱 Her İki Platform (iOS + Android)

### Tek Komutla Build

```bash
# Hem iOS hem Android
eas build --platform all --profile production

# Hem ikisini de submit
eas submit --platform all
```

### CI/CD Otomasyonu

```bash
# GitHub Actions ile otomatik build
# Her commit'te otomatik güncelleme
# Detaylar: https://docs.expo.dev/build/building-on-ci/
```

---

## ❓ Sık Sorulan Sorular

**S: Mac'im yok, ne yapmalıyım?**
C: EAS Build kullanın, bulutta build yapar. Mac'e gerek yok.

**S: TestFlight 90 günde mi bitiyor?**
C: Evet, ama yeni build yüklerseniz 90 gün daha uzar. Veya App Store'a geçin.

**S: Kuryeler App Store'da görecek mi?**
C: Hayır, TestFlight gizlidir. Sadece davet edilenler görür.

**S: Her işletme için ayrı uygulama mı?**
C: Hayır! Tek uygulama, her işletme kendi koduyla giriş yapar.

**S: Apple onay sürecinde ne sorarlar?**
C: Uygulamanın amacını, test hesabı, gizlilik politikası

---

## ✅ iOS Kurulum Kontrol Listesi

- [ ] Apple Developer hesabı alındı ($99)
- [ ] EAS CLI kuruldu
- [ ] app.json dosyası güncellendi
- [ ] iOS build başarılı
- [ ] TestFlight'a yüklendi
- [ ] Test grubu oluşturuldu
- [ ] Test kullanıcıları eklendi
- [ ] Davetler gönderildi
- [ ] Kurye test etti
- [ ] Giriş çalışıyor
- [ ] Navigasyon çalışıyor
- [ ] Arama çalışıyor
- [ ] Teslimat çalışıyor

---

## 🎉 Başarılı!

iOS uygulamanız artık hazır! Android + iOS ile tüm kuryelere ulaşabilirsiniz.

**Destek için:** İhtiyacınız olursa yardımcı olabilirim!
