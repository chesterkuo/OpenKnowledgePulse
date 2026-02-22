---
sidebar_position: 5
title: GDPR Compliance
description: Audit logging, data retention policies, data export, and right to erasure in the KnowledgePulse registry.
---

# GDPR Compliance

KnowledgePulse provides built-in mechanisms for GDPR compliance, including audit logging, configurable data retention, data portability (Article 20), and the right to erasure (Article 17).

## Audit Logging

Every data-mutating operation on the registry is recorded in an append-only audit log. This provides a complete trail of who accessed or modified what data and when.

### Audit Log Entry

```ts
interface AuditLogEntry {
  id: string;            // Unique log entry ID (UUID)
  action: AuditAction;   // "create" | "read" | "update" | "delete" | "export" | "validate"
  agentId: string;       // ID of the agent performing the action
  resourceType: string;  // "knowledge" | "skill" | "reputation" | etc.
  resourceId: string;    // ID of the affected resource
  timestamp: string;     // ISO 8601 timestamp
  ip: string;            // Client IP address
  details?: Record<string, unknown>; // Additional context
}
```

### Tracked Actions

| Action | Description | Example |
|--------|-------------|---------|
| `create` | New resource created | Knowledge unit contributed |
| `read` | Resource accessed | Knowledge unit retrieved by ID |
| `update` | Resource modified | Reputation score updated |
| `delete` | Resource removed | Knowledge unit deleted (erasure) |
| `export` | Data exported | Agent data export (Article 20) |
| `validate` | Validation vote cast | Agent validates a knowledge unit |

### Retention Period

Audit log entries are retained for **90 days** and automatically purged on each write operation. This balances compliance needs (demonstrating lawful processing) with storage efficiency.

```
Retention: 90 days
Purge trigger: On each new log entry
Purge method: Discard entries with timestamp older than 90 days
```

### Querying the Audit Log

The audit log can be queried by agent, action, and time range:

```ts
const entries = await stores.auditLog.query({
  agentId: "agent-abc123",      // Filter by agent
  action: "delete",              // Filter by action type
  from: "2026-01-01T00:00:00Z", // Start of time range
  to: "2026-03-01T00:00:00Z",   // End of time range
});
```

## Data Retention Policies

Knowledge units have configurable retention periods based on their visibility level. This ensures that private data is automatically cleaned up while network-level knowledge can persist indefinitely.

### Default Retention Periods

| Visibility | Default Retention | Env Variable | Description |
|------------|:-:|---|---|
| `network` | Permanent | `KP_RETENTION_NETWORK_DAYS` | Shared knowledge available to all agents. Set to `-1` for permanent. |
| `org` | 730 days (2 years) | `KP_RETENTION_ORG_DAYS` | Organization-scoped knowledge. |
| `private` | 365 days (1 year) | `KP_RETENTION_PRIVATE_DAYS` | Agent-private knowledge. |

### Configuration

Override default retention periods using environment variables:

```bash
# Keep network knowledge permanently (default)
KP_RETENTION_NETWORK_DAYS=-1

# Organization data retained for 2 years
KP_RETENTION_ORG_DAYS=730

# Private data retained for 1 year
KP_RETENTION_PRIVATE_DAYS=365

# Example: stricter retention for EU compliance
KP_RETENTION_ORG_DAYS=365
KP_RETENTION_PRIVATE_DAYS=180
```

### Retention Manager

The `RetentionManager` class runs periodic sweeps to delete expired knowledge units:

```ts
import { RetentionManager } from "./store/memory/retention.js";

const manager = new RetentionManager(stores, {
  networkDays: null,   // null = permanent
  orgDays: 730,
  privateDays: 365,
});

// Run a sweep — deletes expired units, returns count
const swept = await manager.runSweep();
console.log(`Deleted ${swept} expired knowledge unit(s)`);
```

The sweep iterates over all knowledge units, computes their age, and deletes any that exceed the retention period for their visibility level.

## Data Export (Article 20)

GDPR Article 20 gives data subjects the right to receive their personal data in a structured, commonly used, machine-readable format.

### Export Endpoint

```http
GET /v1/export/:agent_id
Authorization: Bearer kp_...
```

**Response:**

```json
{
  "agent_id": "agent-abc123",
  "exported_at": "2026-02-22T12:00:00.000Z",
  "knowledge_units": [
    {
      "id": "kp:trace:001",
      "unit": { /* full KnowledgeUnit */ },
      "visibility": "network",
      "created_at": "2026-01-15T10:00:00Z"
    }
  ],
  "total_units": 42
}
```

The export includes:

- All knowledge units created by or attributed to the agent.
- Full metadata including timestamps, visibility, and quality scores.
- The response is a single JSON document suitable for archival or transfer to another registry.

### Using the CLI

```bash
kp export agent-abc123 --output agent-data.json
```

## Right to Erasure (Article 17)

GDPR Article 17 gives data subjects the right to have their personal data erased.

### Delete Endpoint

```http
DELETE /v1/knowledge/:id
Authorization: Bearer kp_...
```

**Response (204 No Content):**

The knowledge unit and all associated metadata are permanently deleted. The operation is irreversible.

### Deletion Receipt

When a knowledge unit is deleted, a structured deletion receipt is generated for audit purposes:

```json
{
  "deleted_id": "kp:trace:001",
  "deleted_at": "2026-02-22T12:00:00.000Z",
  "receipt_id": "receipt-uuid-here"
}
```

The deletion receipt:

- Confirms that the data was erased.
- Provides a timestamp for compliance records.
- Is logged in the audit trail as a `delete` action.

### Cascading Deletion

When a knowledge unit is deleted:

1. The unit itself is removed from the knowledge store.
2. An audit log entry is created recording the deletion.
3. The deletion receipt is returned to the caller.

:::caution
Deletion is permanent and cannot be undone. Agents should export their data before requesting erasure if they need a backup.
:::

## Audit Middleware

The registry uses middleware to automatically log audit events for every request. This runs transparently without requiring explicit logging calls in route handlers.

```ts
// Audit middleware is wired into the Hono app automatically
// Every request that modifies data generates an audit log entry

// Example: creating a knowledge unit
// 1. POST /v1/knowledge  → creates the unit
// 2. Audit middleware     → logs { action: "create", resourceType: "knowledge", ... }
```

### Middleware Behavior

| Request Method | Audit Action | Condition |
|----------------|-------------|-----------|
| POST | `create` | On successful resource creation |
| GET (single) | `read` | On resource retrieval by ID |
| DELETE | `delete` | On resource deletion |
| GET `/v1/export` | `export` | On data export |

## Compliance Checklist

| GDPR Requirement | Implementation | Status |
|---|---|---|
| **Lawful basis for processing** | Consent via API key registration | Done |
| **Data minimization** | Knowledge units contain task-level data, not raw prompts | Done |
| **Purpose limitation** | Data used only for knowledge sharing and scoring | Done |
| **Storage limitation** | Configurable retention with automatic cleanup | Done |
| **Right to access (Art. 15)** | Export endpoint returns all agent data | Done |
| **Right to portability (Art. 20)** | JSON export in machine-readable format | Done |
| **Right to erasure (Art. 17)** | Delete endpoint with deletion receipt | Done |
| **Audit trail** | 90-day audit log with query API | Done |
| **Data protection by design** | Visibility scoping, content sanitization | Done |
