import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import MarketplaceCard from "../components/MarketplaceCard";
import type { MarketplaceListing } from "../components/MarketplaceCard";
import MarketplaceFilters from "../components/MarketplaceFilters";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { api } from "../lib/api";

interface ListingsResponse {
  data: MarketplaceListing[];
  total: number;
  offset: number;
  limit: number;
}

interface BalanceResponse {
  balance: number;
  tier: string;
  last_refill: string | null;
  refilled: boolean;
}

interface EarningsResponse {
  agent_id: string;
  total_earnings: number;
  transactions: Array<{
    id: string;
    amount: number;
    reason: string;
    type: string;
    created_at: string;
  }>;
}

const DOMAINS = [
  { value: "", label: "All Domains" },
  { value: "general", label: "General" },
  { value: "finance", label: "Finance" },
  { value: "medical", label: "Medical" },
  { value: "engineering", label: "Engineering" },
  { value: "legal", label: "Legal" },
];

// -- Browse Tab --

function BrowseTab() {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);

  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState("");
  const [accessModel, setAccessModel] = useState("");

  const [selected, setSelected] = useState<MarketplaceListing | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  const fetchBalance = useCallback(async () => {
    try {
      const res = (await api.getBalance()) as BalanceResponse;
      setBalance(res.balance);
    } catch {
      // balance display is best-effort
    }
  }, []);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (query) params.q = query;
      if (domain) params.domain = domain;
      if (accessModel) params.access_model = accessModel;
      const res = (await api.getListings(params)) as ListingsResponse;
      setListings(res.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch listings";
      setError(message);
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [query, domain, accessModel]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchListings();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchListings]);

  const handlePurchase = async () => {
    if (!selected) return;
    setPurchasing(true);
    try {
      await api.purchaseListing(selected.id);
      toast.success(`Purchased "${selected.title}"`);
      setSelected(null);
      fetchBalance();
      fetchListings();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Purchase failed";
      toast.error(message);
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Balance bar */}
      <div className="flex items-center justify-between bg-kp-navy rounded-lg px-5 py-3 border border-kp-border">
        <span className="text-sm text-kp-muted">Credit Balance</span>
        <span className="text-kp-teal font-mono font-bold text-lg">
          {balance !== null ? balance.toLocaleString() : "---"}
        </span>
      </div>

      <MarketplaceFilters
        query={query}
        domain={domain}
        accessModel={accessModel}
        onQueryChange={setQuery}
        onDomainChange={setDomain}
        onAccessModelChange={setAccessModel}
      />

      {error && (
        <div className="bg-kp-error/10 border border-kp-error/30 rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-kp-error mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm text-kp-error">{error}</p>
              <button type="button" onClick={fetchListings} className="mt-1 text-sm text-kp-error/80 underline hover:text-kp-error">
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-kp-panel rounded-lg border border-kp-border p-5 animate-pulse">
              <div className="flex items-start justify-between mb-3">
                <div className="h-5 bg-kp-navy rounded w-3/4" />
                <div className="h-5 bg-kp-navy rounded-full w-16" />
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-kp-navy rounded w-full" />
                <div className="h-4 bg-kp-navy rounded w-2/3" />
                <div className="h-4 bg-kp-navy rounded w-20" />
                <div className="h-3 bg-kp-navy rounded w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-16">
          <svg className="mx-auto h-12 w-12 text-kp-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-kp-heading">No listings found</h3>
          <p className="mt-1 text-sm text-kp-muted">
            {query || domain || accessModel
              ? "Try adjusting your search filters."
              : "The marketplace is empty. Be the first to create a listing!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((listing) => (
            <MarketplaceCard key={listing.id} listing={listing} onClick={setSelected} />
          ))}
        </div>
      )}

      {/* Purchase dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected?.title}</DialogTitle>
            <DialogDescription>{selected?.description}</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="bg-kp-navy text-kp-teal text-xs font-mono px-2 py-0.5 rounded">
                  {selected.domain}
                </span>
                <AccessBadge model={selected.access_model} />
              </div>
              <div className="flex items-center justify-between bg-kp-navy rounded-lg px-4 py-3 border border-kp-border">
                <span className="text-sm text-kp-muted">Cost</span>
                <span className="text-kp-teal font-mono font-bold">
                  {selected.price_credits === 0 ? "Free" : `${selected.price_credits} credits`}
                </span>
              </div>
              <div className="text-xs text-kp-muted">
                {selected.purchases} purchase{selected.purchases !== 1 ? "s" : ""} &middot; Listed{" "}
                {new Date(selected.created_at).toLocaleDateString()}
              </div>
            </div>
          )}
          <DialogFooter>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="px-4 py-2 text-sm text-kp-muted border border-kp-border rounded-lg hover:text-kp-text transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePurchase}
              disabled={purchasing}
              className="px-4 py-2 text-sm bg-kp-teal text-white font-medium rounded-lg hover:bg-kp-teal/90 disabled:opacity-50 transition-colors"
            >
              {purchasing ? "Purchasing..." : selected?.price_credits === 0 ? "Get for Free" : "Purchase"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// -- My Listings Tab --

function MyListingsTab() {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [listingDomain, setListingDomain] = useState("general");
  const [knowledgeUnitId, setKnowledgeUnitId] = useState("");
  const [listingAccessModel, setListingAccessModel] = useState("free");
  const [priceCredits, setPriceCredits] = useState(0);

  const fetchMyListings = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all listings — server-side contributor filtering would be ideal,
      // but for now we fetch all and the server returns the user's based on auth
      const res = (await api.getListings()) as ListingsResponse;
      setListings(res.data);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyListings();
  }, [fetchMyListings]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setListingDomain("general");
    setKnowledgeUnitId("");
    setListingAccessModel("free");
    setPriceCredits(0);
  };

  const handleCreate = async () => {
    if (!title.trim() || !knowledgeUnitId.trim()) {
      toast.error("Title and Knowledge Unit ID are required");
      return;
    }
    setSubmitting(true);
    try {
      await api.createListing({
        title: title.trim(),
        description: description.trim(),
        domain: listingDomain,
        knowledge_unit_id: knowledgeUnitId.trim(),
        access_model: listingAccessModel,
        price_credits: listingAccessModel === "free" ? 0 : priceCredits,
      });
      toast.success("Listing created successfully");
      setCreateOpen(false);
      resetForm();
      fetchMyListings();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create listing";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-kp-muted">
          {loading ? "Loading..." : `${listings.length} listing${listings.length !== 1 ? "s" : ""}`}
        </p>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center px-4 py-2 bg-kp-green text-white text-sm font-medium rounded-lg hover:bg-kp-green/90 transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Listing
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-kp-panel rounded-lg border border-kp-border p-5 animate-pulse">
              <div className="h-5 bg-kp-navy rounded w-3/4 mb-3" />
              <div className="h-4 bg-kp-navy rounded w-full mb-2" />
              <div className="h-4 bg-kp-navy rounded w-20" />
            </div>
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-16">
          <svg className="mx-auto h-12 w-12 text-kp-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-kp-heading">No listings yet</h3>
          <p className="mt-1 text-sm text-kp-muted">Create your first marketplace listing.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((listing) => (
            <MarketplaceCard key={listing.id} listing={listing} onClick={() => {}} />
          ))}
        </div>
      )}

      {/* Create listing dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Listing</DialogTitle>
            <DialogDescription>Publish knowledge to the marketplace.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-kp-text mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My SOP listing"
                className="w-full px-3 py-2 bg-kp-navy border border-kp-border text-kp-text placeholder:text-kp-muted rounded-lg focus:ring-2 focus:ring-kp-teal focus:border-kp-teal outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-kp-text mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this listing offers..."
                rows={3}
                className="w-full px-3 py-2 bg-kp-navy border border-kp-border text-kp-text placeholder:text-kp-muted rounded-lg focus:ring-2 focus:ring-kp-teal focus:border-kp-teal outline-none transition-colors resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-kp-text mb-1">Knowledge Unit ID</label>
              <input
                type="text"
                value={knowledgeUnitId}
                onChange={(e) => setKnowledgeUnitId(e.target.value)}
                placeholder="kp:ku:..."
                className="w-full px-3 py-2 bg-kp-navy border border-kp-border text-kp-text placeholder:text-kp-muted rounded-lg focus:ring-2 focus:ring-kp-teal focus:border-kp-teal outline-none transition-colors font-mono text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-kp-text mb-1">Domain</label>
                <select
                  value={listingDomain}
                  onChange={(e) => setListingDomain(e.target.value)}
                  className="w-full px-3 py-2 bg-kp-navy border border-kp-border text-kp-text rounded-lg focus:ring-2 focus:ring-kp-teal focus:border-kp-teal outline-none transition-colors"
                >
                  {DOMAINS.filter((d) => d.value).map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-kp-text mb-1">Access Model</label>
                <select
                  value={listingAccessModel}
                  onChange={(e) => setListingAccessModel(e.target.value)}
                  className="w-full px-3 py-2 bg-kp-navy border border-kp-border text-kp-text rounded-lg focus:ring-2 focus:ring-kp-teal focus:border-kp-teal outline-none transition-colors"
                >
                  <option value="free">Free</option>
                  <option value="org">Org</option>
                  <option value="subscription">Subscription</option>
                </select>
              </div>
            </div>
            {listingAccessModel !== "free" && (
              <div>
                <label className="block text-sm font-medium text-kp-text mb-1">Price (credits)</label>
                <input
                  type="number"
                  min={1}
                  value={priceCredits}
                  onChange={(e) => setPriceCredits(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-kp-navy border border-kp-border text-kp-text rounded-lg focus:ring-2 focus:ring-kp-teal focus:border-kp-teal outline-none transition-colors font-mono"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="px-4 py-2 text-sm text-kp-muted border border-kp-border rounded-lg hover:text-kp-text transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={submitting}
              className="px-4 py-2 text-sm bg-kp-green text-white font-medium rounded-lg hover:bg-kp-green/90 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Creating..." : "Create"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// -- Earnings Tab --

function EarningsTab() {
  const [earnings, setEarnings] = useState<EarningsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = (await api.getEarnings()) as EarningsResponse;
        setEarnings(res);
      } catch {
        // best-effort
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="bg-kp-panel rounded-lg border border-kp-border p-6 animate-pulse">
          <div className="h-6 bg-kp-navy rounded w-32 mb-2" />
          <div className="h-8 bg-kp-navy rounded w-24" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-kp-panel rounded-lg border border-kp-border p-4 animate-pulse">
            <div className="h-4 bg-kp-navy rounded w-3/4 mb-2" />
            <div className="h-3 bg-kp-navy rounded w-24" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Total earnings */}
      <div className="bg-kp-navy rounded-lg px-6 py-5 border border-kp-border">
        <p className="text-sm text-kp-muted mb-1">Total Earnings</p>
        <p className="text-3xl font-bold text-kp-green font-mono">
          {earnings?.total_earnings?.toLocaleString() ?? 0}
          <span className="text-base font-normal text-kp-muted ml-2">credits</span>
        </p>
      </div>

      {/* Transaction list */}
      {!earnings?.transactions?.length ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-kp-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-kp-heading">No earnings yet</h3>
          <p className="mt-1 text-sm text-kp-muted">Earnings from marketplace sales will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-kp-muted uppercase tracking-wider">Transactions</h3>
          {earnings.transactions.map((tx) => (
            <div key={tx.id} className="bg-kp-panel rounded-lg border border-kp-border px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm text-kp-text">{tx.reason}</p>
                <p className="text-xs text-kp-muted/70">{new Date(tx.created_at).toLocaleString()}</p>
              </div>
              <span className="text-kp-green font-mono font-semibold">+{tx.amount}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// -- Access model badge helper --

function AccessBadge({ model }: { model: MarketplaceListing["access_model"] }) {
  const styles: Record<string, string> = {
    free: "bg-kp-green/15 text-kp-green",
    org: "bg-kp-blue/15 text-kp-blue",
    subscription: "bg-kp-orange/15 text-kp-orange",
  };
  const labels: Record<string, string> = {
    free: "Free",
    org: "Org",
    subscription: "Subscription",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[model]}`}>
      {labels[model]}
    </span>
  );
}

// -- Main Marketplace page --

export default function Marketplace() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-kp-heading">Marketplace</h1>
        <p className="mt-1 text-sm text-kp-muted">Browse, purchase, and sell knowledge units</p>
      </div>

      <Tabs defaultValue="browse">
        <TabsList>
          <TabsTrigger value="browse">Browse</TabsTrigger>
          <TabsTrigger value="my-listings">My Listings</TabsTrigger>
          <TabsTrigger value="earnings">Earnings</TabsTrigger>
        </TabsList>
        <TabsContent value="browse">
          <BrowseTab />
        </TabsContent>
        <TabsContent value="my-listings">
          <MyListingsTab />
        </TabsContent>
        <TabsContent value="earnings">
          <EarningsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
