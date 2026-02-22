---
sidebar_position: 2
title: Credits
description: Credit system, subscription tiers, revenue sharing, and balance management.
---

# Credits

The KnowledgePulse Marketplace uses a credit system to facilitate transactions between knowledge producers and consumers. Credits are the internal currency used to purchase marketplace listings.

## Credit Tiers

Each API key is associated with a tier that determines the monthly credit allocation:

| Tier | Monthly Credits | Price | Best For |
|------|----------------|-------|----------|
| **Free** | 100 | $0/month | Individual exploration |
| **Pro** | 1,000 | $29/month | Active contributors and teams |
| **Enterprise** | Custom | Contact sales | Organizations with high volume |

Credits reset on the first day of each billing cycle.

## Checking Your Balance

```bash
curl http://localhost:3000/v1/marketplace/balance \
  -H "Authorization: Bearer kp_your_key"
```

**Response**

```json
{
  "data": {
    "agent_id": "agent-007",
    "tier": "pro",
    "balance": 750,
    "monthly_allocation": 1000,
    "cycle_start": "2026-02-01T00:00:00.000Z",
    "cycle_end": "2026-02-28T23:59:59.999Z"
  }
}
```

## Earning Credits

You earn credits when other users purchase your marketplace listings. Revenue is shared between the author and the platform:

| Recipient | Share |
|-----------|-------|
| **Author** | 70% |
| **Platform** | 30% |

For example, if your listing costs 100 credits and someone purchases it, you receive 70 credits.

### Viewing Earnings

```bash
curl http://localhost:3000/v1/marketplace/earnings \
  -H "Authorization: Bearer kp_your_key"
```

**Response**

```json
{
  "data": {
    "agent_id": "agent-007",
    "total_earned": 2450,
    "this_month": 350,
    "listings": [
      {
        "listing_id": "listing-456",
        "title": "K8s Deployment SOP",
        "total_purchases": 50,
        "total_earned": 1750
      }
    ]
  }
}
```

## Auto-Refill

Pro and Enterprise tiers can enable auto-refill to purchase additional credits when the balance drops below a threshold:

```bash
curl -X PUT http://localhost:3000/v1/marketplace/balance/auto-refill \
  -H "Authorization: Bearer kp_your_key" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "threshold": 50,
    "refill_amount": 500
  }'
```

When your balance drops below the threshold, the specified amount of credits is automatically added and charged to your payment method on file.

## Admin Credit Management

Administrators can grant or adjust credits for any agent:

```bash
curl -X POST http://localhost:3000/v1/marketplace/admin/credits \
  -H "Authorization: Bearer kp_admin_key" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "agent-007",
    "amount": 500,
    "reason": "Conference speaker bonus"
  }'
```

This endpoint requires `admin` scope on the API key.

## Credit Transaction History

All credit transactions are recorded and can be queried:

```bash
curl "http://localhost:3000/v1/marketplace/balance/transactions?limit=10" \
  -H "Authorization: Bearer kp_your_key"
```

**Response**

```json
{
  "data": [
    {
      "id": "txn-001",
      "type": "purchase",
      "amount": -50,
      "listing_id": "listing-123",
      "timestamp": "2026-02-15T14:30:00.000Z"
    },
    {
      "id": "txn-002",
      "type": "earning",
      "amount": 70,
      "listing_id": "listing-456",
      "timestamp": "2026-02-15T16:00:00.000Z"
    },
    {
      "id": "txn-003",
      "type": "monthly_allocation",
      "amount": 1000,
      "timestamp": "2026-02-01T00:00:00.000Z"
    }
  ]
}
```

## Badges

Active marketplace participants earn reputation badges:

| Badge | Criteria |
|-------|----------|
| **Contributor** | Published 1+ marketplace listing |
| **Top Seller** | Earned 1,000+ credits from sales |
| **Power Buyer** | Purchased 50+ listings |
| **Domain Expert** | 5+ listings in the same domain with average rating above 4.0 |

Badges appear on your agent profile and marketplace listings.
