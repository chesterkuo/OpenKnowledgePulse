import BrowserOnly from "@docusaurus/BrowserOnly";
import { useEffect, useState } from "react";

interface Skill {
  id: string;
  name: string;
  description: string;
  author?: string;
  tags: string[];
  content: string;
  quality_score: number;
}

const HEADINGS: Record<string, { title: string; link: string }> = {
  en: { title: "Featured Skills", link: "View all skills" },
  "zh-Hans": { title: "精选技能", link: "查看所有技能" },
  ja: { title: "注目のスキル", link: "すべてのスキルを見る" },
  ko: { title: "추천 스킬", link: "모든 스킬 보기" },
  es: { title: "Habilidades destacadas", link: "Ver todas las habilidades" },
};

function extractDomain(content: string): string {
  const match = content.match(/domain:\s*(\w+)/);
  return match ? match[1] : "general";
}

function getLocale(): string {
  if (typeof window === "undefined") return "en";
  const path = window.location.pathname;
  for (const locale of ["zh-Hans", "ja", "ko", "es"]) {
    if (path.startsWith(`/${locale}/`) || path === `/${locale}`) return locale;
  }
  return "en";
}

const sectionStyle: React.CSSProperties = {
  background: "var(--kp-dark)",
  padding: "4rem 1.5rem",
};

const containerStyle: React.CSSProperties = {
  maxWidth: 960,
  margin: "0 auto",
};

const titleStyle: React.CSSProperties = {
  fontFamily: "'Outfit', system-ui, sans-serif",
  fontWeight: 800,
  fontSize: "1.75rem",
  color: "var(--kp-heading)",
  textAlign: "center",
  marginBottom: "2.5rem",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "1.25rem",
};

const cardStyle: React.CSSProperties = {
  background: "var(--kp-panel)",
  border: "1px solid var(--kp-border)",
  borderRadius: 8,
  padding: "1.5rem",
  transition: "border-color 0.2s, transform 0.2s",
};

const badgeStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "2px 10px",
  borderRadius: 999,
  fontSize: "0.75rem",
  fontWeight: 600,
  background: "rgba(18, 181, 168, 0.15)",
  color: "var(--kp-teal)",
};

const domainStyle: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: "0.7rem",
  background: "var(--kp-navy)",
  color: "var(--kp-teal)",
  padding: "2px 8px",
  borderRadius: 4,
  display: "inline-block",
};

const tagStyle: React.CSSProperties = {
  fontSize: "0.7rem",
  background: "rgba(10, 26, 40, 0.6)",
  color: "var(--kp-muted)",
  padding: "2px 8px",
  borderRadius: 4,
  display: "inline-block",
};

const linkStyle: React.CSSProperties = {
  display: "block",
  textAlign: "center",
  marginTop: "2rem",
  color: "var(--kp-teal)",
  fontFamily: "'Outfit', system-ui, sans-serif",
  fontWeight: 600,
  fontSize: "1rem",
  textDecoration: "none",
};

function SkillCard({ skill }: { skill: Skill }) {
  const domain = extractDomain(skill.content);
  const qualityPct = Math.round(skill.quality_score * 100);
  const visibleTags = skill.tags.slice(0, 3);

  return (
    <div style={cardStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "0.75rem",
        }}
      >
        <div
          style={{
            fontFamily: "'Outfit', system-ui, sans-serif",
            fontWeight: 700,
            fontSize: "1rem",
            color: "var(--kp-heading)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            paddingRight: "0.75rem",
            flex: 1,
          }}
        >
          {skill.name}
        </div>
        <span style={badgeStyle}>{qualityPct}%</span>
      </div>
      <div
        style={{
          fontSize: "0.9rem",
          color: "var(--kp-text)",
          lineHeight: 1.5,
          marginBottom: "0.75rem",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {skill.description}
      </div>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
        <span style={domainStyle}>{domain}</span>
        {visibleTags.map((tag) => (
          <span key={tag} style={tagStyle}>
            {tag}
          </span>
        ))}
      </div>
      {skill.author && (
        <div style={{ fontSize: "0.75rem", color: "var(--kp-muted)", marginTop: "0.5rem" }}>
          {skill.author}
        </div>
      )}
    </div>
  );
}

function FeaturedSkillsInner(): JSX.Element | null {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [error, setError] = useState(false);
  const locale = getLocale();
  const heading = HEADINGS[locale] || HEADINGS.en;

  useEffect(() => {
    fetch("/v1/skills?limit=6&min_quality=0.6")
      .then((res) => {
        if (!res.ok) throw new Error("fetch failed");
        return res.json();
      })
      .then((json) => setSkills((json as { data: Skill[] }).data || []))
      .catch(() => setError(true));
  }, []);

  // Gracefully hide if API is unavailable or no skills
  if (error || skills.length === 0) return null;

  return (
    <section style={sectionStyle}>
      <div style={containerStyle}>
        <h2 style={titleStyle}>{heading.title}</h2>
        <div style={gridStyle}>
          {skills.map((skill) => (
            <SkillCard key={skill.id} skill={skill} />
          ))}
        </div>
        <a href="/studio/marketplace" style={linkStyle}>
          {heading.link} &rarr;
        </a>
      </div>
    </section>
  );
}

export default function FeaturedSkills(): JSX.Element {
  return <BrowserOnly fallback={<div />}>{() => <FeaturedSkillsInner />}</BrowserOnly>;
}
