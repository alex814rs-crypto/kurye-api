
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
