---
sidebar_position: 6
sidebar_label: 마켓플레이스 API
title: 마켓플레이스 API
description: 마켓플레이스 목록, 구매, 크레딧 잔액, 수익, 관리자 운영을 위한 REST API 엔드포인트.
---

# 마켓플레이스 API

마켓플레이스 API는 KnowledgePulse 마켓플레이스에서 목록 관리, 구매 처리, 크레딧 추적을 위한 엔드포인트를 제공합니다.

## 목록

### 마켓플레이스 목록 조회

```
GET /v1/marketplace/listings
```

### 목록 상세 조회

```
GET /v1/marketplace/listings/:id
```

### 목록 생성

```
POST /v1/marketplace/listings
```

### 목록 업데이트

```
PUT /v1/marketplace/listings/:id
```

### 목록 삭제

```
DELETE /v1/marketplace/listings/:id
```

## 구매

### 목록 구매

```
POST /v1/marketplace/listings/:id/purchase
```

## 잔액

### 크레딧 잔액 조회

```
GET /v1/marketplace/balance
```

## 수익

### 수익 조회

```
GET /v1/marketplace/earnings
```

수익은 작성자 70%, 플랫폼 30%로 분배됩니다.

## 관리

### 크레딧 조정

```
POST /v1/marketplace/admin/credits
```

`admin` 범위가 필요합니다. 프로모션 크레딧, 환불, 조정에 사용됩니다.
