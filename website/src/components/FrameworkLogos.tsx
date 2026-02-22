const sectionStyle: React.CSSProperties = {
  background: "var(--kp-navy)",
  padding: "4rem 1.5rem",
};

const containerStyle: React.CSSProperties = {
  maxWidth: 900,
  margin: "0 auto",
};

const titleStyle: React.CSSProperties = {
  fontFamily: "'Outfit', system-ui, sans-serif",
  fontWeight: 800,
  fontSize: "1.75rem",
  color: "var(--kp-heading)",
  textAlign: "center",
  marginBottom: "2rem",
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "center",
  gap: "0.75rem",
};

interface Framework {
  name: string;
  priority: "P0" | "P1" | "P2";
}

const frameworks: Framework[] = [
  { name: "Claude Code", priority: "P0" },
  { name: "Codex CLI", priority: "P0" },
  { name: "OpenClaw", priority: "P0" },
  { name: "LangGraph", priority: "P1" },
  { name: "CrewAI", priority: "P1" },
  { name: "AutoGen", priority: "P2" },
  { name: "Flowise", priority: "P2" },
];

function priorityColor(p: string): string {
  if (p === "P0") return "var(--kp-teal)";
  if (p === "P1") return "var(--kp-blue)";
  return "var(--kp-muted)";
}

function Pill({ name, priority }: Framework) {
  return (
    <div
      style={{
        background: "var(--kp-panel)",
        border: "1px solid var(--kp-border)",
        borderRadius: 20,
        padding: "0.5rem 1.25rem",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
      }}
    >
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "0.88rem",
          color: "var(--kp-text)",
        }}
      >
        {name}
      </span>
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "0.65rem",
          color: priorityColor(priority),
          fontWeight: 600,
        }}
      >
        {priority}
      </span>
    </div>
  );
}

export default function FrameworkLogos(): JSX.Element {
  return (
    <section style={sectionStyle}>
      <div style={containerStyle}>
        <h2 style={titleStyle}>Works With Your Stack</h2>
        <div style={rowStyle}>
          {frameworks.map((f) => (
            <Pill key={f.name} {...f} />
          ))}
        </div>
      </div>
    </section>
  );
}
