import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar,
} from 'react-native';
import { getCacheStats } from '../services/CacheManager';
import PeerManager from '../services/PeerManager';

export default function HomeScreen({ navigation }) {
    const [cacheStats, setCacheStats] = useState({ count: 0, totalSize: 0, maxSize: 0 });
    const [peerCount, setPeerCount] = useState(0);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        loadStats();
        const unsubscribe = PeerManager.addListener((event) => {
            if (event === 'connected') setConnected(true);
            if (event === 'disconnected') setConnected(false);
            if (event === 'peers-updated') setPeerCount(PeerManager.getPeers().length);
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', loadStats);
        return unsubscribe;
    }, [navigation]);

    async function loadStats() {
        try {
            const stats = await getCacheStats();
            setCacheStats(stats);
            setPeerCount(PeerManager.getPeers().length);
            setConnected(PeerManager.isConnected());
        } catch (e) {
            console.log('Stats error:', e);
        }
    }

    function formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#0a0a1a" />

            <View style={styles.header}>
                <Text style={styles.logo}>◈ Reality Cache</Text>
                <Text style={styles.subtitle}>Proximity-Based Offline Web</Text>
            </View>

            <ScrollView style={styles.content}>
                {/* Status Card */}
                <View style={styles.statusCard}>
                    <View style={[styles.statusDot, connected ? styles.dotOnline : styles.dotOffline]} />
                    <Text style={styles.statusText}>
                        {connected ? 'Connected to Mesh' : 'Offline Mode'}
                    </Text>
                </View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate('Cache')}>
                        <Text style={styles.statNumber}>{cacheStats.count}</Text>
                        <Text style={styles.statLabel}>Cached Pages</Text>
                        <Text style={styles.statDetail}>
                            {formatBytes(cacheStats.totalSize)} / {formatBytes(cacheStats.maxSize)}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate('Peers')}>
                        <Text style={styles.statNumber}>{peerCount}</Text>
                        <Text style={styles.statLabel}>Nearby Peers</Text>
                        <Text style={styles.statDetail}>
                            {connected ? 'Active mesh' : 'Not connected'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Quick Actions */}
                <Text style={styles.sectionTitle}>Quick Actions</Text>

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('Browser')}
                >
                    <Text style={styles.actionIcon}>🌐</Text>
                    <View style={styles.actionTextContainer}>
                        <Text style={styles.actionTitle}>Browse & Cache</Text>
                        <Text style={styles.actionDesc}>Open a website and save it offline</Text>
                    </View>
                    <Text style={styles.actionArrow}>→</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('Cache')}
                >
                    <Text style={styles.actionIcon}>📦</Text>
                    <View style={styles.actionTextContainer}>
                        <Text style={styles.actionTitle}>View Cache</Text>
                        <Text style={styles.actionDesc}>Browse your saved offline content</Text>
                    </View>
                    <Text style={styles.actionArrow}>→</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('Peers')}
                >
                    <Text style={styles.actionIcon}>📡</Text>
                    <View style={styles.actionTextContainer}>
                        <Text style={styles.actionTitle}>Discover Peers</Text>
                        <Text style={styles.actionDesc}>Find nearby devices and share content</Text>
                    </View>
                    <Text style={styles.actionArrow}>→</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a1a',
    },
    header: {
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
        backgroundColor: '#0d0d2b',
        borderBottomWidth: 1,
        borderBottomColor: '#1a1a3e',
    },
    logo: {
        fontSize: 28,
        fontWeight: '800',
        color: '#7c5cfc',
        letterSpacing: 1,
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    statusCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#111133',
        borderRadius: 12,
        padding: 14,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#1a1a3e',
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 10,
    },
    dotOnline: { backgroundColor: '#00e676' },
    dotOffline: { backgroundColor: '#ff5252' },
    statusText: {
        color: '#ccc',
        fontSize: 14,
        fontWeight: '600',
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#111133',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#1a1a3e',
    },
    statNumber: {
        fontSize: 36,
        fontWeight: '800',
        color: '#7c5cfc',
    },
    statLabel: {
        fontSize: 14,
        color: '#aaa',
        marginTop: 4,
        fontWeight: '600',
    },
    statDetail: {
        fontSize: 11,
        color: '#555',
        marginTop: 6,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#888',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#111133',
        borderRadius: 14,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#1a1a3e',
    },
    actionIcon: {
        fontSize: 28,
        marginRight: 14,
    },
    actionTextContainer: {
        flex: 1,
    },
    actionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#e0e0ff',
    },
    actionDesc: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    actionArrow: {
        fontSize: 20,
        color: '#7c5cfc',
        fontWeight: '700',
    },
});
