import type { ParseResult } from "./types.js";

interface PdfParseResult {
  text: string;
  numpages: number;
  info: Record<string, unknown>;
}

export async function parsePdf(buffer: ArrayBuffer): Promise<ParseResult> {
  // Dynamic import for optional dependency — use variable to prevent
  // TypeScript from resolving the module at DTS build time
  const moduleName = "pdf-parse";
  const pdfParseModule = await import(moduleName);
  const pdfParse = (pdfParseModule.default ?? pdfParseModule) as (
    buf: Buffer,
  ) => Promise<PdfParseResult>;
  const result = await pdfParse(Buffer.from(buffer));

  // Simple section extraction based on uppercase lines or numbered sections
  const lines = result.text.split("\n");
  const sections: ParseResult["sections"] = [];
  let currentHeading = "";
  let currentContent: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Heuristic: lines that are all caps or start with a number followed by period
    if (
      trimmed &&
      ((trimmed === trimmed.toUpperCase() && trimmed.length > 3) || /^\d+\.\s/.test(trimmed))
    ) {
      if (currentHeading) {
        sections.push({
          heading: currentHeading,
          content: currentContent.join("\n").trim(),
        });
      }
      currentHeading = trimmed;
      currentContent = [];
    } else {
      currentContent.push(trimmed);
    }
  }
  if (currentHeading) {
    sections.push({
      heading: currentHeading,
      content: currentContent.join("\n").trim(),
    });
  }

  return {
    text: result.text,
    sections,
    metadata: { pages: result.numpages, format: "pdf" },
  };
}
