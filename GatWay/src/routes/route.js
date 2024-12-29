const express = require('express');
const router = express.Router();
const proxy = require('express-http-proxy');


router.use('/admin', proxy('http://Admin:3001'));   // Admin service
router.use('/api', proxy('http://Partner_Activity:3002'));  // Partner Activity service
router.use('/nft', proxy('http://Mint_Nft:3003'));  // Mint NFT service
module.exports = router;
