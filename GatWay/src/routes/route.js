const express = require('express');
const router = express.Router();
const proxy = require('express-http-proxy');

// Admin service
router.use('/api/admin', proxy('http://localhost:3001', {
    proxyReqPathResolver: (req) => req.originalUrl.replace('/api/admin', '')
}));

// Partner Activity service

router.use('/partneractivity', proxy('http://localhost:3002', {
    proxyReqPathResolver: (req) => req.originalUrl.replace('/partneractivity', '')
}));

// Mint NFT service
router.use('/api/mint', proxy('http://localhost:3003', {
    proxyReqPathResolver: (req) => req.originalUrl.replace('/api/mint', '')
}));

module.exports = router;

