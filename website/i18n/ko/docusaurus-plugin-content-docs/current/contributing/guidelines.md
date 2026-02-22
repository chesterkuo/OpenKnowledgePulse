---
sidebar_position: 2
sidebar_label: 기여 가이드라인
title: 기여 가이드라인
description: KnowledgePulse에 기여하기 위한 코드 스타일, 테스트 규칙, PR 프로세스.
---

# 기여 가이드라인

KnowledgePulse에 기여해 주셔서 감사합니다. 이 문서에서는 프로젝트의 코드 스타일, 테스트 기대치, 풀 리퀘스트 프로세스를 다룹니다.

## 코드 스타일

- **포매터 및 린터:** [Biome](https://biomejs.dev/)가 포매팅과 린팅을 모두 처리합니다. PR 제출 전에 `bun run lint`를 실행하세요.
- **TypeScript:** 모든 패키지에서 엄격 모드가 활성화되어 있습니다. 외부 입력의 런타임 유효성 검사에는 [Zod](https://zod.dev/) v3을 사용하세요.
- **가져오기:** 명시적 이름 가져오기를 선호합니다. 와일드카드(`*`) 가져오기는 피하세요.

## 테스트

- **프레임워크:** `bun:test` (Bun 내장).
- **파일 배치:** 테스트 파일은 소스 파일과 함께 배치합니다. `*.test.ts` 접미사를 사용합니다.
- **스키마 변경:** Zod 스키마나 KnowledgeUnit 구조의 변경에는 마이그레이션 함수와 라운드트립 테스트가 필수입니다.

## 풀 리퀘스트 프로세스

1. 리포지토리를 **포크**하고 `main`에서 기능 브랜치를 생성합니다.
2. 변경 사항을 **구현**합니다.
3. 변경 사항을 커버하는 **테스트를 작성하거나 업데이트**합니다.
4. **전체 테스트 스위트를 실행**합니다: `bun test --recursive`
5. 코드를 **린트**합니다: `bun run lint`
6. `main`에 대한 **풀 리퀘스트를 제출**합니다.

## 커밋 메시지

[Conventional Commits](https://www.conventionalcommits.org/) 스타일을 따릅니다:

```
<type>(<scope>): <short summary>
```

| 타입 | 사용 시점 |
|------|----------|
| `feat` | 새 기능 또는 능력. |
| `fix` | 버그 수정. |
| `docs` | 문서만 변경. |
| `refactor` | 동작 변경 없는 코드 구조 변경. |
| `test` | 테스트 추가 또는 업데이트. |
| `chore` | 빌드 구성, CI, 도구 변경. |

## 라이선스

모든 기여는 프로젝트의 나머지와 일치하는 [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0)으로 라이선스됩니다.
