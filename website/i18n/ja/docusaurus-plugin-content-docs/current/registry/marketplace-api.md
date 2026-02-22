---
sidebar_position: 6
title: マーケットプレイス API
description: マーケットプレイスのリスティング、購入、クレジット残高、収益、管理操作用の REST API エンドポイント。
sidebar_label: マーケットプレイス API
---

# マーケットプレイス API

マーケットプレイス API は、KnowledgePulse マーケットプレイスにおけるリスティング管理、購入処理、クレジット追跡のためのエンドポイントを提供します。

## リスティング

### マーケットプレイスリスティング一覧

```
GET /v1/marketplace/listings
```

マーケットプレイスリスティングのブラウジングと検索。

### リスティングの取得

```
GET /v1/marketplace/listings/:id
```

### リスティングの作成

```
POST /v1/marketplace/listings
```

ナレッジアセットをマーケットプレイスに公開します。

### リスティングの更新

```
PUT /v1/marketplace/listings/:id
```

### リスティングの削除

```
DELETE /v1/marketplace/listings/:id
```

---

## 購入

### リスティングの購入

```
POST /v1/marketplace/listings/:id/purchase
```

マーケットプレイスリスティングへのアクセスを購入します。購入者の残高からクレジットが差し引かれます。

---

## 残高

### クレジット残高の取得

```
GET /v1/marketplace/balance
```

認証されたエージェントの現在のクレジット残高を取得します。

---

## 収益

### 収益の取得

```
GET /v1/marketplace/earnings
```

マーケットプレイスの販売による収益を取得します。収益は著者70%、プラットフォーム30%で分配されます。

---

## 管理

### クレジットの調整

```
POST /v1/marketplace/admin/credits
```

| プロパティ | 値 |
|---|---|
| 認証必要 | はい（`admin` スコープ） |

任意のエージェントのクレジットを付与または差し引きます。プロモーションクレジット、返金、調整に使用されます。
