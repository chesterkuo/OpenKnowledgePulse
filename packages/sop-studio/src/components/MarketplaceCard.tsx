export interface MarketplaceListing {
  id: string;
  knowledge_unit_id: string;
  contributor_id: string;
  price_credits: number;
  access_model: "free" | "org" | "subscription";
  domain: string;
  title: string;
  description: string;
  purchases: number;
  created_at: string;
  updated_at: string;
}

const ACCESS_STYLES: Record<
  MarketplaceListing["access_model"],
  { bg: string; text: string; label: string }
> = {
  free: { bg: "bg-kp-green/15", text: "text-kp-green", label: "Free" },
  org: { bg: "bg-kp-blue/15", text: "text-kp-blue", label: "Org" },
  subscription: { bg: "bg-kp-orange/15", text: "text-kp-orange", label: "Subscription" },
};

interface MarketplaceCardProps {
  listing: MarketplaceListing;
  onClick: (listing: MarketplaceListing) => void;
}

export default function MarketplaceCard({ listing, onClick }: MarketplaceCardProps) {
  const style = ACCESS_STYLES[listing.access_model];

  return (
    <button
      type="button"
      onClick={() => onClick(listing)}
      className="bg-kp-panel rounded-lg border border-kp-border p-5 hover:border-kp-teal/50 hover:-translate-y-0.5 transition-all cursor-pointer text-left w-full"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-kp-heading truncate pr-3">
          {listing.title}
        </h3>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${style.bg} ${style.text}`}
        >
          {style.label}
        </span>
      </div>

      <p className="text-sm text-kp-text line-clamp-2 mb-3">{listing.description}</p>

      <div className="space-y-2">
        <div className="flex items-center text-sm">
          <span className="bg-kp-navy text-kp-teal text-xs font-mono px-2 py-0.5 rounded">
            {listing.domain}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-kp-teal font-mono font-semibold">
            {listing.price_credits === 0 ? "Free" : `${listing.price_credits} credits`}
          </span>
          <span className="text-kp-muted text-xs">
            {listing.purchases} purchase{listing.purchases !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="text-xs text-kp-muted/70 pt-1">
          Listed {new Date(listing.created_at).toLocaleDateString()}
        </div>
      </div>
    </button>
  );
}
