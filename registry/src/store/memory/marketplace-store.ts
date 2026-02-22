import type {
  MarketplaceListing,
  MarketplaceStore,
  PaginatedResult,
  PaginationOpts,
} from "../interfaces.js";

export class MemoryMarketplaceStore implements MarketplaceStore {
  private listings = new Map<string, MarketplaceListing>();

  async createListing(listing: MarketplaceListing): Promise<MarketplaceListing> {
    this.listings.set(listing.id, listing);
    return listing;
  }

  async getListing(id: string): Promise<MarketplaceListing | undefined> {
    return this.listings.get(id);
  }

  async search(opts: {
    domain?: string;
    access_model?: string;
    query?: string;
    pagination?: PaginationOpts;
  }): Promise<PaginatedResult<MarketplaceListing>> {
    let results = Array.from(this.listings.values());

    if (opts.domain) {
      const domain = opts.domain.toLowerCase();
      results = results.filter((l) => l.domain.toLowerCase() === domain);
    }

    if (opts.access_model) {
      results = results.filter((l) => l.access_model === opts.access_model);
    }

    if (opts.query) {
      const q = opts.query.toLowerCase();
      results = results.filter(
        (l) => l.title.toLowerCase().includes(q) || l.description.toLowerCase().includes(q),
      );
    }

    const total = results.length;
    const offset = opts.pagination?.offset ?? 0;
    const limit = opts.pagination?.limit ?? 20;
    const data = results.slice(offset, offset + limit);

    return { data, total, offset, limit };
  }

  async recordPurchase(listingId: string, _buyerId: string): Promise<void> {
    const listing = this.listings.get(listingId);
    if (listing) {
      listing.purchases += 1;
      listing.updated_at = new Date().toISOString();
    }
  }

  async getByContributor(contributorId: string): Promise<MarketplaceListing[]> {
    return Array.from(this.listings.values()).filter((l) => l.contributor_id === contributorId);
  }
}
