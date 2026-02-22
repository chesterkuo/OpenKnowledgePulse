---
sidebar_position: 5
sidebar_label: 평가 알고리즘
title: 평가 알고리즘
description: 도메인별 가중치 프로필, 규칙 기반 재정의, 시간적 감쇠, 성능 제약을 포함한 전체 4요소 복합 평가 모델.
---

# 평가 알고리즘

KnowledgePulse 평가 엔진은 네 가지 독립적인 품질 차원을 결합하는 복합 공식을 사용하여 추론 추적을 평가합니다. Phase 2에서 엔진은 다양한 작업 도메인에 평가 강조점을 맞추는 **도메인별 가중치 프로필**을 도입하고, 평가당 **100ms 성능 예산**을 적용합니다.

## 복합 공식

전체 품질 점수는 네 가지 정규화된 차원의 가중 합으로 계산됩니다:

```
score = C x wC + N x wN + D x wD + O x wO
```

가중치(wC, wN, wD, wO)는 도메인에 따라 달라지며, 항상 합이 1.0입니다.

## 도메인별 가중치 프로필

### 사용 가능한 프로필

| 도메인 | wC (복잡도) | wN (참신성) | wD (도구 다양성) | wO (결과) |
|--------|:-:|:-:|:-:|:-:|
| **default** | 0.25 | 0.35 | 0.15 | 0.25 |
| **finance** | 0.20 | 0.25 | 0.10 | 0.45 |
| **code** | 0.20 | 0.30 | 0.30 | 0.20 |
| **medical** | 0.15 | 0.20 | 0.10 | 0.55 |
| **customer_service** | 0.20 | 0.30 | 0.20 | 0.30 |

### 설계 근거

- **Finance**는 재무 분석이 정확하고 검증 가능한 결론을 요구하기 때문에 결과 신뢰도에 높은 가중치를 부여합니다.
- **Code**는 효과적인 코딩 에이전트가 여러 도구(린터, 타입 체커, 테스트 러너)를 활용하기 때문에 도구 다양성에 높은 가중치를 부여합니다.
- **Medical**은 의료 추론에서 정확성이 중요하므로 가장 높은 결과 신뢰도 가중치(0.55)를 가집니다.
- **Customer service**는 창의적이면서도 효과적인 문제 해결을 보상하기 위해 참신성과 결과 신뢰도의 균형을 맞춥니다.

### 도메인 프로필 사용

도메인 선택은 추적 메타데이터를 통해 자동으로 이루어집니다:

```ts
import { evaluateValue } from "@knowledgepulse/sdk";
import type { ReasoningTrace } from "@knowledgepulse/sdk";

const trace: ReasoningTrace = {
  "@context": "https://knowledgepulse.dev/schema/v1",
  "@type": "ReasoningTrace",
  id: "kp:trace:finance-demo-001",
  metadata: {
    created_at: new Date().toISOString(),
    task_domain: "finance", // <- finance 가중치 프로필 선택
    success: true,
    quality_score: 0,
    visibility: "network",
    privacy_level: "aggregated",
  },
  task: { objective: "Analyze TSMC Q4 earnings report" },
  steps: [
    { step_id: 0, type: "thought", content: "Extracting revenue and margin data" },
    { step_id: 1, type: "tool_call", tool: { name: "financial_data_api" }, input: { ticker: "TSM" } },
    { step_id: 2, type: "observation", content: "Revenue: $26.3B, up 14.3% YoY" },
    { step_id: 3, type: "tool_call", tool: { name: "comparison_tool" }, input: { metric: "gross_margin" } },
    { step_id: 4, type: "observation", content: "Gross margin 57.9%, above industry average" },
  ],
  outcome: {
    result_summary: "Strong quarterly performance driven by AI chip demand",
    confidence: 0.92,
  },
};

const score = await evaluateValue(trace);
// finance 가중치에서 높은 결과 신뢰도(0.92)가 더 많이 기여
console.log(score); // 예: 0.78
```

등록된 프로필과 일치하지 않는 도메인은 **default** 가중치를 사용합니다. 알 수 없는 도메인은 조용히 처리됩니다 -- 오류가 발생하지 않습니다.

## 규칙 기반 재정의

가중 복합 점수 계산 후, 세 가지 결정적 재정의가 순서대로 적용됩니다:

### 1. 단일 단계 벌점

```ts
if (steps.length === 1 && steps[0].type === "thought") score = 0.1;
```

### 2. 오류 복구 보너스

```ts
if (errorRecovery > 2 && metadata.success) score = Math.min(1.0, score + 0.1);
```

### 3. 제로 다양성 벌점

```ts
if (uniqueTools <= 1 && steps.some(s => s.tool)) score = Math.max(0.0, score - 0.1);
```

## 참신성을 위한 시간적 감쇠

참신성 차원은 로컬 벡터 캐시에 대한 임베딩 기반 유사성을 사용합니다. 벡터 캐시는 TTL 기반 제거를 지원하여 캐시된 항목이 구성 가능한 시간 후에 만료됩니다.

```ts
import { VectorCache } from "@knowledgepulse/sdk";

const cache = new VectorCache({
  maxElements: 1000,
  dimensions: 384,
  ttlMs: 3600000, // 1시간 -- 항목이 이 시간 후 만료
});
```

## 성능 예산

평가 함수는 일반적인 추적에 대해 **100ms** 이내에 완료되도록 설계되었습니다:

| 구성 요소 | 전략 | 지연 시간 |
|-----------|------|----------|
| 벡터 캐시 | 1,000개 벡터에 대한 브루트포스 선형 스캔 | < 1ms |
| 임베더 | 지연 로드, 첫 호출 후 캐시 | ~50ms 첫 호출, ~5ms 이후 |
| 복합 계산 | 순수 산술, I/O 없음 | < 0.1ms |
| 규칙 재정의 | 세 가지 조건부 확인 | < 0.01ms |

선택적 임베더(`@huggingface/transformers`)가 설치되지 않은 경우, 참신성이 `0.5`로 기본 설정되어 전체 평가가 1ms 미만에 실행됩니다.

## 예제: 도메인 프로필 비교

다른 도메인에서 평가된 동일한 추적은 가중치 차이로 인해 다른 점수를 생성합니다:

```ts
const domains = ["default", "finance", "code", "medical", "customer_service"];

for (const domain of domains) {
  const trace = createTrace({ task_domain: domain });
  const score = await evaluateValue(trace);
  console.log(`${domain}: ${score.toFixed(3)}`);
}

// 예제 출력 (추적 내용에 따라 다름):
// default:          0.623
// finance:          0.714  (높은 신뢰도 보상)
// code:             0.598  (도구 다양성 강조)
// medical:          0.751  (신뢰도 우세)
// customer_service: 0.645  (균형)
```
