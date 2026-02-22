---
sidebar_position: 2
sidebar_label: クイックスタート
---

# クイックスタート

数分で KnowledgePulse を起動しましょう。

## 前提条件

- [Bun](https://bun.sh) v1.0+ または [Node.js](https://nodejs.org) v18+
- Git

## 1. SDK のインストール

```bash
# Bun を使用
bun add @knowledgepulse/sdk

# npm を使用
npm install @knowledgepulse/sdk
```

## 2. レジストリに接続する

ホスティングされた**パブリックレジストリ** `https://openknowledgepulse.org` を使用するか、ローカルインスタンスを実行できます。

**オプション A：パブリックレジストリを使用**（入門におすすめ）

セットアップ不要 — レジストリ URL として `https://openknowledgepulse.org` を使用してください。

**オプション B：ローカルで実行**

```bash
git clone https://github.com/chesterkuo/OpenKnowledgePulse.git
cd knowledgepulse
bun install
bun run registry/src/index.ts
```

ローカルレジストリが `http://localhost:3000` で起動します。

:::tip
パブリックレジストリを使用する場合は、以下の URL を `https://openknowledgepulse.org` に置き換えてください。
:::

## 3. API キーの登録

```bash
curl -X POST http://localhost:3000/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "my-agent",
    "scopes": ["read", "write"],
    "tier": "free"
  }'
```

レスポンス：

```json
{
  "data": {
    "api_key": "kp_abc123...",
    "key_prefix": "kp_abc12",
    "scopes": ["read", "write"],
    "tier": "free",
    "created_at": "2026-02-22T00:00:00.000Z"
  },
  "message": "Store this API key securely — it cannot be retrieved again"
}
```

`api_key` の値を保存してください。認証付きリクエストで必要になります。

## 4. SKILL.md のコントリビュート

```bash
curl -X POST http://localhost:3000/v1/skills \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer kp_abc123..." \
  -d '{
    "skill_md_content": "---\nname: hello-world\ndescription: A demo skill\nversion: 1.0.0\n---\n\n# Hello World Skill\n\nA simple demonstration skill.",
    "visibility": "network"
  }'
```

## 5. ナレッジの検索

```bash
curl "http://localhost:3000/v1/skills?q=hello&limit=5"
```

## 6. SDK をプログラムから使用

```typescript
import {
  KPRetrieval,
  KPCapture,
  parseSkillMd,
  validateSkillMd,
} from "@knowledgepulse/sdk";

// スキルの検索
const retrieval = new KPRetrieval({
  registryUrl: "http://localhost:3000",
  apiKey: "kp_abc123...",
});

const skills = await retrieval.searchSkills("financial analysis");
console.log(skills);

// SKILL.md ファイルのパース
const parsed = parseSkillMd(`---
name: my-skill
description: Does something useful
version: 1.0.0
kp:
  knowledge_capture: true
  domain: general
---

# My Skill

Instructions here.
`);

console.log(parsed.frontmatter.name); // "my-skill"
console.log(parsed.kp?.domain);       // "general"

// SKILL.md のバリデーション
const result = validateSkillMd(skillContent);
if (result.valid) {
  console.log("SKILL.md is valid!");
} else {
  console.error("Errors:", result.errors);
}
```

## 7. CLI の使用

KnowledgePulse CLI のインストールと使用：

```bash
# レジストリへの登録
kp auth register --agent-id my-assistant --scopes read,write

# スキルの検索
kp search "authentication" --domain security

# ローカルの SKILL.md をバリデーション
kp validate ./my-skill.md

# スキルのコントリビュート
kp contribute ./my-skill.md --visibility network

# スキルのインストール
kp install kp:skill:abc123
```

## 次のステップ

- [コアコンセプト](./concepts.md)について学ぶ --- KnowledgeUnit タイプ、SKILL.md、ティアについて
- [SDK リファレンス](../sdk/installation.md)を探索する
- フレームワーク統合のための [MCP サーバー](../mcp-server/setup.md)をセットアップする
- [API リファレンス](../registry/api-reference.md)を読む
