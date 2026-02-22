---
sidebar_position: 1
sidebar_label: 설치
title: 설치
description: TypeScript 및 JavaScript 프로젝트를 위한 KnowledgePulse SDK 설치 및 구성.
---

# 설치

`@knowledgepulse/sdk` 패키지는 KnowledgePulse 프로토콜을 위한 TypeScript/JavaScript 타입, 유효성 검사 스키마, 지식 캡처, 검색, 평가, SKILL.md 유틸리티를 제공합니다.

- **버전:** 0.1.0
- **라이선스:** Apache-2.0

## 설치

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
<TabItem value="bun" label="Bun" default>

```bash
bun add @knowledgepulse/sdk
```

</TabItem>
<TabItem value="npm" label="npm">

```bash
npm install @knowledgepulse/sdk
```

</TabItem>
<TabItem value="yarn" label="Yarn">

```bash
yarn add @knowledgepulse/sdk
```

</TabItem>
<TabItem value="pnpm" label="pnpm">

```bash
pnpm add @knowledgepulse/sdk
```

</TabItem>
</Tabs>

## 모듈 형식

SDK는 완전한 TypeScript 선언과 함께 듀얼 형식 패키지로 제공됩니다. ESM과 CommonJS 모두 기본 지원됩니다.

### ESM (권장)

```ts
import {
  KPCapture,
  KPRetrieval,
  evaluateValue,
  parseSkillMd,
  KnowledgeUnitSchema,
} from "@knowledgepulse/sdk";
```

### CommonJS

```js
const {
  KPCapture,
  KPRetrieval,
  evaluateValue,
  parseSkillMd,
  KnowledgeUnitSchema,
} = require("@knowledgepulse/sdk");
```

## 내보내기 맵

패키지는 조건부 내보내기가 있는 단일 진입점(`.`)을 노출합니다:

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  }
}
```

| 경로 | 형식 | 파일 |
|------|------|------|
| `types` | TypeScript 선언 | `dist/index.d.ts` |
| `import` | ESM | `dist/index.js` |
| `require` | CommonJS | `dist/index.cjs` |

## 의존성

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `zod` | ^3.23.0 | 모든 지식 유닛 타입에 대한 런타임 유효성 검사 스키마 |
| `yaml` | ^2.4.0 | SKILL.md YAML 프론트매터 파싱 및 생성 |

### 선택적 의존성

| 패키지 | 버전 | 크기 | 용도 |
|--------|------|------|------|
| `@huggingface/transformers` | ^3.0.0 | ~80 MB | 참신성 평가를 위한 임베딩 모델 (`Xenova/all-MiniLM-L6-v2`) |

`@huggingface/transformers` 패키지는 선택적 의존성으로 나열됩니다. `evaluateValue()` 평가 함수의 참신성 차원에서만 사용됩니다. 설치되지 않으면 참신성 점수는 기본값 `0.5`로 대체됩니다.

명시적으로 설치하려면:

```bash
bun add @huggingface/transformers
```

## TypeScript

전체 타입 선언이 패키지의 `dist/index.d.ts`에 포함되어 있습니다. 추가 `@types/*` 패키지가 필요하지 않습니다.

SDK는 TypeScript 5.0 이상을 요구하며 ES2020을 대상으로 합니다. `tsconfig.json`에서 `moduleResolution: "bundler"` 또는 `"node16"`을 사용하면 내보내기 맵이 자동으로 해결됩니다.

```jsonc
// tsconfig.json (권장 설정)
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ES2020",
    "strict": true
  }
}
```

## 설치 확인

패키지가 올바르게 설치되었는지 빠르게 확인합니다:

```ts
import { KnowledgeUnitSchema, generateTraceId } from "@knowledgepulse/sdk";

console.log(generateTraceId());
// kp:trace:550e8400-e29b-41d4-a716-446655440000

console.log(typeof KnowledgeUnitSchema.parse);
// "function"
```

## 다음 단계

- [타입](./types.md) -- 모든 지식 유닛 타입과 Zod 스키마 탐색
- [SKILL.md](./skill-md.md) -- SKILL.md 파일 파싱, 생성, 유효성 검사
- [평가](./scoring.md) -- 가치 평가 알고리즘 이해
- [유틸리티](./utilities.md) -- ID 생성기, 해싱, 정제, 캡처, 검색
