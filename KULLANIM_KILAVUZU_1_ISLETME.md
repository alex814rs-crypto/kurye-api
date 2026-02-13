# 📱 Kurye Takip Uygulaması — İşletme Kullanım Kılavuzu (v2.10.12)

> Bu kılavuz, uygulamayı kullanan **işletme sahipleri, yöneticiler ve kuryeler** içindir.

---

## 🏢 Sisteme Genel Bakış
Kurye Takip Uygulaması, restoranınızdaki kurye operasyonlarını tek bir yerden yönetmenizi sağlar:
- **Mobil Uygulama** → Kuryeler telefonlarına yükler.
- **Yönetici Paneli** → İşletme sahibi/manager uygulama içinden veya webden kullanır.
- **Otomatik Entegrasyon** → Trendyol Yemek, Yemeksepeti, Getir Yemek siparişleri anlık düşer.

---

## 🔑 Giriş Yapma

### Kurye Girişi
1. **İşletme Kodu:** Size verilen kod (ör: `DEMO123`)
2. **Kullanıcı Adı/Şifre:** Size tanımlanan bilgiler.

### Yönetici (Manager) Girişi
- Giriş ekranında **"İşletme Girişi"** sekmesine geçerek size özel yönetici hesabıyla girin. Bu hesapla tüm kuryeleri ve ayarları yönetebilirsiniz.

---

## 📍 Saha İzleme Paneli (Canlı Takip)

En yeni sürümle birlikte kuryelerin sadece nerede olduğunu değil, ne taşıdığını da görebilirsiniz:

1. **Harita Görünümü:** Kuryelerin anlık konumları harita üzerinde simgelerle görünür.
2. **Paket Sayısı:** Kurye isminin yanındaki kırmızı etiketten (Örn: 2 Paket) o an üzerinde kaç aktif sipariş olduğunu görün.
3. **Detaylı Paket Listesi:** Kuryeye tıkladığınızda alt tarafta açılan listeden; **Sipariş No, Müşteri İsmi ve Adres** bilgilerini detaylıca takip edin.

---

## ⚙️ API ve Platform Ayarları
Artık platform ayarlarını her seferinde girmek zorunda değilsiniz:

### Kalıcı Ayarlar
- **Sistem Ayarları** ekranından Trendyol, Yemeksepeti ve Getir anahtarlarınızı bir kez girmeniz yeterlidir. Veriler güvenli bir şekilde veritabanına kaydedilir.

### Webhook Güvenliği
- **Güvenlik Anahtarı:** Ayarlar kısmına kendi belirlediğiniz bir şifreyi (Webhook Secret) girin. Bu anahtar, platformlardan gelen siparişlerin gerçekten o platformdan geldiğini doğrulamak için kullanılır.

---

## ❓ Sık Sorulan Sorular

**S: API anahtarlarım silinir mi?**
C: Hayır, v2.10.12 sürümüyle tüm ayarlarınız veritabanında kalıcı olarak saklanır.

**S: Bir kuryenin hangi paketleri taşıdığını nasıl görürüm?**
C: Canlı Takip (Saha İzleme) ekranında kuryenin ismine veya paket sayısına tıklamanız yeterlidir.

**S: Sistem güvenli mi?**
C: Evet, tüm veri trafiği HTTPS ile şifrelenir ve webhook mesajları "Güvenlik Anahtarı" ile doğrulanır.

---

## 📞 Destek
Herhangi bir sorun veya soru için bizimle iletişime geçin.
