import { describe, expect, test } from "bun:test";
import { parseConfluenceAdf } from "./parse-confluence.js";

describe("parseConfluenceAdf", () => {
  test("converts heading nodes to sections", () => {
    const adf = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Overview" }] },
        { type: "paragraph", content: [{ type: "text", text: "This is the overview." }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Steps" }] },
        { type: "paragraph", content: [{ type: "text", text: "Do the thing." }] },
      ],
    };
    const result = parseConfluenceAdf(adf);
    expect(result.sections).toHaveLength(2);
    expect(result.sections[0].heading).toBe("Overview");
    expect(result.sections[0].content).toBe("This is the overview.");
    expect(result.sections[1].heading).toBe("Steps");
    expect(result.sections[1].content).toBe("Do the thing.");
  });

  test("handles bullet lists", () => {
    const adf = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Checklist" }] },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [{ type: "paragraph", content: [{ type: "text", text: "Item A" }] }],
            },
            {
              type: "listItem",
              content: [{ type: "paragraph", content: [{ type: "text", text: "Item B" }] }],
            },
          ],
        },
      ],
    };
    const result = parseConfluenceAdf(adf);
    expect(result.text).toContain("Item A");
    expect(result.text).toContain("Item B");
  });

  test("handles ordered lists", () => {
    const adf = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Steps" }] },
        {
          type: "orderedList",
          content: [
            {
              type: "listItem",
              content: [{ type: "paragraph", content: [{ type: "text", text: "Step 1" }] }],
            },
            {
              type: "listItem",
              content: [{ type: "paragraph", content: [{ type: "text", text: "Step 2" }] }],
            },
          ],
        },
      ],
    };
    const result = parseConfluenceAdf(adf);
    expect(result.text).toContain("Step 1");
    expect(result.text).toContain("Step 2");
  });

  test("sets format to confluence", () => {
    const adf = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Hello" }] }],
    };
    const result = parseConfluenceAdf(adf);
    expect(result.metadata.format).toBe("confluence");
  });

  test("handles panels/expand as grouped content", () => {
    const adf = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Info" }] },
        {
          type: "panel",
          content: [{ type: "paragraph", content: [{ type: "text", text: "Panel content" }] }],
        },
      ],
    };
    const result = parseConfluenceAdf(adf);
    expect(result.text).toContain("Panel content");
  });

  test("handles code blocks", () => {
    const adf = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Code" }] },
        { type: "codeBlock", content: [{ type: "text", text: "const x = 1;" }] },
      ],
    };
    const result = parseConfluenceAdf(adf);
    expect(result.text).toContain("const x = 1;");
  });

  test("handles nested text formatting", () => {
    const adf = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Normal " },
            { type: "text", text: "bold" },
            { type: "text", text: " text" },
          ],
        },
      ],
    };
    const result = parseConfluenceAdf(adf);
    expect(result.text).toBe("Normal bold text");
  });

  test("returns empty result for empty doc", () => {
    const adf = { type: "doc", content: [] };
    const result = parseConfluenceAdf(adf);
    expect(result.text).toBe("");
    expect(result.sections).toHaveLength(0);
  });

  test("content before first heading goes into text but not sections", () => {
    const adf = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Preamble" }] },
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Section" }] },
        { type: "paragraph", content: [{ type: "text", text: "Content" }] },
      ],
    };
    const result = parseConfluenceAdf(adf);
    expect(result.text).toContain("Preamble");
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].heading).toBe("Section");
  });
});
