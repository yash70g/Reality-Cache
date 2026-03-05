import { io } from 'socket.io-client';
import { getCatalog, readCachedContent, getPageByHash, saveFromPeer } from './CacheManager';

const CHUNK_SIZE = 16 * 1024; // 16KB chunks for WebRTC transfer

class PeerManager {
    constructor() {
        this.socket = null;
        this.peerId = null;
        this.deviceName = 'Unknown';
        this.peers = new Map();          // peerId -> { deviceName, catalog }
        this.connections = new Map();    // peerId -> RTCPeerConnection (placeholder)
        this.dataChannels = new Map();   // peerId -> RTCDataChannel (placeholder)
        this.listeners = new Set();
        this.serverUrl = null;
    }

    /**
     * Connect to the signaling server.
     */
    connect(serverUrl, peerId, deviceName) {
        this.serverUrl = serverUrl;
        this.peerId = peerId;
        this.deviceName = deviceName || 'Android Device';

        this.socket = io(serverUrl, {
            transports: ['websocket'],
            reconnection: true,
            reconnectionDelay: 2000,
        });

        this.socket.on('connect', () => {
            console.log('[PeerManager] Connected to signaling server');
            this.socket.emit('register', { peerId, deviceName });
            this._notify('connected');
        });

        this.socket.on('peers-list', (peers) => {
            peers.forEach(p => {
                this.peers.set(p.peerId, { deviceName: p.deviceName, catalog: [] });
            });
            this._notify('peers-updated');
        });

        this.socket.on('peer-joined', ({ peerId: pid, deviceName: name }) => {
            this.peers.set(pid, { deviceName: name, catalog: [] });
            this._notify('peers-updated');
            // Send our catalog to the new peer
            this._sendCatalogToPeer(pid);
        });

        this.socket.on('peer-left', ({ peerId: pid }) => {
            this.peers.delete(pid);
            this.connections.delete(pid);
            this.dataChannels.delete(pid);
            this._notify('peers-updated');
        });

        // Receive catalog from a peer
        this.socket.on('catalog-update', ({ peerId: pid, catalog }) => {
            const peer = this.peers.get(pid);
            if (peer) {
                peer.catalog = catalog;
                this.peers.set(pid, peer);
            }
            this._notify('catalog-updated');
        });

        // Content request from peer
        this.socket.on('content-request', async ({ fromPeerId, hash }) => {
            await this._handleContentRequest(fromPeerId, hash);
        });

        // Content response from peer
        this.socket.on('content-response', async ({ fromPeerId, hash, chunks, totalChunks, title, url }) => {
            await this._handleContentResponse(fromPeerId, hash, chunks, totalChunks, title, url);
        });

        this.socket.on('disconnect', () => {
            console.log('[PeerManager] Disconnected from signaling server');
            this._notify('disconnected');
        });

        this.socket.on('connect_error', (err) => {
            console.log('[PeerManager] Connection error:', err.message);
            this._notify('error', err.message);
        });
    }

    /**
     * Disconnect from signaling server.
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.peers.clear();
        this.connections.clear();
        this.dataChannels.clear();
    }

    /**
     * Send our catalog to a specific peer or broadcast.
     */
    async _sendCatalogToPeer(targetPeerId) {
        const catalog = await getCatalog();
        if (this.socket) {
            this.socket.emit('catalog-update', {
                peerId: this.peerId,
                catalog,
            });
        }
    }

    /**
     * Broadcast updated catalog to all peers.
     */
    async broadcastCatalog() {
        await this._sendCatalogToPeer(null);
    }

    /**
     * Request content from a peer by hash.
     * Uses Socket.IO for simplicity (instead of WebRTC DataChannel).
     */
    async requestContent(fromPeerId, hash) {
        if (!this.socket) return;
        this.socket.emit('content-request', {
            targetPeerId: fromPeerId,
            fromPeerId: this.peerId,
            hash,
        });
        this._notify('download-started', { hash, fromPeerId });
    }

    /**
     * Handle incoming content request — send the content in chunks.
     */
    async _handleContentRequest(fromPeerId, hash) {
        const entry = await getPageByHash(hash);
        if (!entry) return;

        const content = await readCachedContent(entry.local_path);

        // Chunk the content for transfer
        const chunks = [];
        for (let i = 0; i < content.length; i += CHUNK_SIZE) {
            chunks.push(content.slice(i, i + CHUNK_SIZE));
        }

        // Send chunks via signaling relay (simplified — production would use WebRTC DataChannel)
        this.socket.emit('content-response', {
            targetPeerId: fromPeerId,
            fromPeerId: this.peerId,
            hash,
            url: entry.url,
            title: entry.title,
            chunks,
            totalChunks: chunks.length,
        });
    }

    /**
     * Handle incoming content response — reassemble chunks and save.
     */
    async _handleContentResponse(fromPeerId, hash, chunks, totalChunks, title, url) {
        // Reassemble content from chunks
        const content = chunks.join('');

        // Save to local cache
        await saveFromPeer(hash, url, title, content);

        this._notify('download-complete', { hash, fromPeerId });
    }

    /**
     * Get list of connected peers with their catalogs.
     */
    getPeers() {
        const peerList = [];
        this.peers.forEach((val, pid) => {
            peerList.push({ peerId: pid, ...val });
        });
        return peerList;
    }

    /**
     * Subscribe to events.
     */
    addListener(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    _notify(event, data) {
        this.listeners.forEach(cb => cb(event, data));
    }

    isConnected() {
        return this.socket?.connected || false;
    }
}

// Singleton
export default new PeerManager();
