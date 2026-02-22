---
sidebar_position: 5
title: SOP API
description: 用于创建、管理、版本控制和导出 SOP 的 REST API 端点。
---

# SOP API

SOP API 提供了在 KnowledgePulse 注册中心中管理标准操作程序的端点。SOP 以 `ExpertSOP` 知识单元的形式存储，并附带版本控制和审批工作流。

## 创建 SOP

```
POST /v1/sop
```

| 属性 | 值 |
|---|---|
| 需要认证 | 是（`write` 权限） |
| 豁免速率限制 | 否 |

在注册中心创建新的 SOP。

**请求体**

| 字段 | 类型 | 必填 | 描述 |
|---|---|---|---|
| `name` | string | 是 | SOP 名称 |
| `domain` | string | 是 | 任务领域 |
| `visibility` | string | 是 | `private`、`org` 或 `network` |
| `decision_tree` | array | 是 | 决策树节点数组 |
| `description` | string | 否 | 简要描述 |
| `tags` | string[] | 否 | 可搜索的标签 |

**响应**

```json
{
  "data": {
    "id": "kp:sop:abc-123",
    "name": "Bug Triage",
    "domain": "engineering",
    "version": 1,
    "status": "draft",
    "created_at": "2026-02-15T10:00:00.000Z"
  }
}
```

**示例**

```bash
curl -X POST http://localhost:3000/v1/sop \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer kp_your_key" \
  -d '{
    "name": "Bug Triage",
    "domain": "engineering",
    "visibility": "org",
    "decision_tree": [
      {
        "step": "classify",
        "instruction": "按严重程度分类 Bug",
        "conditions": {
          "critical": { "action": "升级至值班人员", "sla_min": 15 },
          "major": { "action": "分配到迭代", "sla_min": 60 }
        }
      }
    ]
  }'
```

---

## 获取 SOP

```
GET /v1/sop/:id
```

| 属性 | 值 |
|---|---|
| 需要认证 | 可选 |
| 豁免速率限制 | 否 |

通过 ID 获取单个 SOP。默认返回最新的已审批版本。

**查询参数**

| 参数 | 类型 | 默认值 | 描述 |
|---|---|---|---|
| `version` | number | 最新版本 | 要获取的特定版本号 |

**示例**

```bash
curl http://localhost:3000/v1/sop/kp:sop:abc-123
curl "http://localhost:3000/v1/sop/kp:sop:abc-123?version=2"
```

---

## 更新 SOP

```
PUT /v1/sop/:id
```

| 属性 | 值 |
|---|---|
| 需要认证 | 是（`write` 权限） |
| 豁免速率限制 | 否 |
| 访问权限 | 原始作者或管理员 |

更新现有 SOP。自动创建新版本。

**请求体**

与创建端点相同的字段。仅更新提供的字段。

**响应**

```json
{
  "data": {
    "id": "kp:sop:abc-123",
    "version": 2,
    "status": "draft",
    "updated_at": "2026-02-16T09:00:00.000Z"
  }
}
```

---

## 删除 SOP

```
DELETE /v1/sop/:id
```

| 属性 | 值 |
|---|---|
| 需要认证 | 是（`write` 或 `admin` 权限） |
| 豁免速率限制 | 否 |
| 访问权限 | 原始作者或管理员 |

永久删除一个 SOP 及其所有版本。

**响应**

```json
{
  "data": {
    "id": "kp:sop:abc-123",
    "deleted": true
  }
}
```

---

## 列出 SOP 版本

```
GET /v1/sop/:id/versions
```

| 属性 | 值 |
|---|---|
| 需要认证 | 可选 |
| 豁免速率限制 | 否 |

列出一个 SOP 的所有版本。

**响应**

```json
{
  "data": [
    { "version": 1, "status": "approved", "created_at": "2026-02-15T10:00:00.000Z" },
    { "version": 2, "status": "draft", "created_at": "2026-02-16T09:00:00.000Z" }
  ]
}
```

---

## 审批 SOP 版本

```
POST /v1/sop/:id/approve
```

| 属性 | 值 |
|---|---|
| 需要认证 | 是（`admin` 权限） |
| 豁免速率限制 | 否 |

审批 SOP 的特定版本，使其成为 `GET /v1/sop/:id` 返回的默认版本。

**请求体**

| 字段 | 类型 | 必填 | 描述 |
|---|---|---|---|
| `version` | number | 是 | 要审批的版本号 |

**响应**

```json
{
  "data": {
    "id": "kp:sop:abc-123",
    "version": 2,
    "status": "approved",
    "approved_at": "2026-02-16T10:00:00.000Z"
  }
}
```

---

## 将 SOP 导出为 Skill-MD

```
GET /v1/sop/:id/export-skill
```

| 属性 | 值 |
|---|---|
| 需要认证 | 可选 |
| 豁免速率限制 | 否 |

将 SOP 导出为 Skill-MD 格式的文件。以 `text/markdown` 形式返回内容。

**查询参数**

| 参数 | 类型 | 默认值 | 描述 |
|---|---|---|---|
| `version` | number | 最新已审批版本 | 要导出的版本 |

**示例**

```bash
curl http://localhost:3000/v1/sop/kp:sop:abc-123/export-skill \
  -H "Accept: text/markdown" \
  -o bug-triage.skill.md
```

**响应**（text/markdown）

```markdown
---
name: Bug Triage
description: 分类和路由 Bug 的标准程序
version: "2"
tags: [engineering, triage]
kp:
  domain: engineering
  knowledge_capture: true
  visibility: org
---

## Steps
1. 按严重程度分类 Bug
   - **严重**: 升级至值班人员 (SLA: 15 分钟)
   - **重要**: 分配到迭代 (SLA: 60 分钟)
```
