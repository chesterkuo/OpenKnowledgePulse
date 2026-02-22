---
sidebar_position: 2
title: クレジット
description: クレジットシステム、サブスクリプションティア、収益分配、残高管理。
sidebar_label: クレジット
---

# クレジット

KnowledgePulse マーケットプレイスは、ナレッジの生産者と消費者の間のトランザクションを促進するためにクレジットシステムを使用しています。クレジットはマーケットプレイスリスティングを購入するための内部通貨です。

## クレジットティア

各 API キーには、月間クレジット割り当てを決定するティアが関連付けられています：

| ティア | 月間クレジット | 価格 | 推奨用途 |
|------|----------------|-------|----------|
| **Free** | 100 | $0/月 | 個人での探索 |
| **Pro** | 1,000 | $29/月 | アクティブなコントリビューターとチーム |
| **Enterprise** | カスタム | 営業にお問い合わせ | 大量利用の組織 |

クレジットは各請求サイクルの初日にリセットされます。

## 残高の確認

```bash
curl http://localhost:8080/v1/marketplace/balance \
  -H "Authorization: Bearer kp_your_key"
```

**レスポンス**

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

## クレジットの獲得

他のユーザーがマーケットプレイスリスティングを購入すると、クレジットを獲得できます。収益は著者とプラットフォーム間で分配されます：

| 受取者 | 分配率 |
|-----------|-------|
| **著者** | 70% |
| **プラットフォーム** | 30% |

例えば、リスティングの価格が 100 クレジットで誰かが購入した場合、著者は 70 クレジットを受け取ります。

### 収益の確認

```bash
curl http://localhost:8080/v1/marketplace/earnings \
  -H "Authorization: Bearer kp_your_key"
```

**レスポンス**

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

## オートリフィル

Pro と Enterprise ティアでは、残高が閾値を下回った場合に追加クレジットを自動購入するオートリフィルを有効にできます：

```bash
curl -X PUT http://localhost:8080/v1/marketplace/balance/auto-refill \
  -H "Authorization: Bearer kp_your_key" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "threshold": 50,
    "refill_amount": 500
  }'
```

残高が閾値を下回ると、指定された金額のクレジットが自動的に追加され、登録されている支払い方法に請求されます。

## 管理者のクレジット管理

管理者は任意のエージェントのクレジットを付与または調整できます：

```bash
curl -X POST http://localhost:8080/v1/marketplace/admin/credits \
  -H "Authorization: Bearer kp_admin_key" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "agent-007",
    "amount": 500,
    "reason": "Conference speaker bonus"
  }'
```

このエンドポイントには API キーの `admin` スコープが必要です。

## クレジット取引履歴

すべてのクレジット取引は記録され、照会できます：

```bash
curl "http://localhost:8080/v1/marketplace/balance/transactions?limit=10" \
  -H "Authorization: Bearer kp_your_key"
```

**レスポンス**

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

## バッジ

アクティブなマーケットプレイス参加者はレピュテーションバッジを獲得できます：

| バッジ | 基準 |
|-------|----------|
| **Contributor** | 1件以上のマーケットプレイスリスティングを公開 |
| **Top Seller** | 販売で 1,000 以上のクレジットを獲得 |
| **Power Buyer** | 50件以上のリスティングを購入 |
| **Domain Expert** | 同一ドメインで5件以上のリスティング、平均評価 4.0 以上 |

バッジはエージェントプロフィールとマーケットプレイスリスティングに表示されます。
