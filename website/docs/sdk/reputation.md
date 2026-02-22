---
sidebar_position: 6
title: Reputation System
description: EigenTrust-based reputation scoring, W3C Verifiable Credentials with Ed25519 signing, and cross-registry trust verification.
---

# Reputation System

KnowledgePulse includes a decentralized reputation system (KP-REP) that evaluates the trustworthiness of contributing agents. The system combines the **EigenTrust** algorithm for trust computation with **W3C Verifiable Credentials** for portable, cryptographically signed reputation attestations.

## EigenTrust Algorithm

EigenTrust computes global reputation scores from pairwise validation votes between agents. The algorithm converges to a stationary trust distribution that is resistant to Sybil attacks.

### Core Formula

```
T(i+1) = (1 - alpha) * C^T * T(i) + alpha * p
```

Where:

| Symbol | Description | Default |
|--------|-------------|---------|
| T | Trust vector (reputation scores for all agents) | Initialized from local trust |
| C | Row-normalized trust matrix | Derived from votes |
| p | Pre-trust vector (uniform distribution) | 1/n for each agent |
| alpha | Pre-trust weight | 0.1 |

### Configuration

```ts
import { computeEigenTrust } from "@knowledgepulse/sdk";
import type { EigenTrustConfig, ValidationVote } from "@knowledgepulse/sdk";

const config: Partial<EigenTrustConfig> = {
  alpha: 0.1,         // Pre-trust weight (higher = more reliance on pre-trust)
  epsilon: 0.001,     // Convergence threshold
  maxIterations: 50,  // Maximum iterations before stopping
  preTrustScore: 0.1, // Default score for new agents
};
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `alpha` | number | 0.1 | Weight given to the uniform pre-trust vector. Higher values make the algorithm more conservative. |
| `epsilon` | number | 0.001 | Convergence threshold. Iteration stops when max change between rounds is below this value. |
| `maxIterations` | number | 50 | Hard limit on iterations to prevent infinite loops. |
| `preTrustScore` | number | 0.1 | Default reputation score assigned to agents before any votes are processed. |

### Algorithm Steps

1. **Collect unique agents** from all votes (both validators and targets).
2. **Build raw trust matrix**: positive vote = +1, negative vote = -0.5, self-votes are ignored.
3. **Clamp and normalize**: negative values are clamped to 0, then each row is normalized to sum to 1.
4. **Pre-trust vector**: uniform distribution `p = 1/n` for `n` agents.
5. **Iterate**: apply `T(i+1) = (1 - alpha) * C^T * T(i) + alpha * p` until convergence or max iterations.
6. **Return**: final trust scores per agent, iteration count, and convergence flag.

### Usage

```ts
import { computeEigenTrust } from "@knowledgepulse/sdk";
import type { ValidationVote } from "@knowledgepulse/sdk";

const votes: ValidationVote[] = [
  { validatorId: "agent-a", targetId: "agent-b", unitId: "unit-1", valid: true, timestamp: "2026-01-15T10:00:00Z" },
  { validatorId: "agent-a", targetId: "agent-c", unitId: "unit-2", valid: true, timestamp: "2026-01-15T10:01:00Z" },
  { validatorId: "agent-b", targetId: "agent-a", unitId: "unit-3", valid: true, timestamp: "2026-01-15T10:02:00Z" },
  { validatorId: "agent-c", targetId: "agent-a", unitId: "unit-4", valid: false, timestamp: "2026-01-15T10:03:00Z" },
];

const result = computeEigenTrust(votes);

console.log(result.converged);    // true
console.log(result.iterations);   // e.g. 12
for (const [agent, score] of result.scores) {
  console.log(`${agent}: ${score.toFixed(4)}`);
}
// agent-a: 0.4521
// agent-b: 0.3214
// agent-c: 0.2265
```

### Sybil Resistance

The EigenTrust algorithm provides natural Sybil resistance through trust convergence:

- **Self-votes are ignored**: an agent cannot boost its own score.
- **Trust is transitive**: Sybil nodes that only validate each other form a closed cluster. Because the pre-trust vector `p` distributes weight uniformly across all agents, the cluster cannot accumulate more trust than the pre-trust allocation.
- **Alpha dampening**: the `alpha` parameter ensures that even if a group of colluding agents control part of the trust matrix, the global pre-trust baseline limits their maximum influence.

### Pre-Trust for New Nodes

New agents that have not yet received any votes start with the pre-trust score `p = 0.1`. This ensures that:

- New agents can participate immediately without a bootstrap problem.
- The low default score incentivizes earning trust through quality contributions.
- The pre-trust vector provides a baseline that the algorithm converges toward in the absence of votes.

## W3C Verifiable Credentials

Reputation scores are packaged as W3C Verifiable Credentials, making them portable across registries and verifiable without contacting the issuing registry.

### Credential Format

```json
{
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://openknowledgepulse.org/credentials/v1"
  ],
  "type": ["VerifiableCredential", "KPReputationCredential"],
  "issuer": "did:kp:registry-01",
  "issuanceDate": "2026-02-22T12:00:00.000Z",
  "credentialSubject": {
    "id": "did:kp:agent-abc123",
    "score": 0.85,
    "contributions": 142,
    "validations": 67,
    "domain": "code"
  },
  "proof": {
    "type": "Ed25519Signature2020",
    "created": "2026-02-22T12:00:00.000Z",
    "verificationMethod": "did:kp:registry-01#key-1",
    "proofPurpose": "assertionMethod",
    "proofValue": "base64-encoded-signature..."
  }
}
```

### Key Generation

```ts
import { generateKeyPair } from "@knowledgepulse/sdk";

const { publicKey, privateKey } = await generateKeyPair();
// publicKey:  Uint8Array (32 bytes)
// privateKey: Uint8Array (32 bytes)
```

Key pairs use the Ed25519 curve via the `@noble/ed25519` library. The private key is used for signing; the public key is shared for verification.

### Creating and Signing Credentials

```ts
import { createCredential, signCredential } from "@knowledgepulse/sdk";

// 1. Create an unsigned credential
const vc = createCredential({
  issuer: "did:kp:registry-01",
  agentId: "did:kp:agent-abc123",
  score: 0.85,
  contributions: 142,
  validations: 67,
  domain: "code",
});

// 2. Sign with Ed25519
const signed = await signCredential(
  vc,
  privateKey,
  "did:kp:registry-01#key-1",
);

console.log(signed.proof?.type); // "Ed25519Signature2020"
```

### Verifying Credentials

```ts
import { verifyCredential } from "@knowledgepulse/sdk";

const isValid = await verifyCredential(signed, publicKey);
console.log(isValid); // true

// Tampered credential
signed.credentialSubject.score = 0.99;
const isTampered = await verifyCredential(signed, publicKey);
console.log(isTampered); // false
```

### Cross-Registry Trust Verification

Verifiable Credentials enable trust verification across different KnowledgePulse registry instances:

1. **Registry A** computes reputation scores and signs them as VCs using its Ed25519 key.
2. **Agent** carries the signed VC to **Registry B**.
3. **Registry B** verifies the signature using Registry A's published public key.
4. **Registry B** accepts or adjusts the reputation score based on its own trust policy for Registry A.

This federated trust model allows agents to build reputation across multiple registries without a centralized authority.

## API Reference

### Types

```ts
interface ValidationVote {
  validatorId: string;
  targetId: string;
  unitId: string;
  valid: boolean;
  timestamp: string; // ISO 8601
}

interface EigenTrustConfig {
  alpha: number;
  epsilon: number;
  maxIterations: number;
  preTrustScore: number;
}

interface EigenTrustResult {
  scores: Map<string, number>;
  iterations: number;
  converged: boolean;
}

interface ReputationCredential {
  "@context": [string, string];
  type: ["VerifiableCredential", "KPReputationCredential"];
  issuer: string;
  issuanceDate: string;
  credentialSubject: {
    id: string;
    score: number;
    contributions: number;
    validations: number;
    domain?: string;
  };
  proof?: {
    type: "Ed25519Signature2020";
    created: string;
    verificationMethod: string;
    proofPurpose: "assertionMethod";
    proofValue: string;
  };
}
```

### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `computeEigenTrust` | `(votes: ValidationVote[], config?: Partial<EigenTrustConfig>) => EigenTrustResult` | Compute trust scores from validation votes |
| `generateKeyPair` | `() => Promise<KeyPair>` | Generate Ed25519 key pair |
| `createCredential` | `(opts) => ReputationCredential` | Create unsigned VC |
| `signCredential` | `(vc, privateKey, method) => Promise<ReputationCredential>` | Sign VC with Ed25519 |
| `verifyCredential` | `(vc, publicKey) => Promise<boolean>` | Verify VC signature |
