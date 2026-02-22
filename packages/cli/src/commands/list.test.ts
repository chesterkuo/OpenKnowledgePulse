import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";

/**
 * Tests for the list command.
 *
 * We invoke the CLI via Bun.spawnSync with --dir pointing at temp directories,
 * so we never touch the real ~/.claude/skills/ directory.
 */

const CLI_PATH = join(import.meta.dir, "..", "index.ts");

function runList(...args: string[]): { stdout: string; stderr: string; exitCode: number } {
  const result = Bun.spawnSync(["bun", "run", CLI_PATH, "list", ...args], {
    cwd: import.meta.dir,
    env: { ...process.env },
  });
  return {
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
    exitCode: result.exitCode,
  };
}

const VALID_SKILL = `---
name: test-skill
version: "1.0.0"
description: A test skill
tags:
  - test
  - demo
kp:
  domain: testing
---

# Test Skill

This is a test skill.
`;

const VALID_SKILL_MINIMAL = `---
name: minimal-skill
description: A minimal skill with no optional fields
---

# Minimal Skill

Basic instructions.
`;

const VALID_SKILL_WITH_KP = `---
name: react-generator
version: "2.0.0"
description: Generates React components
author: claude-agent
tags:
  - react
  - frontend
kp:
  domain: software-engineering
  quality_threshold: 0.8
---

# React Generator

Generates React components from specs.
`;

const INVALID_SKILL = `# Not a skill

This markdown has no frontmatter at all.
`;

describe("kp list command", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "kp-list-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("lists skills with valid SKILL.md frontmatter", () => {
    writeFileSync(join(tempDir, "test-skill.md"), VALID_SKILL);
    writeFileSync(join(tempDir, "react-generator.md"), VALID_SKILL_WITH_KP);

    const result = runList("--dir", tempDir);
    expect(result.stdout).toContain("Installed skills (2)");
    expect(result.stdout).toContain("test-skill");
    expect(result.stdout).toContain("1.0.0");
    expect(result.stdout).toContain("testing");
    expect(result.stdout).toContain("test, demo");
    expect(result.stdout).toContain("react-generator");
    expect(result.stdout).toContain("2.0.0");
    expect(result.stdout).toContain("software-engineering");
    expect(result.stdout).toContain("react, frontend");
  });

  test("shows 'No skills installed' when directory is empty", () => {
    const result = runList("--dir", tempDir);
    expect(result.stdout).toContain("No skills installed");
    expect(result.stdout).toContain("kp install");
  });

  test("shows 'No skills directory found' when directory does not exist", () => {
    const nonExistent = join(tempDir, "nonexistent");
    const result = runList("--dir", nonExistent);
    expect(result.stdout).toContain("No skills directory found");
    expect(result.stdout).toContain("kp install");
  });

  test("handles invalid .md files gracefully with '?' markers", () => {
    writeFileSync(join(tempDir, "broken-skill.md"), INVALID_SKILL);

    const result = runList("--dir", tempDir);
    expect(result.stdout).toContain("Installed skills (1)");
    expect(result.stdout).toContain("broken-skill");
    expect(result.stdout).toContain("?");
  });

  test("--json flag outputs valid JSON", () => {
    writeFileSync(join(tempDir, "test-skill.md"), VALID_SKILL);
    writeFileSync(join(tempDir, "minimal-skill.md"), VALID_SKILL_MINIMAL);

    const result = runList("--dir", tempDir, "--json");
    const parsed = JSON.parse(result.stdout);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(2);

    const testSkill = parsed.find((s: { name: string }) => s.name === "test-skill");
    expect(testSkill).toBeDefined();
    expect(testSkill.version).toBe("1.0.0");
    expect(testSkill.domain).toBe("testing");
    expect(testSkill.tags).toEqual(["test", "demo"]);

    const minimalSkill = parsed.find((s: { name: string }) => s.name === "minimal-skill");
    expect(minimalSkill).toBeDefined();
    expect(minimalSkill.version).toBe("-");
    expect(minimalSkill.domain).toBe("-");
    expect(minimalSkill.tags).toEqual([]);
  });

  test("non-.md files are ignored", () => {
    writeFileSync(join(tempDir, "test-skill.md"), VALID_SKILL);
    writeFileSync(join(tempDir, "readme.txt"), "not a skill");
    writeFileSync(join(tempDir, "data.json"), "{}");

    const result = runList("--dir", tempDir);
    expect(result.stdout).toContain("Installed skills (1)");
    expect(result.stdout).toContain("test-skill");
    expect(result.stdout).not.toContain("readme.txt");
    expect(result.stdout).not.toContain("data.json");
  });

  test("--json with invalid files includes '?' markers in JSON", () => {
    writeFileSync(join(tempDir, "bad.md"), INVALID_SKILL);

    const result = runList("--dir", tempDir, "--json");
    const parsed = JSON.parse(result.stdout);
    expect(parsed.length).toBe(1);
    expect(parsed[0].name).toBe("bad");
    expect(parsed[0].version).toBe("?");
    expect(parsed[0].domain).toBe("?");
    expect(parsed[0].tags).toEqual([]);
  });

  test("displays table headers correctly", () => {
    writeFileSync(join(tempDir, "test-skill.md"), VALID_SKILL);

    const result = runList("--dir", tempDir);
    expect(result.stdout).toContain("Name");
    expect(result.stdout).toContain("Version");
    expect(result.stdout).toContain("Domain");
    expect(result.stdout).toContain("Tags");
    // Check separator line exists
    expect(result.stdout).toContain("----");
  });

  test("minimal skill shows dashes for missing optional fields", () => {
    writeFileSync(join(tempDir, "minimal-skill.md"), VALID_SKILL_MINIMAL);

    const result = runList("--dir", tempDir, "--json");
    const parsed = JSON.parse(result.stdout);
    expect(parsed.length).toBe(1);
    expect(parsed[0].name).toBe("minimal-skill");
    expect(parsed[0].version).toBe("-");
    expect(parsed[0].domain).toBe("-");
    expect(parsed[0].tags).toEqual([]);
  });
});
