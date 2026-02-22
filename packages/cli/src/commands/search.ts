import { Command } from "commander";
import { readAuth, readConfig } from "../utils/config.js";

export const searchCommand = new Command("search")
  .description("Search for skills and knowledge in the KnowledgePulse registry")
  .argument("<query>", "Search query")
  .option("-d, --domain <domain>", "Filter by domain")
  .option("-t, --tags <tags>", "Filter by tags (comma-separated)")
  .option("--type <type>", "Knowledge type: ReasoningTrace, ToolCallPattern, ExpertSOP")
  .option("--min-quality <score>", "Minimum quality score (0.0-1.0)", "0.7")
  .option("-l, --limit <n>", "Maximum results", "5")
  .option("--json", "Output as JSON")
  .option("--knowledge", "Search knowledge units instead of skills")
  .action(async (query: string, opts) => {
    const config = readConfig();
    const auth = readAuth();
    const headers: Record<string, string> = {};
    if (auth.apiKey) headers.Authorization = `Bearer ${auth.apiKey}`;

    const params = new URLSearchParams({
      q: query,
      min_quality: opts.minQuality,
      limit: opts.limit,
    });
    if (opts.domain) params.set("domain", opts.domain);
    if (opts.tags) params.set("tags", opts.tags);
    if (opts.type) params.set("types", opts.type);

    const endpoint = opts.knowledge ? "knowledge" : "skills";

    try {
      const res = await fetch(`${config.registryUrl}/v1/${endpoint}?${params}`, { headers });
      const body = await res.json();

      if (opts.json) {
        console.log(JSON.stringify(body, null, 2));
        return;
      }

      const items = (body as { data: Array<Record<string, unknown>> }).data ?? [];
      if (items.length === 0) {
        console.log("No results found.");
        return;
      }

      console.log(`Found ${items.length} result(s):\n`);
      for (const item of items) {
        if (endpoint === "skills") {
          console.log(`  ${item.name} (${item.id})`);
          console.log(`    ${item.description}`);
          console.log(
            `    Quality: ${item.quality_score} | Tags: ${(item.tags as string[])?.join(", ") || "none"}`,
          );
        } else {
          const unit = item.unit as Record<string, unknown>;
          console.log(`  [${unit["@type"]}] ${item.id}`);
          console.log(`    Domain: ${(unit.metadata as Record<string, unknown>)?.task_domain}`);
        }
        console.log();
      }
    } catch (e) {
      console.error(`Error: ${e instanceof Error ? e.message : String(e)}`);
      process.exit(1);
    }
  });
