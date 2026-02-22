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

const codeBlockStyle: React.CSSProperties = {
  background: "var(--kp-panel)",
  border: "1px solid var(--kp-border)",
  borderRadius: 8,
  padding: "1.5rem 2rem",
  overflow: "auto",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: "0.88rem",
  lineHeight: 1.7,
  color: "var(--kp-text)",
};

function Comment({ text }: { text: string }) {
  return <span style={{ color: "var(--kp-muted)" }}>{text}</span>;
}

function Keyword({ text }: { text: string }) {
  return <span style={{ color: "var(--kp-teal)" }}>{text}</span>;
}

function Str({ text }: { text: string }) {
  return <span style={{ color: "var(--kp-orange)" }}>{text}</span>;
}

function Fn({ text }: { text: string }) {
  return <span style={{ color: "var(--kp-cyan)" }}>{text}</span>;
}

export default function CodeExample(): JSX.Element {
  return (
    <section style={sectionStyle}>
      <div style={containerStyle}>
        <h2 style={titleStyle}>Get Started in Minutes</h2>
        <pre style={codeBlockStyle}>
          <code>
            <Comment text="# Install" />
            {"\n"}
            bun add <Str text="@knowledgepulse/sdk" />
            {"\n\n"}
            <Comment text="# Capture knowledge in 3 lines" />
            {"\n"}
            <Keyword text="import" /> {"{ "}
            <Fn text="KPCapture" />
            {" }"} <Keyword text="from" /> <Str text={'"@knowledgepulse/sdk"'} />;{"\n"}
            <Keyword text="const" /> capture = <Keyword text="new" /> <Fn text="KPCapture" />
            {"({ domain: "}
            <Str text={'"analysis"'} />
            {" })"};{"\n"}
            <Keyword text="const" /> unit = <Keyword text="await" /> capture.
            <Fn text="extract" />
            (agentTrace);
          </code>
        </pre>
      </div>
    </section>
  );
}
