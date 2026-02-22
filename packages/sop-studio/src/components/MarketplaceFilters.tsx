import type { ChangeEvent } from "react";
import { useTranslation } from "react-i18next";

interface MarketplaceFiltersProps {
  query: string;
  domain: string;
  accessModel: string;
  onQueryChange: (query: string) => void;
  onDomainChange: (domain: string) => void;
  onAccessModelChange: (accessModel: string) => void;
}

export default function MarketplaceFilters({
  query,
  domain,
  accessModel,
  onQueryChange,
  onDomainChange,
  onAccessModelChange,
}: MarketplaceFiltersProps) {
  const { t } = useTranslation();

  const DOMAINS = [
    { value: "", label: t("domains.all") },
    { value: "general", label: t("domains.general") },
    { value: "finance", label: t("domains.finance") },
    { value: "medical", label: t("domains.medical") },
    { value: "engineering", label: t("domains.engineering") },
    { value: "legal", label: t("domains.legal") },
  ];

  const ACCESS_TABS = [
    { value: "", label: t("accessModel.all") },
    { value: "free", label: t("accessModel.free") },
    { value: "org", label: t("accessModel.org") },
    { value: "subscription", label: t("accessModel.subscription") },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder={t("marketplace.searchPlaceholder")}
            value={query}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onQueryChange(e.target.value)}
            className="w-full px-4 py-2 bg-kp-navy border border-kp-border text-kp-text placeholder:text-kp-muted focus:ring-2 focus:ring-kp-teal focus:border-kp-teal outline-none rounded-lg transition-colors"
          />
        </div>
        <div>
          <select
            value={domain}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => onDomainChange(e.target.value)}
            className="w-full sm:w-48 px-4 py-2 bg-kp-navy border border-kp-border text-kp-text focus:ring-2 focus:ring-kp-teal focus:border-kp-teal outline-none rounded-lg transition-colors"
          >
            {DOMAINS.map((d) => (
              <option key={d.value} value={d.value} className="text-kp-text">
                {d.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex space-x-1 border-b border-kp-border">
        {ACCESS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => onAccessModelChange(tab.value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              accessModel === tab.value
                ? "border-kp-teal text-kp-teal"
                : "border-transparent text-kp-muted hover:text-kp-text hover:border-kp-border"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
