import { describe, expect, test } from "bun:test";
import { parseNotionBlocks } from "./parse-notion.js";

describe("parseNotionBlocks", () => {
  test("converts heading blocks to sections", () => {
    const blocks = [
      { type: "heading_1", heading_1: { rich_text: [{ plain_text: "Overview" }] } },
      { type: "paragraph", paragraph: { rich_text: [{ plain_text: "This is the overview." }] } },
      { type: "heading_2", heading_2: { rich_text: [{ plain_text: "Steps" }] } },
      { type: "paragraph", paragraph: { rich_text: [{ plain_text: "Step 1: Do this." }] } },
    ];
    const result = parseNotionBlocks(blocks as Parameters<typeof parseNotionBlocks>[0]);
    expect(result.sections).toHaveLength(2);
    expect(result.sections[0].heading).toBe("Overview");
    expect(result.sections[0].content).toBe("This is the overview.");
    expect(result.sections[1].heading).toBe("Steps");
    expect(result.sections[1].content).toBe("Step 1: Do this.");
  });

  test("includes numbered and bulleted list items in content", () => {
    const blocks = [
      { type: "heading_1", heading_1: { rich_text: [{ plain_text: "Procedure" }] } },
      {
        type: "numbered_list_item",
        numbered_list_item: { rich_text: [{ plain_text: "First step" }] },
      },
      {
        type: "numbered_list_item",
        numbered_list_item: { rich_text: [{ plain_text: "Second step" }] },
      },
      {
        type: "bulleted_list_item",
        bulleted_list_item: { rich_text: [{ plain_text: "A bullet" }] },
      },
    ];
    const result = parseNotionBlocks(blocks as Parameters<typeof parseNotionBlocks>[0]);
    expect(result.sections).toHaveLength(1);
    expect(result.text).toContain("First step");
    expect(result.text).toContain("Second step");
    expect(result.text).toContain("A bullet");
  });

  test("extracts full text from all blocks", () => {
    const blocks = [
      { type: "paragraph", paragraph: { rich_text: [{ plain_text: "Hello world" }] } },
    ];
    const result = parseNotionBlocks(blocks as Parameters<typeof parseNotionBlocks>[0]);
    expect(result.text).toContain("Hello world");
    expect(result.metadata.format).toBe("notion");
  });

  test("handles blocks without rich_text gracefully", () => {
    const blocks = [
      { type: "divider" },
      { type: "paragraph", paragraph: { rich_text: [{ plain_text: "After divider" }] } },
    ];
    const result = parseNotionBlocks(blocks as Parameters<typeof parseNotionBlocks>[0]);
    expect(result.text).toContain("After divider");
  });

  test("handles toggle blocks as content", () => {
    const blocks = [
      { type: "heading_1", heading_1: { rich_text: [{ plain_text: "FAQ" }] } },
      { type: "toggle", toggle: { rich_text: [{ plain_text: "What is this?" }] } },
    ];
    const result = parseNotionBlocks(blocks as Parameters<typeof parseNotionBlocks>[0]);
    expect(result.sections[0].content).toContain("What is this?");
  });

  test("handles code blocks preserving text", () => {
    const blocks = [
      { type: "heading_1", heading_1: { rich_text: [{ plain_text: "Example" }] } },
      { type: "code", code: { rich_text: [{ plain_text: "console.log('hello')" }] } },
    ];
    const result = parseNotionBlocks(blocks as Parameters<typeof parseNotionBlocks>[0]);
    expect(result.text).toContain("console.log('hello')");
  });

  test("concatenates multiple rich_text segments", () => {
    const blocks = [
      {
        type: "paragraph",
        paragraph: { rich_text: [{ plain_text: "Hello " }, { plain_text: "world" }] },
      },
    ];
    const result = parseNotionBlocks(blocks as Parameters<typeof parseNotionBlocks>[0]);
    expect(result.text).toBe("Hello world");
  });

  test("returns empty result for empty blocks array", () => {
    const result = parseNotionBlocks([]);
    expect(result.text).toBe("");
    expect(result.sections).toHaveLength(0);
  });

  test("content before first heading goes into text but not sections", () => {
    const blocks = [
      { type: "paragraph", paragraph: { rich_text: [{ plain_text: "Preamble text" }] } },
      { type: "heading_1", heading_1: { rich_text: [{ plain_text: "Section 1" }] } },
      { type: "paragraph", paragraph: { rich_text: [{ plain_text: "Section content" }] } },
    ];
    const result = parseNotionBlocks(blocks as Parameters<typeof parseNotionBlocks>[0]);
    expect(result.text).toContain("Preamble text");
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].heading).toBe("Section 1");
  });
});
