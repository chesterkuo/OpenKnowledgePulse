import { RateLimiter, withRetry } from "./rate-limiter.js";
import type { RepoMetadata } from "./types.js";

/**
 * A single SKILL.md file discovered via GitHub code search.
 */
export interface GitHubSearchResult {
  fullName: string; // "owner/repo"
  filePath: string; // path within the repo, e.g. "SKILL.md" or "docs/SKILL.md"
}

/**
 * Size-range partitions for GitHub code search.
 *
 * GitHub's search API returns at most 1000 results per query. Partitioning
 * by file size lets us get up to 1000 results per range, effectively
 * raising the ceiling to ~4000 discoverable files.
 */
const SIZE_RANGES = [
  "size:100..500",
  "size:501..2000",
  "size:2001..10000",
  "size:>10000",
] as const;

const GITHUB_API = "https://api.github.com";
const MAX_PAGES = 10;
const PER_PAGE = 100;

/**
 * GitHub API client with rate limiting for the KnowledgePulse SKILL.md scraper.
 *
 * Uses two separate rate limiters:
 * - `searchLimiter` for code search endpoints (10 requests/min for authenticated users)
 * - `apiLimiter` for all other API calls — repo metadata, file content (higher limit)
 *
 * All fetch calls are wrapped in `withRetry()` to handle transient 403/429/503 errors.
 */
export class GitHubClient {
  private readonly token: string;
  private readonly searchLimiter: RateLimiter;
  private readonly apiLimiter: RateLimiter;
  private readonly repoCache: Map<string, RepoMetadata> = new Map();

  constructor(
    token: string,
    searchLimiter: RateLimiter,
    apiLimiter: RateLimiter,
  ) {
    this.token = token;
    this.searchLimiter = searchLimiter;
    this.apiLimiter = apiLimiter;
  }

  /**
   * Common headers for all GitHub API requests.
   */
  private baseHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "KnowledgePulse-Scraper/1.0",
    };
  }

  /**
   * Discover SKILL.md files across GitHub using code search.
   *
   * Iterates through size-range partitions to overcome the 1000-result-per-query
   * limit. Each partition is paginated up to 10 pages (100 results each).
   *
   * Yields results one at a time so the caller can begin processing immediately
   * without waiting for all search queries to complete.
   */
  async *discoverSkillFiles(): AsyncGenerator<GitHubSearchResult> {
    const seen = new Set<string>();

    for (const sizeRange of SIZE_RANGES) {
      const query = `filename:SKILL.md ${sizeRange}`;

      for (let page = 1; page <= MAX_PAGES; page++) {
        await this.searchLimiter.acquire();

        const url = new URL(`${GITHUB_API}/search/code`);
        url.searchParams.set("q", query);
        url.searchParams.set("per_page", String(PER_PAGE));
        url.searchParams.set("page", String(page));

        const response = await withRetry(() =>
          fetch(url.toString(), {
            headers: {
              ...this.baseHeaders(),
              Accept: "application/vnd.github+json",
            },
          }),
        );

        if (!response.ok) {
          // 422 can occur for malformed queries or if GitHub is having issues;
          // skip this page/range rather than crashing the entire discovery.
          console.error(
            `[search] HTTP ${response.status} for query="${query}" page=${page}, skipping`,
          );
          break;
        }

        const data = (await response.json()) as {
          total_count: number;
          incomplete_results: boolean;
          items: Array<{
            name: string;
            path: string;
            repository: {
              full_name: string;
            };
          }>;
        };

        if (data.items.length === 0) {
          // No more results for this size range
          break;
        }

        for (const item of data.items) {
          const key = `${item.repository.full_name}:${item.path}`;
          if (seen.has(key)) {
            continue;
          }
          seen.add(key);

          yield {
            fullName: item.repository.full_name,
            filePath: item.path,
          };
        }

        // If we received fewer items than per_page, there are no more pages.
        if (data.items.length < PER_PAGE) {
          break;
        }
      }
    }
  }

  /**
   * Fetch repository metadata from the GitHub API.
   *
   * Results are cached in-memory so that repositories containing multiple
   * SKILL.md files only incur a single API call.
   *
   * @throws Error if the API returns a non-OK response after retries
   */
  async getRepoMetadata(fullName: string): Promise<RepoMetadata> {
    const cached = this.repoCache.get(fullName);
    if (cached) {
      return cached;
    }

    await this.apiLimiter.acquire();

    const response = await withRetry(() =>
      fetch(`${GITHUB_API}/repos/${fullName}`, {
        headers: {
          ...this.baseHeaders(),
          Accept: "application/vnd.github+json",
        },
      }),
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch repo metadata for ${fullName}: HTTP ${response.status}`,
      );
    }

    const data = (await response.json()) as {
      full_name: string;
      stargazers_count: number;
      forks_count: number;
      license: { spdx_id: string } | null;
      pushed_at: string;
      created_at: string;
      topics: string[];
      archived: boolean;
      description: string | null;
    };

    const metadata: RepoMetadata = {
      full_name: data.full_name,
      stargazers_count: data.stargazers_count,
      forks_count: data.forks_count,
      license: data.license,
      pushed_at: data.pushed_at,
      created_at: data.created_at,
      topics: data.topics ?? [],
      archived: data.archived,
      description: data.description,
    };

    this.repoCache.set(fullName, metadata);
    return metadata;
  }

  /**
   * Fetch the raw content of a file from a GitHub repository.
   *
   * Uses the `application/vnd.github.raw+json` accept header so that
   * GitHub returns the file content as plain text rather than base64-encoded.
   *
   * @throws Error if the API returns a non-OK response after retries
   */
  async getFileContent(fullName: string, path: string): Promise<string> {
    await this.apiLimiter.acquire();

    const response = await withRetry(() =>
      fetch(`${GITHUB_API}/repos/${fullName}/contents/${path}`, {
        headers: {
          ...this.baseHeaders(),
          Accept: "application/vnd.github.raw+json",
        },
      }),
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch file content for ${fullName}/${path}: HTTP ${response.status}`,
      );
    }

    return response.text();
  }
}
