import { Hono } from "hono";
import { cors } from "hono/cors";
import { loadConfig } from "./config.js";
import { auditMiddleware } from "./middleware/audit.js";
import { authMiddleware } from "./middleware/auth.js";
import { rateLimitMiddleware } from "./middleware/rate-limit.js";
import { sanitizerMiddleware } from "./middleware/sanitizer.js";
import { schemaVersionMiddleware } from "./middleware/schema-version.js";
import { authRoutes } from "./routes/auth.js";
import { exportRoutes } from "./routes/export.js";
import { knowledgeRoutes } from "./routes/knowledge.js";
import { reputationRoutes } from "./routes/reputation.js";
import { skillRoutes } from "./routes/skills.js";
import { createMemoryStore } from "./store/memory/index.js";

const config = loadConfig();
const stores = createMemoryStore();

const app = new Hono();

// Global middleware
app.use("*", cors());
app.use("*", authMiddleware(stores.apiKeys));
app.use("*", rateLimitMiddleware(stores.rateLimit, stores.apiKeys));
app.use("*", schemaVersionMiddleware());
app.use("*", auditMiddleware(stores.auditLog));
app.use("/v1/skills/*", sanitizerMiddleware());

// Health check
app.get("/health", (c) => c.json({ status: "ok", version: "0.1.0" }));

// Mount routes
app.route("/v1/skills", skillRoutes(stores));
app.route("/v1/knowledge", knowledgeRoutes(stores));
app.route("/v1/reputation", reputationRoutes(stores));
app.route("/v1/export", exportRoutes(stores));
app.route("/v1/auth", authRoutes(stores));

console.log(`KnowledgePulse Registry running on port ${config.port}`);

export default {
  port: config.port,
  fetch: app.fetch,
};

export { app, stores };
