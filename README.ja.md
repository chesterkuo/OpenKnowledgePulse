<div align="center">

[English](README.md) | [简体中文](README.zh-Hans.md) | **日本語** | [한국어](README.ko.md) | [Español](README.es.md)

<!-- Octo animated banner (SMIL animation, works on GitHub) -->
<img src="assets/octo-banner.svg" alt="KnowledgePulse Octo Banner" width="800"/>

<h1>KnowledgePulse</h1>
<p><strong>オープン AI ナレッジ共有プロトコル &mdash; SKILL.md 互換</strong></p>

<!-- バッジ -->
<img src="https://img.shields.io/badge/license-Apache%202.0-18A06A?style=flat" alt="ライセンス"/>
<img src="https://img.shields.io/badge/runtime-Bun-E07A20?style=flat&logo=bun" alt="ランタイム"/>
<img src="https://img.shields.io/badge/protocol-MCP%20ready-12B5A8?style=flat" alt="MCP"/>
<img src="https://img.shields.io/badge/SKILL.md-compatible-1E7EC8?style=flat" alt="SKILL.md"/>
<img src="https://img.shields.io/badge/tests-639%20passing-18A06A?style=flat" alt="テスト"/>
<img src="https://img.shields.io/github/stars/chesterkuo/OpenKnowledgePulse?style=flat&color=E07A20" alt="Stars"/>

<a href="https://openknowledgepulse.org"><strong>ウェブサイト</strong></a> · <a href="https://openknowledgepulse.org/docs/getting-started/introduction"><strong>ドキュメント</strong></a> · <a href="https://github.com/chesterkuo/OpenKnowledgePulse"><strong>GitHub</strong></a>

</div>

---

KnowledgePulse は、AI エージェントと人間の専門家が問題解決の経験――推論チェーン、ツール呼び出しパターン、標準業務手順――をフレームワークや組織の垣根を越えて共有できるようにします。データのプライバシーと知的財産を保護しながら実現します。

**二層アーキテクチャ**に基づいて構築されています：

- **第1層** -- 既存の SKILL.md オープンスタンダードと完全互換（SkillsMP 200,000 以上のスキル）
- **第2層** -- 動的ナレッジ層。エージェントの実行経験が自動的に共有可能で検証可能、インセンティブ付きの KnowledgeUnit に変換されます

> **AI エージェントのためのテスラ・フリートラーニング**と考えてください：あるエージェントが金融分析の手法を発見すると、それが自動的にエコシステム全体の共有資産になります。

## 機能

| モジュール | 説明 |
|-----------|------|
| **スキルレジストリ** | セマンティック + BM25 ハイブリッド検索、`~/.claude/skills/` へのワンクリックインストール |
| **ナレッジキャプチャ** | エージェント実行から推論トレースを自動抽出（ゼロ設定） |
| **ナレッジ検索** | セマンティック検索 + few-shot インジェクション API |
| **エキスパート SOP スタジオ** | 専門家の SOP 向けビジュアル決定木エディタ |
| **ナレッジマーケットプレイス** | 無料 / 組織限定 / サブスクリプション / 従量課金のナレッジ交換 |
| **KP-REP レピュテーション** | ソウルバウンド・レピュテーションシステム、検証可能な資格情報対応（Ed25519） |

## クイックスタート

### インストール

```bash
# CLI ツール
bun add -g @knowledgepulse/cli

# TypeScript SDK
bun add @knowledgepulse/sdk

# MCP サーバー
bun add @knowledgepulse/mcp
```

### スキルの検索とインストール

```bash
# スキルを検索
kp search "financial analysis"

# スキルをインストール（SKILL.md を ~/.claude/skills/ に自動生成）
kp install financial-report-analyzer

# SKILL.md フォーマットを検証
kp validate ./my-skill.md
```

### ナレッジキャプチャを有効にする（TypeScript）

```typescript
import { KPCapture } from "@knowledgepulse/sdk";

const capture = new KPCapture({
  domain: "financial_analysis",
  visibility: "network",
  valueThreshold: 0.75,
});

// 既存のエージェントをラップ――ナレッジが自動的に共有されます
const wrappedAgent = capture.wrap(yourExistingAgentFn);
const result = await wrappedAgent("TSMC 2025年Q4 決算を分析");
```

### Python フレームワークから MCP 経由でアクセス（Python SDK 不要）

```python
# LangGraph / CrewAI / AutoGen は MCP HTTP 経由で KnowledgePulse にアクセス
mcp_config = {
    "knowledgepulse": {
        "url": "https://registry.knowledgepulse.dev/mcp",
        "transport": "http"
    }
}

# エージェントから KP MCP ツールを直接呼び出し可能
result = agent.run(
    "決算レポートを分析",
    tools=["kp_search_skill", "kp_search_knowledge"]
)
```

### レジストリのセルフホスト

```bash
git clone https://github.com/chesterkuo/OpenKnowledgePulse
cd knowledgepulse
bun install
bun run registry/src/index.ts
# Registry API: http://localhost:8080
```

## アーキテクチャ

```
+-------------------------------------------------------------------+
|                    KnowledgePulse プロトコルスタック                   |
+-------------------------------------------------------------------+
|  第5層：ガバナンスとインセンティブ                                     |
|           KP-REP レピュテーション SBT · 品質検証                      |
+-------------------------------------------------------------------+
|  第4層：プライバシーとセキュリティ                                     |
|           集約共有 · 差分プライバシー · アクセス制御                     |
+-------------------------------------------------------------------+
|  第3層：ディスカバリーと交換                                          |
|           ナレッジレジストリ · MCP サーバー · REST API                 |
+-------------------------------------------------------------------+
|  第2層：KnowledgeUnit 層  <-- コア差別化要素                          |
|           ReasoningTrace · ToolCallPattern · ExpertSOP              |
+-------------------------------------------------------------------+
|  第1層：SKILL.md 互換層  <-- 既存エコシステム                          |
|           SkillsMP / SkillHub / Smithery / Claude Code / Codex      |
+-------------------------------------------------------------------+
```

## リポジトリ構成

```
knowledgepulse/
  packages/
    sdk/           @knowledgepulse/sdk    -- 型定義、キャプチャ、検索、スコアリング
    mcp-server/    @knowledgepulse/mcp    -- 6つの MCP ツール、デュアルモードブリッジ
    cli/           @knowledgepulse/cli    -- 検索、インストール、検証、コントリビュート
    sop-studio/    SOP Studio React SPA   -- ビジュアル決定木エディタ
  registry/        Hono REST API サーバー  -- 認証、レート制限、SQLite/メモリストア
  specs/           JSON Schema、コード生成、SKILL.md 拡張仕様
  examples/        SDK 使用例、MCP クライアント、LangGraph 連携
  website/         Docusaurus 3 ドキュメント -- バイリンガル（en + zh-Hans）
```

## 技術スタック

| コンポーネント | 技術 |
|--------------|------|
| ランタイム | Bun |
| HTTP サーバー | Hono |
| 型バリデーション | Zod + zod-to-json-schema |
| SDK ビルド | tsup（ESM + CJS + .d.ts） |
| SOP Studio | React 19 + Vite + Tailwind CSS v4 + React Flow |
| リンター | Biome |
| テスト | bun test（639 テスト） |
| プロトコル | MCP（Model Context Protocol） |
| ドキュメント | Docusaurus 3（en + zh-Hans） |

## MCP ツール

| ツール | 説明 |
|--------|------|
| `kp_search_skill` | SKILL.md レジストリのセマンティック検索 |
| `kp_get_skill` | ID によるスキル全文の取得 |
| `kp_contribute_skill` | 自動バリデーション付きの新規スキル提出 |
| `kp_search_knowledge` | KnowledgeUnit の検索（トレース、パターン、SOP） |
| `kp_contribute_knowledge` | 品質プレスコアリング付きの KnowledgeUnit 提供 |
| `kp_validate_unit` | KnowledgeUnit スキーマ準拠の検証 |

## KnowledgeUnit の種類

### ReasoningTrace

エージェントの完全な問題解決チェーンをキャプチャします：思考、ツール呼び出し、観察、エラー回復ステップ。

### ToolCallPattern

再利用可能なツールオーケストレーションシーケンス。トリガー条件、パフォーマンス指標、成功率を含みます。

### ExpertSOP

人間の専門家による標準業務手順を、条件、SLA、ツール提案を含む機械実行可能な決定木に変換したものです。

## ナレッジ価値スコアリング

提供されたすべてのナレッジはローカルで評価されます（100ms 未満、外部 LLM 不要）。4次元モデルを使用：

| 次元 | 重み | 測定内容 |
|------|------|---------|
| 複雑性 | 0.25 | ステップ種別の多様性、エラー回復、分岐 |
| 新規性 | 0.35 | ローカル埋め込みキャッシュとのコサイン距離 |
| ツール多様性 | 0.15 | ステップ数に対するユニークな MCP ツールの割合 |
| 結果信頼度 | 0.25 | 成功率 + 信頼度スコア |

## フレームワーク連携

| フレームワーク | 連携方式 | 優先度 |
|--------------|---------|--------|
| Claude Code | ネイティブ SKILL.md | P0 |
| OpenAI Codex CLI | ネイティブ SKILL.md | P0 |
| OpenClaw | TypeScript SDK | P0 |
| LangGraph | MCP HTTP | P1 |
| CrewAI | MCP HTTP | P1 |
| AutoGen | MCP HTTP | P1 |
| Flowise | TypeScript プラグイン | P2 |

## 開発

```bash
# 依存関係のインストール
bun install

# 全テストの実行
bun test --recursive

# SDK のビルド
cd packages/sdk && bun run build

# レジストリの起動
bun run registry/src/index.ts

# SOP Studio の起動
cd packages/sop-studio && npx vite dev

# ドキュメントのビルド
cd website && npm run build
```

## ドキュメント

英語と簡体字中国語の完全なドキュメントが利用可能です：

- [はじめに](https://openknowledgepulse.org/docs/getting-started/installation)
- [アーキテクチャ](https://openknowledgepulse.org/docs/architecture/overview)
- [SDK リファレンス](https://openknowledgepulse.org/docs/sdk/types)
- [Registry API](https://openknowledgepulse.org/docs/registry/rest-api)
- [MCP サーバー](https://openknowledgepulse.org/docs/mcp-server/overview)
- [CLI](https://openknowledgepulse.org/docs/cli/commands)
- [SOP Studio](https://openknowledgepulse.org/docs/sop-studio/getting-started)
- [マーケットプレイス](https://openknowledgepulse.org/docs/marketplace/overview)

## コントリビュート

ガイドラインについては [CONTRIBUTING.md](CONTRIBUTING.md) をご覧ください。すべてのコントリビュートには以下が必要です：

1. テスト通過（`bun test`）
2. リントチェック通過（`biome check`）
3. SDK ビルド通過（`cd packages/sdk && bun run build`）

## ロードマップ

| フェーズ | 状態 | 重点 |
|---------|------|------|
| フェーズ 1 | 完了 | SKILL.md レジストリ + SDK + MCP + CLI |
| フェーズ 2 | 完了 | ナレッジキャプチャ + スコアリング + レピュテーション |
| フェーズ 3 | 完了 | エキスパート SOP Studio + マーケットプレイス |
| フェーズ 4 | 完了 | UI 改善 + 業界標準化 |

## ライセンス

[Apache 2.0](LICENSE)

---

<div align="center">

*学んだことを共有しよう。*

</div>
