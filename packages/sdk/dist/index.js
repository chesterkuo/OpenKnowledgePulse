// src/types/knowledge-unit.ts
var KP_CONTEXT = "https://knowledgepulse.dev/schema/v1";

// src/types/zod-schemas.ts
import { z } from "zod";
var KnowledgeUnitTypeSchema = z.enum(["ReasoningTrace", "ToolCallPattern", "ExpertSOP"]);
var PrivacyLevelSchema = z.enum(["aggregated", "federated", "private"]);
var VisibilitySchema = z.enum(["private", "org", "network"]);
var KnowledgeUnitMetaSchema = z.object({
  created_at: z.string().datetime(),
  agent_id: z.string().optional(),
  framework: z.string().optional(),
  task_domain: z.string().min(1),
  success: z.boolean(),
  quality_score: z.number().min(0).max(1),
  visibility: VisibilitySchema,
  privacy_level: PrivacyLevelSchema,
  validated_by: z.array(z.string()).optional()
});
var ReasoningTraceStepSchema = z.object({
  step_id: z.number().int().nonnegative(),
  type: z.enum(["thought", "tool_call", "observation", "error_recovery"]),
  content: z.string().optional(),
  tool: z.object({
    name: z.string(),
    mcp_server: z.string().optional()
  }).optional(),
  input: z.record(z.unknown()).optional(),
  output_summary: z.string().optional(),
  latency_ms: z.number().nonnegative().optional()
});
var ReasoningTraceSchema = z.object({
  "@context": z.literal(KP_CONTEXT),
  "@type": z.literal("ReasoningTrace"),
  id: z.string().startsWith("kp:trace:"),
  source_skill: z.string().optional(),
  metadata: KnowledgeUnitMetaSchema,
  task: z.object({
    objective: z.string().min(1),
    input_schema: z.record(z.unknown()).optional()
  }),
  steps: z.array(ReasoningTraceStepSchema).min(1),
  outcome: z.object({
    result_summary: z.string(),
    confidence: z.number().min(0).max(1)
  }),
  knowledge_graph_delta: z.object({
    entities: z.array(z.object({ name: z.string(), type: z.string() })),
    relationships: z.array(z.object({ fact: z.string(), valid_from: z.string() }))
  }).optional()
});
var ToolCallPatternSchema = z.object({
  "@context": z.literal(KP_CONTEXT),
  "@type": z.literal("ToolCallPattern"),
  id: z.string().startsWith("kp:pattern:"),
  name: z.string().min(1),
  description: z.string(),
  metadata: KnowledgeUnitMetaSchema,
  trigger_conditions: z.object({
    task_types: z.array(z.string()).min(1),
    required_tools: z.array(z.string()).optional()
  }),
  tool_sequence: z.array(
    z.object({
      step: z.string(),
      execution: z.enum(["parallel", "sequential"]),
      tools: z.array(
        z.object({
          name: z.string(),
          query_template: z.string().optional(),
          input_template: z.record(z.unknown()).optional()
        })
      ),
      condition: z.string().optional()
    })
  ).min(1),
  performance: z.object({
    avg_ms: z.number().nonnegative(),
    success_rate: z.number().min(0).max(1),
    uses: z.number().int().nonnegative()
  })
});
var ExpertSOPSchema = z.object({
  "@context": z.literal(KP_CONTEXT),
  "@type": z.literal("ExpertSOP"),
  id: z.string().startsWith("kp:sop:"),
  name: z.string().min(1),
  domain: z.string().min(1),
  metadata: KnowledgeUnitMetaSchema,
  source: z.object({
    type: z.literal("human_expert"),
    expert_id: z.string(),
    credentials: z.array(z.string())
  }),
  decision_tree: z.array(
    z.object({
      step: z.string(),
      instruction: z.string(),
      criteria: z.record(z.string()).optional(),
      conditions: z.record(
        z.object({
          action: z.string(),
          sla_min: z.number().optional()
        })
      ).optional(),
      tool_suggestions: z.array(z.object({ name: z.string(), when: z.string() })).optional()
    })
  ).min(1),
  validation: z.object({
    test_cases: z.array(
      z.object({
        input: z.record(z.unknown()),
        expected_output: z.record(z.unknown())
      })
    )
  }).optional()
});
var KnowledgeUnitSchema = z.discriminatedUnion("@type", [
  ReasoningTraceSchema,
  ToolCallPatternSchema,
  ExpertSOPSchema
]);
var SkillMdFrontmatterSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  version: z.string().optional(),
  author: z.string().optional(),
  license: z.string().optional(),
  tags: z.array(z.string()).optional(),
  "allowed-tools": z.array(z.string()).optional()
});
var SkillMdKpExtensionSchema = z.object({
  knowledge_capture: z.boolean().optional(),
  domain: z.string().optional(),
  quality_threshold: z.number().min(0).max(1).optional(),
  privacy_level: PrivacyLevelSchema.optional(),
  visibility: VisibilitySchema.optional(),
  reward_eligible: z.boolean().optional()
});

// src/hnsw-cache.ts
var VectorCache = class {
  entries = [];
  maxElements;
  dimensions;
  ttlMs;
  constructor(opts = {}) {
    this.maxElements = opts.maxElements ?? 1e3;
    this.dimensions = opts.dimensions ?? 384;
    this.ttlMs = opts.ttlMs ?? null;
  }
  get size() {
    this.evictExpired();
    return this.entries.length;
  }
  add(vector) {
    if (vector.length !== this.dimensions) {
      throw new Error(`Expected ${this.dimensions} dimensions, got ${vector.length}`);
    }
    const v = vector instanceof Float32Array ? vector : new Float32Array(vector);
    this.entries.push({ vector: v, addedAt: Date.now() });
    if (this.entries.length > this.maxElements) {
      this.entries.shift();
    }
  }
  /** Remove entries older than `ttlMs`. No-op when TTL is not configured. */
  evictExpired() {
    if (this.ttlMs === null) return;
    const now = Date.now();
    const cutoff = now - this.ttlMs;
    this.entries = this.entries.filter((e) => e.addedAt > cutoff);
  }
  maxCosineSimilarity(query) {
    this.evictExpired();
    if (this.entries.length === 0) return 0;
    const q = query instanceof Float32Array ? query : new Float32Array(query);
    let maxSim = -1;
    for (const entry of this.entries) {
      const sim = cosineSimilarity(q, entry.vector);
      if (sim > maxSim) maxSim = sim;
    }
    return maxSim;
  }
  clear() {
    this.entries = [];
  }
};
function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// src/scoring.ts
var DEFAULT_WEIGHTS = {
  complexity: 0.25,
  novelty: 0.35,
  toolDiversity: 0.15,
  outcomeConfidence: 0.25
};
var DOMAIN_WEIGHTS = {
  finance: { complexity: 0.2, novelty: 0.25, toolDiversity: 0.1, outcomeConfidence: 0.45 },
  code: { complexity: 0.2, novelty: 0.3, toolDiversity: 0.3, outcomeConfidence: 0.2 },
  medical: { complexity: 0.15, novelty: 0.2, toolDiversity: 0.1, outcomeConfidence: 0.55 },
  customer_service: { complexity: 0.2, novelty: 0.3, toolDiversity: 0.2, outcomeConfidence: 0.3 }
};
function getWeights(domain) {
  return DOMAIN_WEIGHTS[domain] ?? DEFAULT_WEIGHTS;
}
var localCache = new VectorCache({ maxElements: 1e3, dimensions: 384 });
var embedderPromise = null;
async function getEmbedder() {
  if (embedderPromise) return embedderPromise;
  embedderPromise = (async () => {
    try {
      const { pipeline } = await import("@huggingface/transformers");
      const pipe = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
      return async (text) => {
        const result = await pipe(text, { pooling: "mean", normalize: true });
        return new Float32Array(result.data);
      };
    } catch {
      return null;
    }
  })();
  return embedderPromise;
}
async function evaluateValue(trace) {
  const { steps, outcome, task } = trace;
  const uniqueTypes = new Set(steps.map((s) => s.type)).size;
  const errorRecovery = steps.filter((s) => s.type === "error_recovery").length;
  const C = Math.min(
    1,
    uniqueTypes / 4 * 0.5 + (errorRecovery > 0 ? 0.3 : 0) + steps.length / 20 * 0.2
  );
  let N = 0.5;
  const embedder = await getEmbedder();
  if (embedder) {
    const text = `${task.objective} ${steps.map((s) => s.content ?? "").join(" ")}`;
    const embedding = await embedder(text);
    N = localCache.size > 0 ? 1 - localCache.maxCosineSimilarity(embedding) : 0.5;
    localCache.add(embedding);
  }
  const uniqueTools = new Set(steps.filter((s) => s.tool).map((s) => s.tool?.name)).size;
  const D = Math.min(1, uniqueTools / Math.max(1, steps.length) * 3);
  const O = outcome.confidence * (trace.metadata.success ? 1 : 0.3);
  const w = getWeights(trace.metadata.task_domain);
  let score = C * w.complexity + N * w.novelty + D * w.toolDiversity + O * w.outcomeConfidence;
  if (steps.length === 1 && steps[0]?.type === "thought") score = 0.1;
  if (errorRecovery > 2 && trace.metadata.success) score = Math.min(1, score + 0.1);
  if (uniqueTools <= 1 && steps.some((s) => s.tool)) score = Math.max(0, score - 0.1);
  return score;
}

// src/utils/id.ts
function uuid() {
  return crypto.randomUUID();
}
function generateTraceId() {
  return `kp:trace:${uuid()}`;
}
function generatePatternId() {
  return `kp:pattern:${uuid()}`;
}
function generateSopId() {
  return `kp:sop:${uuid()}`;
}
function generateSkillId() {
  return `kp:skill:${uuid()}`;
}

// src/capture.ts
var KPCapture = class {
  config;
  constructor(config) {
    this.config = {
      autoCapture: true,
      valueThreshold: 0.75,
      privacyLevel: "aggregated",
      visibility: "network",
      ...config
    };
  }
  /**
   * Wrap an agent function to transparently capture knowledge.
   * The wrapper records execution trace, scores it, and async-contributes if above threshold.
   */
  wrap(agentFn) {
    return (async (...args) => {
      if (!this.config.autoCapture) {
        return agentFn(...args);
      }
      const traceId = generateTraceId();
      const startTime = Date.now();
      const steps = [];
      steps.push({
        step_id: 0,
        type: "thought",
        content: `Executing with args: ${JSON.stringify(args).slice(0, 200)}`
      });
      let success = true;
      let result;
      try {
        result = await agentFn(...args);
        steps.push({
          step_id: steps.length,
          type: "observation",
          content: "Execution completed successfully",
          latency_ms: Date.now() - startTime
        });
      } catch (error) {
        success = false;
        steps.push({
          step_id: steps.length,
          type: "error_recovery",
          content: `Error: ${error instanceof Error ? error.message : String(error)}`,
          latency_ms: Date.now() - startTime
        });
        throw error;
      } finally {
        const trace = {
          "@context": KP_CONTEXT,
          "@type": "ReasoningTrace",
          id: traceId,
          metadata: {
            created_at: (/* @__PURE__ */ new Date()).toISOString(),
            task_domain: this.config.domain,
            success,
            quality_score: 0,
            // placeholder, scored below
            visibility: this.config.visibility,
            privacy_level: this.config.privacyLevel
          },
          task: {
            objective: `Agent execution in ${this.config.domain}`
          },
          steps,
          outcome: {
            result_summary: success ? "Completed" : "Failed",
            confidence: success ? 0.8 : 0.2
          }
        };
        void this.scoreAndContribute(trace).catch(() => {
        });
      }
      return result;
    });
  }
  async scoreAndContribute(trace) {
    const score = await evaluateValue(trace);
    trace.metadata.quality_score = score;
    if (score < this.config.valueThreshold) return;
    const url = this.config.registryUrl ?? "https://registry.knowledgepulse.dev";
    const headers = {
      "Content-Type": "application/json"
    };
    if (this.config.apiKey) {
      headers.Authorization = `Bearer ${this.config.apiKey}`;
    }
    await fetch(`${url}/v1/knowledge`, {
      method: "POST",
      headers,
      body: JSON.stringify(trace)
    });
  }
};

// src/retrieve.ts
var KPRetrieval = class {
  config;
  constructor(config = {}) {
    this.config = config;
  }
  async search(query, domain) {
    const params = new URLSearchParams({
      q: query,
      min_quality: String(this.config.minQuality ?? 0.8),
      limit: String(this.config.limit ?? 5)
    });
    if (domain) params.set("domain", domain);
    if (this.config.knowledgeTypes) {
      params.set("types", this.config.knowledgeTypes.join(","));
    }
    const url = this.config.registryUrl ?? "https://registry.knowledgepulse.dev";
    const headers = {};
    if (this.config.apiKey) {
      headers.Authorization = `Bearer ${this.config.apiKey}`;
    }
    const res = await fetch(`${url}/v1/knowledge?${params}`, { headers });
    const body = await res.json();
    return body.data;
  }
  async searchSkills(query, opts) {
    const params = new URLSearchParams({
      q: query,
      limit: String(opts?.limit ?? this.config.limit ?? 5)
    });
    if (opts?.domain) params.set("domain", opts.domain);
    if (opts?.tags?.length) params.set("tags", opts.tags.join(","));
    const url = this.config.registryUrl ?? "https://registry.knowledgepulse.dev";
    const headers = {};
    if (this.config.apiKey) {
      headers.Authorization = `Bearer ${this.config.apiKey}`;
    }
    const res = await fetch(`${url}/v1/skills?${params}`, { headers });
    const body = await res.json();
    return body.data;
  }
  /** Format a KnowledgeUnit as few-shot text for LLM prompt injection */
  toFewShot(unit) {
    switch (unit["@type"]) {
      case "ReasoningTrace":
        return formatReasoningTrace(unit);
      case "ToolCallPattern":
        return formatToolCallPattern(unit);
      case "ExpertSOP":
        return formatExpertSOP(unit);
    }
  }
};
function formatReasoningTrace(trace) {
  return trace.steps.map((s) => `[${s.type.toUpperCase()}] ${s.content ?? s.output_summary ?? ""}`).join("\n");
}
function formatToolCallPattern(pattern) {
  const lines = [`Pattern: ${pattern.name}`, `Description: ${pattern.description}`, "Steps:"];
  for (const seq of pattern.tool_sequence) {
    lines.push(`  ${seq.step} (${seq.execution}):`);
    for (const tool of seq.tools) {
      lines.push(`    - ${tool.name}${tool.query_template ? `: ${tool.query_template}` : ""}`);
    }
  }
  return lines.join("\n");
}
function formatExpertSOP(sop) {
  const lines = [`SOP: ${sop.name}`, `Domain: ${sop.domain}`, "Decision Tree:"];
  for (const node of sop.decision_tree) {
    lines.push(`  ${node.step}: ${node.instruction}`);
  }
  return lines.join("\n");
}

// src/errors.ts
var KPError = class extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
    this.name = "KPError";
  }
};
var ValidationError = class extends KPError {
  constructor(message, issues = []) {
    super(message, "VALIDATION_ERROR");
    this.issues = issues;
    this.name = "ValidationError";
  }
};
var SanitizationError = class extends KPError {
  constructor(message, field) {
    super(message, "SANITIZATION_ERROR");
    this.field = field;
    this.name = "SanitizationError";
  }
};
var AuthenticationError = class extends KPError {
  constructor(message = "Authentication required") {
    super(message, "AUTHENTICATION_ERROR");
    this.name = "AuthenticationError";
  }
};
var RateLimitError = class extends KPError {
  constructor(retryAfter) {
    super(`Rate limit exceeded. Retry after ${retryAfter}s`, "RATE_LIMIT_ERROR");
    this.retryAfter = retryAfter;
    this.name = "RateLimitError";
  }
};
var NotFoundError = class extends KPError {
  constructor(resource, id) {
    super(`${resource} not found: ${id}`, "NOT_FOUND");
    this.name = "NotFoundError";
  }
};

// src/utils/hash.ts
async function sha256(data) {
  const encoded = new TextEncoder().encode(data);
  const buffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// src/contribute.ts
async function contributeKnowledge(unit, config = {}) {
  const parsed = KnowledgeUnitSchema.safeParse(unit);
  if (!parsed.success) {
    throw new ValidationError(
      "Invalid KnowledgeUnit",
      parsed.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message
      }))
    );
  }
  const idempotencyKey = await sha256(JSON.stringify(unit));
  const url = config.registryUrl ?? "https://registry.knowledgepulse.dev";
  const headers = {
    "Content-Type": "application/json",
    "Idempotency-Key": idempotencyKey
  };
  if (config.apiKey) {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }
  const res = await fetch(`${url}/v1/knowledge`, {
    method: "POST",
    headers,
    body: JSON.stringify(unit)
  });
  if (!res.ok) {
    const body = await res.text();
    throw new KPContributeError(`Failed to contribute: ${res.status} ${body}`);
  }
  return await res.json();
}
async function contributeSkill(skillMdContent, visibility = "network", config = {}) {
  const idempotencyKey = await sha256(skillMdContent);
  const url = config.registryUrl ?? "https://registry.knowledgepulse.dev";
  const headers = {
    "Content-Type": "application/json",
    "Idempotency-Key": idempotencyKey
  };
  if (config.apiKey) {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }
  const res = await fetch(`${url}/v1/skills`, {
    method: "POST",
    headers,
    body: JSON.stringify({ skill_md_content: skillMdContent, visibility })
  });
  if (!res.ok) {
    const body = await res.text();
    throw new KPContributeError(`Failed to contribute skill: ${res.status} ${body}`);
  }
  return await res.json();
}
var KPContributeError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "KPContributeError";
  }
};

// src/skill-md.ts
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

// src/utils/sanitizer.ts
var INVISIBLE_CHARS = /[\u200B-\u200F\u2028-\u202F\u2060-\u2064\u2066-\u2069\uFEFF\uFFF9-\uFFFB]/g;
var HTML_TAG = /<\/?[a-zA-Z][^>]*>/g;
var HTML_COMMENT = /<!--[\s\S]*?-->/g;
var INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /you\s+are\s+now\s+/i,
  /system\s*:\s*/i,
  /\[INST\]/i,
  /<\|im_start\|>/i,
  /<<SYS>>/i
];
function sanitizeSkillMd(content) {
  const warnings = [];
  let sanitized = content;
  if (HTML_COMMENT.test(sanitized)) {
    warnings.push("Removed HTML comments");
    sanitized = sanitized.replace(HTML_COMMENT, "");
  }
  if (HTML_TAG.test(sanitized)) {
    warnings.push("Removed HTML tags");
    sanitized = sanitized.replace(HTML_TAG, "");
  }
  if (INVISIBLE_CHARS.test(sanitized)) {
    throw new SanitizationError(
      "Content contains invisible Unicode characters that may be used for steganography"
    );
  }
  sanitized = sanitized.normalize("NFC");
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(sanitized)) {
      throw new SanitizationError(
        `Content contains suspected prompt injection pattern: ${pattern.source}`
      );
    }
  }
  return { content: sanitized, warnings };
}

// src/skill-md.ts
var FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;
function parseSkillMd(content) {
  const match = content.match(FRONTMATTER_RE);
  if (!match) {
    throw new ValidationError("Invalid SKILL.md: missing YAML frontmatter delimiters (---)");
  }
  const yamlStr = match[1];
  const body = match[2];
  let yamlData;
  try {
    yamlData = parseYaml(yamlStr);
  } catch (e) {
    throw new ValidationError(
      `Invalid SKILL.md: YAML parse error: ${e instanceof Error ? e.message : String(e)}`
    );
  }
  const kpRaw = yamlData.kp;
  const { kp: _, ...frontmatterRaw } = yamlData;
  const fmResult = SkillMdFrontmatterSchema.safeParse(frontmatterRaw);
  if (!fmResult.success) {
    throw new ValidationError(
      "Invalid SKILL.md frontmatter",
      fmResult.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message
      }))
    );
  }
  let kp;
  if (kpRaw) {
    const kpResult = SkillMdKpExtensionSchema.safeParse(kpRaw);
    if (!kpResult.success) {
      throw new ValidationError(
        "Invalid SKILL.md kp extension",
        kpResult.error.issues.map((i) => ({
          path: `kp.${i.path.join(".")}`,
          message: i.message
        }))
      );
    }
    kp = kpResult.data;
  }
  return {
    frontmatter: fmResult.data,
    kp,
    body,
    raw: content
  };
}
function generateSkillMd(frontmatter, body, kp) {
  const yamlData = { ...frontmatter };
  if (kp) {
    yamlData.kp = kp;
  }
  return `---
${stringifyYaml(yamlData).trim()}
---

${body}`;
}
function validateSkillMd(content) {
  const errors = [];
  try {
    const { warnings } = sanitizeSkillMd(content);
    errors.push(...warnings.map((w) => `Warning: ${w}`));
  } catch (e) {
    return {
      valid: false,
      errors: [e instanceof Error ? e.message : String(e)]
    };
  }
  try {
    parseSkillMd(content);
  } catch (e) {
    if (e instanceof ValidationError) {
      return {
        valid: false,
        errors: [e.message, ...e.issues.map((i) => `  ${i.path}: ${i.message}`)]
      };
    }
    return {
      valid: false,
      errors: [e instanceof Error ? e.message : String(e)]
    };
  }
  return { valid: true, errors };
}

// src/migrations/types.ts
var MigrationRegistry = class {
  migrations = /* @__PURE__ */ new Map();
  register(entry) {
    const key = `${entry.from}->${entry.to}`;
    this.migrations.set(key, entry);
  }
  get(from, to) {
    return this.migrations.get(`${from}->${to}`);
  }
  /** Build a migration chain from `from` to `to` */
  chain(from, to) {
    const fns = [];
    let current = from;
    while (current !== to) {
      const direct = this.get(current, to);
      if (direct) {
        fns.push(direct.migrate);
        return fns;
      }
      let found = false;
      for (const entry of this.migrations.values()) {
        if (entry.from === current) {
          fns.push(entry.migrate);
          current = entry.to;
          found = true;
          break;
        }
      }
      if (!found) {
        throw new Error(`No migration path from ${current} to ${to}`);
      }
    }
    return fns;
  }
};

// src/migrations/v1-to-v2.ts
var migrateV1ToV2 = (input) => {
  return input;
};

// src/migrations/index.ts
var registry = new MigrationRegistry();
registry.register({ from: "v1", to: "v2", migrate: migrateV1ToV2 });
function migrate(unit, fromVersion, toVersion) {
  if (fromVersion === toVersion) return unit;
  const chain = registry.chain(fromVersion, toVersion);
  let result = unit;
  for (const fn of chain) {
    result = fn(result);
  }
  return result;
}

// src/reputation/eigentrust.ts
var DEFAULT_CONFIG = {
  alpha: 0.1,
  epsilon: 1e-3,
  maxIterations: 50,
  preTrustScore: 0.1
};
function computeEigenTrust(votes, configOverrides) {
  const config = { ...DEFAULT_CONFIG, ...configOverrides };
  const { alpha, epsilon, maxIterations } = config;
  if (votes.length === 0) {
    return { scores: /* @__PURE__ */ new Map(), iterations: 0, converged: true };
  }
  const agentSet = /* @__PURE__ */ new Set();
  for (const vote of votes) {
    agentSet.add(vote.validatorId);
    agentSet.add(vote.targetId);
  }
  const agents = Array.from(agentSet);
  const n = agents.length;
  const agentIndex = /* @__PURE__ */ new Map();
  for (let i = 0; i < n; i++) {
    agentIndex.set(agents[i], i);
  }
  const rawTrust = Array.from(
    { length: n },
    () => new Array(n).fill(0)
  );
  for (const vote of votes) {
    const from = agentIndex.get(vote.validatorId);
    const to = agentIndex.get(vote.targetId);
    if (from === to) continue;
    const row = rawTrust[from];
    row[to] = row[to] + (vote.valid ? 1 : -0.5);
  }
  const C = Array.from(
    { length: n },
    () => new Array(n).fill(0)
  );
  for (let i = 0; i < n; i++) {
    const rawRow = rawTrust[i];
    const cRow = C[i];
    for (let j = 0; j < n; j++) {
      rawRow[j] = Math.max(0, rawRow[j]);
    }
    let rowSum = 0;
    for (let j = 0; j < n; j++) {
      rowSum += rawRow[j];
    }
    if (rowSum > 0) {
      for (let j = 0; j < n; j++) {
        cRow[j] = rawRow[j] / rowSum;
      }
    } else {
      for (let j = 0; j < n; j++) {
        cRow[j] = 1 / n;
      }
    }
  }
  const p = new Array(n).fill(1 / n);
  const localTrust = new Array(n).fill(0);
  let localSum = 0;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const rawRow = rawTrust[i];
      localTrust[j] = localTrust[j] + rawRow[j];
    }
    localSum += localTrust[j];
  }
  let t;
  if (localSum > 0) {
    t = localTrust.map((v) => v / localSum);
  } else {
    t = new Array(n).fill(1 / n);
  }
  let iterations = 0;
  let converged = false;
  for (let iter = 0; iter < maxIterations; iter++) {
    iterations = iter + 1;
    const ct = new Array(n).fill(0);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const cRow = C[i];
        ct[j] = ct[j] + cRow[j] * t[i];
      }
    }
    const tNext = new Array(n);
    for (let j = 0; j < n; j++) {
      tNext[j] = (1 - alpha) * ct[j] + alpha * p[j];
    }
    let maxDiff = 0;
    for (let j = 0; j < n; j++) {
      maxDiff = Math.max(
        maxDiff,
        Math.abs(tNext[j] - t[j])
      );
    }
    t = tNext;
    if (maxDiff < epsilon) {
      converged = true;
      break;
    }
  }
  const scores = /* @__PURE__ */ new Map();
  for (let i = 0; i < n; i++) {
    scores.set(agents[i], t[i]);
  }
  return { scores, iterations, converged };
}

// src/reputation/verifiable-credential.ts
import * as ed25519 from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2.js";
ed25519.hashes.sha512 = (msg) => sha512(msg);
async function generateKeyPair() {
  const privateKey = ed25519.utils.randomSecretKey();
  const publicKey = await ed25519.getPublicKeyAsync(privateKey);
  return { publicKey, privateKey };
}
function createCredential(opts) {
  const credential = {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://knowledgepulse.dev/credentials/v1"
    ],
    type: ["VerifiableCredential", "KPReputationCredential"],
    issuer: opts.issuer,
    issuanceDate: (/* @__PURE__ */ new Date()).toISOString(),
    credentialSubject: {
      id: opts.agentId,
      score: opts.score,
      contributions: opts.contributions,
      validations: opts.validations
    }
  };
  if (opts.domain !== void 0) {
    credential.credentialSubject.domain = opts.domain;
  }
  return credential;
}
function canonicalize(vc) {
  const { proof, ...rest } = vc;
  return JSON.stringify(rest);
}
async function signCredential(vc, privateKey, verificationMethod) {
  const canonical = canonicalize(vc);
  const message = new TextEncoder().encode(canonical);
  const signature = await ed25519.signAsync(message, privateKey);
  const proofValue = bytesToBase64(signature);
  return {
    ...vc,
    proof: {
      type: "Ed25519Signature2020",
      created: (/* @__PURE__ */ new Date()).toISOString(),
      verificationMethod,
      proofPurpose: "assertionMethod",
      proofValue
    }
  };
}
async function verifyCredential(vc, publicKey) {
  if (!vc.proof) {
    return false;
  }
  const canonical = canonicalize(vc);
  const message = new TextEncoder().encode(canonical);
  const signature = base64ToBytes(vc.proof.proofValue);
  try {
    return await ed25519.verifyAsync(signature, message, publicKey);
  } catch {
    return false;
  }
}
function bytesToBase64(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
export {
  AuthenticationError,
  ExpertSOPSchema,
  KPCapture,
  KPError,
  KPRetrieval,
  KP_CONTEXT,
  KnowledgeUnitMetaSchema,
  KnowledgeUnitSchema,
  KnowledgeUnitTypeSchema,
  NotFoundError,
  PrivacyLevelSchema,
  RateLimitError,
  ReasoningTraceSchema,
  ReasoningTraceStepSchema,
  SanitizationError,
  SkillMdFrontmatterSchema,
  SkillMdKpExtensionSchema,
  ToolCallPatternSchema,
  ValidationError,
  VectorCache,
  VisibilitySchema,
  computeEigenTrust,
  contributeKnowledge,
  contributeSkill,
  createCredential,
  evaluateValue,
  generateKeyPair,
  generatePatternId,
  generateSkillId,
  generateSkillMd,
  generateSopId,
  generateTraceId,
  migrate,
  parseSkillMd,
  sanitizeSkillMd,
  sha256,
  signCredential,
  validateSkillMd,
  verifyCredential
};
//# sourceMappingURL=index.js.map