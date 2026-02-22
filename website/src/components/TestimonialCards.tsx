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

interface Testimonial {
  initials: string;
  color: string;
  quote: string;
  name: string;
  role: string;
}

const testimonials: Testimonial[] = [
  {
    initials: "AK",
    color: "var(--kp-teal)",
    quote:
      "KnowledgePulse transformed how our AI agents share knowledge across the team.",
    name: "Alex Kim",
    role: "ML Engineer",
  },
  {
    initials: "SR",
    color: "var(--kp-blue)",
    quote:
      "The SOP Studio lets us capture expert processes that were previously undocumented.",
    name: "Sarah Rodriguez",
    role: "Operations Lead",
  },
  {
    initials: "JC",
    color: "var(--kp-orange)",
    quote:
      "Finally, a knowledge protocol that works across different AI frameworks.",
    name: "James Chen",
    role: "AI Architect",
  },
];

function Card({ initials, color, quote, name, role }: Testimonial) {
  return (
    <div
      style={{
        background: "var(--kp-panel)",
        border: "1px solid var(--kp-border)",
        borderRadius: 8,
        padding: "1.5rem",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Outfit', system-ui, sans-serif",
          fontWeight: 700,
          fontSize: "0.9rem",
          color: "#fff",
          marginBottom: "1rem",
        }}
      >
        {initials}
      </div>
      <p
        style={{
          fontStyle: "italic",
          color: "var(--kp-text)",
          fontSize: "0.95rem",
          lineHeight: 1.6,
          margin: "0 0 1rem",
        }}
      >
        &ldquo;{quote}&rdquo;
      </p>
      <div>
        <div
          style={{
            fontWeight: 600,
            color: "var(--kp-heading)",
            fontSize: "0.9rem",
          }}
        >
          {name}
        </div>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "0.75rem",
            color: "var(--kp-muted)",
          }}
        >
          {role}
        </div>
      </div>
    </div>
  );
}

export default function TestimonialCards(): JSX.Element {
  return (
    <section style={sectionStyle}>
      <div style={containerStyle}>
        <h2 style={titleStyle}>What People Say</h2>
        <div style={gridStyle}>
          {testimonials.map((t) => (
            <Card key={t.initials} {...t} />
          ))}
        </div>
      </div>
    </section>
  );
}
