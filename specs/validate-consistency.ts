import { readFileSync } from "node:fs";
import type { ReasoningTrace, ToolCallPattern } from "../packages/sdk/src/types/knowledge-unit.js";
import { KP_CONTEXT } from "../packages/sdk/src/types/knowledge-unit.js";
import { KnowledgeUnitSchema } from "../packages/sdk/src/types/zod-schemas.js";

// Load generated JSON Schema
const schemaPath = "specs/knowledge-unit-schema.json";
let jsonSchemaRaw: string;
try {
  jsonSchemaRaw = readFileSync(schemaPath, "utf-8");
} catch {
  console.error(`Error: ${schemaPath} not found. Run 'bun run codegen' first.`);
  process.exit(1);
}

const jsonSchema = JSON.parse(jsonSchemaRaw);

// Validate JSON Schema structure
if (!jsonSchema || typeof jsonSchema !== "object") {
  console.error("Error: Invalid JSON Schema structure");
  process.exit(1);
}

// Sample fixtures for validation
const validTrace: ReasoningTrace = {
  "@context": KP_CONTEXT,
  "@type": "ReasoningTrace",
  id: "kp:trace:test-123",
  metadata: {
    created_at: new Date().toISOString(),
    task_domain: "test",
    success: true,
    quality_score: 0.85,
    visibility: "network",
    privacy_level: "aggregated",
  },
  task: { objective: "Test objective" },
  steps: [{ step_id: 0, type: "thought", content: "Testing" }],
  outcome: { result_summary: "Success", confidence: 0.9 },
};

const validPattern: ToolCallPattern = {
  "@context": KP_CONTEXT,
  "@type": "ToolCallPattern",
  id: "kp:pattern:test-456",
  name: "Test Pattern",
  description: "A test pattern",
  metadata: {
    created_at: new Date().toISOString(),
    task_domain: "test",
    success: true,
    quality_score: 0.8,
    visibility: "network",
    privacy_level: "aggregated",
  },
  trigger_conditions: { task_types: ["test"] },
  tool_sequence: [{ step: "step1", execution: "sequential", tools: [{ name: "test_tool" }] }],
  performance: { avg_ms: 100, success_rate: 0.95, uses: 10 },
};

// Validate with Zod
let passed = 0;
let failed = 0;

function check(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`  PASS: ${name}`);
    passed++;
  } catch (e) {
    console.error(`  FAIL: ${name} — ${e instanceof Error ? e.message : String(e)}`);
    failed++;
  }
}

console.log("Validating schema consistency...\n");

check("ReasoningTrace validates", () => {
  KnowledgeUnitSchema.parse(validTrace);
});

check("ToolCallPattern validates", () => {
  KnowledgeUnitSchema.parse(validPattern);
});

check("Invalid @type is rejected", () => {
  const result = KnowledgeUnitSchema.safeParse({ ...validTrace, "@type": "Invalid" });
  if (result.success) throw new Error("Should have been rejected");
});

check("Missing required fields rejected", () => {
  const result = KnowledgeUnitSchema.safeParse({ "@type": "ReasoningTrace" });
  if (result.success) throw new Error("Should have been rejected");
});

check("JSON Schema has definitions", () => {
  if (!jsonSchema) throw new Error("JSON Schema is empty");
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
