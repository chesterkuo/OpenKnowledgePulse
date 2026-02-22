---
sidebar_position: 4
title: スコアリング
description: KnowledgePulse SDK が多次元スコアリングアルゴリズムを使用して推論トレースの価値を評価する方法。
sidebar_label: スコアリング
---

# スコアリング

SDK には、`ReasoningTrace` がネットワークにコントリビュートされる前に、その有用性を評価する価値スコアリング関数が含まれています。これにより、トレースが共有のための品質閾値を満たしているかどうかが決定されます。

## `evaluateValue(trace)`

```ts
function evaluateValue(trace: ReasoningTrace): Promise<number>
```

**パラメータ：**

| パラメータ | 型 | 説明 |
|-----------|------|-------------|
| `trace` | `ReasoningTrace` | 評価する完全な推論トレース |

**戻り値：** `Promise<number>` -- `0.0` から `1.0` の品質スコア。

**例：**

```ts
import { evaluateValue } from "@knowledgepulse/sdk";
import type { ReasoningTrace } from "@knowledgepulse/sdk";

const trace: ReasoningTrace = {
  "@context": "https://openknowledgepulse.org/schema/v1",
  "@type": "ReasoningTrace",
  id: "kp:trace:550e8400-e29b-41d4-a716-446655440000",
  metadata: {
    created_at: new Date().toISOString(),
    task_domain: "code-review",
    success: true,
    quality_score: 0,
    visibility: "network",
    privacy_level: "aggregated",
  },
  task: { objective: "Review PR #42 for security issues" },
  steps: [
    { step_id: 0, type: "thought", content: "Analyzing diff for injection vectors" },
    { step_id: 1, type: "tool_call", tool: { name: "github_pr_read" }, input: { pr: 42 } },
    { step_id: 2, type: "observation", content: "Found unsanitized SQL in handler.ts" },
    { step_id: 3, type: "tool_call", tool: { name: "static_analysis" }, input: { file: "handler.ts" } },
    { step_id: 4, type: "observation", content: "Confirmed SQL injection vulnerability" },
  ],
  outcome: {
    result_summary: "Identified 1 critical SQL injection vulnerability",
    confidence: 0.95,
  },
};

const score = await evaluateValue(trace);
console.log(score); // 例: 0.72
```

## スコアリング次元

複合スコアは4つの独立した次元の加重平均です：

| 次元 | 重み | 範囲 | 説明 |
|-----------|--------|-------|-------------|
| 複雑さ (C) | 25% | 0.0 - 1.0 | トレースの構造的豊かさ |
| 新規性 (N) | 35% | 0.0 - 1.0 | 過去のトレースとの差異 |
| ツール多様性 (D) | 15% | 0.0 - 1.0 | ステップ数に対する使用ツールの多様性 |
| 結果信頼度 (O) | 25% | 0.0 - 1.0 | 成功で調整された結果の信頼度 |

```
score = C * 0.25 + N * 0.35 + D * 0.15 + O * 0.25
```

### 複雑さ (C)

ステップタイプの多様性、エラーリカバリ、トレースの長さに基づいて推論トレースの構造的豊かさを測定します。

```
C = min(1.0, (uniqueTypes / 4) * 0.5 + (errorRecovery > 0 ? 0.3 : 0) + (steps.length / 20) * 0.2)
```

| 要素 | 寄与度 | 説明 |
|--------|-------------|-------------|
| ユニークなステップタイプ | 最大 0.50 | 異なるステップタイプの数（`thought`、`tool_call`、`observation`、`error_recovery`）を4で割った値 |
| エラーリカバリ | 0.00 または 0.30 | トレースに1つ以上の `error_recovery` ステップがある場合のボーナス |
| ステップ数 | 最大 0.20 | ステップ数を20で割った値（長いトレースほど高スコア、20で上限） |

### 新規性 (N)

エンベディングベースの類似度を使用して、過去にスコアリングされたトレースとの差異を測定します。

- **エンベディングモデル：** `Xenova/all-MiniLM-L6-v2`（384次元）
- **入力テキスト：** タスク目的とすべてのステップ内容を連結
- **比較：** ローカルキャッシュ内の全ベクトルとのコサイン類似度
- **計算式：** `N = 1.0 - maxCosineSimilarity(embedding, cache)`

`@huggingface/transformers` パッケージがインストールされていない場合、新規性次元は **`0.5` にフォールバック**します（中間値）。これにより、オプション依存関係なしでもスコアリングが機能しますが、新規性の識別能力は低下します。

ローカルキャッシュが空の場合（セッション内で最初にスコアリングされるトレース）、新規性もデフォルトで `0.5` になります。

### ツール多様性 (D)

トレースで使用された異なるツールの多様性を測定します。

```
D = min(1.0, (uniqueTools / max(1, steps.length)) * 3)
```

乗数3は、ステップの3分の1が異なるツールを使用するトレースが最大スコアを達成することを意味します。これにより、ツール呼び出しの長いシーケンスにペナルティを課すことなく、複数のツールを活用するトレースが報酬を受けます。

### 結果信頼度 (O)

エージェント自身が報告した信頼度を、タスクが実際に成功したかどうかで調整したものを反映します。

```
O = outcome.confidence * (metadata.success ? 1.0 : 0.3)
```

失敗したタスクの信頼度は0.3倍され、結果次元のスコアが大幅に低下します。

## ルールベースのオーバーライド

加重複合スコアの計算後、3つのルールベースの調整が順に適用されます：

| 条件 | 効果 | 根拠 |
|-----------|--------|-----------|
| 単一の思考のみのステップ | スコアを `0.1` に設定 | 1つの思考ステップのみのトレースは最小限の価値 |
| 2回以上のエラーリカバリかつ `success: true` | スコアに `+0.1` 加算（上限1.0） | 複数のエラーからの成功リカバリは非常に価値が高い |
| ユニークツール数が1以下（ツールが使用されている場合） | スコアを `-0.1` 減算（下限0.0） | ツール使用トレースでの低いツール多様性にペナルティ |

```ts
// 単一の思考のみのステップ
if (steps.length === 1 && steps[0].type === "thought") score = 0.1;

// 成功した複数エラーリカバリ
if (errorRecovery > 2 && metadata.success) score = min(1.0, score + 0.1);

// 低いツール多様性
if (uniqueTools <= 1 && steps.some(s => s.tool)) score = max(0.0, score - 0.1);
```

:::note
単一思考のオーバーライドが優先されます。トレースにちょうど1つの思考ステップがある場合、スコアは他の要素に関係なく `0.1` に設定されます。後続のオーバーライドはその値の上に条件が満たされた場合に適用されます。
:::

## 内部ベクトルキャッシュ

スコアリングモジュールは、同一プロセス内の呼び出し間で新規性を計算するための内部 `VectorCache` インスタンスを保持します。

| プロパティ | 値 |
|----------|-------|
| 最大要素数 | 1,000 |
| 次元数 | 384 |
| アルゴリズム | ブルートフォースリニアスキャン |
| エビクション | 容量超過時に最も古いものから |

キャッシュは単一エージェントセッションでのトレーススコアリングの一般的なケース向けに設計されています。384次元のベクトル1,000個で、メモリフットプリントは約1.5 MB、フルスキャンは1 ms未満で完了します。

`VectorCache` クラスは高度なユースケース向けに SDK からエクスポートもされています：

```ts
import { VectorCache } from "@knowledgepulse/sdk";

const cache = new VectorCache({ maxElements: 500, dimensions: 384 });

cache.add(new Float32Array(384));           // ベクトルを追加
const sim = cache.maxCosineSimilarity(q);   // 最大類似度をクエリ
console.log(cache.size);                     // 格納されたベクトル数
cache.clear();                               // キャッシュをリセット
```

## エンベッダーなしのスコアリング

`@huggingface/transformers` をインストールしない場合でもスコアリング関数は動作します。新規性次元はデフォルトの `0.5` になり、最終スコアは残りの3次元と固定された新規性中間値から計算されます：

```
score = C * 0.25 + 0.5 * 0.35 + D * 0.15 + O * 0.25
       = C * 0.25 + 0.175 + D * 0.15 + O * 0.25
```

これは開発やテストには適していますが、本番環境では識別能力の低いスコアを提供します。最良の結果を得るには、オプション依存関係をインストールしてください：

```bash
bun add @huggingface/transformers
```
