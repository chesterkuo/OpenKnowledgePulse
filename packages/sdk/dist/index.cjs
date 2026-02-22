"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  AuthenticationError: () => AuthenticationError,
  ExpertSOPSchema: () => ExpertSOPSchema,
  KPCapture: () => KPCapture,
  KPError: () => KPError,
  KPRetrieval: () => KPRetrieval,
  KP_CONTEXT: () => KP_CONTEXT,
  KnowledgeUnitMetaSchema: () => KnowledgeUnitMetaSchema,
  KnowledgeUnitSchema: () => KnowledgeUnitSchema,
  KnowledgeUnitTypeSchema: () => KnowledgeUnitTypeSchema,
  NotFoundError: () => NotFoundError,
  PrivacyLevelSchema: () => PrivacyLevelSchema,
  RateLimitError: () => RateLimitError,
  ReasoningTraceSchema: () => ReasoningTraceSchema,
  ReasoningTraceStepSchema: () => ReasoningTraceStepSchema,
  SanitizationError: () => SanitizationError,
  SkillMdFrontmatterSchema: () => SkillMdFrontmatterSchema,
  SkillMdKpExtensionSchema: () => SkillMdKpExtensionSchema,
  ToolCallPatternSchema: () => ToolCallPatternSchema,
  ValidationError: () => ValidationError,
  VectorCache: () => VectorCache,
  VisibilitySchema: () => VisibilitySchema,
  contributeKnowledge: () => contributeKnowledge,
  contributeSkill: () => contributeSkill,
  evaluateValue: () => evaluateValue,
  generatePatternId: () => generatePatternId,
  generateSkillId: () => generateSkillId,
  generateSkillMd: () => generateSkillMd,
  generateSopId: () => generateSopId,
  generateTraceId: () => generateTraceId,
  migrate: () => migrate,
  parseSkillMd: () => parseSkillMd,
  sanitizeSkillMd: () => sanitizeSkillMd,
  sha256: () => sha256,
  validateSkillMd: () => validateSkillMd
});
module.exports = __toCommonJS(index_exports);

// src/types/knowledge-unit.ts
var KP_CONTEXT = "https://knowledgepulse.dev/schema/v1";

// src/types/zod-schemas.ts
var import_zod = require("zod");
var KnowledgeUnitTypeSchema = import_zod.z.enum([
  "ReasoningTrace",
  "ToolCallPattern",
  "ExpertSOP"
]);
var PrivacyLevelSchema = import_zod.z.enum(["aggregated", "federated", "private"]);
var VisibilitySchema = import_zod.z.enum(["private", "org", "network"]);
var KnowledgeUnitMetaSchema = import_zod.z.object({
  created_at: import_zod.z.string().datetime(),
  agent_id: import_zod.z.string().optional(),
  framework: import_zod.z.string().optional(),
  task_domain: import_zod.z.string().min(1),
  success: import_zod.z.boolean(),
  quality_score: import_zod.z.number().min(0).max(1),
  visibility: VisibilitySchema,
  privacy_level: PrivacyLevelSchema,
  validated_by: import_zod.z.array(import_zod.z.string()).optional()
});
var ReasoningTraceStepSchema = import_zod.z.object({
  step_id: import_zod.z.number().int().nonnegative(),
  type: import_zod.z.enum(["thought", "tool_call", "observation", "error_recovery"]),
  content: import_zod.z.string().optional(),
  tool: import_zod.z.object({
    name: import_zod.z.string(),
    mcp_server: import_zod.z.string().optional()
  }).optional(),
  input: import_zod.z.record(import_zod.z.unknown()).optional(),
  output_summary: import_zod.z.string().optional(),
  latency_ms: import_zod.z.number().nonnegative().optional()
});
var ReasoningTraceSchema = import_zod.z.object({
  "@context": import_zod.z.literal(KP_CONTEXT),
  "@type": import_zod.z.literal("ReasoningTrace"),
  id: import_zod.z.string().startsWith("kp:trace:"),
  source_skill: import_zod.z.string().optional(),
  metadata: KnowledgeUnitMetaSchema,
  task: import_zod.z.object({
    objective: import_zod.z.string().min(1),
    input_schema: import_zod.z.record(import_zod.z.unknown()).optional()
  }),
  steps: import_zod.z.array(ReasoningTraceStepSchema).min(1),
  outcome: import_zod.z.object({
    result_summary: import_zod.z.string(),
    confidence: import_zod.z.number().min(0).max(1)
  }),
  knowledge_graph_delta: import_zod.z.object({
    entities: import_zod.z.array(import_zod.z.object({ name: import_zod.z.string(), type: import_zod.z.string() })),
    relationships: import_zod.z.array(import_zod.z.object({ fact: import_zod.z.string(), valid_from: import_zod.z.string() }))
  }).optional()
});
var ToolCallPatternSchema = import_zod.z.object({
  "@context": import_zod.z.literal(KP_CONTEXT),
  "@type": import_zod.z.literal("ToolCallPattern"),
  id: import_zod.z.string().startsWith("kp:pattern:"),
  name: import_zod.z.string().min(1),
  description: import_zod.z.string(),
  metadata: KnowledgeUnitMetaSchema,
  trigger_conditions: import_zod.z.object({
    task_types: import_zod.z.array(import_zod.z.string()).min(1),
    required_tools: import_zod.z.array(import_zod.z.string()).optional()
  }),
  tool_sequence: import_zod.z.array(
    import_zod.z.object({
      step: import_zod.z.string(),
      execution: import_zod.z.enum(["parallel", "sequential"]),
      tools: import_zod.z.array(
        import_zod.z.object({
          name: import_zod.z.string(),
          query_template: import_zod.z.string().optional(),
          input_template: import_zod.z.record(import_zod.z.unknown()).optional()
        })
      ),
      condition: import_zod.z.string().optional()
    })
  ).min(1),
  performance: import_zod.z.object({
    avg_ms: import_zod.z.number().nonnegative(),
    success_rate: import_zod.z.number().min(0).max(1),
    uses: import_zod.z.number().int().nonnegative()
  })
});
var ExpertSOPSchema = import_zod.z.object({
  "@context": import_zod.z.literal(KP_CONTEXT),
  "@type": import_zod.z.literal("ExpertSOP"),
  id: import_zod.z.string().startsWith("kp:sop:"),
  name: import_zod.z.string().min(1),
  domain: import_zod.z.string().min(1),
  metadata: KnowledgeUnitMetaSchema,
  source: import_zod.z.object({
    type: import_zod.z.literal("human_expert"),
    expert_id: import_zod.z.string(),
    credentials: import_zod.z.array(import_zod.z.string())
  }),
  decision_tree: import_zod.z.array(
    import_zod.z.object({
      step: import_zod.z.string(),
      instruction: import_zod.z.string(),
      criteria: import_zod.z.record(import_zod.z.string()).optional(),
      conditions: import_zod.z.record(
        import_zod.z.object({
          action: import_zod.z.string(),
          sla_min: import_zod.z.number().optional()
        })
      ).optional(),
      tool_suggestions: import_zod.z.array(import_zod.z.object({ name: import_zod.z.string(), when: import_zod.z.string() })).optional()
    })
  ).min(1),
  validation: import_zod.z.object({
    test_cases: import_zod.z.array(
      import_zod.z.object({
        input: import_zod.z.record(import_zod.z.unknown()),
        expected_output: import_zod.z.record(import_zod.z.unknown())
      })
    )
  }).optional()
});
var KnowledgeUnitSchema = import_zod.z.discriminatedUnion("@type", [
  ReasoningTraceSchema,
  ToolCallPatternSchema,
  ExpertSOPSchema
]);
var SkillMdFrontmatterSchema = import_zod.z.object({
  name: import_zod.z.string().min(1),
  description: import_zod.z.string().min(1),
  version: import_zod.z.string().optional(),
  author: import_zod.z.string().optional(),
  license: import_zod.z.string().optional(),
  tags: import_zod.z.array(import_zod.z.string()).optional(),
  "allowed-tools": import_zod.z.array(import_zod.z.string()).optional()
});
var SkillMdKpExtensionSchema = import_zod.z.object({
  knowledge_capture: import_zod.z.boolean().optional(),
  domain: import_zod.z.string().optional(),
  quality_threshold: import_zod.z.number().min(0).max(1).optional(),
  privacy_level: PrivacyLevelSchema.optional(),
  visibility: VisibilitySchema.optional(),
  reward_eligible: import_zod.z.boolean().optional()
});

// src/hnsw-cache.ts
var VectorCache = class {
  vectors = [];
  maxElements;
  dimensions;
  constructor(opts = {}) {
    this.maxElements = opts.maxElements ?? 1e3;
    this.dimensions = opts.dimensions ?? 384;
  }
  get size() {
    return this.vectors.length;
  }
  add(vector) {
    if (vector.length !== this.dimensions) {
      throw new Error(`Expected ${this.dimensions} dimensions, got ${vector.length}`);
    }
    const v = vector instanceof Float32Array ? vector : new Float32Array(vector);
    this.vectors.push(v);
    if (this.vectors.length > this.maxElements) {
      this.vectors.shift();
    }
  }
  maxCosineSimilarity(query) {
    if (this.vectors.length === 0) return 0;
    const q = query instanceof Float32Array ? query : new Float32Array(query);
    let maxSim = -1;
    for (const vec of this.vectors) {
      const sim = cosineSimilarity(q, vec);
      if (sim > maxSim) maxSim = sim;
    }
    return maxSim;
  }
  clear() {
    this.vectors = [];
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
    const text = task.objective + " " + steps.map((s) => s.content ?? "").join(" ");
    const embedding = await embedder(text);
    N = localCache.size > 0 ? 1 - localCache.maxCosineSimilarity(embedding) : 0.5;
    localCache.add(embedding);
  }
  const uniqueTools = new Set(steps.filter((s) => s.tool).map((s) => s.tool.name)).size;
  const D = Math.min(1, uniqueTools / Math.max(1, steps.length) * 3);
  const O = outcome.confidence * (trace.metadata.success ? 1 : 0.3);
  let score = C * 0.25 + N * 0.35 + D * 0.15 + O * 0.25;
  if (steps.length === 1 && steps[0].type === "thought") score = 0.1;
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
    const self = this;
    return (async (...args) => {
      if (!self.config.autoCapture) {
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
            task_domain: self.config.domain,
            success,
            quality_score: 0,
            // placeholder, scored below
            visibility: self.config.visibility,
            privacy_level: self.config.privacyLevel
          },
          task: {
            objective: `Agent execution in ${self.config.domain}`
          },
          steps,
          outcome: {
            result_summary: success ? "Completed" : "Failed",
            confidence: success ? 0.8 : 0.2
          }
        };
        void self.scoreAndContribute(trace).catch(() => {
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
      headers["Authorization"] = `Bearer ${this.config.apiKey}`;
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
      headers["Authorization"] = `Bearer ${this.config.apiKey}`;
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
      headers["Authorization"] = `Bearer ${this.config.apiKey}`;
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

// src/utils/hash.ts
async function sha256(data) {
  const encoded = new TextEncoder().encode(data);
  const buffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
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
    headers["Authorization"] = `Bearer ${config.apiKey}`;
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
    headers["Authorization"] = `Bearer ${config.apiKey}`;
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
var import_yaml = require("yaml");

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
    yamlData = (0, import_yaml.parse)(yamlStr);
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
${(0, import_yaml.stringify)(yamlData).trim()}
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
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
  contributeKnowledge,
  contributeSkill,
  evaluateValue,
  generatePatternId,
  generateSkillId,
  generateSkillMd,
  generateSopId,
  generateTraceId,
  migrate,
  parseSkillMd,
  sanitizeSkillMd,
  sha256,
  validateSkillMd
});
//# sourceMappingURL=index.cjs.map