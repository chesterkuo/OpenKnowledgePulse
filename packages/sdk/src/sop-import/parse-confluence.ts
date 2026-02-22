import type { ParseResult } from "./types.js";

interface AdfNode {
  type: string;
  text?: string;
  content?: AdfNode[];
  attrs?: Record<string, unknown>;
}

/** Recursively extract plain text from an ADF node tree */
function extractAdfText(node: AdfNode): string {
  if (node.type === "text") return node.text ?? "";
  if (!node.content) return "";
  return node.content.map(extractAdfText).join("");
}

/** Parse Atlassian Document Format JSON into ParseResult (no API call) */
export function parseConfluenceAdf(adf: AdfNode): ParseResult {
  const sections: ParseResult["sections"] = [];
  const allText: string[] = [];
  let currentHeading = "";
  let currentContent: string[] = [];

  for (const node of adf.content ?? []) {
    const text = extractAdfText(node);

    if (node.type === "heading") {
      if (currentHeading) {
        sections.push({ heading: currentHeading, content: currentContent.join("\n").trim() });
      }
      currentHeading = text;
      currentContent = [];
      allText.push(text);
    } else {
      if (text) {
        allText.push(text);
        currentContent.push(text);
      }
    }
  }
  if (currentHeading) {
    sections.push({ heading: currentHeading, content: currentContent.join("\n").trim() });
  }

  return {
    text: allText.filter(Boolean).join("\n"),
    sections,
    metadata: { format: "confluence" },
  };
}

/** Fetch and parse a Confluence page (requires base URL + Basic auth token) */
export async function parseConfluence(
  pageId: string,
  baseUrl: string,
  token: string,
): Promise<ParseResult> {
  const url = `${baseUrl}/wiki/api/v2/pages/${pageId}?body-format=atlas_doc_format`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${Buffer.from(token).toString("base64")}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Confluence API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json() as { body: { atlas_doc_format: { value: string } }; title: string };
  const adf = JSON.parse(data.body.atlas_doc_format.value) as AdfNode;
  const result = parseConfluenceAdf(adf);
  (result.metadata as Record<string, unknown>).pageId = pageId;
  (result.metadata as Record<string, unknown>).title = data.title;
  return result;
}
