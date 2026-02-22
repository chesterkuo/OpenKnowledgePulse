import type { ProviderRecord, ProviderStore } from "../interfaces.js";

export class MemoryProviderStore implements ProviderStore {
  private providers = new Map<string, ProviderRecord>();

  async register(
    provider: Omit<ProviderRecord, "id" | "registered_at">,
  ): Promise<ProviderRecord> {
    const id = `kp:provider:${crypto.randomUUID()}`;
    const record: ProviderRecord = {
      id,
      url: provider.url,
      name: provider.name,
      status: provider.status,
      last_heartbeat: provider.last_heartbeat,
      registered_at: new Date().toISOString(),
    };
    this.providers.set(id, record);
    return record;
  }

  async getAll(): Promise<ProviderRecord[]> {
    return Array.from(this.providers.values());
  }

  async getById(id: string): Promise<ProviderRecord | undefined> {
    return this.providers.get(id);
  }

  async updateHeartbeat(id: string): Promise<boolean> {
    const provider = this.providers.get(id);
    if (!provider) return false;
    provider.last_heartbeat = new Date().toISOString();
    provider.status = "active";
    return true;
  }

  async updateStatus(id: string, status: ProviderRecord["status"]): Promise<boolean> {
    const provider = this.providers.get(id);
    if (!provider) return false;
    provider.status = status;
    return true;
  }

  async delete(id: string): Promise<boolean> {
    return this.providers.delete(id);
  }
}
