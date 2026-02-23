import { readFileSync } from "node:fs";
import {
  type LLMConfig,
  type ParseResult,
  extractDecisionTree,
  parseConfluence,
  parseDocx,
  parseNotion,
  parsePdf,
} from "@knowledgepulse/sdk";
import { Command } from "commander";

export const importCommand = new Command("import")
  .description("Import an SOP from PDF, DOCX, Notion, or Confluence")
  .option("--source <source>", "Source type: pdf, docx, notion, confluence", "pdf")
  .option("--file <file>", "File path (for pdf/docx)")
  .option("--page-id <id>", "Page ID (for notion/confluence)")
  .option("--token <token>", "API token (for notion/confluence)")
  .option("--base-url <url>", "Base URL (for confluence)")
  .option("--llm-provider <provider>", "LLM provider: anthropic or openai", "anthropic")
  .option("--llm-key <key>", "LLM API key (or set ANTHROPIC_API_KEY / OPENAI_API_KEY)")
  .option("--json", "Output as JSON")
  .action(async (opts) => {
    let parsed!: ParseResult;

    try {
      switch (opts.source) {
        case "pdf": {
          if (!opts.file) {
            console.error("Error: --file required for PDF source");
            process.exit(1);
          }
          const buf = readFileSync(opts.file);
          parsed = await parsePdf(buf.buffer as ArrayBuffer);
          break;
        }
        case "docx": {
          if (!opts.file) {
            console.error("Error: --file required for DOCX source");
            process.exit(1);
          }
          const buf = readFileSync(opts.file);
          parsed = await parseDocx(buf.buffer as ArrayBuffer);
          break;
        }
        case "notion": {
          if (!opts.pageId || !opts.token) {
            console.error("Error: --page-id and --token required for Notion");
            process.exit(1);
          }
          parsed = await parseNotion(opts.pageId, opts.token);
          break;
        }
        case "confluence": {
          if (!opts.pageId || !opts.baseUrl || !opts.token) {
            console.error("Error: --page-id, --base-url, and --token required for Confluence");
            process.exit(1);
          }
          parsed = await parseConfluence(opts.pageId, opts.baseUrl, opts.token);
          break;
        }
        default:
          console.error(`Error: Unknown source: ${opts.source}`);
          process.exit(1);
      }
    } catch (e) {
      console.error(`Parse error: ${e instanceof Error ? e.message : String(e)}`);
      process.exit(1);
    }

    console.log(`Parsed ${parsed.sections.length} sections from ${opts.source}`);

    // LLM extraction (optional — if API key provided)
    const apiKey = opts.llmKey ?? process.env.ANTHROPIC_API_KEY ?? process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.log("No LLM API key provided. Showing parsed sections only:");
      for (const s of parsed.sections) {
        console.log(`  - ${s.heading}`);
      }
      return;
    }

    const llmConfig: LLMConfig = { provider: opts.llmProvider, apiKey };
    console.log(`Extracting decision tree via ${opts.llmProvider}...`);

    const result = await extractDecisionTree(parsed, llmConfig);

    if (opts.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`\nExtracted SOP: ${result.name}`);
      console.log(`Domain: ${result.domain}`);
      console.log(`Confidence: ${(result.confidence * 100).toFixed(0)}%`);
      console.log(`Steps: ${result.decision_tree.length}`);
      for (const step of result.decision_tree) {
        console.log(`  ${step.step}: ${step.instruction.slice(0, 80)}`);
      }
    }
  });
