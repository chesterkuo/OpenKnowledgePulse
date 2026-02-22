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
    agentIndex.set(agents[i] as string, i);
  }

  // Step 2: Build raw trust matrix
  // rawTrust[i][j] = aggregated trust from agent i toward agent j
  const rawTrust: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));

  for (const vote of votes) {
    const from = agentIndex.get(vote.validatorId)!;
    const to = agentIndex.get(vote.targetId)!;

    // Ignore self-votes
    if (from === to) continue;

    const row = rawTrust[from] as number[];
    row[to] = (row[to] as number) + (vote.valid ? 1 : -0.5);
  }

  // Step 3: Clamp negatives to 0 and row-normalize
  const C: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));

  for (let i = 0; i < n; i++) {
    const rawRow = rawTrust[i] as number[];
    const cRow = C[i] as number[];

    // Clamp negatives
    for (let j = 0; j < n; j++) {
      rawRow[j] = Math.max(0, rawRow[j] as number);
    }

    // Row sum
    let rowSum = 0;
    for (let j = 0; j < n; j++) {
      rowSum += rawRow[j] as number;
    }

    // Normalize row (if rowSum > 0)
    if (rowSum > 0) {
      for (let j = 0; j < n; j++) {
        cRow[j] = (rawRow[j] as number) / rowSum;
      }
    } else {
      // If an agent has no outgoing trust, distribute uniformly
      for (let j = 0; j < n; j++) {
        cRow[j] = 1 / n;
      }
    }
  }

  // Step 4: Pre-trust vector p = uniform(1/n)
  const p = new Array<number>(n).fill(1 / n);

  // Step 5: Iterate T(i+1) = (1-alpha) * C^T * T(i) + alpha * p
  // Initialize t from local trust (column sums of raw trust matrix after clamping)
  // This gives agents who received more positive votes a head start,
  // which is critical for sybil resistance and convergence behavior.
  const localTrust = new Array<number>(n).fill(0);
  let localSum = 0;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const rawRow = rawTrust[i] as number[];
      localTrust[j] = (localTrust[j] as number) + (rawRow[j] as number);
    }
    localSum += localTrust[j] as number;
  }
  let t: number[];
  if (localSum > 0) {
    t = localTrust.map((v: number) => v / localSum);
  } else {
    t = new Array<number>(n).fill(1 / n);
  }
  let iterations = 0;
  let converged = false;

  for (let iter = 0; iter < maxIterations; iter++) {
    iterations = iter + 1;

    // Compute C^T * t
    const ct = new Array<number>(n).fill(0);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const cRow = C[i] as number[];
        ct[j] = (ct[j] as number) + (cRow[j] as number) * (t[i] as number);
      }
    }

    // T(i+1) = (1-alpha) * C^T * T(i) + alpha * p
    const tNext = new Array<number>(n);
    for (let j = 0; j < n; j++) {
      tNext[j] = (1 - alpha) * (ct[j] as number) + alpha * (p[j] as number);
    }

    // Check convergence: max(|T(i+1) - T(i)|) < epsilon
    let maxDiff = 0;
    for (let j = 0; j < n; j++) {
      maxDiff = Math.max(maxDiff, Math.abs((tNext[j] as number) - (t[j] as number)));
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
    scores.set(agents[i] as string, t[i] as number);
  }

  return { scores, iterations, converged };
}
