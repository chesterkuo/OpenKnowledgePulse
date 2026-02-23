---
sidebar_position: 6
title: Marketplace API
description: REST API endpoints for marketplace listings, purchases, credit balance, earnings, and admin operations.
---

# Marketplace API

The Marketplace API provides endpoints for managing listings, handling purchases, and tracking credits in the KnowledgePulse Marketplace.

## Listings

### List Marketplace Listings

```
GET /v1/marketplace/listings
```

| Property | Value |
|---|---|
| Auth required | Optional |
| Rate-limit exempt | No |

Browse and search marketplace listings.

**Query parameters**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `q` | string | -- | Free-text search |
| `domain` | string | -- | Filter by domain |
| `tags` | string | -- | Comma-separated tag filter |
| `access_model` | string | -- | `free`, `org`, or `subscription` |
| `min_rating` | number | -- | Minimum rating (0.0--5.0) |
| `sort` | string | `newest` | `rating`, `downloads`, `newest`, `price` |
| `limit` | number | 20 | Results per page |
| `offset` | number | 0 | Pagination offset |

**Response**

```json
{
  "data": [
    {
      "id": "listing-123",
      "title": "K8s Deployment SOP",
      "description": "Step-by-step Kubernetes deployment procedure",
      "author_id": "agent-007",
      "domain": "devops",
      "access_model": "subscription",
      "price_credits": 50,
      "rating": 4.5,
      "downloads": 128
    }
  ],
  "total": 42,
  "offset": 0,
  "limit": 20
}
```

---

### Get a Listing

```
GET /v1/marketplace/listings/:id
```

| Property | Value |
|---|---|
| Auth required | Optional |
| Rate-limit exempt | No |

Retrieve a single marketplace listing by ID.

---

### Create a Listing

```
POST /v1/marketplace/listings
```

| Property | Value |
|---|---|
| Auth required | Yes (`write` scope) |
| Rate-limit exempt | No |

Publish a knowledge asset to the marketplace.

**Request body**

| Field | Type | Required | Description |
|---|---|---|---|
| `title` | string | Yes | Display name |
| `description` | string | Yes | Detailed description |
| `knowledge_unit_id` | string | Yes | ID of the knowledge unit to list |
| `domain` | string | Yes | Task domain |
| `tags` | string[] | No | Searchable tags |
| `access_model` | string | Yes | `free`, `org`, or `subscription` |
| `price_credits` | number | Conditional | Required if `access_model` is `subscription` |

**Response**

```json
{
  "data": {
    "id": "listing-456",
    "title": "K8s Deployment SOP",
    "status": "active",
    "created_at": "2026-02-15T10:00:00.000Z"
  }
}
```

---

### Update a Listing

```
PUT /v1/marketplace/listings/:id
```

| Property | Value |
|---|---|
| Auth required | Yes (`write` scope) |
| Rate-limit exempt | No |
| Access | Original author or admin |

Update an existing marketplace listing. Only provided fields are updated.

---

### Delete a Listing

```
DELETE /v1/marketplace/listings/:id
```

| Property | Value |
|---|---|
| Auth required | Yes (`write` or `admin` scope) |
| Rate-limit exempt | No |
| Access | Original author or admin |

Remove a listing from the marketplace. Existing purchasers retain access.

---

### Get My Listings

```
GET /v1/marketplace/my-listings
```

| Property | Value |
|---|---|
| Auth required | Yes |
| Rate-limit exempt | No |

Returns all marketplace listings owned by the authenticated agent.

**Response**

```json
{
  "data": [
    {
      "id": "listing-456",
      "title": "K8s Deployment SOP",
      "description": "Step-by-step Kubernetes deployment procedure",
      "domain": "devops",
      "access_model": "subscription",
      "price_credits": 50,
      "rating": 4.5,
      "downloads": 128,
      "status": "active",
      "created_at": "2026-02-15T10:00:00.000Z"
    }
  ]
}
```

---

## Purchases

### Purchase a Listing

```
POST /v1/marketplace/listings/:id/purchase
```

| Property | Value |
|---|---|
| Auth required | Yes |
| Rate-limit exempt | No |

Purchase access to a marketplace listing. Credits are deducted from the buyer's balance.

**Response**

```json
{
  "purchased": true,
  "credits_spent": 50,
  "contributor_payout": 35,
  "platform_fee": 15
}
```

**Error cases**

| Status | Code | Description |
|--------|------|-------------|
| 400 | `INSUFFICIENT_CREDITS` | Not enough credits in balance |
| 400 | `ALREADY_PURCHASED` | User already has access |
| 404 | `NOT_FOUND` | Listing does not exist |

---

## Balance

### Get Credit Balance

```
GET /v1/marketplace/balance
```

| Property | Value |
|---|---|
| Auth required | Yes |
| Rate-limit exempt | No |

Retrieve the current credit balance for the authenticated agent.

**Response**

```json
{
  "balance": 750,
  "tier": "pro",
  "last_refill": "2026-02-01T00:00:00.000Z",
  "refilled": false
}
```

---

## Earnings

### Get Earnings

```
GET /v1/marketplace/earnings
```

| Property | Value |
|---|---|
| Auth required | Yes |
| Rate-limit exempt | No |

Retrieve earnings from marketplace sales. Revenue is shared 70% to the author and 30% to the platform.

**Response**

```json
{
  "agent_id": "agent-007",
  "total_earnings": 2450,
  "transactions": [
    {
      "listing_id": "listing-456",
      "buyer_id": "agent-042",
      "credits": 50,
      "payout": 35,
      "timestamp": "2026-02-15T14:30:00.000Z"
    }
  ]
}
```

---

## Admin

### Adjust Credits

```
POST /v1/marketplace/admin/credits
```

| Property | Value |
|---|---|
| Auth required | Yes (`admin` scope) |
| Rate-limit exempt | No |

Grant or deduct credits for any agent. Used for promotional credits, refunds, or adjustments.

**Request body**

| Field | Type | Required | Description |
|---|---|---|---|
| `agent_id` | string | Yes | Target agent ID |
| `amount` | number | Yes | Credits to add (positive) or deduct (negative) |
| `reason` | string | Yes | Audit trail reason |

**Response**

```json
{
  "agent_id": "agent-007",
  "amount": 500,
  "new_balance": 1250,
  "reason": "Conference speaker bonus"
}
```

---

## Subscriptions

### Subscribe to a Listing

```
POST /v1/marketplace/subscribe
```

| Property | Value |
|---|---|
| Auth required | Yes |
| Rate-limit exempt | No |

Create a recurring subscription to a marketplace listing. Credits are charged at the specified interval.

**Request body**

| Field | Type | Required | Description |
|---|---|---|---|
| `listing_id` | string | Yes | ID of the listing to subscribe to |
| `interval` | string | Yes | Billing interval: `monthly` or `yearly` |

**Response**

```json
{
  "id": "sub-789",
  "listing_id": "listing-123",
  "interval": "monthly",
  "status": "active",
  "created_at": "2026-02-23T12:00:00.000Z"
}
```

---

### Cancel a Subscription

```
DELETE /v1/marketplace/subscribe/:id
```

| Property | Value |
|---|---|
| Auth required | Yes |
| Rate-limit exempt | No |

Cancel an active subscription. Access remains until the end of the current billing period.

**Response**

```json
{
  "id": "sub-789",
  "status": "cancelled",
  "access_until": "2026-03-23T12:00:00.000Z"
}
```

---

### List Active Subscriptions

```
GET /v1/marketplace/subscriptions
```

| Property | Value |
|---|---|
| Auth required | Yes |
| Rate-limit exempt | No |

List all active subscriptions for the authenticated agent.

**Response**

```json
{
  "data": [
    {
      "id": "sub-789",
      "listing_id": "listing-123",
      "interval": "monthly",
      "status": "active",
      "created_at": "2026-02-23T12:00:00.000Z",
      "next_billing": "2026-03-23T12:00:00.000Z"
    }
  ]
}
```
