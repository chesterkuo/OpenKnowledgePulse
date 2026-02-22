---
sidebar_position: 1
title: 快速入门
description: 启动 SOP 工作室，配置注册中心连接，并创建你的第一个标准操作程序。
---

# SOP 工作室快速入门

SOP 工作室是一个可视化编辑器，用于构建标准操作程序（SOP），并将其作为 `ExpertSOP` 知识单元发布到 KnowledgePulse 注册中心。它提供拖拽画布、文档导入（含 LLM 提取）以及实时协作功能。

## 前置要求

- 一个运行中的 KnowledgePulse Registry 实例（本地或远程）
- 一个具有 `write` 权限的 API 密钥（参见[认证](../registry/authentication.md)）

## 配置

在启动 SOP 工作室之前，设置以下环境变量：

```bash
export KP_REGISTRY_URL="http://localhost:3000"
export KP_API_KEY="kp_your_api_key_here"
```

也可以在启动后通过 SOP 工作室的设置面板进行配置。

## 启动 SOP 工作室

启动 SOP 工作室开发服务器：

```bash
cd packages/sop-studio
bun run dev
```

默认在 `http://localhost:5173` 打开工作室。

## 创建你的第一个 SOP

1. **新建 SOP** -- 点击顶部工具栏中的"新建 SOP"按钮。
2. **设置元数据** -- 在右侧属性面板中填写名称、领域和描述。
3. **添加步骤** -- 从左侧面板拖拽步骤节点到画布上。每个步骤包含指令字段和可选条件。
4. **添加条件** -- 使用条件节点创建分支逻辑（例如："如果严重程度为高，则升级处理"）。
5. **连接节点** -- 在节点之间绘制边线以定义流程。
6. **保存** -- 按 `Ctrl+S` 或点击"保存"将 SOP 持久化到注册中心。

## SOP 元数据字段

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `name` | string | 是 | 可读的 SOP 名称 |
| `domain` | string | 是 | 任务领域（例如 `customer-support`） |
| `description` | string | 否 | SOP 简要描述 |
| `visibility` | string | 是 | `private`、`org` 或 `network` |
| `tags` | string[] | 否 | 可搜索的标签 |

## 示例：最小 SOP

```json
{
  "name": "Bug Triage",
  "domain": "engineering",
  "visibility": "org",
  "decision_tree": [
    {
      "step": "classify",
      "instruction": "按严重程度分类 Bug",
      "conditions": {
        "critical": { "action": "升级至值班人员", "sla_min": 15 },
        "major": { "action": "分配到迭代", "sla_min": 60 },
        "minor": { "action": "加入待办" }
      }
    }
  ]
}
```

## 下一步

- [决策树编辑器](./decision-tree-editor.md) -- 了解节点类型和可视化画布
- [文档导入](./document-import.md) -- 从 DOCX 或 PDF 导入现有 SOP
- [协作](./collaboration.md) -- 邀请团队成员实时协同编辑
