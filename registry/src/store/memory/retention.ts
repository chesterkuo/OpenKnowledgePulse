import type { AllStores } from "../interfaces.js";

export interface RetentionConfig {
  networkDays: number | null; // null = permanent
  orgDays: number;
  privateDays: number;
}

const DEFAULT_CONFIG: RetentionConfig = {
  networkDays: null,
  orgDays: Number(process.env.KP_RETENTION_ORG_DAYS) || 730,
  privateDays: Number(process.env.KP_RETENTION_PRIVATE_DAYS) || 365,
};

export class RetentionManager {
  private config: RetentionConfig;

  constructor(
    private stores: AllStores,
    config?: Partial<RetentionConfig>,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async runSweep(): Promise<number> {
    const allUnits = await this.stores.knowledge.search({
      pagination: { offset: 0, limit: 10000 },
    });

    let swept = 0;
    const now = Date.now();

    for (const entry of allUnits.data) {
      const createdAt = new Date(entry.created_at).getTime();
      const ageMs = now - createdAt;
      const visibility = entry.visibility;

      let maxAgeMs: number | null = null;
      if (visibility === "network") {
        maxAgeMs = this.config.networkDays ? this.config.networkDays * 86400000 : null;
      } else if (visibility === "org") {
        maxAgeMs = this.config.orgDays * 86400000;
      } else if (visibility === "private") {
        maxAgeMs = this.config.privateDays * 86400000;
      }

      if (maxAgeMs !== null && ageMs > maxAgeMs) {
        await this.stores.knowledge.delete(entry.id);
        swept++;
      }
    }

    return swept;
  }
}
