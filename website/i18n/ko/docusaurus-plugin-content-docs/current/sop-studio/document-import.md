---
sidebar_position: 3
sidebar_label: 문서 가져오기
title: 문서 가져오기
description: LLM 기반 추출을 사용하여 DOCX 및 PDF 문서에서 기존 SOP를 가져오는 방법.
---

# 문서 가져오기

SOP Studio는 DOCX 및 PDF 문서에서 기존 표준 운영 절차를 가져올 수 있습니다. LLM이 문서 내용에서 의사 결정 트리 구조를 추출하며, 이를 시각적 편집기에서 검토하고 개선할 수 있습니다.

## 지원 형식

| 형식 | 확장자 | 비고 |
|------|--------|------|
| Microsoft Word | `.docx` | 표, 목록, 제목이 보존됩니다 |
| PDF | `.pdf` | 텍스트 기반 PDF; 스캔 문서는 지원되지 않습니다 |

## 작동 방식

1. **업로드** -- 가져오기 영역에 파일을 드래그하거나 "Import Document"를 클릭합니다.
2. **파싱** -- SDK가 `parseDocx` 또는 `parsePdf`를 사용하여 클라이언트 측에서 문서를 파싱합니다.
3. **추출** -- 파싱된 텍스트가 LLM(클라이언트 측, 사용자의 API 키 사용)으로 전송되어 구조화된 의사 결정 트리를 추출합니다.
4. **검토** -- 추출된 트리가 검토 및 조정을 위해 시각적 편집기에 로드됩니다.
5. **저장** -- 만족스러우면 SOP를 레지스트리에 저장합니다.

## LLM 구성

문서 추출은 LLM을 사용하여 비구조화 텍스트를 구조화된 의사 결정 트리로 변환합니다. LLM 호출은 전적으로 클라이언트 측에서 실행됩니다 -- SOP Studio는 사용자의 문서를 KnowledgePulse 서버로 전송하지 않습니다.

설정 패널에서 LLM 프로바이더를 구성하세요:

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

### 지원되는 프로바이더

| 프로바이더 | 모델 | 로컬? |
|------------|------|-------|
| OpenAI | `gpt-4o`, `gpt-4o-mini` | 아니오 |
| Anthropic | `claude-sonnet-4-20250514`, `claude-haiku-4-20250414` | 아니오 |
| Ollama | 모든 로컬 모델 | 예 |

## SDK 함수

문서 가져오기 파이프라인은 세 가지 SDK 함수를 사용합니다:

### `parseDocx(buffer: ArrayBuffer): Promise<ParseResult>`

DOCX 파일을 파싱하여 구조화된 텍스트 콘텐츠를 반환합니다.

```ts
import { parseDocx } from "@knowledgepulse/sdk";

const buffer = await file.arrayBuffer();
const result = await parseDocx(buffer);

console.log(result.text);       // Plain text content
console.log(result.sections);   // Heading-based sections
console.log(result.tables);     // Extracted tables
```

### `parsePdf(buffer: ArrayBuffer): Promise<ParseResult>`

PDF 파일을 파싱하여 구조화된 텍스트 콘텐츠를 반환합니다.

```ts
import { parsePdf } from "@knowledgepulse/sdk";

const buffer = await file.arrayBuffer();
const result = await parsePdf(buffer);
```

### `extractDecisionTree(parseResult: ParseResult, config: LLMConfig): Promise<ExtractionResult>`

파싱된 문서 콘텐츠를 구성된 LLM으로 전송하여 구조화된 의사 결정 트리를 반환합니다.

```ts
import { extractDecisionTree } from "@knowledgepulse/sdk";

const extraction = await extractDecisionTree(result, config);

console.log(extraction.name);           // Detected SOP name
console.log(extraction.domain);         // Detected domain
console.log(extraction.decision_tree);  // ExpertSOP decision_tree array
console.log(extraction.confidence);     // 0.0 to 1.0
console.log(extraction.warnings);       // Extraction issues
```

## 검토 워크플로우

추출 후 의사 결정 트리는 시각적 표시와 함께 편집기에 로드됩니다:

| 표시 | 의미 |
|------|------|
| 녹색 테두리 | 높은 신뢰도 추출 (0.8 이상) |
| 노란색 테두리 | 중간 신뢰도 (0.5--0.8), 검토 권장 |
| 빨간색 테두리 | 낮은 신뢰도 (0.5 미만), 수동 편집 필요 |

각 노드의 속성을 검토하고, 추출 오류를 수정하고, 누락된 연결을 추가한 후 저장하세요.

## 팁

- **문서를 구조화하세요** -- 번호가 매겨진 단계, 제목, 표가 있는 SOP가 더 나은 추출 결과를 만들어냅니다.
- **낮은 temperature를 사용하세요** -- 0.1--0.2의 temperature가 더 일관된 의사 결정 트리를 생성합니다.
- **항상 검토하세요** -- LLM 추출은 완벽하지 않습니다. 레지스트리에 저장하기 전에 항상 결과를 검토하세요.
