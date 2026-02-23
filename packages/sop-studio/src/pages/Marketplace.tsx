import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../hooks/useAuth";
import AuthBanner from "../components/AuthBanner";
import MarketplaceCard from "../components/MarketplaceCard";
import type { MarketplaceListing } from "../components/MarketplaceCard";
import MarketplaceFilters from "../components/MarketplaceFilters";
import SkillCard, { extractDomain } from "../components/SkillCard";
import type { StoredSkill } from "../components/SkillCard";
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
import { generateZip } from "../lib/zip";

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

// -- Skills Tab --

interface SkillsResponse {
  data: StoredSkill[];
  total: number;
  offset: number;
  limit: number;
}

const SKILL_DOMAINS = [
  { value: "", key: "domains.all" },
  { value: "engineering", key: "domains.engineering" },
  { value: "general", key: "domains.general" },
  { value: "security", key: "domains.security" },
  { value: "design", key: "domains.design" },
  { value: "data_science", key: "domains.data_science" },
  { value: "content_creation", key: "domains.content_creation" },
];

function stripFrontmatter(content: string): string {
  return content.replace(/^---[\s\S]*?---\s*/, "");
}

const PAGE_SIZE = 30;

function SkillsTab() {
  const { t } = useTranslation();
  const [skills, setSkills] = useState<StoredSkill[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState("");
  const [selected, setSelected] = useState<StoredSkill | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSelect = useCallback(async (skill: StoredSkill) => {
    // Fetch full detail (including files) from the detail endpoint
    try {
      const res = (await api.getSkill(skill.id)) as { data: StoredSkill };
      setSelected(res.data);
    } catch {
      // Fall back to list data (without files)
      setSelected(skill);
    }
  }, []);

  const handleCopy = useCallback(async () => {
    if (!selected) return;
    await navigator.clipboard.writeText(selected.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    const slug = selected.name.replace(/\s+/g, "-").toLowerCase();
    toast.info(t("marketplace.copyGuidance", { path: `~/.claude/skills/${slug}/SKILL.md` }));
  }, [selected, t]);

  const handleDownload = useCallback(() => {
    if (!selected) return;
    const slug = selected.name.replace(/\s+/g, "-").toLowerCase();

    // Always generate ZIP with correct directory structure: slug/SKILL.md
    const entries = [
      { name: `${slug}/SKILL.md`, content: selected.content },
      ...Object.entries(selected.files ?? {}).map(([name, content]) => ({
        name: `${slug}/${name}`,
        content,
      })),
    ];
    const zipData = generateZip(entries);
    const blob = new Blob([zipData.buffer as ArrayBuffer], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }, [selected]);

  const fetchSkills = useCallback(async (offset = 0, append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const params: Record<string, string> = {
        limit: String(PAGE_SIZE),
        offset: String(offset),
      };
      if (query) params.q = query;
      if (domain) params.domain = domain;
      const res = (await api.getSkills(params)) as SkillsResponse;
      setSkills((prev) => (append ? [...prev, ...res.data] : res.data));
      setTotal(res.total);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch skills";
      setError(message);
      if (!append) setSkills([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [query, domain]);

  const handleLoadMore = useCallback(() => {
    fetchSkills(skills.length, true);
  }, [fetchSkills, skills.length]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSkills(0, false);
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchSkills]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("marketplace.searchSkills")}
            className="w-full px-3 py-2 bg-kp-navy border border-kp-border text-kp-text placeholder:text-kp-muted rounded-lg focus:ring-2 focus:ring-kp-teal focus:border-kp-teal outline-none transition-colors"
          />
        </div>
        <select
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          className="px-3 py-2 bg-kp-navy border border-kp-border text-kp-text rounded-lg focus:ring-2 focus:ring-kp-teal focus:border-kp-teal outline-none transition-colors"
        >
          {SKILL_DOMAINS.map((d) => (
            <option key={d.value} value={d.value}>
              {t(d.key)}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="bg-kp-error/10 border border-kp-error/30 rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-kp-error mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm text-kp-error">{error}</p>
              <button type="button" onClick={fetchSkills} className="mt-1 text-sm text-kp-error/80 underline hover:text-kp-error">
                {t("common.tryAgain")}
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
                <div className="h-5 bg-kp-navy rounded-full w-12" />
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-kp-navy rounded w-full" />
                <div className="h-4 bg-kp-navy rounded w-2/3" />
                <div className="h-4 bg-kp-navy rounded w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : skills.length === 0 ? (
        <div className="text-center py-16">
          <svg className="mx-auto h-12 w-12 text-kp-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-kp-heading">{t("marketplace.noSkills")}</h3>
          <p className="mt-1 text-sm text-kp-muted">
            {query || domain ? t("marketplace.adjustFilters") : t("marketplace.noSkillsYet")}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {skills.map((skill) => (
              <SkillCard key={skill.id} skill={skill} onClick={handleSelect} />
            ))}
          </div>

          {/* Load more + count */}
          <div className="flex flex-col items-center gap-3 pt-2">
            <p className="text-xs text-kp-muted">
              {t("marketplace.showingCount", { shown: skills.length, total })}
            </p>
            {skills.length < total && (
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-6 py-2 text-sm font-medium text-kp-teal border border-kp-teal/40 rounded-lg hover:bg-kp-teal/10 disabled:opacity-50 transition-colors"
              >
                {loadingMore ? t("common.loading") : t("marketplace.loadMore")}
              </button>
            )}
          </div>
        </>
      )}

      {/* Skill detail dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
            <DialogDescription>{selected?.description}</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-kp-navy text-kp-teal text-xs font-mono px-2 py-0.5 rounded">
                  {extractDomain(selected.content)}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-kp-teal/15 text-kp-teal">
                  {t("marketplace.qualityScore")}: {Math.round(selected.quality_score * 100)}%
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-kp-green/15 text-kp-green">
                  {t("marketplace.freeToUse")}
                </span>
              </div>
              {selected.author && (
                <p className="text-sm text-kp-muted">{selected.author}</p>
              )}
              {selected.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selected.tags.map((tag) => (
                    <span key={tag} className="bg-kp-navy/60 text-kp-muted text-xs px-2 py-0.5 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {/* Install section — primary CTA */}
              <div className="bg-kp-teal/10 rounded-lg p-4 border border-kp-teal/30 space-y-3">
                <p className="text-sm font-medium text-kp-teal">{t("marketplace.installTitle")}</p>

                {/* Option 1: kp install (recommended) */}
                <div>
                  <p className="text-xs text-kp-muted mb-1">{t("marketplace.installViaCli")}</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs text-kp-teal font-mono bg-kp-navy/80 rounded px-2.5 py-1.5 select-all">
                      kp install {selected.id}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`kp install ${selected.id}`);
                        toast.success(t("marketplace.copied"));
                      }}
                      className="px-2 py-1.5 text-xs text-kp-muted border border-kp-border rounded hover:text-kp-text transition-colors"
                    >
                      {t("marketplace.copySkill")}
                    </button>
                  </div>
                </div>

                {/* Tool-specific hints */}
                <div className="text-xs text-kp-muted space-y-0.5 border-t border-kp-border/50 pt-2">
                  <p>{t("marketplace.hintClaude")}</p>
                  <p>{t("marketplace.hintCursor")}</p>
                  <p>{t("marketplace.hintWindsurf")}</p>
                </div>
              </div>

              {/* Bundled files list */}
              {selected.files && Object.keys(selected.files).length > 0 && (
                <div className="bg-kp-navy/60 rounded-lg p-3 border border-kp-border">
                  <p className="text-xs font-medium text-kp-text mb-2">
                    {t("marketplace.skillFiles")}
                    <span className="ml-2 text-kp-muted font-normal">
                      ({t("marketplace.skillFilesCount", { count: Object.keys(selected.files).length })})
                    </span>
                  </p>
                  <div className="space-y-1">
                    {Object.entries(selected.files).map(([path, content]) => (
                      <div key={path} className="flex items-center justify-between text-xs font-mono">
                        <span className="text-kp-teal truncate mr-2">{path}</span>
                        <span className="text-kp-muted whitespace-nowrap">
                          {content.length < 1024
                            ? `${content.length} B`
                            : `${(content.length / 1024).toFixed(1)} KB`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-kp-navy rounded-lg p-4 border border-kp-border">
                <pre className="text-sm text-kp-text whitespace-pre-wrap font-mono leading-relaxed">
                  {stripFrontmatter(selected.content)}
                </pre>
              </div>
            </div>
          )}
          <DialogFooter className="flex-row gap-2 sm:justify-between">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="px-4 py-2 text-sm text-kp-muted border border-kp-border rounded-lg hover:text-kp-text transition-colors"
            >
              {t("common.cancel")}
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center px-3 py-2 text-xs text-kp-muted border border-kp-border rounded-lg hover:text-kp-text transition-colors"
                title={t("marketplace.copyContentTip")}
              >
                <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {copied ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  )}
                </svg>
                {copied ? t("marketplace.copied") : t("marketplace.copyContent")}
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center px-4 py-2 text-sm font-medium bg-kp-teal text-white rounded-lg hover:bg-kp-teal/90 transition-colors"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {t("marketplace.downloadZip")}
              </button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// -- Browse Tab --

function BrowseTab() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
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
    if (!isAuthenticated) return;
    try {
      const res = (await api.getBalance()) as BalanceResponse;
      setBalance(res.balance);
    } catch {
      // balance display is best-effort
    }
  }, [isAuthenticated]);

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
    if (!isAuthenticated) {
      toast.error(t("marketplace.authRequired"));
      navigate("/settings", { state: { from: "/marketplace", authRequired: true } });
      return;
    }
    setPurchasing(true);
    try {
      await api.purchaseListing(selected.id);
      toast.success(t("marketplace.purchased", { title: selected.title }));
      setSelected(null);
      fetchBalance();
      fetchListings();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("marketplace.purchaseFailed");
      toast.error(message);
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Balance bar */}
      <div className="flex items-center justify-between bg-kp-navy rounded-lg px-5 py-3 border border-kp-border">
        <span className="text-sm text-kp-muted">{t("marketplace.creditBalance")}</span>
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
                {t("common.tryAgain")}
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
          <h3 className="mt-4 text-lg font-medium text-kp-heading">{t("marketplace.noListings")}</h3>
          <p className="mt-1 text-sm text-kp-muted">
            {query || domain || accessModel
              ? t("marketplace.adjustFilters")
              : t("marketplace.emptyMarketplace")}
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
                <span className="text-sm text-kp-muted">{t("marketplace.cost")}</span>
                <span className="text-kp-teal font-mono font-bold">
                  {selected.price_credits === 0 ? t("common.free") : t("marketplace.creditsAmount", { amount: selected.price_credits })}
                </span>
              </div>
              <div className="text-xs text-kp-muted">
                {t("common.purchases", { count: selected.purchases })} &middot; {t("common.listed", { date: new Date(selected.created_at).toLocaleDateString() })}
              </div>
            </div>
          )}
          <DialogFooter>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="px-4 py-2 text-sm text-kp-muted border border-kp-border rounded-lg hover:text-kp-text transition-colors"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={handlePurchase}
              disabled={purchasing}
              className="px-4 py-2 text-sm bg-kp-teal text-white font-medium rounded-lg hover:bg-kp-teal/90 disabled:opacity-50 transition-colors"
            >
              {purchasing ? t("marketplace.purchasing") : selected?.price_credits === 0 ? t("marketplace.getForFree") : t("common.purchase")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// -- My Listings Tab --

function MyListingsTab() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
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

  const DOMAINS = [
    { value: "general", label: t("domains.general") },
    { value: "finance", label: t("domains.finance") },
    { value: "medical", label: t("domains.medical") },
    { value: "engineering", label: t("domains.engineering") },
    { value: "legal", label: t("domains.legal") },
  ];

  const fetchMyListings = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = (await api.getMyListings()) as ListingsResponse;
      setListings(res.data);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

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
    if (!isAuthenticated) {
      toast.error(t("marketplace.authRequired"));
      navigate("/settings", { state: { from: "/marketplace", authRequired: true } });
      return;
    }
    if (!title.trim() || !knowledgeUnitId.trim()) {
      toast.error(t("marketplace.titleRequired"));
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
      toast.success(t("marketplace.listingCreated"));
      setCreateOpen(false);
      resetForm();
      fetchMyListings();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("marketplace.createFailed");
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <AuthBanner />
      <div className="flex items-center justify-between">
        <p className="text-sm text-kp-muted">
          {loading ? t("common.loading") : t("marketplace.listings", { count: listings.length })}
        </p>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center px-4 py-2 bg-kp-green text-white text-sm font-medium rounded-lg hover:bg-kp-green/90 transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t("marketplace.createListing")}
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
          <h3 className="mt-4 text-lg font-medium text-kp-heading">{t("marketplace.noListingsYet")}</h3>
          <p className="mt-1 text-sm text-kp-muted">{t("marketplace.createFirst")}</p>
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
            <DialogTitle>{t("marketplace.createListing")}</DialogTitle>
            <DialogDescription>{t("marketplace.publishKnowledge")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-kp-text mb-1">{t("marketplace.titleLabel")}</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("marketplace.titlePlaceholder")}
                className="w-full px-3 py-2 bg-kp-navy border border-kp-border text-kp-text placeholder:text-kp-muted rounded-lg focus:ring-2 focus:ring-kp-teal focus:border-kp-teal outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-kp-text mb-1">{t("marketplace.descriptionLabel")}</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("marketplace.descriptionPlaceholder")}
                rows={3}
                className="w-full px-3 py-2 bg-kp-navy border border-kp-border text-kp-text placeholder:text-kp-muted rounded-lg focus:ring-2 focus:ring-kp-teal focus:border-kp-teal outline-none transition-colors resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-kp-text mb-1">{t("marketplace.knowledgeUnitId")}</label>
              <input
                type="text"
                value={knowledgeUnitId}
                onChange={(e) => setKnowledgeUnitId(e.target.value)}
                placeholder={t("marketplace.kuIdPlaceholder")}
                className="w-full px-3 py-2 bg-kp-navy border border-kp-border text-kp-text placeholder:text-kp-muted rounded-lg focus:ring-2 focus:ring-kp-teal focus:border-kp-teal outline-none transition-colors font-mono text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-kp-text mb-1">{t("marketplace.domainLabel")}</label>
                <select
                  value={listingDomain}
                  onChange={(e) => setListingDomain(e.target.value)}
                  className="w-full px-3 py-2 bg-kp-navy border border-kp-border text-kp-text rounded-lg focus:ring-2 focus:ring-kp-teal focus:border-kp-teal outline-none transition-colors"
                >
                  {DOMAINS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-kp-text mb-1">{t("marketplace.accessModelLabel")}</label>
                <select
                  value={listingAccessModel}
                  onChange={(e) => setListingAccessModel(e.target.value)}
                  className="w-full px-3 py-2 bg-kp-navy border border-kp-border text-kp-text rounded-lg focus:ring-2 focus:ring-kp-teal focus:border-kp-teal outline-none transition-colors"
                >
                  <option value="free">{t("accessModel.free")}</option>
                  <option value="org">{t("accessModel.org")}</option>
                  <option value="subscription">{t("accessModel.subscription")}</option>
                </select>
              </div>
            </div>
            {listingAccessModel !== "free" && (
              <div>
                <label className="block text-sm font-medium text-kp-text mb-1">{t("marketplace.priceLabel")}</label>
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
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={submitting}
              className="px-4 py-2 text-sm bg-kp-green text-white font-medium rounded-lg hover:bg-kp-green/90 disabled:opacity-50 transition-colors"
            >
              {submitting ? t("marketplace.creating") : t("marketplace.create")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// -- Earnings Tab --

function EarningsTab() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [earnings, setEarnings] = useState<EarningsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
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
  }, [isAuthenticated]);

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
      <AuthBanner />
      {/* Total earnings */}
      <div className="bg-kp-navy rounded-lg px-6 py-5 border border-kp-border">
        <p className="text-sm text-kp-muted mb-1">{t("marketplace.totalEarnings")}</p>
        <p className="text-3xl font-bold text-kp-green font-mono">
          {earnings?.total_earnings?.toLocaleString() ?? 0}
          <span className="text-base font-normal text-kp-muted ml-2">{t("common.credits")}</span>
        </p>
      </div>

      {/* Transaction list */}
      {!earnings?.transactions?.length ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-kp-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-kp-heading">{t("marketplace.noEarnings")}</h3>
          <p className="mt-1 text-sm text-kp-muted">{t("marketplace.earningsDescription")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-kp-muted uppercase tracking-wider">{t("marketplace.transactions")}</h3>
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
  const { t } = useTranslation();
  const styles: Record<string, string> = {
    free: "bg-kp-green/15 text-kp-green",
    org: "bg-kp-blue/15 text-kp-blue",
    subscription: "bg-kp-orange/15 text-kp-orange",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[model]}`}>
      {t(`accessModel.${model}`)}
    </span>
  );
}

// -- Main Marketplace page --

export default function Marketplace() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-kp-heading">{t("marketplace.title")}</h1>
        <p className="mt-1 text-sm text-kp-muted">{t("marketplace.subtitle")}</p>
      </div>

      <Tabs defaultValue="skills">
        <TabsList>
          <TabsTrigger value="skills">{t("marketplace.skillsTab")}</TabsTrigger>
          <TabsTrigger value="browse">{t("marketplace.browseTab")}</TabsTrigger>
          <TabsTrigger value="my-listings">{t("marketplace.myListingsTab")}</TabsTrigger>
          <TabsTrigger value="earnings">{t("marketplace.earningsTab")}</TabsTrigger>
        </TabsList>
        <TabsContent value="skills">
          <SkillsTab />
        </TabsContent>
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
