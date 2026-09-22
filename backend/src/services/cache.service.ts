interface CacheItem<T> {
  value: T;
  expiresAt: number | null; // null means no expiration
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
}

export class CacheService {
  private static store = new Map<string, CacheItem<any>>();
  private static stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
  };

  private static cleanupInterval: NodeJS.Timeout | null = null;

  static {
    // Background garbage collection sweep every 60 seconds
    this.cleanupInterval = setInterval(() => {
      this.purgeExpired();
    }, 60 * 1000);

    // Prevent interval from keeping the process alive during tests or shutdown
    if (this.cleanupInterval && typeof this.cleanupInterval.unref === 'function') {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Retrieve an item from the cache.
   */
  static get<T = any>(key: string): T | undefined {
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
  static set<T = any>(key: string, value: T, ttlSeconds: number = 60): void {
    const expiresAt = ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiresAt });
    this.stats.sets++;
  }

  /**
   * Retrieve existing item or compute and store it if not cached.
   */
  static async getOrSet<T = any>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 60
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const fresh = await fetcher();
    this.set(key, fresh, ttlSeconds);
    return fresh;
  }

  /**
   * Delete a specific cache key.
   */
  static del(key: string): boolean {
    const existed = this.store.delete(key);
    if (existed) this.stats.deletes++;
    return existed;
  }

  /**
   * Delete all keys starting with the specified prefix (e.g. 'events:', 'report:').
   */
  static delPrefix(prefix: string): number {
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        count++;
      }
    }
    this.stats.deletes += count;
    return count;
  }

  /**
   * Check if a valid, non-expired key exists in the cache.
   */
  static has(key: string): boolean {
    const item = this.store.get(key);
    if (!item) return false;
    if (item.expiresAt !== null && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Clear all items from the cache.
   */
  static flush(): void {
    this.store.clear();
  }

  /**
   * Periodic sweep to remove expired items.
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
   * Get cache performance metrics.
   */
  static getStats() {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? ((this.stats.hits / totalRequests) * 100).toFixed(1) + '%' : '0%';
    return {
      size: this.store.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate,
      sets: this.stats.sets,
      deletes: this.stats.deletes,
    };
  }
}

