'use strict';

const Redis = require('ioredis');
const logger = require('../utils/logger');

let client;

function getRedisClient() {
  if (!client) {
    client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 100, 3000);
        logger.warn(`Redis reconnecting, attempt ${times}, delay ${delay}ms`);
        return delay;
      },
      lazyConnect: false,
    });

    client.on('connect', () => logger.info('Redis connected'));
    client.on('error', (err) => logger.error('Redis error', { err }));
    client.on('reconnecting', () => logger.warn('Redis reconnecting...'));
  }
  return client;
}

/**
 * Create a DEDICATED Redis connection for BullMQ.
 *
 * BullMQ Workers use blocking commands (BLPOP) so they REQUIRE
 * maxRetriesPerRequest = null. They also must NOT share a connection
 * with other consumers — each Queue/Worker needs its own instance.
 */
function getBullMQConnection() {
  return new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,   // mandatory for BullMQ
    enableReadyCheck: false,      // recommended for BullMQ
    retryStrategy: (times) => {
      return Math.min(times * 200, 5000);
    },
  });
}

/**
 * Cache helper — get or set with TTL.
 */
async function cacheGetOrSet(key, fetcher, ttlSeconds = 60) {
  const redis = getRedisClient();
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);
  const value = await fetcher();
  await redis.setex(key, ttlSeconds, JSON.stringify(value));
  return value;
}

async function cacheInvalidate(pattern) {
  const redis = getRedisClient();
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

module.exports = { getRedisClient, getBullMQConnection, cacheGetOrSet, cacheInvalidate };
