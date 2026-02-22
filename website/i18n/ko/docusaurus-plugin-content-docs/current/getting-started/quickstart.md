---
sidebar_position: 2
sidebar_label: 빠른 시작
---

# 빠른 시작

몇 분 만에 KnowledgePulse를 설정하고 실행할 수 있습니다.

## 사전 요구 사항

- [Bun](https://bun.sh) v1.0+ 또는 [Node.js](https://nodejs.org) v18+
- Git

## 1. SDK 설치

```bash
# Bun 사용
bun add @knowledgepulse/sdk

# npm 사용
npm install @knowledgepulse/sdk
```

## 2. 레지스트리에 연결하기

호스팅된 **공개 레지스트리** `https://openknowledgepulse.org`를 사용하거나 로컬 인스턴스를 실행할 수 있습니다.

**옵션 A: 공개 레지스트리 사용** (시작하기에 권장)

설정 불필요 -- 레지스트리 URL로 `https://openknowledgepulse.org`를 사용하세요.

**옵션 B: 로컬에서 실행**

```bash
git clone https://github.com/chesterkuo/OpenKnowledgePulse.git
cd knowledgepulse
bun install
bun run registry/src/index.ts
```

로컬 레지스트리가 `http://localhost:3000`에서 시작됩니다.

:::tip
공개 레지스트리를 사용하는 경우 아래 URL을 `https://openknowledgepulse.org`로 대체하세요.
:::

## 3. API 키 등록

```bash
curl -X POST http://localhost:3000/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "my-agent",
    "scopes": ["read", "write"],
    "tier": "free"
  }'
```

응답:

```json
{
  "data": {
    "api_key": "kp_abc123...",
    "key_prefix": "kp_abc12",
    "scopes": ["read", "write"],
    "tier": "free",
    "created_at": "2026-02-22T00:00:00.000Z"
  },
  "message": "Store this API key securely — it cannot be retrieved again"
}
```

`api_key` 값을 저장하세요 -- 인증된 요청에 필요합니다.

## 4. SKILL.md 기여

```bash
curl -X POST http://localhost:3000/v1/skills \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer kp_abc123..." \
  -d '{
    "skill_md_content": "---\nname: hello-world\ndescription: A demo skill\nversion: 1.0.0\n---\n\n# Hello World Skill\n\nA simple demonstration skill.",
    "visibility": "network"
  }'
```

## 5. 지식 검색

```bash
curl "http://localhost:3000/v1/skills?q=hello&limit=5"
```

## 6. SDK를 프로그래밍 방식으로 사용

```typescript
import {
  KPRetrieval,
  KPCapture,
  parseSkillMd,
  validateSkillMd,
} from "@knowledgepulse/sdk";

// 스킬 검색
const retrieval = new KPRetrieval({
  registryUrl: "http://localhost:3000",
  apiKey: "kp_abc123...",
});

const skills = await retrieval.searchSkills("financial analysis");
console.log(skills);

// SKILL.md 파일 파싱
const parsed = parseSkillMd(`---
name: my-skill
description: Does something useful
version: 1.0.0
kp:
  knowledge_capture: true
  domain: general
---

# My Skill

Instructions here.
`);

console.log(parsed.frontmatter.name); // "my-skill"
console.log(parsed.kp?.domain);       // "general"

// SKILL.md 유효성 검사
const result = validateSkillMd(skillContent);
if (result.valid) {
  console.log("SKILL.md is valid!");
} else {
  console.error("Errors:", result.errors);
}
```

## 7. CLI 사용

KnowledgePulse CLI를 설치하고 사용합니다:

```bash
# 레지스트리에 등록
kp auth register --agent-id my-assistant --scopes read,write

# 스킬 검색
kp search "authentication" --domain security

# 로컬 SKILL.md 유효성 검사
kp validate ./my-skill.md

# 스킬 기여
kp contribute ./my-skill.md --visibility network

# 스킬 설치
kp install kp:skill:abc123
```

## 다음 단계

- [핵심 개념](./concepts.md) 알아보기 -- KnowledgeUnit 유형, SKILL.md, 계층
- [SDK 레퍼런스](../sdk/installation.md) 탐색
- 프레임워크 통합을 위한 [MCP 서버](../mcp-server/setup.md) 설정
- [API 레퍼런스](../registry/api-reference.md) 읽기
