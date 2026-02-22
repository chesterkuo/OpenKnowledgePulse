---
sidebar_position: 2
sidebar_label: 의사 결정 트리 편집기
title: 의사 결정 트리 편집기
description: React Flow 캔버스를 사용하여 Step, Condition, Tool 노드로 SOP 의사 결정 트리를 시각적으로 구축하는 방법.
---

# 의사 결정 트리 편집기

의사 결정 트리 편집기는 SOP Studio의 핵심입니다. React Flow 기반의 시각적 캔버스에서 SOP 의사 결정 트리를 구축, 연결, 구성할 수 있습니다.

## 캔버스 개요

편집기는 세 가지 영역으로 구성됩니다:

| 영역 | 용도 |
|------|------|
| **노드 팔레트** (왼쪽) | 노드 타입을 캔버스로 드래그 |
| **캔버스** (중앙) | 의사 결정 트리의 시각적 그래프 |
| **속성 패널** (오른쪽) | 선택한 노드의 속성 편집 |

## 노드 타입

### Step 노드

Step 노드는 SOP에서 단일 작업 또는 지시 사항을 나타냅니다.

| 속성 | 타입 | 설명 |
|------|------|------|
| `step` | string | 고유 단계 식별자 |
| `instruction` | string | 이 단계에서 수행할 작업 |
| `criteria` | Record | 평가 기준을 정의하는 키-값 쌍 |
| `tool_suggestions` | Array | 이 단계를 지원할 수 있는 선택적 도구 |

### Condition 노드

Condition 노드는 분기 로직을 생성합니다. 각 나가는 엣지는 가능한 조건 값을 나타냅니다.

| 속성 | 타입 | 설명 |
|------|------|------|
| `field` | string | 평가할 필드 또는 변수 |
| `conditions` | Record | 조건 값을 작업에 매핑 |
| `sla_min` | number | 분기별 선택적 SLA (분 단위) |

### Tool 노드

Tool 노드는 흐름의 특정 지점에서 호출해야 하는 외부 MCP 도구 또는 API를 참조합니다.

| 속성 | 타입 | 설명 |
|------|------|------|
| `name` | string | 도구 이름 (MCP 도구 레지스트리와 일치해야 함) |
| `when` | string | 도구를 호출하는 조건 |
| `input_template` | Record | 기본 입력 매개변수 |

## 캔버스 사용법

### 노드 추가

왼쪽 팔레트에서 노드 타입을 캔버스로 드래그합니다. 노드는 기본 속성과 함께 나타나며 오른쪽 패널에서 편집할 수 있습니다.

### 노드 연결

노드의 출력 핸들(하단)을 클릭하고 다른 노드의 입력 핸들(상단)로 드래그하여 엣지를 만듭니다. Condition 노드의 경우 각 엣지에 해당하는 조건 값을 레이블로 지정할 수 있습니다.

### 속성 편집

노드를 선택하면 오른쪽 패널에서 속성을 확인하고 편집할 수 있습니다. 변경 사항은 캔버스에 실시간으로 반영됩니다.

### 키보드 단축키

| 단축키 | 동작 |
|--------|------|
| `Ctrl+S` | SOP 저장 |
| `Ctrl+Z` | 실행 취소 |
| `Ctrl+Shift+Z` | 다시 실행 |
| `Delete` | 선택한 노드 또는 엣지 제거 |
| `Ctrl+A` | 모든 노드 선택 |
| `Ctrl+D` | 선택한 노드 복제 |

## 저장 및 내보내기

### 레지스트리에 저장

"Save"를 클릭하거나 `Ctrl+S`를 눌러 SOP를 연결된 KnowledgePulse Registry에 저장합니다. SOP는 `ExpertSOP` 지식 유닛으로 저장됩니다.

### Skill-MD로 내보내기

"Export > Skill-MD"를 클릭하여 SOP에서 `SKILL.md` 파일을 생성합니다. KnowledgePulse 확장 필드가 포함된 휴대 가능한 마크다운 파일이 만들어집니다.

```bash
# Exported SKILL.md structure
---
name: Bug Triage
description: Standard procedure for classifying and routing bugs
version: "1.0"
tags: [engineering, triage]
kp:
  domain: engineering
  knowledge_capture: true
  visibility: org
---

## Steps
1. Classify the bug by severity
   - **Critical**: Escalate to on-call (SLA: 15 min)
   - **Major**: Assign to sprint (SLA: 60 min)
   - **Minor**: Add to backlog
```

### JSON으로 내보내기

"Export > JSON"을 클릭하여 SDK 또는 API에서 사용할 수 있는 원시 `ExpertSOP` JSON 구조를 다운로드합니다.

## 유효성 검사

편집기는 의사 결정 트리를 실시간으로 검증합니다:

- **연결되지 않은 노드** -- 들어오거나 나가는 엣지가 없는 노드가 있으면 경고
- **누락된 지시 사항** -- Step 노드에 지시 사항 텍스트가 없으면 경고
- **중복 단계 ID** -- 두 노드가 동일한 단계 식별자를 공유하면 오류
- **순환 참조** -- 그래프에 순환이 포함되어 있으면 오류

유효성 검사 문제는 영향을 받는 노드에 색상 배지로 표시되며 하단 상태 표시줄에도 나타납니다.
