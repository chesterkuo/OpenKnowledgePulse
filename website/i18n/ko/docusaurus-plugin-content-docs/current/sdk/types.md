---
sidebar_position: 2
sidebar_label: 타입
title: 타입
description: KnowledgePulse 지식 유닛 타입, 열거형, 인터페이스, Zod 스키마, 오류 클래스의 완전한 레퍼런스.
---

# 타입

SDK는 모든 지식 유닛 형태에 대한 TypeScript 인터페이스, 런타임 유효성 검사를 위한 Zod 스키마, 타입이 지정된 오류 클래스 세트를 내보냅니다. 모든 타입은 최상위 `@knowledgepulse/sdk` 진입점에서 가져올 수 있습니다.

## 열거형

### KnowledgeUnitType

```ts
type KnowledgeUnitType = "ReasoningTrace" | "ToolCallPattern" | "ExpertSOP";
```

프로토콜을 통해 캡처, 저장, 공유할 수 있는 세 가지 지식 범주입니다.

### PrivacyLevel

```ts
type PrivacyLevel = "aggregated" | "federated" | "private";
```

| 값 | 설명 |
|-----|------|
| `"aggregated"` | 지식이 완전히 익명화되어 공개 풀에 병합됨 |
| `"federated"` | 지식이 연합 경계 내에 유지; 집계된 인사이트만 외부로 전달 |
| `"private"` | 지식이 원본 에이전트 또는 조직을 벗어나지 않음 |

### Visibility

```ts
type Visibility = "private" | "org" | "network";
```

| 값 | 설명 |
|-----|------|
| `"private"` | 소유 에이전트에게만 표시 |
| `"org"` | 같은 조직 내 모든 에이전트에게 표시 |
| `"network"` | KnowledgePulse 네트워크의 모든 참가자에게 표시 |

## 공통 인터페이스: KnowledgeUnitMeta

모든 지식 유닛은 다음 형태의 `metadata` 필드를 포함합니다:

```ts
interface KnowledgeUnitMeta {
  created_at: string;          // ISO 8601 날짜시간
  agent_id?: string;           // kp:agent:<id>
  framework?: string;          // "langgraph" | "crewai" | "autogen" | "openclaw"
  task_domain: string;         // 예: "customer-support", "code-review"
  success: boolean;
  quality_score: number;       // 0.0 ~ 1.0
  visibility: Visibility;
  privacy_level: PrivacyLevel;
  validated_by?: string[];     // kp:validator:<id>[]
}
```

## 지식 유닛 타입

### ReasoningTrace

도구 호출, 관찰, 오류 복구를 포함한 에이전트 추론 과정의 단계별 기록입니다.

```ts
interface ReasoningTrace {
  "@context": "https://knowledgepulse.dev/schema/v1";
  "@type": "ReasoningTrace";
  id: string;                  // kp:trace:<uuid>
  source_skill?: string;       // kp:skill:<name>:<version>
  metadata: KnowledgeUnitMeta;
  task: {
    objective: string;
    input_schema?: Record<string, unknown>;
  };
  steps: ReasoningTraceStep[];
  outcome: {
    result_summary: string;
    confidence: number;        // 0.0 ~ 1.0
  };
  knowledge_graph_delta?: {
    entities: Array<{ name: string; type: string }>;
    relationships: Array<{ fact: string; valid_from: string }>;
  };
}
```

#### ReasoningTraceStep

추적의 각 단계는 네 가지 유형 중 하나입니다:

```ts
interface ReasoningTraceStep {
  step_id: number;
  type: "thought" | "tool_call" | "observation" | "error_recovery";
  content?: string;
  tool?: {
    name: string;
    mcp_server?: string;
  };
  input?: Record<string, unknown>;
  output_summary?: string;
  latency_ms?: number;
}
```

| 단계 유형 | 설명 |
|-----------|------|
| `"thought"` | 내부 추론 또는 계획 단계 |
| `"tool_call"` | 외부 도구 또는 API 호출 |
| `"observation"` | 도구 호출로부터 받은 결과 또는 출력 |
| `"error_recovery"` | 오류 후 수행된 복구 작업 |

### ToolCallPattern

특정 작업 유형을 수행하는 도구 호출 시퀀스를 설명하는 재사용 가능한 패턴입니다.

```ts
interface ToolCallPattern {
  "@context": "https://knowledgepulse.dev/schema/v1";
  "@type": "ToolCallPattern";
  id: string;                  // kp:pattern:<uuid>
  name: string;
  description: string;
  metadata: KnowledgeUnitMeta;
  trigger_conditions: {
    task_types: string[];
    required_tools?: string[];
  };
  tool_sequence: Array<{
    step: string;
    execution: "parallel" | "sequential";
    tools: Array<{
      name: string;
      query_template?: string;
      input_template?: Record<string, unknown>;
    }>;
    condition?: string;
  }>;
  performance: {
    avg_ms: number;
    success_rate: number;      // 0.0 ~ 1.0
    uses: number;
  };
}
```

### ExpertSOP

조건부 로직이 포함된 의사결정 트리를 가진, 인간 전문가가 작성한 구조화된 표준 운영 절차입니다.

```ts
interface ExpertSOP {
  "@context": "https://knowledgepulse.dev/schema/v1";
  "@type": "ExpertSOP";
  id: string;                  // kp:sop:<uuid>
  name: string;
  domain: string;
  metadata: KnowledgeUnitMeta;
  source: {
    type: "human_expert";
    expert_id: string;
    credentials: string[];     // kp:sbt:<cert>[]
  };
  decision_tree: Array<{
    step: string;
    instruction: string;
    criteria?: Record<string, string>;
    conditions?: Record<string, {
      action: string;
      sla_min?: number;
    }>;
    tool_suggestions?: Array<{
      name: string;
      when: string;
    }>;
  }>;
  validation?: {
    test_cases: Array<{
      input: Record<string, unknown>;
      expected_output: Record<string, unknown>;
    }>;
  };
}
```

## 유니온 타입

`KnowledgeUnit` 타입은 세 가지 지식 유닛 타입의 구별된 유니온입니다:

```ts
type KnowledgeUnit = ReasoningTrace | ToolCallPattern | ExpertSOP;
```

## SKILL.md 타입

### SkillMdFrontmatter

표준 SKILL.md YAML 프론트매터 필드:

```ts
interface SkillMdFrontmatter {
  name: string;
  description: string;
  version?: string;
  author?: string;
  license?: string;
  tags?: string[];
  "allowed-tools"?: string[];
}
```

### SkillMdKpExtension

SKILL.md 프론트매터의 `kp:` 키 아래에 중첩된 KnowledgePulse 확장 필드:

```ts
interface SkillMdKpExtension {
  knowledge_capture?: boolean;
  domain?: string;
  quality_threshold?: number;    // 0.0 ~ 1.0
  privacy_level?: PrivacyLevel;
  visibility?: Visibility;
  reward_eligible?: boolean;
}
```

## SOP 가져오기 타입

SDK는 문서에서 SOP를 가져오기 위한 타입과 함수를 제공합니다. SOP Studio의 문서 가져오기 기능에서 사용되지만 독립적으로도 사용할 수 있습니다.

### LLMConfig

문서 추출에 사용되는 LLM 프로바이더 구성:

```ts
interface LLMConfig {
  provider: "openai" | "anthropic" | "ollama";
  apiKey: string;              // 프로바이더 API 키
  model: string;               // 모델 식별자 (예: "gpt-4o")
  baseUrl?: string;            // 커스텀 엔드포인트 (Ollama에 필수)
  temperature?: number;        // 0.0 ~ 1.0 (기본값: 0.2)
}
```

### ParseResult

문서 파싱 후 `parseDocx` 및 `parsePdf`가 반환:

```ts
interface ParseResult {
  text: string;                // 전체 일반 텍스트 콘텐츠
  sections: Array<{
    heading: string;
    content: string;
    level: number;             // 제목 수준 (1-6)
  }>;
  tables: Array<{
    headers: string[];
    rows: string[][];
  }>;
  metadata: {
    title?: string;
    author?: string;
    pageCount?: number;
  };
}
```

### ExtractionResult

LLM 추출 후 `extractDecisionTree`가 반환:

```ts
interface ExtractionResult {
  name: string;                // 감지된 SOP 이름
  domain: string;              // 감지된 도메인
  description: string;         // 생성된 설명
  decision_tree: Array<{       // ExpertSOP 호환 의사결정 트리
    step: string;
    instruction: string;
    criteria?: Record<string, string>;
    conditions?: Record<string, {
      action: string;
      sla_min?: number;
    }>;
    tool_suggestions?: Array<{
      name: string;
      when: string;
    }>;
  }>;
  confidence: number;          // 0.0 ~ 1.0
  warnings: string[];          // 추출 이슈 또는 모호성
}
```

### 문서 파싱 함수

```ts
import { parseDocx, parsePdf, extractDecisionTree } from "@knowledgepulse/sdk";

// DOCX 파일 파싱
const docxResult: ParseResult = await parseDocx(buffer);

// PDF 파일 파싱
const pdfResult: ParseResult = await parsePdf(buffer);

// LLM을 사용하여 의사결정 트리 추출
const extraction: ExtractionResult = await extractDecisionTree(pdfResult, {
  provider: "openai",
  apiKey: "sk-...",
  model: "gpt-4o",
  temperature: 0.2,
});
```

## Zod 스키마

위의 모든 타입에는 런타임 유효성 검사를 위한 대응하는 Zod 스키마가 있습니다. 스키마는 `@knowledgepulse/sdk`에서 내보내지며 `safeParse` 또는 `parse`와 함께 직접 사용할 수 있습니다.

| 스키마 | 검증 대상 |
|--------|-----------|
| `KnowledgeUnitSchema` | `@type`에 대한 구별된 유니온 (세 가지 유닛 타입 모두) |
| `KnowledgeUnitTypeSchema` | `"ReasoningTrace" \| "ToolCallPattern" \| "ExpertSOP"` |
| `KnowledgeUnitMetaSchema` | `metadata` 객체 |
| `PrivacyLevelSchema` | `"aggregated" \| "federated" \| "private"` |
| `VisibilitySchema` | `"private" \| "org" \| "network"` |
| `ReasoningTraceSchema` | 전체 `ReasoningTrace` 객체 |
| `ReasoningTraceStepSchema` | 추적의 개별 단계 |
| `ToolCallPatternSchema` | 전체 `ToolCallPattern` 객체 |
| `ExpertSOPSchema` | 전체 `ExpertSOP` 객체 |
| `SkillMdFrontmatterSchema` | SKILL.md 프론트매터 필드 |
| `SkillMdKpExtensionSchema` | KnowledgePulse 확장 필드 |

### 유효성 검사 예제

```ts
import { KnowledgeUnitSchema } from "@knowledgepulse/sdk";

const result = KnowledgeUnitSchema.safeParse(unknownData);

if (result.success) {
  // result.data의 타입은 KnowledgeUnit
  const unit = result.data;
  console.log(unit["@type"]); // "ReasoningTrace" | "ToolCallPattern" | "ExpertSOP"
} else {
  // result.error.issues에 상세한 유효성 검사 오류 포함
  for (const issue of result.error.issues) {
    console.error(`${issue.path.join(".")}: ${issue.message}`);
  }
}
```

`KnowledgeUnitSchema`는 `@type` 필드에 키가 지정된 Zod 구별된 유니온입니다. 입력 데이터의 `@type` 값에 따라 올바른 검증기(`ReasoningTraceSchema`, `ToolCallPatternSchema`, `ExpertSOPSchema`)가 자동으로 선택됩니다.

### `parse`를 사용한 엄격한 유효성 검사

결과 객체 대신 예외를 선호하는 경우 `parse`를 사용하세요:

```ts
import { ReasoningTraceSchema } from "@knowledgepulse/sdk";

try {
  const trace = ReasoningTraceSchema.parse(data);
  // trace의 타입은 ReasoningTrace
} catch (err) {
  // .issues 배열이 있는 ZodError
}
```

## 오류 클래스

SDK는 구조화된 오류 처리를 위한 오류 클래스 계층을 내보냅니다.

### KPError (기본)

```ts
class KPError extends Error {
  readonly code: string;
  constructor(message: string, code: string);
}
```

모든 SDK 오류는 `KPError`를 확장합니다. `code` 필드는 기계 판독 가능한 오류 식별자를 제공합니다.

### ValidationError

```ts
class ValidationError extends KPError {
  readonly issues: Array<{ path: string; message: string }>;
  // code: "VALIDATION_ERROR"
}
```

데이터가 Zod 스키마 유효성 검사 또는 SKILL.md 파싱에 실패했을 때 발생합니다. `issues` 배열에는 필드 수준 문제당 하나의 항목이 포함되며, 각각 점 구분 `path`와 사람이 읽을 수 있는 `message`가 있습니다.

### SanitizationError

```ts
class SanitizationError extends KPError {
  readonly field?: string;
  // code: "SANITIZATION_ERROR"
}
```

콘텐츠 정제에서 보이지 않는 유니코드 문자나 프롬프트 인젝션 시도와 같은 위험한 패턴이 감지될 때 발생합니다.

### AuthenticationError

```ts
class AuthenticationError extends KPError {
  // code: "AUTHENTICATION_ERROR"
  // 기본 메시지: "Authentication required"
}
```

API 호출에 인증이 필요하지만 유효한 자격 증명이 제공되지 않았을 때 발생합니다.

### RateLimitError

```ts
class RateLimitError extends KPError {
  readonly retryAfter: number;  // 초
  // code: "RATE_LIMIT_ERROR"
}
```

레지스트리가 429 상태를 반환할 때 발생합니다. `retryAfter` 필드는 재시도 전 대기할 시간(초)을 나타냅니다.

### NotFoundError

```ts
class NotFoundError extends KPError {
  // code: "NOT_FOUND"
}
```

요청된 리소스(지식 유닛, 스킬 등)가 레지스트리에 존재하지 않을 때 발생합니다.

### 오류 처리 예제

```ts
import {
  KPError,
  ValidationError,
  RateLimitError,
} from "@knowledgepulse/sdk";

try {
  await contributeKnowledge(unit, { apiKey: "kp_..." });
} catch (err) {
  if (err instanceof RateLimitError) {
    console.log(`Rate limited. Retry in ${err.retryAfter}s`);
  } else if (err instanceof ValidationError) {
    for (const issue of err.issues) {
      console.error(`  ${issue.path}: ${issue.message}`);
    }
  } else if (err instanceof KPError) {
    console.error(`KP error [${err.code}]: ${err.message}`);
  }
}
```
