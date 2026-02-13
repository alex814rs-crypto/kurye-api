const fetch = global.fetch || require('node-fetch');

// Platform API Servisi
const PlatformAPI = {
    // Trendyol Yemek - Sipariş Teslim Edildi Bildirimi
    // Dokümantasyon: https://developers.trendyol.com/
    async updateTrendyol(order, business) {
        if (!business.apiKeys?.trendyol?.apiKey || !business.apiKeys?.trendyol?.supplierId) {
            console.log('[TRENDYOL] API anahtarı veya Satıcı ID eksik.');
            return { success: false, message: 'API bilgileri eksik' };
        }

        const { apiKey, supplierId } = business.apiKeys.trendyol;
        // Not: Trendyol Yemek için endpoint genellikle shipment package ID üzerinden ilerler.
        // Burada sipariş numarasını (ackId veya orderNumber) kullanarak işlem yapıyoruz.
        const url = `https://api.trendyol.com/sapigw/suppliers/${supplierId}/shipment-packages/${order.orderNumber}/delivered`;

        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`, // Genellikle Basic Auth (ApiKey:Open)
                    'Content-Type': 'application/json',
                    'User-Agent': `${business.code} - KuryeApp`
                },
                body: JSON.stringify({ status: 'Delivered' })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[TRENDYOL ERROR] ${response.status} - ${errorText}`);
                return { success: false, error: errorText };
            }

            console.log(`[TRENDYOL] Sipariş ${order.orderNumber} teslim edildi olarak güncellendi.`);
            return { success: true };
        } catch (error) {
            console.error('[TRENDYOL EXCEPTION]', error);
            return { success: false, error: error.message };
        }
    },

    // Yemeksepeti - Sipariş Teslim Edildi Bildirimi
    // Yemeksepeti entegrasyonu genellikle özel "Restaurant API" üzerinden yürür.
    async updateYemeksepeti(order, business) {
        if (!business.apiKeys?.yemeksepeti?.apiKey) {
            console.log('[YEMEKSEPETI] API anahtarı eksik.');
            return { success: false, message: 'API bilgileri eksik' };
        }

        const { apiKey } = business.apiKeys.yemeksepeti;
        // Örnek Endpoint (Entegratör firmaya göre değişebilir)
        const url = `https://api.yemeksepeti.com/v1/orders/${order.orderNumber}/status`;

        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: 'DELIVERED' })
            });

            if (!response.ok) {
                console.error(`[YEMEKSEPETI ERROR] ${response.status}`);
                return { success: false };
            }

            console.log(`[YEMEKSEPETI] Sipariş ${order.orderNumber} teslim edildi.`);
            return { success: true };
        } catch (error) {
            console.error('[YEMEKSEPETI EXCEPTION]', error);
            return { success: false, error: error.message };
        }
    },

    // Getir Yemek - Sipariş Teslim Edildi Bildirimi (Delivery Type 2 - Restoran Teslimatı)
    async updateGetir(order, business) {
        if (!business.apiKeys?.getir?.apiKey) {
            console.log('[GETIR] API anahtarı eksik.');
            return { success: false, message: 'API bilgileri eksik' };
        }

        const { apiKey } = business.apiKeys.getir;
        const url = `https://food-api.getir.com/food-orders/${order.orderNumber}/deliver`;

        try {
            const response = await fetch(url, {
                method: 'POST', // Getir genelde POST kullanır
                headers: {
                    'token': apiKey, // Getir API'si genelde 'token' header'ı kullanır
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({}) // Body boş olabilir veya detay içerebilir
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[GETIR ERROR] ${response.status} - ${errorText}`);
                return { success: false, error: errorText };
            }

            console.log(`[GETIR] Sipariş ${order.orderNumber} teslim edildi.`);
            return { success: true };
        } catch (error) {
            console.error('[GETIR EXCEPTION]', error);
            return { success: false, error: error.message };
        }
    }
};

module.exports = PlatformAPI;
