import React, { useEffect, useState } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import PeerManager from '../services/PeerManager';

const DEFAULT_SERVER = 'http://192.168.31.209:3001'; // Change to your server IP

export default function PeersScreen() {
    const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER);
    const [connected, setConnected] = useState(false);
    const [peers, setPeers] = useState([]);
    const [downloading, setDownloading] = useState(new Set());

    useEffect(() => {
        const unsubscribe = PeerManager.addListener((event, data) => {
            switch (event) {
                case 'connected':
                    setConnected(true);
                    break;
                case 'disconnected':
                    setConnected(false);
                    setPeers([]);
                    break;
                case 'peers-updated':
                case 'catalog-updated':
                    setPeers([...PeerManager.getPeers()]);
                    break;
                case 'download-started':
                    setDownloading(prev => new Set(prev).add(data.hash));
                    break;
                case 'download-complete':
                    setDownloading(prev => {
                        const next = new Set(prev);
                        next.delete(data.hash);
                        return next;
                    });
                    Alert.alert('Downloaded!', 'Content saved to your cache.');
                    break;
                case 'error':
                    Alert.alert('Connection Error', data || 'Unknown error');
                    break;
            }
        });
        setConnected(PeerManager.isConnected());
        setPeers([...PeerManager.getPeers()]);
        return unsubscribe;
    }, []);

    function handleConnect() {
        const peerId = 'peer_' + Math.random().toString(36).substr(2, 9);
        PeerManager.connect(serverUrl, peerId, 'Android Device');
    }

    function handleDisconnect() {
        PeerManager.disconnect();
        setConnected(false);
        setPeers([]);
    }

    async function handleDownload(fromPeerId, hash) {
        await PeerManager.requestContent(fromPeerId, hash);
    }

    function renderPeer({ item }) {
        return (
            <View style={styles.peerCard}>
                <View style={styles.peerHeader}>
                    <View style={styles.peerDot} />
                    <Text style={styles.peerName}>{item.deviceName}</Text>
                    <Text style={styles.peerId}>{item.peerId.slice(0, 12)}...</Text>
                </View>

                {item.catalog && item.catalog.length > 0 ? (
                    <View style={styles.catalogContainer}>
                        <Text style={styles.catalogTitle}>
                            Available Content ({item.catalog.length})
                        </Text>
                        {item.catalog.map((entry) => (
                            <View key={entry.hash} style={styles.catalogItem}>
                                <View style={styles.catalogInfo}>
                                    <Text style={styles.catalogItemTitle} numberOfLines={1}>
                                        {entry.title}
                                    </Text>
                                    <Text style={styles.catalogItemUrl} numberOfLines={1}>
                                        {entry.url}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={[
                                        styles.downloadButton,
                                        downloading.has(entry.hash) && styles.downloadingButton,
                                    ]}
                                    onPress={() => handleDownload(item.peerId, entry.hash)}
                                    disabled={downloading.has(entry.hash)}
                                >
                                    {downloading.has(entry.hash) ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Text style={styles.downloadText}>↓</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                ) : (
                    <Text style={styles.noCatalog}>No shared content</Text>
                )}
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>📡 Nearby Peers</Text>
                <Text style={styles.headerStats}>
                    {peers.length} peer{peers.length !== 1 ? 's' : ''} • {connected ? 'Online' : 'Offline'}
                </Text>
            </View>

            {/* Connection Controls */}
            <View style={styles.connectSection}>
                <TextInput
                    style={styles.serverInput}
                    value={serverUrl}
                    onChangeText={setServerUrl}
                    placeholder="Signaling server URL"
                    placeholderTextColor="#555"
                    editable={!connected}
                />
                <TouchableOpacity
                    style={[styles.connectButton, connected && styles.disconnectButton]}
                    onPress={connected ? handleDisconnect : handleConnect}
                >
                    <Text style={styles.connectText}>
                        {connected ? 'Disconnect' : 'Connect'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Peers List */}
            <FlatList
                data={peers}
                keyExtractor={(item) => item.peerId}
                renderItem={renderPeer}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Text style={styles.emptyIcon}>📡</Text>
                        <Text style={styles.emptyText}>
                            {connected ? 'Waiting for peers...' : 'Connect to discover peers'}
                        </Text>
                        <Text style={styles.emptyHint}>
                            Other devices on the same network will appear here
                        </Text>
                    </View>
                }
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
        paddingTop: 50,
        paddingBottom: 14,
        paddingHorizontal: 20,
        backgroundColor: '#0d0d2b',
        borderBottomWidth: 1,
        borderBottomColor: '#1a1a3e',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#e0e0ff',
    },
    headerStats: {
        fontSize: 13,
        color: '#666',
        marginTop: 4,
    },
    connectSection: {
        flexDirection: 'row',
        padding: 12,
        gap: 8,
    },
    serverInput: {
        flex: 1,
        backgroundColor: '#1a1a3e',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        color: '#e0e0ff',
        fontSize: 13,
        borderWidth: 1,
        borderColor: '#2a2a5e',
    },
    connectButton: {
        backgroundColor: '#7c5cfc',
        borderRadius: 10,
        paddingHorizontal: 18,
        justifyContent: 'center',
    },
    disconnectButton: {
        backgroundColor: '#dc3545',
    },
    connectText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 13,
    },
    list: {
        paddingHorizontal: 12,
        paddingBottom: 20,
    },
    peerCard: {
        backgroundColor: '#111133',
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#1a1a3e',
    },
    peerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    peerDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#00e676',
        marginRight: 8,
    },
    peerName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#e0e0ff',
        flex: 1,
    },
    peerId: {
        fontSize: 11,
        color: '#555',
        fontFamily: 'monospace',
    },
    catalogContainer: {
        borderTopWidth: 1,
        borderTopColor: '#1a1a3e',
        paddingTop: 10,
    },
    catalogTitle: {
        fontSize: 12,
        color: '#888',
        fontWeight: '600',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    catalogItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0d0d2b',
        borderRadius: 8,
        padding: 10,
        marginBottom: 6,
    },
    catalogInfo: {
        flex: 1,
    },
    catalogItemTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#ccc',
    },
    catalogItemUrl: {
        fontSize: 11,
        color: '#7c5cfc',
        marginTop: 2,
    },
    downloadButton: {
        backgroundColor: '#1a8a4a',
        borderRadius: 8,
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
    },
    downloadingButton: {
        backgroundColor: '#555',
    },
    downloadText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    noCatalog: {
        color: '#555',
        fontSize: 12,
        fontStyle: 'italic',
    },
    empty: {
        alignItems: 'center',
        paddingTop: 80,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 12,
    },
    emptyText: {
        fontSize: 18,
        color: '#888',
        fontWeight: '600',
        textAlign: 'center',
    },
    emptyHint: {
        fontSize: 13,
        color: '#555',
        marginTop: 6,
        textAlign: 'center',
    },
});
