import { parseConfluence, parseNotionBlocks } from "@knowledgepulse/sdk";
import { Hono } from "hono";

export function importProxyRoutes() {
  const app = new Hono();

  // POST /notion — Proxy Notion API call
  app.post("/notion", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const { pageId, token } = body as { pageId?: string; token?: string };

    if (!pageId || !token) {
      return c.json({ error: "pageId and token are required" }, 400);
    }

    try {
      const moduleName = "@notionhq/client";
      const { Client } = await import(moduleName);
      const notion = new Client({ auth: token });

      const blocks: Array<{ type: string; [key: string]: unknown }> = [];
      let cursor: string | undefined;
      do {
        const response = await notion.blocks.children.list({
          block_id: pageId,
          start_cursor: cursor,
          page_size: 100,
        });
        blocks.push(...response.results);
        cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
      } while (cursor);

      const result = parseNotionBlocks(blocks);
      return c.json(result);
    } catch (err) {
      return c.json(
        { error: `Notion import failed: ${err instanceof Error ? err.message : String(err)}` },
        502,
      );
    }
  });

  // POST /confluence — Proxy Confluence API call
  app.post("/confluence", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const { pageId, baseUrl, token } = body as {
      pageId?: string;
      baseUrl?: string;
      token?: string;
    };

    if (!pageId || !baseUrl || !token) {
      return c.json({ error: "pageId, baseUrl, and token are required" }, 400);
    }

    try {
      const result = await parseConfluence(pageId, baseUrl, token);
      return c.json(result);
    } catch (err) {
      return c.json(
        { error: `Confluence import failed: ${err instanceof Error ? err.message : String(err)}` },
        502,
      );
    }
  });

  return app;
}
