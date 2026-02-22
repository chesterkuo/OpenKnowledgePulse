---
sidebar_position: 2
title: KnowledgeUnit Protocol
description: JSON-LD schema, knowledge types, versioning strategy, and migration system.
---

# KnowledgeUnit Protocol

The KnowledgeUnit protocol defines the canonical format for representing AI-generated knowledge. Every knowledge unit is a JSON-LD document with a well-defined schema, type discriminator, and versioning contract.

## JSON-LD Format

Every KnowledgeUnit is a JSON-LD document with two required context fields:

```json
{
  "@context": "https://knowledgepulse.dev/schema/v1",
  "@type": "Trace",
  "id": "kp:trace:a1b2c3d4",
  ...
}
```

- **`@context`** -- The schema namespace URI. All v1.x documents share the context `https://knowledgepulse.dev/schema/v1`. A new major version introduces a new context URI (e.g., `.../v2`).
- **`@type`** -- The type discriminator. One of `Trace`, `Pattern`, or `SOP`.

## KnowledgeUnit Types

The protocol defines three knowledge unit types, each with a distinct ID prefix:

| Type | ID Prefix | Description |
|------|-----------|-------------|
| **Trace** | `kp:trace:` | A record of a single agent interaction -- what happened, what was tried, what the outcome was. Traces are the raw material from which patterns are extracted. |
| **Pattern** | `kp:pattern:` | A recurring solution or approach distilled from multiple traces. Patterns capture reusable knowledge such as "when X happens, do Y." |
| **SOP** | `kp:sop:` | A Standard Operating Procedure -- a curated, step-by-step workflow assembled from patterns. SOPs represent the highest-fidelity knowledge in the system. |

The progression from Trace to Pattern to SOP reflects increasing levels of curation and confidence:

```
Trace (raw observation)
  → Pattern (recurring solution)
    → SOP (curated workflow)
```

## Schema Versioning Strategy

KnowledgePulse uses semantic versioning for its schema, with clear rules for each version level:

### Patch Versions (e.g., 1.0.0 to 1.0.1)

- Bug fixes and clarifications to field descriptions.
- **No change** to the `@context` URI.
- No new fields, no removed fields.
- All existing consumers continue to work without modification.

### Minor Versions (e.g., 1.0.0 to 1.1.0)

- **Additive only** -- new optional fields may be introduced.
- **No change** to the `@context` URI (still `https://knowledgepulse.dev/schema/v1`).
- No existing fields are removed or have their semantics changed.
- Existing consumers continue to work; they simply ignore the new fields.

### Major Versions (e.g., v1 to v2)

- Breaking changes -- fields may be removed, renamed, or have their semantics changed.
- **New `@context` URI** (e.g., `https://knowledgepulse.dev/schema/v2`).
- Requires explicit migration.

## Backward Compatibility Rules

Two rules govern cross-version interoperability:

1. **v1 consumers must parse any v1.x document**, ignoring unknown fields. A consumer written against v1.0 must accept a v1.3 document without error -- it simply discards fields it does not recognize.

2. **v2 consumers must accept v1 documents** with automatic migration. When a v2 consumer encounters a v1 document, it applies the registered migration function to upgrade the document in place.

## Version Negotiation

### REST API

Clients declare their preferred schema version using the `KP-Schema-Version` request header:

```http
GET /v1/knowledge/kp:trace:abc123
KP-Schema-Version: 1.2.0
```

The server responds with the knowledge unit in the requested version (or the closest compatible version), and echoes the resolved version back:

```http
HTTP/1.1 200 OK
KP-Schema-Version: 1.2.0
Content-Type: application/ld+json
```

If the server cannot satisfy the requested version, it returns `406 Not Acceptable`.

### MCP Tools

MCP tools accept a `schema_version` parameter:

```json
{
  "tool": "knowledgepulse_retrieve",
  "arguments": {
    "id": "kp:trace:abc123",
    "schema_version": "1.2.0"
  }
}
```

The returned knowledge unit conforms to the requested schema version.

## Migration System

Migration functions live in `packages/sdk/src/migrations/` and are **chainable**. Each migration function transforms a document from version N to version N+1:

```
v1 → v2 → v3
```

To migrate a v1 document to v3, the SDK chains the v1-to-v2 and v2-to-v3 migrations automatically. This design means that each migration only needs to handle a single version step, keeping the logic simple and testable.

```typescript
import { migrate } from "@knowledgepulse/sdk";

// Migrate a v1 document to the latest version
const upgraded = migrate(v1Document, { targetVersion: "3.0.0" });
```

Migration functions are pure -- they take a document and return a new document without side effects.

## Deprecation Policy

When a new major version is released:

1. The **old major version remains supported for 12 months** after the new version's release date.
2. During the deprecation window, responses for the old version include a `KP-Deprecated: true` header to signal that consumers should upgrade.
3. After the 12-month window, the server may stop serving the old version and return `410 Gone`.

```http
HTTP/1.1 200 OK
KP-Schema-Version: 1.5.0
KP-Deprecated: true
Content-Type: application/ld+json
```

Clients should monitor for the `KP-Deprecated` header and plan their migration accordingly.
