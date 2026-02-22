import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

interface LLMConfig {
  provider: string;
  apiKey: string;
  model: string;
}

function getLLMConfig(): LLMConfig {
  return {
    provider: localStorage.getItem("kp_llm_provider") || "anthropic",
    apiKey: localStorage.getItem("kp_llm_api_key") || "",
    model: localStorage.getItem("kp_llm_model") || "",
  };
}

function saveLLMConfig(config: LLMConfig) {
  localStorage.setItem("kp_llm_provider", config.provider);
  localStorage.setItem("kp_llm_api_key", config.apiKey);
  localStorage.setItem("kp_llm_model", config.model);
}

const DEFAULT_MODELS: Record<string, string> = {
  anthropic: "claude-sonnet-4-20250514",
  openai: "gpt-4o",
};

interface DecisionTreeStep {
  step: string;
  instruction: string;
  criteria?: Record<string, string>;
  conditions?: Record<string, { action: string; sla_min?: number }>;
  tool_suggestions?: Array<{ name: string; when: string }>;
}

const EXTRACTION_PROMPT = `You are an expert at analyzing documents and extracting structured decision trees for Standard Operating Procedures (SOPs).

Given the following document text, extract a decision tree as a JSON array. Each element should have:
- "step": A short step label (e.g., "Step 1: Initial Assessment")
- "instruction": Detailed instruction text for this step
- "criteria" (optional): An object mapping criteria names to their descriptions
- "conditions" (optional): An object mapping condition names to { "action": "<target step label>" }
- "tool_suggestions" (optional): An array of { "name": "<tool name>", "when": "<when to use>" }

Return ONLY valid JSON — an array of step objects. No markdown, no explanation.`;

export default function Import() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [sopName, setSopName] = useState("");
  const [domain, setDomain] = useState("general");
  const [documentText, setDocumentText] = useState("");
  const [extractedTree, setExtractedTree] = useState<DecisionTreeStep[] | null>(null);
  const [extractedJson, setExtractedJson] = useState("");
  const [llmConfig, setLlmConfig] = useState<LLMConfig>(getLLMConfig);

  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleFileRead = useCallback((file: File) => {
    setFileError(null);
    setFileName(file.name);

    if (file.name.endsWith(".txt")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setDocumentText(e.target?.result as string);
      };
      reader.onerror = () => {
        setFileError(t("import.readFailed"));
      };
      reader.readAsText(file);
    } else if (file.name.endsWith(".docx") || file.name.endsWith(".pdf")) {
      setFileError(
        t("import.docxWarning", { ext: file.name.split(".").pop() }),
      );
    } else {
      // Try reading as text for other file types
      const reader = new FileReader();
      reader.onload = (e) => {
        setDocumentText(e.target?.result as string);
      };
      reader.onerror = () => {
        setFileError(t("import.readFailedAlt"));
      };
      reader.readAsText(file);
    }
  }, [t]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileRead(file);
    },
    [handleFileRead],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileRead(file);
    },
    [handleFileRead],
  );

  const handleLLMConfigChange = useCallback((field: keyof LLMConfig, value: string) => {
    setLlmConfig((prev) => {
      const next = { ...prev, [field]: value };
      saveLLMConfig(next);
      return next;
    });
  }, []);

  const handleExtract = useCallback(async () => {
    if (!documentText.trim()) {
      setExtractError(t("import.provideText"));
      return;
    }
    if (!llmConfig.apiKey) {
      setExtractError(t("import.provideKey"));
      return;
    }

    setExtracting(true);
    setExtractError(null);
    setExtractedTree(null);
    setExtractedJson("");

    try {
      const model =
        llmConfig.model || DEFAULT_MODELS[llmConfig.provider] || DEFAULT_MODELS.anthropic;

      let responseText: string;

      if (llmConfig.provider === "openai") {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${llmConfig.apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: EXTRACTION_PROMPT },
              { role: "user", content: documentText },
            ],
            temperature: 0.2,
          }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(
            (errData as { error?: { message?: string } }).error?.message ||
              `OpenAI API error: ${res.status}`,
          );
        }
        const data = (await res.json()) as {
          choices: Array<{ message: { content: string } }>;
        };
        responseText = data.choices[0]?.message?.content || "";
      } else {
        // Anthropic
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": llmConfig.apiKey,
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true",
          },
          body: JSON.stringify({
            model,
            max_tokens: 4096,
            messages: [
              {
                role: "user",
                content: `${EXTRACTION_PROMPT}\n\n---\n\nDocument text:\n\n${documentText}`,
              },
            ],
          }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(
            (errData as { error?: { message?: string } }).error?.message ||
              `Anthropic API error: ${res.status}`,
          );
        }
        const data = (await res.json()) as {
          content: Array<{ type: string; text: string }>;
        };
        const textBlock = data.content.find((b) => b.type === "text");
        responseText = textBlock?.text || "";
      }

      // Parse the JSON from the response
      // Strip any markdown code fences if present
      let jsonStr = responseText.trim();
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }

      const parsed = JSON.parse(jsonStr) as DecisionTreeStep[];
      if (!Array.isArray(parsed)) {
        throw new Error(t("import.expectedArray"));
      }

      setExtractedTree(parsed);
      setExtractedJson(JSON.stringify(parsed, null, 2));
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : t("import.extractionFailed"));
    } finally {
      setExtracting(false);
    }
  }, [documentText, llmConfig, t]);

  const handleSave = useCallback(async () => {
    if (!extractedTree || extractedTree.length === 0) {
      setSaveError(t("import.noTree"));
      return;
    }
    if (!sopName.trim()) {
      setSaveError(t("import.provideName"));
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const sopData = {
        "@context": "https://openknowledgepulse.org/schema/v1",
        "@type": "ExpertSOP",
        name: sopName.trim(),
        domain: domain.trim() || "general",
        metadata: {
          version: "1.0.0",
          created: new Date().toISOString(),
          tags: [],
          quality_score: 0,
          usage: { success_rate: 0, uses: 0 },
        },
        source: {
          type: "document_import",
          expert_id: "",
          credentials: [],
        },
        decision_tree: extractedTree,
      };

      const result = (await api.createSOP(sopData)) as {
        data: { id: string };
      };
      navigate(`/editor/${result.data.id}`);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t("import.failedSave"));
    } finally {
      setSaving(false);
    }
  }, [extractedTree, sopName, domain, navigate, t]);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-kp-heading">{t("import.title")}</h1>
        <p className="mt-1 text-sm text-kp-muted">
          {t("import.subtitle")}
        </p>
      </div>

      {/* SOP Name and Domain */}
      <div className="bg-kp-panel rounded-lg border border-kp-border p-6">
        <h2 className="text-lg font-semibold text-kp-heading mb-4">{t("import.sopDetails")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="sop-name" className="block text-sm font-medium text-kp-muted mb-1">
              {t("import.sopName")}
            </label>
            <input
              id="sop-name"
              type="text"
              value={sopName}
              onChange={(e) => setSopName(e.target.value)}
              placeholder={t("import.sopNamePlaceholder")}
              className="w-full px-3 py-2 bg-kp-navy border border-kp-border text-kp-text rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-kp-teal focus:border-kp-teal placeholder:text-kp-muted/50"
            />
          </div>
          <div>
            <label htmlFor="sop-domain" className="block text-sm font-medium text-kp-muted mb-1">
              {t("import.domain")}
            </label>
            <input
              id="sop-domain"
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder={t("import.domainPlaceholder")}
              className="w-full px-3 py-2 bg-kp-navy border border-kp-border text-kp-text rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-kp-teal focus:border-kp-teal placeholder:text-kp-muted/50"
            />
          </div>
        </div>
      </div>

      {/* File Upload */}
      <div className="bg-kp-panel rounded-lg border border-kp-border p-6">
        <h2 className="text-lg font-semibold text-kp-heading mb-4">{t("import.documentSource")}</h2>

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive ? "border-kp-teal bg-kp-teal/5" : "border-kp-teal/30 bg-kp-navy/50 hover:border-kp-teal/60"
          }`}
        >
          <svg
            className="mx-auto h-12 w-12 text-kp-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="mt-2 text-sm text-kp-text">
            {t("import.dragDrop")}{" "}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-kp-teal hover:text-kp-cyan font-medium"
            >
              {t("import.browse")}
            </button>
          </p>
          <p className="mt-1 text-xs text-kp-muted/60">
            {t("import.fileSupport")}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.docx,.pdf,.md"
            onChange={handleFileSelect}
            className="hidden"
          />
          {fileName && (
            <p className="mt-3 text-sm text-kp-text">
              {t("import.selected")} <span className="font-medium">{fileName}</span>
            </p>
          )}
        </div>

        {fileError && (
          <div className="mt-3 bg-kp-orange/10 border border-kp-orange/30 rounded-md p-3">
            <p className="text-sm text-kp-orange">{fileError}</p>
          </div>
        )}

        <div className="mt-4">
          <label htmlFor="document-text" className="block text-sm font-medium text-kp-muted mb-1">
            {t("import.documentText")}
          </label>
          <textarea
            id="document-text"
            value={documentText}
            onChange={(e) => setDocumentText(e.target.value)}
            placeholder={t("import.pastePlaceholder")}
            rows={12}
            className="w-full px-3 py-2 bg-kp-navy border border-kp-border text-kp-text font-mono rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-kp-teal focus:border-kp-teal placeholder:text-kp-muted/50"
          />
          <p className="mt-1 text-xs text-kp-muted">
            {documentText.length > 0
              ? t("import.characters", { count: documentText.length })
              : t("import.noTextYet")}
          </p>
        </div>
      </div>

      {/* LLM Configuration */}
      <div className="bg-kp-panel rounded-lg border border-kp-border p-6">
        <h2 className="text-lg font-semibold text-kp-heading mb-4">{t("import.llmConfig")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="llm-provider" className="block text-sm font-medium text-kp-muted mb-1">
              {t("import.provider")}
            </label>
            <select
              id="llm-provider"
              value={llmConfig.provider}
              onChange={(e) => handleLLMConfigChange("provider", e.target.value)}
              className="w-full px-3 py-2 bg-kp-navy border border-kp-border text-kp-text rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-kp-teal focus:border-kp-teal"
            >
              <option value="anthropic">Anthropic</option>
              <option value="openai">OpenAI</option>
            </select>
          </div>
          <div>
            <label htmlFor="llm-api-key" className="block text-sm font-medium text-kp-muted mb-1">
              {t("import.apiKey")}
            </label>
            <input
              id="llm-api-key"
              type="password"
              value={llmConfig.apiKey}
              onChange={(e) => handleLLMConfigChange("apiKey", e.target.value)}
              placeholder="sk-..."
              className="w-full px-3 py-2 bg-kp-navy border border-kp-border text-kp-text rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-kp-teal focus:border-kp-teal placeholder:text-kp-muted/50"
            />
          </div>
          <div>
            <label htmlFor="llm-model" className="block text-sm font-medium text-kp-muted mb-1">
              {t("import.model")}
            </label>
            <input
              id="llm-model"
              type="text"
              value={llmConfig.model}
              onChange={(e) => handleLLMConfigChange("model", e.target.value)}
              placeholder={DEFAULT_MODELS[llmConfig.provider] || ""}
              className="w-full px-3 py-2 bg-kp-navy border border-kp-border text-kp-text rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-kp-teal focus:border-kp-teal placeholder:text-kp-muted/50"
            />
          </div>
        </div>
      </div>

      {/* Extract Button */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleExtract}
          disabled={extracting || !documentText.trim()}
          className="inline-flex items-center px-6 py-2.5 bg-kp-orange text-white text-sm font-medium rounded-lg hover:bg-kp-orange/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {extracting ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              {t("import.extracting")}
            </>
          ) : (
            t("import.extractTree")
          )}
        </button>

        {extractError && <p className="text-sm text-kp-error">{extractError}</p>}
      </div>

      {/* Extracted Decision Tree Preview */}
      {extractedJson && (
        <div className="bg-kp-panel rounded-lg border border-kp-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-kp-heading">{t("import.extractedTree")}</h2>
            <span className="text-sm text-kp-muted">
              {t("import.steps", { count: extractedTree?.length || 0 })}
            </span>
          </div>
          <textarea
            value={extractedJson}
            onChange={(e) => {
              setExtractedJson(e.target.value);
              try {
                const parsed = JSON.parse(e.target.value) as DecisionTreeStep[];
                setExtractedTree(parsed);
                setExtractError(null);
              } catch {
                setExtractError(t("import.invalidJson"));
              }
            }}
            rows={16}
            className="w-full px-3 py-2 bg-kp-dark border border-kp-border text-kp-text font-mono rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-kp-teal focus:border-kp-teal"
          />

          {/* Save as Draft */}
          <div className="mt-4 flex items-center gap-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !extractedTree || !sopName.trim()}
              className="inline-flex items-center px-6 py-2.5 bg-kp-green text-white text-sm font-medium rounded-lg hover:bg-kp-green/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? t("import.savingDraft") : t("import.saveAsDraft")}
            </button>
            {saveError && <p className="text-sm text-kp-error">{saveError}</p>}
            {!sopName.trim() && extractedTree && (
              <p className="text-sm text-kp-orange">
                {t("import.enterName")}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
