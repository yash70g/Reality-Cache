const mongoose = require('mongoose');

const peerSchema = new mongoose.Schema({
    peerId: {
        type: String,
        required: true,
        unique: true,
    },
    deviceName: {
        type: String,
        default: 'Unknown Device',
    },
    capabilities: {
        storageAvailable: { type: Number, default: 0 },   // bytes
        contentCount: { type: Number, default: 0 },
    },
    lastSeen: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});

// Auto-expire peers not seen in 5 minutes
peerSchema.index({ lastSeen: 1 }, { expireAfterSeconds: 300 });

module.exports = mongoose.model('Peer', peerSchema);
