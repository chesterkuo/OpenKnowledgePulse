import { describe, expect, test } from "bun:test";
import { computeEigenTrust } from "./eigentrust.js";
import type { ValidationVote } from "./types.js";

// ── Helpers ────────────────────────────────────────────────

function makeVote(
  validatorId: string,
  targetId: string,
  valid: boolean,
  unitId = "kp:unit:test-001",
): ValidationVote {
  return {
    validatorId,
    targetId,
    unitId,
    valid,
    timestamp: new Date().toISOString(),
  };
}

// ── Tests ──────────────────────────────────────────────────

describe("computeEigenTrust", () => {
  test("returns empty scores for no votes", () => {
    const result = computeEigenTrust([]);
    expect(result.scores.size).toBe(0);
    expect(result.iterations).toBe(0);
    expect(result.converged).toBe(true);
  });

  test("simple two-agent mutual trust converges with similar scores", () => {
    const votes: ValidationVote[] = [
      makeVote("alice", "bob", true),
      makeVote("bob", "alice", true),
    ];

    const result = computeEigenTrust(votes);

    expect(result.converged).toBe(true);

    const aliceScore = result.scores.get("alice")!;
    const bobScore = result.scores.get("bob")!;

    // With mutual trust, scores should be roughly equal
    expect(Math.abs(aliceScore - bobScore)).toBeLessThan(0.05);

    // Both should be positive
    expect(aliceScore).toBeGreaterThan(0);
    expect(bobScore).toBeGreaterThan(0);
  });

  test("sybil nodes converge to lower trust than well-connected nodes", () => {
    // Well-connected cluster: alice, bob, carol, dave all trust each other
    const votes: ValidationVote[] = [
      makeVote("alice", "bob", true),
      makeVote("alice", "carol", true),
      makeVote("alice", "dave", true),
      makeVote("bob", "alice", true),
      makeVote("bob", "carol", true),
      makeVote("bob", "dave", true),
      makeVote("carol", "alice", true),
      makeVote("carol", "bob", true),
      makeVote("carol", "dave", true),
      makeVote("dave", "alice", true),
      makeVote("dave", "bob", true),
      makeVote("dave", "carol", true),
      // Sybil cluster: sybil1 and sybil2 only trust each other
      makeVote("sybil1", "sybil2", true),
      makeVote("sybil2", "sybil1", true),
    ];

    const result = computeEigenTrust(votes);

    expect(result.converged).toBe(true);

    const aliceScore = result.scores.get("alice")!;
    const sybil1Score = result.scores.get("sybil1")!;

    // Well-connected agents should have higher trust than isolated sybil nodes
    expect(aliceScore).toBeGreaterThan(sybil1Score);
  });

  test("negative votes reduce trust scores", () => {
    // Baseline: alice and carol trust bob and each other
    const positiveVotes: ValidationVote[] = [
      makeVote("alice", "bob", true),
      makeVote("alice", "carol", true),
      makeVote("carol", "bob", true),
      makeVote("carol", "alice", true),
      makeVote("bob", "alice", true),
      makeVote("bob", "carol", true),
    ];

    const positiveResult = computeEigenTrust(positiveVotes);
    const bobPositive = positiveResult.scores.get("bob")!;

    // Now replace bob trust with negative votes from alice and carol
    const negativeVotes: ValidationVote[] = [
      makeVote("alice", "bob", false),
      makeVote("alice", "carol", true),
      makeVote("carol", "bob", false),
      makeVote("carol", "alice", true),
      makeVote("bob", "alice", true),
      makeVote("bob", "carol", true),
    ];

    const negativeResult = computeEigenTrust(negativeVotes);
    const bobNegative = negativeResult.scores.get("bob")!;

    // Bob's score should be lower when others vote negatively
    expect(bobNegative).toBeLessThan(bobPositive);
  });

  test("respects maxIterations limit", () => {
    // Use an asymmetric graph where agents receive different numbers of votes
    // so local trust initialization is non-uniform and convergence takes multiple iterations
    const votes: ValidationVote[] = [
      makeVote("alice", "bob", true),
      makeVote("alice", "carol", true),
      makeVote("bob", "carol", true),
      makeVote("carol", "alice", true),
      makeVote("dave", "alice", true),
      makeVote("dave", "bob", true),
    ];

    const result = computeEigenTrust(votes, {
      maxIterations: 3,
      epsilon: 1e-15, // Essentially unreachable convergence threshold
    });

    expect(result.iterations).toBeLessThanOrEqual(3);
    expect(result.converged).toBe(false);
    // Scores should still be computed even without convergence
    expect(result.scores.size).toBe(4);
  });

  test("all scores sum to approximately 1.0", () => {
    const votes: ValidationVote[] = [
      makeVote("alice", "bob", true),
      makeVote("bob", "carol", true),
      makeVote("carol", "alice", true),
      makeVote("alice", "carol", true),
      makeVote("bob", "alice", true),
      makeVote("carol", "bob", true),
    ];

    const result = computeEigenTrust(votes);

    let sum = 0;
    for (const score of result.scores.values()) {
      sum += score;
    }

    // Scores should sum to approximately 1.0
    expect(Math.abs(sum - 1.0)).toBeLessThan(0.01);
  });
});
