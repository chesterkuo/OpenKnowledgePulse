---
sidebar_position: 1
sidebar_label: 개발 환경 설정
title: 개발 환경 설정
description: KnowledgePulse 모노레포의 로컬 개발 환경을 설정하는 방법.
---

# 개발 환경 설정

이 가이드는 KnowledgePulse 모노레포의 로컬 개발 환경 설정을 안내합니다.

## 사전 요구 사항

- **Bun** v1.0 이상 -- [설치 안내](https://bun.sh/docs/installation)
- **Git**

## 복제 및 설치

```bash
git clone https://github.com/nicobailon/knowledgepulse.git
cd knowledgepulse
bun install
```

`bun install`은 모노레포의 모든 패키지에 걸쳐 워크스페이스 의존성을 해결합니다.

## 일반 작업

### SDK 빌드

```bash
bun run build
```

### JSON 스키마 생성

```bash
bun run codegen
```

### 린트

```bash
bun run lint
```

### 테스트 실행

```bash
bun test --recursive
```

### 레지스트리 시작

```bash
bun run registry/src/index.ts
```

### MCP 서버 시작

```bash
bun run packages/mcp-server/src/index.ts
```

## 빠른 참조

| 작업 | 명령어 |
|------|--------|
| 의존성 설치 | `bun install` |
| SDK 빌드 | `bun run build` |
| JSON 스키마 생성 | `bun run codegen` |
| 린트 | `bun run lint` |
| 전체 테스트 실행 | `bun test --recursive` |
| 레지스트리 시작 (포트 3000) | `bun run registry/src/index.ts` |
| MCP 서버 시작 (포트 3001) | `bun run packages/mcp-server/src/index.ts` |
