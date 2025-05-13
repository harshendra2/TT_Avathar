const express = require('express');
const path = require('path');
const cors = require('cors');
const ethers = require('ethers');
const IUniswapV2PairABI = require('@uniswap/v2-core/build/IUniswapV2Pair.json').abi;
const { createClient } = require('redis');

const app = express();
app.use(cors());
app.use(express.static('public'));

const redisClient = createClient({
    url: 'redis://localhost:6379'
});
redisClient.on('error', (err) => console.error('Redis Client Error', err));

(async function initRedis() {
    await redisClient.connect();
    console.log('Connected to Redis');
})();

function getTTLForPeriod(period) {
    switch (period.toUpperCase()) {
        case '1D': return 5 * 60;    // 5 minutes
        case '7D': return 15 * 60;   // 15 minutes
        case '1M': return 30 * 60;   // 30 minutes
        case '6M': return 60 * 60;   // 1 hour
        case 'ALL': return 120 * 60;  // 2 hours
        default: return 5 * 60;    // fallback 5 minutes
    }
}

//
// Update these to your actual data:
//
const provider = new ethers.providers.JsonRpcProvider(
    'https://base-mainnet.g.alchemy.com/v2/xxaYwLCcRxFjiv1-ro4nyCh3VX8u7Wv6'
);
const TOKEN_ADDRESS = '0x345B2F118AAFa5a15898409C6Bb6e8C4B05d7e4b';
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const PANCAKESWAP_PAIR_ADDRESS = '0xF3cB4F76C5040967Fb46A9895d67307e380f39A2';

// The exact block and timestamp of the pair creation on Base:
const DEPLOYMENT_BLOCK = 23180188;
const PAIR_CREATION_TIMESTAMP = 1733149728; // Dec-02-2024 14:28:43 UTC

const pairContract = new ethers.Contract(
    PANCAKESWAP_PAIR_ADDRESS,
    IUniswapV2PairABI,
    provider
);

function getDataPointCount(period) {
    switch (period.toUpperCase()) {
        case '1D': return 24;
        case '7D': return 14;
        case '1M': return 15;
        case '6M': return 12;
        case 'ALL': return 6;
        default: return 24;
    }
}

function getStartTime(period, now) {
    let rawStart;
    switch (period.toUpperCase()) {
        case '1D':
            rawStart = now - 24 * 3600;         // 1 day ago
            break;
        case '7D':
            rawStart = now - (7  *24 * 3600);     // 7 days ago
            break;
        case '1M':
            rawStart = now -( 30 *24 *3600);    // ~30 days ago
            break;
        case '6M':
            rawStart = now -(180  *24  *3600);   // ~6 months
            break;
        case 'ALL':
            // For 'ALL', let’s go 1 year back or pair creation if it’s newer
            rawStart = now -(365  *24  *3600)
            break;
        default:
            rawStart = now - (24 * 3600);
    }
    // If the pair is newer than our "rawStart", clamp it to the creation timestamp
    if (rawStart < PAIR_CREATION_TIMESTAMP) {
        rawStart = PAIR_CREATION_TIMESTAMP;
    }
    return rawStart;
}

// --- FIX: Ensure we clamp to currentBlock if we overshoot. ---
function approximateBlockNumber(timestamp, currentBlock, currentTimestamp) {
    // Roughly assume 2 seconds per block
    const timeDiff = currentTimestamp - timestamp;
    const blockDiff = Math.floor(timeDiff / 2);
    let approxBlock = currentBlock - blockDiff;

    // Don’t go below the deployment block
    if (approxBlock < DEPLOYMENT_BLOCK) {
        approxBlock = DEPLOYMENT_BLOCK;
    }
    // Don’t exceed the current tip block
    if (approxBlock > currentBlock) {
        approxBlock = currentBlock;
    }

    return approxBlock;
}

async function getPriceAtBlock(blockNumber) {
    // Also clamp at runtime, just in case:
    const safeBlock = Math.max(blockNumber, DEPLOYMENT_BLOCK);

    // Query the pair’s reserves at that block
    const reserves = await pairContract.getReserves({ blockTag: safeBlock });
    const token0 = await pairContract.token0();

    // If token0 is our token, price = reserve1 / reserve0; else = reserve0 / reserve1
    const price = token0.toLowerCase() === TOKEN_ADDRESS.toLowerCase()
        ? (Number(reserves.reserve1.toString()) / 1e6)  // USDC has 6 decimals
        / (Number(reserves.reserve0.toString()) / 1e18) // token has 18 decimals
        : (Number(reserves.reserve0.toString()) / 1e6)
        / (Number(reserves.reserve1.toString()) / 1e18);

    return price;
}

async function fetchPriceDataOnChain(period) {
    const now = Math.floor(Date.now() / 1000);

    const dataPoints = getDataPointCount(period);
    const startTime = getStartTime(period, now);

    // If somehow startTime >= now, we have no history to show
    if (startTime >= now) {
        return [];
    }

    const interval = Math.floor((now - startTime) / Math.max(dataPoints - 1, 1));

    const currentBlock = await provider.getBlockNumber();
    const currentBlockData = await provider.getBlock(currentBlock);
    const currentTimestamp = currentBlockData.timestamp;

    // Build an array of timestamps from startTime -> now
    let timePoints = [];
    for (let i = 0; i < dataPoints; i++) {
        timePoints.push(startTime + i * interval);
    }
    // Force the last point to the current timestamp
    if (dataPoints > 0) {
        timePoints[dataPoints - 1] = now;
    }

    // Convert each timestamp to an approximate block
    const blockNumbers = timePoints.map(ts =>
        approximateBlockNumber(ts, currentBlock, currentTimestamp)
    );

    // Fetch in small chunks
    const chunkSize = 10;
    const priceData = [];

    for (let i = 0; i < blockNumbers.length; i += chunkSize) {
        const chunk = blockNumbers.slice(i, i + chunkSize);
        const chunkPrices = await Promise.all(chunk.map(block => getPriceAtBlock(block)));

        chunkPrices.forEach((price, idx) => {
            priceData.push({
                timestamp: timePoints[i + idx],
                price
            });
        });
    }

    // Sort by ascending timestamp
    priceData.sort((a, b) => a.timestamp - b.timestamp);

    return priceData;
}

async function getPriceData(period) {
    const redisKey = `priceData:${period}`;
    const cached = await redisClient.get(redisKey);
    if (cached) {
        console.log(`Redis cache hit for period=${period}`);
        return JSON.parse(cached);
    }

    console.log(`Redis cache miss for period=${period}, fetching on-chain...`);
    const freshData = await fetchPriceDataOnChain(period);

    const ttl = getTTLForPeriod(period);
    await redisClient.set(redisKey, JSON.stringify(freshData), {
        EX: ttl
    });

    return freshData;
}
// Express route
exports.getLiveGraphDataFetching=async(req, res) => {
    try {
        const period = req.params.period;
        const data = await getPriceData(period);
        return res.json({ success: true, data });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}
