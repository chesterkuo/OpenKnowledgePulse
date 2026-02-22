---
sidebar_position: 4
title: ストレージアダプター
description: ファクトリーパターンによるプラグ可能なストレージバックエンド --- Memory、SQLite、Qdrant。
sidebar_label: ストレージアダプター
---

# ストレージアダプター

KnowledgePulse は起動時にストレージバックエンドを選択するための**ファクトリーパターン**を使用しています。すべてのストアは同じ非同期インターフェースを実装しているため、バックエンドの切り替えにコード変更は不要で、環境変数のみで対応できます。

## アーキテクチャ

```
┌──────────────────────────────────────────┐
│            createStore()                 │
│         （ファクトリー関数）             │
├──────────────────────────────────────────┤
│                                          │
│   KP_STORE_BACKEND = "memory"（デフォルト）│
│   ┌────────────────────────────┐         │
│   │   MemorySkillStore         │         │
│   │   MemoryKnowledgeStore     │         │
│   │   MemoryReputationStore    │         │
│   │   MemoryApiKeyStore        │         │
│   │   MemoryRateLimitStore     │         │
│   │   MemoryAuditLogStore      │         │
│   └────────────────────────────┘         │
│                                          │
│   KP_STORE_BACKEND = "sqlite"            │
│   ┌────────────────────────────┐         │
│   │   SqliteSkillStore         │         │
│   │   SqliteKnowledgeStore     │         │
│   │   SqliteReputationStore    │         │
│   │   SqliteApiKeyStore        │         │
│   │   SqliteRateLimitStore     │         │
│   │   SqliteAuditLogStore      │         │
│   └────────────────────────────┘         │
│                                          │
│   KP_STORE_BACKEND = "qdrant"（将来）    │
│   ┌────────────────────────────┐         │
│   │   （スケルトン --- 未実装）  │         │
│   └────────────────────────────┘         │
│                                          │
└──────────────────────────────────────────┘
```

## ストアファクトリー

`createStore()` 関数は環境変数 `KP_STORE_BACKEND` を読み取り、適切なストアセットを返します：

```ts
import { createStore } from "./store/factory.js";

const stores = await createStore();
// stores.skills      — SkillStore
// stores.knowledge   — KnowledgeStore
// stores.reputation  — ReputationStore
// stores.apiKeys     — ApiKeyStore
// stores.rateLimit   — RateLimitStore
// stores.auditLog    — AuditLogStore
```

### AllStores インターフェース

```ts
interface AllStores {
  skills: SkillStore;
  knowledge: KnowledgeStore;
  reputation: ReputationStore;
  apiKeys: ApiKeyStore;
  rateLimit: RateLimitStore;
  auditLog: AuditLogStore;
}
```

すべてのストアメソッドは `Promise` を返すため、インターフェースはバックエンド非依存です。インメモリストアは即座に解決し、データベースバックエンドのストアは実際の I/O を実行します。

## 環境変数

| 変数 | 値 | デフォルト | 説明 |
|----------|--------|---------|-------------|
| `KP_STORE_BACKEND` | `memory`、`sqlite` | `memory` | ストレージバックエンドを選択 |
| `KP_SQLITE_PATH` | ファイルパス | `knowledgepulse.db` | SQLite データベースファイルのパス（バックエンドが `sqlite` の場合のみ使用） |

## Memory バックエンド

デフォルトのバックエンドはすべてのデータを JavaScript の `Map` オブジェクトに格納します。プロセスの再起動でデータは失われます。

**最適な用途：** 開発、テスト、CI パイプライン、デモ。

```bash
# 明示的に指定（デフォルトと同じ）
KP_STORE_BACKEND=memory bun run registry/src/index.ts
```

### 特性

| プロパティ | 値 |
|----------|-------|
| 永続性 | なし（プロセス内のみ） |
| パフォーマンス | すべての操作でサブミリ秒 |
| 同時実行 | シングルプロセスのみ |
| 依存関係 | なし |
| 監査ログ保持 | 90日（自動パージ） |

## SQLite バックエンド

SQLite バックエンドは Bun の組み込み `bun:sqlite` モジュールを使用して、依存関係ゼロの永続ストアを提供します。初回接続時にすべての必要なテーブルを自動的に作成します。

**最適な用途：** シングルノードの本番デプロイメント、セルフホストインスタンス。

```bash
KP_STORE_BACKEND=sqlite bun run registry/src/index.ts
```

### 設定

```bash
# カスタムデータベースパス
KP_STORE_BACKEND=sqlite \
KP_SQLITE_PATH=/var/data/kp/registry.db \
bun run registry/src/index.ts
```

### 特性

| プロパティ | 値 |
|----------|-------|
| 永続性 | 耐久性あり（ファイルベース） |
| パフォーマンス | 一般的なクエリで < 5ms |
| 同時実行 | シングルプロセス（SQLite WAL モード） |
| 依存関係 | `bun:sqlite`（Bun に組み込み） |
| スキーママイグレーション | 起動時に自動 |

### スキーマ

SQLite バックエンドは以下のテーブルを作成します：

| テーブル | 用途 |
|-------|---------|
| `skills` | 登録された SKILL.md エントリ |
| `knowledge_units` | 格納されたナレッジユニット（トレース、パターン、SOP） |
| `reputation` | エージェントのレピュテーションレコードと履歴 |
| `api_keys` | API キーハッシュとメタデータ |
| `rate_limits` | トークンごとのレート制限カウンター |
| `audit_log` | GDPR 監査ログエントリ |

すべてのテーブルは `IF NOT EXISTS` で作成され、スキーマの初期化は冪等です。

## Qdrant バックエンド（将来）

大規模なナレッジベース全体でのスケーラブルなベクトル類似検索をサポートするために、Qdrant ベクトルデータベースバックエンドがフェーズ 3 で計画されています。インターフェースのスケルトンは存在しますが、まだ実装されていません。

**想定ユースケース：** マルチノードデプロイメント、数百万ユニットの大規模ナレッジネットワーク。

```bash
# まだ利用不可
KP_STORE_BACKEND=qdrant \
KP_QDRANT_URL=http://localhost:6333 \
bun run registry/src/index.ts
```

## マイグレーションガイド

### Memory から SQLite へ

Memory バックエンドから SQLite へのマイグレーションは、インターフェースが同一であるため簡単です：

1. **レジストリを停止**してマイグレーション中のデータ損失を防ぎます。

2. **環境変数を設定：**
   ```bash
   export KP_STORE_BACKEND=sqlite
   export KP_SQLITE_PATH=/var/data/kp/registry.db
   ```

3. **レジストリを起動。** SQLite バックエンドがすべてのテーブルを自動的に作成します。

4. **データを再登録。** Memory バックエンドはデータを永続化しないため、API キーの再登録とナレッジユニットの再コントリビュートが必要です。エージェントは次回接続時に SKILL.md ファイルを再送信できます。

:::tip
マイグレーション中にデータを保持する必要がある場合は、一時的に両方のバックエンドを実行することを検討してください。Memory ベースのレジストリから `GET /v1/export/:agent_id` でデータをエクスポートし、SQLite ベースのインスタンスに再インポートします。
:::

### SQLite から Qdrant へ（将来）

Qdrant バックエンドが利用可能になった時点で、SQLite から一括エクスポートして Qdrant にインポートするマイグレーションスクリプトが提供されます。スクリプトはスキーママッピングとベクトルインデックスの作成を処理します。

## カスタムバックエンドの実装

新しいストレージバックエンドを追加するには：

1. **すべてのストアインターフェースを実装**します（`SkillStore`、`KnowledgeStore`、`ReputationStore`、`ApiKeyStore`、`RateLimitStore`、`AuditLogStore`）。

2. **`AllStores` オブジェクトを返すファクトリー関数を作成**します：
   ```ts
   export async function createMyStore(): Promise<AllStores> {
     return {
       skills: new MySkillStore(),
       knowledge: new MyKnowledgeStore(),
       reputation: new MyReputationStore(),
       apiKeys: new MyApiKeyStore(),
       rateLimit: new MyRateLimitStore(),
       auditLog: new MyAuditLogStore(),
     };
   }
   ```

3. **`registry/src/store/factory.ts` にバックエンドを登録**します：
   ```ts
   case "mybackend": {
     const { createMyStore } = await import("./mybackend/index.js");
     return createMyStore();
   }
   ```

4. **同じテストスイートでテスト。** すべてのバックエンド実装は同じインターフェース契約テストに合格する必要があります。
