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

const STATUS_STYLES: Record<
  StoredSOP["status"],
  { bg: string; text: string; label: string }
> = {
  draft: { bg: "bg-gray-100", text: "text-gray-700", label: "Draft" },
  pending_review: {
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    label: "Pending Review",
  },
  approved: {
    bg: "bg-green-100",
    text: "text-green-800",
    label: "Approved",
  },
  rejected: { bg: "bg-red-100", text: "text-red-800", label: "Rejected" },
};

function QualityScoreIndicator({ score }: { score: number }) {
  const percentage = Math.round(score * 100);
  let color = "text-red-600";
  if (percentage >= 80) color = "text-green-600";
  else if (percentage >= 60) color = "text-yellow-600";

  return (
    <span className={`text-sm font-semibold ${color}`}>{percentage}%</span>
  );
}

interface SOPCardProps {
  sop: StoredSOP;
}

export default function SOPCard({ sop }: SOPCardProps) {
  const navigate = useNavigate();
  const statusStyle = STATUS_STYLES[sop.status];

  return (
    <button
      type="button"
      onClick={() => navigate(`/editor/${sop.id}`)}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer text-left w-full"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900 truncate pr-3">
          {sop.sop.name}
        </h3>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${statusStyle.bg} ${statusStyle.text}`}
        >
          {statusStyle.label}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center text-sm text-gray-500">
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-xs font-medium">
            {sop.sop.domain}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <span className="text-gray-500">
              v{sop.version}
            </span>
            <div className="flex items-center space-x-1">
              <span className="text-gray-500">Quality:</span>
              <QualityScoreIndicator
                score={sop.sop.metadata.quality_score}
              />
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-400 pt-1">
          Updated {new Date(sop.updated_at).toLocaleDateString()}
        </div>
      </div>
    </button>
  );
}

export type { StoredSOP };
