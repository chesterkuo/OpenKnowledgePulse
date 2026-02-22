---
sidebar_position: 3
title: Document Import
description: Import existing SOPs from DOCX and PDF documents using LLM-powered extraction.
---

# Document Import

SOP Studio can import existing Standard Operating Procedures from DOCX and PDF documents. An LLM extracts the decision tree structure from the document content, which you then review and refine in the visual editor.

## Supported Formats

| Format | Extension | Notes |
|--------|-----------|-------|
| Microsoft Word | `.docx` | Tables, lists, and headings are preserved |
| PDF | `.pdf` | Text-based PDFs; scanned documents are not supported |

## How It Works

1. **Upload** -- Drag a file onto the import area or click "Import Document".
2. **Parse** -- The SDK parses the document client-side using `parseDocx` or `parsePdf`.
3. **Extract** -- The parsed text is sent to an LLM (client-side, using your own API key) to extract a structured decision tree.
4. **Review** -- The extracted tree loads in the visual editor for review and adjustment.
5. **Save** -- Once satisfied, save the SOP to the registry.

## LLM Configuration

Document extraction uses an LLM to convert unstructured text into a structured decision tree. The LLM call runs entirely client-side -- SOP Studio never sends your documents to KnowledgePulse servers.

Configure your LLM provider in the settings panel:

```ts
import type { LLMConfig } from "@knowledgepulse/sdk";

const config: LLMConfig = {
  provider: "openai",          // "openai" | "anthropic" | "ollama"
  apiKey: "sk-...",            // Your API key (stored locally)
  model: "gpt-4o",            // Model identifier
  baseUrl: undefined,          // Custom endpoint (required for Ollama)
  temperature: 0.2,           // Lower = more deterministic extraction
};
```

### Supported Providers

| Provider | Models | Local? |
|----------|--------|--------|
| OpenAI | `gpt-4o`, `gpt-4o-mini` | No |
| Anthropic | `claude-sonnet-4-20250514`, `claude-haiku-4-20250414` | No |
| Ollama | Any local model | Yes |

## SDK Functions

The document import pipeline uses three SDK functions:

### `parseDocx(buffer: ArrayBuffer): Promise<ParseResult>`

Parses a DOCX file and returns structured text content.

```ts
import { parseDocx } from "@knowledgepulse/sdk";

const buffer = await file.arrayBuffer();
const result = await parseDocx(buffer);

console.log(result.text);       // Plain text content
console.log(result.sections);   // Heading-based sections
console.log(result.tables);     // Extracted tables
```

### `parsePdf(buffer: ArrayBuffer): Promise<ParseResult>`

Parses a PDF file and returns structured text content.

```ts
import { parsePdf } from "@knowledgepulse/sdk";

const buffer = await file.arrayBuffer();
const result = await parsePdf(buffer);
```

### `extractDecisionTree(parseResult: ParseResult, config: LLMConfig): Promise<ExtractionResult>`

Sends parsed document content to the configured LLM and returns a structured decision tree.

```ts
import { extractDecisionTree } from "@knowledgepulse/sdk";

const extraction = await extractDecisionTree(result, config);

console.log(extraction.name);           // Detected SOP name
console.log(extraction.domain);         // Detected domain
console.log(extraction.decision_tree);  // ExpertSOP decision_tree array
console.log(extraction.confidence);     // 0.0 to 1.0
console.log(extraction.warnings);       // Extraction issues
```

## Review Workflow

After extraction, the decision tree loads in the editor with visual indicators:

| Indicator | Meaning |
|-----------|---------|
| Green outline | High-confidence extraction (above 0.8) |
| Yellow outline | Medium confidence (0.5--0.8), review recommended |
| Red outline | Low confidence (below 0.5), manual editing likely needed |

Review each node's properties, fix any extraction errors, and add missing connections before saving.

## Tips

- **Structure your documents** -- SOPs with numbered steps, headings, and tables produce better extraction results.
- **Use lower temperature** -- A temperature of 0.1--0.2 produces more consistent decision trees.
- **Review always** -- LLM extraction is not perfect. Always review the result before saving to the registry.
