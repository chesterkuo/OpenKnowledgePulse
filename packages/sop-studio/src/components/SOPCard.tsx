import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

interface StoredSOP {
  id: string;
  sop: {
    "@context": string;
    "@type": string;
    id: string;
    name: string;
    domain: string;
    metadata: {
      created_at: string;
      agent_id: string;
      task_domain: string;
      success: boolean;
      quality_score: number;
      visibility: string;
      privacy_level: string;
    };
    source: { type: string; expert_id: string; credentials: string[] };
    decision_tree: Array<{ step: string; instruction: string }>;
  };
  version: number;
  status: "draft" | "pending_review" | "approved" | "rejected";
  visibility: string;
  approved_by?: string;
  created_at: string;
  updated_at: string;
}

function QualityScoreIndicator({ score }: { score: number }) {
  const percentage = Math.round(score * 100);
  let color = "text-kp-error";
  if (percentage >= 80) color = "text-kp-green";
  else if (percentage >= 60) color = "text-kp-orange";

  return <span className={`text-sm font-semibold ${color}`}>{percentage}%</span>;
}

interface SOPCardProps {
  sop: StoredSOP;
}

export default function SOPCard({ sop }: SOPCardProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const STATUS_STYLES: Record<StoredSOP["status"], { bg: string; text: string; label: string }> = {
    draft: { bg: "bg-kp-navy", text: "text-kp-muted", label: t("status.draft") },
    pending_review: {
      bg: "bg-kp-orange/15",
      text: "text-kp-orange",
      label: t("status.pending_review"),
    },
    approved: {
      bg: "bg-kp-green/15",
      text: "text-kp-green",
      label: t("status.approved"),
    },
    rejected: { bg: "bg-kp-error/15", text: "text-kp-error", label: t("status.rejected") },
  };

  const statusStyle = STATUS_STYLES[sop.status];

  return (
    <button
      type="button"
      onClick={() => navigate(`/editor/${sop.id}`)}
      className="bg-kp-panel rounded-lg border border-kp-border p-5 hover:border-kp-teal/50 hover:-translate-y-0.5 transition-all cursor-pointer text-left w-full"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-bold text-kp-heading truncate pr-3">{sop.sop.name}</h3>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${statusStyle.bg} ${statusStyle.text}`}
        >
          {statusStyle.label}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center text-sm">
          <span className="bg-kp-navy text-kp-teal text-xs font-mono px-2 py-0.5 rounded">
            {sop.sop.domain}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <span className="text-kp-muted">v{sop.version}</span>
            <div className="flex items-center space-x-1">
              <span className="text-kp-muted">{t("sopCard.quality")}</span>
              <QualityScoreIndicator score={sop.sop.metadata.quality_score} />
            </div>
          </div>
        </div>

        <div className="text-xs text-kp-muted/70 pt-1">
          {t("common.updated", { date: new Date(sop.updated_at).toLocaleDateString() })}
        </div>
      </div>
    </button>
  );
}

export type { StoredSOP };
