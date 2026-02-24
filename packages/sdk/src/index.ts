// Types
export {
  KP_CONTEXT,
  type KnowledgeUnit,
  type KnowledgeUnitMeta,
  type KnowledgeUnitType,
  type PrivacyLevel,
  type Visibility,
  type ReasoningTrace,
  type ReasoningTraceStep,
  type ToolCallPattern,
  type ExpertSOP,
  type SkillMdFrontmatter,
  type SkillMdKpExtension,
} from "./types/index.js";

// Zod Schemas
export {
  KnowledgeUnitSchema,
  KnowledgeUnitTypeSchema,
  KnowledgeUnitMetaSchema,
  PrivacyLevelSchema,
  VisibilitySchema,
  ReasoningTraceSchema,
  ReasoningTraceStepSchema,
  ToolCallPatternSchema,
  ExpertSOPSchema,
  SkillMdFrontmatterSchema,
  SkillMdKpExtensionSchema,
} from "./types/index.js";

// Core APIs
export { KPCapture, type CaptureConfig } from "./capture.js";
export { KPRetrieval, type RetrievalConfig } from "./retrieve.js";
export { contributeKnowledge, contributeSkill, type ContributeConfig } from "./contribute.js";
export { evaluateValue } from "./scoring.js";
export { VectorCache } from "./hnsw-cache.js";

// Skill.md
export { parseSkillMd, generateSkillMd, validateSkillMd, type ParsedSkillMd } from "./skill-md.js";

// Utilities
export {
  generateTraceId,
  generatePatternId,
  generateSopId,
  generateSkillId,
  sha256,
  sanitizeSkillMd,
  type SanitizeResult,
  classifyInjectionRisk,
  type InjectionAssessment,
  type ClassifierOptions,
  cleanPii,
  type PiiCleanResult,
} from "./utils/index.js";

// Errors
export {
  KPError,
  ValidationError,
  SanitizationError,
  AuthenticationError,
  RateLimitError,
  NotFoundError,
} from "./errors.js";

// Migrations
export { migrate } from "./migrations/index.js";

// SOP Import
export {
  parseDocx,
  parsePdf,
  parseNotion,
  parseNotionBlocks,
  parseConfluence,
  parseConfluenceAdf,
  extractDecisionTree,
  getExtractionPrompt,
} from "./sop-import/index.js";
export type {
  LLMConfig,
  ParseResult,
  ExtractionResult,
} from "./sop-import/index.js";

// Reputation
export {
  computeEigenTrust,
  createCredential,
  generateKeyPair,
  signCredential,
  verifyCredential,
  type KeyPair,
  type ValidationVote,
  type TrustEdge,
  type EigenTrustConfig,
  type EigenTrustResult,
  type ReputationCredential,
} from "./reputation/index.js";
