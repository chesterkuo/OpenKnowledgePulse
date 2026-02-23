export interface LLMProviderConfig {
  id: string;
  label: string;
  defaultModel: string;
  keyPlaceholder: string;
  /** "openai" = OpenAI-compatible, "anthropic" = Anthropic, "gemini" = Google Gemini */
  format: "openai" | "anthropic" | "gemini";
  baseUrl: string;
}

export const LLM_PROVIDERS: LLMProviderConfig[] = [
  {
    id: "anthropic",
    label: "Anthropic",
    defaultModel: "claude-sonnet-4-20250514",
    keyPlaceholder: "sk-ant-...",
    format: "anthropic",
    baseUrl: "https://api.anthropic.com",
  },
  {
    id: "openai",
    label: "OpenAI",
    defaultModel: "gpt-4o",
    keyPlaceholder: "sk-...",
    format: "openai",
    baseUrl: "https://api.openai.com",
  },
  {
    id: "gemini",
    label: "Google Gemini",
    defaultModel: "gemini-2.5-flash",
    keyPlaceholder: "AIza...",
    format: "gemini",
    baseUrl: "https://generativelanguage.googleapis.com",
  },
  {
    id: "xai",
    label: "xAI (Grok)",
    defaultModel: "grok-4",
    keyPlaceholder: "xai-...",
    format: "openai",
    baseUrl: "https://api.x.ai",
  },
  {
    id: "kimi",
    label: "Kimi (Moonshot)",
    defaultModel: "kimi-k2.5",
    keyPlaceholder: "sk-...",
    format: "openai",
    baseUrl: "https://api.moonshot.ai",
  },
  {
    id: "glm",
    label: "GLM (Zhipu AI)",
    defaultModel: "glm-5",
    keyPlaceholder: "",
    format: "openai",
    baseUrl: "https://open.bigmodel.cn/api/paas",
  },
  {
    id: "qwen",
    label: "Qwen (Alibaba)",
    defaultModel: "qwen-max",
    keyPlaceholder: "sk-...",
    format: "openai",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode",
  },
];

export const PROVIDER_MAP = Object.fromEntries(
  LLM_PROVIDERS.map((p) => [p.id, p]),
) as Record<string, LLMProviderConfig>;

export function getProvider(id: string): LLMProviderConfig {
  return PROVIDER_MAP[id] ?? LLM_PROVIDERS[0];
}
