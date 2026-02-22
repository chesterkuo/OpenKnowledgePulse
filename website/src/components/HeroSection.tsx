import Link from "@docusaurus/Link";
import useBaseUrl from "@docusaurus/useBaseUrl";

const sectionStyle: React.CSSProperties = {
  background: "radial-gradient(ellipse at 50% 20%, #0C1A28 0%, #050D16 70%)",
  padding: "5rem 1.5rem 4rem",
  textAlign: "center",
  overflow: "hidden",
};

const containerStyle: React.CSSProperties = {
  maxWidth: 900,
  margin: "0 auto",
};

const octoStyle: React.CSSProperties = {
  width: 160,
  height: 160,
  marginBottom: "1.5rem",
  filter: "drop-shadow(0 0 40px rgba(18,181,168,0.3))",
};

const titleStyle: React.CSSProperties = {
  fontFamily: "'Outfit', system-ui, sans-serif",
  fontWeight: 900,
  fontSize: "3.5rem",
  color: "var(--kp-heading)",
  letterSpacing: "0.04em",
  margin: "0 0 0.5rem",
  lineHeight: 1.1,
};

const subtitleStyle: React.CSSProperties = {
  color: "var(--kp-muted)",
  fontSize: "1.25rem",
  fontWeight: 400,
  margin: "0 0 2rem",
};

const badgeRowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "center",
  gap: "0.5rem",
  marginBottom: "2.5rem",
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
  transition: "opacity 0.2s",
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
  transition: "border-color 0.2s",
};

const badges = [
  { alt: "License", src: "https://img.shields.io/badge/license-Apache_2.0-blue?style=flat-square" },
  { alt: "Runtime", src: "https://img.shields.io/badge/runtime-Bun-f472b6?style=flat-square" },
  { alt: "MCP", src: "https://img.shields.io/badge/MCP-6_tools-12B5A8?style=flat-square" },
  { alt: "SKILL.md", src: "https://img.shields.io/badge/SKILL.md-v1.0-E07A20?style=flat-square" },
  { alt: "Tests", src: "https://img.shields.io/badge/tests-639-18A06A?style=flat-square" },
];

export default function HeroSection(): JSX.Element {
  const octoSrc = useBaseUrl("/img/octo-hero.svg");

  return (
    <section style={sectionStyle}>
      <div style={containerStyle}>
        <img src={octoSrc} alt="KnowledgePulse Octo" style={octoStyle} />
        <h1 style={titleStyle}>KNOWLEDGEPULSE</h1>
        <p style={subtitleStyle}>Open AI Knowledge Sharing Protocol</p>
        <div style={badgeRowStyle}>
          {badges.map((b) => (
            <img key={b.alt} src={b.src} alt={b.alt} height={22} />
          ))}
        </div>
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
            View on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}
