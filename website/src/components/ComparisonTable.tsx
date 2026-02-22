const sectionStyle: React.CSSProperties = {
  background: "var(--kp-navy)",
  padding: "4rem 1.5rem",
};

const containerStyle: React.CSSProperties = {
  maxWidth: 800,
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

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  background: "var(--kp-panel)",
  border: "1px solid var(--kp-border)",
  borderRadius: 8,
  overflow: "hidden",
};

const thStyle: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: "0.8rem",
  color: "var(--kp-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  padding: "0.75rem 0.6rem",
  borderBottom: "1px solid var(--kp-border)",
  textAlign: "center",
  fontWeight: 500,
};

const thFeatureStyle: React.CSSProperties = {
  ...thStyle,
  textAlign: "left",
  paddingLeft: "1rem",
};

const tdStyle: React.CSSProperties = {
  padding: "0.6rem",
  borderBottom: "1px solid var(--kp-border)",
  textAlign: "center",
  fontSize: "0.95rem",
};

const tdFeatureStyle: React.CSSProperties = {
  ...tdStyle,
  textAlign: "left",
  paddingLeft: "1rem",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: "0.85rem",
  color: "var(--kp-text)",
};

type Mark = "yes" | "no" | "partial";

function Cell({ mark }: { mark: Mark }) {
  if (mark === "yes") {
    return <span style={{ color: "var(--kp-teal)", fontWeight: 700 }}>{"\u2713"}</span>;
  }
  if (mark === "partial") {
    return <span style={{ color: "var(--kp-orange)", fontWeight: 700 }}>~</span>;
  }
  return <span style={{ color: "var(--kp-muted)" }}>{"\u2717"}</span>;
}

interface Row {
  feature: string;
  kp: Mark;
  skills: Mark;
  langchain: Mark;
  mem0: Mark;
}

const rows: Row[] = [
  { feature: "SKILL.md Compatible", kp: "yes", skills: "yes", langchain: "no", mem0: "no" },
  { feature: "Dynamic Knowledge", kp: "yes", skills: "no", langchain: "no", mem0: "no" },
  { feature: "MCP Server", kp: "yes", skills: "no", langchain: "no", mem0: "no" },
  { feature: "Cross-Framework", kp: "yes", skills: "partial", langchain: "partial", mem0: "yes" },
  { feature: "Quality Scoring", kp: "yes", skills: "no", langchain: "no", mem0: "no" },
  { feature: "Reputation System", kp: "yes", skills: "no", langchain: "no", mem0: "no" },
  { feature: "Expert SOPs", kp: "yes", skills: "no", langchain: "no", mem0: "no" },
  { feature: "Self-Hostable", kp: "yes", skills: "no", langchain: "no", mem0: "yes" },
];

export default function ComparisonTable(): JSX.Element {
  return (
    <section style={sectionStyle}>
      <div style={containerStyle}>
        <h2 style={titleStyle}>How We Compare</h2>
        <div style={{ borderRadius: 8, overflow: "hidden" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thFeatureStyle}>Feature</th>
                <th style={{ ...thStyle, color: "var(--kp-teal)" }}>KnowledgePulse</th>
                <th style={thStyle}>SkillsMP</th>
                <th style={thStyle}>LangChain Hub</th>
                <th style={thStyle}>Mem0</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.feature}>
                  <td style={tdFeatureStyle}>{r.feature}</td>
                  <td style={tdStyle}><Cell mark={r.kp} /></td>
                  <td style={tdStyle}><Cell mark={r.skills} /></td>
                  <td style={tdStyle}><Cell mark={r.langchain} /></td>
                  <td style={tdStyle}><Cell mark={r.mem0} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
