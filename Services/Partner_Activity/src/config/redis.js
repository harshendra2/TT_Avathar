const redis = require("redis");

const redisClient = redis.createClient({
    host: "localhost",
    port: 6379,
    Promise: true,
});
redisClient.connect();

redisClient.on('connect', () => {
    console.log('Connected to Redis');
});

redisClient.on('error', (err) => {
    console.error('Redis error', err);
});

const clearRedisKeysByPattern = async (pattern) => {
    try {
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
            await redisClient.del(keys);
        }
    } catch (err) {
        console.error(`Error clearing Redis keys matching pattern "${pattern}":`, err);
    }
};

const clearStoreTeamstatistics = async (address) => {
    clearRedisKeysByPattern(`store_teamstatistics:${address}`);
};


module.exports = {
    redisClient,
    clearStoreTeamstatistics,
    clearRedisKeysByPattern
};