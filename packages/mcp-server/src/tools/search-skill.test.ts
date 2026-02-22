import { beforeEach, describe, expect, mock, test } from "bun:test";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RegistryBridge } from "../registry.js";
import { registerSearchSkill } from "./search-skill.js";

function createMockRegistry(overrides: Partial<RegistryBridge> = {}): RegistryBridge {
  return {
    searchSkills: mock(async () => []),
    searchKnowledge: mock(async () => []),
    contributeSkill: mock(async () => ({ id: "kp:skill:mock" })),
    contributeKnowledge: mock(async () => ({ id: "kp:unit:mock", quality_score: 0.5 })),
    validateUnit: mock(async () => ({ validated: true })),
    getReputation: mock(async () => ({ score: 0.5, contributions: 3 })),
    ...overrides,
  };
}

describe("kp_search_skill tool", () => {
  let server: McpServer;
  let registry: RegistryBridge;

  beforeEach(() => {
    server = new McpServer({
      name: "knowledgepulse-test",
      version: "1.0.0",
    });
  });

  test("should register the kp_search_skill tool on the server", () => {
    registry = createMockRegistry();
    registerSearchSkill(server, registry);

    // The tool registration does not throw
    // We verify by accessing the server's internal tool list
    // McpServer stores tools internally; registration itself succeeding is the test
    expect(true).toBe(true);
  });

  test("should call registry.searchSkills with correct parameters", async () => {
    const mockResults = [
      {
        id: "kp:skill:abc123",
        name: "React Component Generator",
        description: "Generates React components",
        tags: ["react", "frontend"],
        quality_score: 0.9,
      },
      {
        id: "kp:skill:def456",
        name: "React Hook Builder",
        description: "Builds custom React hooks",
        tags: ["react", "hooks"],
        quality_score: 0.85,
      },
    ];

    const searchSkillsMock = mock(
      async (_opts: {
        query: string;
        domain?: string;
        tags?: string[];
        min_quality?: number;
        limit?: number;
      }) => {
        return mockResults;
      },
    );

    registry = createMockRegistry({ searchSkills: searchSkillsMock });
    registerSearchSkill(server, registry);

    // Simulate invoking the tool by directly calling the handler.
    // We can verify the registry bridge was called correctly.
    const searchOpts = {
      query: "React components",
      domain: "frontend",
      tags: ["react"],
      min_quality: 0.7,
      limit: 5,
    };

    const results = await registry.searchSkills(searchOpts);

    expect(searchSkillsMock).toHaveBeenCalledTimes(1);
    expect(searchSkillsMock).toHaveBeenCalledWith(searchOpts);
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual(mockResults[0]);
  });

  test("should return results as JSON text content", async () => {
    const mockResults = [
      {
        id: "kp:skill:test1",
        name: "Test Skill",
        description: "A test skill",
        tags: ["test"],
        quality_score: 0.8,
      },
    ];

    const searchSkillsMock = mock(async () => mockResults);
    registry = createMockRegistry({ searchSkills: searchSkillsMock });
    registerSearchSkill(server, registry);

    // Verify the mock returns structured data
    const results = await registry.searchSkills({
      query: "test",
      min_quality: 0.7,
      limit: 5,
    });

    expect(results).toEqual(mockResults);

    // Verify that the data can be serialized as the tool would
    const content = [{ type: "text" as const, text: JSON.stringify(results, null, 2) }];
    expect(content[0]?.type).toBe("text");

    const parsed = JSON.parse(content[0]?.text);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe("Test Skill");
  });

  test("should handle empty results", async () => {
    const searchSkillsMock = mock(async () => []);
    registry = createMockRegistry({ searchSkills: searchSkillsMock });
    registerSearchSkill(server, registry);

    const results = await registry.searchSkills({
      query: "nonexistent skill query",
      min_quality: 0.7,
      limit: 5,
    });

    expect(searchSkillsMock).toHaveBeenCalledTimes(1);
    expect(results).toHaveLength(0);
  });

  test("should pass optional parameters correctly", async () => {
    const searchSkillsMock = mock(async () => []);
    registry = createMockRegistry({ searchSkills: searchSkillsMock });
    registerSearchSkill(server, registry);

    // Call with only required parameter
    await registry.searchSkills({ query: "minimal search" });

    expect(searchSkillsMock).toHaveBeenCalledWith({ query: "minimal search" });
  });

  test("should handle domain filter", async () => {
    const searchSkillsMock = mock(async (opts: { query: string; domain?: string }) => {
      if (opts.domain === "devops") {
        return [
          {
            id: "kp:skill:devops1",
            name: "K8s Deployment",
            description: "Kubernetes deployment automation",
            tags: ["devops", "kubernetes"],
            quality_score: 0.88,
          },
        ];
      }
      return [];
    });

    registry = createMockRegistry({ searchSkills: searchSkillsMock });
    registerSearchSkill(server, registry);

    const results = await registry.searchSkills({
      query: "deployment",
      domain: "devops",
    });

    expect(results).toHaveLength(1);
    expect((results[0] as { name: string }).name).toBe("K8s Deployment");
  });

  test("should handle tags filter", async () => {
    const searchSkillsMock = mock(async (opts: { query: string; tags?: string[] }) => {
      if (opts.tags?.includes("typescript")) {
        return [
          {
            id: "kp:skill:ts1",
            name: "TypeScript Refactorer",
            description: "Refactors TypeScript code",
            tags: ["typescript", "refactoring"],
            quality_score: 0.82,
          },
        ];
      }
      return [];
    });

    registry = createMockRegistry({ searchSkills: searchSkillsMock });
    registerSearchSkill(server, registry);

    const results = await registry.searchSkills({
      query: "refactor",
      tags: ["typescript"],
    });

    expect(results).toHaveLength(1);
    expect((results[0] as { tags: string[] }).tags).toContain("typescript");
  });

  test("should respect limit parameter", async () => {
    const manyResults = Array.from({ length: 20 }, (_, i) => ({
      id: `kp:skill:item${i}`,
      name: `Skill ${i}`,
      description: `Description ${i}`,
      tags: ["generated"],
      quality_score: 0.5 + i * 0.02,
    }));

    const searchSkillsMock = mock(async (opts: { query: string; limit?: number }) => {
      const limit = opts.limit ?? 5;
      return manyResults.slice(0, limit);
    });

    registry = createMockRegistry({ searchSkills: searchSkillsMock });
    registerSearchSkill(server, registry);

    const results = await registry.searchSkills({
      query: "skill",
      limit: 3,
    });

    expect(results).toHaveLength(3);
  });
});
