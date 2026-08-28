import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

class LocalMemoryStore {
  constructor() {
    this.store = new Map();
    this.ttls = new Map();
    console.log('[Redis Config] Running in fallback in-memory cache mode (Redis connection unavailable).');
  }

  async set(key, value, mode, duration) {
    this.store.set(key, value);
    if (mode === 'EX' && duration) {
      if (this.ttls.has(key)) clearTimeout(this.ttls.get(key));
      const timer = setTimeout(() => {
        this.store.delete(key);
        this.ttls.delete(key);
      }, duration * 1000);
      this.ttls.set(key, timer);
    }
    return 'OK';
  }

  async get(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }

  async del(key) {
    if (this.ttls.has(key)) {
      clearTimeout(this.ttls.get(key));
      this.ttls.delete(key);
    }
    const existed = this.store.has(key);
    this.store.delete(key);
    return existed ? 1 : 0;
  }
}

let redisClient;
let isRedisConnected = false;
const inMemoryStore = new LocalMemoryStore();

try {
  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      if (times > 3) {
        return null; // Stop retrying and fallback to inMemoryStore
      }
      return Math.min(times * 200, 1000);
    }
  });

  redisClient.on('connect', () => {
    isRedisConnected = true;
    console.log('[Redis Config] Connected to Redis server.');
  });

  redisClient.on('error', (err) => {
    isRedisConnected = false;
    // Log once, operations will automatically route to memory store if redis fails
  });
} catch (error) {
  console.warn('[Redis Config] Initialization error, falling back to in-memory store:', error.message);
  redisClient = null;
}

export const cacheService = {
  async set(key, value, expirySeconds) {
    if (isRedisConnected && redisClient) {
      try {
        if (expirySeconds) {
          return await redisClient.set(key, value, 'EX', expirySeconds);
        }
        return await redisClient.set(key, value);
      } catch (err) {
        return await inMemoryStore.set(key, value, expirySeconds ? 'EX' : null, expirySeconds);
      }
    }
    return await inMemoryStore.set(key, value, expirySeconds ? 'EX' : null, expirySeconds);
  },

  async get(key) {
    if (isRedisConnected && redisClient) {
      try {
        return await redisClient.get(key);
      } catch (err) {
        return await inMemoryStore.get(key);
      }
    }
    return await inMemoryStore.get(key);
  },

  async del(key) {
    if (isRedisConnected && redisClient) {
      try {
        return await redisClient.del(key);
      } catch (err) {
        return await inMemoryStore.del(key);
      }
    }
    return await inMemoryStore.del(key);
  }
};

export default redisClient;
