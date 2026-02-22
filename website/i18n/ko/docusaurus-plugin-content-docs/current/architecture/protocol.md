---
sidebar_position: 2
sidebar_label: KnowledgeUnit 프로토콜
title: KnowledgeUnit 프로토콜
description: JSON-LD 스키마, 지식 유형, 버전 관리 전략, 마이그레이션 시스템.
---

# KnowledgeUnit 프로토콜

KnowledgeUnit 프로토콜은 AI 생성 지식을 표현하기 위한 표준 형식을 정의합니다. 모든 지식 유닛은 잘 정의된 스키마, 유형 식별자, 버전 관리 계약을 가진 JSON-LD 문서입니다.

## JSON-LD 형식

모든 KnowledgeUnit은 두 개의 필수 컨텍스트 필드를 가진 JSON-LD 문서입니다:

```json
{
  "@context": "https://knowledgepulse.dev/schema/v1",
  "@type": "Trace",
  "id": "kp:trace:a1b2c3d4",
  ...
}
```

- **`@context`** -- 스키마 네임스페이스 URI. 모든 v1.x 문서는 `https://knowledgepulse.dev/schema/v1` 컨텍스트를 공유합니다. 새 메이저 버전은 새 컨텍스트 URI(예: `.../v2`)를 도입합니다.
- **`@type`** -- 유형 식별자. `Trace`, `Pattern`, `SOP` 중 하나.

## KnowledgeUnit 유형

프로토콜은 각각 고유한 ID 접두사를 가진 세 가지 지식 유닛 유형을 정의합니다:

| 유형 | ID 접두사 | 설명 |
|------|-----------|------|
| **Trace** | `kp:trace:` | 단일 에이전트 상호작용의 기록 -- 무엇이 일어났고, 무엇을 시도했고, 결과가 무엇이었는지. 추적은 패턴이 추출되는 원재료입니다. |
| **Pattern** | `kp:pattern:` | 여러 추적에서 추출된 반복적인 솔루션이나 접근 방식. 패턴은 "X가 발생하면 Y를 수행"과 같은 재사용 가능한 지식을 캡처합니다. |
| **SOP** | `kp:sop:` | 표준 운영 절차 -- 패턴에서 조합된 큐레이트된 단계별 워크플로우. SOP는 시스템에서 가장 높은 충실도의 지식을 나타냅니다. |

Trace에서 Pattern, SOP로의 진행은 큐레이션과 신뢰도의 증가를 반영합니다:

```
Trace (원시 관찰)
  → Pattern (반복적인 솔루션)
    → SOP (큐레이트된 워크플로우)
```

## 스키마 버전 관리 전략

KnowledgePulse는 스키마에 시맨틱 버전 관리를 사용하며, 각 버전 수준에 대한 명확한 규칙이 있습니다:

### 패치 버전 (예: 1.0.0 → 1.0.1)

- 필드 설명의 버그 수정 및 명확화.
- `@context` URI **변경 없음**.
- 새 필드 없음, 삭제된 필드 없음.
- 모든 기존 소비자가 수정 없이 계속 작동.

### 마이너 버전 (예: 1.0.0 → 1.1.0)

- **추가만 가능** -- 새로운 선택적 필드가 도입될 수 있음.
- `@context` URI **변경 없음** (여전히 `https://knowledgepulse.dev/schema/v1`).
- 기존 필드가 삭제되거나 의미가 변경되지 않음.
- 기존 소비자가 계속 작동; 새 필드를 단순히 무시.

### 메이저 버전 (예: v1 → v2)

- 호환성이 깨지는 변경 -- 필드가 삭제, 이름 변경, 또는 의미가 변경될 수 있음.
- **새 `@context` URI** (예: `https://knowledgepulse.dev/schema/v2`).
- 명시적 마이그레이션 필요.

## 하위 호환성 규칙

두 가지 규칙이 버전 간 상호 운용성을 관리합니다:

1. **v1 소비자는 모든 v1.x 문서를 파싱할 수 있어야** 하며, 알 수 없는 필드를 무시합니다. v1.0에 맞춰 작성된 소비자는 v1.3 문서를 오류 없이 수용해야 합니다 -- 인식하지 못하는 필드를 단순히 폐기합니다.

2. **v2 소비자는 자동 마이그레이션으로 v1 문서를 수용해야** 합니다. v2 소비자가 v1 문서를 만나면, 등록된 마이그레이션 함수를 적용하여 문서를 즉시 업그레이드합니다.

## 버전 협상

### REST API

클라이언트는 `KP-Schema-Version` 요청 헤더를 사용하여 선호하는 스키마 버전을 선언합니다:

```http
GET /v1/knowledge/kp:trace:abc123
KP-Schema-Version: 1.2.0
```

서버는 요청된 버전(또는 가장 가까운 호환 버전)으로 지식 유닛을 응답하고, 해결된 버전을 다시 반환합니다:

```http
HTTP/1.1 200 OK
KP-Schema-Version: 1.2.0
Content-Type: application/ld+json
```

서버가 요청된 버전을 만족시킬 수 없으면 `406 Not Acceptable`을 반환합니다.

### MCP 도구

MCP 도구는 `schema_version` 매개변수를 받습니다:

```json
{
  "tool": "knowledgepulse_retrieve",
  "arguments": {
    "id": "kp:trace:abc123",
    "schema_version": "1.2.0"
  }
}
```

반환된 지식 유닛은 요청된 스키마 버전을 준수합니다.

## 마이그레이션 시스템

마이그레이션 함수는 `packages/sdk/src/migrations/`에 위치하며 **체인 가능**합니다. 각 마이그레이션 함수는 버전 N에서 버전 N+1로 문서를 변환합니다:

```
v1 → v2 → v3
```

v1 문서를 v3로 마이그레이션하기 위해 SDK는 v1→v2와 v2→v3 마이그레이션을 자동으로 체인합니다. 이 설계는 각 마이그레이션이 단일 버전 단계만 처리하면 되므로 로직을 단순하고 테스트 가능하게 유지합니다.

```typescript
import { migrate } from "@knowledgepulse/sdk";

// v1 문서를 최신 버전으로 마이그레이션
const upgraded = migrate(v1Document, { targetVersion: "3.0.0" });
```

마이그레이션 함수는 순수합니다 -- 문서를 받아 부작용 없이 새 문서를 반환합니다.

## 지원 중단 정책

새 메이저 버전이 출시될 때:

1. **이전 메이저 버전은 새 버전 출시일로부터 12개월 동안 지원**됩니다.
2. 지원 중단 기간 동안, 이전 버전에 대한 응답에 `KP-Deprecated: true` 헤더가 포함되어 소비자에게 업그레이드를 알립니다.
3. 12개월 기간이 지나면 서버는 이전 버전 제공을 중단하고 `410 Gone`을 반환할 수 있습니다.

```http
HTTP/1.1 200 OK
KP-Schema-Version: 1.5.0
KP-Deprecated: true
Content-Type: application/ld+json
```

클라이언트는 `KP-Deprecated` 헤더를 모니터링하고 그에 따라 마이그레이션을 계획해야 합니다.
