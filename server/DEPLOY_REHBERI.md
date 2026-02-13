# Railway Deploy Rehberi 🚀

## 1. Railway Hesabı Oluştur
1. [railway.app](https://railway.app) adresine git
2. **GitHub ile giriş yap** (GitHub hesabın yoksa önce [github.com](https://github.com) üzerinden oluştur)

## 2. GitHub'a Sunucu Kodunu Yükle
Masaüstünde **PowerShell** aç ve şu komutları sırayla yaz:

```powershell
cd "C:\Users\AdminA\Desktop\kurye uygulamasi"
npm install
git init
git add -A
git commit -m "Kurye API Consolidate"
```

Sonra GitHub'da **yeni bir repo** oluştur (`kurye-api` adıyla) ve şu komutları çalıştır:

```powershell
git remote add origin https://github.com/SENİN-KULLANICI-ADIN/kurye-api.git
git branch -M main
git push -u origin main
```

## 3. Railway'de Deploy Et
1. [railway.app/new](https://railway.app/new) → **Deploy from GitHub repo**
2. `kurye-api` reposunu seç
3. Railway otomatik olarak:
   - `npm install` çalıştırır
   - `npm start` (yani `node server.js`) ile sunucuyu başlatır
4. Birkaç dakika bekle, **yeşil tik ✅** görünce hazır!

## 4. URL'yi Al ve Uygulamaya Yaz
1. Railway panelinde projenin **Settings → Domains** bölümüne git
2. **Generate Domain** butonuna tıkla
3. Sana `https://kurye-api-production-xxxx.up.railway.app` gibi bir URL verecek
4. Bu URL'yi kopyala

## 5. App.js'de API_URL'yi Güncelle
`App.js` dosyasını aç ve şu satırı bul:

```javascript
const API_URL = 'http://192.168.1.100:3000/api';
```

Bunu Railway URL'si ile değiştir:

```javascript
const API_URL = 'https://kurye-api-production-xxxx.up.railway.app/api';
```

## 6. Test Et 🎉
Artık telefonun Wi-Fi'ye bağlı olmasına gerek yok!
Hücresel veri ile bile çalışacak.

---

## ⚠️ Önemli Notlar
- Railway ücretsiz deneme $5 kredi veriyor (yaklaşık 1 ay yeter)
- Sonrası aylık ~$5 civarı
- Sunucu kodu değiştirdiğinizde `git push` yapmanız yeterli, Railway otomatik günceller
