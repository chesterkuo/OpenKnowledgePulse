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
  .option("--save", "Save extracted SOP to registry")
  .option("--registry-url <url>", "Registry URL (or KP_REGISTRY_URL env var)")
  .option("--api-key <key>", "Registry API key (or KP_API_KEY env var)")
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

    // Save to registry if --save flag provided
    if (opts.save) {
      const registryUrl = opts.registryUrl ?? process.env.KP_REGISTRY_URL;
      const registryKey = opts.apiKey ?? process.env.KP_API_KEY;

      if (!registryUrl || !registryKey) {
        console.error("Error: --registry-url and --api-key (or KP_REGISTRY_URL and KP_API_KEY env vars) required with --save");
        process.exit(1);
      }

      const sopData = {
        "@context": "https://openknowledgepulse.org/schema/v1",
        "@type": "ExpertSOP",
        name: result.name,
        domain: result.domain,
        metadata: {
          version: "1.0.0",
          created: new Date().toISOString(),
          tags: [],
          quality_score: 0,
          usage: { success_rate: 0, uses: 0 },
        },
        source: {
          type: "document_import",
          expert_id: "",
          credentials: [],
        },
        decision_tree: result.decision_tree,
      };

      try {
        const res = await fetch(`${registryUrl}/v1/sop`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${registryKey}`,
          },
          body: JSON.stringify(sopData),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: res.statusText }));
          throw new Error((err as { error: string }).error || `HTTP ${res.status}`);
        }

        const created = (await res.json()) as { data: { id: string } };
        console.log(`\nSaved to registry: ${created.data.id}`);
      } catch (err) {
        console.error(`\nFailed to save to registry: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    }
  });
