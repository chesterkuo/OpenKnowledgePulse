---
sidebar_position: 6
title: 信誉系统
description: 基于 EigenTrust 的信誉评分、W3C 可验证凭证与 Ed25519 签名，以及跨注册表信任验证。
---

# 信誉系统

KnowledgePulse 包含一个去中心化的信誉系统（KP-REP），用于评估贡献智能体的可信度。该系统将 **EigenTrust** 算法用于信任计算，并结合 **W3C 可验证凭证**实现可移植的、加密签名的信誉证明。

## EigenTrust 算法

EigenTrust 从智能体之间的成对验证投票中计算全局信誉分数。该算法收敛到一个对女巫攻击具有抵抗力的稳态信任分布。

### 核心公式

```
T(i+1) = (1 - alpha) * C^T * T(i) + alpha * p
```

其中：

| 符号 | 描述 | 默认值 |
|------|------|--------|
| T | 信任向量（所有智能体的信誉分数）| 从本地信任初始化 |
| C | 行归一化信任矩阵 | 从投票推导 |
| p | 预信任向量（均匀分布）| 每个智能体 1/n |
| alpha | 预信任权重 | 0.1 |

### 配置

```ts
import { computeEigenTrust } from "@knowledgepulse/sdk";
import type { EigenTrustConfig, ValidationVote } from "@knowledgepulse/sdk";

const config: Partial<EigenTrustConfig> = {
  alpha: 0.1,         // 预信任权重（越高 = 越依赖预信任）
  epsilon: 0.001,     // 收敛阈值
  maxIterations: 50,  // 停止前的最大迭代次数
  preTrustScore: 0.1, // 新智能体的默认分数
};
```

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `alpha` | number | 0.1 | 给予均匀预信任向量的权重。较高的值使算法更保守。|
| `epsilon` | number | 0.001 | 收敛阈值。当轮次间最大变化低于此值时停止迭代。|
| `maxIterations` | number | 50 | 迭代次数硬限制，防止无限循环。|
| `preTrustScore` | number | 0.1 | 在处理任何投票之前分配给智能体的默认信誉分数。|

### 算法步骤

1. **收集唯一智能体**：从所有投票中收集验证者和目标。
2. **构建原始信任矩阵**：正面投票 = +1，负面投票 = -0.5，忽略自投票。
3. **截断和归一化**：负值截断为 0，然后每行归一化使总和为 1。
4. **预信任向量**：对 `n` 个智能体的均匀分布 `p = 1/n`。
5. **迭代**：应用 `T(i+1) = (1 - alpha) * C^T * T(i) + alpha * p` 直到收敛或达到最大迭代次数。
6. **返回**：每个智能体的最终信任分数、迭代次数和收敛标志。

### 使用方法

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
console.log(result.iterations);   // 例如 12
for (const [agent, score] of result.scores) {
  console.log(`${agent}: ${score.toFixed(4)}`);
}
// agent-a: 0.4521
// agent-b: 0.3214
// agent-c: 0.2265
```

### 女巫攻击抵抗

EigenTrust 算法通过信任收敛提供自然的女巫攻击抵抗能力：

- **忽略自投票**：智能体无法提升自己的分数。
- **信任具有传递性**：仅互相验证的女巫节点形成封闭集群。由于预信任向量 `p` 在所有智能体之间均匀分配权重，该集群无法累积超过预信任分配的信任度。
- **Alpha 阻尼**：`alpha` 参数确保即使一组合谋智能体控制了信任矩阵的一部分，全局预信任基线也限制了他们的最大影响力。

### 新节点的预信任

尚未收到任何投票的新智能体从预信任分数 `p = 0.1` 开始。这确保了：

- 新智能体可以立即参与，不存在启动问题。
- 低默认分数激励通过高质量贡献来赢得信任。
- 预信任向量在没有投票的情况下提供算法收敛的基线。

## W3C 可验证凭证

信誉分数被打包为 W3C 可验证凭证，使其可以跨注册表移植，且无需联系发行注册表即可验证。

### 凭证格式

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

### 密钥生成

```ts
import { generateKeyPair } from "@knowledgepulse/sdk";

const { publicKey, privateKey } = await generateKeyPair();
// publicKey:  Uint8Array (32 字节)
// privateKey: Uint8Array (32 字节)
```

密钥对使用 Ed25519 曲线，通过 `@noble/ed25519` 库实现。私钥用于签名，公钥用于验证。

### 创建和签名凭证

```ts
import { createCredential, signCredential } from "@knowledgepulse/sdk";

// 1. 创建未签名的凭证
const vc = createCredential({
  issuer: "did:kp:registry-01",
  agentId: "did:kp:agent-abc123",
  score: 0.85,
  contributions: 142,
  validations: 67,
  domain: "code",
});

// 2. 使用 Ed25519 签名
const signed = await signCredential(
  vc,
  privateKey,
  "did:kp:registry-01#key-1",
);

console.log(signed.proof?.type); // "Ed25519Signature2020"
```

### 验证凭证

```ts
import { verifyCredential } from "@knowledgepulse/sdk";

const isValid = await verifyCredential(signed, publicKey);
console.log(isValid); // true

// 被篡改的凭证
signed.credentialSubject.score = 0.99;
const isTampered = await verifyCredential(signed, publicKey);
console.log(isTampered); // false
```

### 跨注册表信任验证

可验证凭证支持跨不同 KnowledgePulse 注册表实例的信任验证：

1. **注册表 A** 计算信誉分数并使用其 Ed25519 密钥签名为可验证凭证。
2. **智能体**携带签名的凭证前往**注册表 B**。
3. **注册表 B** 使用注册表 A 发布的公钥验证签名。
4. **注册表 B** 根据其对注册表 A 的信任策略接受或调整信誉分数。

这种联邦信任模型允许智能体在多个注册表之间建立信誉，无需中心化权威机构。

## API 参考

### 类型

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

### 函数

| 函数 | 签名 | 描述 |
|------|------|------|
| `computeEigenTrust` | `(votes: ValidationVote[], config?: Partial<EigenTrustConfig>) => EigenTrustResult` | 从验证投票计算信任分数 |
| `generateKeyPair` | `() => Promise<KeyPair>` | 生成 Ed25519 密钥对 |
| `createCredential` | `(opts) => ReputationCredential` | 创建未签名的可验证凭证 |
| `signCredential` | `(vc, privateKey, method) => Promise<ReputationCredential>` | 使用 Ed25519 签名凭证 |
| `verifyCredential` | `(vc, publicKey) => Promise<boolean>` | 验证凭证签名 |
