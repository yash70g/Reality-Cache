require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

const contentRoutes = require('./routes/content');
const peerRoutes = require('./routes/peers');

const app = express();
const server = http.createServer(app);

// ------- Middleware -------
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ------- REST API Routes -------
app.use('/api/content', contentRoutes);
app.use('/api/peers', peerRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

// ------- MongoDB -------
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/realitycache';
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.error('❌ MongoDB error:', err.message));

// ------- Socket.IO Signaling Server -------
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
});

// Track connected peers  { socketId -> peerId }
const connectedPeers = new Map();

io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Peer announces itself
    socket.on('register', ({ peerId, deviceName }) => {
        connectedPeers.set(socket.id, { peerId, deviceName });
        socket.join('mesh'); // join the global mesh room
        console.log(`📡 Peer registered: ${peerId} (${deviceName})`);

        // Notify all other peers about the new peer
        socket.to('mesh').emit('peer-joined', { peerId, deviceName });

        // Send existing peers list to the new peer
        const peers = [];
        connectedPeers.forEach((val, sid) => {
            if (sid !== socket.id) {
                peers.push(val);
            }
        });
        socket.emit('peers-list', peers);
    });

    // WebRTC signaling: relay offer
    socket.on('webrtc-offer', ({ targetPeerId, offer, fromPeerId }) => {
        const targetSocket = findSocketByPeerId(targetPeerId);
        if (targetSocket) {
            io.to(targetSocket).emit('webrtc-offer', { offer, fromPeerId });
        }
    });

    // WebRTC signaling: relay answer
    socket.on('webrtc-answer', ({ targetPeerId, answer, fromPeerId }) => {
        const targetSocket = findSocketByPeerId(targetPeerId);
        if (targetSocket) {
            io.to(targetSocket).emit('webrtc-answer', { answer, fromPeerId });
        }
    });

    // WebRTC signaling: relay ICE candidate
    socket.on('ice-candidate', ({ targetPeerId, candidate, fromPeerId }) => {
        const targetSocket = findSocketByPeerId(targetPeerId);
        if (targetSocket) {
            io.to(targetSocket).emit('ice-candidate', { candidate, fromPeerId });
        }
    });

    // Content catalog broadcast
    socket.on('catalog-update', ({ peerId, catalog }) => {
        socket.to('mesh').emit('catalog-update', { peerId, catalog });
    });

    // Content request relay
    socket.on('content-request', ({ targetPeerId, fromPeerId, hash }) => {
        const targetSocket = findSocketByPeerId(targetPeerId);
        if (targetSocket) {
            io.to(targetSocket).emit('content-request', { fromPeerId, hash });
        }
    });

    // Content response relay
    socket.on('content-response', ({ targetPeerId, fromPeerId, hash, url, title, chunks, totalChunks }) => {
        const targetSocket = findSocketByPeerId(targetPeerId);
        if (targetSocket) {
            io.to(targetSocket).emit('content-response', { fromPeerId, hash, url, title, chunks, totalChunks });
        }
    });

    // Disconnect
    socket.on('disconnect', () => {
        const peer = connectedPeers.get(socket.id);
        if (peer) {
            console.log(`❌ Peer disconnected: ${peer.peerId}`);
            socket.to('mesh').emit('peer-left', { peerId: peer.peerId });
            connectedPeers.delete(socket.id);
        }
    });
});

function findSocketByPeerId(peerId) {
    for (const [socketId, peer] of connectedPeers.entries()) {
        if (peer.peerId === peerId) return socketId;
    }
    return null;
}

// ------- Start Server -------
const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Reality Cache server running on port ${PORT}`);
});
