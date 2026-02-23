import type Redis from "ioredis";

export class RedisCache {
  constructor(
    private redis: Redis,
    private defaultTtl = 300,
  ) {}

  async get<T>(key: string): Promise<T | undefined> {
    const val = await this.redis.get(`cache:${key}`);
    return val ? JSON.parse(val) : undefined;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.redis.set(`cache:${key}`, JSON.stringify(value), "EX", ttl ?? this.defaultTtl);
  }

  async del(key: string): Promise<void> {
    await this.redis.del(`cache:${key}`);
  }
}
