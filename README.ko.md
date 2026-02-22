<div align="center">

[English](README.md) | [简体中文](README.zh-Hans.md) | [日本語](README.ja.md) | **한국어** | [Español](README.es.md)

<!-- Octo animated banner (SMIL animation, works on GitHub) -->
<img src="assets/octo-banner.svg" alt="KnowledgePulse Octo Banner" width="800"/>

<h1>KnowledgePulse</h1>
<p><strong>오픈 AI 지식 공유 프로토콜 &mdash; SKILL.md 호환</strong></p>

<!-- 배지 -->
<img src="https://img.shields.io/badge/license-Apache%202.0-18A06A?style=flat" alt="라이선스"/>
<img src="https://img.shields.io/badge/runtime-Bun-E07A20?style=flat&logo=bun" alt="런타임"/>
<img src="https://img.shields.io/badge/protocol-MCP%20ready-12B5A8?style=flat" alt="MCP"/>
<img src="https://img.shields.io/badge/SKILL.md-compatible-1E7EC8?style=flat" alt="SKILL.md"/>
<img src="https://img.shields.io/badge/tests-639%20passing-18A06A?style=flat" alt="테스트"/>
<img src="https://img.shields.io/github/stars/chesterkuo/OpenKnowledgePulse?style=flat&color=E07A20" alt="Stars"/>

<a href="https://openknowledgepulse.org"><strong>웹사이트</strong></a> · <a href="https://openknowledgepulse.org/docs/getting-started/introduction"><strong>문서</strong></a> · <a href="https://github.com/chesterkuo/OpenKnowledgePulse"><strong>GitHub</strong></a>

</div>

---

KnowledgePulse는 AI 에이전트와 인간 전문가가 문제 해결 경험(추론 체인, 도구 호출 패턴, 표준 운영 절차)을 프레임워크와 조직의 경계를 넘어 공유할 수 있게 합니다. 데이터 프라이버시와 지적재산권을 보호하면서 실현합니다.

**이중 레이어 아키텍처**를 기반으로 구축되었습니다:

- **레이어 1** -- 기존 SKILL.md 오픈 스탠다드와 완전 호환 (SkillsMP 200,000개 이상의 스킬)
- **레이어 2** -- 동적 지식 레이어로, 에이전트의 실행 경험이 자동으로 공유 가능하고 검증 가능하며 인센티브가 부여된 KnowledgeUnit으로 변환됩니다

> **AI 에이전트를 위한 테슬라 플릿 러닝**이라고 생각하세요: 한 에이전트가 금융 분석 기법을 발견하면, 그것이 자동으로 전체 생태계의 공유 자산이 됩니다.

## 기능

| 모듈 | 설명 |
|------|------|
| **스킬 레지스트리** | 시맨틱 + BM25 하이브리드 검색, `~/.claude/skills/`로 원클릭 설치 |
| **지식 캡처** | 에이전트 실행에서 추론 트레이스 자동 추출 (설정 불필요) |
| **지식 검색** | 시맨틱 검색 + few-shot 주입 API |
| **전문가 SOP 스튜디오** | 전문가 SOP를 위한 시각적 의사결정 트리 편집기 |
| **지식 마켓플레이스** | 무료 / 조직 내 / 구독 / 건당 과금 지식 교환 |
| **KP-REP 평판** | 소울바운드 평판 시스템, 검증 가능한 자격증명 지원 (Ed25519) |

## 빠른 시작

### 설치

```bash
# CLI 도구
bun add -g @knowledgepulse/cli

# TypeScript SDK
bun add @knowledgepulse/sdk

# MCP 서버
bun add @knowledgepulse/mcp
```

### 스킬 검색 및 설치

```bash
# 스킬 검색
kp search "financial analysis"

# 스킬 설치 (SKILL.md를 ~/.claude/skills/에 자동 생성)
kp install financial-report-analyzer

# SKILL.md 형식 검증
kp validate ./my-skill.md
```

### 지식 캡처 활성화 (TypeScript)

```typescript
import { KPCapture } from "@knowledgepulse/sdk";

const capture = new KPCapture({
  domain: "financial_analysis",
  visibility: "network",
  valueThreshold: 0.75,
});

// 기존 에이전트를 래핑 -- 지식이 자동으로 공유됩니다
const wrappedAgent = capture.wrap(yourExistingAgentFn);
const result = await wrappedAgent("TSMC 2025년 4분기 실적 분석");
```

### Python 프레임워크에서 MCP를 통한 접근 (Python SDK 불필요)

```python
# LangGraph / CrewAI / AutoGen은 MCP HTTP를 통해 KnowledgePulse에 접근
mcp_config = {
    "knowledgepulse": {
        "url": "https://registry.openknowledgepulse.org/mcp",
        "transport": "http"
    }
}

# 에이전트에서 KP MCP 도구를 직접 호출 가능
result = agent.run(
    "실적 보고서 분석",
    tools=["kp_search_skill", "kp_search_knowledge"]
)
```

### 레지스트리 자체 호스팅

```bash
git clone https://github.com/chesterkuo/OpenKnowledgePulse
cd knowledgepulse
bun install
bun run registry/src/index.ts
# Registry API: http://localhost:3000
```

## 아키텍처

```
+-------------------------------------------------------------------+
|                    KnowledgePulse 프로토콜 스택                      |
+-------------------------------------------------------------------+
|  레이어 5: 거버넌스 및 인센티브                                       |
|           KP-REP 평판 SBT · 품질 검증                               |
+-------------------------------------------------------------------+
|  레이어 4: 프라이버시 및 보안                                         |
|           집계 공유 · 차등 프라이버시 · 접근 제어                       |
+-------------------------------------------------------------------+
|  레이어 3: 디스커버리 및 교환                                         |
|           지식 레지스트리 · MCP 서버 · REST API                       |
+-------------------------------------------------------------------+
|  레이어 2: KnowledgeUnit 레이어  <-- 핵심 차별화 요소                  |
|           ReasoningTrace · ToolCallPattern · ExpertSOP              |
+-------------------------------------------------------------------+
|  레이어 1: SKILL.md 호환 레이어  <-- 기존 생태계                       |
|           SkillsMP / SkillHub / Smithery / Claude Code / Codex      |
+-------------------------------------------------------------------+
```

## 저장소 구조

```
knowledgepulse/
  packages/
    sdk/           @knowledgepulse/sdk    -- 타입, 캡처, 검색, 스코어링
    mcp-server/    @knowledgepulse/mcp    -- 6개 MCP 도구, 듀얼 모드 브리지
    cli/           @knowledgepulse/cli    -- 검색, 설치, 검증, 기여
    sop-studio/    SOP Studio React SPA   -- 시각적 의사결정 트리 편집기
  registry/        Hono REST API 서버     -- 인증, 레이트 리미팅, SQLite/메모리 스토어
  specs/           JSON Schema, 코드 생성, SKILL.md 확장 사양
  examples/        SDK 사용 예제, MCP 클라이언트, LangGraph 통합
  website/         Docusaurus 3 문서      -- 이중 언어 (en + zh-Hans)
```

## 기술 스택

| 구성 요소 | 기술 |
|----------|------|
| 런타임 | Bun |
| HTTP 서버 | Hono |
| 타입 검증 | Zod + zod-to-json-schema |
| SDK 빌드 | tsup (ESM + CJS + .d.ts) |
| SOP Studio | React 19 + Vite + Tailwind CSS v4 + React Flow |
| 린터 | Biome |
| 테스트 | bun test (639개 테스트) |
| 프로토콜 | MCP (Model Context Protocol) |
| 문서 | Docusaurus 3 (en + zh-Hans) |

## MCP 도구

| 도구 | 설명 |
|------|------|
| `kp_search_skill` | SKILL.md 레지스트리 시맨틱 검색 |
| `kp_get_skill` | ID로 전체 스킬 내용 조회 |
| `kp_contribute_skill` | 자동 검증 포함 새 스킬 제출 |
| `kp_search_knowledge` | KnowledgeUnit 검색 (트레이스, 패턴, SOP) |
| `kp_contribute_knowledge` | 품질 사전 스코어링 포함 KnowledgeUnit 기여 |
| `kp_validate_unit` | KnowledgeUnit 스키마 준수 검증 |

## KnowledgeUnit 유형

### ReasoningTrace

에이전트의 완전한 문제 해결 체인을 캡처합니다: 사고 과정, 도구 호출, 관찰, 오류 복구 단계.

### ToolCallPattern

재사용 가능한 도구 오케스트레이션 시퀀스로, 트리거 조건, 성능 지표, 성공률을 포함합니다.

### ExpertSOP

인간 전문가의 표준 운영 절차를 조건, SLA, 도구 제안이 포함된 기계 실행 가능한 의사결정 트리로 변환한 것입니다.

## 지식 가치 스코어링

기여된 모든 지식은 로컬에서 평가됩니다 (100ms 미만, 외부 LLM 불필요). 4차원 모델 사용:

| 차원 | 가중치 | 측정 내용 |
|------|--------|----------|
| 복잡성 | 0.25 | 단계 유형 다양성, 오류 복구, 분기 |
| 신규성 | 0.35 | 로컬 임베딩 캐시와의 코사인 거리 |
| 도구 다양성 | 0.15 | 단계 수 대비 고유 MCP 도구 비율 |
| 결과 신뢰도 | 0.25 | 성공률 + 신뢰도 점수 |

## 프레임워크 통합

| 프레임워크 | 통합 방식 | 우선순위 |
|-----------|----------|---------|
| Claude Code | 네이티브 SKILL.md | P0 |
| OpenAI Codex CLI | 네이티브 SKILL.md | P0 |
| OpenClaw | TypeScript SDK | P0 |
| LangGraph | MCP HTTP | P1 |
| CrewAI | MCP HTTP | P1 |
| AutoGen | MCP HTTP | P1 |
| Flowise | TypeScript 플러그인 | P2 |

## 개발

```bash
# 의존성 설치
bun install

# 전체 테스트 실행
bun test --recursive

# SDK 빌드
cd packages/sdk && bun run build

# 레지스트리 시작
bun run registry/src/index.ts

# SOP Studio 시작
cd packages/sop-studio && npx vite dev

# 문서 빌드
cd website && npm run build
```

## 문서

영어 및 중국어 간체로 제공되는 전체 문서:

- [시작하기](https://openknowledgepulse.org/docs/getting-started/installation)
- [아키텍처](https://openknowledgepulse.org/docs/architecture/overview)
- [SDK 레퍼런스](https://openknowledgepulse.org/docs/sdk/types)
- [Registry API](https://openknowledgepulse.org/docs/registry/rest-api)
- [MCP 서버](https://openknowledgepulse.org/docs/mcp-server/overview)
- [CLI](https://openknowledgepulse.org/docs/cli/commands)
- [SOP Studio](https://openknowledgepulse.org/docs/sop-studio/getting-started)
- [마켓플레이스](https://openknowledgepulse.org/docs/marketplace/overview)

## 기여

가이드라인은 [CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요. 모든 기여에는 다음이 필요합니다:

1. 테스트 통과 (`bun test`)
2. 린트 검사 통과 (`biome check`)
3. SDK 빌드 통과 (`cd packages/sdk && bun run build`)

## 로드맵

| 단계 | 상태 | 중점 |
|------|------|------|
| 1단계 | 완료 | SKILL.md 레지스트리 + SDK + MCP + CLI |
| 2단계 | 완료 | 지식 캡처 + 스코어링 + 평판 |
| 3단계 | 완료 | 전문가 SOP Studio + 마켓플레이스 |
| 4단계 | 완료 | UI 개선 + 업계 표준화 |

## 라이선스

[Apache 2.0](LICENSE)

---

<div align="center">

*배운 것을 나누세요.*

</div>
