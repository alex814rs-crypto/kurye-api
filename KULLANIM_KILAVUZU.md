# 📱 Kurye Takip Uygulaması — Kullanım Kılavuzu (v2.10.12)

## Uygulama Nedir?
Restoran ve yemek işletmeleri için kurye yönetim uygulamasıdır. Trendyol Yemek, Yemeksepeti ve Getir Yemek platformlarından gelen siparişleri tek bir ekrandan takip edip yönetmenizi sağlar.

---

## 🔑 Giriş Yapma

### Kurye Girişi
1. Uygulamayı açın
2. **İşletme Kodu:** İşletmenizin size verdiği kodu girin (ör: `DEMO123`)
3. **Kullanıcı Adı:** Size atanan kullanıcı adı (ör: `kurye1`)
4. **Şifre:** Şifreniz (ör: `1234`)
5. **"Giriş Yap"** butonuna basın

### Yönetici (Manager/Admin) Girişi
- Giriş ekranında **"İşletme Girişi"** sekmesini seçerek kendi yönetici bilgilerinizle sisteme girebilirsiniz.

---

## 🏍️ Kurye Ekranı

- **Sipariş Havuzu:** Atanmamış siparişleri "Üzerime Al" diyerek kendinize atayın.
- **Aktif Siparişlerim:** Üzerinizdeki paketleri görün, yol tarifi alın veya müşteriyi arayın.
- **Konum Paylaşımı:** Uygulama açıkken konumunuz otomatik olarak yönetici paneline iletilir.

---

## 💼 Yönetici & Şef Ekranı

### Saha İzleme Paneli (Canlı Takip)
Harita üzerinden ekibinizi anlık izleyin:
- **Kurye Konumu:** Kuryenin nerede olduğunu görün.
- **Paket Detayı:** Kurye isminin yanındaki etikete (Örn: 3 Paket) tıklayarak hangi siparişleri (Sipariş No, Müşteri, Adres) taşıdığını görün.
- **Hızlı Navigasyon:** Kuryenin yanına veya kurye ile müşteriye gitmek için harita ikonunu kullanın.

### Performans Raporları
- İşletmenizin günlük, haftalık ve aylık teslimat sayılarını, ortalama sürelerini ve platform dağılımlarını grafiklerle takip edin.

---

## ⚙️ API & Sistem Ayarları (Kalıcı)

### Platform Entegrasyonu
- **API Key Girişi:** Trendyol, Yemeksepeti ve Getir tarafından verilen anahtarları kaydedin.
- **DB Kaydı:** Bu bilgiler veritabanına kalıcı kaydedilir, sunucu kapansa da silinmez.

### Webhook Güvenliği
- **Webhook Secret:** Sistem Ayarları kısmına bir "Güvenlik Anahtarı" tanımlayın.
- **Doğrulama:** Platform tarafında bu anahtarı `x-webhook-key` olarak header'a eklediğinizde sadece sizin gönderdiğiniz siparişler kabul edilir.

---

## ❓ Sık Sorulan Sorular

**S: İnternet olmadan çalışır mı?**
H: Hayır, internet gereklidir.

**S: API anahtarlarım her seferinde siliniyor mu?**
H: Hayır, v2.10.12 ile birlikte ayarlar veritabanına kalıcı olarak kaydedilmektedir.

**S: Webhook URL adresim nedir?**
C: Admin panelindeki ayarlar kısmından size özel webhook linklerini görebilirsiniz.
