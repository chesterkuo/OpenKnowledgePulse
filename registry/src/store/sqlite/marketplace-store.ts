import type { Database } from "bun:sqlite";
import type {
  MarketplaceListing,
  MarketplaceStore,
  PaginatedResult,
  PaginationOpts,
} from "../interfaces.js";

export class SqliteMarketplaceStore implements MarketplaceStore {
  constructor(private db: Database) {}

  async createListing(listing: MarketplaceListing): Promise<MarketplaceListing> {
    this.db
      .query(
        `INSERT OR REPLACE INTO marketplace_listings
         (id, knowledge_unit_id, contributor_id, price_credits, access_model, domain, title, description, purchases, created_at, updated_at)
         VALUES ($id, $knowledge_unit_id, $contributor_id, $price_credits, $access_model, $domain, $title, $description, $purchases, $created_at, $updated_at)`,
      )
      .run({
        $id: listing.id,
        $knowledge_unit_id: listing.knowledge_unit_id,
        $contributor_id: listing.contributor_id,
        $price_credits: listing.price_credits,
        $access_model: listing.access_model,
        $domain: listing.domain,
        $title: listing.title,
        $description: listing.description,
        $purchases: listing.purchases,
        $created_at: listing.created_at,
        $updated_at: listing.updated_at,
      });
    return listing;
  }

  async getListing(id: string): Promise<MarketplaceListing | undefined> {
    const row = this.db
      .query("SELECT * FROM marketplace_listings WHERE id = $id")
      .get({ $id: id }) as Record<string, unknown> | null;
    if (!row) return undefined;
    return this.rowToListing(row);
  }

  async search(opts: {
    domain?: string;
    access_model?: string;
    query?: string;
    pagination?: PaginationOpts;
  }): Promise<PaginatedResult<MarketplaceListing>> {
    const conditions: string[] = [];
    const params: Record<string, unknown> = {};

    if (opts.domain) {
      conditions.push("LOWER(domain) = $domain");
      params.$domain = opts.domain.toLowerCase();
    }

    if (opts.access_model) {
      conditions.push("access_model = $access_model");
      params.$access_model = opts.access_model;
    }

    if (opts.query) {
      conditions.push("(LOWER(title) LIKE $query OR LOWER(description) LIKE $query)");
      params.$query = `%${opts.query.toLowerCase()}%`;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get total count
    const countRow = this.db
      .query(`SELECT COUNT(*) as count FROM marketplace_listings ${whereClause}`)
      .get(params as Record<string, string | number>) as { count: number };
    const total = countRow.count;

    // Get paginated results
    const offset = opts.pagination?.offset ?? 0;
    const limit = opts.pagination?.limit ?? 20;

    const rows = this.db
      .query(
        `SELECT * FROM marketplace_listings ${whereClause} ORDER BY updated_at DESC LIMIT $limit OFFSET $offset`,
      )
      .all({
        ...(params as Record<string, string | number>),
        $limit: limit,
        $offset: offset,
      }) as Record<string, unknown>[];

    const data = rows.map((row) => this.rowToListing(row));

    return { data, total, offset, limit };
  }

  async recordPurchase(listingId: string, _buyerId: string): Promise<void> {
    const now = new Date().toISOString();
    this.db
      .query(
        "UPDATE marketplace_listings SET purchases = purchases + 1, updated_at = $updated_at WHERE id = $id",
      )
      .run({
        $id: listingId,
        $updated_at: now,
      });
  }

  async getByContributor(contributorId: string): Promise<MarketplaceListing[]> {
    const rows = this.db
      .query("SELECT * FROM marketplace_listings WHERE contributor_id = $contributor_id")
      .all({ $contributor_id: contributorId }) as Record<string, unknown>[];
    return rows.map((row) => this.rowToListing(row));
  }

  private rowToListing(row: Record<string, unknown>): MarketplaceListing {
    return {
      id: row.id as string,
      knowledge_unit_id: row.knowledge_unit_id as string,
      contributor_id: row.contributor_id as string,
      price_credits: row.price_credits as number,
      access_model: row.access_model as MarketplaceListing["access_model"],
      domain: row.domain as string,
      title: row.title as string,
      description: row.description as string,
      purchases: row.purchases as number,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    };
  }
}
