import { describe, expect, test } from "bun:test";
import { importCommand } from "./import.js";

describe("import command", () => {
  test("is defined with correct name", () => {
    expect(importCommand.name()).toBe("import");
  });

  test("has required options", () => {
    const opts = importCommand.options.map((o) => o.long);
    expect(opts).toContain("--source");
    expect(opts).toContain("--file");
    expect(opts).toContain("--page-id");
    expect(opts).toContain("--token");
    expect(opts).toContain("--base-url");
    expect(opts).toContain("--llm-provider");
    expect(opts).toContain("--llm-key");
    expect(opts).toContain("--json");
  });

  test("defaults source to pdf", () => {
    const sourceOpt = importCommand.options.find((o) => o.long === "--source");
    expect(sourceOpt?.defaultValue).toBe("pdf");
  });

  test("defaults llm-provider to anthropic", () => {
    const providerOpt = importCommand.options.find((o) => o.long === "--llm-provider");
    expect(providerOpt?.defaultValue).toBe("anthropic");
  });

  test("has --save and --registry-url and --api-key options", () => {
    const opts = importCommand.options.map((o) => o.long);
    expect(opts).toContain("--save");
    expect(opts).toContain("--registry-url");
    expect(opts).toContain("--api-key");
  });
});
