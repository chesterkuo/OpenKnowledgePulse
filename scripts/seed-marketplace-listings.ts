#!/usr/bin/env bun
/**
 * Seed marketplace listings from imported skills.
 * Creates free listings for all skills that don't already have one.
 *
 * Usage: bun scripts/seed-marketplace-listings.ts [--registry-url URL]
 */

const REGISTRY_URL = process.argv.includes("--registry-url")
  ? process.argv[process.argv.indexOf("--registry-url") + 1]
  : "http://localhost:3000";

const API_KEY = process.argv.includes("--api-key")
  ? process.argv[process.argv.indexOf("--api-key") + 1]
  : "";

const authHeaders: Record<string, string> = API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {};

interface StoredSkill {
  id: string;
  name: string;
  description: string;
  content: string;
}

interface MarketplaceListing {
  knowledge_unit_id: string;
}

function extractDomain(content: string): string {
  const match = content.match(/domain:\s*(\w+)/);
  return match ? match[1] : "general";
}

async function fetchAllPages<T>(path: string): Promise<T[]> {
  const all: T[] = [];
  let offset = 0;
  const limit = 100;
  while (true) {
    const res = await fetch(`${REGISTRY_URL}${path}?limit=${limit}&offset=${offset}`, {
      headers: authHeaders,
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch ${path}: ${res.status} ${res.statusText}`);
    }
    const json = (await res.json()) as { data: T[]; total: number };
    all.push(...json.data);
    offset += limit;
    if (offset >= json.total) break;
  }
  return all;
}

async function main() {
  console.log(`Seeding marketplace listings from ${REGISTRY_URL}...`);

  // Fetch all skills (paginated)
  const skills = await fetchAllPages<StoredSkill>("/v1/skills");
  console.log(`Found ${skills.length} skills`);

  // Fetch existing listings to check for duplicates (paginated)
  const existing = await fetchAllPages<MarketplaceListing>("/v1/marketplace/listings");
  const existingKuIds = new Set(existing.map((l) => l.knowledge_unit_id));

  let created = 0;
  let skipped = 0;

  for (const skill of skills) {
    if (existingKuIds.has(skill.id)) {
      skipped++;
      continue;
    }

    const body = {
      title: skill.name,
      description: skill.description,
      domain: extractDomain(skill.content),
      knowledge_unit_id: skill.id,
      access_model: "free",
      price_credits: 0,
    };

    const res = await fetch(`${REGISTRY_URL}/v1/marketplace/listings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      created++;
    } else {
      const err = await res.text();
      console.error(`Failed to create listing for "${skill.name}": ${err}`);
    }
  }

  console.log(`Created ${created} free marketplace listings from skills`);
  if (skipped > 0) {
    console.log(`Skipped ${skipped} skills (listings already exist)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
