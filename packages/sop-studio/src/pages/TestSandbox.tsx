import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";

interface DecisionTreeStep {
  step: string;
  instruction: string;
  criteria?: Record<string, string>;
  conditions?: Record<string, { action: string; sla_min?: number }>;
  tool_suggestions?: Array<{ name: string; when: string }>;
}

interface StoredSOP {
  id: string;
  sop: {
    name: string;
    domain: string;
    decision_tree: DecisionTreeStep[];
  };
  version: number;
  status: string;
}

export default function TestSandbox() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [sop, setSop] = useState<StoredSOP | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([0]));
  const [conditionHistory, setConditionHistory] = useState<
    Array<{ stepIndex: number; condition: string; action: string }>
  >([]);
  const [finished, setFinished] = useState(false);

  // Load SOP from API
  useEffect(() => {
    if (!id) return;

    setLoading(true);
    setError(null);

    (api.getSOP(id) as Promise<{ data: StoredSOP }>)
      .then((res) => {
        setSop(res.data);
      })
      .catch((err: Error) => {
        setError(err.message || "Failed to load SOP");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  const decisionTree = sop?.sop.decision_tree || [];
  const currentStep = decisionTree[currentStepIndex] || null;
  const hasConditions = currentStep?.conditions && Object.keys(currentStep.conditions).length > 0;

  const findStepIndex = useCallback(
    (stepName: string): number => {
      return decisionTree.findIndex((s) => s.step === stepName);
    },
    [decisionTree],
  );

  const handleNextStep = useCallback(() => {
    if (currentStepIndex >= decisionTree.length - 1) {
      setFinished(true);
      return;
    }
    const nextIndex = currentStepIndex + 1;
    setCurrentStepIndex(nextIndex);
    setVisitedSteps((prev) => new Set(prev).add(nextIndex));
  }, [currentStepIndex, decisionTree.length]);

  const handleConditionSelect = useCallback(
    (conditionKey: string, action: string) => {
      const targetIndex = findStepIndex(action);

      setConditionHistory((prev) => [
        ...prev,
        {
          stepIndex: currentStepIndex,
          condition: conditionKey,
          action,
        },
      ]);

      if (targetIndex >= 0) {
        setCurrentStepIndex(targetIndex);
        setVisitedSteps((prev) => new Set(prev).add(targetIndex));
      } else {
        // Target step not found — advance to next step
        if (currentStepIndex < decisionTree.length - 1) {
          const nextIndex = currentStepIndex + 1;
          setCurrentStepIndex(nextIndex);
          setVisitedSteps((prev) => new Set(prev).add(nextIndex));
        } else {
          setFinished(true);
        }
      }
    },
    [currentStepIndex, decisionTree.length, findStepIndex],
  );

  const handleReset = useCallback(() => {
    setCurrentStepIndex(0);
    setVisitedSteps(new Set([0]));
    setConditionHistory([]);
    setFinished(false);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-kp-teal mx-auto mb-4" />
          <p className="text-kp-muted">Loading SOP...</p>
        </div>
      </div>
    );
  }

  if (error || !sop) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-kp-error mb-4">{error || "SOP not found"}</p>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="px-4 py-2 bg-kp-teal text-white rounded-md hover:bg-kp-teal/90 text-sm"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="text-sm text-kp-muted hover:text-kp-text mb-1"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-kp-heading">Test Sandbox</h1>
          <p className="text-sm text-kp-muted">
            {sop.sop.name} — {decisionTree.length} step
            {decisionTree.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center px-4 py-2 border border-kp-border text-sm font-medium rounded-md text-kp-text bg-kp-panel hover:bg-kp-navy"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Reset
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Steps Overview (sidebar) */}
        <div className="lg:col-span-1">
          <div className="bg-kp-panel rounded-lg border border-kp-border p-4">
            <h2 className="text-sm font-semibold text-kp-heading uppercase tracking-wider mb-3">
              Steps
            </h2>
            <div className="space-y-1">
              {decisionTree.map((step, index) => {
                const isCurrent = index === currentStepIndex && !finished;
                const isVisited = visitedSteps.has(index);

                return (
                  <div
                    key={step.step}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                      isCurrent
                        ? "bg-kp-blue/15 border border-kp-blue/30 text-kp-heading font-medium"
                        : isVisited
                          ? "bg-kp-green/10 text-kp-green"
                          : "text-kp-muted"
                    }`}
                  >
                    <span className="flex-shrink-0">
                      {isCurrent ? (
                        <span className="inline-block w-5 h-5 rounded-full bg-kp-blue text-white text-xs flex items-center justify-center font-bold">
                          {index + 1}
                        </span>
                      ) : isVisited ? (
                        <svg
                          className="w-5 h-5 text-kp-green"
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
                        <span className="inline-block w-5 h-5 rounded-full border-2 border-kp-border text-xs text-center leading-4 text-kp-muted">
                          {index + 1}
                        </span>
                      )}
                    </span>
                    <span className="truncate">{step.step}</span>
                  </div>
                );
              })}
            </div>

            {/* Test case status */}
            <div className="mt-4 pt-4 border-t border-kp-border">
              <h3 className="text-xs font-semibold text-kp-muted uppercase tracking-wider mb-2">
                Coverage
              </h3>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-kp-navy rounded-full h-2">
                  <div
                    className="bg-kp-teal h-2 rounded-full transition-all"
                    style={{
                      width: `${decisionTree.length > 0 ? (visitedSteps.size / decisionTree.length) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-kp-muted font-medium">
                  {visitedSteps.size}/{decisionTree.length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Current Step Detail */}
        <div className="lg:col-span-2 space-y-4">
          {finished ? (
            <div className="bg-kp-panel rounded-lg border border-kp-green/30 p-8 text-center">
              <svg
                className="mx-auto h-16 w-16 text-kp-green"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h2 className="mt-4 text-xl font-bold text-kp-heading">Test Complete</h2>
              <p className="mt-2 text-kp-muted">
                Visited {visitedSteps.size} of {decisionTree.length} steps (
                {decisionTree.length > 0
                  ? Math.round((visitedSteps.size / decisionTree.length) * 100)
                  : 0}
                % coverage)
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 bg-kp-teal text-white text-sm font-medium rounded-md hover:bg-kp-teal/90"
                >
                  Run Again
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/editor/${id}`)}
                  className="px-4 py-2 border border-kp-border text-sm font-medium rounded-md text-kp-text hover:bg-kp-panel"
                >
                  Open in Editor
                </button>
              </div>
            </div>
          ) : currentStep ? (
            <>
              {/* Step Card */}
              <div className="bg-kp-panel rounded-lg border border-kp-border p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-kp-blue/15 text-kp-blue mb-2">
                      Step {currentStepIndex + 1} of {decisionTree.length}
                    </span>
                    <h2 className="text-xl font-bold text-kp-heading">{currentStep.step}</h2>
                  </div>
                </div>

                <div className="prose prose-sm max-w-none">
                  <p className="text-kp-text whitespace-pre-wrap">{currentStep.instruction}</p>
                </div>

                {/* Criteria */}
                {currentStep.criteria && Object.keys(currentStep.criteria).length > 0 && (
                  <div className="mt-4 bg-kp-navy rounded-md p-4">
                    <h3 className="text-sm font-semibold text-kp-muted mb-2">Criteria</h3>
                    <dl className="space-y-1">
                      {Object.entries(currentStep.criteria).map(([key, value]) => (
                        <div key={key} className="flex gap-2 text-sm">
                          <dt className="font-medium text-kp-muted">{key}:</dt>
                          <dd className="text-kp-text">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}

                {/* Tool Suggestions */}
                {currentStep.tool_suggestions && currentStep.tool_suggestions.length > 0 && (
                  <div className="mt-4 bg-kp-green/10 rounded-md p-4">
                    <h3 className="text-sm font-semibold text-kp-green mb-2">Tool Suggestions</h3>
                    <ul className="space-y-1">
                      {currentStep.tool_suggestions.map((tool) => (
                        <li key={tool.name} className="flex items-start gap-2 text-sm">
                          <span className="font-medium text-kp-green">{tool.name}</span>
                          <span className="text-kp-text">— {tool.when}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="bg-kp-panel rounded-lg border border-kp-border p-6">
                {hasConditions ? (
                  <div>
                    <h3 className="text-sm font-semibold text-kp-heading mb-3">
                      Choose a condition to proceed:
                    </h3>
                    <div className="space-y-2">
                      {Object.entries(currentStep.conditions!).map(([condKey, condValue]) => (
                        <button
                          key={condKey}
                          type="button"
                          onClick={() => handleConditionSelect(condKey, condValue.action)}
                          className="w-full flex items-center justify-between px-4 py-3 border border-kp-border rounded-lg text-left hover:border-kp-teal/50 hover:bg-kp-teal/5 transition-colors group"
                        >
                          <div>
                            <span className="text-sm font-medium text-kp-heading group-hover:text-kp-teal">
                              {condKey}
                            </span>
                            <span className="block text-xs text-kp-muted mt-0.5">
                              Go to: {condValue.action}
                              {condValue.sla_min !== undefined &&
                                ` (SLA: ${condValue.sla_min} min)`}
                            </span>
                          </div>
                          <svg
                            className="w-4 h-4 text-kp-muted group-hover:text-kp-teal"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="inline-flex items-center px-5 py-2.5 bg-kp-teal text-white text-sm font-medium rounded-lg hover:bg-kp-teal/90 transition-colors"
                    >
                      {currentStepIndex >= decisionTree.length - 1 ? "Finish" : "Next Step"}
                      <svg
                        className="ml-2 w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-kp-panel rounded-lg border border-kp-border p-8 text-center">
              <p className="text-kp-muted">No decision tree steps found in this SOP.</p>
            </div>
          )}

          {/* Condition History */}
          {conditionHistory.length > 0 && (
            <div className="bg-kp-panel rounded-lg border border-kp-border p-4">
              <h3 className="text-sm font-semibold text-kp-heading mb-3">Decision History</h3>
              <div className="space-y-2">
                {conditionHistory.map((entry, index) => (
                  <div
                    key={`${entry.stepIndex}-${entry.condition}-${index}`}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-kp-navy text-kp-muted text-xs font-medium">
                      {index + 1}
                    </span>
                    <span className="text-kp-muted">
                      At{" "}
                      <span className="font-medium text-kp-heading">
                        {decisionTree[entry.stepIndex]?.step || `Step ${entry.stepIndex + 1}`}
                      </span>
                      , chose <span className="font-medium text-kp-teal">{entry.condition}</span>{" "}
                      &#8594; <span className="font-medium text-kp-heading">{entry.action}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
