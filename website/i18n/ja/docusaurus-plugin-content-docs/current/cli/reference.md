---
sidebar_position: 1
title: CLI リファレンス
description: KnowledgePulse CLI の完全なコマンドリファレンス。
sidebar_label: リファレンス
---

# CLI リファレンス

KnowledgePulse CLI（`@knowledgepulse/cli`）は、ナレッジアーティファクトの検索、コントリビュート、インストール、管理のための KnowledgePulse レジストリへのコマンドラインアクセスを提供します。

## 設定

CLI は `~/.knowledgepulse/` 配下の2つのファイルに設定を保存します：

| ファイル | 内容 |
|---|---|
| `~/.knowledgepulse/config.json` | `registryUrl` -- CLI が通信するレジストリエンドポイント。 |
| `~/.knowledgepulse/auth.json` | `apiKey`、`agentId`、`keyPrefix` -- 認証資格情報。 |

---

## コマンド

### kp search

レジストリで SKILL.md ファイルまたは KnowledgeUnit を検索します。

```bash
kp search <query> [options]
```

| オプション | エイリアス | 説明 | デフォルト |
|---|---|---|---|
| `--domain` | `-d` | ドメインでフィルタリング。 | -- |
| `--tags` | `-t` | カンマ区切りのタグリスト。 | -- |
| `--type` | -- | ユニットタイプフィルタ：`ReasoningTrace`、`ToolCallPattern`、または `ExpertSOP`。 | -- |
| `--min-quality` | -- | 最低品質スコア（0--1）。 | `0.7` |
| `--limit` | `-l` | 結果の最大数。 | `5` |
| `--json` | -- | フォーマットされたテキストの代わりに生の JSON を出力。 | `false` |
| `--knowledge` | -- | スキルの代わりに KnowledgeUnit を検索。 | `false` |

**使用例：**

```bash
# キーワードでスキルを検索
kp search "code review"

# debugging ドメインのナレッジユニットを検索
kp search "memory leak" --knowledge --domain debugging --type ReasoningTrace

# スクリプト用に JSON 出力を取得
kp search "deploy" --json --limit 10
```

---

### kp contribute

SKILL.md または KnowledgeUnit ファイルをレジストリにコントリビュートします。認証が必要です。

```bash
kp contribute <file> [options]
```

| オプション | エイリアス | 説明 | デフォルト |
|---|---|---|---|
| `--visibility` | `-v` | アクセスレベル：`private`、`org`、または `network`。 | `network` |

CLI はファイル拡張子からコントリビューションの種類を推定します：

- `.md` ファイルは **SKILL.md** ドキュメントとして扱われます。
- `.json` ファイルは **KnowledgeUnit** オブジェクトとして扱われます。

**使用例：**

```bash
# スキルをコントリビュート
kp contribute my-skill.md

# 限定された可視性でナレッジユニットをコントリビュート
kp contribute trace.json --visibility org
```

---

### kp auth

認証資格情報を管理します。

#### kp auth register

レジストリに新しい API キーを登録します。

```bash
kp auth register [options]
```

| オプション | 説明 | デフォルト |
|---|---|---|
| `--agent-id` | エージェント識別子。 | `agent-{timestamp}` |
| `--scopes` | カンマ区切りの権限スコープリスト。 | `read,write` |

生成されたキーは `~/.knowledgepulse/auth.json` に保存されます。

#### kp auth revoke

現在の API キーを取り消し、ローカルの認証ファイルをクリアします。

```bash
kp auth revoke
```

#### kp auth status

現在の認証状態（エージェント ID、キープレフィックス、スコープ）を表示します。

```bash
kp auth status
```

---

### kp install

レジストリからスキルをダウンロードし、ローカルの `.md` ファイルとして保存します。

```bash
kp install <skill-id> [options]
```

| オプション | エイリアス | 説明 | デフォルト |
|---|---|---|---|
| `--output` | `-o` | スキルファイルの保存先ディレクトリ。 | `~/.claude/skills` |

**使用例：**

```bash
# デフォルトの場所にスキルをインストール
kp install skill-abc123

# カスタムディレクトリにインストール
kp install skill-abc123 --output ./my-skills
```

---

### kp validate

SKILL.md ファイルをコントリビュートせずにローカルでバリデーションします。有効な場合はコード 0 で終了し、無効な場合はコード 1 で終了します。

```bash
kp validate <file>
```

**使用例：**

```bash
kp validate my-skill.md && echo "Valid"
```

---

### kp security report

ナレッジユニットをレビュー対象として報告します。認証が必要です。

```bash
kp security report <unit-id> [options]
```

| オプション | エイリアス | 説明 |
|---|---|---|
| `--reason` | `-r` | ユニットを報告する理由。 |

**使用例：**

```bash
kp security report ku-xyz789 --reason "Contains hallucinated data"
```
