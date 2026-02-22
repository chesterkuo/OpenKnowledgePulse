---
sidebar_position: 2
title: 型
description: KnowledgePulse のナレッジユニット型、列挙型、インターフェース、Zod スキーマ、エラークラスの完全リファレンス。
sidebar_label: 型
---

# 型

SDK は、すべてのナレッジユニット形状の TypeScript インターフェース、ランタイムバリデーション用の Zod スキーマ、型付きエラークラスのセットをエクスポートします。すべての型はトップレベルの `@knowledgepulse/sdk` エントリポイントからインポートできます。

## 列挙型

### KnowledgeUnitType

```ts
type KnowledgeUnitType = "ReasoningTrace" | "ToolCallPattern" | "ExpertSOP";
```

プロトコルを通じてキャプチャ、格納、共有できる3つのナレッジカテゴリ。

### PrivacyLevel

```ts
type PrivacyLevel = "aggregated" | "federated" | "private";
```

| 値 | 説明 |
|-------|-------------|
| `"aggregated"` | ナレッジは完全に匿名化されパブリックプールにマージされます |
| `"federated"` | ナレッジはフェデレーション境界内に留まり、集約されたインサイトのみ外に出ます |
| `"private"` | ナレッジは発信元のエージェントまたは組織を離れません |

### Visibility

```ts
type Visibility = "private" | "org" | "network";
```

| 値 | 説明 |
|-------|-------------|
| `"private"` | 所有するエージェントのみに可視 |
| `"org"` | 同じ組織内のすべてのエージェントに可視 |
| `"network"` | KnowledgePulse ネットワーク上のすべての参加者に可視 |

## 共通インターフェース: KnowledgeUnitMeta

すべてのナレッジユニットはこの形状の `metadata` フィールドを持ちます：

```ts
interface KnowledgeUnitMeta {
  created_at: string;          // ISO 8601 日時
  agent_id?: string;           // kp:agent:<id>
  framework?: string;          // "langgraph" | "crewai" | "autogen" | "openclaw"
  task_domain: string;         // 例: "customer-support", "code-review"
  success: boolean;
  quality_score: number;       // 0.0 から 1.0
  visibility: Visibility;
  privacy_level: PrivacyLevel;
  validated_by?: string[];     // kp:validator:<id>[]
}
```

## ナレッジユニットタイプ

### ReasoningTrace

ツール呼び出し、観察、エラーリカバリを含む、エージェントの推論プロセスのステップバイステップの記録。

```ts
interface ReasoningTrace {
  "@context": "https://knowledgepulse.dev/schema/v1";
  "@type": "ReasoningTrace";
  id: string;                  // kp:trace:<uuid>
  source_skill?: string;       // kp:skill:<name>:<version>
  metadata: KnowledgeUnitMeta;
  task: {
    objective: string;
    input_schema?: Record<string, unknown>;
  };
  steps: ReasoningTraceStep[];
  outcome: {
    result_summary: string;
    confidence: number;        // 0.0 から 1.0
  };
  knowledge_graph_delta?: {
    entities: Array<{ name: string; type: string }>;
    relationships: Array<{ fact: string; valid_from: string }>;
  };
}
```

#### ReasoningTraceStep

トレースの各ステップは4つのタイプのいずれかを持ちます：

```ts
interface ReasoningTraceStep {
  step_id: number;
  type: "thought" | "tool_call" | "observation" | "error_recovery";
  content?: string;
  tool?: {
    name: string;
    mcp_server?: string;
  };
  input?: Record<string, unknown>;
  output_summary?: string;
  latency_ms?: number;
}
```

| ステップタイプ | 説明 |
|-----------|-------------|
| `"thought"` | 内部推論または計画ステップ |
| `"tool_call"` | 外部ツールまたは API の呼び出し |
| `"observation"` | ツール呼び出しから受け取った結果または出力 |
| `"error_recovery"` | エラー後に実行されたリカバリアクション |

### ToolCallPattern

特定のタスクタイプを達成するツール呼び出しのシーケンスを記述する再利用可能なパターン。

```ts
interface ToolCallPattern {
  "@context": "https://knowledgepulse.dev/schema/v1";
  "@type": "ToolCallPattern";
  id: string;                  // kp:pattern:<uuid>
  name: string;
  description: string;
  metadata: KnowledgeUnitMeta;
  trigger_conditions: {
    task_types: string[];
    required_tools?: string[];
  };
  tool_sequence: Array<{
    step: string;
    execution: "parallel" | "sequential";
    tools: Array<{
      name: string;
      query_template?: string;
      input_template?: Record<string, unknown>;
    }>;
    condition?: string;
  }>;
  performance: {
    avg_ms: number;
    success_rate: number;      // 0.0 から 1.0
    uses: number;
  };
}
```

### ExpertSOP

条件分岐ロジックを含む、人間のエキスパートが作成した構造化された標準作業手順書。

```ts
interface ExpertSOP {
  "@context": "https://knowledgepulse.dev/schema/v1";
  "@type": "ExpertSOP";
  id: string;                  // kp:sop:<uuid>
  name: string;
  domain: string;
  metadata: KnowledgeUnitMeta;
  source: {
    type: "human_expert";
    expert_id: string;
    credentials: string[];     // kp:sbt:<cert>[]
  };
  decision_tree: Array<{
    step: string;
    instruction: string;
    criteria?: Record<string, string>;
    conditions?: Record<string, {
      action: string;
      sla_min?: number;
    }>;
    tool_suggestions?: Array<{
      name: string;
      when: string;
    }>;
  }>;
  validation?: {
    test_cases: Array<{
      input: Record<string, unknown>;
      expected_output: Record<string, unknown>;
    }>;
  };
}
```

## ユニオン型

`KnowledgeUnit` 型は3つのナレッジユニットタイプの判別ユニオンです：

```ts
type KnowledgeUnit = ReasoningTrace | ToolCallPattern | ExpertSOP;
```

## SKILL.md 型

### SkillMdFrontmatter

標準 SKILL.md YAML フロントマターフィールド：

```ts
interface SkillMdFrontmatter {
  name: string;
  description: string;
  version?: string;
  author?: string;
  license?: string;
  tags?: string[];
  "allowed-tools"?: string[];
}
```

### SkillMdKpExtension

SKILL.md フロントマターの `kp:` キー配下にネストされた KnowledgePulse 拡張フィールド：

```ts
interface SkillMdKpExtension {
  knowledge_capture?: boolean;
  domain?: string;
  quality_threshold?: number;    // 0.0 から 1.0
  privacy_level?: PrivacyLevel;
  visibility?: Visibility;
  reward_eligible?: boolean;
}
```

## SOP インポート型

SDK はドキュメントからの SOP インポート用の型と関数を提供します。SOP Studio のドキュメントインポート機能で使用されますが、独立しても使用できます。

### LLMConfig

ドキュメント抽出に使用される LLM プロバイダーの設定：

```ts
interface LLMConfig {
  provider: "openai" | "anthropic" | "ollama";
  apiKey: string;              // プロバイダーの API キー
  model: string;               // モデル識別子（例: "gpt-4o"）
  baseUrl?: string;            // カスタムエンドポイント（Ollama では必須）
  temperature?: number;        // 0.0 から 1.0（デフォルト: 0.2）
}
```

### ParseResult

ドキュメントをパースした後に `parseDocx` と `parsePdf` から返されます：

```ts
interface ParseResult {
  text: string;                // 全プレーンテキストコンテンツ
  sections: Array<{
    heading: string;
    content: string;
    level: number;             // 見出しレベル（1-6）
  }>;
  tables: Array<{
    headers: string[];
    rows: string[][];
  }>;
  metadata: {
    title?: string;
    author?: string;
    pageCount?: number;
  };
}
```

### ExtractionResult

LLM 抽出後に `extractDecisionTree` から返されます：

```ts
interface ExtractionResult {
  name: string;                // 検出された SOP 名
  domain: string;              // 検出されたドメイン
  description: string;         // 生成された説明
  decision_tree: Array<{       // ExpertSOP 互換のデシジョンツリー
    step: string;
    instruction: string;
    criteria?: Record<string, string>;
    conditions?: Record<string, {
      action: string;
      sla_min?: number;
    }>;
    tool_suggestions?: Array<{
      name: string;
      when: string;
    }>;
  }>;
  confidence: number;          // 0.0 から 1.0
  warnings: string[];          // 抽出の問題点や曖昧さ
}
```

### ドキュメントパース関数

```ts
import { parseDocx, parsePdf, extractDecisionTree } from "@knowledgepulse/sdk";

// DOCX ファイルのパース
const docxResult: ParseResult = await parseDocx(buffer);

// PDF ファイルのパース
const pdfResult: ParseResult = await parsePdf(buffer);

// LLM を使用したデシジョンツリーの抽出
const extraction: ExtractionResult = await extractDecisionTree(pdfResult, {
  provider: "openai",
  apiKey: "sk-...",
  model: "gpt-4o",
  temperature: 0.2,
});
```

## Zod スキーマ

上記のすべての型には、ランタイムバリデーション用の対応する Zod スキーマがあります。スキーマは `@knowledgepulse/sdk` からエクスポートされ、`safeParse` または `parse` で直接使用できます。

| スキーマ | バリデーション対象 |
|--------|-----------|
| `KnowledgeUnitSchema` | `@type` による判別ユニオン（3つのユニットタイプすべて） |
| `KnowledgeUnitTypeSchema` | `"ReasoningTrace" \| "ToolCallPattern" \| "ExpertSOP"` |
| `KnowledgeUnitMetaSchema` | `metadata` オブジェクト |
| `PrivacyLevelSchema` | `"aggregated" \| "federated" \| "private"` |
| `VisibilitySchema` | `"private" \| "org" \| "network"` |
| `ReasoningTraceSchema` | 完全な `ReasoningTrace` オブジェクト |
| `ReasoningTraceStepSchema` | トレース内の個別ステップ |
| `ToolCallPatternSchema` | 完全な `ToolCallPattern` オブジェクト |
| `ExpertSOPSchema` | 完全な `ExpertSOP` オブジェクト |
| `SkillMdFrontmatterSchema` | SKILL.md フロントマターフィールド |
| `SkillMdKpExtensionSchema` | KnowledgePulse 拡張フィールド |

### バリデーション例

```ts
import { KnowledgeUnitSchema } from "@knowledgepulse/sdk";

const result = KnowledgeUnitSchema.safeParse(unknownData);

if (result.success) {
  // result.data は KnowledgeUnit として型付けされます
  const unit = result.data;
  console.log(unit["@type"]); // "ReasoningTrace" | "ToolCallPattern" | "ExpertSOP"
} else {
  // result.error.issues に詳細なバリデーションエラーが含まれます
  for (const issue of result.error.issues) {
    console.error(`${issue.path.join(".")}: ${issue.message}`);
  }
}
```

`KnowledgeUnitSchema` は `@type` フィールドをキーとする Zod 判別ユニオンです。入力データの `@type` の値に基づいて、正しいバリデーター（`ReasoningTraceSchema`、`ToolCallPatternSchema`、`ExpertSOPSchema`）が自動的に選択されます。

### `parse` による厳密なバリデーション

結果オブジェクトよりも例外を好む場合は、代わりに `parse` を使用します：

```ts
import { ReasoningTraceSchema } from "@knowledgepulse/sdk";

try {
  const trace = ReasoningTraceSchema.parse(data);
  // trace は ReasoningTrace として型付けされます
} catch (err) {
  // .issues 配列を持つ ZodError
}
```

## エラークラス

SDK は構造化されたエラーハンドリングのためのエラークラス階層をエクスポートします。

### KPError（ベース）

```ts
class KPError extends Error {
  readonly code: string;
  constructor(message: string, code: string);
}
```

すべての SDK エラーは `KPError` を継承します。`code` フィールドは機械可読なエラー識別子を提供します。

### ValidationError

```ts
class ValidationError extends KPError {
  readonly issues: Array<{ path: string; message: string }>;
  // code: "VALIDATION_ERROR"
}
```

データが Zod スキーマのバリデーションまたは SKILL.md のパースに失敗した場合にスローされます。`issues` 配列にはフィールドレベルの問題が1エントリずつ含まれ、ドット区切りの `path` と人間が読める `message` を持ちます。

### SanitizationError

```ts
class SanitizationError extends KPError {
  readonly field?: string;
  // code: "SANITIZATION_ERROR"
}
```

コンテンツサニタイズが不可視 Unicode 文字やプロンプトインジェクション試行などの危険なパターンを検出した場合にスローされます。

### AuthenticationError

```ts
class AuthenticationError extends KPError {
  // code: "AUTHENTICATION_ERROR"
  // デフォルトメッセージ: "Authentication required"
}
```

API 呼び出しに認証が必要だが有効な認証情報が提供されなかった場合にスローされます。

### RateLimitError

```ts
class RateLimitError extends KPError {
  readonly retryAfter: number;  // 秒
  // code: "RATE_LIMIT_ERROR"
}
```

レジストリが 429 ステータスを返した場合にスローされます。`retryAfter` フィールドはリトライまでの待機秒数を示します。

### NotFoundError

```ts
class NotFoundError extends KPError {
  // code: "NOT_FOUND"
}
```

リクエストされたリソース（ナレッジユニット、スキルなど）がレジストリに存在しない場合にスローされます。

### エラーハンドリング例

```ts
import {
  KPError,
  ValidationError,
  RateLimitError,
} from "@knowledgepulse/sdk";

try {
  await contributeKnowledge(unit, { apiKey: "kp_..." });
} catch (err) {
  if (err instanceof RateLimitError) {
    console.log(`Rate limited. Retry in ${err.retryAfter}s`);
  } else if (err instanceof ValidationError) {
    for (const issue of err.issues) {
      console.error(`  ${issue.path}: ${issue.message}`);
    }
  } else if (err instanceof KPError) {
    console.error(`KP error [${err.code}]: ${err.message}`);
  }
}
```
