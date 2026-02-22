const sectionStyle: React.CSSProperties = {
  background: "var(--kp-navy)",
  padding: "4rem 1.5rem",
};

const panelStyle: React.CSSProperties = {
  maxWidth: 600,
  margin: "0 auto",
  background: "var(--kp-panel)",
  borderLeft: "4px solid var(--kp-teal)",
  border: "1px solid var(--kp-border)",
  borderLeftWidth: 4,
  borderLeftColor: "var(--kp-teal)",
  borderRadius: 8,
  padding: "2rem 2.5rem",
  textAlign: "center",
};

const lineStyle: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: "0.95rem",
  color: "var(--kp-text)",
  lineHeight: 1.8,
  margin: 0,
};

const accentStyle: React.CSSProperties = {
  color: "var(--kp-teal)",
  fontWeight: 600,
};

const mutedStyle: React.CSSProperties = {
  color: "var(--kp-muted)",
};

export default function EcosystemNote(): JSX.Element {
  return (
    <section style={sectionStyle}>
      <div style={panelStyle}>
        <p style={lineStyle}>
          <span style={accentStyle}>OpenClaw</span> <span style={mutedStyle}>&mdash;</span> Lobster.
          Strong claws, executes tasks.
        </p>
        <p style={lineStyle}>
          <span style={accentStyle}>KnowledgePulse</span> <span style={mutedStyle}>&mdash;</span>{" "}
          Octo. 8 arms, shares intelligence.
        </p>
        <p
          style={{
            ...lineStyle,
            marginTop: "0.75rem",
            fontWeight: 600,
            color: "var(--kp-heading)",
          }}
        >
          Lobster acts. Octo learns.
        </p>
      </div>
    </section>
  );
}
