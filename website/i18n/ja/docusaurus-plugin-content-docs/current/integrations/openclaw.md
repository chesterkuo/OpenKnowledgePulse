---
sidebar_position: 3
title: OpenClaw SDK
description: KnowledgePulse TypeScript SDK を OpenClaw やその他の TypeScript エージェントフレームワークから直接使用します。
sidebar_label: OpenClaw SDK
---

# OpenClaw SDK インテグレーション

[OpenClaw](https://github.com/openclaw) やその他の TypeScript ベースのエージェントフレームワークは、`@knowledgepulse/sdk` を直接使用してネイティブ統合を実現できます。このガイドでは、`KPCapture` と `KPRetrieval` を使用して、任意の TypeScript エージェントに透過的なナレッジキャプチャとリトリーバルを追加する方法を説明します。

## 概要

HTTP を使用する Python インテグレーションとは異なり、TypeScript フレームワークは SDK の直接使用によるメリットがあります：

- **KPCapture**：エージェント関数をラップして、推論トレースの自動キャプチャとスコアリングを行います。
- **KPRetrieval**：レジストリを検索し、結果を Few-Shot プロンプトとしてフォーマットします。

```
┌──────────────────────────────────────────┐
│          TypeScript Agent                │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │         KPCapture.wrap()           │  │
│  │  (透過的なトレースキャプチャ)        │  │
│  └──────────────┬─────────────────────┘  │
│                 │                         │
│  ┌──────────────▼─────────────────────┐  │
│  │       KPRetrieval.search()         │  │
│  │  (Few-Shot ナレッジ注入)            │  │
│  └──────────────┬─────────────────────┘  │
│                 │                         │
└─────────────────┼─────────────────────────┘
                  │
           ┌──────▼──────────────┐
           │  KP Registry (:8080)│
           └─────────────────────┘
```

## 前提条件

- Bun または Node.js 20+
- 実行中の KnowledgePulse レジストリ：`bun run registry/src/index.ts`

```bash
bun add @knowledgepulse/sdk
```

## ナレッジキャプチャ

### エージェント関数のラップ

`KPCapture.wrap()` は任意の async 関数を受け取り、関数の実行時に推論トレースを自動的にキャプチャするラップ版を返します。トレースが品質閾値を超えた場合、レジストリにコントリビュートされます。

```ts
import { KPCapture } from "@knowledgepulse/sdk";

const capture = new KPCapture({
  domain: "code_review",
  visibility: "network",
  valueThreshold: 0.75,
  registryUrl: "http://localhost:8080",
});

// 既存のエージェント関数
async function codeReviewAgent(codeSnippet: string): Promise<string> {
  // エージェントロジック...
  return `Analysis complete for: ${codeSnippet}`;
}

// ラップ -- ナレッジキャプチャが自動的に行われます
const wrappedAgent = capture.wrap(codeReviewAgent);

// 通常通り使用
const result = await wrappedAgent("function processData(items) { ... }");
```

### 設定オプション

| オプション | 型 | デフォルト | 説明 |
|--------|------|---------|-------------|
| `domain` | string | `"general"` | スコアリング重み選択のためのタスクドメイン |
| `visibility` | string | `"network"` | 可視性スコープ：`"private"`、`"org"`、`"network"` |
| `valueThreshold` | number | `0.75` | コントリビュートするための最低スコア（0.0 -- 1.0） |
| `registryUrl` | string | -- | KP レジストリ URL |

## ナレッジリトリーバル

### 過去のナレッジの検索

`KPRetrieval` はレジストリを検索し、マッチするナレッジユニットを返します：

```ts
import { KPRetrieval } from "@knowledgepulse/sdk";

const retrieval = new KPRetrieval({
  registryUrl: "http://localhost:8080",
  minQuality: 0.8,
  limit: 5,
});

// 関連するナレッジを検索
const knowledge = await retrieval.search("code review patterns", "code_review");

console.log(`Found ${knowledge.length} knowledge unit(s)`);
for (const unit of knowledge) {
  console.log(`  [${unit["@type"]}] ${unit.id}`);
}
```

### Few-Shot フォーマット

ナレッジユニットを LLM プロンプトに適したテキスト形式に変換します：

```ts
if (knowledge.length > 0) {
  const fewShot = retrieval.toFewShot(knowledge[0]);

  // LLM プロンプトのコンテキストとして使用
  const prompt = `Using prior knowledge:\n${fewShot}\n\nAnalyze this code:\n${code}`;
}
```

### スキルの検索

```ts
const skills = await retrieval.searchSkills("code analysis", {
  tags: ["typescript", "linting"],
  limit: 3,
});

for (const skill of skills) {
  console.log(`${skill.name}: ${skill.description}`);
}
```

## 完全なインテグレーション例

リトリーバル、エージェント実行、キャプチャを組み合わせた完全な例です：

```ts
import { KPCapture, KPRetrieval } from "@knowledgepulse/sdk";

// ── 1. 設定 ──────────────────────────────────────
const capture = new KPCapture({
  domain: "code_review",
  visibility: "network",
  valueThreshold: 0.75,
  registryUrl: "http://localhost:8080",
});

const retrieval = new KPRetrieval({
  registryUrl: "http://localhost:8080",
  minQuality: 0.8,
  limit: 5,
});

// ── 2. ナレッジ拡張付きエージェント関数 ─────
async function reviewCode(codeSnippet: string): Promise<string> {
  // 関連する過去のナレッジを検索
  let context = "";
  try {
    const knowledge = await retrieval.search("code review patterns", "code_review");
    if (knowledge.length > 0) {
      context = retrieval.toFewShot(knowledge[0]);
      console.log(`Augmented with ${knowledge.length} knowledge unit(s)`);
    }
  } catch {
    console.log("Running without augmentation (registry offline)");
  }

  // プロンプトの構築（任意の LLM に送信）
  const prompt = context
    ? `Prior knowledge:\n${context}\n\nReview:\n${codeSnippet}`
    : `Review:\n${codeSnippet}`;

  // LLM レスポンスのシミュレーション
  return `Reviewed ${codeSnippet.length} chars using ${context ? "augmented" : "base"} prompt`;
}

// ── 3. ラップして実行 ───────────────────────────
const wrappedReview = capture.wrap(reviewCode);
const result = await wrappedReview("function add(a, b) { return a + b; }");
console.log(result);
```

## SKILL.md バリデーション

TypeScript エージェントは SKILL.md ファイルのバリデーションも可能です：

```ts
import { validateSkillMd } from "@knowledgepulse/sdk";

const skillMd = `---
name: code-review-agent
description: Reviews code for security vulnerabilities
version: 1.0.0
tags: [security, code-review]
kp:
  knowledge_capture: true
  domain: code_review
  quality_threshold: 0.7
---

# Code Review Agent

Analyzes code for security issues and best practice violations.
`;

const validation = validateSkillMd(skillMd);
console.log("Valid:", validation.valid);
if (validation.errors.length > 0) {
  console.log("Errors:", validation.errors);
}
```

## エラーハンドリング

SDK はネットワークエラーを適切に処理します。レジストリに到達できない場合、`KPRetrieval` メソッドはキャッチ可能なエラーをスローし、`KPCapture` はコントリビューションを静かにスキップします：

```ts
try {
  const knowledge = await retrieval.search("query");
} catch (error) {
  if (error instanceof TypeError && String(error).includes("fetch")) {
    console.log("Registry offline — proceeding without augmentation");
  }
}
```

## サンプルの実行

```bash
# レジストリを起動
bun run registry/src/index.ts

# OpenClaw サンプルを実行
bun run examples/openclaw-integration/index.ts
```
