---
sidebar_position: 3
sidebar_label: OpenClaw SDK
title: OpenClaw SDK 통합
description: KnowledgePulse TypeScript SDK를 OpenClaw 및 기타 TypeScript 에이전트 프레임워크에서 직접 사용하는 방법.
---

# OpenClaw SDK 통합

[OpenClaw](https://github.com/openclaw) 및 유사한 TypeScript 기반 에이전트 프레임워크는 `@knowledgepulse/sdk`를 직접 사용하여 네이티브 통합을 구현할 수 있습니다. 이 가이드에서는 `KPCapture`와 `KPRetrieval`을 사용하여 모든 TypeScript 에이전트에 투명한 지식 캡처 및 검색을 추가하는 방법을 시연합니다.

## 개요

HTTP를 사용하는 Python 통합과 달리 TypeScript 프레임워크는 직접 SDK 사용의 이점을 누릴 수 있습니다:

- **KPCapture**: 에이전트 함수를 래핑하여 추론 추적을 자동으로 캡처하고 평가합니다.
- **KPRetrieval**: 레지스트리를 검색하고 결과를 few-shot 프롬프트로 포매팅합니다.

```
┌──────────────────────────────────────────┐
│          TypeScript Agent                │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │         KPCapture.wrap()           │  │
│  │  (transparent trace capture)       │  │
│  └──────────────┬─────────────────────┘  │
│                 │                         │
│  ┌──────────────▼─────────────────────┐  │
│  │       KPRetrieval.search()         │  │
│  │  (few-shot knowledge injection)    │  │
│  └──────────────┬─────────────────────┘  │
│                 │                         │
└─────────────────┼─────────────────────────┘
                  │
           ┌──────▼──────────────┐
           │  KP Registry (:3000)│
           └─────────────────────┘
```

## 사전 요구 사항

- Bun 또는 Node.js 20+
- 실행 중인 KnowledgePulse 레지스트리: `bun run registry/src/index.ts`

```bash
bun add @knowledgepulse/sdk
```

## 지식 캡처

### 에이전트 함수 래핑

`KPCapture.wrap()`은 모든 비동기 함수를 받아 함수 실행 시 추론 추적을 자동으로 캡처하는 래핑된 버전을 반환합니다. 추적 점수가 품질 임계값을 초과하면 레지스트리에 기여됩니다.

```ts
import { KPCapture } from "@knowledgepulse/sdk";

const capture = new KPCapture({
  domain: "code_review",
  visibility: "network",
  valueThreshold: 0.75,
  registryUrl: "http://localhost:3000",
});

// Your existing agent function
async function codeReviewAgent(codeSnippet: string): Promise<string> {
  // Agent logic here...
  return `Analysis complete for: ${codeSnippet}`;
}

// Wrap it — knowledge capture happens automatically
const wrappedAgent = capture.wrap(codeReviewAgent);

// Use as normal
const result = await wrappedAgent("function processData(items) { ... }");
```

### 구성 옵션

| 옵션 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `domain` | string | `"general"` | 평가 가중치 선택을 위한 작업 도메인 |
| `visibility` | string | `"network"` | 가시성 범위: `"private"`, `"org"`, `"network"` |
| `valueThreshold` | number | `0.75` | 기여를 위한 최소 점수 (0.0 -- 1.0) |
| `registryUrl` | string | -- | KP 레지스트리 URL |

## 지식 검색

### 사전 지식 검색

`KPRetrieval`은 레지스트리를 검색하고 일치하는 지식 유닛을 반환합니다:

```ts
import { KPRetrieval } from "@knowledgepulse/sdk";

const retrieval = new KPRetrieval({
  registryUrl: "http://localhost:3000",
  minQuality: 0.8,
  limit: 5,
});

// Search for relevant knowledge
const knowledge = await retrieval.search("code review patterns", "code_review");

console.log(`Found ${knowledge.length} knowledge unit(s)`);
for (const unit of knowledge) {
  console.log(`  [${unit["@type"]}] ${unit.id}`);
}
```

### Few-Shot 포매팅

지식 유닛을 LLM 프롬프팅에 적합한 텍스트 형식으로 변환합니다:

```ts
if (knowledge.length > 0) {
  const fewShot = retrieval.toFewShot(knowledge[0]);

  // Use as context in your LLM prompt
  const prompt = `Using prior knowledge:\n${fewShot}\n\nAnalyze this code:\n${code}`;
}
```

### 스킬 검색

```ts
const skills = await retrieval.searchSkills("code analysis", {
  tags: ["typescript", "linting"],
  limit: 3,
});

for (const skill of skills) {
  console.log(`${skill.name}: ${skill.description}`);
}
```

## 전체 통합 예제

검색, 에이전트 실행, 캡처를 결합한 전체 예제입니다:

```ts
import { KPCapture, KPRetrieval } from "@knowledgepulse/sdk";

// ── 1. Configure ──────────────────────────────────────
const capture = new KPCapture({
  domain: "code_review",
  visibility: "network",
  valueThreshold: 0.75,
  registryUrl: "http://localhost:3000",
});

const retrieval = new KPRetrieval({
  registryUrl: "http://localhost:3000",
  minQuality: 0.8,
  limit: 5,
});

// ── 2. Agent function with knowledge augmentation ─────
async function reviewCode(codeSnippet: string): Promise<string> {
  // Search for relevant prior knowledge
  let context = "";
  try {
    const knowledge = await retrieval.search("code review patterns", "code_review");
    if (knowledge.length > 0) {
      context = retrieval.toFewShot(knowledge[0]);
      console.log(`Augmented with ${knowledge.length} knowledge unit(s)`);
    }
  } catch {
    console.log("Running without augmentation (registry offline)");
  }

  // Build the prompt (send to your LLM of choice)
  const prompt = context
    ? `Prior knowledge:\n${context}\n\nReview:\n${codeSnippet}`
    : `Review:\n${codeSnippet}`;

  // Simulate LLM response
  return `Reviewed ${codeSnippet.length} chars using ${context ? "augmented" : "base"} prompt`;
}

// ── 3. Wrap and run ───────────────────────────────────
const wrappedReview = capture.wrap(reviewCode);
const result = await wrappedReview("function add(a, b) { return a + b; }");
console.log(result);
```

## SKILL.md 유효성 검사

TypeScript 에이전트는 SKILL.md 파일의 유효성도 검사할 수 있습니다:

```ts
import { validateSkillMd } from "@knowledgepulse/sdk";

const skillMd = `---
name: code-review-agent
description: Reviews code for security vulnerabilities
version: 1.0.0
tags: [security, code-review]
kp:
  knowledge_capture: true
  domain: code_review
  quality_threshold: 0.7
---

# Code Review Agent

Analyzes code for security issues and best practice violations.
`;

const validation = validateSkillMd(skillMd);
console.log("Valid:", validation.valid);
if (validation.errors.length > 0) {
  console.log("Errors:", validation.errors);
}
```

## 오류 처리

SDK는 네트워크 오류를 우아하게 처리합니다. 레지스트리에 접근할 수 없는 경우 `KPRetrieval` 메서드는 캐치할 수 있는 오류를 던지며, `KPCapture`는 기여를 조용히 건너뜁니다:

```ts
try {
  const knowledge = await retrieval.search("query");
} catch (error) {
  if (error instanceof TypeError && String(error).includes("fetch")) {
    console.log("Registry offline — proceeding without augmentation");
  }
}
```

## 예제 실행

```bash
# Start the registry
bun run registry/src/index.ts

# Run the OpenClaw example
bun run examples/openclaw-integration/index.ts
```
