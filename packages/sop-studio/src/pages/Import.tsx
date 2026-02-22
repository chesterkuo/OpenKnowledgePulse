import { useState, useCallback, useRef } from "react";
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
        setFileError("Failed to read file");
      };
      reader.readAsText(file);
    } else if (file.name.endsWith(".docx") || file.name.endsWith(".pdf")) {
      setFileError(
        `Direct .${file.name.split(".").pop()} parsing is not available in the browser. ` +
        "Please copy and paste your document text into the text area below."
      );
    } else {
      // Try reading as text for other file types
      const reader = new FileReader();
      reader.onload = (e) => {
        setDocumentText(e.target?.result as string);
      };
      reader.onerror = () => {
        setFileError("Failed to read file. Try pasting the text directly.");
      };
      reader.readAsText(file);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileRead(file);
    },
    [handleFileRead]
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
    [handleFileRead]
  );

  const handleLLMConfigChange = useCallback(
    (field: keyof LLMConfig, value: string) => {
      setLlmConfig((prev) => {
        const next = { ...prev, [field]: value };
        saveLLMConfig(next);
        return next;
      });
    },
    []
  );

  const handleExtract = useCallback(async () => {
    if (!documentText.trim()) {
      setExtractError("Please provide document text to extract from.");
      return;
    }
    if (!llmConfig.apiKey) {
      setExtractError("Please provide an LLM API key.");
      return;
    }

    setExtracting(true);
    setExtractError(null);
    setExtractedTree(null);
    setExtractedJson("");

    try {
      const model = llmConfig.model || DEFAULT_MODELS[llmConfig.provider] || DEFAULT_MODELS.anthropic;

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
            `OpenAI API error: ${res.status}`
          );
        }
        const data = await res.json() as {
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
            `Anthropic API error: ${res.status}`
          );
        }
        const data = await res.json() as {
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
        throw new Error("Expected a JSON array of decision tree steps");
      }

      setExtractedTree(parsed);
      setExtractedJson(JSON.stringify(parsed, null, 2));
    } catch (err) {
      setExtractError(
        err instanceof Error ? err.message : "Extraction failed"
      );
    } finally {
      setExtracting(false);
    }
  }, [documentText, llmConfig]);

  const handleSave = useCallback(async () => {
    if (!extractedTree || extractedTree.length === 0) {
      setSaveError("No decision tree to save. Extract one first.");
      return;
    }
    if (!sopName.trim()) {
      setSaveError("Please provide an SOP name.");
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const sopData = {
        "@context": "https://knowledgepulse.dev/schema/v1",
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
      setSaveError(
        err instanceof Error ? err.message : "Failed to save SOP"
      );
    } finally {
      setSaving(false);
    }
  }, [extractedTree, sopName, domain, navigate]);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import Document</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload or paste a document to extract a decision tree using an LLM.
        </p>
      </div>

      {/* SOP Name and Domain */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">SOP Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="sop-name" className="block text-sm font-medium text-gray-700 mb-1">
              SOP Name
            </label>
            <input
              id="sop-name"
              type="text"
              value={sopName}
              onChange={(e) => setSopName(e.target.value)}
              placeholder="e.g., Customer Onboarding Process"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="sop-domain" className="block text-sm font-medium text-gray-700 mb-1">
              Domain
            </label>
            <input
              id="sop-domain"
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="e.g., customer-support"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* File Upload */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Document Source</h2>

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? "border-indigo-400 bg-indigo-50"
              : "border-gray-300 hover:border-gray-400"
          }`}
        >
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
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
          <p className="mt-2 text-sm text-gray-600">
            Drag and drop a file here, or{" "}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-indigo-600 hover:text-indigo-500 font-medium"
            >
              browse
            </button>
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Supports .txt files directly. For .docx and .pdf, paste content below.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.docx,.pdf,.md"
            onChange={handleFileSelect}
            className="hidden"
          />
          {fileName && (
            <p className="mt-3 text-sm text-gray-700">
              Selected: <span className="font-medium">{fileName}</span>
            </p>
          )}
        </div>

        {fileError && (
          <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <p className="text-sm text-yellow-800">{fileError}</p>
          </div>
        )}

        <div className="mt-4">
          <label htmlFor="document-text" className="block text-sm font-medium text-gray-700 mb-1">
            Document Text
          </label>
          <textarea
            id="document-text"
            value={documentText}
            onChange={(e) => setDocumentText(e.target.value)}
            placeholder="Paste your document text here..."
            rows={12}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <p className="mt-1 text-xs text-gray-400">
            {documentText.length > 0
              ? `${documentText.length.toLocaleString()} characters`
              : "No text provided yet"}
          </p>
        </div>
      </div>

      {/* LLM Configuration */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">LLM Configuration</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="llm-provider" className="block text-sm font-medium text-gray-700 mb-1">
              Provider
            </label>
            <select
              id="llm-provider"
              value={llmConfig.provider}
              onChange={(e) => handleLLMConfigChange("provider", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="anthropic">Anthropic</option>
              <option value="openai">OpenAI</option>
            </select>
          </div>
          <div>
            <label htmlFor="llm-api-key" className="block text-sm font-medium text-gray-700 mb-1">
              API Key
            </label>
            <input
              id="llm-api-key"
              type="password"
              value={llmConfig.apiKey}
              onChange={(e) => handleLLMConfigChange("apiKey", e.target.value)}
              placeholder="sk-..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="llm-model" className="block text-sm font-medium text-gray-700 mb-1">
              Model
            </label>
            <input
              id="llm-model"
              type="text"
              value={llmConfig.model}
              onChange={(e) => handleLLMConfigChange("model", e.target.value)}
              placeholder={DEFAULT_MODELS[llmConfig.provider] || ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
          className="inline-flex items-center px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
              Extracting...
            </>
          ) : (
            "Extract Decision Tree"
          )}
        </button>

        {extractError && (
          <p className="text-sm text-red-600">{extractError}</p>
        )}
      </div>

      {/* Extracted Decision Tree Preview */}
      {extractedJson && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Extracted Decision Tree
            </h2>
            <span className="text-sm text-gray-500">
              {extractedTree?.length || 0} step{(extractedTree?.length || 0) !== 1 ? "s" : ""}
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
                setExtractError("Invalid JSON in decision tree");
              }
            }}
            rows={16}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />

          {/* Save as Draft */}
          <div className="mt-4 flex items-center gap-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !extractedTree || !sopName.trim()}
              className="inline-flex items-center px-6 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? "Saving..." : "Save as Draft"}
            </button>
            {saveError && (
              <p className="text-sm text-red-600">{saveError}</p>
            )}
            {!sopName.trim() && extractedTree && (
              <p className="text-sm text-yellow-600">
                Please enter an SOP name above before saving.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
