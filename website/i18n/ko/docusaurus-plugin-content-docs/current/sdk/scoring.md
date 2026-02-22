---
sidebar_position: 4
sidebar_label: 평가
title: 평가
description: KnowledgePulse SDK가 다차원 평가 알고리즘을 사용하여 추론 추적의 가치를 평가하는 방법.
---

# 평가

SDK에는 `ReasoningTrace`가 네트워크에 기여되기 전에 얼마나 유용한지 평가하는 가치 평가 함수가 포함되어 있습니다. 이는 추적이 공유를 위한 품질 임계값을 충족하는지 결정합니다.

## `evaluateValue(trace)`

```ts
function evaluateValue(trace: ReasoningTrace): Promise<number>
```

**매개변수:**

| 매개변수 | 타입 | 설명 |
|---------|------|------|
| `trace` | `ReasoningTrace` | 평가할 완전한 추론 추적 |

**반환값:** `Promise<number>` -- `0.0`에서 `1.0` 사이의 품질 점수.

**예제:**

```ts
import { evaluateValue } from "@knowledgepulse/sdk";
import type { ReasoningTrace } from "@knowledgepulse/sdk";

const trace: ReasoningTrace = {
  "@context": "https://openknowledgepulse.org/schema/v1",
  "@type": "ReasoningTrace",
  id: "kp:trace:550e8400-e29b-41d4-a716-446655440000",
  metadata: {
    created_at: new Date().toISOString(),
    task_domain: "code-review",
    success: true,
    quality_score: 0,
    visibility: "network",
    privacy_level: "aggregated",
  },
  task: { objective: "Review PR #42 for security issues" },
  steps: [
    { step_id: 0, type: "thought", content: "Analyzing diff for injection vectors" },
    { step_id: 1, type: "tool_call", tool: { name: "github_pr_read" }, input: { pr: 42 } },
    { step_id: 2, type: "observation", content: "Found unsanitized SQL in handler.ts" },
    { step_id: 3, type: "tool_call", tool: { name: "static_analysis" }, input: { file: "handler.ts" } },
    { step_id: 4, type: "observation", content: "Confirmed SQL injection vulnerability" },
  ],
  outcome: {
    result_summary: "Identified 1 critical SQL injection vulnerability",
    confidence: 0.95,
  },
};

const score = await evaluateValue(trace);
console.log(score); // 예: 0.72
```

## 평가 차원

복합 점수는 네 가지 독립적인 차원의 가중 평균입니다:

| 차원 | 가중치 | 범위 | 설명 |
|------|--------|------|------|
| 복잡도 (C) | 25% | 0.0 - 1.0 | 추적의 구조적 풍부함 |
| 참신성 (N) | 35% | 0.0 - 1.0 | 이전에 본 추적과의 차이 정도 |
| 도구 다양성 (D) | 15% | 0.0 - 1.0 | 단계 수 대비 사용된 도구의 다양성 |
| 결과 신뢰도 (O) | 25% | 0.0 - 1.0 | 성공 여부로 조정된 결과 신뢰도 |

```
score = C * 0.25 + N * 0.35 + D * 0.15 + O * 0.25
```

### 복잡도 (C)

단계 유형 다양성, 오류 복구, 추적 길이를 기반으로 추론 추적의 구조적 풍부함을 측정합니다.

```
C = min(1.0, (uniqueTypes / 4) * 0.5 + (errorRecovery > 0 ? 0.3 : 0) + (steps.length / 20) * 0.2)
```

### 참신성 (N)

임베딩 기반 유사성을 사용하여 이전에 평가된 추적과의 차이를 측정합니다.

- **임베딩 모델:** `Xenova/all-MiniLM-L6-v2` (384 차원)
- **수식:** `N = 1.0 - maxCosineSimilarity(embedding, cache)`

`@huggingface/transformers` 패키지가 설치되지 않은 경우, 참신성 차원은 **`0.5`로 대체**됩니다.

### 도구 다양성 (D)

추적에서 사용된 고유 도구의 다양성을 측정합니다.

```
D = min(1.0, (uniqueTools / max(1, steps.length)) * 3)
```

### 결과 신뢰도 (O)

에이전트의 자체 보고된 신뢰도를 작업 실제 성공 여부에 따라 조정합니다.

```
O = outcome.confidence * (metadata.success ? 1.0 : 0.3)
```

## 규칙 기반 재정의

가중 복합 점수 계산 후, 세 가지 규칙 기반 조정이 순서대로 적용됩니다:

| 조건 | 효과 | 근거 |
|------|------|------|
| 단일 생각 전용 단계 | 점수를 `0.1`로 설정 | 하나의 생각 단계만 있는 추적은 최소한의 가치 |
| 2회 이상 오류 복구 + `success: true` | 점수 `+0.1` (1.0 상한) | 여러 오류에서 성공적으로 복구하는 것은 매우 가치있음 |
| 1개 이하의 고유 도구 (도구 사용 시) | 점수 `-0.1` (0.0 하한) | 도구 사용 추적에서 낮은 도구 다양성 벌점 |

:::note
단일 생각 재정의가 우선합니다: 추적에 정확히 하나의 생각 단계가 있으면, 다른 요인에 관계없이 점수가 `0.1`로 설정됩니다. 이후 재정의는 조건이 충족되면 해당 값 위에 적용됩니다.
:::

## 내부 벡터 캐시

평가 모듈은 동일 프로세스 내 호출 간 참신성 계산을 위한 내부 `VectorCache` 인스턴스를 유지합니다.

| 속성 | 값 |
|------|-----|
| 최대 요소 | 1,000 |
| 차원 | 384 |
| 알고리즘 | 브루트포스 선형 스캔 |
| 제거 | 용량 초과 시 가장 오래된 것 우선 |

## 임베더 없이 평가

`@huggingface/transformers`를 설치하지 않아도 평가 함수는 작동합니다. 참신성 차원이 `0.5`로 기본 설정되고 나머지 세 차원과 고정 참신성 중간값에서 최종 점수가 계산됩니다:

```
score = C * 0.25 + 0.5 * 0.35 + D * 0.15 + O * 0.25
       = C * 0.25 + 0.175 + D * 0.15 + O * 0.25
```

개발 및 테스트에는 적합하지만 프로덕션에서는 덜 정밀한 점수를 제공합니다. 최상의 결과를 위해 선택적 의존성을 설치하세요:

```bash
bun add @huggingface/transformers
```
