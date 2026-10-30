import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { consumeLimit } from "./trial.ts";

let redis: Redis | null = null;
const ratelimitCache = new Map<string, Ratelimit>();

function getRedisClient(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    redis = new Redis({ url, token });
    return redis;
  } catch (error) {
    console.error("Failed to initialize Upstash Redis:", error);
    return null;
  }
}

function getRatelimiter(limit: number, windowSeconds = 60): Ratelimit | null {
  const client = getRedisClient();
  if (!client) return null;

  const cacheKey = `${limit}:${windowSeconds}`;
  let limiter = ratelimitCache.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: client,
      limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
      analytics: true,
      prefix: "arieya:ratelimit",
    });
    ratelimitCache.set(cacheKey, limiter);
  }
  return limiter;
}

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset?: number;
  provider: "upstash" | "postgres_fallback";
};

/**
 * Checks a rate limit using Upstash Redis if configured,
 * otherwise falls back gracefully to Postgres/in-memory limits.
 */
export async function enforceRateLimit(
  key: string,
  limit = 30,
  windowSeconds = 60,
): Promise<RateLimitResult> {
  const limiter = getRatelimiter(limit, windowSeconds);

  if (limiter) {
    try {
      const result = await limiter.limit(key);
      return {
        success: result.success,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
        provider: "upstash",
      };
    } catch (error) {
      console.warn("Upstash rate limit check failed, falling back to database limit:", error);
    }
  }

  // Graceful fallback to existing Postgres/memory limiter
  const allowed = await consumeLimit(key, limit, windowSeconds * 1000);
  return {
    success: allowed,
    limit,
    remaining: allowed ? 1 : 0,
    provider: "postgres_fallback",
  };
}
