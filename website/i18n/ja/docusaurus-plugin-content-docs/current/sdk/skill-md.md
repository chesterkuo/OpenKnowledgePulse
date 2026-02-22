---
sidebar_position: 3
title: SKILL.md
description: KnowledgePulse 拡張付き SKILL.md ファイルのパース、生成、バリデーション。
sidebar_label: SKILL.md
---

# SKILL.md

SKILL.md は YAML フロントマターと Markdown ボディを使用してエージェントスキルを記述する標準ファイルフォーマットです。KnowledgePulse SDK はフロントマターにオプションの `kp:` 拡張ブロックを追加し、非 KP ツールとの完全な後方互換性を維持しながらナレッジキャプチャの設定を可能にします。

## 関数

### `parseSkillMd(content)`

SKILL.md 文字列を構造化されたコンポーネントにパースします。

```ts
function parseSkillMd(content: string): ParsedSkillMd
```

**パラメータ：**

| パラメータ | 型 | 説明 |
|-----------|------|-------------|
| `content` | `string` | 生の SKILL.md ファイルコンテンツ |

**戻り値：** `ParsedSkillMd`

```ts
interface ParsedSkillMd {
  frontmatter: SkillMdFrontmatter;  // 標準 YAML フィールド
  kp?: SkillMdKpExtension;          // KnowledgePulse 拡張（存在する場合）
  body: string;                      // フロントマター後の Markdown コンテンツ
  raw: string;                       // 元の入力文字列
}
```

**スロー：** フロントマターが欠落、YAML が不正、必須フィールドが欠落している場合に `ValidationError`。

**例：**

```ts
import { parseSkillMd } from "@knowledgepulse/sdk";

const content = `---
name: code-reviewer
description: Reviews pull requests for code quality issues
version: "1.0.0"
author: acme-corp
tags:
  - code-review
  - quality
allowed-tools:
  - github_pr_read
  - github_pr_comment
kp:
  knowledge_capture: true
  domain: code-review
  quality_threshold: 0.8
  privacy_level: aggregated
  visibility: network
  reward_eligible: true
---

## Instructions

You are a code review assistant. Analyze the given pull request
and provide actionable feedback on code quality, security, and
best practices.
`;

const parsed = parseSkillMd(content);

console.log(parsed.frontmatter.name);       // "code-reviewer"
console.log(parsed.frontmatter.tags);        // ["code-review", "quality"]
console.log(parsed.kp?.knowledge_capture);   // true
console.log(parsed.kp?.quality_threshold);   // 0.8
console.log(parsed.body);                    // "\n## Instructions\n\nYou are a ..."
```

---

### `generateSkillMd(frontmatter, body, kp?)`

構造化されたコンポーネントから SKILL.md 文字列を生成します。

```ts
function generateSkillMd(
  frontmatter: SkillMdFrontmatter,
  body: string,
  kp?: SkillMdKpExtension,
): string
```

**パラメータ：**

| パラメータ | 型 | 説明 |
|-----------|------|-------------|
| `frontmatter` | `SkillMdFrontmatter` | 標準 YAML フロントマターフィールド |
| `body` | `string` | Markdown ボディコンテンツ |
| `kp` | `SkillMdKpExtension` | _（オプション）_ KnowledgePulse 拡張フィールド |

**戻り値：** YAML フロントマターデリミタ（`---`）付きの完全な SKILL.md 文字列。

**例：**

```ts
import { generateSkillMd } from "@knowledgepulse/sdk";

const skillMd = generateSkillMd(
  {
    name: "data-analyst",
    description: "Analyzes datasets and produces insights",
    version: "0.2.0",
    tags: ["analytics", "data"],
    "allowed-tools": ["sql_query", "chart_render"],
  },
  "## Instructions\n\nAnalyze the provided dataset and generate a summary report.",
  {
    knowledge_capture: true,
    domain: "data-analysis",
    quality_threshold: 0.7,
    visibility: "org",
  },
);

console.log(skillMd);
```

---

### `validateSkillMd(content)`

SKILL.md 文字列をスローせずにバリデーションします。サニタイズとスキーマバリデーションの両方を実行し、すべてのエラーを収集します。

```ts
function validateSkillMd(content: string): {
  valid: boolean;
  errors: string[];
}
```

**パラメータ：**

| パラメータ | 型 | 説明 |
|-----------|------|-------------|
| `content` | `string` | 生の SKILL.md ファイルコンテンツ |

**戻り値：** `valid`（ブール値）と `errors`（人間が読める文字列の配列）を持つオブジェクト。`valid` が `true` の場合でも、`errors` 配列に致命的でない警告が含まれる場合があります（例："Warning: Removed HTML comments"）。

**例：**

```ts
import { validateSkillMd } from "@knowledgepulse/sdk";

// 有効なドキュメント
const good = validateSkillMd(`---
name: my-skill
description: A helpful skill
---

Instructions here.
`);
console.log(good.valid);   // true
console.log(good.errors);  // []

// 無効なドキュメント（必須フィールドの欠落）
const bad = validateSkillMd(`---
name: my-skill
---

No description field.
`);
console.log(bad.valid);    // false
console.log(bad.errors);
// [
//   "Invalid SKILL.md frontmatter",
//   "  description: Required"
// ]
```

## SKILL.md フォーマット

SKILL.md ファイルは YAML フロントマターデリミタ（`---`）で区切られた2つのセクションで構成されます：

```
---
<YAML フロントマター>
---

<Markdown ボディ>
```

### 標準フロントマターフィールド

| フィールド | 型 | 必須 | 説明 |
|-------|------|----------|-------------|
| `name` | `string` | はい | ユニークなスキル識別子 |
| `description` | `string` | はい | 人間が読める説明 |
| `version` | `string` | いいえ | セマンティックバージョン |
| `author` | `string` | いいえ | 作成者または組織 |
| `license` | `string` | いいえ | SPDX ライセンス識別子 |
| `tags` | `string[]` | いいえ | 検索可能なタグ |
| `allowed-tools` | `string[]` | いいえ | このスキルが呼び出せる MCP ツール |

### KnowledgePulse 拡張（`kp:`）

`kp:` ブロックはフロントマター内のオプションのネストされたオブジェクトです。KnowledgePulse プロトコルがこのスキルとどのようにインタラクションするかを設定します。

| フィールド | 型 | デフォルト | 説明 |
|-------|------|---------|-------------|
| `knowledge_capture` | `boolean` | -- | このスキルの自動ナレッジキャプチャを有効化 |
| `domain` | `string` | -- | ナレッジ分類に使用されるタスクドメイン |
| `quality_threshold` | `number` | -- | キャプチャされたナレッジがコントリビュートされるための最小品質スコア（0.0-1.0） |
| `privacy_level` | `PrivacyLevel` | -- | キャプチャされたナレッジのプライバシーレベル |
| `visibility` | `Visibility` | -- | キャプチャされたナレッジの可視性スコープ |
| `reward_eligible` | `boolean` | -- | このスキルからのコントリビューションがトークン報酬の対象かどうか |

## 後方互換性

`kp:` 拡張は完全な後方互換性を持つよう設計されています：

- `kp:` キーを理解しないツールは、YAML パース時にそれを単に無視します。
- `kp:` フィールドはすべてオプションであり、SKILL.md ファイルはそれらなしでも機能します。
- 標準フィールド（`name`、`description`、`tags` など）は変更されません。

これは、標準フォーマットを消費するツールを壊すことなく、既存の SKILL.md ファイルに KnowledgePulse 設定を追加できることを意味します。

## エラーハンドリング

`parseSkillMd` が無効な入力に遭遇した場合、構造化された `issues` 配列を持つ `ValidationError` をスローします：

```ts
import { parseSkillMd, ValidationError } from "@knowledgepulse/sdk";

try {
  parseSkillMd(invalidContent);
} catch (err) {
  if (err instanceof ValidationError) {
    console.error(err.message);
    // "Invalid SKILL.md frontmatter"

    for (const issue of err.issues) {
      console.error(`  ${issue.path}: ${issue.message}`);
      // "description: Required"
      // "kp.quality_threshold: Number must be less than or equal to 1"
    }
  }
}
```

`issues` 配列の各エントリには以下が含まれます：

| フィールド | 型 | 説明 |
|-------|------|-------------|
| `path` | `string` | 無効なフィールドへのドット区切りパス（例：`"kp.quality_threshold"`） |
| `message` | `string` | バリデーション失敗の人間が読める説明 |

`kp:` 拡張エラーの場合、パスには標準フロントマターエラーと区別するために `kp.` プレフィックスが付きます。
