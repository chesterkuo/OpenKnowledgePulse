import Redis from "ioredis";

export function createRedisClient(url: string, prefix: string = "kp:"): Redis {
  return new Redis(url, { keyPrefix: prefix });
}
