---
sidebar_position: 1
title: はじめに
description: SOP Studio を起動し、レジストリ接続を設定し、最初の標準作業手順書を作成します。
sidebar_label: はじめに
---

# SOP Studio をはじめる

SOP Studio は標準作業手順書（SOP）を構築するためのビジュアルエディターです。作成した SOP は KnowledgePulse レジストリに `ExpertSOP` ナレッジユニットとして公開できます。ドラッグ＆ドロップのキャンバス、LLM 抽出によるドキュメントインポート、リアルタイムコラボレーション機能を提供します。

## 前提条件

- 実行中の KnowledgePulse レジストリインスタンス（ローカルまたはリモート）
- `write` スコープを持つ API キー（[認証](../registry/authentication.md) を参照）

## 設定

SOP Studio を起動する前に、以下の環境変数を設定してください：

```bash
export KP_REGISTRY_URL="http://localhost:3000"
export KP_API_KEY="kp_your_api_key_here"
```

または、起動後に SOP Studio の設定パネルで設定することもできます。

## SOP Studio の起動

SOP Studio の開発サーバーを起動します：

```bash
cd packages/sop-studio
bun run dev
```

デフォルトでは `http://localhost:5173` で開きます。

## 最初の SOP を作成する

1. **新規 SOP** -- トップツールバーの「New SOP」ボタンをクリックします。
2. **メタデータの設定** -- 右側のプロパティパネルで名前、ドメイン、説明を入力します。
3. **ステップの追加** -- パレットから Step ノードをキャンバスにドラッグします。各ステップには指示フィールドとオプションの評価基準があります。
4. **条件の追加** -- Condition ノードを使用して分岐ロジックを作成します（例：「重要度が高い場合、エスカレーション」）。
5. **ノードの接続** -- ノード間にエッジを引いてフローを定義します。
6. **保存** -- `Ctrl+S` を押すか「Save」をクリックして SOP をレジストリに保存します。

## SOP メタデータフィールド

| フィールド | 型 | 必須 | 説明 |
|-------|------|----------|-------------|
| `name` | string | はい | SOP の表示名 |
| `domain` | string | はい | タスクドメイン（例：`customer-support`） |
| `description` | string | いいえ | SOP の簡単な説明 |
| `visibility` | string | はい | `private`、`org`、または `network` |
| `tags` | string[] | いいえ | 検索可能なタグ |

## 例：最小限の SOP

```json
{
  "name": "Bug Triage",
  "domain": "engineering",
  "visibility": "org",
  "decision_tree": [
    {
      "step": "classify",
      "instruction": "Classify the bug by severity",
      "conditions": {
        "critical": { "action": "Escalate to on-call", "sla_min": 15 },
        "major": { "action": "Assign to sprint", "sla_min": 60 },
        "minor": { "action": "Add to backlog" }
      }
    }
  ]
}
```

## 次のステップ

- [デシジョンツリーエディター](./decision-tree-editor.md) -- ノードタイプとビジュアルキャンバスについて学ぶ
- [ドキュメントインポート](./document-import.md) -- DOCX や PDF から既存の SOP をインポート
- [コラボレーション](./collaboration.md) -- チームメンバーをリアルタイム編集に招待
