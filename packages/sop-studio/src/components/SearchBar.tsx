import type { ChangeEvent } from "react";

const DOMAINS = [
  { value: "", label: "All Domains" },
  { value: "general", label: "General" },
  { value: "finance", label: "Finance" },
  { value: "medical", label: "Medical" },
  { value: "engineering", label: "Engineering" },
  { value: "legal", label: "Legal" },
];

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "pending_review", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
] as const;

interface SearchBarProps {
  query: string;
  domain: string;
  status: string;
  onQueryChange: (query: string) => void;
  onDomainChange: (domain: string) => void;
  onStatusChange: (status: string) => void;
}

export default function SearchBar({
  query,
  domain,
  status,
  onQueryChange,
  onDomainChange,
  onStatusChange,
}: SearchBarProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search SOPs..."
            value={query}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onQueryChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
          />
        </div>
        <div>
          <select
            value={domain}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => onDomainChange(e.target.value)}
            className="w-full sm:w-48 px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
          >
            {DOMAINS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex space-x-1 border-b border-gray-200">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => onStatusChange(tab.value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              status === tab.value
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
