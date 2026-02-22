---
sidebar_position: 3
title: SKILL.md
description: 使用 KnowledgePulse 扩展解析、生成和验证 SKILL.md 文件。
---

# SKILL.md

SKILL.md 是一种标准文件格式，使用 YAML 前置数据和 Markdown 正文来描述代理技能。KnowledgePulse SDK 在前置数据中添加了可选的 `kp:` 扩展块，用于配置知识捕获，同时保持与非 KP 工具的完全向后兼容性。

## 函数

### `parseSkillMd(content)`

将 SKILL.md 字符串解析为结构化组件。

```ts
function parseSkillMd(content: string): ParsedSkillMd
```

**参数：**

| 参数 | 类型 | 描述 |
|------|------|------|
| `content` | `string` | 原始 SKILL.md 文件内容 |

**返回值：** `ParsedSkillMd`

```ts
interface ParsedSkillMd {
  frontmatter: SkillMdFrontmatter;  // 标准 YAML 字段
  kp?: SkillMdKpExtension;          // KnowledgePulse 扩展（如存在）
  body: string;                      // 前置数据之后的 Markdown 内容
  raw: string;                       // 原始输入字符串
}
```

**抛出：** 如果前置数据缺失、YAML 格式错误或必填字段缺失，则抛出 `ValidationError`。

**示例：**

```ts
import { parseSkillMd } from "@knowledgepulse/sdk";

const content = `---
name: code-reviewer
description: Reviews pull requests for code quality issues
version: "1.0.0"
author: acme-corp
tags:
  - code-review
  - quality
allowed-tools:
  - github_pr_read
  - github_pr_comment
kp:
  knowledge_capture: true
  domain: code-review
  quality_threshold: 0.8
  privacy_level: aggregated
  visibility: network
  reward_eligible: true
---

## Instructions

You are a code review assistant. Analyze the given pull request
and provide actionable feedback on code quality, security, and
best practices.
`;

const parsed = parseSkillMd(content);

console.log(parsed.frontmatter.name);       // "code-reviewer"
console.log(parsed.frontmatter.tags);        // ["code-review", "quality"]
console.log(parsed.kp?.knowledge_capture);   // true
console.log(parsed.kp?.quality_threshold);   // 0.8
console.log(parsed.body);                    // "\n## Instructions\n\nYou are a ..."
```

---

### `generateSkillMd(frontmatter, body, kp?)`

从结构化组件生成 SKILL.md 字符串。

```ts
function generateSkillMd(
  frontmatter: SkillMdFrontmatter,
  body: string,
  kp?: SkillMdKpExtension,
): string
```

**参数：**

| 参数 | 类型 | 描述 |
|------|------|------|
| `frontmatter` | `SkillMdFrontmatter` | 标准 YAML 前置数据字段 |
| `body` | `string` | Markdown 正文内容 |
| `kp` | `SkillMdKpExtension` | _（可选）_ KnowledgePulse 扩展字段 |

**返回值：** 包含 YAML 前置数据分隔符（`---`）的完整 SKILL.md 字符串。

**示例：**

```ts
import { generateSkillMd } from "@knowledgepulse/sdk";

const skillMd = generateSkillMd(
  {
    name: "data-analyst",
    description: "Analyzes datasets and produces insights",
    version: "0.2.0",
    tags: ["analytics", "data"],
    "allowed-tools": ["sql_query", "chart_render"],
  },
  "## Instructions\n\nAnalyze the provided dataset and generate a summary report.",
  {
    knowledge_capture: true,
    domain: "data-analysis",
    quality_threshold: 0.7,
    visibility: "org",
  },
);

console.log(skillMd);
// ---
// name: data-analyst
// description: Analyzes datasets and produces insights
// version: "0.2.0"
// tags:
//   - analytics
//   - data
// allowed-tools:
//   - sql_query
//   - chart_render
// kp:
//   knowledge_capture: true
//   domain: data-analysis
//   quality_threshold: 0.7
//   visibility: org
// ---
//
// ## Instructions
//
// Analyze the provided dataset and generate a summary report.
```

---

### `validateSkillMd(content)`

在不抛出异常的情况下验证 SKILL.md 字符串。同时运行清洗和模式验证，并收集所有错误。

```ts
function validateSkillMd(content: string): {
  valid: boolean;
  errors: string[];
}
```

**参数：**

| 参数 | 类型 | 描述 |
|------|------|------|
| `content` | `string` | 原始 SKILL.md 文件内容 |

**返回值：** 包含 `valid`（布尔值）和 `errors`（人类可读字符串数组）的对象。当 `valid` 为 `true` 时，`errors` 数组仍可能包含非致命性警告（例如 "Warning: Removed HTML comments"）。

**示例：**

```ts
import { validateSkillMd } from "@knowledgepulse/sdk";

// 有效文档
const good = validateSkillMd(`---
name: my-skill
description: A helpful skill
---

Instructions here.
`);
console.log(good.valid);   // true
console.log(good.errors);  // []

// 无效文档（缺少必填字段）
const bad = validateSkillMd(`---
name: my-skill
---

No description field.
`);
console.log(bad.valid);    // false
console.log(bad.errors);
// [
//   "Invalid SKILL.md frontmatter",
//   "  description: Required"
// ]
```

## SKILL.md 格式

SKILL.md 文件由两个部分组成，使用 YAML 前置数据分隔符（`---`）分隔：

```
---
<YAML 前置数据>
---

<Markdown 正文>
```

### 标准前置数据字段

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `name` | `string` | 是 | 唯一的技能标识符 |
| `description` | `string` | 是 | 人类可读的描述 |
| `version` | `string` | 否 | 语义化版本号 |
| `author` | `string` | 否 | 作者或组织 |
| `license` | `string` | 否 | SPDX 许可证标识符 |
| `tags` | `string[]` | 否 | 可搜索的标签 |
| `allowed-tools` | `string[]` | 否 | 此技能可调用的 MCP 工具 |

### KnowledgePulse 扩展（`kp:`）

`kp:` 块是前置数据中的可选嵌套对象。它配置 KnowledgePulse 协议与此技能的交互方式。

| 字段 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `knowledge_capture` | `boolean` | -- | 为此技能启用自动知识捕获 |
| `domain` | `string` | -- | 用于知识分类的任务领域 |
| `quality_threshold` | `number` | -- | 捕获的知识被贡献的最低质量分数（0.0-1.0） |
| `privacy_level` | `PrivacyLevel` | -- | 捕获知识的隐私级别 |
| `visibility` | `Visibility` | -- | 捕获知识的可见性范围 |
| `reward_eligible` | `boolean` | -- | 此技能的贡献是否有资格获得代币奖励 |

## 向后兼容性

`kp:` 扩展被设计为完全向后兼容：

- 不理解 `kp:` 键的工具在 YAML 解析时会直接忽略它。
- `kp:` 字段都是可选的；SKILL.md 文件在没有它们的情况下也能正常工作。
- 标准字段（`name`、`description`、`tags` 等）保持不变。

这意味着你可以将 KnowledgePulse 配置添加到任何现有的 SKILL.md 文件中，而不会破坏使用标准格式的工具。

## 错误处理

当 `parseSkillMd` 遇到无效输入时，它会抛出一个带有结构化 `issues` 数组的 `ValidationError`：

```ts
import { parseSkillMd, ValidationError } from "@knowledgepulse/sdk";

try {
  parseSkillMd(invalidContent);
} catch (err) {
  if (err instanceof ValidationError) {
    console.error(err.message);
    // "Invalid SKILL.md frontmatter"

    for (const issue of err.issues) {
      console.error(`  ${issue.path}: ${issue.message}`);
      // "description: Required"
      // "kp.quality_threshold: Number must be less than or equal to 1"
    }
  }
}
```

`issues` 数组中的每个条目包含：

| 字段 | 类型 | 描述 |
|------|------|------|
| `path` | `string` | 无效字段的点分隔路径（例如 `"kp.quality_threshold"`） |
| `message` | `string` | 人类可读的验证失败描述 |

对于 `kp:` 扩展错误，路径以 `kp.` 为前缀，以区别于标准前置数据错误。
