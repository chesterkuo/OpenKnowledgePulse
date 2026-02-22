---
sidebar_position: 1
title: CLI 参考
description: KnowledgePulse CLI 的完整命令参考。
---

# CLI 参考

KnowledgePulse CLI（`@knowledgepulse/cli`）提供命令行方式访问 KnowledgePulse Registry，用于搜索、贡献、安装和管理知识工件。

## 配置

CLI 将其配置存储在 `~/.knowledgepulse/` 下的两个文件中：

| 文件 | 内容 |
|---|---|
| `~/.knowledgepulse/config.json` | `registryUrl` -- CLI 通信的 Registry 端点。 |
| `~/.knowledgepulse/auth.json` | `apiKey`、`agentId`、`keyPrefix` -- 认证凭据。 |

---

## 命令

### kp search

搜索 Registry 中的 SKILL.md 文件或 KnowledgeUnit。

```bash
kp search <query> [options]
```

| 选项 | 别名 | 描述 | 默认值 |
|---|---|---|---|
| `--domain` | `-d` | 按领域筛选。 | -- |
| `--tags` | `-t` | 以逗号分隔的标签列表。 | -- |
| `--type` | -- | 单元类型筛选：`ReasoningTrace`、`ToolCallPattern` 或 `ExpertSOP`。 | -- |
| `--min-quality` | -- | 最低质量分数（0--1）。 | `0.7` |
| `--limit` | `-l` | 最大结果数。 | `5` |
| `--json` | -- | 输出原始 JSON 而非格式化文本。 | `false` |
| `--knowledge` | -- | 搜索 KnowledgeUnit 而非技能。 | `false` |

**示例：**

```bash
# 按关键词搜索技能
kp search "code review"

# 在 debugging 领域搜索知识单元
kp search "memory leak" --knowledge --domain debugging --type ReasoningTrace

# 获取 JSON 输出用于脚本处理
kp search "deploy" --json --limit 10
```

---

### kp contribute

向 Registry 贡献 SKILL.md 或 KnowledgeUnit 文件。需要认证。

```bash
kp contribute <file> [options]
```

| 选项 | 别名 | 描述 | 默认值 |
|---|---|---|---|
| `--visibility` | `-v` | 访问级别：`private`、`org` 或 `network`。 | `network` |

CLI 根据文件扩展名推断贡献类型：

- `.md` 文件被视为 **SKILL.md** 文档。
- `.json` 文件被视为 **KnowledgeUnit** 对象。

**示例：**

```bash
# 贡献一个技能
kp contribute my-skill.md

# 以受限可见性贡献知识单元
kp contribute trace.json --visibility org
```

---

### kp auth

管理认证凭据。

#### kp auth register

向 Registry 注册新的 API 密钥。

```bash
kp auth register [options]
```

| 选项 | 描述 | 默认值 |
|---|---|---|
| `--agent-id` | 代理标识符。 | `agent-{timestamp}` |
| `--scopes` | 以逗号分隔的权限范围列表。 | `read,write` |

生成的密钥存储在 `~/.knowledgepulse/auth.json` 中。

#### kp auth revoke

撤销当前 API 密钥并清除本地认证文件。

```bash
kp auth revoke
```

#### kp auth status

显示当前认证状态（代理 ID、密钥前缀、权限范围）。

```bash
kp auth status
```

---

### kp install

从 Registry 下载技能并保存为本地 `.md` 文件。

```bash
kp install <skill-id> [options]
```

| 选项 | 别名 | 描述 | 默认值 |
|---|---|---|---|
| `--output` | `-o` | 保存技能文件的目录。 | `~/.claude/skills` |

**示例：**

```bash
# 将技能安装到默认位置
kp install skill-abc123

# 安装到自定义目录
kp install skill-abc123 --output ./my-skills
```

---

### kp validate

在本地验证 SKILL.md 文件而不进行贡献。有效时退出代码为 0，无效时退出代码为 1。

```bash
kp validate <file>
```

**示例：**

```bash
kp validate my-skill.md && echo "Valid"
```

---

### kp security report

举报知识单元以供审核。需要认证。

```bash
kp security report <unit-id> [options]
```

| 选项 | 别名 | 描述 |
|---|---|---|
| `--reason` | `-r` | 举报该单元的原因。 |

**示例：**

```bash
kp security report ku-xyz789 --reason "Contains hallucinated data"
```
