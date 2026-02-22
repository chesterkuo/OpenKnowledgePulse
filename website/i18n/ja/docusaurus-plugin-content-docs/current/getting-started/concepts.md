---
sidebar_position: 3
sidebar_label: コアコンセプト
---

# コアコンセプト

## KnowledgeUnit

KnowledgeUnit は KnowledgePulse の基本データ構造です。AI エージェントの実行や人間のエキスパートの手順からキャプチャされたナレッジの一単位を、JSON-LD フォーマットでエンコードしたものです。

すべての KnowledgeUnit は以下を持ちます：
- `https://knowledgepulse.dev/schema/v1` を指す `@context`
- `ReasoningTrace`、`ToolCallPattern`、`ExpertSOP` の型識別子 `@type`
- 型固有のプレフィックスを持つ一意の `id`（例：`kp:trace:`、`kp:pattern:`、`kp:sop:`）
- 品質スコア、可視性、プライバシーレベル、タイムスタンプを含む `metadata` オブジェクト

### ReasoningTrace

AI エージェントがタスクを解決する際のステップバイステップの推論をキャプチャします。思考、ツール呼び出し、観察、エラーリカバリを含みます。

```json
{
  "@context": "https://knowledgepulse.dev/schema/v1",
  "@type": "ReasoningTrace",
  "id": "kp:trace:550e8400-e29b-41d4-a716-446655440000",
  "metadata": {
    "task_domain": "financial_analysis",
    "success": true,
    "quality_score": 0.85,
    "visibility": "network",
    "privacy_level": "aggregated"
  },
  "task": {
    "objective": "Analyze Q4 earnings report for ACME Corp"
  },
  "steps": [
    { "step_id": 0, "type": "thought", "content": "Need to fetch the 10-K filing" },
    { "step_id": 1, "type": "tool_call", "tool": { "name": "web_search" } },
    { "step_id": 2, "type": "observation", "content": "Found SEC filing" }
  ],
  "outcome": {
    "result_summary": "Generated investment analysis with buy recommendation",
    "confidence": 0.82
  }
}
```

### ToolCallPattern

特定のタスクタイプに適したツール呼び出しの再利用可能なパターンを記述します。

```json
{
  "@context": "https://knowledgepulse.dev/schema/v1",
  "@type": "ToolCallPattern",
  "id": "kp:pattern:660e8400-e29b-41d4-a716-446655440000",
  "name": "SEC Filing Analysis",
  "description": "Optimal tool sequence for analyzing SEC filings",
  "trigger_conditions": {
    "task_types": ["financial_analysis", "sec_filing"]
  },
  "tool_sequence": [
    {
      "step": "fetch",
      "execution": "parallel",
      "tools": [{ "name": "web_search" }, { "name": "web_fetch" }]
    }
  ],
  "performance": {
    "avg_ms": 3200,
    "success_rate": 0.94,
    "uses": 127
  }
}
```

### ExpertSOP

人間のエキスパートの標準作業手順書を機械実行可能な形式でエンコードします。

```json
{
  "@context": "https://knowledgepulse.dev/schema/v1",
  "@type": "ExpertSOP",
  "id": "kp:sop:770e8400-e29b-41d4-a716-446655440000",
  "name": "Customer Escalation Procedure",
  "domain": "customer_service",
  "source": {
    "type": "human_expert",
    "expert_id": "expert-jane",
    "credentials": ["kp:sbt:customer-service-cert"]
  },
  "decision_tree": [
    {
      "step": "assess",
      "instruction": "Determine severity level from customer message",
      "conditions": {
        "high": { "action": "Escalate to senior agent", "sla_min": 5 },
        "low": { "action": "Apply standard resolution template" }
      }
    }
  ]
}
```

## SKILL.md

SKILL.md は、YAML フロントマターを持つ Markdown ファイルとして AI エージェントのスキルを定義するオープンスタンダードです。KnowledgePulse は SKILL.md と完全互換であり、オプションの `kp:` フィールドで拡張します。

### 標準フィールド

```yaml
---
name: my-skill              # 必須：スキル名
description: What it does   # 必須：スキルの説明
version: 1.0.0             # オプション：SemVer バージョン
author: user@example.com   # オプション：作成者
license: Apache-2.0        # オプション：ライセンス識別子
tags: [web, search]         # オプション：検索用タグ
allowed-tools: [web_search] # オプション：このスキルが使用できるツール
---
```

### KP 拡張フィールド

```yaml
---
name: my-skill
description: What it does
kp:
  knowledge_capture: true      # 自動キャプチャを有効化（デフォルト：false）
  domain: financial_analysis   # ナレッジドメイン分類
  quality_threshold: 0.75      # コントリビュート時の最小品質スコア（デフォルト：0.75）
  privacy_level: aggregated    # aggregated | federated | private
  visibility: network          # private | org | network
  reward_eligible: true        # KP-REP 報酬の対象（デフォルト：true）
---
```

`kp:` 拡張は後方互換です。KP 非対応のツールは追加フィールドを単に無視します。

## 可視性ティア

| ティア | スコープ | ユースケース |
|------|-------|----------|
| `private` | コントリビュートしたエージェントのみ | 個人ナレッジベース |
| `org` | 同じ組織のメンバー | チームナレッジ共有 |
| `network` | すべての KnowledgePulse ユーザー | オープンコミュニティナレッジ |

## プライバシーレベル

| レベル | 説明 |
|-------|-------------|
| `aggregated` | 抽象パターンのローカル抽出。生の会話はアップロードされません |
| `federated` | 連合学習を介してモデルの勾配のみ共有 |
| `private` | ナレッジはローカルに留まり、レジストリとは共有されません |

## KP-REP レピュテーション

KP-REP は、コントリビューションを追跡する非譲渡型のレピュテーションスコアです：

| アクション | スコア変動 |
|--------|-------------|
| 登録 | +0.1（初回のみ） |
| ナレッジのコントリビュート | +0.2 |
| スキルのコントリビュート | +0.1 |
| ユニットのバリデーション | +0.05 |

レピュテーションはレート制限ティアの割り当てと信頼スコアリングに使用されます。

## 品質スコアリング

ナレッジはネットワークに受け入れられる前に4つの次元でスコアリングされます：

1. **複雑さ** (25%) --- ステップの多様性、エラーリカバリ、トレースの長さ
2. **新規性** (35%) --- 既存のナレッジとの意味的類似度（エンベディング経由）
3. **ツール多様性** (15%) --- トレースで使用されたツールの多様性
4. **結果信頼度** (25%) --- 成功によって重み付けされた報告された信頼度

完全なアルゴリズムは[スコアリングドキュメント](../sdk/scoring.md)を参照してください。
