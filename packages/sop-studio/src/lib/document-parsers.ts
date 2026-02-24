import mammoth from "mammoth";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";

// Use bundled worker for pdf.js
GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export async function parseDocxBrowser(buffer: ArrayBuffer): Promise<string> {
  const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
  // Strip HTML tags, collapse whitespace
  return result.value
    .replace(/<[^>]+>/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function parsePdfBrowser(buffer: ArrayBuffer): Promise<string> {
  const pdf = await getDocument({ data: buffer }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item: { str?: string }) => item.str ?? "")
      .join(" ");
    pages.push(text);
  }

  return pages.join("\n\n").trim();
}
