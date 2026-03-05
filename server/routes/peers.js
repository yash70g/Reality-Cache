const express = require('express');
const router = express.Router();
const Peer = require('../models/Peer');

// GET /api/peers — list active peers
router.get('/', async (req, res) => {
    try {
        const peers = await Peer.find().sort({ lastSeen: -1 });
        res.json(peers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/peers/register — register or refresh a peer
router.post('/register', async (req, res) => {
    try {
        const { peerId, deviceName, capabilities } = req.body;
        const peer = await Peer.findOneAndUpdate(
            { peerId },
            { peerId, deviceName, capabilities, lastSeen: new Date() },
            { upsert: true, new: true }
        );
        res.json(peer);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
