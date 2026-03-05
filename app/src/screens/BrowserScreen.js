import React, { useState, useRef } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { cachePage } from '../services/CacheManager';
import PeerManager from '../services/PeerManager';

// Injected JS to capture the full HTML of the loaded page
const CAPTURE_JS = `
  (function() {
    try {
      const html = document.documentElement.outerHTML;
      const title = document.title || '';
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'page-captured',
        html: html,
        title: title,
        url: window.location.href
      }));
    } catch(e) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'capture-error',
        error: e.message
      }));
    }
  })();
  true;
`;

export default function BrowserScreen() {
    const [url, setUrl] = useState('');
    const [currentUrl, setCurrentUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [caching, setCaching] = useState(false);
    const [pageTitle, setPageTitle] = useState('');
    const webViewRef = useRef(null);

    function navigateTo() {
        let targetUrl = url.trim();
        if (!targetUrl) return;
        if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
            targetUrl = 'https://' + targetUrl;
        }
        setCurrentUrl(targetUrl);
    }

    async function handleCachePage() {
        if (!webViewRef.current || !currentUrl) return;
        setCaching(true);
        webViewRef.current.injectJavaScript(CAPTURE_JS);
    }

    async function handleMessage(event) {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'page-captured') {
                const result = await cachePage(data.url, data.title, data.html);
                setCaching(false);
                if (result.deduplicated) {
                    Alert.alert('Already Cached', 'This page is already in your cache (deduplicated).');
                } else {
                    Alert.alert('Cached! ✓', `"${data.title}" saved offline.\nSize: ${(data.html.length / 1024).toFixed(1)} KB`);
                    // Broadcast updated catalog to peers
                    PeerManager.broadcastCatalog();
                }
            } else if (data.type === 'capture-error') {
                setCaching(false);
                Alert.alert('Capture Error', data.error);
            }
        } catch (e) {
            setCaching(false);
            console.log('Message parse error:', e);
        }
    }

    return (
        <View style={styles.container}>
            {/* URL Bar */}
            <View style={styles.urlBar}>
                <TextInput
                    style={styles.urlInput}
                    value={url}
                    onChangeText={setUrl}
                    placeholder="Enter URL..."
                    placeholderTextColor="#555"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    returnKeyType="go"
                    onSubmitEditing={navigateTo}
                />
                <TouchableOpacity style={styles.goButton} onPress={navigateTo}>
                    <Text style={styles.goText}>Go</Text>
                </TouchableOpacity>
            </View>

            {/* Cache Button */}
            {currentUrl ? (
                <TouchableOpacity
                    style={[styles.cacheButton, caching && styles.cachingButton]}
                    onPress={handleCachePage}
                    disabled={caching}
                >
                    {caching ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <Text style={styles.cacheButtonText}>📥 Cache This Page</Text>
                    )}
                </TouchableOpacity>
            ) : null}

            {/* WebView */}
            {currentUrl ? (
                <WebView
                    ref={webViewRef}
                    source={{ uri: currentUrl }}
                    style={styles.webview}
                    onLoadStart={() => setLoading(true)}
                    onLoadEnd={() => setLoading(false)}
                    onNavigationStateChange={(navState) => {
                        setPageTitle(navState.title || '');
                        setUrl(navState.url || '');
                    }}
                    onMessage={handleMessage}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    startInLoadingState={true}
                    renderLoading={() => (
                        <View style={styles.loadingOverlay}>
                            <ActivityIndicator size="large" color="#7c5cfc" />
                            <Text style={styles.loadingText}>Loading...</Text>
                        </View>
                    )}
                />
            ) : (
                <View style={styles.placeholder}>
                    <Text style={styles.placeholderIcon}>🌐</Text>
                    <Text style={styles.placeholderText}>Enter a URL above to browse</Text>
                    <Text style={styles.placeholderHint}>
                        Cached pages can be viewed offline{'\n'}and shared with nearby peers
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a1a',
    },
    urlBar: {
        flexDirection: 'row',
        padding: 10,
        paddingTop: 50,
        backgroundColor: '#0d0d2b',
        borderBottomWidth: 1,
        borderBottomColor: '#1a1a3e',
        gap: 8,
    },
    urlInput: {
        flex: 1,
        backgroundColor: '#1a1a3e',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        color: '#e0e0ff',
        fontSize: 14,
        borderWidth: 1,
        borderColor: '#2a2a5e',
    },
    goButton: {
        backgroundColor: '#7c5cfc',
        borderRadius: 10,
        paddingHorizontal: 20,
        justifyContent: 'center',
    },
    goText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },
    cacheButton: {
        backgroundColor: '#1a8a4a',
        margin: 10,
        marginTop: 0,
        borderRadius: 10,
        padding: 12,
        alignItems: 'center',
    },
    cachingButton: {
        backgroundColor: '#555',
    },
    cacheButtonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 15,
    },
    webview: {
        flex: 1,
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: '#0a0a1a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#888',
        marginTop: 10,
        fontSize: 14,
    },
    placeholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    placeholderIcon: {
        fontSize: 64,
        marginBottom: 16,
    },
    placeholderText: {
        fontSize: 18,
        color: '#888',
        fontWeight: '600',
        textAlign: 'center',
    },
    placeholderHint: {
        fontSize: 13,
        color: '#555',
        textAlign: 'center',
        marginTop: 10,
        lineHeight: 20,
    },
});
