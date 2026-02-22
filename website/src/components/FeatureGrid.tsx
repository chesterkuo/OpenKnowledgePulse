const sectionStyle: React.CSSProperties = {
  background: "var(--kp-navy)",
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

interface Feature {
  icon: string;
  title: string;
  desc: string;
  color: string;
}

const features: Feature[] = [
  {
    icon: "\u{1F50D}",
    title: "Skill Registry",
    desc: "Semantic + BM25 hybrid search, one-click install",
    color: "var(--kp-blue)",
  },
  {
    icon: "\u{1F4F7}",
    title: "Knowledge Capture",
    desc: "Auto-extract reasoning traces from agent sessions",
    color: "var(--kp-teal)",
  },
  {
    icon: "\u{2B07}\uFE0F",
    title: "Knowledge Retrieval",
    desc: "Few-shot injection with quality scoring",
    color: "var(--kp-green)",
  },
  {
    icon: "\u{1F333}",
    title: "Expert SOP Studio",
    desc: "Visual decision tree editor for expert workflows",
    color: "var(--kp-orange)",
  },
  {
    icon: "\u{1F3EA}",
    title: "Knowledge Marketplace",
    desc: "Free and subscription-based knowledge exchange",
    color: "var(--kp-blue)",
  },
  {
    icon: "\u{1F6E1}\uFE0F",
    title: "KP-REP Reputation",
    desc: "Soulbound verifiable credentials for contributors",
    color: "var(--kp-teal)",
  },
];

function FeatureCard({ icon, title, desc, color }: Feature) {
  return (
    <div
      style={{
        background: "var(--kp-panel)",
        border: "1px solid var(--kp-border)",
        borderLeft: `4px solid ${color}`,
        borderRadius: 8,
        padding: "1.5rem",
      }}
    >
      <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>{icon}</div>
      <div
        style={{
          fontFamily: "'Outfit', system-ui, sans-serif",
          fontWeight: 700,
          fontSize: "1.05rem",
          color: "var(--kp-heading)",
          marginBottom: "0.4rem",
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: "0.9rem",
          color: "var(--kp-muted)",
          lineHeight: 1.5,
        }}
      >
        {desc}
      </div>
    </div>
  );
}

export default function FeatureGrid(): JSX.Element {
  return (
    <section style={sectionStyle}>
      <div style={containerStyle}>
        <h2 style={titleStyle}>Everything You Need</h2>
        <div style={gridStyle}>
          {features.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </div>
    </section>
  );
}
