const express = require('express');
const router = express.Router();
const ContentMeta = require('../models/ContentMeta');

// GET /api/content — list/search content catalog
router.get('/', async (req, res) => {
    try {
        const { search, peerId } = req.query;
        const filter = {};
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { url: { $regex: search, $options: 'i' } },
            ];
        }
        if (peerId) filter.peerId = peerId;

        const content = await ContentMeta.find(filter)
            .sort({ createdAt: -1 })
            .limit(100);
        res.json(content);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/content — register cached content (dedup by hash)
router.post('/', async (req, res) => {
    try {
        const { hash, url, title, mimeType, size, peerId, assets } = req.body;

        // Deduplication: if hash exists, just add peerId reference
        const existing = await ContentMeta.findOne({ hash });
        if (existing) {
            return res.status(200).json({
                message: 'Content already exists (deduplicated)',
                content: existing,
                deduplicated: true,
            });
        }

        const content = new ContentMeta({
            hash, url, title, mimeType, size, peerId, assets,
        });
        await content.save();
        res.status(201).json({ content, deduplicated: false });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/content/:hash
router.delete('/:hash', async (req, res) => {
    try {
        const result = await ContentMeta.findOneAndDelete({ hash: req.params.hash });
        if (!result) return res.status(404).json({ error: 'Not found' });
        res.json({ message: 'Deleted', hash: req.params.hash });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
