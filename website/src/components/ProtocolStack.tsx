const sectionStyle: React.CSSProperties = {
  background: "var(--kp-dark)",
  padding: "4rem 1.5rem",
};

const containerStyle: React.CSSProperties = {
  maxWidth: 700,
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

interface Layer {
  num: number;
  name: string;
  color: string;
  highlight?: boolean;
}

const layers: Layer[] = [
  { num: 5, name: "Marketplace & Reputation", color: "var(--kp-orange)" },
  { num: 4, name: "Expert SOPs", color: "var(--kp-blue)" },
  { num: 3, name: "Knowledge Capture", color: "var(--kp-teal)" },
  { num: 2, name: "SKILL.md \u2014 Knowledge Units", color: "var(--kp-orange)", highlight: true },
  { num: 1, name: "Storage + Transport", color: "var(--kp-green)" },
];

function LayerBar({ num, name, color, highlight }: Layer) {
  return (
    <div
      style={{
        background: highlight ? "rgba(224,122,32,0.08)" : "var(--kp-panel)",
        borderLeft: `4px solid ${color}`,
        borderRadius: 6,
        padding: "0.9rem 1.25rem",
        marginBottom: "0.5rem",
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        border: highlight
          ? `1px solid rgba(224,122,32,0.25)`
          : `1px solid var(--kp-border)`,
        borderLeftWidth: 4,
        borderLeftStyle: "solid",
        borderLeftColor: color,
      }}
    >
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 500,
          fontSize: "0.85rem",
          color: color,
          minWidth: 60,
        }}
      >
        Layer {num}
      </span>
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "0.9rem",
          color: highlight ? "var(--kp-heading)" : "var(--kp-text)",
          fontWeight: highlight ? 600 : 400,
        }}
      >
        {name}
      </span>
    </div>
  );
}

export default function ProtocolStack(): JSX.Element {
  return (
    <section style={sectionStyle}>
      <div style={containerStyle}>
        <h2 style={titleStyle}>5-Layer Protocol Architecture</h2>
        {layers.map((l) => (
          <LayerBar key={l.num} {...l} />
        ))}
      </div>
    </section>
  );
}
