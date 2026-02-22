---
sidebar_position: 3
sidebar_label: SKILL.md
title: SKILL.md
description: KnowledgePulse 확장을 포함한 SKILL.md 파일의 파싱, 생성, 유효성 검사.
---

# SKILL.md

SKILL.md는 YAML 프론트매터와 마크다운 본문을 사용하여 에이전트 스킬을 설명하는 표준 파일 형식입니다. KnowledgePulse SDK는 프론트매터에 선택적 `kp:` 확장 블록을 추가하여 비KP 도구와의 완전한 하위 호환성을 유지하면서 지식 캡처 구성을 가능하게 합니다.

## 함수

### `parseSkillMd(content)`

SKILL.md 문자열을 구조화된 구성 요소로 파싱합니다.

```ts
function parseSkillMd(content: string): ParsedSkillMd
```

**매개변수:**

| 매개변수 | 타입 | 설명 |
|---------|------|------|
| `content` | `string` | 원본 SKILL.md 파일 콘텐츠 |

**반환값:** `ParsedSkillMd`

```ts
interface ParsedSkillMd {
  frontmatter: SkillMdFrontmatter;  // 표준 YAML 필드
  kp?: SkillMdKpExtension;          // KnowledgePulse 확장 (존재하는 경우)
  body: string;                      // 프론트매터 이후의 마크다운 콘텐츠
  raw: string;                       // 원본 입력 문자열
}
```

**예외:** 프론트매터가 누락되거나 YAML이 잘못되었거나 필수 필드가 없는 경우 `ValidationError` 발생.

**예제:**

```ts
import { parseSkillMd } from "@knowledgepulse/sdk";

const content = `---
name: code-reviewer
description: Reviews pull requests for code quality issues
version: "1.0.0"
author: acme-corp
tags:
  - code-review
  - quality
allowed-tools:
  - github_pr_read
  - github_pr_comment
kp:
  knowledge_capture: true
  domain: code-review
  quality_threshold: 0.8
  privacy_level: aggregated
  visibility: network
  reward_eligible: true
---

## Instructions

You are a code review assistant. Analyze the given pull request
and provide actionable feedback on code quality, security, and
best practices.
`;

const parsed = parseSkillMd(content);

console.log(parsed.frontmatter.name);       // "code-reviewer"
console.log(parsed.frontmatter.tags);        // ["code-review", "quality"]
console.log(parsed.kp?.knowledge_capture);   // true
console.log(parsed.kp?.quality_threshold);   // 0.8
console.log(parsed.body);                    // "\n## Instructions\n\nYou are a ..."
```

---

### `generateSkillMd(frontmatter, body, kp?)`

구조화된 구성 요소에서 SKILL.md 문자열을 생성합니다.

```ts
function generateSkillMd(
  frontmatter: SkillMdFrontmatter,
  body: string,
  kp?: SkillMdKpExtension,
): string
```

**매개변수:**

| 매개변수 | 타입 | 설명 |
|---------|------|------|
| `frontmatter` | `SkillMdFrontmatter` | 표준 YAML 프론트매터 필드 |
| `body` | `string` | 마크다운 본문 콘텐츠 |
| `kp` | `SkillMdKpExtension` | _(선택)_ KnowledgePulse 확장 필드 |

**반환값:** YAML 프론트매터 구분자(`---`)가 포함된 완전한 SKILL.md 문자열.

**예제:**

```ts
import { generateSkillMd } from "@knowledgepulse/sdk";

const skillMd = generateSkillMd(
  {
    name: "data-analyst",
    description: "Analyzes datasets and produces insights",
    version: "0.2.0",
    tags: ["analytics", "data"],
    "allowed-tools": ["sql_query", "chart_render"],
  },
  "## Instructions\n\nAnalyze the provided dataset and generate a summary report.",
  {
    knowledge_capture: true,
    domain: "data-analysis",
    quality_threshold: 0.7,
    visibility: "org",
  },
);

console.log(skillMd);
// ---
// name: data-analyst
// description: Analyzes datasets and produces insights
// ...
```

---

### `validateSkillMd(content)`

예외를 발생시키지 않고 SKILL.md 문자열을 유효성 검사합니다. 정제와 스키마 유효성 검사를 모두 실행하여 모든 오류를 수집합니다.

```ts
function validateSkillMd(content: string): {
  valid: boolean;
  errors: string[];
}
```

**매개변수:**

| 매개변수 | 타입 | 설명 |
|---------|------|------|
| `content` | `string` | 원본 SKILL.md 파일 콘텐츠 |

**반환값:** `valid` (불리언)과 `errors` (사람이 읽을 수 있는 문자열 배열)가 포함된 객체. `valid`가 `true`일 때도 `errors` 배열에 치명적이지 않은 경고(예: "Warning: Removed HTML comments")가 포함될 수 있습니다.

**예제:**

```ts
import { validateSkillMd } from "@knowledgepulse/sdk";

// 유효한 문서
const good = validateSkillMd(`---
name: my-skill
description: A helpful skill
---

Instructions here.
`);
console.log(good.valid);   // true
console.log(good.errors);  // []

// 유효하지 않은 문서 (필수 필드 누락)
const bad = validateSkillMd(`---
name: my-skill
---

No description field.
`);
console.log(bad.valid);    // false
console.log(bad.errors);
// [
//   "Invalid SKILL.md frontmatter",
//   "  description: Required"
// ]
```

## SKILL.md 형식

SKILL.md 파일은 YAML 프론트매터 구분자(`---`)로 구분된 두 섹션으로 구성됩니다:

```
---
<YAML 프론트매터>
---

<마크다운 본문>
```

### 표준 프론트매터 필드

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `name` | `string` | 예 | 고유 스킬 식별자 |
| `description` | `string` | 예 | 사람이 읽을 수 있는 설명 |
| `version` | `string` | 아니오 | 시맨틱 버전 |
| `author` | `string` | 아니오 | 작성자 또는 조직 |
| `license` | `string` | 아니오 | SPDX 라이선스 식별자 |
| `tags` | `string[]` | 아니오 | 검색 가능한 태그 |
| `allowed-tools` | `string[]` | 아니오 | 이 스킬이 호출할 수 있는 MCP 도구 |

### KnowledgePulse 확장 (`kp:`)

`kp:` 블록은 프론트매터 내의 선택적 중첩 객체입니다. KnowledgePulse 프로토콜이 이 스킬과 상호작용하는 방식을 구성합니다.

| 필드 | 타입 | 기본값 | 설명 |
|------|------|-------|------|
| `knowledge_capture` | `boolean` | -- | 이 스킬의 자동 지식 캡처 활성화 |
| `domain` | `string` | -- | 지식 분류에 사용되는 작업 도메인 |
| `quality_threshold` | `number` | -- | 캡처된 지식이 기여되기 위한 최소 품질 점수 (0.0-1.0) |
| `privacy_level` | `PrivacyLevel` | -- | 캡처된 지식의 프라이버시 수준 |
| `visibility` | `Visibility` | -- | 캡처된 지식의 가시성 범위 |
| `reward_eligible` | `boolean` | -- | 이 스킬의 기여가 토큰 보상 대상인지 여부 |

## 하위 호환성

`kp:` 확장은 완전한 하위 호환성을 갖도록 설계되었습니다:

- `kp:` 키를 이해하지 못하는 도구는 YAML 파싱 중에 단순히 무시합니다.
- `kp:` 필드는 모두 선택 사항입니다. SKILL.md 파일은 이 필드 없이도 작동합니다.
- 표준 필드(`name`, `description`, `tags` 등)는 변경되지 않습니다.

따라서 기존 SKILL.md 파일에 표준 형식을 사용하는 도구를 손상시키지 않고 KnowledgePulse 구성을 추가할 수 있습니다.

## 오류 처리

`parseSkillMd`가 잘못된 입력을 만나면 구조화된 `issues` 배열과 함께 `ValidationError`를 발생시킵니다:

```ts
import { parseSkillMd, ValidationError } from "@knowledgepulse/sdk";

try {
  parseSkillMd(invalidContent);
} catch (err) {
  if (err instanceof ValidationError) {
    console.error(err.message);
    // "Invalid SKILL.md frontmatter"

    for (const issue of err.issues) {
      console.error(`  ${issue.path}: ${issue.message}`);
      // "description: Required"
      // "kp.quality_threshold: Number must be less than or equal to 1"
    }
  }
}
```

`issues` 배열의 각 항목에는 다음이 포함됩니다:

| 필드 | 타입 | 설명 |
|------|------|------|
| `path` | `string` | 유효하지 않은 필드의 점 구분 경로 (예: `"kp.quality_threshold"`) |
| `message` | `string` | 유효성 검사 실패에 대한 사람이 읽을 수 있는 설명 |

`kp:` 확장 오류의 경우 표준 프론트매터 오류와 구별하기 위해 경로에 `kp.` 접두사가 붙습니다.
