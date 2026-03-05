import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { readCachedContent } from '../services/CacheManager';

export default function ViewerScreen({ route, navigation }) {
    const { hash, title, localPath } = route.params;
    const [html, setHtml] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadContent();
    }, []);

    async function loadContent() {
        try {
            const content = await readCachedContent(localPath);
            setHtml(content);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#7c5cfc" />
                <Text style={styles.loadingText}>Loading cached page...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.centered}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorText}>Failed to load cached content</Text>
                <Text style={styles.errorDetail}>{error}</Text>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Text style={styles.backText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header bar */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backArrow}>←</Text>
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
                    <View style={styles.offlineBadge}>
                        <Text style={styles.offlineText}>⚡ OFFLINE</Text>
                    </View>
                </View>
            </View>

            {/* Sandboxed WebView — no external navigation */}
            <WebView
                source={{ html }}
                style={styles.webview}
                originWhitelist={['*']}
                javaScriptEnabled={false}
                domStorageEnabled={false}
                allowsLinkPreview={false}
                onShouldStartLoadWithRequest={(request) => {
                    // Block all external navigation — sandbox mode
                    if (request.url === 'about:blank' || request.url.startsWith('data:')) return true;
                    return false;
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a1a',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 50,
        paddingBottom: 12,
        paddingHorizontal: 16,
        backgroundColor: '#0d0d2b',
        borderBottomWidth: 1,
        borderBottomColor: '#1a1a3e',
        gap: 12,
    },
    backArrow: {
        fontSize: 24,
        color: '#7c5cfc',
        fontWeight: '700',
    },
    headerInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    headerTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#e0e0ff',
        flex: 1,
    },
    offlineBadge: {
        backgroundColor: '#1a8a4a',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    offlineText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    webview: {
        flex: 1,
        backgroundColor: '#fff',
    },
    centered: {
        flex: 1,
        backgroundColor: '#0a0a1a',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    loadingText: {
        color: '#888',
        marginTop: 12,
        fontSize: 14,
    },
    errorIcon: {
        fontSize: 48,
        marginBottom: 12,
    },
    errorText: {
        fontSize: 18,
        color: '#ff5252',
        fontWeight: '600',
    },
    errorDetail: {
        fontSize: 12,
        color: '#888',
        marginTop: 8,
        textAlign: 'center',
    },
    backButton: {
        marginTop: 20,
        backgroundColor: '#7c5cfc',
        borderRadius: 10,
        paddingHorizontal: 24,
        paddingVertical: 12,
    },
    backText: {
        color: '#fff',
        fontWeight: '700',
    },
});
