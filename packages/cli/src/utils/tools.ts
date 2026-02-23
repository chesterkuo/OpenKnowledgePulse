import { homedir } from "node:os";
import { join, resolve } from "node:path";

export interface ToolConfig {
  name: string;
  getSkillsDir: () => string;
  postInstallHint: (path: string) => string;
}

export const TOOL_CONFIGS: Record<string, ToolConfig> = {
  claude: {
    name: "Claude Code",
    getSkillsDir: () => join(homedir(), ".claude", "skills"),
    postInstallHint: (_path) =>
      "Claude Code : skill is ready — invoke it with /skill or reference it in conversation",
  },
  cursor: {
    name: "Cursor",
    getSkillsDir: () => resolve(process.cwd(), ".cursor", "rules"),
    postInstallHint: (_path) =>
      "Cursor      : rule installed — Cursor will auto-load rules from .cursor/rules/",
  },
  windsurf: {
    name: "Windsurf",
    getSkillsDir: () => resolve(process.cwd(), ".windsurf", "rules"),
    postInstallHint: (_path) =>
      "Windsurf    : rule installed — Windsurf will auto-load rules from .windsurf/rules/",
  },
};

export const SUPPORTED_TOOLS = Object.keys(TOOL_CONFIGS);

export function formatGenericGuidance(installPath: string): string {
  const lines = [
    "",
    "  Next steps:",
    "  ├─ Claude Code : skill is ready — it's in ~/.claude/skills/",
    `  ├─ Other tools : reference the skill file at ${installPath}`,
    "  └─ Tip         : use --for <tool> to auto-install to tool-specific paths",
    `                    Supported: ${SUPPORTED_TOOLS.join(", ")}`,
  ];
  return lines.join("\n");
}

export function formatToolGuidance(tool: string, installPath: string): string {
  const config = TOOL_CONFIGS[tool];
  if (!config) return "";
  const lines = ["", "  Next steps:", `  └─ ${config.postInstallHint(installPath)}`];
  return lines.join("\n");
}
