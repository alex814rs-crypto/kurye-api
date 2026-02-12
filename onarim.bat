@echo off
echo ===================================================
echo Kurye Uygulamasi - Temizlik ve Onarim Araci
echo ===================================================
echo.
echo 1. node_modules siliniyor...
if exist node_modules (
    rmdir /s /q node_modules
    echo    - node_modules silindi.
) else (
    echo    - node_modules zaten yok.
)

echo.
echo 2. .expo klasoru temizleniyor (Onemli)...
if exist .expo (
    rmdir /s /q .expo
    echo    - .expo klasoru silindi.
) else (
    echo    - .expo klasoru zaten yok.
)

echo.
echo 3. package-lock.json siliniyor...
if exist package-lock.json (
    del package-lock.json
    echo    - package-lock.json silindi.
) else (
    echo    - package-lock.json zaten yok.
)

echo.
echo 3. Paketler temiz kurulumla yukleniyor (bu islem biraz surebilir)...
call npm install
if %errorlevel% neq 0 (
    echo    HATA: "npm install" basarisiz oldu. Lutfen Node.js'in yuklu oldugundan emin olun.
    pause
    exit /b %errorlevel%
)

echo.
echo 4. Vezyonlar onariliyor (SDK 54 Guncellemesi)...
call npx expo install --fix
if %errorlevel% neq 0 (
    echo    HATA: Expo onarimi basarisiz oldu.
    pause
    exit /b %errorlevel%
)

echo.
echo ===================================================
echo TAMAMLANDI!
echo ===================================================
echo.
echo Simdi uygulamayi baslatmak icin "npm run android" veya "npm run ios" komutunu kullanabilirsiniz.
echo.
pause
