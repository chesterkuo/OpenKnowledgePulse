import Redis from "ioredis";

export function createRedisClient(url: string, prefix = "kp:"): Redis {
  return new Redis(url, { keyPrefix: prefix });
}
