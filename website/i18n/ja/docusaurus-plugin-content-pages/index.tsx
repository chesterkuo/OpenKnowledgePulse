import Link from "@docusaurus/Link";
import useBaseUrl from "@docusaurus/useBaseUrl";
import Layout from "@theme/Layout";
import FeaturedSkills from "../../../src/components/FeaturedSkills";
import { useEffect, useState } from "react";

/* ==========================================================================
   Japanese Landing Page — mirrors all 12 sections of the English version
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
        background: "radial-gradient(ellipse at 50% 20%, #0C1A28 0%, #050D16 70%)",
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
          オープン AI ナレッジ共有プロトコル
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
            to="/ja/docs/getting-started/quickstart"
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
            クイックスタート
          </Link>
          <a
            href="/studio/"
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
            Studio を開く
          </a>
          <a
            href="https://github.com/chesterkuo/OpenKnowledgePulse"
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
            GitHub で見る
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

function useSkillCount(): string {
  const [count, setCount] = useState("--");
  useEffect(() => {
    fetch("/v1/skills?limit=1")
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((j) => setCount((j as { total: number }).total.toLocaleString()))
      .catch(() => setCount("30+"));
  }, []);
  return count;
}

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
  const skillCount = useSkillCount();
  const dynamicStats: Stat[] = [
    { value: skillCount, label: "スキル", color: "var(--kp-orange)" },
    { value: "6", label: "MCP ツール", color: "var(--kp-blue)" },
    { value: "5", label: "プロトコル層", color: "var(--kp-green)" },
  ];
  return (
    <section style={{ background: "var(--kp-dark)", padding: "3rem 1.5rem" }}>
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "1.25rem",
        }}
      >
        {dynamicStats.map((s) => (
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
  { num: 5, name: "マーケットプレイス & レピュテーション", color: "var(--kp-orange)" },
  { num: 4, name: "エキスパート SOP", color: "var(--kp-blue)" },
  { num: 3, name: "ナレッジキャプチャ", color: "var(--kp-teal)" },
  {
    num: 2,
    name: "SKILL.md \u2014 ナレッジユニット",
    color: "var(--kp-orange)",
    highlight: true,
  },
  { num: 1, name: "ストレージ + トランスポート", color: "var(--kp-green)" },
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
        border: highlight ? "1px solid rgba(224,122,32,0.25)" : "1px solid var(--kp-border)",
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
    <section style={{ background: "var(--kp-dark)", padding: "4rem 1.5rem" }}>
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
          5層プロトコルアーキテクチャ
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
    title: "スキルレジストリ",
    desc: "セマンティック + BM25 ハイブリッド検索、ワンクリックインストール",
    color: "var(--kp-blue)",
  },
  {
    icon: "\u{1F4F7}",
    title: "ナレッジキャプチャエンジン",
    desc: "エージェント会話から推論チェーンを自動抽出",
    color: "var(--kp-teal)",
  },
  {
    icon: "\u2B07\uFE0F",
    title: "ナレッジリトリーバルシステム",
    desc: "セマンティック検索 + Few-Shot 注入、品質スコアリング",
    color: "var(--kp-green)",
  },
  {
    icon: "\u{1F333}",
    title: "エキスパート SOP スタジオ",
    desc: "ビジュアルデシジョンツリーエディター",
    color: "var(--kp-orange)",
  },
  {
    icon: "\u{1F3EA}",
    title: "ナレッジマーケットプレイス",
    desc: "無料およびサブスクリプション型のナレッジ交換",
    color: "var(--kp-blue)",
  },
  {
    icon: "\u{1F6E1}\uFE0F",
    title: "KP-REP レピュテーションシステム",
    desc: "ソウルバウンド検証可能クレデンシャル",
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
    <section style={{ background: "var(--kp-navy)", padding: "4rem 1.5rem" }}>
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
          オールインワンソリューション
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
    <section style={{ background: "var(--kp-dark)", padding: "4rem 1.5rem" }}>
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
          数分で始められます
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

/* =========================== 7. USE CASES =============================== */

interface UseCase {
  domain: string;
  desc: string;
  color: string;
}

const cases: UseCase[] = [
  {
    domain: "金融分析",
    desc: "エージェントが組織内で収益分析手法を共有",
    color: "var(--kp-blue)",
  },
  {
    domain: "カスタマーサポート",
    desc: "SOP が機械実行可能なデシジョンツリーに変換",
    color: "var(--kp-teal)",
  },
  {
    domain: "エンジニアリング",
    desc: "バグトリアージのナレッジをエージェント会話から自動キャプチャ",
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
    <section style={{ background: "var(--kp-dark)", padding: "4rem 1.5rem" }}>
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
          実際のチームのために構築
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
    <section style={{ background: "var(--kp-navy)", padding: "4rem 1.5rem" }}>
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
          あなたの技術スタックに対応
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
    <section style={{ background: "var(--kp-navy)", padding: "4rem 1.5rem" }}>
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
          <span style={accent}>OpenClaw</span> <span style={muted}>&mdash;</span>{" "}
          ロブスター。強力なハサミでタスクを実行。
        </p>
        <p style={lineStyle}>
          <span style={accent}>KnowledgePulse</span> <span style={muted}>&mdash;</span> タコ。8
          本の分散した腕で知能を共有。
        </p>
        <p
          style={{
            ...lineStyle,
            marginTop: "0.75rem",
            fontWeight: 600,
            color: "var(--kp-heading)",
          }}
        >
          ロブスターは行動する。タコは学ぶ。最高のパートナー。
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
        background: "radial-gradient(ellipse at 50% 80%, #0C1A28 0%, #050D16 70%)",
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
          ナレッジを共有する準備はできましたか？
        </h2>
        <p
          style={{
            color: "var(--kp-muted)",
            fontSize: "1.1rem",
            marginBottom: "2rem",
          }}
        >
          AI ナレッジのキャプチャと共有を今すぐ始めましょう。
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
            to="/ja/docs/getting-started/quickstart"
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
            クイックスタート
          </Link>
          <a
            href="/studio/"
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
            Studio を開く
          </a>
          <a
            href="https://github.com/chesterkuo/OpenKnowledgePulse"
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
            GitHub で Star
          </a>
        </div>
      </div>
    </section>
  );
}

/* =============================== PAGE =================================== */

export default function Home(): JSX.Element {
  return (
    <Layout title="ホーム" description="オープン AI ナレッジ共有プロトコル">
      <HeroSection />
      <StatsCounter />
      <ProtocolStack />
      <FeatureGrid />
      <CodeExample />
      <UseCaseCards />
      <FeaturedSkills />
      <FrameworkLogos />

      <EcosystemNote />
      <CTASection />
    </Layout>
  );
}
