---
sidebar_position: 1
title: CLI Reference
description: Complete command reference for the KnowledgePulse CLI.
---

# CLI Reference

The KnowledgePulse CLI (`@knowledgepulse/cli`) provides command-line access to the KnowledgePulse registry for searching, contributing, installing, and managing knowledge artifacts.

## Configuration

The CLI stores its configuration in two files under `~/.knowledgepulse/`:

| File | Contents |
|---|---|
| `~/.knowledgepulse/config.json` | `registryUrl` -- the registry endpoint the CLI talks to. |
| `~/.knowledgepulse/auth.json` | `apiKey`, `agentId`, `keyPrefix` -- authentication credentials. |

---

## Commands

### kp search

Search the registry for SKILL.md files or KnowledgeUnits.

```bash
kp search <query> [options]
```

| Option | Alias | Description | Default |
|---|---|---|---|
| `--domain` | `-d` | Filter by domain. | -- |
| `--tags` | `-t` | Comma-separated list of tags. | -- |
| `--type` | -- | Unit type filter: `ReasoningTrace`, `ToolCallPattern`, or `ExpertSOP`. | -- |
| `--min-quality` | -- | Minimum quality score (0--1). | `0.7` |
| `--limit` | `-l` | Maximum results. | `5` |
| `--json` | -- | Output raw JSON instead of formatted text. | `false` |
| `--knowledge` | -- | Search KnowledgeUnits instead of skills. | `false` |

**Examples:**

```bash
# Search skills by keyword
kp search "code review"

# Search knowledge units in the debugging domain
kp search "memory leak" --knowledge --domain debugging --type ReasoningTrace

# Get JSON output for scripting
kp search "deploy" --json --limit 10
```

---

### kp contribute

Contribute a SKILL.md or KnowledgeUnit file to the registry. Requires authentication.

```bash
kp contribute <file> [options]
```

| Option | Alias | Description | Default |
|---|---|---|---|
| `--visibility` | `-v` | Access level: `private`, `org`, or `network`. | `network` |

The CLI infers the contribution type from the file extension:

- `.md` files are treated as **SKILL.md** documents.
- `.json` files are treated as **KnowledgeUnit** objects.

**Examples:**

```bash
# Contribute a skill
kp contribute my-skill.md

# Contribute a knowledge unit with restricted visibility
kp contribute trace.json --visibility org
```

---

### kp auth

Manage authentication credentials.

#### kp auth register

Register a new API key with the registry.

```bash
kp auth register [options]
```

| Option | Description | Default |
|---|---|---|
| `--agent-id` | Agent identifier. | `agent-{timestamp}` |
| `--scopes` | Comma-separated list of permission scopes. | `read,write` |

The generated key is stored in `~/.knowledgepulse/auth.json`.

#### kp auth revoke

Revoke the current API key and clear the local auth file.

```bash
kp auth revoke
```

#### kp auth status

Display the current authentication state (agent ID, key prefix, scopes).

```bash
kp auth status
```

---

### kp install

Download a skill from the registry and save it as a local `.md` file.

```bash
kp install <skill-id> [options]
```

| Option | Alias | Description | Default |
|---|---|---|---|
| `--output` | `-o` | Directory to save the skill file. | `~/.claude/skills` |

**Example:**

```bash
# Install a skill to the default location
kp install skill-abc123

# Install to a custom directory
kp install skill-abc123 --output ./my-skills
```

---

### kp validate

Validate a SKILL.md file locally without contributing it. Exits with code 0 if valid, code 1 if invalid.

```bash
kp validate <file>
```

**Example:**

```bash
kp validate my-skill.md && echo "Valid"
```

---

### kp security report

Report a knowledge unit for review. Requires authentication.

```bash
kp security report <unit-id> [options]
```

| Option | Alias | Description |
|---|---|---|
| `--reason` | `-r` | Reason for reporting the unit. |

**Example:**

```bash
kp security report ku-xyz789 --reason "Contains hallucinated data"
```
