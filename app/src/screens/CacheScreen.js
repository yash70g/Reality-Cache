import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, TextInput,
} from 'react-native';
import { getAllCachedPages, deleteCachedPage, getCacheStats } from '../services/CacheManager';

export default function CacheScreen({ navigation }) {
    const [pages, setPages] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [search, setSearch] = useState('');
    const [stats, setStats] = useState({ count: 0, totalSize: 0 });

    const loadPages = useCallback(async () => {
        const all = await getAllCachedPages();
        setPages(all);
        setFiltered(all);
        const s = await getCacheStats();
        setStats(s);
    }, []);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', loadPages);
        return unsubscribe;
    }, [navigation, loadPages]);

    useEffect(() => {
        if (!search.trim()) {
            setFiltered(pages);
        } else {
            const q = search.toLowerCase();
            setFiltered(pages.filter(p =>
                p.title.toLowerCase().includes(q) || p.url.toLowerCase().includes(q)
            ));
        }
    }, [search, pages]);

    function formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    function formatDate(ts) {
        return new Date(ts).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        });
    }

    async function handleDelete(hash, title) {
        Alert.alert('Delete Cache', `Remove "${title}" from cache?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    await deleteCachedPage(hash);
                    loadPages();
                },
            },
        ]);
    }

    function renderItem({ item }) {
        return (
            <TouchableOpacity
                style={styles.pageCard}
                onPress={() => navigation.navigate('Viewer', {
                    hash: item.hash,
                    title: item.title,
                    localPath: item.local_path,
                })}
                onLongPress={() => handleDelete(item.hash, item.title)}
            >
                <View style={styles.pageInfo}>
                    <Text style={styles.pageTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.pageUrl} numberOfLines={1}>{item.url}</Text>
                    <View style={styles.pageMeta}>
                        <Text style={styles.metaText}>{formatBytes(item.size)}</Text>
                        <Text style={styles.metaDot}>•</Text>
                        <Text style={styles.metaText}>{formatDate(item.created_at)}</Text>
                        <Text style={styles.metaDot}>•</Text>
                        <Text style={styles.metaText}>{item.access_count}x viewed</Text>
                    </View>
                </View>
                <Text style={styles.viewArrow}>→</Text>
            </TouchableOpacity>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>📦 Cached Content</Text>
                <Text style={styles.headerStats}>
                    {stats.count} pages • {formatBytes(stats.totalSize)}
                </Text>
            </View>

            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search cached pages..."
                    placeholderTextColor="#555"
                />
            </View>

            <FlatList
                data={filtered}
                keyExtractor={(item) => item.hash}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Text style={styles.emptyIcon}>📭</Text>
                        <Text style={styles.emptyText}>No cached pages yet</Text>
                        <Text style={styles.emptyHint}>Use the Browser tab to cache web pages</Text>
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
    searchContainer: {
        padding: 12,
    },
    searchInput: {
        backgroundColor: '#1a1a3e',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        color: '#e0e0ff',
        fontSize: 14,
        borderWidth: 1,
        borderColor: '#2a2a5e',
    },
    list: {
        paddingHorizontal: 12,
        paddingBottom: 20,
    },
    pageCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#111133',
        borderRadius: 12,
        padding: 14,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#1a1a3e',
    },
    pageInfo: {
        flex: 1,
    },
    pageTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#e0e0ff',
    },
    pageUrl: {
        fontSize: 12,
        color: '#7c5cfc',
        marginTop: 2,
    },
    pageMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        gap: 6,
    },
    metaText: {
        fontSize: 11,
        color: '#555',
    },
    metaDot: {
        color: '#333',
        fontSize: 11,
    },
    viewArrow: {
        fontSize: 20,
        color: '#7c5cfc',
        fontWeight: '700',
        marginLeft: 10,
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
    },
    emptyHint: {
        fontSize: 13,
        color: '#555',
        marginTop: 6,
    },
});
