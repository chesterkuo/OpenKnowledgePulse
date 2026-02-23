import { useTranslation } from "react-i18next";

export interface StoredSkill {
  id: string;
  name: string;
  description: string;
  version?: string;
  author?: string;
  tags: string[];
  content: string;
  visibility: string;
  quality_score: number;
  created_at: string;
  updated_at: string;
}

export function extractDomain(content: string): string {
  const match = content.match(/domain:\s*(\w+)/);
  return match ? match[1] : "general";
}

interface SkillCardProps {
  skill: StoredSkill;
  onClick: (skill: StoredSkill) => void;
}

export default function SkillCard({ skill, onClick }: SkillCardProps) {
  const { t } = useTranslation();
  const domain = extractDomain(skill.content);
  const qualityPct = Math.round(skill.quality_score * 100);
  const visibleTags = skill.tags.slice(0, 3);
  const overflowCount = skill.tags.length - 3;

  return (
    <button
      type="button"
      onClick={() => onClick(skill)}
      className="bg-kp-panel rounded-lg border border-kp-border p-5 hover:border-kp-teal/50 hover:-translate-y-0.5 transition-all cursor-pointer text-left w-full"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-kp-heading truncate pr-3">
          {skill.name}
        </h3>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap bg-kp-teal/15 text-kp-teal">
          {qualityPct}%
        </span>
      </div>

      <p className="text-sm text-kp-text line-clamp-2 mb-3">{skill.description}</p>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="bg-kp-navy text-kp-teal text-xs font-mono px-2 py-0.5 rounded">
            {domain}
          </span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-kp-green/15 text-kp-green">
            {t("marketplace.freeToUse")}
          </span>
        </div>

        {skill.author && (
          <p className="text-xs text-kp-muted truncate">{skill.author}</p>
        )}

        {visibleTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {visibleTags.map((tag) => (
              <span
                key={tag}
                className="bg-kp-navy/60 text-kp-muted text-xs px-2 py-0.5 rounded"
              >
                {tag}
              </span>
            ))}
            {overflowCount > 0 && (
              <span className="text-kp-muted text-xs px-1 py-0.5">
                +{overflowCount}
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}
