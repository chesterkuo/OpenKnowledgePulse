export { computeEigenTrust } from "./eigentrust.js";
export {
  createCredential,
  generateKeyPair,
  signCredential,
  verifyCredential,
  type KeyPair,
} from "./verifiable-credential.js";
export type {
  ValidationVote,
  TrustEdge,
  EigenTrustConfig,
  EigenTrustResult,
  ReputationCredential,
} from "./types.js";
