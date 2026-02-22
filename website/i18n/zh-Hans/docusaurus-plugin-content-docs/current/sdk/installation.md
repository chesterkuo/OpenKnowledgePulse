---
sidebar_position: 1
title: 安装
description: 为 TypeScript 和 JavaScript 项目安装和配置 KnowledgePulse SDK。
---

# 安装

`@knowledgepulse/sdk` 包提供了 KnowledgePulse 协议所需的 TypeScript/JavaScript 类型、验证模式、知识捕获、检索、评分和 SKILL.md 实用工具。

- **版本：** 0.1.0
- **许可证：** Apache-2.0

## 安装方法

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

## 模块格式

SDK 以双格式包发布，包含完整的 TypeScript 类型声明。开箱即用地支持 ESM 和 CommonJS。

### ESM（推荐）

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

## 导出映射

该包通过单一入口点（`.`）暴露条件导出：

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

| 路径 | 格式 | 文件 |
|------|------|------|
| `types` | TypeScript 类型声明 | `dist/index.d.ts` |
| `import` | ESM | `dist/index.js` |
| `require` | CommonJS | `dist/index.cjs` |

## 依赖项

| 包名 | 版本 | 用途 |
|------|------|------|
| `zod` | ^3.23.0 | 所有知识单元类型的运行时验证模式 |
| `yaml` | ^2.4.0 | SKILL.md YAML 前置数据的解析和生成 |

### 可选依赖

| 包名 | 版本 | 大小 | 用途 |
|------|------|------|------|
| `@huggingface/transformers` | ^3.0.0 | ~80 MB | 用于新颖性评分的嵌入模型（`Xenova/all-MiniLM-L6-v2`） |

`@huggingface/transformers` 包被列为可选依赖。它仅在 `evaluateValue()` 评分函数的新颖性维度中使用。如果未安装，新颖性分数将回退为默认值 `0.5`。

要显式安装：

```bash
bun add @huggingface/transformers
```

## TypeScript

完整的类型声明包含在包的 `dist/index.d.ts` 中。无需额外安装 `@types/*` 包。

SDK 要求 TypeScript 5.0 或更高版本，目标为 ES2020。如果你在 `tsconfig.json` 中使用 `moduleResolution: "bundler"` 或 `"node16"`，导出映射将自动解析。

```jsonc
// tsconfig.json（推荐设置）
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ES2020",
    "strict": true
  }
}
```

## 验证安装

运行快速检查以确认包已正确安装：

```ts
import { KnowledgeUnitSchema, generateTraceId } from "@knowledgepulse/sdk";

console.log(generateTraceId());
// kp:trace:550e8400-e29b-41d4-a716-446655440000

console.log(typeof KnowledgeUnitSchema.parse);
// "function"
```

## 下一步

- [类型](./types.md) -- 探索所有知识单元类型和 Zod 模式
- [SKILL.md](./skill-md.md) -- 解析、生成和验证 SKILL.md 文件
- [评分](./scoring.md) -- 了解价值评分算法
- [实用工具](./utilities.md) -- ID 生成器、哈希、清洗、捕获和检索
