---
sidebar_position: 5
title: SOP API
description: REST API endpoints for creating, managing, versioning, and exporting SOPs.
---

# SOP API

The SOP API provides endpoints for managing Standard Operating Procedures in the KnowledgePulse Registry. SOPs are stored as `ExpertSOP` knowledge units with additional versioning and approval workflows.

## Create an SOP

```
POST /v1/sop
```

| Property | Value |
|---|---|
| Auth required | Yes (`write` scope) |
| Rate-limit exempt | No |

Create a new SOP in the registry.

**Request body**

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | SOP name |
| `domain` | string | Yes | Task domain |
| `visibility` | string | Yes | `private`, `org`, or `network` |
| `decision_tree` | array | Yes | Array of decision tree nodes |
| `description` | string | No | Brief description |
| `tags` | string[] | No | Searchable tags |

**Response**

```json
{
  "data": {
    "id": "kp:sop:abc-123",
    "name": "Bug Triage",
    "domain": "engineering",
    "version": 1,
    "status": "draft",
    "created_at": "2026-02-15T10:00:00.000Z"
  }
}
```

**Example**

```bash
curl -X POST http://localhost:3000/v1/sop \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer kp_your_key" \
  -d '{
    "name": "Bug Triage",
    "domain": "engineering",
    "visibility": "org",
    "decision_tree": [
      {
        "step": "classify",
        "instruction": "Classify the bug by severity",
        "conditions": {
          "critical": { "action": "Escalate to on-call", "sla_min": 15 },
          "major": { "action": "Assign to sprint", "sla_min": 60 }
        }
      }
    ]
  }'
```

---

## Get an SOP

```
GET /v1/sop/:id
```

| Property | Value |
|---|---|
| Auth required | Optional |
| Rate-limit exempt | No |

Retrieve a single SOP by its ID. Returns the latest approved version by default.

**Query parameters**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `version` | number | latest | Specific version number to retrieve |

**Example**

```bash
curl http://localhost:3000/v1/sop/kp:sop:abc-123
curl "http://localhost:3000/v1/sop/kp:sop:abc-123?version=2"
```

---

## Update an SOP

```
PUT /v1/sop/:id
```

| Property | Value |
|---|---|
| Auth required | Yes (`write` scope) |
| Rate-limit exempt | No |
| Access | Original author or admin |

Update an existing SOP. Creates a new version automatically.

**Request body**

Same fields as the create endpoint. Only provided fields are updated.

**Response**

```json
{
  "data": {
    "id": "kp:sop:abc-123",
    "version": 2,
    "status": "draft",
    "updated_at": "2026-02-16T09:00:00.000Z"
  }
}
```

---

## Delete an SOP

```
DELETE /v1/sop/:id
```

| Property | Value |
|---|---|
| Auth required | Yes (`write` or `admin` scope) |
| Rate-limit exempt | No |
| Access | Original author or admin |

Permanently delete an SOP and all its versions.

**Response**

```json
{
  "data": {
    "id": "kp:sop:abc-123",
    "deleted": true
  }
}
```

---

## List SOP Versions

```
GET /v1/sop/:id/versions
```

| Property | Value |
|---|---|
| Auth required | Optional |
| Rate-limit exempt | No |

List all versions of an SOP.

**Response**

```json
{
  "data": [
    { "version": 1, "status": "approved", "created_at": "2026-02-15T10:00:00.000Z" },
    { "version": 2, "status": "draft", "created_at": "2026-02-16T09:00:00.000Z" }
  ]
}
```

---

## Approve an SOP Version

```
POST /v1/sop/:id/approve
```

| Property | Value |
|---|---|
| Auth required | Yes (`admin` scope) |
| Rate-limit exempt | No |

Approve a specific version of an SOP, making it the default version returned by `GET /v1/sop/:id`.

**Request body**

| Field | Type | Required | Description |
|---|---|---|---|
| `version` | number | Yes | Version number to approve |

**Response**

```json
{
  "data": {
    "id": "kp:sop:abc-123",
    "version": 2,
    "status": "approved",
    "approved_at": "2026-02-16T10:00:00.000Z"
  }
}
```

---

## Export SOP as Skill-MD

```
POST /v1/sop/:id/export-skill
```

| Property | Value |
|---|---|
| Auth required | Optional |
| Rate-limit exempt | No |

Export an SOP as a Skill-MD formatted file. Returns the content as `text/markdown`.

**Query parameters**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `version` | number | latest approved | Version to export |

**Example**

```bash
curl -X POST http://localhost:3000/v1/sop/kp:sop:abc-123/export-skill \
  -H "Accept: text/markdown" \
  -o bug-triage.skill.md
```

**Response** (text/markdown)

```markdown
---
name: Bug Triage
description: Standard procedure for classifying and routing bugs
version: "2"
tags: [engineering, triage]
kp:
  domain: engineering
  knowledge_capture: true
  visibility: org
---

## Steps
1. Classify the bug by severity
   - **Critical**: Escalate to on-call (SLA: 15 min)
   - **Major**: Assign to sprint (SLA: 60 min)
```
