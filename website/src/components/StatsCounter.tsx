const sectionStyle: React.CSSProperties = {
  background: "var(--kp-dark)",
  padding: "3rem 1.5rem",
};

const gridStyle: React.CSSProperties = {
  maxWidth: 900,
  margin: "0 auto",
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: "1.25rem",
};

interface Stat {
  value: string;
  label: string;
  color: string;
}

const stats: Stat[] = [
  { value: "639", label: "Tests", color: "var(--kp-teal)" },
  { value: "6", label: "MCP Tools", color: "var(--kp-blue)" },
  { value: "200K+", label: "Skills", color: "var(--kp-orange)" },
  { value: "5", label: "Protocol Layers", color: "var(--kp-green)" },
];

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

export default function StatsCounter(): JSX.Element {
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
