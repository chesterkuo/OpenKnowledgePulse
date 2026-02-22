import type {
  MarketplaceListing,
  MarketplaceStore,
  PaginatedResult,
  PaginationOpts,
} from "../interfaces.js";
import type { PgPool } from "./db.js";

export class PgMarketplaceStore implements MarketplaceStore {
  constructor(private pool: PgPool) {}

  async createListing(
    listing: MarketplaceListing,
  ): Promise<MarketplaceListing> {
    await this.pool.query(
      `INSERT INTO marketplace_listings
         (id, knowledge_unit_id, contributor_id, price_credits, access_model, domain, title, description, purchases, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO UPDATE SET
         knowledge_unit_id = EXCLUDED.knowledge_unit_id,
         contributor_id = EXCLUDED.contributor_id,
         price_credits = EXCLUDED.price_credits,
         access_model = EXCLUDED.access_model,
         domain = EXCLUDED.domain,
         title = EXCLUDED.title,
         description = EXCLUDED.description,
         purchases = EXCLUDED.purchases,
         updated_at = EXCLUDED.updated_at`,
      [
        listing.id,
        listing.knowledge_unit_id,
        listing.contributor_id,
        listing.price_credits,
        listing.access_model,
        listing.domain,
        listing.title,
        listing.description,
        listing.purchases,
        listing.created_at,
        listing.updated_at,
      ],
    );
    return listing;
  }

  async getListing(id: string): Promise<MarketplaceListing | undefined> {
    const { rows } = await this.pool.query(
      "SELECT * FROM marketplace_listings WHERE id = $1",
      [id],
    );
    if (rows.length === 0) return undefined;
    return this.rowToListing(rows[0]);
  }

  async search(opts: {
    domain?: string;
    access_model?: string;
    query?: string;
    pagination?: PaginationOpts;
  }): Promise<PaginatedResult<MarketplaceListing>> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (opts.domain) {
      conditions.push(`LOWER(domain) = LOWER($${paramIndex})`);
      params.push(opts.domain);
      paramIndex++;
    }

    if (opts.access_model) {
      conditions.push(`access_model = $${paramIndex}`);
      params.push(opts.access_model);
      paramIndex++;
    }

    if (opts.query) {
      const pattern = `%${opts.query}%`;
      conditions.push(
        `(title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`,
      );
      params.push(pattern);
      paramIndex++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get total count
    const { rows: countRows } = await this.pool.query(
      `SELECT COUNT(*) AS total FROM marketplace_listings ${whereClause}`,
      params,
    );
    const total = parseInt(countRows[0].total, 10);

    // Get paginated data
    const offset = opts.pagination?.offset ?? 0;
    const limit = opts.pagination?.limit ?? 20;

    const dataQuery = `SELECT * FROM marketplace_listings ${whereClause}
      ORDER BY purchases DESC
      OFFSET $${paramIndex} LIMIT $${paramIndex + 1}`;
    const { rows } = await this.pool.query(dataQuery, [
      ...params,
      offset,
      limit,
    ]);

    const data = rows.map((row: Record<string, unknown>) =>
      this.rowToListing(row),
    );

    return { data, total, offset, limit };
  }

  async recordPurchase(listingId: string, _buyerId: string): Promise<void> {
    await this.pool.query(
      `UPDATE marketplace_listings
       SET purchases = purchases + 1, updated_at = NOW()
       WHERE id = $1`,
      [listingId],
    );
  }

  async getByContributor(contributorId: string): Promise<MarketplaceListing[]> {
    const { rows } = await this.pool.query(
      "SELECT * FROM marketplace_listings WHERE contributor_id = $1",
      [contributorId],
    );
    return rows.map((row: Record<string, unknown>) => this.rowToListing(row));
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
      created_at:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : (row.created_at as string),
      updated_at:
        row.updated_at instanceof Date
          ? row.updated_at.toISOString()
          : (row.updated_at as string),
    };
  }
}
