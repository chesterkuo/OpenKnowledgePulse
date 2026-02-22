import { z } from "zod";

const ConfigSchema = z.object({
  port: z.coerce.number().default(8080),
  retentionNetworkDays: z.coerce.number().default(-1), // -1 = permanent
  retentionOrgDays: z.coerce.number().default(730), // 24 months
  retentionPrivateDays: z.coerce.number().default(365), // 12 months
  minRepForWrite: z.coerce.number().default(0.1),
  storeBackend: z.string().default("memory"),
  databaseUrl: z.string().optional(),
  redisUrl: z.string().optional(),
  redisPrefix: z.string().default("kp:"),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(): Config {
  return ConfigSchema.parse({
    port: process.env.KP_PORT,
    retentionNetworkDays: process.env.KP_RETENTION_NETWORK_DAYS,
    retentionOrgDays: process.env.KP_RETENTION_ORG_DAYS,
    retentionPrivateDays: process.env.KP_RETENTION_PRIVATE_DAYS,
    minRepForWrite: process.env.KP_MIN_REP_FOR_WRITE,
    storeBackend: process.env.KP_STORE_BACKEND,
    databaseUrl: process.env.KP_DATABASE_URL,
    redisUrl: process.env.KP_REDIS_URL,
    redisPrefix: process.env.KP_REDIS_PREFIX,
  });
}
