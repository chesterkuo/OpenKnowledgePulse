---
sidebar_position: 3
title: ドキュメントインポート
description: LLM を活用した抽出機能で、DOCX や PDF ドキュメントから既存の SOP をインポートします。
sidebar_label: ドキュメントインポート
---

# ドキュメントインポート

SOP Studio は DOCX や PDF ドキュメントから既存の標準作業手順書をインポートできます。LLM がドキュメントのコンテンツからデシジョンツリー構造を抽出し、ビジュアルエディターで確認・修正できます。

## 対応フォーマット

| フォーマット | 拡張子 | 備考 |
|--------|-----------|-------|
| Microsoft Word | `.docx` | テーブル、リスト、見出しが保持されます |
| PDF | `.pdf` | テキストベースの PDF。スキャンされたドキュメントは非対応 |

## 仕組み

1. **アップロード** -- インポートエリアにファイルをドラッグするか、「Import Document」をクリックします。
2. **パース** -- SDK がクライアントサイドで `parseDocx` または `parsePdf` を使用してドキュメントをパースします。
3. **抽出** -- パースされたテキストが LLM（クライアントサイド、ユーザー自身の API キーを使用）に送信され、構造化されたデシジョンツリーが抽出されます。
4. **レビュー** -- 抽出されたツリーがビジュアルエディターに読み込まれ、確認と調整ができます。
5. **保存** -- 内容に問題がなければ、SOP をレジストリに保存します。

## LLM の設定

ドキュメントの抽出には LLM を使用して、非構造化テキストを構造化デシジョンツリーに変換します。LLM 呼び出しは完全にクライアントサイドで実行されます -- SOP Studio がドキュメントを KnowledgePulse サーバーに送信することはありません。

設定パネルで LLM プロバイダーを設定します：

```ts
import type { LLMConfig } from "@knowledgepulse/sdk";

const config: LLMConfig = {
  provider: "openai",          // "openai" | "anthropic" | "ollama"
  apiKey: "sk-...",            // API キー（ローカルに保存）
  model: "gpt-4o",            // モデル識別子
  baseUrl: undefined,          // カスタムエンドポイント（Ollama の場合は必須）
  temperature: 0.2,           // 低いほど抽出が確定的に
};
```

### 対応プロバイダー

| プロバイダー | モデル | ローカル？ |
|----------|--------|--------|
| OpenAI | `gpt-4o`、`gpt-4o-mini` | いいえ |
| Anthropic | `claude-sonnet-4-20250514`、`claude-haiku-4-20250414` | いいえ |
| Ollama | 任意のローカルモデル | はい |

## SDK 関数

ドキュメントインポートパイプラインは3つの SDK 関数を使用します：

### `parseDocx(buffer: ArrayBuffer): Promise<ParseResult>`

DOCX ファイルをパースし、構造化テキストコンテンツを返します。

```ts
import { parseDocx } from "@knowledgepulse/sdk";

const buffer = await file.arrayBuffer();
const result = await parseDocx(buffer);

console.log(result.text);       // プレーンテキストコンテンツ
console.log(result.sections);   // 見出しベースのセクション
console.log(result.tables);     // 抽出されたテーブル
```

### `parsePdf(buffer: ArrayBuffer): Promise<ParseResult>`

PDF ファイルをパースし、構造化テキストコンテンツを返します。

```ts
import { parsePdf } from "@knowledgepulse/sdk";

const buffer = await file.arrayBuffer();
const result = await parsePdf(buffer);
```

### `extractDecisionTree(parseResult: ParseResult, config: LLMConfig): Promise<ExtractionResult>`

パースされたドキュメントコンテンツを設定済みの LLM に送信し、構造化デシジョンツリーを返します。

```ts
import { extractDecisionTree } from "@knowledgepulse/sdk";

const extraction = await extractDecisionTree(result, config);

console.log(extraction.name);           // 検出された SOP 名
console.log(extraction.domain);         // 検出されたドメイン
console.log(extraction.decision_tree);  // ExpertSOP decision_tree 配列
console.log(extraction.confidence);     // 0.0 ～ 1.0
console.log(extraction.warnings);       // 抽出の問題点
```

## レビューワークフロー

抽出後、デシジョンツリーはビジュアルインジケーター付きでエディターに読み込まれます：

| インジケーター | 意味 |
|-----------|---------|
| 緑のアウトライン | 高信頼度の抽出（0.8 以上） |
| 黄色のアウトライン | 中信頼度（0.5--0.8）、レビューを推奨 |
| 赤のアウトライン | 低信頼度（0.5 未満）、手動編集が必要な可能性 |

各ノードのプロパティを確認し、抽出エラーを修正し、不足している接続を追加してから保存してください。

## ヒント

- **ドキュメントの構造化** -- 番号付きステップ、見出し、テーブルを含む SOP はより良い抽出結果を生成します。
- **低い temperature を使用** -- 0.1--0.2 の temperature はより一貫したデシジョンツリーを生成します。
- **必ずレビュー** -- LLM の抽出は完璧ではありません。レジストリに保存する前に必ず結果を確認してください。
