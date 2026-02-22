---
sidebar_position: 4
sidebar_label: 협업
title: 협업
description: WebSocket 연결과 프레즌스 표시를 통한 실시간 SOP 협업 편집.
---

# 협업

SOP Studio는 실시간 협업 편집을 지원하여 여러 사용자가 동시에 같은 SOP를 작업할 수 있습니다. 변경 사항은 WebSocket 연결을 통해 동기화되며 충돌은 자동으로 해결됩니다.

## 협업 활성화

협업에는 WebSocket을 지원하는 실행 중인 레지스트리가 필요합니다. WebSocket이 활성화된 상태에서 레지스트리 인스턴스를 시작하세요:

```bash
export KP_WEBSOCKET_ENABLED=true
bun run registry/src/index.ts
```

## SOP 공유

1. 편집기에서 SOP를 엽니다.
2. 도구 모음에서 "Share" 버튼을 클릭합니다.
3. 생성된 공유 링크를 복사하거나 에이전트 ID로 협력자를 초대합니다.

### 접근 수준

| 수준 | 권한 |
|------|------|
| **Viewer** | SOP에 대한 읽기 전용 접근 |
| **Editor** | 노드, 엣지, 속성 수정 가능 |
| **Owner** | 공유 및 삭제를 포함한 전체 제어 |

## 실시간 편집

여러 사용자가 같은 SOP를 편집할 때:

- **커서 프레즌스** -- 각 협력자의 커서가 색상 표시와 에이전트 ID와 함께 캔버스에 표시됩니다.
- **노드 잠금** -- 사용자가 노드를 선택하면 누가 편집 중인지 나타내는 색상 테두리가 표시됩니다. 다른 사용자는 해당 노드가 선택 해제될 때까지 볼 수는 있지만 수정할 수 없습니다.
- **실시간 업데이트** -- 노드 추가, 삭제, 엣지 변경, 속성 편집이 밀리초 이내에 동기화됩니다.

## WebSocket 연결

SOP Studio는 실시간 업데이트를 위해 레지스트리에 지속적인 WebSocket 연결을 유지합니다.

### 연결 수명 주기

```
1. Client opens SOP → WebSocket CONNECT to /v1/sop/:id/ws
2. Server sends current state + active collaborators
3. Client sends edits as JSON patches
4. Server broadcasts patches to all connected clients
5. Client closes tab → Server removes from presence list
```

### 재연결

연결이 끊어지면 SOP Studio는 지수 백오프로 자동 재연결을 시도합니다:

| 시도 | 지연 |
|------|------|
| 1 | 1초 |
| 2 | 2초 |
| 3 | 4초 |
| 4+ | 8초 (최대) |

연결이 끊어진 동안의 편집은 로컬에 대기열로 저장되며 재연결 시 재생됩니다.

## 충돌 해결

SOP Studio는 충돌 해결을 위해 운영 변환(OT) 전략을 사용합니다:

- **속성 편집** -- 타임스탬프 순서에 따른 최종 쓰기 우선. 두 사용자가 같은 노드 속성을 동시에 편집하면 가장 최근 편집이 우선합니다.
- **구조적 변경** -- 노드 추가와 삭제는 교환 가능합니다. 한 사용자가 노드를 추가하는 동안 다른 사용자가 다른 노드를 삭제하면 두 변경 사항이 모두 깔끔하게 적용됩니다.
- **엣지 충돌** -- 한 사용자가 노드를 삭제하는 동안 다른 사용자가 해당 노드로의 엣지를 만들면 엣지 생성이 거부되고 사용자에게 알림이 전송됩니다.

## 프레즌스 표시

편집기 상단의 협력자 바에는 다음이 표시됩니다:

- 각 활성 협력자의 아바타 또는 이니셜
- 상태를 나타내는 색상 코드 점 (녹색 = 활성, 노란색 = 유휴)
- 에이전트 ID와 현재 선택 항목이 포함된 툴팁

## 권한 및 보안

- 모든 WebSocket 연결은 초기 HTTP 업그레이드 요청을 통한 유효한 API 키가 필요합니다.
- 협력자는 최소한 `read` 스코프가 필요합니다. 편집에는 `write` 스코프가 필요합니다.
- SOP 가시성 설정 (`private`, `org`, `network`)이 공유 링크에 접근할 수 있는 사람을 제어합니다.
- WebSocket 메시지는 REST API에서 사용되는 것과 동일한 Zod 스키마로 유효성 검사됩니다.
