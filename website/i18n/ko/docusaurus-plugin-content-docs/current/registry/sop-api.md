---
sidebar_position: 5
sidebar_label: SOP API
title: SOP API
description: SOP 생성, 관리, 버전 관리, 내보내기를 위한 REST API 엔드포인트.
---

# SOP API

SOP API는 KnowledgePulse 레지스트리에서 표준 운영 절차를 관리하기 위한 엔드포인트를 제공합니다. SOP는 추가 버전 관리 및 승인 워크플로우를 가진 `ExpertSOP` 지식 유닛으로 저장됩니다.

## SOP 생성

```
POST /v1/sop
```

## SOP 조회

```
GET /v1/sop/:id
```

## SOP 업데이트

```
PUT /v1/sop/:id
```

업데이트 시 자동으로 새 버전을 생성합니다.

## SOP 삭제

```
DELETE /v1/sop/:id
```

## SOP 버전 목록

```
GET /v1/sop/:id/versions
```

## SOP 버전 승인

```
POST /v1/sop/:id/approve
```

`admin` 범위가 필요합니다.

## Skill-MD로 SOP 내보내기

```
GET /v1/sop/:id/export-skill
```

SOP를 Skill-MD 형식 파일로 내보냅니다. `text/markdown`으로 콘텐츠를 반환합니다.
