---
sidebar_position: 5
title: ユーティリティ
description: ID ジェネレーター、ハッシュ、コンテンツサニタイズ、ナレッジキャプチャ、取得、コントリビューションヘルパー。
sidebar_label: ユーティリティ
---

# ユーティリティ

SDK は KnowledgePulse プロトコルを扱うためのユーティリティ関数とクラスのコレクションをエクスポートします。このページでは ID 生成、ハッシュ、コンテンツサニタイズ、`KPCapture` と `KPRetrieval` クラス、コントリビューション関数について説明します。

## ID ジェネレーター

各ナレッジユニットタイプには、名前空間付き UUID 文字列を生成する専用の ID ジェネレーターがあります。

```ts
import {
  generateTraceId,
  generatePatternId,
  generateSopId,
  generateSkillId,
} from "@knowledgepulse/sdk";
```

| 関数 | 戻り値フォーマット | 例 |
|----------|---------------|---------|
| `generateTraceId()` | `kp:trace:<uuid>` | `kp:trace:550e8400-e29b-41d4-a716-446655440000` |
| `generatePatternId()` | `kp:pattern:<uuid>` | `kp:pattern:6ba7b810-9dad-11d1-80b4-00c04fd430c8` |
| `generateSopId()` | `kp:sop:<uuid>` | `kp:sop:f47ac10b-58cc-4372-a567-0e02b2c3d479` |
| `generateSkillId()` | `kp:skill:<uuid>` | `kp:skill:7c9e6679-7425-40de-944b-e07fc1f90ae7` |

すべてのジェネレーターは内部で `crypto.randomUUID()` を使用し、呼び出しごとに新しいユニークな ID を返します。

**例：**

```ts
import { generateTraceId } from "@knowledgepulse/sdk";

const id = generateTraceId();
console.log(id); // "kp:trace:a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

## `sha256(text)`

文字列の SHA-256 ハッシュを計算し、16進ダイジェストを返します。

```ts
function sha256(text: string): Promise<string>
```

内部で Web Crypto API（`crypto.subtle.digest`）を使用するため、Node.js/Bun とブラウザ環境の両方で動作します。

**例：**

```ts
import { sha256 } from "@knowledgepulse/sdk";

const hash = await sha256("hello world");
console.log(hash);
// "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"
```

## コンテンツサニタイズ

### `sanitizeSkillMd(content)`

SKILL.md コンテンツをインジェクション攻撃、ステガノグラフィック文字、不正な入力から保護するためにサニタイズします。

```ts
import { sanitizeSkillMd } from "@knowledgepulse/sdk";
import type { SanitizeResult } from "@knowledgepulse/sdk";

function sanitizeSkillMd(content: string): SanitizeResult
```

**戻り値：**

```ts
interface SanitizeResult {
  content: string;    // サニタイズ済みコンテンツ
  warnings: string[]; // 行われた変更に関する致命的でない警告
}
```

**スロー：** 安全に除去できない危険なコンテンツが検出された場合に `SanitizationError`。

詳細はセキュリティモデルドキュメントを参照してください。

## KPCapture

`KPCapture` クラスはエージェント関数をラップすることで透過的なナレッジキャプチャを提供します。実行トレースの自動記録、スコアリング、高価値トレースのレジストリへのコントリビュートを行います。

```ts
import { KPCapture } from "@knowledgepulse/sdk";
import type { CaptureConfig } from "@knowledgepulse/sdk";
```

### 設定

```ts
interface CaptureConfig {
  domain: string;              // 必須。タスクドメイン（例: "code-review"）
  autoCapture?: boolean;       // デフォルト: true
  valueThreshold?: number;     // デフォルト: 0.75（コントリビュートの最小スコア）
  privacyLevel?: PrivacyLevel; // デフォルト: "aggregated"
  visibility?: Visibility;     // デフォルト: "network"
  registryUrl?: string;        // デフォルト: "https://registry.knowledgepulse.dev"
  apiKey?: string;             // レジストリ認証用の Bearer トークン
}
```

### `wrap<T>(agentFn)`

非同期エージェント関数をラップして、その実行を `ReasoningTrace` として透過的にキャプチャします。

```ts
wrap<T extends (...args: unknown[]) => Promise<unknown>>(agentFn: T): T
```

ラッパーは以下を行います：

1. 関数引数を含む `thought` ステップを記録。
2. 元の関数を実行。
3. `observation` ステップ（成功時）または `error_recovery` ステップ（失敗時）を記録。
4. `evaluateValue()` でトレースを非同期的にスコアリング。
5. スコアが `valueThreshold` を満たす場合、トレースをレジストリにコントリビュート（ファイアアンドフォーゲット）。
6. 元の結果を返す（または元のエラーを再スロー）。

**例：**

```ts
import { KPCapture } from "@knowledgepulse/sdk";

const capture = new KPCapture({
  domain: "customer-support",
  valueThreshold: 0.7,
  apiKey: "kp_your_api_key",
});

async function handleTicket(ticketId: string): Promise<string> {
  // ... エージェントロジック ...
  return "Resolved: password reset instructions sent";
}

// エージェント関数をラップ
const trackedHandler = capture.wrap(handleTicket);

// 元のように使用
const result = await trackedHandler("TICKET-123");
// result === "Resolved: password reset instructions sent"
// ReasoningTrace がバックグラウンドでキャプチャ・スコアリングされました
```

## KPRetrieval

`KPRetrieval` クラスはナレッジレジストリの検索と LLM 消費用の結果フォーマットのためのメソッドを提供します。

```ts
import { KPRetrieval } from "@knowledgepulse/sdk";
import type { RetrievalConfig } from "@knowledgepulse/sdk";
```

### 設定

```ts
interface RetrievalConfig {
  minQuality?: number;              // デフォルト: 0.80
  knowledgeTypes?: KnowledgeUnitType[];
  limit?: number;                   // デフォルト: 5
  registryUrl?: string;             // デフォルト: "https://registry.knowledgepulse.dev"
  apiKey?: string;                  // レジストリ認証用の Bearer トークン
}
```

### `search(query, domain?)`

テキストクエリに一致するナレッジユニットをレジストリから検索します。

```ts
async search(query: string, domain?: string): Promise<KnowledgeUnit[]>
```

### `searchSkills(query, opts?)`

SKILL.md エントリをレジストリから検索します。

```ts
async searchSkills(
  query: string,
  opts?: { domain?: string; tags?: string[]; limit?: number },
): Promise<unknown[]>
```

### `toFewShot(unit)`

`KnowledgeUnit` を LLM コンテキストでの Few-Shot プロンプティングに適したプレーンテキストにフォーマットします。

```ts
toFewShot(unit: KnowledgeUnit): string
```

## コントリビューション関数

レジストリへのナレッジとスキルのコントリビュート用の2つのスタンドアロン関数。

### `contributeKnowledge(unit, config?)`

`KnowledgeUnit` をバリデーションしてレジストリに送信します。

```ts
import { contributeKnowledge } from "@knowledgepulse/sdk";

async function contributeKnowledge(
  unit: KnowledgeUnit,
  config?: ContributeConfig,
): Promise<{ id: string; quality_score: number }>
```

### `contributeSkill(skillMdContent, visibility?, config?)`

SKILL.md ドキュメントをレジストリに送信します。

```ts
import { contributeSkill } from "@knowledgepulse/sdk";

async function contributeSkill(
  skillMdContent: string,
  visibility?: Visibility,
  config?: ContributeConfig,
): Promise<{ id: string }>
```
