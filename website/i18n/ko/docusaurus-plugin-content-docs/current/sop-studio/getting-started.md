---
sidebar_position: 1
sidebar_label: 시작하기
title: 시작하기
description: SOP Studio를 시작하고, 레지스트리 연결을 구성하고, 첫 번째 표준 운영 절차를 만드는 방법.
---

# SOP Studio 시작하기

SOP Studio는 KnowledgePulse 레지스트리에 `ExpertSOP` 지식 유닛으로 게시할 수 있는 표준 운영 절차(SOP)를 구축하기 위한 시각적 편집기입니다. 드래그 앤 드롭 캔버스, LLM 추출을 활용한 문서 가져오기, 실시간 협업 기능을 제공합니다.

## 사전 요구 사항

- 실행 중인 KnowledgePulse Registry 인스턴스 (로컬 또는 원격)
- `write` 스코프를 가진 API 키 ([인증](../registry/authentication.md) 참조)

## 구성

SOP Studio를 시작하기 전에 다음 환경 변수를 설정하세요:

```bash
export KP_REGISTRY_URL="http://localhost:3000"
export KP_API_KEY="kp_your_api_key_here"
```

또는 시작 후 SOP Studio 설정 패널에서 구성할 수 있습니다.

## SOP Studio 시작

SOP Studio 개발 서버를 시작합니다:

```bash
cd packages/sop-studio
bun run dev
```

기본적으로 `http://localhost:5173`에서 스튜디오가 열립니다.

## 첫 번째 SOP 만들기

1. **새 SOP** -- 상단 도구 모음에서 "New SOP" 버튼을 클릭합니다.
2. **메타데이터 설정** -- 오른쪽 속성 패널에서 이름, 도메인, 설명을 입력합니다.
3. **단계 추가** -- 팔레트에서 Step 노드를 캔버스로 드래그합니다. 각 단계에는 지시 사항 필드와 선택적 기준이 있습니다.
4. **조건 추가** -- Condition 노드를 사용하여 분기 로직을 만듭니다 (예: "심각도가 높으면 에스컬레이션").
5. **노드 연결** -- 노드 사이에 엣지를 그려 흐름을 정의합니다.
6. **저장** -- `Ctrl+S`를 누르거나 "Save"를 클릭하여 SOP를 레지스트리에 저장합니다.

## SOP 메타데이터 필드

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `name` | string | 예 | 사람이 읽을 수 있는 SOP 이름 |
| `domain` | string | 예 | 작업 도메인 (예: `customer-support`) |
| `description` | string | 아니오 | SOP에 대한 간략한 요약 |
| `visibility` | string | 예 | `private`, `org` 또는 `network` |
| `tags` | string[] | 아니오 | 검색 가능한 태그 |

## 예시: 최소 SOP

```json
{
  "name": "Bug Triage",
  "domain": "engineering",
  "visibility": "org",
  "decision_tree": [
    {
      "step": "classify",
      "instruction": "Classify the bug by severity",
      "conditions": {
        "critical": { "action": "Escalate to on-call", "sla_min": 15 },
        "major": { "action": "Assign to sprint", "sla_min": 60 },
        "minor": { "action": "Add to backlog" }
      }
    }
  ]
}
```

## 다음 단계

- [의사 결정 트리 편집기](./decision-tree-editor.md) -- 노드 타입과 시각적 캔버스에 대해 알아보기
- [문서 가져오기](./document-import.md) -- DOCX 또는 PDF에서 기존 SOP 가져오기
- [협업](./collaboration.md) -- 팀원을 초대하여 실시간으로 편집하기
