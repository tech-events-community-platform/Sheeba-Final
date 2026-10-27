import { Request, Response, NextFunction } from 'express';
import { CacheService } from '../services/cache.service';

export interface CacheOptions {
  ttlSeconds?: number;
  isPrivate?: boolean;
  prefix?: string;
  cacheControl?: string;
}

/**
 * Express middleware for automatic high-speed endpoint response caching.
 * Fully supports asynchronous Redis/In-memory caching with strict user/role isolation.
 */
export const cacheResponse = (options: CacheOptions = {}) => {
  const {
    ttlSeconds = 60,
    isPrivate = false,
    prefix,
    cacheControl,
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Support explicit cache bypass via header or query param
    const bypass = req.query.refresh === 'true' || req.headers['cache-control'] === 'no-cache';
    if (bypass) {
      res.setHeader('X-Cache', 'BYPASS');
      return next();
    }

    const user = (req as any).user;

    // Safety: If route requires private cache but request is unauthenticated, bypass caching
    if (isPrivate && !user?.id) {
      res.setHeader('X-Cache', 'BYPASS');
      return next();
    }

    // Build unique cache key with strict user and role scoping
    const effectivePrefix = prefix || req.baseUrl + req.path;
    const queryString = Object.keys(req.query).length > 0 ? JSON.stringify(req.query) : '';
    const userScope = isPrivate && user?.id ? `user:${user.id}:role:${user.role || 'user'}:` : '';
    const cacheKey = `http:${userScope}${effectivePrefix}:${queryString}`;

    try {
      const cached = await CacheService.get(cacheKey);
      if (cached !== undefined) {
        res.setHeader('X-Cache', 'HIT');
        if (cacheControl) {
          res.setHeader('Cache-Control', cacheControl);
        } else {
          const visibility = isPrivate ? 'private' : 'public';
          res.setHeader('Cache-Control', `${visibility}, max-age=${Math.min(ttlSeconds, 60)}, stale-while-revalidate=60`);
        }
        res.json(cached);
        return;
      }
    } catch (cacheErr: any) {
      console.warn(`[cacheResponse] Cache read failed (${cacheErr.message}). Continuing with database query.`);
    }

    res.setHeader('X-Cache', 'MISS');
    if (cacheControl) {
      res.setHeader('Cache-Control', cacheControl);
    }

    // Intercept res.json to capture and cache the response body
    const originalJson = res.json.bind(res);
    res.json = (body: any): Response => {
      // Only cache successful 200-299 responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        CacheService.set(cacheKey, body, ttlSeconds).catch((err: any) => {
          console.warn(`[cacheResponse] Cache write failed (${err.message})`);
        });
      }
      return originalJson(body);
    };

    next();
  };
};
