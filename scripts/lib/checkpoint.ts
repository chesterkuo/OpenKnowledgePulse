import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { Checkpoint, SkillCandidate } from "./types.js";

/**
 * Persist import progress to a JSON checkpoint file on disk.
 *
 * Enables `--resume` to continue after interruption. Uses Bun.write()
 * for writes and node:fs readFileSync for synchronous reads.
 */
export class CheckpointManager {
  private readonly filePath: string;
  private checkpoint: Checkpoint | null = null;
  private updateCounter = 0;

  /** Number of updateCandidate() calls between automatic saves. */
  private static readonly AUTO_SAVE_INTERVAL = 10;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  /**
   * Load checkpoint from disk. Returns null if the file does not exist.
   * Sets internal state so subsequent calls to save() and updateCandidate()
   * operate on the loaded checkpoint.
   */
  load(): Checkpoint | null {
    if (!existsSync(this.filePath)) {
      this.checkpoint = null;
      return null;
    }

    try {
      const text = readFileSync(this.filePath, "utf-8");
      this.checkpoint = JSON.parse(text) as Checkpoint;
      return this.checkpoint;
    } catch {
      // File is unreadable or contains invalid JSON
      this.checkpoint = null;
      return null;
    }
  }

  /**
   * Write the current checkpoint to disk synchronously.
   */
  save(checkpoint: Checkpoint): void {
    this.checkpoint = checkpoint;
    this.checkpoint.last_updated = new Date().toISOString();
    writeFileSync(this.filePath, JSON.stringify(this.checkpoint, null, 2));
  }

  /**
   * Merge a partial update into the candidate identified by `key`.
   * Auto-saves to disk after every 10 updates.
   */
  updateCandidate(key: string, update: Partial<SkillCandidate>): void {
    if (!this.checkpoint) {
      throw new Error("CheckpointManager: no checkpoint loaded. Call load() or save() first.");
    }

    const existing = this.checkpoint.candidates[key];
    if (existing) {
      this.checkpoint.candidates[key] = { ...existing, ...update };
    } else {
      this.checkpoint.candidates[key] = update as SkillCandidate;
    }

    this.updateCounter++;

    if (this.updateCounter >= CheckpointManager.AUTO_SAVE_INTERVAL) {
      this.updateCounter = 0;
      this.save(this.checkpoint);
    }
  }
}
