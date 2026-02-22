---
sidebar_position: 5
title: スコアリングアルゴリズム
description: ドメイン固有の重みプロファイル、ルールベースのオーバーライド、時間減衰、パフォーマンス制約を含む完全な4因子複合スコアリングモデル。
sidebar_label: スコアリングアルゴリズム
---

# スコアリングアルゴリズム

KnowledgePulse スコアリングエンジンは、4つの独立した品質次元を組み合わせた複合式を使用して推論トレースを評価します。フェーズ 2 では、エンジンは異なるタスクドメインに対してスコアリングの重点を調整する**ドメイン固有の重みプロファイル**を導入し、評価ごとに **100ms のパフォーマンスバジェット**を適用します。

## 複合式

全体の品質スコアは4つの正規化された次元の加重和として計算されます：

```
score = C × wC + N × wN + D × wD + O × wO
```

各記号の意味：

| 記号 | 次元 | 範囲 |
|--------|-----------|-------|
| C | 複雑さ | 0.0 -- 1.0 |
| N | 新規性 | 0.0 -- 1.0 |
| D | ツール多様性 | 0.0 -- 1.0 |
| O | 結果信頼度 | 0.0 -- 1.0 |

重み（wC、wN、wD、wO）はドメインによって異なります。合計は常に 1.0 です。

## ドメイン固有の重みプロファイル

異なるタスクドメインは異なる品質シグナルを優先します。財務トレースは高い結果信頼度から最も恩恵を受け、コーディングトレースは多様なツール使用から恩恵を受けます。スコアリングエンジンは `metadata.task_domain` に基づいて重みプロファイルを自動的に選択します。

### 利用可能なプロファイル

| ドメイン | wC (複雑さ) | wN (新規性) | wD (ツール多様性) | wO (結果) |
|--------|:-:|:-:|:-:|:-:|
| **default** | 0.25 | 0.35 | 0.15 | 0.25 |
| **finance** | 0.20 | 0.25 | 0.10 | 0.45 |
| **code** | 0.20 | 0.30 | 0.30 | 0.20 |
| **medical** | 0.15 | 0.20 | 0.10 | 0.55 |
| **customer_service** | 0.20 | 0.30 | 0.20 | 0.30 |

### 設計根拠

- **Finance** は財務分析が正確で検証可能な結論を要求するため、結果信頼度を重く重み付けします。
- **Code** は効果的なコーディングエージェントが複数のツール（リンター、型チェッカー、テストランナー）を活用するため、ツール多様性を重く重み付けします。
- **Medical** は医療推論で正確性が重要であるため、最も高い結果信頼度の重み（0.55）を持ちます。
- **Customer service** は新規性と結果信頼度のバランスを取り、創造的かつ効果的な問題解決を報酬します。

### ドメインプロファイルの使用

ドメイン選択はトレースメタデータを通じて自動的に行われます：

```ts
import { evaluateValue } from "@knowledgepulse/sdk";
import type { ReasoningTrace } from "@knowledgepulse/sdk";

const trace: ReasoningTrace = {
  "@context": "https://openknowledgepulse.org/schema/v1",
  "@type": "ReasoningTrace",
  id: "kp:trace:finance-demo-001",
  metadata: {
    created_at: new Date().toISOString(),
    task_domain: "finance", // ← finance 重みプロファイルを選択
    success: true,
    quality_score: 0,
    visibility: "network",
    privacy_level: "aggregated",
  },
  task: { objective: "Analyze TSMC Q4 earnings report" },
  steps: [
    { step_id: 0, type: "thought", content: "Extracting revenue and margin data" },
    { step_id: 1, type: "tool_call", tool: { name: "financial_data_api" }, input: { ticker: "TSM" } },
    { step_id: 2, type: "observation", content: "Revenue: $26.3B, up 14.3% YoY" },
    { step_id: 3, type: "tool_call", tool: { name: "comparison_tool" }, input: { metric: "gross_margin" } },
    { step_id: 4, type: "observation", content: "Gross margin 57.9%, above industry average" },
  ],
  outcome: {
    result_summary: "Strong quarterly performance driven by AI chip demand",
    confidence: 0.92,
  },
};

const score = await evaluateValue(trace);
// finance の重みでは、高い結果信頼度（0.92）がより多く寄与
console.log(score); // 例: 0.78
```

ドメインが登録されたプロファイルと一致しない場合、**default** の重みが使用されます。未知のドメインはサイレントに処理され、エラーはスローされません。

## ルールベースのオーバーライド

加重複合スコアの計算後、3つの決定論的オーバーライドが順に適用されます：

### 1. シングルステップペナルティ

```ts
if (steps.length === 1 && steps[0].type === "thought") score = 0.1;
```

単一の思考のみのステップを持つトレースは最小限のナレッジ価値しかありません。他の要素に関係なく、スコアは `0.1` に強制されます。

### 2. エラーリカバリボーナス

```ts
if (errorRecovery > 2 && metadata.success) score = Math.min(1.0, score + 0.1);
```

2回以上のエラーからリカバリして成功したトレースは、価値あるレジリエンスを示します。`+0.1` のボーナスが加算され、`1.0` で上限が設定されます。

### 3. ゼロ多様性ペナルティ

```ts
if (uniqueTools <= 1 && steps.some(s => s.tool)) score = Math.max(0.0, score - 0.1);
```

トレースがツールを使用しているが1種類のツールのみの場合、`-0.1` のペナルティが適用され、`0.0` で下限が設定されます。多様なツール使用を奨励します。

:::note
シングルステップペナルティが優先されます。トレースにちょうど1つの思考ステップがある場合、まずスコアは `0.1` に設定されます。エラーリカバリボーナスとゼロ多様性ペナルティはその値の上に条件が満たされた場合に適用されます。
:::

## 新規性の時間減衰

新規性次元はローカルベクトルキャッシュに対するエンベディングベースの類似度を使用します。時間の経過とともにキャッシュにトレースが蓄積されるにつれ、意味的に類似したトレースの新規性スコアは自然に減少します。これにより暗黙的な時間減衰効果が生まれます：

1. 空のキャッシュ内の新しいトレース：新規性はデフォルトで `0.5`。
2. 新しいユニークなトレース：新規性は `1.0` に近づきます（既存ベクトルとの低い類似度）。
3. 繰り返しのトレースパターン：新規性は `0.0` に近づきます（キャッシュされたベクトルとの高い類似度）。

ベクトルキャッシュは TTL ベースのエビクションをサポートしており（フェーズ 2 で導入）、キャッシュされたエントリは設定可能な時間ウィンドウ後に期限切れになります。これにより、TTL 期間後に再訪問されたトピックがより高い新規性スコアを回復します。

```ts
import { VectorCache } from "@knowledgepulse/sdk";

const cache = new VectorCache({
  maxElements: 1000,
  dimensions: 384,
  ttlMs: 3600000, // 1時間 — エントリはこの後期限切れ
});
```

## パフォーマンスバジェット

スコアリング関数は一般的なトレースで **100ms** 以内に完了するよう設計されています。この制約をサポートする主な実装選択：

| コンポーネント | 戦略 | レイテンシ |
|-----------|----------|---------|
| ベクトルキャッシュ | 1,000ベクトルのブルートフォースリニアスキャン | < 1ms |
| エンベッダー | 遅延ロード、初回呼び出し後キャッシュ | ~50ms 初回、~5ms 以降 |
| 複合計算 | 純粋な算術、I/O なし | < 0.1ms |
| ルールオーバーライド | 3つの条件チェック | < 0.01ms |

オプションのエンベッダー（`@huggingface/transformers`）がインストールされていない場合、新規性はデフォルトで `0.5` になり、評価全体が1ms未満で実行されます。

## スコアリングインターフェース

```ts
interface ScoringWeights {
  complexity: number;
  novelty: number;
  toolDiversity: number;
  outcomeConfidence: number;
}

function evaluateValue(trace: ReasoningTrace): Promise<number>;
```

関数は `0.0` から `1.0` の `Promise<number>` を返します。ローカルベクトルキャッシュが新規性計算のために持続するため、同一プロセス内の呼び出し間でステートフルです。

## 例：ドメインプロファイルの比較

同じトレースを異なるドメインで評価すると、重みの違いにより異なるスコアが生成されます：

```ts
// 同じトレース構造、異なる task_domain 値
const domains = ["default", "finance", "code", "medical", "customer_service"];

for (const domain of domains) {
  const trace = createTrace({ task_domain: domain });
  const score = await evaluateValue(trace);
  console.log(`${domain}: ${score.toFixed(3)}`);
}

// 出力例（トレース内容によって変動）：
// default:          0.623
// finance:          0.714  （高い信頼度が報酬される）
// code:             0.598  （ツール多様性が重視される）
// medical:          0.751  （信頼度が支配的）
// customer_service: 0.645  （バランス型）
```
