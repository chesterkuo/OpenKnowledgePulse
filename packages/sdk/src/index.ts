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
