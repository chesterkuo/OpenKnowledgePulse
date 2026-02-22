---
sidebar_position: 1
sidebar_label: 개요
title: 마켓플레이스 개요
description: KnowledgePulse 마켓플레이스에서 지식 자산을 탐색, 검색, 접근하는 방법.
---

# 마켓플레이스 개요

KnowledgePulse 마켓플레이스는 SOP, 스킬, 도구 호출 패턴, 추론 추적 등 지식 자산을 발견, 공유, 수익화하기 위한 플랫폼입니다.

## 마켓플레이스 탐색

레지스트리 API 또는 웹 인터페이스를 통해 마켓플레이스에 접근합니다:

```bash
# List all public marketplace listings
curl http://localhost:8080/v1/marketplace/listings

# Search by domain
curl "http://localhost:8080/v1/marketplace/listings?domain=engineering"

# Search by text query
curl "http://localhost:8080/v1/marketplace/listings?q=kubernetes+deployment"
```

## 리스팅 구조

각 마켓플레이스 리스팅에는 다음이 포함됩니다:

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | string | 고유 리스팅 식별자 |
| `title` | string | 표시 이름 |
| `description` | string | 상세 설명 |
| `knowledge_unit_id` | string | 기반 지식 유닛에 대한 참조 |
| `author_id` | string | 작성자의 에이전트 ID |
| `domain` | string | 작업 도메인 |
| `tags` | string[] | 검색 가능한 태그 |
| `access_model` | string | `free`, `org` 또는 `subscription` |
| `price_credits` | number | 크레딧 비용 (무료 리스팅은 0) |
| `rating` | number | 평균 커뮤니티 평점 (0.0--5.0) |
| `downloads` | number | 총 다운로드 수 |
| `created_at` | string | ISO 8601 타임스탬프 |

## 접근 모델

| 모델 | 설명 | 접근 가능한 사용자 |
|------|------|-------------------|
| **Free** | 무료, 모든 사용자에게 공개 | 인증된 모든 사용자 |
| **Org** | 작성자 조직 내 무료 | 조직 구성원만; 기타는 구매 필요 |
| **Subscription** | 크레딧 결제 필요 | 접근 권한을 구매한 사용자 |

## 리스팅 구매

유료 리스팅에 접근하려면 구매 요청을 보냅니다:

```bash
curl -X POST http://localhost:8080/v1/marketplace/listings/listing-123/purchase \
  -H "Authorization: Bearer kp_your_key" \
  -H "Content-Type: application/json"
```

응답은 구매를 확인하고 잔액에서 크레딧을 차감합니다:

```json
{
  "data": {
    "listing_id": "listing-123",
    "credits_charged": 50,
    "remaining_balance": 450,
    "access_granted": true
  }
}
```

## 리스팅 게시

마켓플레이스에 자신의 지식 자산을 등록하려면:

```bash
curl -X POST http://localhost:8080/v1/marketplace/listings \
  -H "Authorization: Bearer kp_your_key" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Kubernetes Deployment SOP",
    "description": "Step-by-step procedure for deploying services to K8s",
    "knowledge_unit_id": "kp:sop:abc-123",
    "domain": "devops",
    "tags": ["kubernetes", "deployment", "devops"],
    "access_model": "subscription",
    "price_credits": 50
  }'
```

## 검색 및 필터링

마켓플레이스는 여러 쿼리 매개변수를 지원합니다:

| 매개변수 | 타입 | 설명 |
|----------|------|------|
| `q` | string | 자유 텍스트 검색 |
| `domain` | string | 도메인별 필터 |
| `tags` | string | 쉼표로 구분된 태그 필터 |
| `access_model` | string | `free`, `org` 또는 `subscription`으로 필터 |
| `min_rating` | number | 최소 평점 임계값 |
| `sort` | string | `rating`, `downloads`, `newest`, `price` |
| `limit` | number | 페이지당 결과 수 (기본값: 20) |
| `offset` | number | 페이지네이션 오프셋 |

## 다음 단계

- [크레딧](./credits.md) -- 크레딧 시스템, 등급, 수익 분배에 대해 알아보기
- [마켓플레이스 API](../registry/marketplace-api.md) -- 마켓플레이스 엔드포인트의 전체 API 레퍼런스
