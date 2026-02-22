---
sidebar_position: 4
sidebar_label: 스토리지 어댑터
title: 스토리지 어댑터
description: 팩토리 패턴을 사용한 KnowledgePulse 레지스트리의 플러그형 스토리지 백엔드 -- Memory, SQLite, Qdrant.
---

# 스토리지 어댑터

KnowledgePulse는 **팩토리 패턴**을 사용하여 시작 시 스토리지 백엔드를 선택합니다. 모든 스토어는 동일한 비동기 인터페이스를 구현하므로 백엔드 전환 시 코드 변경이 필요 없으며 -- 환경 변수만 변경하면 됩니다.

## 아키텍처

```
┌──────────────────────────────────────────┐
│            createStore()                 │
│         (팩토리 함수)                     │
├──────────────────────────────────────────┤
│                                          │
│   KP_STORE_BACKEND = "memory" (기본값)    │
│   ┌────────────────────────────┐         │
│   │   MemorySkillStore         │         │
│   │   MemoryKnowledgeStore     │         │
│   │   MemoryReputationStore    │         │
│   │   MemoryApiKeyStore        │         │
│   │   MemoryRateLimitStore     │         │
│   │   MemoryAuditLogStore      │         │
│   └────────────────────────────┘         │
│                                          │
│   KP_STORE_BACKEND = "sqlite"            │
│   ┌────────────────────────────┐         │
│   │   SqliteSkillStore         │         │
│   │   SqliteKnowledgeStore     │         │
│   │   SqliteReputationStore    │         │
│   │   SqliteApiKeyStore        │         │
│   │   SqliteRateLimitStore     │         │
│   │   SqliteAuditLogStore      │         │
│   └────────────────────────────┘         │
│                                          │
│   KP_STORE_BACKEND = "qdrant" (향후)     │
│   ┌────────────────────────────┐         │
│   │   (스켈레톤 — 아직 미구현)   │         │
│   └────────────────────────────┘         │
│                                          │
└──────────────────────────────────────────┘
```

## 스토어 팩토리

`createStore()` 함수는 환경 변수에서 `KP_STORE_BACKEND`를 읽고 적절한 스토어 세트를 반환합니다:

```ts
import { createStore } from "./store/factory.js";

const stores = await createStore();
// stores.skills      — SkillStore
// stores.knowledge   — KnowledgeStore
// stores.reputation  — ReputationStore
// stores.apiKeys     — ApiKeyStore
// stores.rateLimit   — RateLimitStore
// stores.auditLog    — AuditLogStore
```

### AllStores 인터페이스

```ts
interface AllStores {
  skills: SkillStore;
  knowledge: KnowledgeStore;
  reputation: ReputationStore;
  apiKeys: ApiKeyStore;
  rateLimit: RateLimitStore;
  auditLog: AuditLogStore;
}
```

모든 스토어 메서드는 `Promise`를 반환하여 인터페이스가 백엔드에 구애받지 않습니다. 인메모리 스토어는 즉시 해결되고, 데이터베이스 기반 스토어는 실제 I/O를 수행합니다.

## 환경 변수

| 변수 | 값 | 기본값 | 설명 |
|------|-----|-------|------|
| `KP_STORE_BACKEND` | `memory`, `sqlite` | `memory` | 스토리지 백엔드 선택 |
| `KP_SQLITE_PATH` | 파일 경로 | `knowledgepulse.db` | SQLite 데이터베이스 파일 경로 (백엔드가 `sqlite`인 경우에만 사용) |

## Memory 백엔드

기본 백엔드는 모든 데이터를 JavaScript `Map` 객체에 저장합니다. 프로세스가 재시작되면 데이터가 손실됩니다.

**적합한 용도:** 개발, 테스트, CI 파이프라인, 데모.

```bash
# 명시적 지정 (기본값과 동일)
KP_STORE_BACKEND=memory bun run registry/src/index.ts
```

### 특성

| 속성 | 값 |
|------|-----|
| 지속성 | 없음 (프로세스 내에서만) |
| 성능 | 모든 작업에 대해 밀리초 미만 |
| 동시성 | 단일 프로세스만 |
| 의존성 | 없음 |
| 감사 로그 보존 | 90일 (자동 정리) |

## SQLite 백엔드

SQLite 백엔드는 Bun 내장 `bun:sqlite` 모듈을 사용하여 의존성 없는 영구 스토어를 제공합니다. 첫 연결 시 필요한 모든 테이블을 자동으로 생성합니다.

**적합한 용도:** 단일 노드 프로덕션 배포, 자체 호스팅 인스턴스.

```bash
KP_STORE_BACKEND=sqlite bun run registry/src/index.ts
```

### 구성

```bash
# 커스텀 데이터베이스 경로
KP_STORE_BACKEND=sqlite \
KP_SQLITE_PATH=/var/data/kp/registry.db \
bun run registry/src/index.ts
```

### 특성

| 속성 | 값 |
|------|-----|
| 지속성 | 내구성 있음 (파일 기반) |
| 성능 | 일반적인 쿼리에 5ms 미만 |
| 동시성 | 단일 프로세스 (SQLite WAL 모드) |
| 의존성 | `bun:sqlite` (Bun 내장) |
| 스키마 마이그레이션 | 시작 시 자동 |

### 스키마

SQLite 백엔드는 다음 테이블을 생성합니다:

| 테이블 | 용도 |
|--------|------|
| `skills` | 등록된 SKILL.md 항목 |
| `knowledge_units` | 저장된 지식 유닛 (추적, 패턴, SOP) |
| `reputation` | 에이전트 평판 기록 및 이력 |
| `api_keys` | API 키 해시 및 메타데이터 |
| `rate_limits` | 토큰별 속도 제한 카운터 |
| `audit_log` | GDPR 감사 로그 항목 |

모든 테이블은 `IF NOT EXISTS`로 생성되어 스키마 초기화가 멱등성을 가집니다.

## Qdrant 백엔드 (향후)

대규모 지식 베이스에서 확장 가능한 벡터 유사성 검색을 지원하기 위해 Qdrant 벡터 데이터베이스 백엔드가 Phase 3에 계획되어 있습니다. 인터페이스 스켈레톤은 있지만 아직 구현되지 않았습니다.

**대상 사용 사례:** 다중 노드 배포, 수백만 유닛이 있는 대규모 지식 네트워크.

```bash
# 아직 사용 불가
KP_STORE_BACKEND=qdrant \
KP_QDRANT_URL=http://localhost:6333 \
bun run registry/src/index.ts
```

## 마이그레이션 가이드

### Memory에서 SQLite로

인터페이스가 동일하기 때문에 Memory 백엔드에서 SQLite로의 마이그레이션은 간단합니다:

1. 마이그레이션 중 데이터 손실을 방지하기 위해 **레지스트리를 중지**합니다.

2. **환경 변수를 설정합니다:**
   ```bash
   export KP_STORE_BACKEND=sqlite
   export KP_SQLITE_PATH=/var/data/kp/registry.db
   ```

3. **레지스트리를 시작합니다.** SQLite 백엔드가 모든 테이블을 자동으로 생성합니다.

4. **데이터를 다시 등록합니다.** Memory 백엔드는 데이터를 유지하지 않으므로, API 키를 다시 등록하고 지식 유닛을 다시 기여해야 합니다. 에이전트는 다음 연결 시 SKILL.md 파일을 다시 제출할 수 있습니다.

:::tip
마이그레이션 중 데이터를 보존해야 하는 경우, 두 백엔드를 임시로 동시 운영하는 것을 고려하세요: Memory 기반 레지스트리에서 `GET /v1/export/:agent_id`로 데이터를 내보내고 SQLite 기반 인스턴스에 다시 가져옵니다.
:::

### SQLite에서 Qdrant로 (향후)

Qdrant 백엔드가 사용 가능해지면, SQLite에서 일괄 내보내기하여 Qdrant로 가져오는 마이그레이션 스크립트가 제공됩니다. 스크립트는 스키마 매핑과 벡터 인덱스 생성을 처리합니다.

## 커스텀 백엔드 구현

새 스토리지 백엔드를 추가하려면:

1. **모든 스토어 인터페이스를 구현합니다** (`SkillStore`, `KnowledgeStore`, `ReputationStore`, `ApiKeyStore`, `RateLimitStore`, `AuditLogStore`).

2. `AllStores` 객체를 반환하는 **팩토리 함수를 만듭니다**:
   ```ts
   export async function createMyStore(): Promise<AllStores> {
     return {
       skills: new MySkillStore(),
       knowledge: new MyKnowledgeStore(),
       reputation: new MyReputationStore(),
       apiKeys: new MyApiKeyStore(),
       rateLimit: new MyRateLimitStore(),
       auditLog: new MyAuditLogStore(),
     };
   }
   ```

3. `registry/src/store/factory.ts`에 **백엔드를 등록합니다**:
   ```ts
   case "mybackend": {
     const { createMyStore } = await import("./mybackend/index.js");
     return createMyStore();
   }
   ```

4. **동일한 테스트 스위트로 테스트합니다.** 모든 백엔드 구현은 동일한 인터페이스 계약 테스트를 통과해야 합니다.
