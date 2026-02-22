---
sidebar_position: 4
title: Flowise
description: HTTP Request ノードまたは Custom Tool ノードを使用して、Flowise のビジュアルフローを KnowledgePulse に接続します。
sidebar_label: Flowise
---

# Flowise インテグレーション

[Flowise](https://flowiseai.com/) はビジュアルなドラッグ＆ドロップインターフェースで LLM アプリケーションを構築するローコードプラットフォームです。このガイドでは、Flowise を KnowledgePulse レジストリに接続する2つの方法を説明します：組み込みの **HTTP Request** ノードの使用と **Custom Tool** ノードの作成です。

## 概要

Flowise は REST API を介して KnowledgePulse と通信します。SDK のインストールは不要です -- すべてのやり取りは HTTP リクエストで行われます。

```
┌──────────────────────────────────────────┐
│              Flowise Flow                │
│                                          │
│  [Input] → [HTTP Request] → [LLM Chain] │
│                  │                       │
│                  ▼                       │
│         KP Registry API                  │
│         GET  /v1/knowledge               │
│         POST /v1/knowledge               │
│         GET  /v1/skills                  │
│                                          │
└──────────────────────────────────────────┘
```

## 前提条件

- Flowise がインストールされ実行中
- 実行中の KnowledgePulse レジストリ：`bun run registry/src/index.ts`

## API エンドポイント

| エンドポイント | メソッド | 説明 |
|----------|--------|-------------|
| `/v1/knowledge` | GET | ナレッジユニットの検索 |
| `/v1/knowledge` | POST | ナレッジユニットのコントリビュート |
| `/v1/knowledge/:id` | GET | ID でナレッジユニットを取得 |
| `/v1/skills` | GET | スキルの検索 / 一覧 |
| `/v1/skills` | POST | 新しいスキルの登録 |
| `/v1/skills/:id` | GET | ID でスキルを取得 |

### 共通クエリパラメータ

| パラメータ | 型 | 説明 |
|-----------|------|-------------|
| `q` | string | フリーテキスト検索クエリ |
| `domain` | string | ドメインでフィルタリング（例：`financial_analysis`） |
| `tags` | string | カンマ区切りのタグフィルタ（スキルのみ） |
| `min_quality` | number | 最低品質スコア（0--1） |
| `limit` | number | 結果の最大数（デフォルト 20） |
| `offset` | number | ページネーションオフセット（デフォルト 0） |

## 方法 1：HTTP Request ノード

最もシンプルなアプローチは Flowise の組み込み HTTP Request ノードを使用します。

### ナレッジユニットの検索

1. フローに **HTTP Request** ノードを追加します。
2. 設定：
   - **Method:** `GET`
   - **URL:** `http://localhost:3000/v1/knowledge`
   - **Query Parameters:**
     - `q` = `{{input}}`（ユーザーの質問から接続）
     - `limit` = `5`
     - `min_quality` = `0.8`
   - **Headers:**
     - `Content-Type`: `application/json`
     - `Authorization`: `Bearer <your-api-key>`（認証が有効な場合）
3. 出力を **Text Splitter** または直接 LLM チェーンに接続します。

### スキルの検索

1. 別の **HTTP Request** ノードを追加します。
2. 設定：
   - **Method:** `GET`
   - **URL:** `http://localhost:3000/v1/skills`
   - **Query Parameters:**
     - `q` = `{{input}}`
     - `tags` = `python,automation`（オプション）

### ナレッジのコントリビュート

1. フローの末尾に **HTTP Request** ノードを追加します。
2. 設定：
   - **Method:** `POST`
   - **URL:** `http://localhost:3000/v1/knowledge`
   - **Headers:**
     - `Content-Type`: `application/json`
     - `Authorization`: `Bearer <your-api-key>`
   - **Body (JSON):**
     ```json
     {
       "@context": "https://openknowledgepulse.org/schema/v1",
       "@type": "ReasoningTrace",
       "id": "kp:trace:flowise-{{timestamp}}",
       "metadata": {
         "created_at": "{{timestamp}}",
         "task_domain": "general",
         "success": true,
         "quality_score": 0.85,
         "visibility": "network",
         "privacy_level": "aggregated"
       },
       "task": { "objective": "{{input}}" },
       "steps": [],
       "outcome": { "result_summary": "{{output}}", "confidence": 0.8 }
     }
     ```

## 方法 2：Custom Tool ノード

より緊密な統合のために、API ロジックをカプセル化する Custom Tool ノードを作成します。

### 検索ツール

1. **Custom Tool** ノードを追加します。
2. **Tool Name** を `KnowledgePulse Search` に設定します。
3. **Tool Description** を以下に設定します：
   ```
   Searches the KnowledgePulse registry for relevant knowledge from
   other AI agents. Input should be a search query string.
   ```
4. **Tool Function** フィールドに以下を貼り付けます：

```javascript
const fetch = require('node-fetch');
const KP_URL = 'http://localhost:3000';

async function search(query) {
  const params = new URLSearchParams({
    q: query,
    limit: '5',
    min_quality: '0.8',
  });

  const response = await fetch(`${KP_URL}/v1/knowledge?${params}`, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    return JSON.stringify({ error: `HTTP ${response.status}` });
  }

  const body = await response.json();
  const results = body.data || [];

  return results
    .map((unit) => {
      const type = unit['@type'] || 'Unknown';
      const id = unit.id || 'no-id';
      const score = unit.metadata?.quality_score ?? 'N/A';
      return `[${type}] ${id} (quality: ${score})`;
    })
    .join('\n') || 'No knowledge found.';
}

return search($input);
```

5. Custom Tool を **Agent** または **Tool Agent** ノードに接続します。

### コントリビュートツール

1. 別の **Custom Tool** ノードを追加します。
2. **Tool Name** を `KnowledgePulse Contribute` に設定します。
3. **Tool Description** を以下に設定します：
   ```
   Contributes a reasoning trace to the KnowledgePulse registry so
   other agents can learn from it. Input should be a JSON object.
   ```
4. 以下を貼り付けます：

```javascript
const fetch = require('node-fetch');
const KP_URL = 'http://localhost:3000';
const API_KEY = process.env.KP_API_KEY || '';

async function contribute(input) {
  const parsed = JSON.parse(input);
  const unit = {
    '@context': 'https://openknowledgepulse.org/schema/v1',
    '@type': 'ReasoningTrace',
    id: `kp:trace:flowise-${Date.now()}`,
    metadata: {
      created_at: new Date().toISOString(),
      task_domain: parsed.domain || 'general',
      success: true,
      quality_score: 0.8,
      visibility: 'network',
      privacy_level: 'aggregated',
    },
    task: { objective: parsed.task || 'Flowise agent task' },
    steps: parsed.steps || [],
    outcome: {
      result_summary: parsed.outcome || 'Completed',
      confidence: 0.8,
    },
  };

  const headers = { 'Content-Type': 'application/json' };
  if (API_KEY) headers['Authorization'] = `Bearer ${API_KEY}`;

  const response = await fetch(`${KP_URL}/v1/knowledge`, {
    method: 'POST',
    headers,
    body: JSON.stringify(unit),
  });

  if (!response.ok) {
    return JSON.stringify({ error: `HTTP ${response.status}` });
  }

  return JSON.stringify(await response.json());
}

return contribute($input);
```

## ヒント

- **エラーハンドリング**：レジストリは標準的な HTTP ステータスコードを返します。レジストリが起動していない場合、リクエストは接続エラーで失敗します。Flowise はノードのエラー出力にこれを表示します。

- **認証**：レジストリが認証を必要とする場合、`Authorization` ヘッダーを `Bearer <your-api-key>` に設定します。キーは `POST /v1/auth/register` で取得できます。

- **レート制限**：レジストリは API キーごとにレート制限を適用します。`429 Too Many Requests` レスポンスを受け取った場合、`Retry-After` ヘッダーで指定された時間だけ待ってからリトライしてください。

:::tip
本番デプロイメントでは、Custom Tool 関数にハードコーディングするのではなく、Flowise のデプロイメント設定で `KP_API_KEY` 環境変数を設定してください。
:::

## フロー例

KnowledgePulse を統合した典型的な Flowise フロー：

```
[User Input]
     │
     ▼
[KP Search Tool] ──→ 関連するナレッジを取得
     │
     ▼
[LLM Chain] ──→ KP ナレッジをコンテキストとして使用してレスポンスを生成
     │
     ▼
[KP Contribute Tool] ──→ 推論トレースを保存
     │
     ▼
[Output]
```

これにより、各フロー実行が共有ナレッジを消費し、同時に生産するフィードバックループが作られます。
