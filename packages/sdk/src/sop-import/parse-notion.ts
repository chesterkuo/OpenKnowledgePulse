import type { ParseResult } from "./types.js";

interface NotionRichText {
  plain_text: string;
}

interface NotionBlock {
  type: string;
  [key: string]: unknown;
}

function extractText(richText: NotionRichText[]): string {
  return richText.map((rt) => rt.plain_text).join("");
}

function getBlockText(block: NotionBlock): string {
  const data = block[block.type] as { rich_text?: NotionRichText[] } | undefined;
  return data?.rich_text ? extractText(data.rich_text) : "";
}

function isHeading(block: NotionBlock): boolean {
  return block.type.startsWith("heading_");
}

/** Parse raw Notion blocks into ParseResult (no API call — pure data transform) */
export function parseNotionBlocks(blocks: NotionBlock[]): ParseResult {
  const sections: ParseResult["sections"] = [];
  const allText: string[] = [];
  let currentHeading = "";
  let currentContent: string[] = [];

  for (const block of blocks) {
    const text = getBlockText(block);
    if (text) allText.push(text);

    if (isHeading(block)) {
      if (currentHeading) {
        sections.push({ heading: currentHeading, content: currentContent.join("\n").trim() });
      }
      currentHeading = text;
      currentContent = [];
    } else if (text) {
      currentContent.push(text);
    }
  }
  if (currentHeading) {
    sections.push({ heading: currentHeading, content: currentContent.join("\n").trim() });
  }

  return {
    text: allText.filter(Boolean).join("\n"),
    sections,
    metadata: { format: "notion" },
  };
}

/** Fetch and parse a Notion page (requires API token) */
export async function parseNotion(pageId: string, token: string): Promise<ParseResult> {
  // Dynamic import for optional dependency — use variable to prevent
  // TypeScript from resolving the module at DTS build time
  const moduleName = "@notionhq/client";
  const { Client } = await import(moduleName);
  const notion = new Client({ auth: token });

  const blocks: NotionBlock[] = [];
  let cursor: string | undefined;

  do {
    const response = await notion.blocks.children.list({
      block_id: pageId,
      start_cursor: cursor,
      page_size: 100,
    });
    blocks.push(...(response.results as NotionBlock[]));
    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);

  const result = parseNotionBlocks(blocks);
  (result.metadata as Record<string, unknown>).pageId = pageId;
  return result;
}
