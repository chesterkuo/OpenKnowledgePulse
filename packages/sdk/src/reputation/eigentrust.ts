import type { EigenTrustConfig, EigenTrustResult, ValidationVote } from "./types.js";

const DEFAULT_CONFIG: EigenTrustConfig = {
  alpha: 0.1,
  epsilon: 0.001,
  maxIterations: 50,
  preTrustScore: 0.1,
};

/**
 * Compute EigenTrust reputation scores from validation votes.
 *
 * Algorithm:
 * 1. Collect unique agents from votes
 * 2. Build raw trust matrix: positive vote = +1, negative vote = -0.5, ignore self-votes
 * 3. Clamp negatives to 0, row-normalize
 * 4. Pre-trust vector p = uniform(1/n)
 * 5. Iterate: T(i+1) = (1-alpha) * C^T * T(i) + alpha * p
 * 6. Converge when max(|T(i+1) - T(i)|) < epsilon
 */
export function computeEigenTrust(
  votes: ValidationVote[],
  configOverrides?: Partial<EigenTrustConfig>,
): EigenTrustResult {
  const config: EigenTrustConfig = { ...DEFAULT_CONFIG, ...configOverrides };
  const { alpha, epsilon, maxIterations } = config;

  // Empty votes → empty result
  if (votes.length === 0) {
    return { scores: new Map(), iterations: 0, converged: true };
  }

  // Step 1: Collect unique agents
  const agentSet = new Set<string>();
  for (const vote of votes) {
    agentSet.add(vote.validatorId);
    agentSet.add(vote.targetId);
  }
  const agents = Array.from(agentSet);
  const n = agents.length;
  const agentIndex = new Map<string, number>();
  for (let i = 0; i < n; i++) {
    agentIndex.set(agents[i], i);
  }

  // Step 2: Build raw trust matrix
  // rawTrust[i][j] = aggregated trust from agent i toward agent j
  const rawTrust: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  for (const vote of votes) {
    const from = agentIndex.get(vote.validatorId)!;
    const to = agentIndex.get(vote.targetId)!;

    // Ignore self-votes
    if (from === to) continue;

    rawTrust[from][to] += vote.valid ? 1 : -0.5;
  }

  // Step 3: Clamp negatives to 0 and row-normalize
  const C: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    // Clamp negatives
    for (let j = 0; j < n; j++) {
      rawTrust[i][j] = Math.max(0, rawTrust[i][j]);
    }

    // Row sum
    let rowSum = 0;
    for (let j = 0; j < n; j++) {
      rowSum += rawTrust[i][j];
    }

    // Normalize row (if rowSum > 0)
    if (rowSum > 0) {
      for (let j = 0; j < n; j++) {
        C[i][j] = rawTrust[i][j] / rowSum;
      }
    } else {
      // If an agent has no outgoing trust, distribute uniformly
      for (let j = 0; j < n; j++) {
        C[i][j] = 1 / n;
      }
    }
  }

  // Step 4: Pre-trust vector p = uniform(1/n)
  const p = new Array(n).fill(1 / n);

  // Step 5: Iterate T(i+1) = (1-alpha) * C^T * T(i) + alpha * p
  // Initialize t from local trust (column sums of raw trust matrix after clamping)
  // This gives agents who received more positive votes a head start,
  // which is critical for sybil resistance and convergence behavior.
  const localTrust = new Array(n).fill(0);
  let localSum = 0;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      localTrust[j] += rawTrust[i][j];
    }
    localSum += localTrust[j];
  }
  let t: number[];
  if (localSum > 0) {
    t = localTrust.map((v: number) => v / localSum);
  } else {
    t = new Array(n).fill(1 / n);
  }
  let iterations = 0;
  let converged = false;

  for (let iter = 0; iter < maxIterations; iter++) {
    iterations = iter + 1;

    // Compute C^T * t
    const ct = new Array(n).fill(0);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        ct[j] += C[i][j] * t[i];
      }
    }

    // T(i+1) = (1-alpha) * C^T * T(i) + alpha * p
    const tNext = new Array(n);
    for (let j = 0; j < n; j++) {
      tNext[j] = (1 - alpha) * ct[j] + alpha * p[j];
    }

    // Check convergence: max(|T(i+1) - T(i)|) < epsilon
    let maxDiff = 0;
    for (let j = 0; j < n; j++) {
      maxDiff = Math.max(maxDiff, Math.abs(tNext[j] - t[j]));
    }

    t = tNext;

    if (maxDiff < epsilon) {
      converged = true;
      break;
    }
  }

  // Build result map
  const scores = new Map<string, number>();
  for (let i = 0; i < n; i++) {
    scores.set(agents[i], t[i]);
  }

  return { scores, iterations, converged };
}
