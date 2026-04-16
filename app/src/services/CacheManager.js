import * as FileSystem from 'expo-file-system/legacy';
import * as SQLite from 'expo-sqlite';
import { hashString } from './ContentHasher';

const CACHE_DIR = FileSystem.documentDirectory + 'reality_cache/';
const MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100 MB default

let db = null;
let dbInitialized = false;

/**
 * Get a valid database connection, initializing if needed.
 */
async function getDb() {
    if (db && dbInitialized) {
        return db;
    }
    return await initCache();
}

export async function initCache() {
    try {
        // Already initialized — return existing handle
        if (db && dbInitialized) return db;

        // Ensure cache directory exists
        const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
        if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
        }

        // Open SQLite database synchronously — avoids the Android
        // NullPointerException caused by concurrent async open/close cycles
        db = SQLite.openDatabaseSync('realitycache');

        // Create tables (execSync runs on the JS thread, fully blocking)
        db.execSync(`
            CREATE TABLE IF NOT EXISTS cached_pages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                hash TEXT UNIQUE NOT NULL,
                url TEXT NOT NULL,
                title TEXT DEFAULT 'Untitled',
                mime_type TEXT DEFAULT 'text/html',
                size INTEGER DEFAULT 0,
                local_path TEXT NOT NULL,
                last_accessed INTEGER NOT NULL,
                access_count INTEGER DEFAULT 1,
                created_at INTEGER NOT NULL
            );
        `);
        db.execSync('CREATE INDEX IF NOT EXISTS idx_hash ON cached_pages(hash);');
        db.execSync('CREATE INDEX IF NOT EXISTS idx_url ON cached_pages(url);');
        db.execSync('CREATE INDEX IF NOT EXISTS idx_last_accessed ON cached_pages(last_accessed);');

        dbInitialized = true;
        console.log('[CacheManager] Database initialized successfully');
        return db;
    } catch (e) {
        console.log('[CacheManager] initCache error:', e);
        db = null;
        dbInitialized = false;
        throw e;
    }
}

/**
 * Cache a web page's HTML content.
 * Returns { deduplicated: boolean, entry: object }
 */
export async function cachePage(url, title, htmlContent) {
    const database = await getDb();

    const hash = await hashString(htmlContent);
    const now = Date.now();

    // Deduplication check
    const existing = await database.getFirstAsync(
        'SELECT * FROM cached_pages WHERE hash = ?',
        [hash]
    );

    if (existing) {
        // Update access metadata
        await database.runAsync(
            'UPDATE cached_pages SET last_accessed = ?, access_count = access_count + 1 WHERE hash = ?',
            [now, hash]
        );
        return { deduplicated: true, entry: existing };
    }

    // Save HTML to file system
    const fileName = `${hash}.html`;
    const localPath = CACHE_DIR + fileName;
    await FileSystem.writeAsStringAsync(localPath, htmlContent, {
        encoding: FileSystem.EncodingType.UTF8,
    });

    const fileInfo = await FileSystem.getInfoAsync(localPath);
    const size = fileInfo.size || htmlContent.length;

    // Insert into database
    await database.runAsync(
        `INSERT INTO cached_pages (hash, url, title, mime_type, size, local_path, last_accessed, created_at)
     VALUES (?, ?, ?, 'text/html', ?, ?, ?, ?)`,
        [hash, url, title || 'Untitled', size, localPath, now, now]
    );

    // Run eviction if needed
    await evictIfNeeded();

    const entry = await database.getFirstAsync(
        'SELECT * FROM cached_pages WHERE hash = ?',
        [hash]
    );
    return { deduplicated: false, entry };
}

/**
 * Get all cached pages.
 */
export async function getAllCachedPages() {
    const database = await getDb();
    return await database.getAllAsync(
        'SELECT * FROM cached_pages ORDER BY last_accessed DESC'
    );
}

/**
 * Get cached page by hash.
 */
export async function getPageByHash(hash) {
    const database = await getDb();
    const entry = await database.getFirstAsync(
        'SELECT * FROM cached_pages WHERE hash = ?',
        [hash]
    );
    if (!entry) return null;

    // Update access stats
    await database.runAsync(
        'UPDATE cached_pages SET last_accessed = ?, access_count = access_count + 1 WHERE hash = ?',
        [Date.now(), hash]
    );
    return entry;
}

/**
 * Read the HTML content of a cached page.
 */
export async function readCachedContent(localPath) {
    return await FileSystem.readAsStringAsync(localPath, {
        encoding: FileSystem.EncodingType.UTF8,
    });
}

/**
 * Delete a cached page by hash.
 */
export async function deleteCachedPage(hash) {
    const database = await getDb();
    const entry = await database.getFirstAsync(
        'SELECT * FROM cached_pages WHERE hash = ?',
        [hash]
    );
    if (entry) {
        // Delete file
        try {
            const fileInfo = await FileSystem.getInfoAsync(entry.local_path);
            if (fileInfo.exists) {
                await FileSystem.deleteAsync(entry.local_path);
            }
        } catch (e) {
            console.log('[CacheManager] File delete error:', e);
        }
        // Delete DB record
        await database.runAsync('DELETE FROM cached_pages WHERE hash = ?', [hash]);
    }
}

/**
 * Get total cache size in bytes.
 */
export async function getCacheSize() {
    const database = await getDb();
    const result = await database.getFirstAsync(
        'SELECT COALESCE(SUM(size), 0) as total FROM cached_pages'
    );
    return result?.total || 0;
}

/**
 * Get cache stats.
 */
export async function getCacheStats() {
    const database = await getDb();
    const countResult = await database.getFirstAsync(
        'SELECT COUNT(*) as count FROM cached_pages'
    );
    const sizeResult = await database.getFirstAsync(
        'SELECT COALESCE(SUM(size), 0) as total FROM cached_pages'
    );
    return {
        count: countResult?.count || 0,
        totalSize: sizeResult?.total || 0,
        maxSize: MAX_CACHE_SIZE,
    };
}

/**
 * LRU eviction — remove least-recently-used pages when over quota.
 */
async function evictIfNeeded() {
    const totalSize = await getCacheSize();
    if (totalSize <= MAX_CACHE_SIZE) return;

    const database = await getDb();
    const pages = await database.getAllAsync(
        'SELECT * FROM cached_pages ORDER BY last_accessed ASC, access_count ASC'
    );

    let currentSize = totalSize;
    for (const page of pages) {
        if (currentSize <= MAX_CACHE_SIZE * 0.8) break;
        await deleteCachedPage(page.hash);
        currentSize -= page.size;
    }
}

/**
 * Get catalog metadata for P2P exchange.
 */
export async function getCatalog() {
    const database = await getDb();
    return await database.getAllAsync(
        'SELECT hash, url, title, mime_type, size, created_at FROM cached_pages ORDER BY last_accessed DESC'
    );
}

/**
 * Save content received from a peer.
 */
export async function saveFromPeer(hash, url, title, htmlContent) {
    return await cachePage(url, title, htmlContent);
}
