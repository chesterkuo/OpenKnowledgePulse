import { sanitizeSkillMd } from "@knowledgepulse/sdk";
import type { Context, Next } from "hono";
import type { HonoEnv } from "../types.js";

export function sanitizerMiddleware() {
  return async (c: Context<HonoEnv>, next: Next) => {
    if (c.req.method === "POST" && c.req.path.includes("/skills")) {
      try {
        const body = await c.req.json();
        if (body.skill_md_content && typeof body.skill_md_content === "string") {
          const { content, warnings } = sanitizeSkillMd(body.skill_md_content);
          // Replace body content with sanitized version
          c.set("sanitizedBody", { ...body, skill_md_content: content });
          if (warnings.length > 0) {
            c.set("sanitizerWarnings", warnings);
          }
        }
      } catch (e) {
        return c.json(
          {
            error: "Sanitization failed",
            message: e instanceof Error ? e.message : String(e),
          },
          400,
        );
      }
    }
    await next();
  };
}
