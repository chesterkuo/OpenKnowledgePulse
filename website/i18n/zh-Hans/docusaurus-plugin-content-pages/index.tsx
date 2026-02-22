import Link from "@docusaurus/Link";
import useBaseUrl from "@docusaurus/useBaseUrl";
import Layout from "@theme/Layout";

/* ==========================================================================
   Chinese Landing Page — mirrors all 12 sections of the English version
   with translated text.  Styles are inlined to match the English components.
   ========================================================================== */

/* ---------- shared style helpers ---------- */

const outfit = "'Outfit', system-ui, sans-serif";
const mono = "'JetBrains Mono', monospace";

/* ============================== 1. HERO ================================= */

function HeroSection(): JSX.Element {
  const octoSrc = useBaseUrl("/img/octo-hero.svg");

  return (
    <section
      style={{
        background:
          "radial-gradient(ellipse at 50% 20%, #0C1A28 0%, #050D16 70%)",
        padding: "5rem 1.5rem 4rem",
        textAlign: "center",
        overflow: "hidden",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <img
          src={octoSrc}
          alt="KnowledgePulse Octo"
          style={{
            width: 160,
            height: 160,
            marginBottom: "1.5rem",
            filter: "drop-shadow(0 0 40px rgba(18,181,168,0.3))",
          }}
        />
        <h1
          style={{
            fontFamily: outfit,
            fontWeight: 900,
            fontSize: "3.5rem",
            color: "var(--kp-heading)",
            letterSpacing: "0.04em",
            margin: "0 0 0.5rem",
            lineHeight: 1.1,
          }}
        >
          KNOWLEDGEPULSE
        </h1>
        <p
          style={{
            color: "var(--kp-muted)",
            fontSize: "1.25rem",
            fontWeight: 400,
            margin: "0 0 2rem",
          }}
        >
          开放式 AI 知识共享协议
        </p>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "0.5rem",
            marginBottom: "2.5rem",
          }}
        >
          {[
            {
              alt: "License",
              src: "https://img.shields.io/badge/license-Apache_2.0-blue?style=flat-square",
            },
            {
              alt: "Runtime",
              src: "https://img.shields.io/badge/runtime-Bun-f472b6?style=flat-square",
            },
            {
              alt: "MCP",
              src: "https://img.shields.io/badge/MCP-6_tools-12B5A8?style=flat-square",
            },
            {
              alt: "SKILL.md",
              src: "https://img.shields.io/badge/SKILL.md-v1.0-E07A20?style=flat-square",
            },
            {
              alt: "Tests",
              src: "https://img.shields.io/badge/tests-639-18A06A?style=flat-square",
            },
          ].map((b) => (
            <img key={b.alt} src={b.src} alt={b.alt} height={22} />
          ))}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <Link
            to="/zh-Hans/docs/getting-started/quickstart"
            style={{
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
            }}
          >
            快速入门
          </Link>
          <a
            href="https://github.com/anthropics/knowledgepulse"
            target="_blank"
            rel="noopener noreferrer"
            style={{
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
            }}
          >
            在 GitHub 上查看
          </a>
        </div>
      </div>
    </section>
  );
}

/* ============================== 2. STATS ================================ */

interface Stat {
  value: string;
  label: string;
  color: string;
}

const stats: Stat[] = [
  { value: "639", label: "测试", color: "var(--kp-teal)" },
  { value: "6", label: "MCP 工具", color: "var(--kp-blue)" },
  { value: "200K+", label: "技能", color: "var(--kp-orange)" },
  { value: "5", label: "协议层", color: "var(--kp-green)" },
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
          fontFamily: outfit,
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
          fontFamily: mono,
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

function StatsCounter(): JSX.Element {
  return (
    <section style={{ background: "var(--kp-dark)", padding: "3rem 1.5rem" }}>
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "1.25rem",
        }}
      >
        {stats.map((s) => (
          <StatBox key={s.label} {...s} />
        ))}
      </div>
    </section>
  );
}

/* =========================== 3. PROTOCOL STACK ========================== */

interface Layer {
  num: number;
  name: string;
  color: string;
  highlight?: boolean;
}

const layers: Layer[] = [
  { num: 5, name: "市场与声誉", color: "var(--kp-orange)" },
  { num: 4, name: "专家 SOP", color: "var(--kp-blue)" },
  { num: 3, name: "知识捕获", color: "var(--kp-teal)" },
  {
    num: 2,
    name: "SKILL.md \u2014 知识单元",
    color: "var(--kp-orange)",
    highlight: true,
  },
  { num: 1, name: "存储 + 传输", color: "var(--kp-green)" },
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
          ? "1px solid rgba(224,122,32,0.25)"
          : "1px solid var(--kp-border)",
        borderLeftWidth: 4,
        borderLeftStyle: "solid",
        borderLeftColor: color,
      }}
    >
      <span
        style={{
          fontFamily: mono,
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
          fontFamily: mono,
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

function ProtocolStack(): JSX.Element {
  return (
    <section
      style={{ background: "var(--kp-dark)", padding: "4rem 1.5rem" }}
    >
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <h2
          style={{
            fontFamily: outfit,
            fontWeight: 800,
            fontSize: "1.75rem",
            color: "var(--kp-heading)",
            textAlign: "center",
            marginBottom: "2rem",
          }}
        >
          5 层协议架构
        </h2>
        {layers.map((l) => (
          <LayerBar key={l.num} {...l} />
        ))}
      </div>
    </section>
  );
}

/* =========================== 4. FEATURE GRID ============================ */

interface Feature {
  icon: string;
  title: string;
  desc: string;
  color: string;
}

const features: Feature[] = [
  {
    icon: "\u{1F50D}",
    title: "技能注册中心",
    desc: "语义 + BM25 混合搜索，一键安装",
    color: "var(--kp-blue)",
  },
  {
    icon: "\u{1F4F7}",
    title: "知识捕获引擎",
    desc: "从智能体会话中自动提取推理链",
    color: "var(--kp-teal)",
  },
  {
    icon: "\u2B07\uFE0F",
    title: "知识检索系统",
    desc: "语义搜索 + 少样本注入，质量评分",
    color: "var(--kp-green)",
  },
  {
    icon: "\u{1F333}",
    title: "专家 SOP 工作室",
    desc: "可视化决策树编辑器",
    color: "var(--kp-orange)",
  },
  {
    icon: "\u{1F3EA}",
    title: "知识市场",
    desc: "免费和订阅制知识交换",
    color: "var(--kp-blue)",
  },
  {
    icon: "\u{1F6E1}\uFE0F",
    title: "KP-REP 声誉系统",
    desc: "灵魂绑定可验证凭证",
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
          fontFamily: outfit,
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

function FeatureGrid(): JSX.Element {
  return (
    <section
      style={{ background: "var(--kp-navy)", padding: "4rem 1.5rem" }}
    >
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <h2
          style={{
            fontFamily: outfit,
            fontWeight: 800,
            fontSize: "1.75rem",
            color: "var(--kp-heading)",
            textAlign: "center",
            marginBottom: "2.5rem",
          }}
        >
          一站式解决方案
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "1.25rem",
          }}
        >
          {features.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* =========================== 5. CODE EXAMPLE ============================ */

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

function CodeExample(): JSX.Element {
  return (
    <section
      style={{ background: "var(--kp-dark)", padding: "4rem 1.5rem" }}
    >
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <h2
          style={{
            fontFamily: outfit,
            fontWeight: 800,
            fontSize: "1.75rem",
            color: "var(--kp-heading)",
            textAlign: "center",
            marginBottom: "2rem",
          }}
        >
          几分钟即可上手
        </h2>
        <pre
          style={{
            background: "var(--kp-panel)",
            border: "1px solid var(--kp-border)",
            borderRadius: 8,
            padding: "1.5rem 2rem",
            overflow: "auto",
            fontFamily: mono,
            fontSize: "0.88rem",
            lineHeight: 1.7,
            color: "var(--kp-text)",
          }}
        >
          <code>
            <Comment text="# Install" />
            {"\n"}
            bun add <Str text="@knowledgepulse/sdk" />
            {"\n\n"}
            <Comment text="# Capture knowledge in 3 lines" />
            {"\n"}
            <Keyword text="import" /> {"{ "}
            <Fn text="KPCapture" />
            {" }"} <Keyword text="from" />{" "}
            <Str text={'"@knowledgepulse/sdk"'} />;{"\n"}
            <Keyword text="const" /> capture = <Keyword text="new" />{" "}
            <Fn text="KPCapture" />
            {'({ domain: '}
            <Str text={'"analysis"'} />
            {" })"};{"\n"}
            <Keyword text="const" /> unit = <Keyword text="await" />{" "}
            capture.
            <Fn text="extract" />
            (agentTrace);
          </code>
        </pre>
      </div>
    </section>
  );
}

/* ========================= 6. COMPARISON TABLE ========================== */

type Mark = "yes" | "no" | "partial";

function Cell({ mark }: { mark: Mark }) {
  if (mark === "yes") {
    return (
      <span style={{ color: "var(--kp-teal)", fontWeight: 700 }}>
        {"\u2713"}
      </span>
    );
  }
  if (mark === "partial") {
    return (
      <span style={{ color: "var(--kp-orange)", fontWeight: 700 }}>~</span>
    );
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
  {
    feature: "SKILL.md 兼容",
    kp: "yes",
    skills: "yes",
    langchain: "no",
    mem0: "no",
  },
  {
    feature: "动态知识",
    kp: "yes",
    skills: "no",
    langchain: "no",
    mem0: "no",
  },
  {
    feature: "MCP 服务器",
    kp: "yes",
    skills: "no",
    langchain: "no",
    mem0: "no",
  },
  {
    feature: "跨框架",
    kp: "yes",
    skills: "partial",
    langchain: "partial",
    mem0: "yes",
  },
  {
    feature: "质量评分",
    kp: "yes",
    skills: "no",
    langchain: "no",
    mem0: "no",
  },
  {
    feature: "声誉系统",
    kp: "yes",
    skills: "no",
    langchain: "no",
    mem0: "no",
  },
  {
    feature: "专家 SOP",
    kp: "yes",
    skills: "no",
    langchain: "no",
    mem0: "no",
  },
  {
    feature: "可自托管",
    kp: "yes",
    skills: "no",
    langchain: "no",
    mem0: "yes",
  },
];

const thBase: React.CSSProperties = {
  fontFamily: mono,
  fontSize: "0.8rem",
  color: "var(--kp-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  padding: "0.75rem 0.6rem",
  borderBottom: "1px solid var(--kp-border)",
  textAlign: "center",
  fontWeight: 500,
};

const tdBase: React.CSSProperties = {
  padding: "0.6rem",
  borderBottom: "1px solid var(--kp-border)",
  textAlign: "center",
  fontSize: "0.95rem",
};

function ComparisonTable(): JSX.Element {
  return (
    <section
      style={{ background: "var(--kp-navy)", padding: "4rem 1.5rem" }}
    >
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <h2
          style={{
            fontFamily: outfit,
            fontWeight: 800,
            fontSize: "1.75rem",
            color: "var(--kp-heading)",
            textAlign: "center",
            marginBottom: "2rem",
          }}
        >
          竞品对比
        </h2>
        <div style={{ borderRadius: 8, overflow: "hidden" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              background: "var(--kp-panel)",
              border: "1px solid var(--kp-border)",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <thead>
              <tr>
                <th style={{ ...thBase, textAlign: "left", paddingLeft: "1rem" }}>
                  功能
                </th>
                <th style={{ ...thBase, color: "var(--kp-teal)" }}>
                  KnowledgePulse
                </th>
                <th style={thBase}>SkillsMP</th>
                <th style={thBase}>LangChain Hub</th>
                <th style={thBase}>Mem0</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.feature}>
                  <td
                    style={{
                      ...tdBase,
                      textAlign: "left",
                      paddingLeft: "1rem",
                      fontFamily: mono,
                      fontSize: "0.85rem",
                      color: "var(--kp-text)",
                    }}
                  >
                    {r.feature}
                  </td>
                  <td style={tdBase}>
                    <Cell mark={r.kp} />
                  </td>
                  <td style={tdBase}>
                    <Cell mark={r.skills} />
                  </td>
                  <td style={tdBase}>
                    <Cell mark={r.langchain} />
                  </td>
                  <td style={tdBase}>
                    <Cell mark={r.mem0} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/* =========================== 7. USE CASES =============================== */

interface UseCase {
  domain: string;
  desc: string;
  color: string;
}

const cases: UseCase[] = [
  {
    domain: "金融分析",
    desc: "智能体在组织内共享盈利分析技术",
    color: "var(--kp-blue)",
  },
  {
    domain: "客户支持",
    desc: "SOP 变为机器可执行的决策树",
    color: "var(--kp-teal)",
  },
  {
    domain: "工程开发",
    desc: "Bug 分类知识从智能体会话中自动捕获",
    color: "var(--kp-orange)",
  },
];

function CaseCard({ domain, desc, color }: UseCase) {
  return (
    <div
      style={{
        background: "var(--kp-panel)",
        border: "1px solid var(--kp-border)",
        borderTop: `3px solid ${color}`,
        borderRadius: 8,
        padding: "1.5rem",
      }}
    >
      <div
        style={{
          fontFamily: mono,
          fontSize: "0.75rem",
          color: color,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: "0.75rem",
        }}
      >
        {domain}
      </div>
      <div
        style={{
          fontSize: "0.95rem",
          color: "var(--kp-text)",
          lineHeight: 1.5,
        }}
      >
        {desc}
      </div>
    </div>
  );
}

function UseCaseCards(): JSX.Element {
  return (
    <section
      style={{ background: "var(--kp-dark)", padding: "4rem 1.5rem" }}
    >
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <h2
          style={{
            fontFamily: outfit,
            fontWeight: 800,
            fontSize: "1.75rem",
            color: "var(--kp-heading)",
            textAlign: "center",
            marginBottom: "2.5rem",
          }}
        >
          为真实团队打造
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "1.25rem",
          }}
        >
          {cases.map((c) => (
            <CaseCard key={c.domain} {...c} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ======================== 8. FRAMEWORK INTEGRATIONS ===================== */

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
          fontFamily: mono,
          fontSize: "0.88rem",
          color: "var(--kp-text)",
        }}
      >
        {name}
      </span>
      <span
        style={{
          fontFamily: mono,
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

function FrameworkLogos(): JSX.Element {
  return (
    <section
      style={{ background: "var(--kp-navy)", padding: "4rem 1.5rem" }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h2
          style={{
            fontFamily: outfit,
            fontWeight: 800,
            fontSize: "1.75rem",
            color: "var(--kp-heading)",
            textAlign: "center",
            marginBottom: "2rem",
          }}
        >
          兼容你的技术栈
        </h2>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "0.75rem",
          }}
        >
          {frameworks.map((f) => (
            <Pill key={f.name} {...f} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================ 9. TESTIMONIALS =========================== */

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
      "KnowledgePulse 彻底改变了我们 AI 智能体在团队间共享知识的方式。",
    name: "Alex Kim",
    role: "ML 工程师",
  },
  {
    initials: "SR",
    color: "var(--kp-blue)",
    quote:
      "SOP 工作室让我们能够捕获以前未记录的专家流程。",
    name: "Sarah Rodriguez",
    role: "运营主管",
  },
  {
    initials: "JC",
    color: "var(--kp-orange)",
    quote:
      "终于有一个跨不同 AI 框架工作的知识协议了。",
    name: "James Chen",
    role: "AI 架构师",
  },
];

function TestimonialCard({
  initials,
  color,
  quote,
  name,
  role,
}: Testimonial) {
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
          fontFamily: outfit,
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
            fontFamily: mono,
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

function TestimonialCards(): JSX.Element {
  return (
    <section
      style={{ background: "var(--kp-dark)", padding: "4rem 1.5rem" }}
    >
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <h2
          style={{
            fontFamily: outfit,
            fontWeight: 800,
            fontSize: "1.75rem",
            color: "var(--kp-heading)",
            textAlign: "center",
            marginBottom: "2.5rem",
          }}
        >
          用户评价
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "1.25rem",
          }}
        >
          {testimonials.map((t) => (
            <TestimonialCard key={t.initials} {...t} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================ 10. ECOSYSTEM ============================= */

function EcosystemNote(): JSX.Element {
  const lineStyle: React.CSSProperties = {
    fontFamily: mono,
    fontSize: "0.95rem",
    color: "var(--kp-text)",
    lineHeight: 1.8,
    margin: 0,
  };
  const accent: React.CSSProperties = {
    color: "var(--kp-teal)",
    fontWeight: 600,
  };
  const muted: React.CSSProperties = { color: "var(--kp-muted)" };

  return (
    <section
      style={{ background: "var(--kp-navy)", padding: "4rem 1.5rem" }}
    >
      <div
        style={{
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
        }}
      >
        <p style={lineStyle}>
          <span style={accent}>OpenClaw</span>{" "}
          <span style={muted}>&mdash;</span> 龙虾。强壮的钳子，执行任务。
        </p>
        <p style={lineStyle}>
          <span style={accent}>KnowledgePulse</span>{" "}
          <span style={muted}>&mdash;</span> 章鱼。8
          条分布式手臂，共享智能。
        </p>
        <p
          style={{
            ...lineStyle,
            marginTop: "0.75rem",
            fontWeight: 600,
            color: "var(--kp-heading)",
          }}
        >
          龙虾行动。章鱼学习。完美搭档。
        </p>
      </div>
    </section>
  );
}

/* =============================== 11. CTA ================================ */

function CTASection(): JSX.Element {
  return (
    <section
      style={{
        background:
          "radial-gradient(ellipse at 50% 80%, #0C1A28 0%, #050D16 70%)",
        padding: "5rem 1.5rem",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <h2
          style={{
            fontFamily: outfit,
            fontWeight: 800,
            fontSize: "2rem",
            color: "var(--kp-heading)",
            marginBottom: "0.75rem",
          }}
        >
          准备好分享你的知识了吗？
        </h2>
        <p
          style={{
            color: "var(--kp-muted)",
            fontSize: "1.1rem",
            marginBottom: "2rem",
          }}
        >
          立即开始捕获和分享 AI 知识。
        </p>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <Link
            to="/zh-Hans/docs/getting-started/quickstart"
            style={{
              display: "inline-block",
              background: "var(--kp-teal)",
              color: "#fff",
              padding: "0.75rem 2rem",
              borderRadius: 8,
              fontWeight: 700,
              fontSize: "1rem",
              textDecoration: "none",
              border: "none",
            }}
          >
            快速入门
          </Link>
          <a
            href="https://github.com/anthropics/knowledgepulse"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              background: "transparent",
              color: "var(--kp-text)",
              padding: "0.75rem 2rem",
              borderRadius: 8,
              fontWeight: 700,
              fontSize: "1rem",
              textDecoration: "none",
              border: "1px solid var(--kp-border)",
            }}
          >
            GitHub 上 Star
          </a>
        </div>
      </div>
    </section>
  );
}

/* =============================== PAGE =================================== */

export default function Home(): JSX.Element {
  return (
    <Layout title="首页" description="开放式 AI 知识共享协议">
      <HeroSection />
      <StatsCounter />
      <ProtocolStack />
      <FeatureGrid />
      <CodeExample />
      <ComparisonTable />
      <UseCaseCards />
      <FrameworkLogos />
      <TestimonialCards />
      <EcosystemNote />
      <CTASection />
    </Layout>
  );
}
