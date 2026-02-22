# KnowledgePulse — 開放式 AI 知識共享協議

**Product Requirements Document (PRD) · Open Source Edition · v1.1.0**

> 授權：Apache 2.0 ｜ 發佈日期：2026 年 2 月 ｜ 倉庫：github.com/openclaw/knowledgepulse
>
> ~~v1.0 使用 Python SDK~~ → **v1.1 全面改為 TypeScript + Bun**

---

## 目錄

1. [Executive Summary](#1-executive-summary)
2. [問題陳述與市場背景](#2-問題陳述與市場背景)
3. [架構設計](#3-架構設計)
   - 3.3.2 [Schema 版本演進策略](#332-schema-版本演進策略schema-versioning--migration)
   - 3.4.2 [認證與速率限制](#342-認證與速率限制authentication--rate-limiting)
   - 3.5.1 [安全威脅模型](#351-安全威脅模型security-threat-model)
   - 3.6.1.1 [KP-REP 技術實作：Off-chain 聲譽資料庫](#3611-kp-rep-技術實作off-chain-聲譽資料庫)
   - 3.7 [資料保留與合規](#37-資料保留與合規data-retention--compliance)
4. [功能模組規格](#4-功能模組規格)
   - 4.2.1 [Knowledge Value Scoring Algorithm](#421-knowledge-value-scoring-algorithm知識價值評分演算法)
5. [開源策略與社群建設](#5-開源策略與社群建設)
6. [技術選型](#6-技術選型)
7. [實施路線圖](#7-實施路線圖)
8. [商業模式](#8-商業模式open-core)
9. [成功指標與驗收標準](#9-成功指標與驗收標準)
10. [附錄](#10-附錄)

---

## 1. Executive Summary

KnowledgePulse 是一套開放原始碼、跨平台的 AI 知識共享協議，讓 AI agents 與人類專家能夠將解題經驗——包含推理鏈（Reasoning Chains）、工具調用模式（Tool Call Patterns）和標準作業程序（SOP）——跨框架、跨組織地安全共享，同時保護資料隱私與智慧財產權。

本協議採用「SKILL.md 兼容 + KnowledgeUnit 擴展層」的雙層架構：

- **Layer 1**：完全兼容現有 SKILL.md 開放標準，讓 SkillsMP（200,000+ skills）、SkillHub、Smithery 等生態直接可用
- **Layer 2**：在 SKILL.md 之上建立動態知識層，讓 agent 的執行經驗自動轉化為可共享、可驗證、有激勵機制的 KnowledgeUnit

> **核心價值主張**
>
> 一個 OpenClaw agent 發現了高效的財報分析技巧，這個技巧應當自動成為整個生態的共享資產——附帶品質驗證、貢獻者聲譽紀錄、以及對後續使用者的可追蹤貢獻回報。這正是 Tesla Fleet Learning 對自動駕駛所做的事，KnowledgePulse 將這個範式帶入 AI agent 生態。

### 1.1 專案概覽

| 維度 | 說明 |
|------|------|
| 專案名稱 | KnowledgePulse |
| 授權 | Apache 2.0（核心協議、SDK、MCP Server） |
| **主要語言** | **TypeScript + Bun（全棧統一）** |
| Layer 1 標準 | SKILL.md（兼容 SkillsMP / SkillHub / Smithery / Claude Code / Codex） |
| Layer 2 格式 | KnowledgeUnit（JSON-LD）· ReasoningTrace · ToolCallPattern · ExpertSOP |
| 協議傳輸 | JSON-RPC 2.0 over Streamable HTTP（MCP 兼容） |
| 儲存後端 | Qdrant · Neo4j + Graphiti · PostgreSQL + pgvector |
| 隱私模型 | Aggregated Sharing / Federated Learning / Differential Privacy |
| 激勵機制 | KP-REP 聲譽 SBT（Soulbound Token，不可轉讓） |
| Alpha 目標 | 2026 Q3 |
| 長期定位 | 成為 AI 知識共享的 MCP 級別開放標準 |

### 1.2 為什麼選擇 TypeScript + Bun？

v1.0 原先規劃 Python SDK + TypeScript Server 的雙語言策略，但評估後統一為 **TypeScript + Bun**，理由如下：

- **Bun 原生 TypeScript**：零配置執行 `.ts` 檔，無需 `ts-node` 或 `tsx` 轉換層，開發體驗更流暢
- **啟動速度**：Bun 比 Node.js 快 3-5x，MCP Server 的冷啟動延遲大幅降低
- **`bun build --compile`**：CLI 工具可打包成無依賴的單一執行檔（`kp`），用戶一行安裝
- **統一生態**：開發者只需學一種語言和一套工具鏈，降低貢獻門檻
- **KnowledgeUnit Schema**：以 TypeScript 型別為 single source of truth，透過 `json-schema-to-typescript` 生成 schema，再給其他語言使用——反轉原有的 Python-first 邏輯

> **跨語言框架整合策略**
>
> LangGraph / CrewAI / AutoGen 等 Python agent 框架透過 **MCP Server（HTTP）** 存取 KnowledgePulse，無需安裝 Python SDK。這比維護雙語言 SDK 更簡潔，MCP 本身就是語言無關的協議。

---

## 2. 問題陳述與市場背景

### 2.1 知識孤島問題

2026 年的 AI agent 生態系統存在一個根本性低效：每個 agent 都在孤立地重複解決相同的問題。當一個 LangGraph agent 學到了最優的財報分析技巧，這個知識在 session 結束時消失。另一個組織的 CrewAI agent 將從零開始學習相同的教訓。

現有的 SKILL.md / Skills Marketplace 體系解決了「靜態能力的發現與安裝」問題，但無法解決「動態執行經驗的萃取與共享」問題。這是 KnowledgePulse 要填補的空白。

### 2.2 SKILL.md 生態的現況與缺口

| 現有系統 | 共享的內容 | 規模 | 核心缺口 |
|---------|-----------|------|---------|
| SkillsMP | SKILL.md 靜態指令包 | 200,000+ skills | 無動態經驗，無品質驗證 API，無激勵 |
| SkillHub | SKILL.md + AI 評分 | 7,000+ 精選 | 跨框架有限，無跨 agent 知識流動 |
| Smithery | SKILL.md + MCP Server | 15,000+ skills | 專注 Claude Code，非通用協議 |
| LangChain Hub | Prompt / Chain 模板 | 數千個模板 | 只有靜態模板，無推理鏈共享 |
| Flowise Market | 完整 Flow 圖 | 數百個 flows | 粒度太大，無法共享單次解題洞察 |

### 2.3 三大核心缺口

> **缺口 1：靜態知識 vs 動態執行經驗**
>
> 現有 Skills 市場共享的是人類「預先設計好的能力」（靜態），而非 agent「實際執行後學到的經驗」（動態）。就像分享食譜（Skill）vs 分享廚師在烹飪過程中發現的獨門訣竅（Knowledge）。

> **缺口 2：缺乏跨框架的知識流動機制**
>
> SkillsMP 主要服務 Claude Code 和 Codex CLI 的開發者場景。企業的 LangGraph、CrewAI、AutoGen、Flowise 等 agent 框架無法原生消費 SKILL.md，也沒有統一的知識交換 API。

> **缺口 3：人類專家 SOP 缺乏機器可執行格式**
>
> 企業積累了大量 SOP、決策框架和領域知識，但以 Word 文件和 Notion 頁面存在，無法被 AI agent 直接消費和執行。

### 2.4 現實世界類比：Fleet Learning 的成功驗證

| 系統 | 共享的知識 | 規模 | 核心機制 |
|------|-----------|------|---------|
| Tesla Fleet Learning | 邊緣案例、路況、駕駛模式 | 600 萬輛車，80 億+ 英里 FSD | Data Engine + trigger classifier |
| Waymo Foundation Model | 自動駕駛決策模式 | 2 億英里自主駕駛 | 模擬 + 真實閉環學習 |
| NVIDIA FLARE（醫療） | 臨床預測模型 | 20 家醫院，不共享原始資料 | 聯邦學習，準確率提升 16% |
| Wikipedia | 人類結構化知識 | 6,000 萬篇文章，300+ 語言 | 分層同儕審核 + 信譽系統 |
| npm | 程式碼模組（類 Skill） | 200 萬+ 套件 | Registry + 版本控制 + 品質指標 |

---

## 3. 架構設計

### 3.1 雙層協議架構總覽

```
┌─────────────────────────────────────────────────────────────────┐
│                    KnowledgePulse Protocol Stack                 │
├─────────────────────────────────────────────────────────────────┤
│  Layer 5: Governance & Incentive Layer                           │
│           KP-REP 聲譽 SBT · 品質驗證 · 社群治理                 │
├─────────────────────────────────────────────────────────────────┤
│  Layer 4: Privacy & Security Layer                               │
│           Federated Learning · Differential Privacy · ACL        │
├─────────────────────────────────────────────────────────────────┤
│  Layer 3: Discovery & Exchange Layer                             │
│           Knowledge Registry · P2P Sharing · MCP Server         │
├─────────────────────────────────────────────────────────────────┤
│  Layer 2: KnowledgeUnit Layer  ← 核心差異化                     │
│           ReasoningTrace · ToolCallPattern · ExpertSOP           │
├─────────────────────────────────────────────────────────────────┤
│  Layer 1: SKILL.md Compatibility Layer  ← 兼容現有生態           │
│           完全兼容 SkillsMP / SkillHub / Smithery / Claude Code  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Layer 1：SKILL.md 兼容層

#### 3.2.1 標準格式規範

KnowledgePulse 完全兼容現有 SKILL.md 開放標準，任何符合格式的 skill 均可直接匯入 KP Registry，無需修改。

```markdown
---
name: financial-report-analyzer
description: 分析企業季度財報並生成投資建議
version: 1.2.0
author: chester@plusblocks.ai
license: Apache-2.0
tags: [finance, analysis, reporting]
allowed-tools: [web_search, web_fetch, code_execution]
---

# 財報分析 Skill

## 使用時機
當用戶要求分析企業財報、生成投資建議、或比較同業財務指標時啟動。

## 執行步驟
1. 取得財報原始資料（10-K / 季報 / 年報）
2. 提取核心財務指標（營收、利潤率、現金流）
3. 與同業及歷史資料比較
4. 生成結構化投資建議報告
```

#### 3.2.2 KnowledgePulse 對 SKILL.md 的擴展欄位

```yaml
---
# 標準 SKILL.md 欄位（完全兼容）
name: financial-report-analyzer
description: ...

# KnowledgePulse 擴展欄位（可選，不影響現有工具）
kp:
  knowledge_capture: true          # 執行時自動萃取 KnowledgeUnit
  domain: financial_analysis       # 知識領域分類
  quality_threshold: 0.75          # 最低品質分數才貢獻
  privacy_level: aggregated        # aggregated / federated / private
  visibility: network              # private / org / network
  reward_eligible: true            # 參與 KP-REP 激勵
---
```

### 3.3 Layer 2：KnowledgeUnit 格式規範

KnowledgeUnit 採用 JSON-LD 實現語義互操作性。TypeScript 型別定義是 single source of truth，由 `bun run codegen` 自動生成 JSON Schema 供其他語言消費。

#### 3.3.1 TypeScript 型別定義

```typescript
// packages/sdk/src/types/knowledge-unit.ts
// ⚠️ 此為 Single Source of Truth，由 bun run codegen 生成 JSON Schema

export const KP_CONTEXT = "https://knowledgepulse.dev/schema/v1" as const;

export type KnowledgeUnitType =
  | "ReasoningTrace"
  | "ToolCallPattern"
  | "ExpertSOP";

export type PrivacyLevel = "aggregated" | "federated" | "private";
export type Visibility   = "private" | "org" | "network";

export interface KnowledgeUnitMeta {
  created_at:    string;           // ISO 8601
  agent_id?:     string;           // kp:agent:<id>
  framework?:    string;           // langgraph | crewai | autogen | openclaw
  task_domain:   string;           // financial_analysis | customer_service | ...
  success:       boolean;
  quality_score: number;           // 0.0 ~ 1.0
  visibility:    Visibility;
  privacy_level: PrivacyLevel;
  validated_by?: string[];         // kp:validator:<id>[]
}

export interface ReasoningTrace {
  "@context": typeof KP_CONTEXT;
  "@type":    "ReasoningTrace";
  id:         string;              // kp:trace:<uuid>
  source_skill?: string;           // kp:skill:<name>:<version>
  metadata:   KnowledgeUnitMeta;
  task: {
    objective:    string;
    input_schema?: Record<string, unknown>;
  };
  steps: Array<{
    step_id:  number;
    type:     "thought" | "tool_call" | "observation" | "error_recovery";
    content?: string;
    tool?:    { name: string; mcp_server?: string };
    input?:   Record<string, unknown>;
    output_summary?: string;
    latency_ms?: number;
  }>;
  outcome: {
    result_summary: string;
    confidence:     number;
  };
  knowledge_graph_delta?: {
    entities:      Array<{ name: string; type: string }>;
    relationships: Array<{ fact: string; valid_from: string }>;
  };
}

export interface ToolCallPattern {
  "@context": typeof KP_CONTEXT;
  "@type":    "ToolCallPattern";
  id:         string;              // kp:pattern:<uuid>
  name:       string;
  description: string;
  metadata:   KnowledgeUnitMeta;
  trigger_conditions: {
    task_types:      string[];
    required_tools?: string[];
  };
  tool_sequence: Array<{
    step:      string;
    execution: "parallel" | "sequential";
    tools:     Array<{ name: string; query_template?: string; input_template?: Record<string, unknown> }>;
    condition?: string;
  }>;
  performance: {
    avg_ms:       number;
    success_rate: number;
    uses:         number;
  };
}

export interface ExpertSOP {
  "@context": typeof KP_CONTEXT;
  "@type":    "ExpertSOP";
  id:         string;              // kp:sop:<uuid>
  name:       string;
  domain:     string;
  metadata:   KnowledgeUnitMeta;
  source: {
    type:        "human_expert";
    expert_id:   string;
    credentials: string[];         // kp:sbt:<cert>[]
  };
  decision_tree: Array<{
    step:        string;
    instruction: string;
    criteria?:   Record<string, string>;
    conditions?: Record<string, { action: string; sla_min?: number }>;
    tool_suggestions?: Array<{ name: string; when: string }>;
  }>;
  validation?: {
    test_cases: Array<{
      input:            Record<string, unknown>;
      expected_output:  Record<string, unknown>;
    }>;
  };
}

export type KnowledgeUnit = ReasoningTrace | ToolCallPattern | ExpertSOP;
```

#### 3.3.2 Schema 版本演進策略（Schema Versioning & Migration）

`@context` 目前指向 `https://knowledgepulse.dev/schema/v1`。本節定義 schema 從 `v1` 演進至 `v2` 及後續版本的策略。

##### 版本命名規則

採用 URI 路徑版本搭配語義化版本：

| 變更類型 | 版本範圍 | `@context` URI | 說明 |
|---------|---------|---------------|------|
| Patch（`v1.0.x`） | 文件修訂 | 不變（`/schema/v1`） | 僅文件修改，無結構變更 |
| Minor（`v1.x.0`） | 新增可選欄位、新 `KnowledgeUnitType` 變體 | 不變（`/schema/v1`） | 僅做加法、向後相容。JSON Schema 檔案內含 `$schema` 版本屬性 |
| Major（`vN.0.0`） | 欄位更名、型別變更、移除欄位 | 新 URI（`/schema/v2`） | 破壞性變更，需遷移 |

##### 向後相容規則

- **v1 消費者** 必須能解析 `v1.x` 文件，忽略未知欄位（JSON Schema 設定 `additionalProperties: true`）
- **v2 消費者** 必須接受 `v1` 文件並套用遷移轉換
- Registry 儲存正規版本，並透過 content negotiation 提供即時轉換：`Accept: application/ld+json; profile="/schema/v1"`

##### 版本協商協定

- **REST API**：Client 送出 `KP-Schema-Version: v1` 標頭。未提供時回傳最新版本
- **MCP 工具**：`kp_search_knowledge` 與 `kp_contribute_knowledge` 新增可選 `schema_version` 參數
- Registry 回應中包含 `KP-Schema-Version` 標頭

##### Schema 遷移策略

遷移轉換函式位於 `packages/sdk/src/migrations/`：

```
migrations/
  v1-to-v2.ts    // export function migrate(v1: KnowledgeUnitV1): KnowledgeUnitV2
  v2-to-v3.ts
  index.ts        // chained migrator：自動鏈接 v1 → v2 → v3
```

- 遷移函式可組合：`v1 → v2 → v3` 自動鏈接
- CI 強制規則：每個破壞性變更 PR 必須附帶對應的遷移函式與往返測試

##### 棄用政策

舊主版本在下一主版本發佈後繼續支援 **12 個月**。棄用警告透過 `KP-Deprecated: true` 回應標頭傳達。

### 3.4 Layer 3：發現與交換層（MCP Server）

KnowledgePulse 以 MCP Server 形態存在，使用 `Bun.serve()` 實作 Streamable HTTP transport。

```typescript
// packages/mcp-server/src/index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const server = new McpServer({ name: "knowledgepulse", version: "1.1.0" });

// ── kp_search_skill ─────────────────────────────────────────
server.tool("kp_search_skill",
  "搜索 SKILL.md 技能庫（兼容 SkillsMP 格式）",
  {
    query:          z.string().describe("語義搜索查詢"),
    domain:         z.string().optional(),
    tags:           z.array(z.string()).optional(),
    min_quality:    z.number().min(0).max(1).default(0.7),
    limit:          z.number().max(20).default(5),
  },
  async ({ query, domain, tags, min_quality, limit }) => {
    const results = await registry.searchSkills({ query, domain, tags, min_quality, limit });
    return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
  }
);

// ── kp_search_knowledge ─────────────────────────────────────
server.tool("kp_search_knowledge",
  "搜索 KnowledgeUnit（ReasoningTrace / ToolCallPattern / ExpertSOP）",
  {
    query:           z.string(),
    knowledge_types: z.array(z.enum(["ReasoningTrace","ToolCallPattern","ExpertSOP"])).optional(),
    domain:          z.string().optional(),
    min_quality:     z.number().min(0).max(1).default(0.75),
    limit:           z.number().max(10).default(5),
  },
  async (params) => {
    const results = await registry.searchKnowledge(params);
    return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
  }
);

// ── kp_contribute_skill ─────────────────────────────────────
server.tool("kp_contribute_skill",
  "貢獻新 Skill 到網路（自動驗證 SKILL.md 格式）",
  {
    skill_md_content: z.string().describe("完整 SKILL.md 內容"),
    visibility:       z.enum(["private","org","network"]).default("network"),
  },
  async ({ skill_md_content, visibility }) => {
    const result = await registry.contributeSkill({ skill_md_content, visibility });
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

// ── kp_contribute_knowledge ─────────────────────────────────
server.tool("kp_contribute_knowledge",
  "貢獻 KnowledgeUnit（含品質預評分）",
  { unit: z.record(z.unknown()), visibility: z.enum(["private","org","network"]) },
  async ({ unit, visibility }) => {
    const result = await registry.contributeKnowledge({ unit, visibility });
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

// 其他工具：kp_validate_unit / kp_reputation_query / kp_provider_discover
```

#### 3.4.1 Knowledge Registry REST API

| Endpoint | Method | 說明 |
|----------|--------|------|
| `/v1/skills` | GET | 搜索 / 列出 Skills（SKILL.md 格式） |
| `/v1/skills/:id` | GET | 取得完整 Skill 內容 |
| `/v1/skills` | POST | 貢獻新 Skill（自動驗證格式） |
| `/v1/knowledge` | GET | 語義搜索 KnowledgeUnit |
| `/v1/knowledge/:id` | GET | 取得完整 KnowledgeUnit |
| `/v1/knowledge` | POST | 貢獻 KnowledgeUnit（含品質預評分） |
| `/v1/knowledge/:id/validate` | POST | 提交驗證結果 |
| `/v1/reputation/:agent_id` | GET | 查詢 KP-REP 信譽分數 |
| `/v1/providers` | GET | 發現 KnowledgePulse 節點提供者 |

#### 3.4.2 認證與速率限制（Authentication & Rate Limiting）

##### 認證模型

| 認證方式 | 適用場景 | 說明 |
|---------|---------|------|
| API Key（預設） | 所有用戶 | 透過 `kp auth register` 產生。金鑰以 SHA-256 雜湊儲存於 PostgreSQL。以 `Authorization: Bearer kp_<key>` 標頭傳遞。金鑰可設定範圍：`read`、`write`、`admin` |
| JWT（可選） | 組織部署 | OIDC 相容。自建 Registry 可配置自有 IdP。JWT claims 包含 `agent_id`、`org_id`、`scopes[]`、`kp_rep_score` |
| MCP Session Token | MCP 工具呼叫 | 認證搭載於 MCP session token。MCP Server 驗證 session 後內部對應至 KP API key |

##### 速率限制分級

| 層級 | 認證方式 | 讀取（`GET`） | 寫入（`POST`） | 突發上限 | 配額重置 |
|------|---------|-------------|----------------|---------|---------|
| Anonymous | 無（僅公開讀取） | 60 req/min | 不允許 | 10 req/s | 每分鐘滑動視窗 |
| Free | API Key（`read` 範圍） | 300 req/min | 30 req/min | 30 req/s | 每分鐘滑動視窗 |
| Pro | API Key（`read+write`） | 1,000 req/min | 200 req/min | 100 req/s | 每分鐘滑動視窗 |
| Enterprise | JWT + Org ID | 自訂 | 自訂 | 自訂 | 合約 SLA |

##### 速率限制回應標頭

- `X-RateLimit-Limit`：當前視窗配額上限
- `X-RateLimit-Remaining`：剩餘配額
- `X-RateLimit-Reset`：配額重置時間（Unix timestamp）
- 超限回應：HTTP `429 Too Many Requests` 搭配 `Retry-After` 標頭

##### 濫用防範

- **IP 回退限制**：即使持有效金鑰，仍以 IP 為基礎進行備援速率限制
- **自動金鑰撤銷**：1 小時內連續 3 次觸發 `429` 後自動撤銷金鑰
- **最低聲譽門檻**：`POST /v1/knowledge` 要求最低 KP-REP 分數 0.1（防止零聲譽垃圾提交）
- **冪等鍵（Idempotency Key）**：寫入端點強制使用冪等鍵以防止重複提交

> **實作備註**
>
> 使用 `Bun.serve()` 搭配 middleware chain 實作。速率限制狀態儲存於 Redis（參見 Section 6）。採用 Token Bucket 演算法。

### 3.5 Layer 4：隱私與安全層

| 層級 | 模式 | 適用場景 | 技術機制 |
|------|------|---------|---------|
| Level 1 | Aggregated Sharing | 通用解題模式、開源工具技巧 | 本地萃取抽象模式，不上傳原始對話 |
| Level 2 | Federated Learning | 企業跨部門、醫療、金融 | Flower 框架，只共享模型梯度 |
| Level 3 | Differential Privacy | 高敏感場景（個資、商業機密） | ε-DP 噪音 + SMPC |

#### 3.5.1 安全威脅模型（Security Threat Model）

本節定義 KnowledgePulse 的對抗性威脅模型，依攻擊向量、影響程度與緩解措施組織。

##### 威脅矩陣

| ID | 威脅 | 攻擊向量 | 影響 | 可能性 | 緩解措施 |
|----|------|---------|------|--------|---------|
| T-1 | 投毒知識注入（Poisoned Knowledge Injection） | 對手提交推理步驟含微妙錯誤的 ReasoningTrace，通過品質評分但導致下游 agent 產出錯誤結果 | 高——下游 agent 採用錯誤推理模式 | 中 | (a) 多驗證者共識：KnowledgeUnit 需 ≥ 3 名獨立驗證者確認方可升級為 `network` visibility；(b) Canary 測試執行：Registry 在沙箱中執行 trace 步驟後才接受；(c) 使用回饋降級：若消費者回報的 `success_rate` 低於 0.5，自動隔離 |
| T-2 | SKILL.md Prompt Injection | 惡意 SKILL.md 包含隱藏指令（HTML 註解、Unicode 隱寫術）劫持消費端 agent | 高——完全 agent 劫持 | 中 | (a) SKILL.md 內容消毒器：移除 HTML、正規化 Unicode、拒絕不可見字元；(b) LLM 注入分類器（於匯入時執行一次，非每次查詢）；(c) `kp:` 擴展區塊中的 Content Security Policy 標頭 |
| T-3 | 聲譽操控 / Sybil Attack | 對手建立多個 agent 身份為自身貢獻投票以灌水 KP-REP | 中——破壞信任體系 | 高 | (a) 註冊時 Proof-of-Work：每個 `agent_id` 須由已驗證 MCP 客戶端簽署挑戰；(b) EigenTrust 演算法（Section 3.6.1）——Sybil 節點收斂至低信任值；(c) 每 IP/org 新身份建立速率限制；(d) 投票權前最低貢獻年齡（30 天冷卻期） |
| T-4 | 知識檢索資料外洩（Data Exfiltration） | 對手查詢 Registry 以從聚合資料中重建專有推理鏈 | 高——智慧財產洩漏 | 低（含緩解措施） | (a) Aggregated Sharing（Level 1）在儲存前移除來源識別資訊並泛化模式；(b) k-anonymity：除非該領域存在 ≥ k 筆相似 KnowledgeUnit，否則不提供服務；(c) 查詢稽核日誌搭配批量提取模式異常偵測；(d) 按 API key 速率限制（參見 Section 3.4.2） |
| T-5 | Registry 阻斷服務（DoS） | 大量垃圾提交湧入 `/v1/knowledge` POST 端點 | 中——服務可用性 | 中 | (a) 速率限制分級（參見 Section 3.4.2）；(b) Zod schema 驗證作為第一道關卡（立即拒絕格式錯誤的 payload）；(c) Proof-of-contribution：POST 要求有效 API key 且 KP-REP 為正值 |

##### 縱深防禦匯入管線（Defence-in-Depth Ingestion Pipeline）

```
Request ──▶ Rate Limit ──▶ Auth ──▶ Schema Validation ──▶ Sanitizer
                                                            │
                                                            ▼
                              Accept ◀── Peer Review ◀── Sandbox Test ◀── Quality Score
```

##### 事件回應

提供 `kp security report <unit-id>` CLI 命令，用於回報可疑 KnowledgeUnit。觸發流程：立即隔離（quarantine）→ 社群審查 → 判定保留或永久移除。

### 3.6 Layer 5：治理與激勵層

#### 3.6.1 KP-REP 聲譽系統

KP-REP 是 Soulbound Token（SBT）形式的聲譽積分，不可買賣，只能透過持續高品質貢獻累積。

| 貢獻行為 | KP-REP 獲得條件 |
|---------|----------------|
| 提交 Skill | 通過自動格式驗證 + 累積 10+ 次成功使用 |
| 提交 ReasoningTrace | quality_score ≥ 0.75 + 同儕驗證通過 |
| 提交 ExpertSOP | 領域專家審核通過 |
| 驗證他人知識 | 驗證準確率 ≥ 85%（與最終共識比較） |
| 知識被引用 | 他人 agent 使用後回報成功（自動追蹤） |
| 專家認證 | 透過社群提案 + 投票授予領域認證標籤 |

#### 3.6.1.1 KP-REP 技術實作：Off-chain 聲譽資料庫

> **澄清**：Section 3.6.1 與專案概覽中的「Soulbound Token (SBT)」一詞暗示區塊鏈實作，但 KnowledgePulse v1.x 使用 **off-chain 聲譽資料庫** 作為主要實作方式。此為刻意的設計選擇。

##### 為何 v1.x 選擇 Off-chain

| 考量 | Off-chain 優勢 |
|------|---------------|
| 成本 | 無 gas 費用——鏈上 SBT 每次聲譽更新皆需支付 gas，以百萬級微型貢獻計算成本過高 |
| 延遲 | 鏈上寫入需數秒至數分鐘；KP-REP 更新須為近即時以支撐 Section 3.6.2 的回饋循環 |
| 隱私 | 鏈上資料為公開；部分組織要求聲譽分數為私有 |
| 簡潔性 | 引入區塊鏈相依性與「TypeScript + Bun」的簡潔哲學相悖（Section 1.2） |

##### Off-chain 實作細節

- **資料庫表**：`kp_reputation(agent_id PK, score NUMERIC, history JSONB, updated_at TIMESTAMPTZ)`（PostgreSQL）
- **分數計算**：EigenTrust 演算法（迭代式），以 Bun cron job 每 6 小時執行一次
- **可驗證憑證**：聲譽由 Registry 的 Ed25519 金鑰簽署，產出 W3C Verifiable Credential（VC）格式，agent 可向其他 Registry 出示
- **Soulbound 特性**：簽署憑證綁定至 `agent_id`，不可轉讓，由發行 Registry 可撤銷——實現 SBT 的核心「不可轉讓」原則而無需區塊鏈

##### 未來鏈上橋接（On-chain Bridge）

若社群有足夠需求，Phase 4 可新增可選的 EVM L2（如 Base、Arbitrum）SBT 橋接：

- Off-chain 憑證為權威來源；鏈上 SBT 為唯讀鏡像，供 Web3 生態互操作
- 此為 v1.x 的**明確非目標**（explicit non-goal）

#### 3.6.2 知識品質四層防線

1. **自動格式驗證（即時）**：SKILL.md schema 合規性、KnowledgeUnit JSON-LD 語法、Zod 執行時型別驗證
2. **同儕驗證（24-72 小時）**：KP-REP 加權投票，驗證者歷史準確率影響票權
3. **使用者回饋循環（持續）**：agent 使用後自動回報成功 / 失敗率，動態更新 quality_score
4. **專家審查（高風險領域）**：醫療、金融、法律觸發人工審核

### 3.7 資料保留與合規（Data Retention & Compliance）

適用於所有 KP Registry（自建或公共）中儲存的 KnowledgeUnit。

#### 資料保留政策

| 資料類別 | 預設保留期限 | 可配置 | 說明 |
|---------|------------|--------|------|
| KnowledgeUnit（network visibility） | 永久 | 是，按 Registry 設定 | 公開知識在 `quality_score ≥ 0.5` 時持續保留 |
| KnowledgeUnit（org visibility） | 24 個月 | 是，按組織政策 | 組織管理員可設定更短的保留期限 |
| KnowledgeUnit（private visibility） | 12 個月 | 是，按 agent 設定 | 未主動續期則自動刪除 |
| Agent 活動日誌 | 90 天 | 否（硬性上限） | 僅用於速率限制與濫用偵測 |
| KP-REP 歷史 | 永久 | 否 | 聲譽為永久公開紀錄（以假名呈現） |
| Embedding 向量 | 與父 KnowledgeUnit 相同 | 綁定父記錄 | 父記錄刪除時同步刪除 |

#### 刪除權（GDPR Art. 17）

- `DELETE /v1/knowledge/:id` 端點：貢獻者可請求刪除自己的 KnowledgeUnit。
- 刪除範圍涵蓋：Qdrant 向量、Neo4j 圖節點、PostgreSQL 記錄、Redis 快取。
- **限制**：若 KnowledgeUnit 已被聚合進聯邦學習模型（Level 2 隱私），聚合後的模型無法追溯「遺忘」。需要保證刪除的貢獻者應僅使用 Level 1（Aggregated Sharing）或 Level 3（附正式 ε 保證的 Differential Privacy）。
- 刪除請求於 72 小時內處理完成，並透過 webhook / email 確認。

#### 資料可攜權（GDPR Art. 20）

- `GET /v1/export/:agent_id` 端點：回傳該 agent 所貢獻的全部 KnowledgeUnit，以 JSON-LD 格式封裝為 ZIP 壓縮檔。
- 匯出內容包含：KnowledgeUnit、KP-REP 歷史、貢獻元資料。
- 格式為標準 JSON-LD，可直接匯入其他 KP Registry。

#### 合規認證路線圖

| 認證 | 目標階段 | 說明 |
|------|---------|------|
| GDPR 合規（自我評估） | Phase 2 | 保留 + 刪除 + 可攜 API |
| SOC 2 Type I | Phase 3 | Enterprise 級別要求 |
| SOC 2 Type II | Phase 4 | 12 個月稽核期 |
| HIPAA BAA | Phase 4 | 醫療垂直領域知識庫 |
| ISO 27001 | Phase 4+ | 長期目標 |

> **自建 Registry 注意事項**
>
> 自行部署 KP Registry 的組織須自行負責合規。開源部署版本透過環境變數提供可配置的保留政策：`KP_RETENTION_NETWORK_DAYS`、`KP_RETENTION_ORG_DAYS`、`KP_RETENTION_PRIVATE_DAYS`。

---

## 4. 功能模組規格

### 4.1 Module 1：Skill Registry（技能登錄中心）

提供比 SkillsMP 更完整的 SKILL.md 發現、安裝和管理體驗。

**核心功能：**
- 語義搜索：向量語義 + BM25 關鍵字混合搜索
- 一鍵安裝：`kp install <skill-id>` 自動生成 SKILL.md 至 `~/.claude/skills/`
- 品質指標：GitHub Stars + KP-REP 加權使用率 + 維護狀態 + Zod 驗證評分
- 跨平台兼容標籤：明確標示支援 Claude Code / Codex CLI / OpenClaw / LangGraph 等
- 私有 Skill 支援：組織內部 Skill 可私有部署，不上傳公開 Registry

### 4.2 Module 2：Knowledge Capture Engine（知識擷取引擎）

Agent 執行任務時，自動在背景萃取有價值的 KnowledgeUnit。

```typescript
// packages/sdk/src/capture.ts
import type { KnowledgeUnit, PrivacyLevel, Visibility } from "./types/knowledge-unit.js";

export interface CaptureConfig {
  autoCapture?:     boolean;       // 自動捕獲推理鏈（預設 true）
  valueThreshold?:  number;        // 只上傳高價值知識，預設 0.75
  privacyLevel?:    PrivacyLevel;  // 預設 "aggregated"
  visibility?:      Visibility;    // 預設 "network"
  domain:           string;        // 必填：知識領域
  registryUrl?:     string;        // 預設 https://registry.knowledgepulse.dev
}

export class KPCapture {
  constructor(private config: CaptureConfig) {}

  /** 包裝現有的 agent 執行函數，透明地擷取知識 */
  wrap<T extends (...args: unknown[]) => Promise<unknown>>(agentFn: T): T {
    return (async (...args: Parameters<T>) => {
      const traceId = crypto.randomUUID();
      const startTime = Date.now();
      const steps: ReasoningTrace["steps"] = [];

      // 攔截 console.log / tool calls 建立 trace（簡化示意）
      const result = await agentFn(...args);
      const elapsed = Date.now() - startTime;

      const score = await this.evaluateValue(steps);
      if (score >= (this.config.valueThreshold ?? 0.75)) {
        await this.contribute({ steps, score, elapsed });
      }

      return result;
    }) as T;
  }

  private async evaluateValue(steps: unknown[]): Promise<number> {
    // 本地評估推理鏈的知識新穎性與解題效率
    // 使用輕量規則引擎（無需呼叫外部 LLM）
    return 0.8; // placeholder — 完整規格詳見 Section 4.2.1
  }

  private async contribute(data: unknown): Promise<void> {
    await fetch(`${this.config.registryUrl ?? "https://registry.knowledgepulse.dev"}/v1/knowledge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, visibility: this.config.visibility }),
    });
  }
}
```

**擷取流程：**
1. Agent 執行任務，OpenTelemetry SDK 自動記錄完整 trace
2. 本地輕量評分引擎評估 trace 的「知識新穎性」和「解題效率」（無需呼叫外部 LLM，詳見 Section 4.2.1）
3. 評分超過 `valueThreshold` 的 trace 被萃取為 ReasoningTrace / ToolCallPattern
4. 依 `privacyLevel` 進行資料清洗（移除個資、商業敏感資訊）
5. 非同步提交至 KP Registry，不阻塞 agent 主流程

#### 4.2.1 Knowledge Value Scoring Algorithm（知識價值評分演算法）

本節定義上方 `evaluateValue()` 方法的完整規格（取代 `return 0.8; // placeholder`）。設計約束：評分必須在本地執行、延遲低於 100ms、無需外部 LLM 呼叫、產出 `0.0–1.0` 浮點數。

##### 四維評分模型

| 維度 | 權重 | 指標 | 計算方式 |
|------|------|------|---------|
| Trace Complexity (`C`) | 0.25 | 步驟類型多樣性、分支深度、錯誤恢復步驟 | `C = min(1.0, (unique_step_types / 4) * 0.5 + (error_recovery_count > 0 ? 0.3 : 0) + (step_count / 20) * 0.2)` |
| Novelty (`N`) | 0.35 | 與本地嵌入快取中最近鄰 KnowledgeUnit 的餘弦距離 | `N = 1.0 - max_cosine_similarity(trace_embedding, local_cache)` ；快取為空時 `N = 0.5`（中性值） |
| Tool Diversity (`D`) | 0.15 | 使用的唯一 MCP 工具數相對於步驟數 | `D = min(1.0, unique_tools / max(1, step_count) * 3)` |
| Outcome Confidence (`O`) | 0.25 | `outcome.confidence` 欄位結合 `success` 布林值 | `O = confidence * (success ? 1.0 : 0.3)` |

##### 複合公式

```
quality_score = C × 0.25 + N × 0.35 + D × 0.15 + O × 0.25
```

##### Embedding 策略

使用輕量級本地嵌入模型 `all-MiniLM-L6-v2`（約 80MB），透過 `@xenova/transformers` 在 Bun 環境中執行。嵌入內容為 `task.objective` + 各 `step[].content` 的串接。本地快取使用 in-memory HNSW 索引（透過 `hnswlib-node` 或 Bun FFI 至 `usearch`），保留最近 1,000 條已貢獻的 traces。

##### 規則引擎覆寫（Rule-based Overrides）

| 條件 | 動作 | 理由 |
|------|------|------|
| Trace 僅含 1 個步驟且類型為 `"thought"` | 強制 `score = 0.1` | 過於簡單，無知識價值 |
| `error_recovery` 步驟 > 2 且最終 `success === true` | 加分 `+0.1`（上限 1.0） | 包含有價值的除錯知識 |
| 所有工具完全相同（零多樣性） | 扣分 `-0.1`（下限 0.0） | 缺乏工具編排洞察 |

##### TypeScript 實作虛擬碼

```typescript
// packages/sdk/src/scoring.ts
import type { ReasoningTrace } from "./types/knowledge-unit.js";
import { pipeline } from "@xenova/transformers";
import { HnswIndex } from "./hnsw-cache.js";

const embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
const localCache = new HnswIndex({ maxElements: 1000, dimensions: 384 });

export async function evaluateValue(trace: ReasoningTrace): Promise<number> {
  const { steps, outcome, task } = trace;

  // ── Complexity (C) ──
  const uniqueTypes = new Set(steps.map(s => s.type)).size;
  const errorRecovery = steps.filter(s => s.type === "error_recovery").length;
  const C = Math.min(1.0,
    (uniqueTypes / 4) * 0.5 +
    (errorRecovery > 0 ? 0.3 : 0) +
    (steps.length / 20) * 0.2
  );

  // ── Novelty (N) ──
  const text = task.objective + " " + steps.map(s => s.content ?? "").join(" ");
  const embedding = await embedder(text, { pooling: "mean", normalize: true });
  const N = localCache.size > 0
    ? 1.0 - localCache.maxCosineSimilarity(embedding.data)
    : 0.5;

  // ── Tool Diversity (D) ──
  const uniqueTools = new Set(steps.filter(s => s.tool).map(s => s.tool!.name)).size;
  const D = Math.min(1.0, uniqueTools / Math.max(1, steps.length) * 3);

  // ── Outcome Confidence (O) ──
  const O = outcome.confidence * (trace.metadata.success ? 1.0 : 0.3);

  // ── Composite Score ──
  let score = C * 0.25 + N * 0.35 + D * 0.15 + O * 0.25;

  // ── Rule-based Overrides ──
  if (steps.length === 1 && steps[0].type === "thought") score = 0.1;
  if (errorRecovery > 2 && trace.metadata.success) score = Math.min(1.0, score + 0.1);
  if (uniqueTools <= 1 && steps.some(s => s.tool)) score = Math.max(0.0, score - 0.1);

  // 更新本地快取供後續 Novelty 計算
  localCache.add(embedding.data);

  return score;
}
```

##### 效能預算

整個評分流程（嵌入 + 相似度搜索 + 規則引擎）須在 2 核心機器上於 **100ms** 內完成。嵌入模型於啟動時一次性載入，HNSW 索引常駐記憶體，因此主要延遲來自嵌入推論（約 50–70ms）。

### 4.3 Module 3：Knowledge Retrieval（知識檢索引擎）

```typescript
// packages/sdk/src/retrieve.ts
import type { KnowledgeUnit, KnowledgeUnitType } from "./types/knowledge-unit.js";

export interface RetrievalConfig {
  minQuality?:     number;              // 預設 0.80
  knowledgeTypes?: KnowledgeUnitType[];
  limit?:          number;              // 預設 5
  registryUrl?:    string;
}

export class KPRetrieval {
  constructor(private config: RetrievalConfig = {}) {}

  async search(query: string, domain?: string): Promise<KnowledgeUnit[]> {
    const params = new URLSearchParams({
      q:           query,
      min_quality: String(this.config.minQuality ?? 0.80),
      limit:       String(this.config.limit ?? 5),
      ...(domain && { domain }),
      ...(this.config.knowledgeTypes && {
        types: this.config.knowledgeTypes.join(","),
      }),
    });

    const res = await fetch(
      `${this.config.registryUrl ?? "https://registry.knowledgepulse.dev"}/v1/knowledge?${params}`
    );
    return res.json() as Promise<KnowledgeUnit[]>;
  }

  /** 將 KnowledgeUnit 格式化為 Few-shot 範例，直接注入 LLM prompt */
  toFewShot(unit: KnowledgeUnit): string {
    if (unit["@type"] === "ReasoningTrace") {
      return unit.steps
        .map(s => `[${s.type.toUpperCase()}] ${s.content ?? s.output_summary ?? ""}`)
        .join("\n");
    }
    return JSON.stringify(unit, null, 2);
  }
}
```

### 4.4 Module 4：Expert SOP Studio（專家 SOP 工作室）

提供可視化編輯介面，讓領域專家將 SOP 轉換為 agent 可執行格式。

**核心功能：**
- 視覺化決策樹編輯器（拖拽式節點，React + Bun bundler）
- 自動匯入：從 Word / Notion / Confluence / PDF 解析 SOP 結構
- 內建測試沙箱：輸入測試案例，驗證 SOP 決策邏輯正確性
- SKILL.md 雙向同步：ExpertSOP 可自動生成對應 SKILL.md，同時出現在 Skills 市場
- 貢獻者認證：完成 SOP 提交自動獲得相應領域的 KP-REP 積分

### 4.5 Module 5：Knowledge Marketplace（知識市場）

| 存取模式 | 說明 | 適用情境 |
|---------|------|---------|
| 完全開放（Free） | 所有人可免費使用，貢獻者獲得 KP-REP | 通用工具技巧、開源最佳實踐 |
| 組織共享（Org-gated） | 僅限組織內部 | 企業內部 SOP、私有流程 |
| 訂閱制（Subscription） | 訂閱者無限查詢 | 高品質垂直領域知識庫 |
| 按查詢付費（Pay-per-use） | 每次查詢消耗 KP Token | 稀缺的專家級知識 |

---

## 5. 開源策略與社群建設

### 5.1 開源範圍

| 元件 | 授權 | 說明 |
|------|------|------|
| KnowledgePulse 協議規範 | Apache 2.0 | SKILL.md 擴展格式 + KnowledgeUnit JSON-LD schema |
| **TypeScript SDK** | Apache 2.0 | **Knowledge Capture / Retrieval / Contribute（Bun + tsup）** |
| MCP Server | Apache 2.0 | kp_* 工具集，任何 MCP 客戶端可使用（Bun.serve()） |
| CLI 工具（`kp`） | Apache 2.0 | **Bun single binary，無需 runtime，一行安裝** |
| Expert SOP Studio（基礎版） | Apache 2.0 | 社群版 SOP 編輯器（React + Bun bundler） |
| Self-hosted Registry | Apache 2.0 | Docker 一鍵部署（Bun HTTP Server + Qdrant + PostgreSQL） |
| AgentPulse Pro 整合 | 商業授權 | 深度整合 OpenClaw，進階分析、SLA 保證 |
| AgentPulse Enterprise | 商業授權 | 私有部署、合規功能（SOC 2 / HIPAA） |

### 5.2 Monorepo 結構（TypeScript + Bun Workspace）

```
knowledgepulse/                         # github.com/openclaw/knowledgepulse
├── packages/
│   ├── sdk/                            # TypeScript SDK（npm: @knowledgepulse/sdk）
│   │   ├── src/
│   │   │   ├── capture.ts              # Knowledge Capture Engine
│   │   │   ├── retrieve.ts             # Knowledge Retrieval
│   │   │   ├── contribute.ts           # Contribution API
│   │   │   ├── types/
│   │   │   │   └── knowledge-unit.ts   # ← Single Source of Truth（型別定義）
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsup.config.ts              # 打包：ESM + CJS + .d.ts
│   │
│   ├── mcp-server/                     # MCP Server（npm: @knowledgepulse/mcp）
│   │   ├── src/
│   │   │   ├── tools/                  # kp_search / kp_contribute 等 MCP 工具
│   │   │   ├── registry.ts             # Knowledge Registry 邏輯
│   │   │   └── index.ts                # Bun.serve() 入口
│   │   └── package.json
│   │
│   ├── cli/                            # CLI 工具（kp 命令）
│   │   ├── src/
│   │   │   ├── commands/
│   │   │   │   ├── search.ts           # kp search
│   │   │   │   ├── install.ts          # kp install
│   │   │   │   ├── validate.ts         # kp validate
│   │   │   │   └── contribute.ts       # kp contribute
│   │   │   └── index.ts
│   │   └── package.json                # "bin": { "kp": "src/index.ts" }
│   │
│   └── sop-studio/                     # Expert SOP Studio（Next.js + Bun）
│       ├── app/
│       └── package.json
│
├── specs/
│   ├── skill-md-extension.md           # SKILL.md 擴展規範
│   ├── knowledge-unit-schema.json      # 由 bun run codegen 從 TypeScript 型別生成
│   └── api-openapi.yaml                # Registry API OpenAPI 3.1
│
├── registry/                           # Self-hosted Registry Server（Bun HTTP Server）
│   ├── src/
│   └── docker-compose.yml              # Bun + Qdrant + PostgreSQL
│
├── examples/
│   ├── langraph-integration/           # LangGraph via MCP（Python → MCP HTTP）
│   ├── crewai-integration/             # CrewAI via MCP（Python → MCP HTTP）
│   ├── openclaw-integration/           # OpenClaw 深度整合（TypeScript SDK）
│   └── flowise-integration/            # Flowise Node Plugin（TypeScript）
│
├── bunfig.toml                         # Bun 全域設定
├── package.json                        # Workspace root（bun workspaces）
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
└── LICENSE                             # Apache 2.0
```

#### `bunfig.toml` 全域設定

```toml
[install]
# 鎖定 registry 確保一致性
registry = "https://registry.npmjs.org"

[test]
# bun test 設定
preload = ["./test/setup.ts"]
timeout = 30000

[build]
# 開發時 sourcemap
sourcemap = "inline"
```

#### Workspace `package.json`

```json
{
  "name": "knowledgepulse",
  "private": true,
  "workspaces": [
    "packages/sdk",
    "packages/mcp-server",
    "packages/cli",
    "packages/sop-studio",
    "registry"
  ],
  "scripts": {
    "dev":     "bun run --filter '*' dev",
    "build":   "bun run --filter '*' build",
    "test":    "bun test",
    "codegen": "bun run specs/codegen.ts",
    "lint":    "bun x tsc --noEmit && bun x eslint packages/*/src",
    "validate-schema": "bun run specs/validate-consistency.ts"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "tsup": "^8.0.0",
    "@biomejs/biome": "^1.8.0"
  }
}
```

### 5.3 Schema Codegen 流程（TypeScript 為 Single Source of Truth）

```
packages/sdk/src/types/knowledge-unit.ts   ← 開發者在這裡修改型別
         │
         │  bun run codegen
         ▼
specs/knowledge-unit-schema.json           ← 自動生成 JSON Schema
         │
         ├──▶ 其他語言的 client（json-schema-to-<lang>）
         └──▶ CI 一致性檢查：schema 與型別必須同步，否則 PR 阻擋
```

```typescript
// specs/codegen.ts
import { zodToJsonSchema } from "zod-to-json-schema";
import { KnowledgeUnitSchema } from "../packages/sdk/src/types/zod-schemas.js";
import { writeFileSync } from "fs";

const schema = zodToJsonSchema(KnowledgeUnitSchema, "KnowledgeUnit");
writeFileSync("specs/knowledge-unit-schema.json", JSON.stringify(schema, null, 2));
console.log("✅ JSON Schema 已從 TypeScript 型別生成");
```

### 5.4 框架整合目標

| 框架 | 整合方式 | 優先級 | 說明 |
|------|---------|--------|------|
| Claude Code | 原生 SKILL.md | P0 | KP skills 直接放入 `~/.claude/skills/` |
| OpenAI Codex CLI | 原生 SKILL.md | P0 | 相同格式，直接兼容 |
| OpenClaw | TypeScript SDK 深度整合 | P0 | Knowledge Capture 自動啟用 |
| LangGraph | **MCP HTTP**（Python → KP MCP Server） | P1 | 無需 Python SDK，透過 MCP 協議通訊 |
| CrewAI | **MCP HTTP**（Python → KP MCP Server） | P1 | 同上，語言無關 |
| AutoGen | **MCP HTTP** | P1 | 同上 |
| Flowise | TypeScript Node Plugin | P2 | 視覺化流程整合 |
| Letta（MemGPT） | **MCP HTTP** | P2 | 與 MemGPT 記憶層互補 |

> **關鍵設計**：Python 框架（LangGraph、CrewAI、AutoGen）不需要 TypeScript SDK，透過 MCP HTTP 協議直接與 KnowledgePulse 通訊。這是從 v1.0 雙語言策略轉向 TypeScript 單一語言的核心理由。

### 5.5 與 SkillsMP 生態的關係

> **合作而非競爭**
>
> KnowledgePulse 不是 SkillsMP 的競爭對手，而是補充層。SkillsMP 是優秀的 Skill 發現平台，KnowledgePulse 提供更深層的知識基礎設施——品質驗證 API、動態知識萃取、跨框架互操作、以及 MCP 原生支援。計畫與 SkillsMP 主動合作，讓 KP Registry 的 skills 同步出現在 SkillsMP。

---

## 6. 技術選型

| 元件 | 推薦技術 | 選型理由 |
|------|---------|---------|
| **Runtime** | **Bun 1.x** | **原生 TypeScript、3-5x 啟動速度、內建 SQLite、單一執行檔打包** |
| 協議傳輸 | JSON-RPC 2.0 over Streamable HTTP | MCP 完全兼容 |
| **HTTP Server** | **Bun.serve()** | **原生整合，比 Express/Fastify 效能更高** |
| 知識格式 | JSON-LD + 自定義 @context | 語義互操作 + 標準 RDF 工具鏈 |
| **型別驗證** | **Zod** | **執行時型別安全，與 Bun 完美整合** |
| **SDK 打包** | **tsup（ESM + CJS + .d.ts）** | **Bun 開發，tsup 打包雙格式** |
| **Schema Codegen** | **zod-to-json-schema** | **TypeScript 型別 → JSON Schema 自動生成** |
| 向量語義搜索 | Qdrant（主）/ pgvector（整合） | Qdrant 效能領先，pgvector 適合 PG 用戶 |
| 知識圖譜 | Neo4j + Graphiti | 時序感知 bi-temporal 模型，有 MCP Server |
| 關聯資料庫 | PostgreSQL 16+ | 成熟穩定，支援 JSONB |
| 快取 | Redis 7+ | 高頻查詢快取 |
| Agent 追蹤 | OpenTelemetry + Langfuse | 開放標準，視覺化 trace 分析 |
| **測試** | **Bun test** | **內建測試框架，比 vitest 快 30%** |
| **Linter / Formatter** | **Biome** | **Bun 生態首選，取代 ESLint + Prettier** |
| CI/CD | GitHub Actions | 與開源倉庫原生整合 |
| 文件 | Docusaurus 3 | MDX 支援，多語言就緒 |

---

## 7. 實施路線圖

### Phase 1（Month 0-3）：SKILL.md 兼容 Registry + 基礎 SDK

> **目標**：成為比 SkillsMP 更完整的 SKILL.md Registry。此階段無需說服社群換格式，直接兼容現有 200,000+ skills。用 Bun 展示速度優勢。

**交付物：**
- KnowledgePulse 協議規範 v1.0（GitHub，含 SKILL.md 擴展規格）
- `@knowledgepulse/sdk` 0.1.0：Skill 搜索、安裝、貢獻 API（TypeScript + Bun）
- `@knowledgepulse/mcp` 1.0：`kp_search_skill`、`kp_get_skill`、`kp_contribute_skill`
- `kp` CLI：`search` / `install` / `validate` / `contribute`（Bun single binary）
- Self-hosted Registry：`docker compose up` 一鍵部署（Bun Server + Qdrant + PostgreSQL）
- Schema Versioning v1 策略與遷移框架（Section 3.3.2）
- API Key 認證與速率限制基礎建設（Section 3.4.2）
- 安全威脅模型文件與 SKILL.md 內容消毒器（Section 3.5.1）
- 文件網站（中英文雙語，Docusaurus）

**成功指標：** GitHub Stars ≥ 500 · Registry Skills ≥ 1,000 · 社群整合文章 ≥ 10

### Phase 2（Month 3-6）：Knowledge Capture + 品質系統

> **目標**：加入 Layer 2 動態知識層，這是 KnowledgePulse 真正的差異化階段。

**交付物：**
- Knowledge Capture Engine：`KPCapture.wrap()` 自動萃取推理鏈
- Knowledge Value Scoring Algorithm 完整實作（Section 4.2.1）
- KnowledgeUnit v1.0：ReasoningTrace + ToolCallPattern 完整 TypeScript 型別 + JSON Schema
- 品質評分系統：自動 Zod 驗證 + EigenTrust 加權同儕驗證
- KP-REP Off-chain 聲譽資料庫上線（Section 3.6.1.1）
- Knowledge Retrieval：語義搜索 + Few-shot 注入 API
- GDPR 合規自我評估：資料保留 + 刪除 + 可攜 API（Section 3.7）
- OpenClaw 深度整合（TypeScript SDK，Knowledge Capture 自動啟用）
- LangGraph / CrewAI / AutoGen MCP HTTP 整合範例

**成功指標：** KnowledgeUnit 貢獻量 ≥ 10,000 · 框架整合 ≥ 3 · Agent 知識重用率 ≥ 15%

### Phase 3（Month 6-12）：Expert SOP Studio + Marketplace

> **目標**：開放人類專家的知識貢獻通道，建立知識市場和激勵機制。

**交付物：**
- Expert SOP Studio 公開測試版（React + Bun bundler，視覺化決策樹編輯器）
- ExpertSOP 格式 v1.0 + 從 Word / Notion / PDF 自動匯入
- KP-REP 聲譽 SBT 系統上線
- Knowledge Marketplace：Free / Org-gated / Subscription 定價
- 垂直領域知識庫啟動（金融分析、客服、農業 AI）
- 聯邦學習隱私層（Flower framework）
- SOC 2 Type I 認證啟動（Section 3.7 合規路線圖）

**成功指標：** 月活躍貢獻者 ≥ 500 · ExpertSOP ≥ 1,000 · Marketplace GMV 啟動

### Phase 4（Month 12-24）：行業標準化

- 向 Linux Foundation AI & Data（LFAI）提交 KnowledgePulse 作為開放標準提案
- 建立行業聯盟（吸引 3-5 家主要 AI 框架廠商正式採用）
- 發布完整治理結構：技術委員會 + 社群議院（Quadratic Voting）
- 多語言支援：繁中、簡中、日文、韓文、西班牙文

---

## 8. 商業模式（Open Core）

### 8.1 四層收入模型

| 層級 | 產品 | 定價 | 目標客群 |
|------|------|------|---------|
| Free | 開源核心（Registry + SDK + MCP + CLI） | 免費 | 個人開發者、學術研究、開源專案 |
| Pro | AgentPulse Pro + KP 深度整合 | $49/月/agent | 中小企業、獨立 AI 開發者 |
| Enterprise | 私有部署 + 合規 + SLA | 客製定價 | 大型企業、金融 / 醫療 / 政府 |
| Marketplace | 知識交易平台手續費 | 交易額 15% | 知識供需雙方 |

### 8.2 競爭定位

| 競品 | 定位 | 與 KP 的關係 |
|------|------|------------|
| SkillsMP | SKILL.md 發現平台 | 合作：KP skills 同步至 SkillsMP，互相導流 |
| SkillHub | 精選 SKILL.md 市場 | 兼容：KP 用戶可直接使用 SkillHub skills |
| Mem0 | Per-agent 記憶層框架 | 互補：Mem0 處理個人記憶，KP 處理跨 agent 知識 |
| LangChain Hub | 靜態 Prompt / Chain 市場 | 超越：KP 提供動態知識 + 跨框架互操作 |
| Bittensor | 去中心化 AI 知識市場 | 學習：借鑒激勵機制，KP 以漸進方式引入 |

---

## 9. 成功指標與驗收標準

| 指標 | Phase 1 目標 | Phase 2 目標 | Phase 3 目標 |
|------|------------|------------|------------|
| GitHub Stars | ≥ 500 | ≥ 2,000 | ≥ 5,000 |
| Registry Skills 數 | ≥ 1,000 | ≥ 5,000 | ≥ 20,000 |
| KnowledgeUnit 數 | N/A | ≥ 10,000 | ≥ 100,000 |
| 月活躍貢獻者 | ≥ 50 | ≥ 200 | ≥ 500 |
| 框架整合數 | 1（OpenClaw） | ≥ 4 | ≥ 8 |
| Knowledge 重用率 | N/A | ≥ 15% | ≥ 30% |
| 平均 quality_score | N/A | ≥ 0.75 | ≥ 0.82 |
| Enterprise 客戶 | 0 | ≥ 3 POC | ≥ 10 付費 |
| **Bun 啟動延遲** | **< 100ms** | **< 80ms** | **< 50ms** |
| **測試覆蓋率** | **≥ 80%** | **≥ 85%** | **≥ 90%** |
| **API 認證覆蓋率** | **100%（所有寫入端點）** | **100%** | **100%** |
| **安全事件回應時間** | **< 24h（隔離）** | **< 12h** | **< 6h** |
| **評分延遲（Section 4.2.1）** | **< 100ms** | **< 80ms** | **< 50ms** |
| **GDPR 刪除請求 SLA** | N/A | **< 72h** | **< 24h** |

---

## 10. 附錄

### A. 快速開始（5 分鐘入門）

#### 安裝

```bash
# CLI 工具（Bun single binary，無需 runtime）
curl -fsSL https://knowledgepulse.dev/install.sh | sh
# 或
bun add -g @knowledgepulse/cli

# TypeScript SDK
bun add @knowledgepulse/sdk

# MCP Server
bun add @knowledgepulse/mcp
```

#### 搜索並安裝 Skill

```bash
# 搜索財務分析相關 skills
kp search "financial analysis"

# 安裝 skill（自動生成 SKILL.md 至 ~/.claude/skills/）
kp install financial-report-analyzer

# 驗證 SKILL.md 格式
kp validate ./my-skill.md

# 列出已安裝的 skills
kp list
```

#### 啟用 Knowledge Capture（TypeScript）

```typescript
import { KPCapture } from "@knowledgepulse/sdk";

// 一行整合現有 agent
const capture = new KPCapture({
  domain: "financial_analysis",
  visibility: "network",
  valueThreshold: 0.75,
});

const wrappedAgent = capture.wrap(yourExistingAgentFn);

// 正常使用 agent，知識自動共享
const result = await wrappedAgent("分析 TSMC Q4 2025 財報");
```

#### Python 框架透過 MCP 接入（無需 Python SDK）

```python
# LangGraph / CrewAI / AutoGen 透過 MCP HTTP 存取 KnowledgePulse
# 不需要安裝任何 Python 套件

# 在 MCP 客戶端設定中加入 KP Server
mcp_config = {
    "knowledgepulse": {
        "url": "https://registry.knowledgepulse.dev/mcp",
        "transport": "http"
    }
}

# 之後 agent 可直接呼叫 KP MCP 工具
result = agent.run(
    "分析財報",
    tools=["kp_search_skill", "kp_search_knowledge"]
)
```

#### 自行部署 Registry

```bash
# Docker Compose 一鍵部署（Bun Server + Qdrant + PostgreSQL）
git clone https://github.com/openclaw/knowledgepulse
cd knowledgepulse/registry
docker compose up -d

# Registry API：http://localhost:8080
# 管理介面：http://localhost:3000
# MCP Server：http://localhost:8080/mcp
```

### B. 從 v1.0（Python）遷移至 v1.1（TypeScript + Bun）對照表

| v1.0（Python） | v1.1（TypeScript + Bun） | 說明 |
|---------------|--------------------------|------|
| `pip install knowledgepulse` | `bun add @knowledgepulse/sdk` | SDK 安裝 |
| `PyPI: knowledgepulse` | `npm: @knowledgepulse/sdk` | 套件倉庫 |
| `from knowledgepulse import KPCapture` | `import { KPCapture } from "@knowledgepulse/sdk"` | 匯入方式 |
| `KPCapture(domain="...")` | `new KPCapture({ domain: "..." })` | 初始化 |
| `capture.wrap(agent)` | `capture.wrap(agentFn)` | 包裝 agent |
| `Poetry + pytest + mypy` | `bun test + Biome + tsc` | 開發工具鏈 |
| `sdk-python/` 目錄 | 移除（MCP HTTP 取代） | Python 框架透過 MCP 存取 |
| `datamodel-code-generator` | `zod-to-json-schema` | Schema 生成工具 |

### C. 術語表

| 術語 | 定義 |
|------|------|
| SKILL.md | Agent Skills 的開放標準格式，SkillsMP / SkillHub / Claude Code 等平台使用 |
| KnowledgeUnit | KnowledgePulse 的核心知識格式（JSON-LD），是 SKILL.md 的動態知識擴展 |
| ReasoningTrace | Agent 解決問題時的完整推理鏈記錄 |
| ToolCallPattern | 可重用的工具編排序列 |
| ExpertSOP | 人類專家 SOP，轉換為 agent 可執行的結構化格式 |
| KP-REP | KnowledgePulse 聲譽系統。v1.x 以 Off-chain 簽名憑證實作（Section 3.6.1.1），概念上遵循 Soulbound Token 不可轉讓原則 |
| Knowledge Capture | 自動從 agent 執行過程萃取有價值知識的機制 |
| Fleet Learning | Tesla 讓所有車輛共享駕駛經驗的模式，KP 將此應用於 AI agents |
| MCP | Model Context Protocol，KP 以 MCP Server 形態存在 |
| Open Core | 核心功能開源，進階企業功能商業化的商業模式 |
| Bun | 高效能 JavaScript/TypeScript runtime，KP 全棧使用 |
| tsup | 基於 esbuild 的打包工具，輸出 ESM + CJS + .d.ts |
| Biome | 新一代 Linter + Formatter，取代 ESLint + Prettier |
| EigenTrust | 分散式聲譽演算法，用於 KP-REP 分數計算（Section 3.6.1.1），Sybil 節點自動收斂至低信任值 |
| Sybil Attack | 攻擊者建立大量假身份以操控聲譽或投票系統的手法（Section 3.5.1 T-3） |
| k-anonymity | 隱私保護技術，確保每筆資料與至少 k-1 筆其他資料無法區分（Section 3.5.1 T-4） |
| Token Bucket | 速率限制演算法，以固定速率填充 token 並按請求消耗（Section 3.4.2） |
| W3C VC | W3C Verifiable Credential，用於 KP-REP 簽署憑證的標準格式（Section 3.6.1.1） |

---

*KnowledgePulse PRD v1.1.0 · Apache 2.0 · github.com/openclaw/knowledgepulse*
