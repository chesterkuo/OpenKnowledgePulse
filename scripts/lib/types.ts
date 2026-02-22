export interface ImportConfig {
  githubToken: string;
  apiKey: string;
  registryUrl: string;
  minStars: number; // default 5
  minQuality: number; // default 0.6
  maxResults: number; // total cap, default 1000
  concurrency: number; // parallel processing, default 3
  dryRun: boolean;
  resume: boolean;
  verbose: boolean;
}

export interface RepoMetadata {
  full_name: string; // "owner/repo"
  stargazers_count: number;
  forks_count: number;
  license: { spdx_id: string } | null;
  pushed_at: string;
  created_at: string;
  topics: string[];
  archived: boolean;
  description: string | null;
}

export interface SkillCandidate {
  repoFullName: string;
  filePath: string;
  key: string; // "owner/repo:path" unique identifier
  status: "pending" | "fetched" | "imported" | "skipped" | "failed";
  reason?: string;
  skillId?: string;
  qualityScore?: number;
  domain?: string;
}

export interface ImportStats {
  discovered: number;
  fetched: number;
  passed_quality: number;
  passed_validation: number;
  imported: number;
  skipped_low_quality: number;
  skipped_validation: number;
  skipped_injection: number;
  skipped_duplicate: number;
  failed: number;
}

export interface Checkpoint {
  started_at: string;
  last_updated: string;
  phase: "discover" | "process" | "complete";
  completed_queries: string[];
  candidates: Record<string, SkillCandidate>;
  stats: ImportStats;
}
