---
sidebar_position: 1
sidebar_label: MCP 서버 설정
title: MCP 서버 설정
description: KnowledgePulse MCP 서버를 독립 실행 모드 또는 프록시 모드로 설치, 구성, 실행하는 방법.
---

# MCP 서버 설정

KnowledgePulse MCP 서버(`@knowledgepulse/mcp` v1.1.0)는 KnowledgePulse 프로토콜을 MCP 호환 AI 클라이언트가 호출할 수 있는 [Model Context Protocol](https://modelcontextprotocol.io/) 도구 세트로 노출합니다.

## 전송

서버는 **Streamable HTTP** 전송을 사용합니다:

| 엔드포인트 | 메서드 | 설명 |
|------------|--------|------|
| `/mcp` | `POST` | MCP 도구 호출 (Streamable HTTP) |
| `/health` | `GET` | 상태 확인 |

## 이중 모드 운영

### 독립 실행 모드 (기본)

자체 인메모리 스토어를 사용합니다. 로컬 개발과 테스트에 적합합니다.

```bash
bun run packages/mcp-server/src/index.ts
```

### 프록시 모드

`KP_REGISTRY_URL`을 설정하여 실행 중인 레지스트리 인스턴스로 요청을 전달합니다.

```bash
KP_REGISTRY_URL=http://localhost:3000 KP_API_KEY=kp_abc123 \
  bun run packages/mcp-server/src/index.ts
```

## 환경 변수

| 변수 | 설명 | 기본값 |
|------|------|-------|
| `KP_MCP_PORT` | MCP 서버가 수신하는 포트 | `3001` |
| `KP_REGISTRY_URL` | 프록시 모드를 위한 레지스트리 URL | _(미설정)_ |
| `KP_API_KEY` | 프록시 모드에서 인증된 요청과 함께 전송되는 API 키 | _(미설정)_ |

## AI 프레임워크와의 통합

MCP 서버는 Streamable HTTP 전송을 통한 모든 MCP 호환 클라이언트와 작동합니다:

- **Claude Desktop** -- MCP 구성에 서버 URL을 추가합니다.
- **LangGraph** -- MCP 도구 어댑터를 사용하여 서버에 연결합니다.
- **CrewAI** -- 서버를 MCP 도구 프로바이더로 등록합니다.
- **AutoGen** -- MCP 클라이언트 SDK를 통해 에이전트를 서버에 연결합니다.

클라이언트를 `http://localhost:3001/mcp`로 지정하면 6가지 KnowledgePulse 도구를 에이전트가 호출할 수 있습니다. 전체 레퍼런스는 [MCP 도구](./tools.md)를 참고하세요.
