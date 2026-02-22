export interface ValidationVote {
  validatorId: string;
  targetId: string;
  unitId: string;
  valid: boolean;
  timestamp: string; // ISO 8601
}

export interface TrustEdge {
  from: string;
  to: string;
  weight: number; // 0-1
}

export interface EigenTrustConfig {
  alpha: number; // pre-trust weight, default 0.1
  epsilon: number; // convergence threshold, default 0.001
  maxIterations: number; // default 50
  preTrustScore: number; // default 0.1
}

export interface EigenTrustResult {
  scores: Map<string, number>;
  iterations: number;
  converged: boolean;
}

export interface ReputationCredential {
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://openknowledgepulse.org/credentials/v1",
  ];
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
