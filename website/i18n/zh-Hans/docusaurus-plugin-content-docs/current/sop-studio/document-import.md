---
sidebar_position: 3
title: 文档导入
description: 使用 LLM 提取功能从 DOCX 和 PDF 文档导入现有 SOP。
---

# 文档导入

SOP 工作室可以从 DOCX 和 PDF 文档导入现有的标准操作程序。LLM 从文档内容中提取决策树结构，然后你可以在可视化编辑器中审查和完善。

## 支持的格式

| 格式 | 扩展名 | 说明 |
|------|--------|------|
| Microsoft Word | `.docx` | 保留表格、列表和标题 |
| PDF | `.pdf` | 基于文本的 PDF；不支持扫描文档 |

## 工作原理

1. **上传** -- 将文件拖拽到导入区域或点击"导入文档"。
2. **解析** -- SDK 使用 `parseDocx` 或 `parsePdf` 在客户端解析文档。
3. **提取** -- 将解析后的文本发送到 LLM（客户端处理，使用你自己的 API 密钥）以提取结构化决策树。
4. **审查** -- 提取的决策树加载到可视化编辑器中供审查和调整。
5. **保存** -- 确认无误后，将 SOP 保存到注册中心。

## LLM 配置

文档提取使用 LLM 将非结构化文本转换为结构化决策树。LLM 调用完全在客户端运行 -- SOP 工作室不会将你的文档发送到 KnowledgePulse 服务器。

在设置面板中配置你的 LLM 提供商：

```ts
import type { LLMConfig } from "@knowledgepulse/sdk";

const config: LLMConfig = {
  provider: "openai",          // "openai" | "anthropic" | "ollama"
  apiKey: "sk-...",            // 你的 API 密钥（本地存储）
  model: "gpt-4o",            // 模型标识符
  baseUrl: undefined,          // 自定义端点（Ollama 必填）
  temperature: 0.2,           // 较低值 = 更确定性的提取
};
```

### 支持的提供商

| 提供商 | 模型 | 本地运行？ |
|--------|------|-----------|
| OpenAI | `gpt-4o`、`gpt-4o-mini` | 否 |
| Anthropic | `claude-sonnet-4-20250514`、`claude-haiku-4-20250414` | 否 |
| Ollama | 任意本地模型 | 是 |

## SDK 函数

文档导入流程使用三个 SDK 函数：

### `parseDocx(buffer: ArrayBuffer): Promise<ParseResult>`

解析 DOCX 文件并返回结构化文本内容。

```ts
import { parseDocx } from "@knowledgepulse/sdk";

const buffer = await file.arrayBuffer();
const result = await parseDocx(buffer);

console.log(result.text);       // 纯文本内容
console.log(result.sections);   // 基于标题的章节
console.log(result.tables);     // 提取的表格
```

### `parsePdf(buffer: ArrayBuffer): Promise<ParseResult>`

解析 PDF 文件并返回结构化文本内容。

```ts
import { parsePdf } from "@knowledgepulse/sdk";

const buffer = await file.arrayBuffer();
const result = await parsePdf(buffer);
```

### `extractDecisionTree(parseResult: ParseResult, config: LLMConfig): Promise<ExtractionResult>`

将解析后的文档内容发送到配置的 LLM 并返回结构化决策树。

```ts
import { extractDecisionTree } from "@knowledgepulse/sdk";

const extraction = await extractDecisionTree(result, config);

console.log(extraction.name);           // 检测到的 SOP 名称
console.log(extraction.domain);         // 检测到的领域
console.log(extraction.decision_tree);  // ExpertSOP decision_tree 数组
console.log(extraction.confidence);     // 0.0 到 1.0
console.log(extraction.warnings);       // 提取问题
```

## 审查流程

提取完成后，决策树将带有视觉指示器加载到编辑器中：

| 指示器 | 含义 |
|--------|------|
| 绿色轮廓 | 高置信度提取（高于 0.8） |
| 黄色轮廓 | 中等置信度（0.5--0.8），建议审查 |
| 红色轮廓 | 低置信度（低于 0.5），可能需要手动编辑 |

审查每个节点的属性，修复提取错误，并在保存前添加缺失的连接。

## 提示

- **结构化你的文档** -- 包含编号步骤、标题和表格的 SOP 文档能产生更好的提取结果。
- **使用较低的温度** -- 0.1--0.2 的温度可以产生更一致的决策树。
- **务必审查** -- LLM 提取并不完美。在保存到注册中心之前，务必审查结果。
