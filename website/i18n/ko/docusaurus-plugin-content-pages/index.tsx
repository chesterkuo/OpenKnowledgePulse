import Link from "@docusaurus/Link";
import useBaseUrl from "@docusaurus/useBaseUrl";
import Layout from "@theme/Layout";
import { useEffect, useState } from "react";
import FeaturedSkills from "../../../src/components/FeaturedSkills";

/* ==========================================================================
   Korean Landing Page — mirrors all 12 sections of the English version
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
          개방형 AI 지식 공유 프로토콜
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
            to="/ko/docs/getting-started/quickstart"
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
            빠른 시작
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
            Studio 열기
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
            GitHub에서 보기
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
      .then((r) => (r.ok ? r.json() : Promise.reject()))
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
    { value: skillCount, label: "스킬", color: "var(--kp-orange)" },
    { value: "6", label: "MCP 도구", color: "var(--kp-blue)" },
    { value: "5", label: "프로토콜 레이어", color: "var(--kp-green)" },
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
  { num: 5, name: "마켓플레이스 & 평판", color: "var(--kp-orange)" },
  { num: 4, name: "전문가 SOP", color: "var(--kp-blue)" },
  { num: 3, name: "지식 캡처", color: "var(--kp-teal)" },
  {
    num: 2,
    name: "SKILL.md \u2014 지식 유닛",
    color: "var(--kp-orange)",
    highlight: true,
  },
  { num: 1, name: "스토리지 + 전송", color: "var(--kp-green)" },
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
          5계층 프로토콜 아키텍처
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
    title: "스킬 레지스트리",
    desc: "시맨틱 + BM25 하이브리드 검색, 원클릭 설치",
    color: "var(--kp-blue)",
  },
  {
    icon: "\u{1F4F7}",
    title: "지식 캡처 엔진",
    desc: "에이전트 대화에서 추론 체인 자동 추출",
    color: "var(--kp-teal)",
  },
  {
    icon: "\u2B07\uFE0F",
    title: "지식 검색 시스템",
    desc: "시맨틱 검색 + few-shot 주입, 품질 평가",
    color: "var(--kp-green)",
  },
  {
    icon: "\u{1F333}",
    title: "전문가 SOP 스튜디오",
    desc: "시각적 의사 결정 트리 편집기",
    color: "var(--kp-orange)",
  },
  {
    icon: "\u{1F3EA}",
    title: "지식 마켓플레이스",
    desc: "무료 및 구독 기반 지식 교환",
    color: "var(--kp-blue)",
  },
  {
    icon: "\u{1F6E1}\uFE0F",
    title: "KP-REP 평판 시스템",
    desc: "소울바운드 검증 가능 자격 증명",
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
          올인원 솔루션
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
          몇 분 만에 시작하세요
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
    domain: "금융 분석",
    desc: "에이전트가 조직 내에서 수익 분석 기법을 공유합니다",
    color: "var(--kp-blue)",
  },
  {
    domain: "고객 지원",
    desc: "SOP가 머신 실행 가능한 의사 결정 트리로 변환됩니다",
    color: "var(--kp-teal)",
  },
  {
    domain: "엔지니어링",
    desc: "버그 분류 지식이 에이전트 대화에서 자동으로 캡처됩니다",
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
          실제 팀을 위해 만들었습니다
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
          당신의 기술 스택과 호환됩니다
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
          <span style={accent}>OpenClaw</span> <span style={muted}>&mdash;</span> 랍스터. 강한 집게,
          작업을 실행합니다.
        </p>
        <p style={lineStyle}>
          <span style={accent}>KnowledgePulse</span> <span style={muted}>&mdash;</span> 문어. 8개의
          분산된 팔, 지능을 공유합니다.
        </p>
        <p
          style={{
            ...lineStyle,
            marginTop: "0.75rem",
            fontWeight: 600,
            color: "var(--kp-heading)",
          }}
        >
          랍스터는 행동합니다. 문어는 학습합니다. 완벽한 파트너.
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
          지식을 공유할 준비가 되셨나요?
        </h2>
        <p
          style={{
            color: "var(--kp-muted)",
            fontSize: "1.1rem",
            marginBottom: "2rem",
          }}
        >
          지금 바로 AI 지식을 캡처하고 공유하세요.
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
            to="/ko/docs/getting-started/quickstart"
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
            빠른 시작
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
            Studio 열기
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
            GitHub에서 Star
          </a>
        </div>
      </div>
    </section>
  );
}

/* =============================== PAGE =================================== */

export default function Home(): JSX.Element {
  return (
    <Layout title="홈" description="개방형 AI 지식 공유 프로토콜">
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
