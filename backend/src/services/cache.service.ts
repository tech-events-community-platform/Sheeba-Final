import Redis from 'ioredis';
import { ENV } from '../config/env';

interface CacheItem<T> {
  value: T;
  expiresAt: number | null; // null means no expiration
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  provider: 'redis' | 'memory';
}

export class CacheService {
  private static store = new Map<string, CacheItem<any>>();
  private static redisClient: Redis | null = null;
  private static isRedisReady = false;
  private static hasLoggedInit = false;
  private static stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    provider: 'memory',
  };

  private static cleanupInterval: NodeJS.Timeout | null = null;

  static {
    this.initRedis();

    // Background garbage collection sweep every 60 seconds for in-memory store
    this.cleanupInterval = setInterval(() => {
      this.purgeExpired();
    }, 60 * 1000);

    // Prevent interval from keeping the process alive during tests or shutdown
    if (this.cleanupInterval && typeof this.cleanupInterval.unref === 'function') {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Initializes Redis connection if a valid URL or host is configured.
   * If Redis is unreachable or credentials/URL are incomplete, falls back smoothly to in-memory mode.
   */
  private static normalizeRedisUrl(raw?: string): string {
    if (!raw) return '';
    let url = raw.trim();
    if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
      url = url.slice(1, -1).trim();
    }
    if (url.includes('-u ')) {
      url = url.substring(url.indexOf('-u ') + 3).trim();
    }
    if (url.startsWith('redis://') && (url.includes('.upstash.io') || raw.includes('--tls'))) {
      url = 'rediss://' + url.substring('redis://'.length);
    }
    return url;
  }

  public static initRedis(): void {
    const redisUrl = this.normalizeRedisUrl(ENV.REDIS_URL);
    const redisHost = ENV.REDIS_HOST?.trim();
    const redisPassword = ENV.REDIS_PASSWORD?.trim();

    // Require an explicit connection URL or host to attempt connection
    if (!redisUrl && !redisHost) {
      if (!this.hasLoggedInit) {
        console.log('[CacheService] Redis URL / Host not configured. Active cache provider: In-Memory.');
        this.hasLoggedInit = true;
      }
      this.isRedisReady = false;
      this.stats.provider = 'memory';
      return;
    }

    try {
      const client = redisUrl
        ? new Redis(redisUrl, {
            maxRetriesPerRequest: 1,
            connectTimeout: 3000,
            lazyConnect: true,
            retryStrategy: (times) => (times > 3 ? null : Math.min(times * 500, 2000)),
          })
        : new Redis({
            host: redisHost,
            port: ENV.REDIS_PORT || 6379,
            password: redisPassword || undefined,
            maxRetriesPerRequest: 1,
            connectTimeout: 3000,
            lazyConnect: true,
            retryStrategy: (times) => (times > 3 ? null : Math.min(times * 500, 2000)),
          });

      client.on('ready', () => {
        this.isRedisReady = true;
        this.stats.provider = 'redis';
        console.log('[CacheService] Redis ready. Active cache provider: Redis.');
      });

      client.on('error', (err) => {
        this.isRedisReady = false;
        this.stats.provider = 'memory';
        console.warn(`[CacheService] Redis issue (${err.message}). Seamlessly utilizing in-memory fallback.`);
      });

      client.on('close', () => {
        this.isRedisReady = false;
        this.stats.provider = 'memory';
      });

      this.redisClient = client;

      client.connect().catch((err) => {
        this.isRedisReady = false;
        this.stats.provider = 'memory';
        console.warn(`[CacheService] Initial Redis connect failed (${err.message}). Active cache provider: In-Memory.`);
      });
    } catch (err: any) {
      this.isRedisReady = false;
      this.stats.provider = 'memory';
      console.warn(`[CacheService] Failed to initialize Redis (${err.message}). Active cache provider: In-Memory.`);
    }
  }

  /**
   * Override or set Redis client for testing.
   */
  public static setClientForTesting(client: Redis | null): void {
    this.redisClient = client;
    this.isRedisReady = Boolean(client);
    this.stats.provider = client ? 'redis' : 'memory';
  }

  /**
   * Retrieve an item from the cache (checks Redis first, falls back to in-memory store).
   */
  static async get<T = any>(key: string): Promise<T | undefined> {
    if (this.isRedisReady && this.redisClient) {
      try {
        const raw = await this.redisClient.get(key);
        if (raw !== null) {
          this.stats.hits++;
          try {
            return JSON.parse(raw) as T;
          } catch {
            return raw as unknown as T;
          }
        }
      } catch (err: any) {
        console.warn(`[CacheService] Redis GET failed for key "${key}": ${err.message}. Checking memory fallback.`);
      }
    }

    // In-memory fallback
    const item = this.store.get(key);
    if (!item) {
      this.stats.misses++;
      return undefined;
    }

    if (item.expiresAt !== null && Date.now() > item.expiresAt) {
      this.store.delete(key);
      this.stats.misses++;
      return undefined;
    }

    this.stats.hits++;
    return item.value as T;
  }

  /**
   * Set an item in the cache with an optional TTL in seconds.
   * @param ttlSeconds TTL in seconds. Defaults to 60 seconds if not specified.
   */
  static async set<T = any>(key: string, value: T, ttlSeconds: number = 60): Promise<void> {
    const expiresAt = ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiresAt });
    this.stats.sets++;

    if (this.isRedisReady && this.redisClient) {
      try {
        const serialized = typeof value === 'string' ? value : JSON.stringify(value);
        if (ttlSeconds > 0) {
          await this.redisClient.set(key, serialized, 'EX', ttlSeconds);
        } else {
          await this.redisClient.set(key, serialized);
        }
      } catch (err: any) {
        console.warn(`[CacheService] Redis SET failed for key "${key}": ${err.message}. Retained in-memory.`);
      }
    }
  }

  /**
   * Retrieve existing item or compute and store it if not cached.
   */
  static async getOrSet<T = any>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 60
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const fresh = await fetcher();
    await this.set(key, fresh, ttlSeconds);
    return fresh;
  }

  /**
   * Delete a specific cache key from Redis and in-memory fallback.
   */
  static async del(key: string): Promise<boolean> {
    const existedMemory = this.store.delete(key);
    let existedRedis = false;

    if (this.isRedisReady && this.redisClient) {
      try {
        const res = await this.redisClient.del(key);
        existedRedis = res > 0;
      } catch (err: any) {
        console.warn(`[CacheService] Redis DEL failed for key "${key}": ${err.message}`);
      }
    }

    const existed = existedMemory || existedRedis;
    if (existed) this.stats.deletes++;
    return existed;
  }

  /**
   * Delete all keys matching a wildcard pattern (e.g. '*http:*events*', 'events:list*').
   */
  static async delPattern(pattern: string): Promise<number> {
    let deletedCount = 0;

    // 1. Delete matching keys from in-memory fallback
    const regexPattern = '^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$';
    const regex = new RegExp(regexPattern);

    for (const key of Array.from(this.store.keys())) {
      if (regex.test(key)) {
        this.store.delete(key);
        deletedCount++;
      }
    }

    // 2. Delete matching keys from Redis using non-blocking SCAN
    if (this.isRedisReady && this.redisClient) {
      try {
        let cursor = '0';
        do {
          const [nextCursor, keys] = await this.redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
          cursor = nextCursor;
          if (keys && keys.length > 0) {
            const redisDeleted = await this.redisClient.del(...keys);
            deletedCount += redisDeleted;
          }
        } while (cursor !== '0');
      } catch (err: any) {
        console.warn(`[CacheService] Redis SCAN/DEL failed for pattern "${pattern}": ${err.message}`);
      }
    }

    this.stats.deletes += deletedCount;
    return deletedCount;
  }

  /**
   * Delete all keys starting with the specified prefix.
   */
  static async delPrefix(prefix: string): Promise<number> {
    const pattern = prefix.endsWith('*') ? prefix : `${prefix}*`;
    return this.delPattern(pattern);
  }

  /**
   * Check if a valid, non-expired key exists in the cache.
   */
  static async has(key: string): Promise<boolean> {
    if (this.isRedisReady && this.redisClient) {
      try {
        const exists = await this.redisClient.exists(key);
        if (exists === 1) return true;
      } catch (err: any) {
        console.warn(`[CacheService] Redis EXISTS failed for key "${key}": ${err.message}`);
      }
    }

    const item = this.store.get(key);
    if (!item) return false;
    if (item.expiresAt !== null && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Clear all items from the cache (both memory and Redis).
   */
  static async flush(): Promise<void> {
    this.store.clear();
    if (this.isRedisReady && this.redisClient) {
      try {
        await this.redisClient.flushdb();
      } catch (err: any) {
        console.warn(`[CacheService] Redis FLUSHDB failed: ${err.message}`);
      }
    }
  }

  /**
   * Periodic sweep to remove expired items from the in-memory fallback store.
   */
  private static purgeExpired(): void {
    const now = Date.now();
    for (const [key, item] of this.store.entries()) {
      if (item.expiresAt !== null && now > item.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Get cache performance metrics and active provider.
   */
  static getStats() {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? ((this.stats.hits / totalRequests) * 100).toFixed(1) + '%' : '0%';
    return {
      provider: this.isRedisReady ? 'redis' : 'memory',
      size: this.store.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate,
      sets: this.stats.sets,
      deletes: this.stats.deletes,
    };
  }
}
