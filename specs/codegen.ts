import { writeFileSync } from "node:fs";
import { zodToJsonSchema } from "zod-to-json-schema";
import { KnowledgeUnitSchema } from "../packages/sdk/src/types/zod-schemas.js";

const schema = zodToJsonSchema(KnowledgeUnitSchema, {
  name: "KnowledgeUnit",
  $refStrategy: "none",
});

writeFileSync("specs/knowledge-unit-schema.json", `${JSON.stringify(schema, null, 2)}\n`);

console.log("JSON Schema generated at specs/knowledge-unit-schema.json");
