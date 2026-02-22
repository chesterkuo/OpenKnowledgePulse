import type { ParseResult } from "./types.js";

interface MammothResult {
  value: string;
  messages: unknown[];
}

interface MammothModule {
  convertToHtml(input: { arrayBuffer: ArrayBuffer }): Promise<MammothResult>;
}

export async function parseDocx(buffer: ArrayBuffer): Promise<ParseResult> {
  // Dynamic import for optional dependency — use variable to prevent
  // TypeScript from resolving the module at DTS build time
  const moduleName = "mammoth";
  const mammoth = (await import(moduleName)) as MammothModule;
  const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
  const text = result.value
    .replace(/<[^>]+>/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Extract sections from HTML headings
  const sections: ParseResult["sections"] = [];
  const headingRegex = /<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi;
  const htmlParts = result.value.split(headingRegex);
  for (let i = 1; i < htmlParts.length; i += 2) {
    const heading = (htmlParts[i] as string).replace(/<[^>]+>/g, "").trim();
    const content = ((htmlParts[i + 1] as string | undefined) ?? "").replace(/<[^>]+>/g, "").trim();
    sections.push({ heading, content });
  }

  return { text, sections, metadata: { format: "docx" } };
}
