import { beforeEach, describe, expect, test } from "bun:test";
import { _getLocalCache, evaluateValue } from "./scoring.js";
import type { ReasoningTrace, ReasoningTraceStep } from "./types/knowledge-unit.js";
import { KP_CONTEXT } from "./types/knowledge-unit.js";

// ── Helpers ────────────────────────────────────────────────

function makeTrace(
  overrides: {
    steps?: ReasoningTraceStep[];
    success?: boolean;
    confidence?: number;
    objective?: string;
    task_domain?: string;
  } = {},
): ReasoningTrace {
  return {
    "@context": KP_CONTEXT,
    "@type": "ReasoningTrace",
    id: "kp:trace:test-0001",
    metadata: {
      created_at: "2025-06-15T10:00:00.000Z",
      task_domain: overrides.task_domain ?? "testing",
      success: overrides.success ?? true,
      quality_score: 0,
      visibility: "network",
      privacy_level: "aggregated",
    },
    task: { objective: overrides.objective ?? "Test objective" },
    steps: overrides.steps ?? [
      { step_id: 0, type: "thought", content: "Thinking about the problem" },
      { step_id: 1, type: "tool_call", tool: { name: "search" }, content: "Searching" },
      { step_id: 2, type: "observation", content: "Found result" },
    ],
    outcome: {
      result_summary: "Completed",
      confidence: overrides.confidence ?? 0.9,
    },
  };
}

// ── Tests ──────────────────────────────────────────────────

describe("evaluateValue", () => {
  beforeEach(() => {
    // Clear the local embedding cache between tests so novelty doesn't leak
    _getLocalCache().clear();
  });

  test("returns a number between 0 and 1 for a typical trace", async () => {
    const score = await evaluateValue(makeTrace());
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  // ── Rule override: single thought step = 0.1 ───────────

  test("single thought step returns exactly 0.1", async () => {
    const trace = makeTrace({
      steps: [{ step_id: 0, type: "thought", content: "Just a thought" }],
    });
    const score = await evaluateValue(trace);
    expect(score).toBeCloseTo(0.1, 5);
  });

  // ── Rule override: error recovery bonus ─────────────────

  test("error recovery bonus (+0.1) when >2 error_recovery steps and success", async () => {
    const steps: ReasoningTraceStep[] = [
      { step_id: 0, type: "thought", content: "Start" },
      { step_id: 1, type: "error_recovery", content: "Recovery 1" },
      { step_id: 2, type: "error_recovery", content: "Recovery 2" },
      { step_id: 3, type: "error_recovery", content: "Recovery 3" },
      { step_id: 4, type: "tool_call", tool: { name: "fix" }, content: "Fixing" },
      { step_id: 5, type: "tool_call", tool: { name: "verify" }, content: "Verifying" },
      { step_id: 6, type: "observation", content: "Done" },
    ];

    const traceWithRecovery = makeTrace({ steps, success: true, confidence: 0.85 });
    const scoreWithRecovery = await evaluateValue(traceWithRecovery);

    // Compare with a similar trace that has only 2 error_recovery steps (no bonus)
    _getLocalCache().clear();
    const stepsNoBonusTrigger: ReasoningTraceStep[] = [
      { step_id: 0, type: "thought", content: "Start" },
      { step_id: 1, type: "error_recovery", content: "Recovery 1" },
      { step_id: 2, type: "error_recovery", content: "Recovery 2" },
      { step_id: 3, type: "tool_call", tool: { name: "fix" }, content: "Fixing" },
      { step_id: 4, type: "tool_call", tool: { name: "verify" }, content: "Verifying" },
      { step_id: 5, type: "observation", content: "Done" },
    ];
    const traceNoBonus = makeTrace({ steps: stepsNoBonusTrigger, success: true, confidence: 0.85 });
    const scoreNoBonus = await evaluateValue(traceNoBonus);

    // The recovery bonus trace should score higher
    expect(scoreWithRecovery).toBeGreaterThan(scoreNoBonus);
  });

  test("error recovery bonus does not apply when success is false", async () => {
    const steps: ReasoningTraceStep[] = [
      { step_id: 0, type: "thought", content: "Start" },
      { step_id: 1, type: "error_recovery", content: "Recovery 1" },
      { step_id: 2, type: "error_recovery", content: "Recovery 2" },
      { step_id: 3, type: "error_recovery", content: "Recovery 3" },
      { step_id: 4, type: "tool_call", tool: { name: "fix" }, content: "Fixing" },
      { step_id: 5, type: "tool_call", tool: { name: "verify" }, content: "Verifying" },
      { step_id: 6, type: "observation", content: "Done" },
    ];

    // success = false -> O is multiplied by 0.3, AND error bonus doesn't fire
    // because: errorRecovery > 2 && trace.metadata.success => the bonus is conditional on success
    const traceFailedRecovery = makeTrace({ steps, success: false, confidence: 0.85 });
    const scoreFailed = await evaluateValue(traceFailedRecovery);

    _getLocalCache().clear();
    const traceSuccessRecovery = makeTrace({ steps, success: true, confidence: 0.85 });
    const scoreSuccess = await evaluateValue(traceSuccessRecovery);

    // Success version gets the bonus, failed does not
    expect(scoreSuccess).toBeGreaterThan(scoreFailed);
  });

  // ── Rule override: zero tool diversity penalty ──────────

  test("single-tool penalty reduces score by 0.1", async () => {
    // Steps with one unique tool (tool diversity penalty applies)
    const stepsOneTool: ReasoningTraceStep[] = [
      { step_id: 0, type: "thought", content: "Thinking" },
      { step_id: 1, type: "tool_call", tool: { name: "search" }, content: "Searching" },
      { step_id: 2, type: "tool_call", tool: { name: "search" }, content: "Searching more" },
      { step_id: 3, type: "observation", content: "Found" },
    ];

    const traceOneTool = makeTrace({ steps: stepsOneTool });
    const scoreOneTool = await evaluateValue(traceOneTool);

    // Steps with two unique tools (no penalty)
    _getLocalCache().clear();
    const stepsTwoTools: ReasoningTraceStep[] = [
      { step_id: 0, type: "thought", content: "Thinking" },
      { step_id: 1, type: "tool_call", tool: { name: "search" }, content: "Searching" },
      { step_id: 2, type: "tool_call", tool: { name: "summarize" }, content: "Summarizing" },
      { step_id: 3, type: "observation", content: "Found" },
    ];

    const traceTwoTools = makeTrace({ steps: stepsTwoTools });
    const scoreTwoTools = await evaluateValue(traceTwoTools);

    // Two-tool version should not have penalty, so should be higher
    expect(scoreTwoTools).toBeGreaterThan(scoreOneTool);
  });

  test("no tool diversity penalty when no tools are used", async () => {
    // No tool calls at all => the condition `steps.some(s => s.tool)` is false
    const stepsNoTools: ReasoningTraceStep[] = [
      { step_id: 0, type: "thought", content: "Thinking deeply" },
      { step_id: 1, type: "observation", content: "Insight gained" },
      { step_id: 2, type: "thought", content: "More thought" },
    ];

    const trace = makeTrace({ steps: stepsNoTools });
    const score = await evaluateValue(trace);
    // Should not have the -0.1 penalty since there are no tool calls
    expect(score).toBeGreaterThan(0);
  });

  // ── Dimension: Complexity (C) ───────────────────────────

  test("more unique step types increase the complexity dimension", async () => {
    // 1 type
    const stepsOneType: ReasoningTraceStep[] = [
      { step_id: 0, type: "thought", content: "A" },
      { step_id: 1, type: "thought", content: "B" },
    ];
    const score1 = await evaluateValue(makeTrace({ steps: stepsOneType }));

    // 4 types (max diversity)
    _getLocalCache().clear();
    const stepsFourTypes: ReasoningTraceStep[] = [
      { step_id: 0, type: "thought", content: "Thinking" },
      { step_id: 1, type: "tool_call", tool: { name: "t1" }, content: "Calling" },
      { step_id: 2, type: "observation", content: "Observing" },
      { step_id: 3, type: "error_recovery", content: "Recovering" },
      { step_id: 4, type: "tool_call", tool: { name: "t2" }, content: "Calling again" },
    ];
    const score4 = await evaluateValue(makeTrace({ steps: stepsFourTypes }));

    // Note: score1 is a single thought step override = 0.1
    // But with 2 thought steps it should not trigger that override
    // Actually 2 thought steps: steps.length === 1 check is false. Good.
    expect(score4).toBeGreaterThan(score1);
  });

  // ── Dimension: Outcome Confidence (O) ───────────────────

  test("higher confidence yields a higher score", async () => {
    const lowConf = await evaluateValue(makeTrace({ confidence: 0.2 }));
    _getLocalCache().clear();
    const highConf = await evaluateValue(makeTrace({ confidence: 0.95 }));
    expect(highConf).toBeGreaterThan(lowConf);
  });

  test("failed trace reduces the outcome dimension by 70%", async () => {
    const successTrace = await evaluateValue(makeTrace({ success: true, confidence: 0.9 }));
    _getLocalCache().clear();
    const failedTrace = await evaluateValue(makeTrace({ success: false, confidence: 0.9 }));
    expect(successTrace).toBeGreaterThan(failedTrace);
  });

  // ── Dimension: Novelty (N) — no embedder ────────────────

  test("without embedder, novelty defaults to 0.5", async () => {
    // The embedder import will fail in test env, so N = 0.5
    // We can verify by computing expected score manually
    const steps: ReasoningTraceStep[] = [
      { step_id: 0, type: "thought", content: "Thinking" },
      { step_id: 1, type: "tool_call", tool: { name: "search" }, content: "Searching" },
      { step_id: 2, type: "observation", content: "Found" },
    ];
    const trace = makeTrace({ steps, confidence: 1.0, success: true });
    const score = await evaluateValue(trace);

    // C = min(1.0, (3/4)*0.5 + 0*0.3 + (3/20)*0.2) = min(1.0, 0.375 + 0 + 0.03) = 0.405
    // N = 0.5 (no embedder)
    // D = min(1.0, (1 / max(1,3)) * 3) = min(1.0, 1) = 1.0
    // O = 1.0 * 1.0 = 1.0
    // composite = 0.405*0.25 + 0.5*0.35 + 1.0*0.15 + 1.0*0.25 = 0.10125 + 0.175 + 0.15 + 0.25 = 0.67625
    // Then tool penalty: uniqueTools=1, steps.some(s=>s.tool) true => score - 0.1 = 0.57625
    const expected = 0.57625;
    expect(score).toBeCloseTo(expected, 3);
  });

  // ── Score is clamped between 0 and 1 ────────────────────

  test("score never exceeds 1.0", async () => {
    // Max out all dimensions
    const steps: ReasoningTraceStep[] = Array.from({ length: 20 }, (_, i) => ({
      step_id: i,
      type: (["thought", "tool_call", "observation", "error_recovery"] as const)[i % 4],
      content: `Step ${i}`,
      ...(i % 4 === 1 ? { tool: { name: `tool_${i}` } } : {}),
    }));

    const trace = makeTrace({ steps, confidence: 1.0, success: true });
    const score = await evaluateValue(trace);
    expect(score).toBeLessThanOrEqual(1.0);
  });

  test("score never goes below 0.0", async () => {
    // Minimal trace with low confidence and failure
    const steps: ReasoningTraceStep[] = [
      { step_id: 0, type: "tool_call", tool: { name: "t" }, content: "Fail" },
    ];
    const trace = makeTrace({ steps, confidence: 0, success: false });
    const score = await evaluateValue(trace);
    expect(score).toBeGreaterThanOrEqual(0.0);
  });

  // ── Domain Weight Profiles ────────────────────────────────

  test("finance domain weights outcome confidence higher", async () => {
    // Finance domain puts 0.45 on outcome confidence vs default 0.25
    // A high-confidence trace should score higher under finance weights
    const steps: ReasoningTraceStep[] = [
      { step_id: 0, type: "thought", content: "Analyzing financials" },
      { step_id: 1, type: "tool_call", tool: { name: "calc" }, content: "Calculating" },
      { step_id: 2, type: "tool_call", tool: { name: "verify" }, content: "Verifying" },
      { step_id: 3, type: "observation", content: "Result confirmed" },
    ];

    const financeScore = await evaluateValue(
      makeTrace({ steps, confidence: 0.95, success: true, task_domain: "finance" }),
    );

    _getLocalCache().clear();

    const generalScore = await evaluateValue(
      makeTrace({ steps, confidence: 0.95, success: true, task_domain: "general" }),
    );

    // Finance weights outcome confidence at 0.45 vs default 0.25 —
    // with high confidence the finance score should be higher
    expect(financeScore).toBeGreaterThan(generalScore);
  });

  test("code domain weights tool diversity higher", async () => {
    // Code domain puts 0.30 on tool diversity vs default 0.15
    // A trace with diverse tools should score higher under code weights
    const steps: ReasoningTraceStep[] = [
      { step_id: 0, type: "thought", content: "Planning implementation" },
      { step_id: 1, type: "tool_call", tool: { name: "linter" }, content: "Linting" },
      { step_id: 2, type: "tool_call", tool: { name: "compiler" }, content: "Compiling" },
      { step_id: 3, type: "tool_call", tool: { name: "test_runner" }, content: "Testing" },
      { step_id: 4, type: "tool_call", tool: { name: "formatter" }, content: "Formatting" },
      { step_id: 5, type: "observation", content: "All checks passed" },
    ];

    const codeScore = await evaluateValue(
      makeTrace({ steps, confidence: 0.5, success: true, task_domain: "code" }),
    );

    _getLocalCache().clear();

    const generalScore = await evaluateValue(
      makeTrace({ steps, confidence: 0.5, success: true, task_domain: "general" }),
    );

    // Code weights tool diversity at 0.30 vs default 0.15 —
    // with diverse tools the code score should be higher
    expect(codeScore).toBeGreaterThan(generalScore);
  });

  test("unknown domain falls back to default weights", async () => {
    const steps: ReasoningTraceStep[] = [
      { step_id: 0, type: "thought", content: "Thinking" },
      { step_id: 1, type: "tool_call", tool: { name: "search" }, content: "Searching" },
      { step_id: 2, type: "observation", content: "Found" },
    ];

    const trace = makeTrace({ steps, confidence: 0.8, success: true, task_domain: "underwater_basket_weaving" });
    const score = await evaluateValue(trace);

    // Unknown domain should still produce a valid 0-1 score
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});
