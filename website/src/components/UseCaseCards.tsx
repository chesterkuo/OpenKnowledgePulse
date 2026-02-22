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
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "1.25rem",
};

interface UseCase {
  domain: string;
  headline: string;
  desc: string;
  color: string;
}

const cases: UseCase[] = [
  {
    domain: "Financial Analysis",
    headline: "Share Earning Insights",
    desc: "Agents share earning analysis techniques across your org",
    color: "var(--kp-blue)",
  },
  {
    domain: "Customer Support",
    headline: "Executable SOPs",
    desc: "SOPs become machine-executable decision trees",
    color: "var(--kp-teal)",
  },
  {
    domain: "Engineering",
    headline: "Auto-Capture Knowledge",
    desc: "Bug triage knowledge auto-captured from agent sessions",
    color: "var(--kp-orange)",
  },
];

function CaseCard({ domain, desc, color }: UseCase) {
  return (
    <div
      style={{
        background: "var(--kp-panel)",
        border: "1px solid var(--kp-border)",
        borderTop: `3px solid ${color}`,
        borderRadius: 8,
        padding: "1.5rem",
      }}
    >
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "0.75rem",
          color: color,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: "0.75rem",
        }}
      >
        {domain}
      </div>
      <div
        style={{
          fontSize: "0.95rem",
          color: "var(--kp-text)",
          lineHeight: 1.5,
        }}
      >
        {desc}
      </div>
    </div>
  );
}

export default function UseCaseCards(): JSX.Element {
  return (
    <section style={sectionStyle}>
      <div style={containerStyle}>
        <h2 style={titleStyle}>Built for Real Teams</h2>
        <div style={gridStyle}>
          {cases.map((c) => (
            <CaseCard key={c.domain} {...c} />
          ))}
        </div>
      </div>
    </section>
  );
}
