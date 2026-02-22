---
sidebar_position: 1
title: インストール
description: TypeScript / JavaScript プロジェクトへの KnowledgePulse SDK のインストールと設定。
sidebar_label: インストール
---

# インストール

`@knowledgepulse/sdk` パッケージは、KnowledgePulse プロトコルのための TypeScript/JavaScript 型、バリデーションスキーマ、ナレッジキャプチャ、取得、スコアリング、SKILL.md ユーティリティを提供します。

- **バージョン:** 0.1.0
- **ライセンス:** Apache-2.0

## インストール

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
<TabItem value="bun" label="Bun" default>

```bash
bun add @knowledgepulse/sdk
```

</TabItem>
<TabItem value="npm" label="npm">

```bash
npm install @knowledgepulse/sdk
```

</TabItem>
<TabItem value="yarn" label="Yarn">

```bash
yarn add @knowledgepulse/sdk
```

</TabItem>
<TabItem value="pnpm" label="pnpm">

```bash
pnpm add @knowledgepulse/sdk
```

</TabItem>
</Tabs>

## モジュールフォーマット

SDK は完全な TypeScript 宣言付きのデュアルフォーマットパッケージとして出荷されます。ESM と CommonJS の両方がそのまま使用できます。

### ESM（推奨）

```ts
import {
  KPCapture,
  KPRetrieval,
  evaluateValue,
  parseSkillMd,
  KnowledgeUnitSchema,
} from "@knowledgepulse/sdk";
```

### CommonJS

```js
const {
  KPCapture,
  KPRetrieval,
  evaluateValue,
  parseSkillMd,
  KnowledgeUnitSchema,
} = require("@knowledgepulse/sdk");
```

## エクスポートマップ

パッケージは条件付きエクスポートを持つ単一のエントリポイント（`.`）を公開します：

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  }
}
```

| パス | フォーマット | ファイル |
|------|--------|------|
| `types` | TypeScript 宣言 | `dist/index.d.ts` |
| `import` | ESM | `dist/index.js` |
| `require` | CommonJS | `dist/index.cjs` |

## 依存関係

| パッケージ | バージョン | 用途 |
|---------|---------|---------|
| `zod` | ^3.23.0 | すべてのナレッジユニットタイプのランタイムバリデーションスキーマ |
| `yaml` | ^2.4.0 | SKILL.md YAML フロントマターのパースと生成 |

### オプション依存関係

| パッケージ | バージョン | サイズ | 用途 |
|---------|---------|------|---------|
| `@huggingface/transformers` | ^3.0.0 | ~80 MB | 新規性スコアリング用のエンベディングモデル（`Xenova/all-MiniLM-L6-v2`） |

`@huggingface/transformers` パッケージはオプション依存関係として記載されています。`evaluateValue()` スコアリング関数の新規性次元でのみ使用されます。インストールされていない場合、新規性スコアはデフォルト値 `0.5` にフォールバックします。

明示的にインストールするには：

```bash
bun add @huggingface/transformers
```

## TypeScript

完全な型宣言がパッケージの `dist/index.d.ts` に含まれています。追加の `@types/*` パッケージは不要です。

SDK は TypeScript 5.0 以降を必要とし、ES2020 をターゲットにしています。`tsconfig.json` で `moduleResolution: "bundler"` または `"node16"` を使用している場合、エクスポートマップは自動的に解決されます。

```jsonc
// tsconfig.json（推奨設定）
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ES2020",
    "strict": true
  }
}
```

## インストールの確認

パッケージが正しくインストールされたかクイックチェックを実行します：

```ts
import { KnowledgeUnitSchema, generateTraceId } from "@knowledgepulse/sdk";

console.log(generateTraceId());
// kp:trace:550e8400-e29b-41d4-a716-446655440000

console.log(typeof KnowledgeUnitSchema.parse);
// "function"
```

## 次のステップ

- [型](./types.md) -- すべてのナレッジユニットタイプと Zod スキーマを探索
- [SKILL.md](./skill-md.md) -- SKILL.md ファイルのパース、生成、バリデーション
- [スコアリング](./scoring.md) -- 価値スコアリングアルゴリズムを理解
- [ユーティリティ](./utilities.md) -- ID ジェネレーター、ハッシュ、サニタイズ、キャプチャ、取得
