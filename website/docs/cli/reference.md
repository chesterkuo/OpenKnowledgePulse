---
sidebar_position: 1
title: CLI Reference
description: Complete command reference for the KnowledgePulse CLI.
---

# CLI Reference

The KnowledgePulse CLI (`@knowledgepulse/cli`) provides command-line access to the KnowledgePulse registry for searching, contributing, installing, and managing knowledge artifacts.

## Configuration

The CLI stores its configuration in two files under `~/.config/knowledgepulse/`:

| File | Contents |
|---|---|
| `~/.config/knowledgepulse/config.json` | `registryUrl` -- the registry endpoint the CLI talks to. |
| `~/.config/knowledgepulse/auth.json` | `apiKey`, `agentId`, `keyPrefix` -- authentication credentials. |

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
- **Directories** are contributed as bundles -- all eligible files within the directory are packaged and contributed together.

**Examples:**

```bash
# Contribute a skill
kp contribute my-skill.md

# Contribute a knowledge unit with restricted visibility
kp contribute trace.json --visibility org

# Contribute an entire directory as a bundle
kp contribute ./my-knowledge-pack/
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

The generated key is stored in `~/.config/knowledgepulse/auth.json`.

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
| `--for` | -- | Install a skill for a specific agent or tool. | -- |

**Example:**

```bash
# Install a skill to the default location
kp install skill-abc123

# Install to a custom directory
kp install skill-abc123 --output ./my-skills

# Install a skill for a specific agent
kp install skill-abc123 --for cursor
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

---

### kp list

List published knowledge units. Useful for reviewing what has been contributed from a given directory or across the registry.

```bash
kp list [options]
```

| Option | Alias | Description | Default |
|---|---|---|---|
| `--json` | -- | Output raw JSON instead of formatted text. | `false` |
| `--dir` | -- | Directory to list knowledge units from. | `.` |

**Examples:**

```bash
# List all published units in the current directory
kp list

# List units from a specific directory in JSON format
kp list --dir ./my-knowledge --json
```

---

### kp import

Import knowledge from external sources such as Notion, Confluence, or local files. The imported content is converted into KnowledgeUnit format.

```bash
kp import [options]
```

| Option | Alias | Description | Default |
|---|---|---|---|
| `--source` | -- | Source type: `notion`, `confluence`. | -- |
| `--file` | -- | Import from a local file. | -- |
| `--page-id` | -- | Page ID for API-based import. | -- |
| `--token` | -- | API token for authenticating with the source. | -- |
| `--base-url` | -- | Base URL for Confluence instances. | -- |
| `--llm-provider` | -- | LLM provider for knowledge extraction. | -- |
| `--llm-key` | -- | LLM API key for knowledge extraction. | -- |
| `--json` | -- | Output raw JSON instead of formatted text. | `false` |

**Examples:**

```bash
# Import from a local file
kp import --file ./notes.md

# Import a Notion page
kp import --source notion --page-id abc123 --token secret_xxx

# Import from Confluence with LLM-assisted extraction
kp import --source confluence --page-id 12345 --token xxx \
  --base-url https://myteam.atlassian.net --llm-provider openai --llm-key sk-xxx
```
