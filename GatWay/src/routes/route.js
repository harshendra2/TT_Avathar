const express = require('express');
const router = express.Router();
const proxy = require('express-http-proxy');

// Forward requests to microservices
router.use('/admin',proxy('http://localhost:3001'));   //Admin
router.use('/api',proxy('http://localhost:3002'));  // partner activity
router.use('/nft',proxy('http://localhost:3003'));  //Rank rewards
router.use('/api/reffral',proxy('http://localhost:3004'));  //referal

module.exports = router;
