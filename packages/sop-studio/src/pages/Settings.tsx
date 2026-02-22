import { useState, useCallback } from "react";

interface RegistryConfig {
  url: string;
  apiKey: string;
}

interface LLMConfig {
  provider: string;
  apiKey: string;
  model: string;
}

function loadRegistryConfig(): RegistryConfig {
  return {
    url: localStorage.getItem("kp_registry_url") || "",
    apiKey: localStorage.getItem("kp_api_key") || "",
  };
}

function loadLLMConfig(): LLMConfig {
  return {
    provider: localStorage.getItem("kp_llm_provider") || "anthropic",
    apiKey: localStorage.getItem("kp_llm_api_key") || "",
    model: localStorage.getItem("kp_llm_model") || "",
  };
}

export default function Settings() {
  const [registry, setRegistry] = useState<RegistryConfig>(loadRegistryConfig);
  const [llm, setLlm] = useState<LLMConfig>(loadLLMConfig);

  const [registrySaved, setRegistrySaved] = useState(false);
  const [llmSaved, setLlmSaved] = useState(false);

  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");

  // Registry config handlers
  const handleRegistrySave = useCallback(() => {
    localStorage.setItem("kp_registry_url", registry.url);
    localStorage.setItem("kp_api_key", registry.apiKey);
    setRegistrySaved(true);
    setTimeout(() => setRegistrySaved(false), 3000);
  }, [registry]);

  const handleTestConnection = useCallback(async () => {
    setTestStatus("testing");
    setTestMessage("");

    const baseUrl = registry.url || "";

    try {
      const res = await fetch(`${baseUrl}/health`, {
        method: "GET",
        headers: {
          ...(registry.apiKey && { Authorization: `Bearer ${registry.apiKey}` }),
        },
      });

      if (res.ok) {
        const data = await res.json().catch(() => null);
        setTestStatus("success");
        setTestMessage(
          data
            ? `Connected successfully. Status: ${(data as { status?: string }).status || "ok"}`
            : "Connected successfully."
        );
      } else {
        setTestStatus("error");
        setTestMessage(`Connection failed: HTTP ${res.status} ${res.statusText}`);
      }
    } catch (err) {
      setTestStatus("error");
      setTestMessage(
        `Connection failed: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  }, [registry]);

  // LLM config handlers
  const handleLlmSave = useCallback(() => {
    localStorage.setItem("kp_llm_provider", llm.provider);
    localStorage.setItem("kp_llm_api_key", llm.apiKey);
    localStorage.setItem("kp_llm_model", llm.model);
    setLlmSaved(true);
    setTimeout(() => setLlmSaved(false), 3000);
  }, [llm]);

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure your registry connection and LLM preferences.
        </p>
      </div>

      {/* Registry Connection */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Registry Connection
        </h2>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="registry-url"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Registry URL
            </label>
            <input
              id="registry-url"
              type="url"
              value={registry.url}
              onChange={(e) => setRegistry((prev) => ({ ...prev, url: e.target.value }))}
              placeholder="http://localhost:8080"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <p className="mt-1 text-xs text-gray-400">
              Leave empty to use the dev proxy (recommended for local development).
            </p>
          </div>

          <div>
            <label
              htmlFor="registry-api-key"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              API Key
            </label>
            <input
              id="registry-api-key"
              type="password"
              value={registry.apiKey}
              onChange={(e) => setRegistry((prev) => ({ ...prev, apiKey: e.target.value }))}
              placeholder="Enter your API key"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleRegistrySave}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              Save
            </button>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testStatus === "testing"}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
            >
              {testStatus === "testing" ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500"
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
                  Testing...
                </>
              ) : (
                "Test Connection"
              )}
            </button>
            {registrySaved && (
              <span className="text-sm text-green-600 font-medium">
                Saved
              </span>
            )}
          </div>

          {/* Test result */}
          {testStatus !== "idle" && testStatus !== "testing" && (
            <div
              className={`rounded-md p-3 ${
                testStatus === "success"
                  ? "bg-green-50 border border-green-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              <div className="flex items-start gap-2">
                {testStatus === "success" ? (
                  <svg
                    className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                )}
                <p
                  className={`text-sm ${
                    testStatus === "success" ? "text-green-700" : "text-red-700"
                  }`}
                >
                  {testMessage}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* LLM Configuration */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          LLM Configuration
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Configure the LLM provider used for document extraction on the Import page.
        </p>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="llm-provider"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Provider
            </label>
            <select
              id="llm-provider"
              value={llm.provider}
              onChange={(e) => setLlm((prev) => ({ ...prev, provider: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="anthropic">Anthropic</option>
              <option value="openai">OpenAI</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="llm-api-key"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              API Key
            </label>
            <input
              id="llm-api-key"
              type="password"
              value={llm.apiKey}
              onChange={(e) => setLlm((prev) => ({ ...prev, apiKey: e.target.value }))}
              placeholder={llm.provider === "openai" ? "sk-..." : "sk-ant-..."}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label
              htmlFor="llm-model"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Model Override
            </label>
            <input
              id="llm-model"
              type="text"
              value={llm.model}
              onChange={(e) => setLlm((prev) => ({ ...prev, model: e.target.value }))}
              placeholder={
                llm.provider === "openai"
                  ? "gpt-4o (default)"
                  : "claude-sonnet-4-20250514 (default)"
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <p className="mt-1 text-xs text-gray-400">
              Leave empty to use the default model for the selected provider.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleLlmSave}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              Save
            </button>
            {llmSaved && (
              <span className="text-sm text-green-600 font-medium">
                Saved
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
        <h2 className="text-lg font-semibold text-red-900 mb-4">
          Danger Zone
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">
              Clear all settings
            </p>
            <p className="text-xs text-gray-500">
              Remove all stored configuration from localStorage.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  "Are you sure you want to clear all settings? This cannot be undone."
                )
              ) {
                localStorage.removeItem("kp_registry_url");
                localStorage.removeItem("kp_api_key");
                localStorage.removeItem("kp_llm_provider");
                localStorage.removeItem("kp_llm_api_key");
                localStorage.removeItem("kp_llm_model");
                setRegistry({ url: "", apiKey: "" });
                setLlm({ provider: "anthropic", apiKey: "", model: "" });
                setTestStatus("idle");
                setTestMessage("");
              }
            }}
            className="px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>
    </div>
  );
}
