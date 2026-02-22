import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const CONFIG_DIR = join(homedir(), ".config", "knowledgepulse");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");
const AUTH_FILE = join(CONFIG_DIR, "auth.json");

export interface CLIConfig {
  registryUrl: string;
  defaultVisibility: "private" | "org" | "network";
  defaultDomain?: string;
}

export interface AuthConfig {
  apiKey?: string;
  agentId?: string;
  keyPrefix?: string;
}

function ensureDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function readConfig(): CLIConfig {
  try {
    const data = readFileSync(CONFIG_FILE, "utf-8");
    return JSON.parse(data) as CLIConfig;
  } catch {
    return {
      registryUrl: "http://localhost:3000",
      defaultVisibility: "network",
    };
  }
}

export function writeConfig(config: CLIConfig): void {
  ensureDir();
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export function readAuth(): AuthConfig {
  try {
    const data = readFileSync(AUTH_FILE, "utf-8");
    return JSON.parse(data) as AuthConfig;
  } catch {
    return {};
  }
}

export function writeAuth(auth: AuthConfig): void {
  ensureDir();
  writeFileSync(AUTH_FILE, JSON.stringify(auth, null, 2), { mode: 0o600 });
}
