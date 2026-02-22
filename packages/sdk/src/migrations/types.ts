export type MigrationFn<TFrom = unknown, TTo = unknown> = (input: TFrom) => TTo;

export interface MigrationEntry {
  from: string;
  to: string;
  migrate: MigrationFn;
}

export class MigrationRegistry {
  private migrations = new Map<string, MigrationEntry>();

  register(entry: MigrationEntry): void {
    const key = `${entry.from}->${entry.to}`;
    this.migrations.set(key, entry);
  }

  get(from: string, to: string): MigrationEntry | undefined {
    return this.migrations.get(`${from}->${to}`);
  }

  /** Build a migration chain from `from` to `to` */
  chain(from: string, to: string): MigrationFn[] {
    const fns: MigrationFn[] = [];
    let current = from;

    while (current !== to) {
      // Try direct migration first
      const direct = this.get(current, to);
      if (direct) {
        fns.push(direct.migrate);
        return fns;
      }

      // Find next step in chain
      let found = false;
      for (const entry of this.migrations.values()) {
        if (entry.from === current) {
          fns.push(entry.migrate);
          current = entry.to;
          found = true;
          break;
        }
      }

      if (!found) {
        throw new Error(`No migration path from ${current} to ${to}`);
      }
    }

    return fns;
  }
}
