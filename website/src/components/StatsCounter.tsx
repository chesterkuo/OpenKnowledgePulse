import BrowserOnly from "@docusaurus/BrowserOnly";
import { useEffect, useState } from "react";

const sectionStyle: React.CSSProperties = {
  background: "var(--kp-dark)",
  padding: "3rem 1.5rem",
};

const gridStyle: React.CSSProperties = {
  maxWidth: 900,
  margin: "0 auto",
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "1.25rem",
};

interface Stat {
  value: string;
  label: string;
  color: string;
}

function StatBox({ value, label, color }: Stat) {
  return (
    <div
      style={{
        background: "var(--kp-panel)",
        borderTop: `3px solid ${color}`,
        borderRadius: 8,
        padding: "1.5rem 1rem",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: "'Outfit', system-ui, sans-serif",
          fontWeight: 800,
          fontSize: "2rem",
          color: "var(--kp-heading)",
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "0.8rem",
          color: "var(--kp-muted)",
          marginTop: "0.25rem",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </div>
    </div>
  );
}

function StatsCounterInner(): JSX.Element {
  const [skillCount, setSkillCount] = useState<string>("--");

  useEffect(() => {
    fetch("/v1/skills?limit=1")
      .then((res) => {
        if (!res.ok) throw new Error("fetch failed");
        return res.json();
      })
      .then((json) => {
        const total = (json as { total: number }).total;
        setSkillCount(total.toLocaleString());
      })
      .catch(() => setSkillCount("30+"));
  }, []);

  const stats: Stat[] = [
    { value: skillCount, label: "Skills", color: "var(--kp-orange)" },
    { value: "6", label: "MCP Tools", color: "var(--kp-blue)" },
    { value: "5", label: "Protocol Layers", color: "var(--kp-green)" },
  ];

  return (
    <section style={sectionStyle}>
      <div style={gridStyle}>
        {stats.map((s) => (
          <StatBox key={s.label} {...s} />
        ))}
      </div>
    </section>
  );
}

export default function StatsCounter(): JSX.Element {
  return (
    <BrowserOnly
      fallback={
        <section style={sectionStyle}>
          <div style={gridStyle}>
            <StatBox value="--" label="Skills" color="var(--kp-orange)" />
            <StatBox value="6" label="MCP Tools" color="var(--kp-blue)" />
            <StatBox value="5" label="Protocol Layers" color="var(--kp-green)" />
          </div>
        </section>
      }
    >
      {() => <StatsCounterInner />}
    </BrowserOnly>
  );
}
