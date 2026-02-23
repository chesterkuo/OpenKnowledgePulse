import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { LLM_PROVIDERS, getProvider } from "../lib/llm-providers";

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
  const { t } = useTranslation();
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
            ? t("settings.connectedStatus", { status: (data as { status?: string }).status || "ok" })
            : t("settings.connectedSuccess"),
        );
      } else {
        setTestStatus("error");
        setTestMessage(t("settings.connectionFailed", { status: res.status, statusText: res.statusText }));
      }
    } catch (err) {
      setTestStatus("error");
      setTestMessage(t("settings.connectionError", { error: err instanceof Error ? err.message : "Unknown error" }));
    }
  }, [registry, t]);

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
        <h1 className="text-2xl font-bold text-kp-heading">{t("settings.title")}</h1>
        <p className="mt-1 text-sm text-kp-muted">
          {t("settings.subtitle")}
        </p>
      </div>

      {/* Registry Connection */}
      <div className="bg-kp-panel rounded-lg border border-kp-border p-6">
        <h2 className="text-lg font-semibold text-kp-heading mb-4">{t("settings.registryConnection")}</h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="registry-url" className="block text-sm font-medium text-kp-muted mb-1">
              {t("settings.registryUrl")}
            </label>
            <input
              id="registry-url"
              type="url"
              value={registry.url}
              onChange={(e) => setRegistry((prev) => ({ ...prev, url: e.target.value }))}
              placeholder={t("settings.registryUrlPlaceholder")}
              className="w-full px-3 py-2 bg-kp-navy border border-kp-border text-kp-text rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-kp-teal focus:border-kp-teal placeholder:text-kp-muted/50"
            />
            <p className="mt-1 text-xs text-kp-muted/60">
              {t("settings.registryUrlHelp")}
            </p>
          </div>

          <div>
            <label
              htmlFor="registry-api-key"
              className="block text-sm font-medium text-kp-muted mb-1"
            >
              {t("settings.apiKey")}
            </label>
            <input
              id="registry-api-key"
              type="password"
              value={registry.apiKey}
              onChange={(e) => setRegistry((prev) => ({ ...prev, apiKey: e.target.value }))}
              placeholder={t("settings.apiKeyPlaceholder")}
              className="w-full px-3 py-2 bg-kp-navy border border-kp-border text-kp-text rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-kp-teal focus:border-kp-teal placeholder:text-kp-muted/50"
            />
            <p className="mt-1 text-xs text-kp-muted/60">
              {t("settings.apiKeyHelp")}
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleRegistrySave}
              className="inline-flex items-center px-4 py-2 bg-kp-teal text-white text-sm font-medium rounded-md hover:bg-kp-teal/90 transition-colors"
            >
              {t("common.save")}
            </button>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testStatus === "testing"}
              className="inline-flex items-center px-4 py-2 border border-kp-border text-sm font-medium rounded-md text-kp-text bg-kp-navy hover:bg-kp-panel disabled:opacity-50 transition-colors"
            >
              {testStatus === "testing" ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-kp-muted"
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
                  {t("settings.testing")}
                </>
              ) : (
                t("settings.testConnection")
              )}
            </button>
            {registrySaved && <span className="text-sm text-kp-green font-medium">{t("common.saved")}</span>}
          </div>

          {/* Test result */}
          {testStatus !== "idle" && testStatus !== "testing" && (
            <div
              className={`rounded-md p-3 ${
                testStatus === "success"
                  ? "bg-kp-green/10 border border-kp-green/30"
                  : "bg-kp-error/10 border border-kp-error/30"
              }`}
            >
              <div className="flex items-start gap-2">
                {testStatus === "success" ? (
                  <svg
                    className="w-5 h-5 text-kp-green flex-shrink-0 mt-0.5"
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
                    className="w-5 h-5 text-kp-error flex-shrink-0 mt-0.5"
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
                    testStatus === "success" ? "text-kp-green" : "text-kp-error"
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
      <div className="bg-kp-panel rounded-lg border border-kp-border p-6">
        <h2 className="text-lg font-semibold text-kp-heading mb-4">{t("settings.llmConfig")}</h2>
        <p className="text-sm text-kp-muted mb-4">
          {t("settings.llmConfigDesc")}
        </p>

        <div className="space-y-4">
          <div>
            <label htmlFor="llm-provider" className="block text-sm font-medium text-kp-muted mb-1">
              {t("settings.provider")}
            </label>
            <select
              id="llm-provider"
              value={llm.provider}
              onChange={(e) => setLlm((prev) => ({ ...prev, provider: e.target.value }))}
              className="w-full px-3 py-2 bg-kp-navy border border-kp-border text-kp-text rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-kp-teal focus:border-kp-teal"
            >
              {LLM_PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="llm-api-key" className="block text-sm font-medium text-kp-muted mb-1">
              {t("settings.apiKeyLabel")}
            </label>
            <input
              id="llm-api-key"
              type="password"
              value={llm.apiKey}
              onChange={(e) => setLlm((prev) => ({ ...prev, apiKey: e.target.value }))}
              placeholder={getProvider(llm.provider).keyPlaceholder || "..."}
              className="w-full px-3 py-2 bg-kp-navy border border-kp-border text-kp-text rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-kp-teal focus:border-kp-teal placeholder:text-kp-muted/50"
            />
          </div>

          <div>
            <label htmlFor="llm-model" className="block text-sm font-medium text-kp-muted mb-1">
              {t("settings.modelOverride")}
            </label>
            <input
              id="llm-model"
              type="text"
              value={llm.model}
              onChange={(e) => setLlm((prev) => ({ ...prev, model: e.target.value }))}
              placeholder={`${getProvider(llm.provider).defaultModel} (default)`}
              className="w-full px-3 py-2 bg-kp-navy border border-kp-border text-kp-text rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-kp-teal focus:border-kp-teal placeholder:text-kp-muted/50"
            />
            <p className="mt-1 text-xs text-kp-muted/60">
              {t("settings.modelOverrideHelp")}
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleLlmSave}
              className="inline-flex items-center px-4 py-2 bg-kp-teal text-white text-sm font-medium rounded-md hover:bg-kp-teal/90 transition-colors"
            >
              {t("common.save")}
            </button>
            {llmSaved && <span className="text-sm text-kp-green font-medium">{t("common.saved")}</span>}
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-kp-panel rounded-lg border border-kp-error/30 p-6">
        <h2 className="text-lg font-semibold text-kp-error mb-4">{t("settings.dangerZone")}</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-kp-heading">{t("settings.clearAllSettings")}</p>
            <p className="text-xs text-kp-muted">
              {t("settings.clearAllDesc")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(t("settings.clearConfirm"))
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
            className="px-4 py-2 border border-kp-error/50 text-sm font-medium rounded-md text-kp-error hover:bg-kp-error/10 transition-colors"
          >
            {t("settings.clearAll")}
          </button>
        </div>
      </div>
    </div>
  );
}
