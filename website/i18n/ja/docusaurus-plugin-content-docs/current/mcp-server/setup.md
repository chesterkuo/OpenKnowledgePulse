---
sidebar_position: 1
title: MCP サーバーセットアップ
description: KnowledgePulse MCP サーバーのインストール、設定、スタンドアロンモードまたはプロキシモードでの実行方法。
sidebar_label: セットアップ
---

# MCP サーバーセットアップ

KnowledgePulse MCP サーバー（`@knowledgepulse/mcp` v1.1.0）は、KnowledgePulse プロトコルを [Model Context Protocol](https://modelcontextprotocol.io/) ツールのセットとして公開し、MCP 対応の AI クライアントから呼び出すことができます。

## トランスポート

サーバーは **Streamable HTTP** トランスポートを使用します：

| エンドポイント | メソッド | 説明 |
|---|---|---|
| `/mcp` | `POST` | MCP ツール呼び出し（Streamable HTTP） |
| `/health` | `GET` | ヘルスチェック |

ヘルスチェック成功時のレスポンス：

```json
{
  "status": "ok",
  "name": "knowledgepulse-mcp",
  "version": "1.1.0"
}
```

## デュアルモード動作

MCP サーバーは `KP_REGISTRY_URL` 環境変数の設定有無に応じて、2つのモードで動作します。

### スタンドアロンモード（デフォルト）

スタンドアロンモードでは、サーバーは独自のインメモリストアを使用します。最も簡単な起動方法であり、ローカル開発やテストに適しています。

```bash
bun run packages/mcp-server/src/index.ts
```

デフォルトではポート 3001 で起動します。外部サービスは不要です。

### プロキシモード

プロキシモードでは、サーバーは実行中の KnowledgePulse レジストリインスタンスにすべてのリクエストを転送します。`KP_REGISTRY_URL` を設定してプロキシモードを有効にし、オプションで認証済みエンドポイント用に `KP_API_KEY` を指定します。

```bash
KP_REGISTRY_URL=http://localhost:8080 KP_API_KEY=kp_abc123 \
  bun run packages/mcp-server/src/index.ts
```

このモードでは、MCP サーバーは薄いブリッジとして動作します：MCP ツール呼び出しをレジストリ REST API リクエストに変換し、結果をクライアントに返します。

## 環境変数

| 変数 | 説明 | デフォルト |
|---|---|---|
| `KP_MCP_PORT` | MCP サーバーがリッスンするポート | `3001` |
| `KP_REGISTRY_URL` | プロキシモード用のレジストリ URL。未設定の場合、サーバーはスタンドアロンモードで動作します。 | _（未設定）_ |
| `KP_API_KEY` | プロキシモードでレジストリへの認証済みリクエストに送信される API キー。 | _（未設定）_ |

## AI フレームワークとの統合

MCP サーバーは Streamable HTTP トランスポート経由の MCP 対応クライアントと連携します。例：

- **Claude Desktop** -- サーバー URL を MCP 設定に追加します。
- **LangGraph** -- MCP ツールアダプターを使用してサーバーに接続します。
- **CrewAI** -- サーバーを MCP ツールプロバイダーとして登録します。
- **AutoGen** -- MCP クライアント SDK を介してエージェントをサーバーに接続します。

クライアントを `http://localhost:3001/mcp`（または設定したホストとポート）に向けると、6つの KnowledgePulse ツールがエージェントから利用可能になります。完全なリファレンスは [MCP ツール](./tools.md) を参照してください。
