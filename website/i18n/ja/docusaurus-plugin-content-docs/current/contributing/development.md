---
sidebar_position: 1
title: 開発環境セットアップ
description: KnowledgePulse モノレポのローカル開発環境のセットアップ方法。
sidebar_label: 開発環境
---

# 開発環境セットアップ

このガイドでは、KnowledgePulse モノレポのローカル開発環境のセットアップ手順を説明します。

## 前提条件

- **Bun** v1.0 以降 -- [インストール手順](https://bun.sh/docs/installation)
- **Git**

## クローンとインストール

```bash
git clone https://github.com/nicobailon/knowledgepulse.git
cd knowledgepulse
bun install
```

`bun install` はモノレポ内のすべてのパッケージのワークスペース依存関係を解決します。

## モノレポ構成

```
knowledgepulse/
  packages/
    sdk/           # @knowledgepulse/sdk -- 型、キャプチャ、検索、スコアリング、skill-md、マイグレーション
    mcp-server/    # @knowledgepulse/mcp -- 6つの MCP ツール、デュアルモードレジストリブリッジ
    cli/           # @knowledgepulse/cli -- search、install、validate、contribute、auth、security
    sop-studio/    # プレースホルダー（Phase 3）
  registry/        # Hono REST API サーバー（インメモリストア、認証、レート制限）
  specs/           # codegen.ts、validate-consistency.ts、skill-md-extension.md
  examples/        # basic-sdk-usage、mcp-client-example、langraph-integration
```

## 一般的なタスク

### SDK のビルド

SDK は **tsup** でビルドされ、ESM、CJS、TypeScript 宣言ファイルを出力します。

```bash
bun run build
```

### JSON スキーマの生成

SDK の Zod 型から `specs/knowledge-unit-schema.json` を再生成します。

```bash
bun run codegen
```

### リント

プロジェクトはフォーマットとリントに **Biome** を使用しています。

```bash
bun run lint
```

### テストの実行

すべてのテストは `bun:test` で記述され、ソースファイルと同じ場所に `*.test.ts` として配置されています。完全なテストスイートは15ファイル、319テストで構成されています。

```bash
bun test --recursive
```

### レジストリの起動

レジストリはインメモリストアを持つ Hono HTTP サーバーです。デフォルトではポート 3000 でリッスンします。

```bash
bun run registry/src/index.ts
```

### MCP サーバーの起動

MCP サーバーはデフォルトでポート 3001 でリッスンします。スタンドアロンモードとプロキシモードの詳細は [MCP サーバーセットアップ](../mcp-server/setup.md) ガイドを参照してください。

```bash
bun run packages/mcp-server/src/index.ts
```

## クイックリファレンス

| タスク | コマンド |
|---|---|
| 依存関係のインストール | `bun install` |
| SDK のビルド | `bun run build` |
| JSON スキーマの生成 | `bun run codegen` |
| リント | `bun run lint` |
| 全テストの実行 | `bun test --recursive` |
| レジストリの起動（ポート 3000） | `bun run registry/src/index.ts` |
| MCP サーバーの起動（ポート 3001） | `bun run packages/mcp-server/src/index.ts` |
