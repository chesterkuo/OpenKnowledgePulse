---
sidebar_position: 5
sidebar_label: 유틸리티
title: 유틸리티
description: ID 생성기, 해싱, 콘텐츠 정제, 지식 캡처, 검색, 기여 헬퍼.
---

# 유틸리티

SDK는 KnowledgePulse 프로토콜과 함께 사용하기 위한 유틸리티 함수와 클래스 모음을 내보냅니다. 이 페이지에서는 ID 생성, 해싱, 콘텐츠 정제, `KPCapture` 및 `KPRetrieval` 클래스, 기여 함수를 다룹니다.

## ID 생성기

각 지식 유닛 타입에는 네임스페이스가 지정된 UUID 문자열을 생성하는 전용 ID 생성기가 있습니다.

```ts
import {
  generateTraceId,
  generatePatternId,
  generateSopId,
  generateSkillId,
} from "@knowledgepulse/sdk";
```

| 함수 | 반환 형식 | 예제 |
|------|----------|------|
| `generateTraceId()` | `kp:trace:<uuid>` | `kp:trace:550e8400-e29b-41d4-a716-446655440000` |
| `generatePatternId()` | `kp:pattern:<uuid>` | `kp:pattern:6ba7b810-9dad-11d1-80b4-00c04fd430c8` |
| `generateSopId()` | `kp:sop:<uuid>` | `kp:sop:f47ac10b-58cc-4372-a567-0e02b2c3d479` |
| `generateSkillId()` | `kp:skill:<uuid>` | `kp:skill:7c9e6679-7425-40de-944b-e07fc1f90ae7` |

## `sha256(text)`

문자열의 SHA-256 해시를 계산하고 16진수 다이제스트를 반환합니다.

```ts
function sha256(text: string): Promise<string>
```

## 콘텐츠 정제

### `sanitizeSkillMd(content)`

인젝션 공격, 스테가노그래피 문자, 잘못된 형식의 입력을 방지하기 위해 SKILL.md 콘텐츠를 정제합니다.

```ts
import { sanitizeSkillMd } from "@knowledgepulse/sdk";

function sanitizeSkillMd(content: string): SanitizeResult
```

**반환값:**

```ts
interface SanitizeResult {
  content: string;    // 정제된 콘텐츠
  warnings: string[]; // 수행된 수정에 대한 비치명적 경고
}
```

## KPCapture

`KPCapture` 클래스는 에이전트 함수를 래핑하여 투명한 지식 캡처를 제공합니다. 실행 추적을 자동으로 기록하고, 평가하고, 고가치 추적을 레지스트리에 기여합니다.

### 구성

```ts
interface CaptureConfig {
  domain: string;              // 필수. 작업 도메인
  autoCapture?: boolean;       // 기본값: true
  valueThreshold?: number;     // 기본값: 0.75
  privacyLevel?: PrivacyLevel; // 기본값: "aggregated"
  visibility?: Visibility;     // 기본값: "network"
  registryUrl?: string;
  apiKey?: string;
}
```

### `wrap<T>(agentFn)`

비동기 에이전트 함수를 래핑하여 실행을 `ReasoningTrace`로 투명하게 캡처합니다.

**예제:**

```ts
import { KPCapture } from "@knowledgepulse/sdk";

const capture = new KPCapture({
  domain: "customer-support",
  valueThreshold: 0.7,
  apiKey: "kp_your_api_key",
});

async function handleTicket(ticketId: string): Promise<string> {
  return "Resolved: password reset instructions sent";
}

const trackedHandler = capture.wrap(handleTicket);
const result = await trackedHandler("TICKET-123");
```

## KPRetrieval

`KPRetrieval` 클래스는 지식 레지스트리를 검색하고 LLM 소비에 맞게 결과를 포맷하는 메서드를 제공합니다.

### `search(query, domain?)`

레지스트리에서 텍스트 쿼리와 일치하는 지식 유닛을 검색합니다.

### `searchSkills(query, opts?)`

레지스트리에서 SKILL.md 항목을 검색합니다.

### `toFewShot(unit)`

`KnowledgeUnit`을 LLM 컨텍스트에서 퓨샷 프롬프팅에 적합한 일반 텍스트로 포맷합니다.

## 기여 함수

### `contributeKnowledge(unit, config?)`

`KnowledgeUnit`을 유효성 검사하고 레지스트리에 제출합니다.

### `contributeSkill(skillMdContent, visibility?, config?)`

SKILL.md 문서를 레지스트리에 제출합니다.

```ts
import { contributeSkill, generateSkillMd } from "@knowledgepulse/sdk";

const skillMd = generateSkillMd(
  { name: "incident-responder", description: "Handles production incidents" },
  "## Instructions\n\nTriage the incident and coordinate the response team.",
  { knowledge_capture: true, domain: "incident-response", visibility: "org" },
);

const { id } = await contributeSkill(skillMd, "org", {
  apiKey: "kp_your_api_key",
});
```
