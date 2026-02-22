import { beforeEach, describe, expect, test } from "bun:test";
import type { MarketplaceListing } from "../interfaces.js";
import { MemoryMarketplaceStore } from "./marketplace-store.js";

function makeListing(overrides: Partial<MarketplaceListing> = {}): MarketplaceListing {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    knowledge_unit_id: `kp:ku:${crypto.randomUUID()}`,
    contributor_id: "contributor-1",
    price_credits: 10,
    access_model: "free",
    domain: "software-engineering",
    title: "Test Listing",
    description: "A test marketplace listing",
    purchases: 0,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

describe("MemoryMarketplaceStore", () => {
  let store: MemoryMarketplaceStore;

  beforeEach(() => {
    store = new MemoryMarketplaceStore();
  });

  describe("createListing + getListing", () => {
    test("should store a listing and retrieve it by id", async () => {
      const listing = makeListing();
      const created = await store.createListing(listing);

      expect(created).toEqual(listing);

      const retrieved = await store.getListing(listing.id);
      expect(retrieved).toEqual(listing);
    });

    test("should return undefined for nonexistent listing", async () => {
      const result = await store.getListing("nonexistent-id");
      expect(result).toBeUndefined();
    });
  });

  describe("search", () => {
    let listingA: MarketplaceListing;
    let listingB: MarketplaceListing;
    let listingC: MarketplaceListing;

    beforeEach(async () => {
      listingA = makeListing({
        title: "React Best Practices",
        description: "Advanced patterns for React applications",
        domain: "frontend",
        access_model: "free",
      });
      listingB = makeListing({
        title: "Python Data Analysis",
        description: "Machine learning pipelines in Python",
        domain: "data-science",
        access_model: "subscription",
      });
      listingC = makeListing({
        title: "API Security Guide",
        description: "Securing REST APIs with best practices",
        domain: "frontend",
        access_model: "org",
      });
      await store.createListing(listingA);
      await store.createListing(listingB);
      await store.createListing(listingC);
    });

    test("should return all listings when no filters are applied", async () => {
      const result = await store.search({});
      expect(result.total).toBe(3);
      expect(result.data).toHaveLength(3);
    });

    test("should filter by domain", async () => {
      const result = await store.search({ domain: "frontend" });
      expect(result.total).toBe(2);
      const titles = result.data.map((l) => l.title);
      expect(titles).toContain("React Best Practices");
      expect(titles).toContain("API Security Guide");
    });

    test("should filter by domain case-insensitively", async () => {
      const result = await store.search({ domain: "FRONTEND" });
      expect(result.total).toBe(2);
    });

    test("should filter by access_model", async () => {
      const result = await store.search({ access_model: "subscription" });
      expect(result.total).toBe(1);
      expect(result.data[0]?.title).toBe("Python Data Analysis");
    });

    test("should filter by query matching title", async () => {
      const result = await store.search({ query: "React" });
      expect(result.total).toBe(1);
      expect(result.data[0]?.title).toBe("React Best Practices");
    });

    test("should filter by query matching description", async () => {
      const result = await store.search({ query: "machine learning" });
      expect(result.total).toBe(1);
      expect(result.data[0]?.title).toBe("Python Data Analysis");
    });

    test("should be case-insensitive when searching by query", async () => {
      const result = await store.search({ query: "react" });
      expect(result.total).toBe(1);
      expect(result.data[0]?.title).toBe("React Best Practices");
    });

    test("should combine multiple filters", async () => {
      const result = await store.search({
        domain: "frontend",
        query: "security",
      });
      expect(result.total).toBe(1);
      expect(result.data[0]?.title).toBe("API Security Guide");
    });

    test("should apply pagination", async () => {
      const page1 = await store.search({
        pagination: { offset: 0, limit: 2 },
      });
      expect(page1.data).toHaveLength(2);
      expect(page1.total).toBe(3);
      expect(page1.offset).toBe(0);
      expect(page1.limit).toBe(2);

      const page2 = await store.search({
        pagination: { offset: 2, limit: 2 },
      });
      expect(page2.data).toHaveLength(1);
      expect(page2.total).toBe(3);
      expect(page2.offset).toBe(2);
    });

    test("should default pagination to offset=0, limit=20", async () => {
      const result = await store.search({});
      expect(result.offset).toBe(0);
      expect(result.limit).toBe(20);
    });

    test("should return empty results when no matches", async () => {
      const result = await store.search({ query: "nonexistent" });
      expect(result.total).toBe(0);
      expect(result.data).toHaveLength(0);
    });
  });

  describe("recordPurchase", () => {
    test("should increment the purchases count", async () => {
      const listing = makeListing({ purchases: 0 });
      await store.createListing(listing);

      await store.recordPurchase(listing.id, "buyer-1");
      const updated = await store.getListing(listing.id);
      expect(updated?.purchases).toBe(1);

      await store.recordPurchase(listing.id, "buyer-2");
      const updated2 = await store.getListing(listing.id);
      expect(updated2?.purchases).toBe(2);
    });

    test("should update the updated_at timestamp", async () => {
      const listing = makeListing();
      const originalUpdatedAt = listing.updated_at;
      await store.createListing(listing);

      // Small delay to ensure timestamp differs
      await new Promise((resolve) => setTimeout(resolve, 5));
      await store.recordPurchase(listing.id, "buyer-1");

      const updated = await store.getListing(listing.id);
      expect(updated?.updated_at).not.toBe(originalUpdatedAt);
    });
  });

  describe("getByContributor", () => {
    test("should return only listings from the specified contributor", async () => {
      const listing1 = makeListing({
        contributor_id: "alice",
        title: "Alice Listing 1",
      });
      const listing2 = makeListing({
        contributor_id: "alice",
        title: "Alice Listing 2",
      });
      const listing3 = makeListing({
        contributor_id: "bob",
        title: "Bob Listing 1",
      });
      await store.createListing(listing1);
      await store.createListing(listing2);
      await store.createListing(listing3);

      const aliceListings = await store.getByContributor("alice");
      expect(aliceListings).toHaveLength(2);
      const titles = aliceListings.map((l) => l.title);
      expect(titles).toContain("Alice Listing 1");
      expect(titles).toContain("Alice Listing 2");

      const bobListings = await store.getByContributor("bob");
      expect(bobListings).toHaveLength(1);
      expect(bobListings[0]?.title).toBe("Bob Listing 1");
    });

    test("should return empty array for unknown contributor", async () => {
      const result = await store.getByContributor("unknown");
      expect(result).toHaveLength(0);
    });
  });
});
