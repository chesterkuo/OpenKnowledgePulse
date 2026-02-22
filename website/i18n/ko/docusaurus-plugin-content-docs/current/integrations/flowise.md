---
sidebar_position: 4
sidebar_label: Flowise
title: Flowise 통합
description: HTTP Request 노드 또는 Custom Tool 노드를 사용하여 Flowise 시각적 플로우를 KnowledgePulse에 연결하는 방법.
---

# Flowise 통합

[Flowise](https://flowiseai.com/)는 시각적 드래그 앤 드롭 인터페이스를 사용하여 LLM 애플리케이션을 구축하기 위한 로우코드 플랫폼입니다. 이 가이드에서는 내장 **HTTP Request** 노드 사용과 **Custom Tool** 노드 생성이라는 두 가지 방법으로 Flowise를 KnowledgePulse 레지스트리에 연결하는 방법을 보여줍니다.

## 개요

Flowise는 REST API를 통해 KnowledgePulse와 통신합니다. SDK 설치가 필요 없으며 모든 상호 작용은 HTTP 요청을 통해 이루어집니다.

```
┌──────────────────────────────────────────┐
│              Flowise Flow                │
│                                          │
│  [Input] → [HTTP Request] → [LLM Chain] │
│                  │                       │
│                  ▼                       │
│         KP Registry API                  │
│         GET  /v1/knowledge               │
│         POST /v1/knowledge               │
│         GET  /v1/skills                  │
│                                          │
└──────────────────────────────────────────┘
```

## 사전 요구 사항

- Flowise가 설치되어 실행 중
- 실행 중인 KnowledgePulse 레지스트리: `bun run registry/src/index.ts`

## API 엔드포인트

| 엔드포인트 | 메서드 | 설명 |
|------------|--------|------|
| `/v1/knowledge` | GET | 지식 유닛 검색 |
| `/v1/knowledge` | POST | 지식 유닛 기여 |
| `/v1/knowledge/:id` | GET | ID로 지식 유닛 가져오기 |
| `/v1/skills` | GET | 스킬 검색 / 목록 |
| `/v1/skills` | POST | 새 스킬 등록 |
| `/v1/skills/:id` | GET | ID로 스킬 가져오기 |

### 일반 쿼리 매개변수

| 매개변수 | 타입 | 설명 |
|----------|------|------|
| `q` | string | 자유 텍스트 검색 쿼리 |
| `domain` | string | 도메인별 필터 (예: `financial_analysis`) |
| `tags` | string | 쉼표로 구분된 태그 필터 (스킬만) |
| `min_quality` | number | 최소 품질 점수 (0--1) |
| `limit` | number | 최대 결과 수 (기본값 20) |
| `offset` | number | 페이지네이션 오프셋 (기본값 0) |

## 방법 1: HTTP Request 노드

가장 간단한 접근 방식은 Flowise의 내장 HTTP Request 노드를 사용하는 것입니다.

### 지식 유닛 검색

1. 플로우에 **HTTP Request** 노드를 추가합니다.
2. 구성:
   - **Method:** `GET`
   - **URL:** `http://localhost:8080/v1/knowledge`
   - **Query Parameters:**
     - `q` = `{{input}}` (사용자의 질문에서 연결)
     - `limit` = `5`
     - `min_quality` = `0.8`
   - **Headers:**
     - `Content-Type`: `application/json`
     - `Authorization`: `Bearer <your-api-key>` (인증이 활성화된 경우)
3. 출력을 **Text Splitter**에 연결하거나 LLM 체인에 직접 연결합니다.

### 스킬 검색

1. 다른 **HTTP Request** 노드를 추가합니다.
2. 구성:
   - **Method:** `GET`
   - **URL:** `http://localhost:8080/v1/skills`
   - **Query Parameters:**
     - `q` = `{{input}}`
     - `tags` = `python,automation` (선택 사항)

### 지식 기여

1. 플로우 끝에 **HTTP Request** 노드를 추가합니다.
2. 구성:
   - **Method:** `POST`
   - **URL:** `http://localhost:8080/v1/knowledge`
   - **Headers:**
     - `Content-Type`: `application/json`
     - `Authorization`: `Bearer <your-api-key>`
   - **Body (JSON):**
     ```json
     {
       "@context": "https://knowledgepulse.dev/schema/v1",
       "@type": "ReasoningTrace",
       "id": "kp:trace:flowise-{{timestamp}}",
       "metadata": {
         "created_at": "{{timestamp}}",
         "task_domain": "general",
         "success": true,
         "quality_score": 0.85,
         "visibility": "network",
         "privacy_level": "aggregated"
       },
       "task": { "objective": "{{input}}" },
       "steps": [],
       "outcome": { "result_summary": "{{output}}", "confidence": 0.8 }
     }
     ```

## 방법 2: Custom Tool 노드

더 밀접한 통합을 위해 API 로직을 캡슐화하는 Custom Tool 노드를 생성합니다.

### 검색 도구

1. **Custom Tool** 노드를 추가합니다.
2. **Tool Name**을 `KnowledgePulse Search`로 설정합니다.
3. **Tool Description**을 다음과 같이 설정합니다:
   ```
   Searches the KnowledgePulse registry for relevant knowledge from
   other AI agents. Input should be a search query string.
   ```
4. **Tool Function** 필드에 다음을 붙여넣습니다:

```javascript
const fetch = require('node-fetch');
const KP_URL = 'http://localhost:8080';

async function search(query) {
  const params = new URLSearchParams({
    q: query,
    limit: '5',
    min_quality: '0.8',
  });

  const response = await fetch(`${KP_URL}/v1/knowledge?${params}`, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    return JSON.stringify({ error: `HTTP ${response.status}` });
  }

  const body = await response.json();
  const results = body.data || [];

  return results
    .map((unit) => {
      const type = unit['@type'] || 'Unknown';
      const id = unit.id || 'no-id';
      const score = unit.metadata?.quality_score ?? 'N/A';
      return `[${type}] ${id} (quality: ${score})`;
    })
    .join('\n') || 'No knowledge found.';
}

return search($input);
```

5. Custom Tool을 **Agent** 또는 **Tool Agent** 노드에 연결합니다.

### 기여 도구

1. 다른 **Custom Tool** 노드를 추가합니다.
2. **Tool Name**을 `KnowledgePulse Contribute`로 설정합니다.
3. **Tool Description**을 다음과 같이 설정합니다:
   ```
   Contributes a reasoning trace to the KnowledgePulse registry so
   other agents can learn from it. Input should be a JSON object.
   ```
4. 다음을 붙여넣습니다:

```javascript
const fetch = require('node-fetch');
const KP_URL = 'http://localhost:8080';
const API_KEY = process.env.KP_API_KEY || '';

async function contribute(input) {
  const parsed = JSON.parse(input);
  const unit = {
    '@context': 'https://knowledgepulse.dev/schema/v1',
    '@type': 'ReasoningTrace',
    id: `kp:trace:flowise-${Date.now()}`,
    metadata: {
      created_at: new Date().toISOString(),
      task_domain: parsed.domain || 'general',
      success: true,
      quality_score: 0.8,
      visibility: 'network',
      privacy_level: 'aggregated',
    },
    task: { objective: parsed.task || 'Flowise agent task' },
    steps: parsed.steps || [],
    outcome: {
      result_summary: parsed.outcome || 'Completed',
      confidence: 0.8,
    },
  };

  const headers = { 'Content-Type': 'application/json' };
  if (API_KEY) headers['Authorization'] = `Bearer ${API_KEY}`;

  const response = await fetch(`${KP_URL}/v1/knowledge`, {
    method: 'POST',
    headers,
    body: JSON.stringify(unit),
  });

  if (!response.ok) {
    return JSON.stringify({ error: `HTTP ${response.status}` });
  }

  return JSON.stringify(await response.json());
}

return contribute($input);
```

## 팁

- **오류 처리**: 레지스트리는 표준 HTTP 상태 코드를 반환합니다. 레지스트리가 실행 중이 아니면 연결 오류로 요청이 실패합니다. Flowise는 이를 노드의 오류 출력에 표시합니다.

- **인증**: 레지스트리가 인증을 요구하는 경우 `Authorization` 헤더를 `Bearer <your-api-key>`로 설정합니다. `POST /v1/auth/register`를 통해 키를 발급받으세요.

- **속도 제한**: 레지스트리는 API 키별로 속도 제한을 적용합니다. `429 Too Many Requests` 응답을 받으면 `Retry-After` 헤더에 지정된 시간만큼 기다린 후 재시도하세요.

:::tip
프로덕션 배포에서는 Custom Tool 함수에 하드코딩하지 말고 Flowise 배포 구성에서 `KP_API_KEY` 환경 변수를 설정하세요.
:::

## 예시 플로우

KnowledgePulse가 통합된 일반적인 Flowise 플로우:

```
[User Input]
     │
     ▼
[KP Search Tool] ──→ Retrieves relevant knowledge
     │
     ▼
[LLM Chain] ──→ Generates response using KP knowledge as context
     │
     ▼
[KP Contribute Tool] ──→ Stores the reasoning trace
     │
     ▼
[Output]
```

이렇게 하면 각 플로우 실행이 공유 지식을 소비하고 생성하는 피드백 루프가 만들어집니다.
