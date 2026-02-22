---
sidebar_position: 1
---

# 简介

KnowledgePulse 是一个开源、跨平台的 AI 知识共享协议。它使 AI 智能体和人类专家能够安全地共享解决问题的经验——包括推理链、工具调用模式和标准操作流程——跨越不同框架和组织，同时保护数据隐私和知识产权。

## 问题背景

2026 年，AI 智能体生态系统存在一个根本性的低效问题：每个智能体都在孤立地解决相同的问题。当一个 LangGraph 智能体发现了最优的财务报告分析技术时，该知识会在会话结束时消失。另一个组织的 CrewAI 智能体将从零开始重新学习同样的经验。

现有的 SKILL.md / Skills Marketplace 系统解决了"静态能力的发现和安装"问题，但无法解决"动态执行经验的提取和共享"问题。KnowledgePulse 填补了这一空白。

## 双层架构

KnowledgePulse 采用 **SKILL.md 兼容 + KnowledgeUnit 扩展** 的双层设计：

- **第一层 — SKILL.md 兼容层**：完全兼容现有的 SKILL.md 开放标准。来自 SkillsMP（200,000+ 技能）、SkillHub 或 Smithery 的任何技能都可以直接导入 KP Registry，无需修改。

- **第二层 — KnowledgeUnit 层**：构建在 SKILL.md 之上，这一动态知识层可以自动将智能体的执行经验转化为可共享、可验证、有激励机制的 KnowledgeUnit。

## 核心价值主张

> 当一个智能体发现了高效的技术时，该技术应自动成为整个生态系统的共享资产——具备质量验证、贡献者声誉记录，以及对后续用户可追溯的贡献奖励。这就是特斯拉车队学习为自动驾驶所做的事情；KnowledgePulse 将这一范式带入 AI 智能体生态系统。

## 核心特性

- **三种知识类型**：ReasoningTrace、ToolCallPattern 和 ExpertSOP——覆盖从自动化智能体轨迹到人类专家流程的完整范围
- **质量评分**：四维评分算法（复杂度、新颖度、工具多样性、结果置信度）确保只有高价值知识进入网络
- **隐私控制**：三级隐私模型（聚合、联邦、私有），配备内容脱敏和提示注入检测
- **声誉系统**：KP-REP 评分追踪贡献和验证记录，激励高质量参与
- **MCP 兼容**：完整的 Model Context Protocol 服务器，支持与 LangGraph、CrewAI、AutoGen 等框架的无关性集成

## 项目状态

KnowledgePulse 第一阶段已完成，包含以下组件：

| 组件 | 包名 | 描述 |
|------|------|------|
| SDK | `@knowledgepulse/sdk` | TypeScript SDK，包含类型、捕获、检索、评分、SKILL.md 工具 |
| Registry | `registry/` | Hono REST API 服务器，具备内存存储、认证和速率限制功能 |
| MCP Server | `@knowledgepulse/mcp` | 6 个 MCP 工具，双模式（独立 + 代理） |
| CLI | `@knowledgepulse/cli` | 搜索、安装、验证、贡献、认证、安全等命令 |

## 许可证

KnowledgePulse 采用 [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0) 许可证。
