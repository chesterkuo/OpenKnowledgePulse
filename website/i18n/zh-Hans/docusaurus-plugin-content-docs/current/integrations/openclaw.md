---
sidebar_position: 3
title: OpenClaw SDK
description: 直接在 OpenClaw 及其他 TypeScript 智能体框架中使用 KnowledgePulse TypeScript SDK。
---

# OpenClaw SDK 集成

[OpenClaw](https://github.com/openclaw) 及类似的 TypeScript 智能体框架可以直接使用 `@knowledgepulse/sdk` 进行原生集成。本指南演示如何使用 `KPCapture` 和 `KPRetrieval` 为任何 TypeScript 智能体添加透明的知识采集和检索功能。

## 概述

与使用 HTTP 的 Python 集成不同，TypeScript 框架可直接使用 SDK：

- **KPCapture**：封装智能体函数，自动采集和评分推理追踪。
- **KPRetrieval**：搜索注册表并将结果格式化为 few-shot 提示。

```
┌──────────────────────────────────────────┐
│          TypeScript 智能体                │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │         KPCapture.wrap()           │  │
│  │  （透明追踪采集）                    │  │
│  └──────────────┬─────────────────────┘  │
│                 │                         │
│  ┌──────────────▼─────────────────────┐  │
│  │       KPRetrieval.search()         │  │
│  │  （few-shot 知识注入）              │  │
│  └──────────────┬─────────────────────┘  │
│                 │                         │
└─────────────────┼─────────────────────────┘
                  │
           ┌──────▼──────────────┐
           │  KP Registry (:8080)│
           └─────────────────────┘
```

## 前置条件

- Bun 或 Node.js 20+
- 运行中的 KnowledgePulse 注册表：`bun run registry/src/index.ts`

```bash
bun add @knowledgepulse/sdk
```

## 知识采集

### 封装智能体函数

`KPCapture.wrap()` 接受任何异步函数并返回一个封装版本，在函数执行时自动采集推理追踪。如果追踪分数超过质量阈值，它将被贡献到注册表。

```ts
import { KPCapture } from "@knowledgepulse/sdk";

const capture = new KPCapture({
  domain: "code_review",
  visibility: "network",
  valueThreshold: 0.75,
  registryUrl: "http://localhost:8080",
});

// 您现有的智能体函数
async function codeReviewAgent(codeSnippet: string): Promise<string> {
  // 智能体逻辑...
  return `Analysis complete for: ${codeSnippet}`;
}

// 封装它——知识采集自动发生
const wrappedAgent = capture.wrap(codeReviewAgent);

// 正常使用
const result = await wrappedAgent("function processData(items) { ... }");
```

### 配置选项

| 选项 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `domain` | string | `"general"` | 用于评分权重选择的任务领域 |
| `visibility` | string | `"network"` | 可见性范围：`"private"`、`"org"`、`"network"` |
| `valueThreshold` | number | `0.75` | 贡献的最低分数（0.0 -- 1.0）|
| `registryUrl` | string | — | KP 注册表 URL |

## 知识检索

### 搜索先前知识

`KPRetrieval` 搜索注册表并返回匹配的知识单元：

```ts
import { KPRetrieval } from "@knowledgepulse/sdk";

const retrieval = new KPRetrieval({
  registryUrl: "http://localhost:8080",
  minQuality: 0.8,
  limit: 5,
});

// 搜索相关知识
const knowledge = await retrieval.search("code review patterns", "code_review");

console.log(`找到 ${knowledge.length} 个知识单元`);
for (const unit of knowledge) {
  console.log(`  [${unit["@type"]}] ${unit.id}`);
}
```

### Few-Shot 格式化

将知识单元转换为适合 LLM 提示的文本格式：

```ts
if (knowledge.length > 0) {
  const fewShot = retrieval.toFewShot(knowledge[0]);

  // 在 LLM 提示中用作上下文
  const prompt = `使用先前知识:\n${fewShot}\n\n分析这段代码:\n${code}`;
}
```

### 搜索技能

```ts
const skills = await retrieval.searchSkills("code analysis", {
  tags: ["typescript", "linting"],
  limit: 3,
});

for (const skill of skills) {
  console.log(`${skill.name}: ${skill.description}`);
}
```

## 完整集成示例

以下是结合检索、智能体执行和采集的完整示例：

```ts
import { KPCapture, KPRetrieval } from "@knowledgepulse/sdk";

// ── 1. 配置 ──────────────────────────────────────
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

// ── 2. 带知识增强的智能体函数 ─────────────────────
async function reviewCode(codeSnippet: string): Promise<string> {
  // 搜索相关的先前知识
  let context = "";
  try {
    const knowledge = await retrieval.search("code review patterns", "code_review");
    if (knowledge.length > 0) {
      context = retrieval.toFewShot(knowledge[0]);
      console.log(`已使用 ${knowledge.length} 个知识单元增强`);
    }
  } catch {
    console.log("在无增强的情况下运行（注册表离线）");
  }

  // 构建提示（发送到您选择的 LLM）
  const prompt = context
    ? `先前知识:\n${context}\n\n审查:\n${codeSnippet}`
    : `审查:\n${codeSnippet}`;

  // 模拟 LLM 响应
  return `已审查 ${codeSnippet.length} 字符，使用${context ? "增强" : "基础"}提示`;
}

// ── 3. 封装并运行 ────────────────────────────────
const wrappedReview = capture.wrap(reviewCode);
const result = await wrappedReview("function add(a, b) { return a + b; }");
console.log(result);
```

## SKILL.md 验证

TypeScript 智能体还可以验证其 SKILL.md 文件：

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
console.log("有效:", validation.valid);
if (validation.errors.length > 0) {
  console.log("错误:", validation.errors);
}
```

## 错误处理

SDK 优雅地处理网络错误。如果注册表不可达，`KPRetrieval` 方法会抛出可捕获的错误，而 `KPCapture` 则静默跳过贡献：

```ts
try {
  const knowledge = await retrieval.search("query");
} catch (err) {
  if (err instanceof TypeError) {
    console.log("注册表离线——在无增强的情况下继续");
  }
}
```

## 运行示例

```bash
# 启动注册表
bun run registry/src/index.ts

# 运行 OpenClaw 示例
bun run examples/openclaw-integration/index.ts
```
