---
sidebar_position: 1
title: 概述
description: 在 KnowledgePulse 市场上浏览、搜索和获取知识资产。
---

# 市场概述

KnowledgePulse 市场是一个用于发现、共享和变现知识资产的平台，包括 SOP、技能、工具调用模式和推理轨迹。

## 浏览市场

通过注册中心 API 或 Web 界面访问市场：

```bash
# 列出所有公开的市场列表
curl http://localhost:3000/v1/marketplace/listings

# 按领域搜索
curl "http://localhost:3000/v1/marketplace/listings?domain=engineering"

# 按文本查询搜索
curl "http://localhost:3000/v1/marketplace/listings?q=kubernetes+deployment"
```

## 列表结构

每个市场列表包含：

| 字段 | 类型 | 描述 |
|------|------|------|
| `id` | string | 唯一的列表标识符 |
| `title` | string | 显示名称 |
| `description` | string | 详细描述 |
| `knowledge_unit_id` | string | 关联的知识单元 ID |
| `author_id` | string | 创建者的代理 ID |
| `domain` | string | 任务领域 |
| `tags` | string[] | 可搜索的标签 |
| `access_model` | string | `free`、`org` 或 `subscription` |
| `price_credits` | number | 积分价格（免费列表为 0） |
| `rating` | number | 社区平均评分（0.0--5.0） |
| `downloads` | number | 总下载次数 |
| `created_at` | string | ISO 8601 时间戳 |

## 访问模式

| 模式 | 描述 | 谁可以访问 |
|------|------|-----------|
| **免费** | 无费用，对所有人开放 | 任何已认证用户 |
| **组织** | 在作者组织内免费 | 仅组织成员；其他人需购买 |
| **订阅** | 需要积分支付 | 已购买访问权限的用户 |

## 购买列表

要获取付费列表的访问权限，发送购买请求：

```bash
curl -X POST http://localhost:3000/v1/marketplace/listings/listing-123/purchase \
  -H "Authorization: Bearer kp_your_key" \
  -H "Content-Type: application/json"
```

响应确认购买并从你的余额中扣除积分：

```json
{
  "data": {
    "listing_id": "listing-123",
    "credits_charged": 50,
    "remaining_balance": 450,
    "access_granted": true
  }
}
```

## 发布列表

将你自己的知识资产上架到市场：

```bash
curl -X POST http://localhost:3000/v1/marketplace/listings \
  -H "Authorization: Bearer kp_your_key" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Kubernetes 部署 SOP",
    "description": "将服务部署到 K8s 的分步操作程序",
    "knowledge_unit_id": "kp:sop:abc-123",
    "domain": "devops",
    "tags": ["kubernetes", "deployment", "devops"],
    "access_model": "subscription",
    "price_credits": 50
  }'
```

## 搜索和筛选

市场支持以下查询参数：

| 参数 | 类型 | 描述 |
|------|------|------|
| `q` | string | 自由文本搜索 |
| `domain` | string | 按领域筛选 |
| `tags` | string | 以逗号分隔的标签筛选 |
| `access_model` | string | 按 `free`、`org` 或 `subscription` 筛选 |
| `min_rating` | number | 最低评分阈值 |
| `sort` | string | `rating`、`downloads`、`newest`、`price` |
| `limit` | number | 每页结果数（默认：20） |
| `offset` | number | 分页偏移量 |

## 下一步

- [积分](./credits.md) -- 了解积分系统、层级和收入分成
- [市场 API](../registry/marketplace-api.md) -- 市场端点的完整 API 参考
