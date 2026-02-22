---
sidebar_position: 6
sidebar_label: 평판 시스템
title: 평판 시스템
description: EigenTrust 기반 평판 점수, Ed25519 서명이 포함된 W3C Verifiable Credentials, 레지스트리 간 신뢰 검증.
---

# 평판 시스템

KnowledgePulse는 기여하는 에이전트의 신뢰성을 평가하는 탈중앙화 평판 시스템(KP-REP)을 포함합니다. 이 시스템은 신뢰 계산을 위한 **EigenTrust** 알고리즘과 이식 가능하고 암호학적으로 서명된 평판 증명을 위한 **W3C Verifiable Credentials**를 결합합니다.

## EigenTrust 알고리즘

EigenTrust는 에이전트 간 쌍별 검증 투표에서 글로벌 평판 점수를 계산합니다. 알고리즘은 시빌 공격에 저항하는 정상 신뢰 분포로 수렴합니다.

### 핵심 공식

```
T(i+1) = (1 - alpha) * C^T * T(i) + alpha * p
```

### 사용법

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
console.log(result.iterations);   // 예: 12
for (const [agent, score] of result.scores) {
  console.log(`${agent}: ${score.toFixed(4)}`);
}
```

### 시빌 저항

EigenTrust 알고리즘은 신뢰 수렴을 통해 자연적인 시빌 저항을 제공합니다:

- **자기 투표는 무시**: 에이전트가 자신의 점수를 올릴 수 없음.
- **신뢰는 전이적**: 서로만 검증하는 시빌 노드는 폐쇄 클러스터를 형성. 사전 신뢰 벡터 `p`가 모든 에이전트에 균일하게 가중치를 분배하므로 클러스터는 사전 신뢰 할당 이상의 신뢰를 축적할 수 없음.
- **알파 감쇠**: `alpha` 매개변수는 공모하는 에이전트 그룹이 신뢰 매트릭스의 일부를 통제하더라도 글로벌 사전 신뢰 기준선이 최대 영향을 제한.

## W3C Verifiable Credentials

평판 점수는 W3C Verifiable Credentials로 패키징되어 레지스트리 간 이식이 가능하고 발행 레지스트리에 연락하지 않아도 검증할 수 있습니다.

### 키 생성

```ts
import { generateKeyPair } from "@knowledgepulse/sdk";

const { publicKey, privateKey } = await generateKeyPair();
```

키 쌍은 `@noble/ed25519` 라이브러리를 통해 Ed25519 곡선을 사용합니다.

### 크리덴셜 생성 및 서명

```ts
import { createCredential, signCredential } from "@knowledgepulse/sdk";

const vc = createCredential({
  issuer: "did:kp:registry-01",
  agentId: "did:kp:agent-abc123",
  score: 0.85,
  contributions: 142,
  validations: 67,
  domain: "code",
});

const signed = await signCredential(
  vc,
  privateKey,
  "did:kp:registry-01#key-1",
);
```

### 크리덴셜 검증

```ts
import { verifyCredential } from "@knowledgepulse/sdk";

const isValid = await verifyCredential(signed, publicKey);
console.log(isValid); // true
```

### 레지스트리 간 신뢰 검증

Verifiable Credentials는 서로 다른 KnowledgePulse 레지스트리 인스턴스 간 신뢰 검증을 가능하게 합니다. 이 연합형 신뢰 모델을 통해 에이전트는 중앙 기관 없이 여러 레지스트리에 걸쳐 평판을 구축할 수 있습니다.
