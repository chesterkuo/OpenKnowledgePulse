import Link from "@docusaurus/Link";

const sectionStyle: React.CSSProperties = {
  background: "radial-gradient(ellipse at 50% 80%, #0C1A28 0%, #050D16 70%)",
  padding: "5rem 1.5rem",
  textAlign: "center",
};

const containerStyle: React.CSSProperties = {
  maxWidth: 600,
  margin: "0 auto",
};

const headingStyle: React.CSSProperties = {
  fontFamily: "'Outfit', system-ui, sans-serif",
  fontWeight: 800,
  fontSize: "2rem",
  color: "var(--kp-heading)",
  marginBottom: "0.75rem",
};

const subStyle: React.CSSProperties = {
  color: "var(--kp-muted)",
  fontSize: "1.1rem",
  marginBottom: "2rem",
};

const btnRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  gap: "1rem",
  flexWrap: "wrap",
};

const primaryBtnStyle: React.CSSProperties = {
  display: "inline-block",
  background: "var(--kp-teal)",
  color: "#fff",
  padding: "0.75rem 2rem",
  borderRadius: 8,
  fontWeight: 700,
  fontSize: "1rem",
  textDecoration: "none",
  border: "none",
};

const outlineBtnStyle: React.CSSProperties = {
  display: "inline-block",
  background: "transparent",
  color: "var(--kp-text)",
  padding: "0.75rem 2rem",
  borderRadius: 8,
  fontWeight: 700,
  fontSize: "1rem",
  textDecoration: "none",
  border: "1px solid var(--kp-border)",
};

export default function CTASection(): JSX.Element {
  return (
    <section style={sectionStyle}>
      <div style={containerStyle}>
        <h2 style={headingStyle}>Ready to share what you learn?</h2>
        <p style={subStyle}>Start capturing and sharing AI knowledge today.</p>
        <div style={btnRowStyle}>
          <Link to="/docs/getting-started/quickstart" style={primaryBtnStyle}>
            Get Started
          </Link>
          <a
            href="https://github.com/anthropics/knowledgepulse"
            target="_blank"
            rel="noopener noreferrer"
            style={outlineBtnStyle}
          >
            Star on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}
