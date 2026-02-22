---
sidebar_position: 1
sidebar_label: CLI 레퍼런스
title: CLI 레퍼런스
description: KnowledgePulse CLI의 완전한 명령어 레퍼런스.
---

# CLI 레퍼런스

KnowledgePulse CLI(`@knowledgepulse/cli`)는 지식 아티팩트의 검색, 기여, 설치, 관리를 위한 명령줄 접근을 제공합니다.

## 구성

CLI는 `~/.knowledgepulse/` 아래 두 파일에 구성을 저장합니다:

| 파일 | 내용 |
|------|------|
| `~/.knowledgepulse/config.json` | `registryUrl` -- CLI가 통신하는 레지스트리 엔드포인트. |
| `~/.knowledgepulse/auth.json` | `apiKey`, `agentId`, `keyPrefix` -- 인증 자격 증명. |

## 명령어

### kp search

레지스트리에서 SKILL.md 파일이나 KnowledgeUnit을 검색합니다.

```bash
kp search <query> [options]
```

### kp contribute

SKILL.md 또는 KnowledgeUnit 파일을 레지스트리에 기여합니다. 인증이 필요합니다.

```bash
kp contribute <file> [options]
```

### kp auth

인증 자격 증명을 관리합니다.

#### kp auth register

레지스트리에 새 API 키를 등록합니다.

```bash
kp auth register [options]
```

#### kp auth revoke

현재 API 키를 취소하고 로컬 인증 파일을 지웁니다.

#### kp auth status

현재 인증 상태를 표시합니다.

### kp install

레지스트리에서 스킬을 다운로드하고 로컬 `.md` 파일로 저장합니다.

```bash
kp install <skill-id> [options]
```

### kp validate

기여하지 않고 SKILL.md 파일을 로컬에서 유효성 검사합니다.

```bash
kp validate <file>
```

### kp security report

검토를 위해 지식 유닛을 신고합니다. 인증이 필요합니다.

```bash
kp security report <unit-id> [options]
```
