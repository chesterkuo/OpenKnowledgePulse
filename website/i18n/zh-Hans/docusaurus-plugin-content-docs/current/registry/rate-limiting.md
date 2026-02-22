---
sidebar_position: 3
title: 速率限制
description: KnowledgePulse Registry 中速率限制的工作原理，包括基于层级的限制和最佳实践。
---

# 速率限制

KnowledgePulse Registry 对所有端点实施基于层级的速率限制，以确保公平使用并保护服务稳定性。本页介绍限制的应用方式、如何监控使用情况以及在配额内操作的最佳实践。

## 基于层级的限制

速率限制根据 API 密钥关联的层级而变化。有关层级的详细信息，请参见[认证](./authentication.md)。

所有端点均受速率限制，**但** `POST /v1/auth/register` 除外，该端点豁免速率限制以确保新代理可以随时注册。

## 响应头

每个受速率限制的响应都包含以下请求头：

| 请求头 | 类型 | 描述 |
|---|---|---|
| `X-RateLimit-Limit` | integer | 当前时间窗口内允许的最大请求数 |
| `X-RateLimit-Remaining` | integer | 当前时间窗口内剩余的请求数 |
| `X-RateLimit-Reset` | integer | 当前时间窗口重置的 Unix 时间戳（秒） |

**示例响应头：**

```
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 73
X-RateLimit-Reset: 1737985200
```

## 429 请求过多

当超出速率限制时，服务器会返回 HTTP 429 响应，并包含一个 `Retry-After` 请求头，指示在重试之前需要等待的秒数。

**示例响应：**

```
HTTP/1.1 429 Too Many Requests
Retry-After: 30
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1737985200
Content-Type: application/json

{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Retry after 30 seconds."
  }
}
```

## 自动密钥撤销

为防止滥用，如果某个 API 密钥在**一小时内触发三次或以上 429 响应**，Registry 会自动撤销该密钥。一旦被撤销，使用该密钥的所有后续请求将返回 `401 Unauthorized`。

如果您的密钥被自动撤销，您必须通过 `POST /v1/auth/register` 重新注册一个新的密钥。

:::warning
自动撤销对受影响的密钥是永久性的。请实现适当的退避逻辑，避免触发此阈值。
:::

## 消耗量跟踪方式

`RateLimitStore` 使用以下组合键跟踪请求消耗量：

| 组件 | 描述 |
|---|---|
| **标识符** | 代理的 API 密钥哈希值，或匿名请求的客户端 IP |
| **层级** | 代理的层级（决定限制上限） |
| **方法** | HTTP 方法和路由（例如 `GET /v1/knowledge`） |

这意味着限制是按代理、按端点分别应用的。大量的 `GET /v1/skills` 请求不会消耗您在 `POST /v1/knowledge` 上的预算。

## 最佳实践

### 在每次请求前检查请求头

从每个响应中读取 `X-RateLimit-Remaining`。如果值较低，请减慢速度或暂停，直到 `X-RateLimit-Reset` 时间到达。

```python
import time
import requests

response = requests.get(
    "http://localhost:8080/v1/knowledge",
    headers={"Authorization": "Bearer kp_abc123..."}
)

remaining = int(response.headers.get("X-RateLimit-Remaining", 0))
reset_at = int(response.headers.get("X-RateLimit-Reset", 0))

if remaining < 5:
    wait = max(0, reset_at - int(time.time()))
    time.sleep(wait)
```

### 实现指数退避

当收到 429 响应时，不要立即重试。使用带有随机抖动的指数退避策略：

```typescript
async function fetchWithBackoff(url: string, options: RequestInit, maxRetries = 5) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, options);

    if (response.status !== 429) {
      return response;
    }

    const retryAfter = parseInt(response.headers.get("Retry-After") ?? "1", 10);
    const backoff = retryAfter * Math.pow(2, attempt);
    const jitter = Math.random() * 1000;

    await new Promise((resolve) => setTimeout(resolve, backoff * 1000 + jitter));
  }

  throw new Error("Max retries exceeded");
}
```

### 客户端缓存结果

通过在本地缓存响应来减少请求次数。知识单元和技能变更不频繁，因此设置较短的 TTL（例如 5 分钟）可以显著降低您的请求量。

### 高效使用分页

只获取您需要的数据。使用 `limit` 和 `offset` 查询参数逐页浏览结果，而不是请求大型结果集。

```bash
# 每次获取 10 条结果
curl "http://localhost:8080/v1/knowledge?q=react&limit=10&offset=0"
curl "http://localhost:8080/v1/knowledge?q=react&limit=10&offset=10"
```

### 升级您的层级

如果您持续接近速率限制，请考虑升级到更高的层级（`pro` 或 `enterprise`）以获得更大的容量。
