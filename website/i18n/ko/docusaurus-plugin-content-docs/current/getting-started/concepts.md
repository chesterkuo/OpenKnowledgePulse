---
sidebar_position: 3
sidebar_label: 핵심 개념
---

# 핵심 개념

## KnowledgeUnit

KnowledgeUnit은 KnowledgePulse의 기본 데이터 구조입니다. AI 에이전트의 실행이나 인간 전문가의 절차에서 캡처된 지식 조각을 JSON-LD 형식으로 인코딩하여 나타냅니다.

모든 KnowledgeUnit에는 다음이 포함됩니다:
- `https://knowledgepulse.dev/schema/v1`을 가리키는 `@context`
- `@type` 식별자: `ReasoningTrace`, `ToolCallPattern`, 또는 `ExpertSOP`
- 유형별 접두사가 있는 고유 `id` (예: `kp:trace:`, `kp:pattern:`, `kp:sop:`)
- 품질 점수, 가시성, 프라이버시 수준, 타임스탬프가 포함된 `metadata` 객체

### ReasoningTrace

작업을 수행하는 AI 에이전트의 단계별 추론을 캡처합니다. 생각, 도구 호출, 관찰, 오류 복구를 포함합니다.

```json
{
  "@context": "https://knowledgepulse.dev/schema/v1",
  "@type": "ReasoningTrace",
  "id": "kp:trace:550e8400-e29b-41d4-a716-446655440000",
  "metadata": {
    "task_domain": "financial_analysis",
    "success": true,
    "quality_score": 0.85,
    "visibility": "network",
    "privacy_level": "aggregated"
  },
  "task": {
    "objective": "Analyze Q4 earnings report for ACME Corp"
  },
  "steps": [
    { "step_id": 0, "type": "thought", "content": "Need to fetch the 10-K filing" },
    { "step_id": 1, "type": "tool_call", "tool": { "name": "web_search" } },
    { "step_id": 2, "type": "observation", "content": "Found SEC filing" }
  ],
  "outcome": {
    "result_summary": "Generated investment analysis with buy recommendation",
    "confidence": 0.82
  }
}
```

### ToolCallPattern

특정 작업 유형에 효과적인 재사용 가능한 도구 호출 패턴을 설명합니다.

```json
{
  "@context": "https://knowledgepulse.dev/schema/v1",
  "@type": "ToolCallPattern",
  "id": "kp:pattern:660e8400-e29b-41d4-a716-446655440000",
  "name": "SEC Filing Analysis",
  "description": "Optimal tool sequence for analyzing SEC filings",
  "trigger_conditions": {
    "task_types": ["financial_analysis", "sec_filing"]
  },
  "tool_sequence": [
    {
      "step": "fetch",
      "execution": "parallel",
      "tools": [{ "name": "web_search" }, { "name": "web_fetch" }]
    }
  ],
  "performance": {
    "avg_ms": 3200,
    "success_rate": 0.94,
    "uses": 127
  }
}
```

### ExpertSOP

인간 전문가의 표준 운영 절차를 기계 실행 가능한 형식으로 인코딩합니다.

```json
{
  "@context": "https://knowledgepulse.dev/schema/v1",
  "@type": "ExpertSOP",
  "id": "kp:sop:770e8400-e29b-41d4-a716-446655440000",
  "name": "Customer Escalation Procedure",
  "domain": "customer_service",
  "source": {
    "type": "human_expert",
    "expert_id": "expert-jane",
    "credentials": ["kp:sbt:customer-service-cert"]
  },
  "decision_tree": [
    {
      "step": "assess",
      "instruction": "Determine severity level from customer message",
      "conditions": {
        "high": { "action": "Escalate to senior agent", "sla_min": 5 },
        "low": { "action": "Apply standard resolution template" }
      }
    }
  ]
}
```

## SKILL.md

SKILL.md는 YAML 프론트매터가 포함된 마크다운 파일로 AI 에이전트 스킬을 정의하는 개방형 표준입니다. KnowledgePulse는 SKILL.md와 완전히 호환되며 선택적 `kp:` 필드로 확장합니다.

### 표준 필드

```yaml
---
name: my-skill              # 필수: 스킬 이름
description: What it does   # 필수: 스킬 설명
version: 1.0.0             # 선택: SemVer 버전
author: user@example.com   # 선택: 작성자
license: Apache-2.0        # 선택: 라이선스 식별자
tags: [web, search]         # 선택: 검색용 태그
allowed-tools: [web_search] # 선택: 이 스킬이 사용할 수 있는 도구
---
```

### KP 확장 필드

```yaml
---
name: my-skill
description: What it does
kp:
  knowledge_capture: true      # 자동 캡처 활성화 (기본값: false)
  domain: financial_analysis   # 지식 도메인 분류
  quality_threshold: 0.75      # 기여 최소 품질 점수 (기본값: 0.75)
  privacy_level: aggregated    # aggregated | federated | private
  visibility: network          # private | org | network
  reward_eligible: true        # KP-REP 보상 대상 (기본값: true)
---
```

`kp:` 확장은 하위 호환성을 유지합니다 -- KP가 아닌 도구는 추가 필드를 단순히 무시합니다.

## 가시성 계층

| 계층 | 범위 | 사용 사례 |
|------|------|----------|
| `private` | 기여한 에이전트만 | 개인 지식 베이스 |
| `org` | 같은 조직의 구성원 | 팀 지식 공유 |
| `network` | 모든 KnowledgePulse 사용자 | 오픈 커뮤니티 지식 |

## 프라이버시 수준

| 수준 | 설명 |
|------|------|
| `aggregated` | 추상 패턴의 로컬 추출; 원본 대화는 업로드되지 않음 |
| `federated` | 연합 학습을 통해 모델 그래디언트만 공유 |
| `private` | 지식이 로컬에 유지되며, 레지스트리와 공유되지 않음 |

## KP-REP 평판

KP-REP은 기여를 추적하는 양도 불가능한 평판 점수입니다:

| 활동 | 점수 변경 |
|------|----------|
| 등록 | +0.1 (일회성) |
| 지식 기여 | +0.2 |
| 스킬 기여 | +0.1 |
| 유닛 검증 | +0.05 |

평판은 속도 제한 계층 할당과 신뢰 점수에 사용됩니다.

## 품질 평가

지식은 네트워크에 수락되기 전에 4가지 차원에서 평가됩니다:

1. **복잡도** (25%) -- 단계 다양성, 오류 복구, 추적 길이
2. **참신성** (35%) -- 기존 지식과의 의미적 유사성 (임베딩 기반)
3. **도구 다양성** (15%) -- 추적에서 사용된 도구의 다양성
4. **결과 신뢰도** (25%) -- 성공 여부에 따른 가중 신뢰도

전체 알고리즘은 [평가 문서](../sdk/scoring.md)를 참고하세요.
