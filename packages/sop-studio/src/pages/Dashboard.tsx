import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import SOPCard from "../components/SOPCard";
import type { StoredSOP } from "../components/SOPCard";
import SearchBar from "../components/SearchBar";
import { api } from "../lib/api";

interface SOPListResponse {
  data: StoredSOP[];
  total: number;
  offset: number;
  limit: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [sops, setSOPs] = useState<StoredSOP[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState("");
  const [status, setStatus] = useState("");

  const fetchSOPs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (query) params.q = query;
      if (domain) params.domain = domain;
      if (status) params.status = status;

      const result = (await api.searchSOPs(params)) as SOPListResponse;
      setSOPs(result.data);
      setTotal(result.total);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch SOPs";
      setError(message);
      setSOPs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [query, domain, status]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSOPs();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchSOPs]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-kp-heading">Dashboard</h1>
          <p className="mt-1 text-sm text-kp-muted">
            {loading ? "Loading SOPs..." : `${total} SOP${total !== 1 ? "s" : ""} found`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/editor/new")}
          className="inline-flex items-center px-4 py-2 bg-kp-teal text-white text-sm font-medium rounded-lg hover:bg-kp-teal/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-kp-teal transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New SOP
        </button>
      </div>

      <SearchBar
        query={query}
        domain={domain}
        status={status}
        onQueryChange={setQuery}
        onDomainChange={setDomain}
        onStatusChange={setStatus}
      />

      {error && (
        <div className="bg-kp-error/10 border border-kp-error/30 rounded-lg p-4">
          <div className="flex">
            <svg
              className="w-5 h-5 text-kp-error mr-2 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="text-sm text-kp-error">{error}</p>
              <button
                type="button"
                onClick={fetchSOPs}
                className="mt-1 text-sm text-kp-error/80 underline hover:text-kp-error"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-kp-panel rounded-lg border border-kp-border p-5 animate-pulse"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="h-5 bg-kp-navy rounded w-3/4" />
                <div className="h-5 bg-kp-navy rounded-full w-16" />
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-kp-navy rounded w-20" />
                <div className="h-4 bg-kp-navy rounded w-32" />
                <div className="h-3 bg-kp-navy rounded w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : sops.length === 0 ? (
        <div className="text-center py-16">
          <svg
            className="mx-auto h-12 w-12 text-kp-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-kp-heading">No SOPs found</h3>
          <p className="mt-1 text-sm text-kp-muted">
            {query || domain || status
              ? "Try adjusting your search filters."
              : "Get started by creating your first SOP."}
          </p>
          {!query && !domain && !status && (
            <button
              type="button"
              onClick={() => navigate("/editor/new")}
              className="mt-4 inline-flex items-center px-4 py-2 bg-kp-teal text-white text-sm font-medium rounded-lg hover:bg-kp-teal/90 transition-colors"
            >
              Create SOP
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sops.map((sop) => (
            <SOPCard key={sop.id} sop={sop} />
          ))}
        </div>
      )}
    </div>
  );
}
