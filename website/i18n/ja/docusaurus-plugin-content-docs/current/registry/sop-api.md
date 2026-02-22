---
sidebar_position: 5
title: SOP API
description: SOP の作成、管理、バージョニング、エクスポート用の REST API エンドポイント。
sidebar_label: SOP API
---

# SOP API

SOP API は KnowledgePulse レジストリで標準作業手順書を管理するためのエンドポイントを提供します。SOP は追加のバージョニングと承認ワークフローを持つ `ExpertSOP` ナレッジユニットとして格納されます。

## SOP の作成

```
POST /v1/sop
```

| プロパティ | 値 |
|---|---|
| 認証必要 | はい（`write` スコープ） |

## SOP の取得

```
GET /v1/sop/:id
```

デフォルトで最新の承認済みバージョンを返します。

## SOP の更新

```
PUT /v1/sop/:id
```

既存の SOP を更新します。新しいバージョンが自動的に作成されます。

## SOP の削除

```
DELETE /v1/sop/:id
```

SOP とそのすべてのバージョンを永久に削除します。

## SOP バージョン一覧

```
GET /v1/sop/:id/versions
```

## SOP バージョンの承認

```
POST /v1/sop/:id/approve
```

| プロパティ | 値 |
|---|---|
| 認証必要 | はい（`admin` スコープ） |

## SOP を Skill-MD としてエクスポート

```
GET /v1/sop/:id/export-skill
```

SOP を Skill-MD フォーマットファイルとしてエクスポートします。コンテンツを `text/markdown` として返します。
