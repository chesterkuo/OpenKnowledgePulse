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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading SOP...</p>
        </div>
      </div>
    );
  }

  if (error || !sop) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || "SOP not found"}</p>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
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
            className="text-sm text-gray-500 hover:text-gray-700 mb-1"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Test Sandbox</h1>
          <p className="text-sm text-gray-500">
            {sop.sop.name} — {decisionTree.length} step
            {decisionTree.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
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
                        ? "bg-indigo-50 border border-indigo-200 text-indigo-900 font-medium"
                        : isVisited
                          ? "bg-green-50 text-green-800"
                          : "text-gray-500"
                    }`}
                  >
                    <span className="flex-shrink-0">
                      {isCurrent ? (
                        <span className="inline-block w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">
                          {index + 1}
                        </span>
                      ) : isVisited ? (
                        <svg
                          className="w-5 h-5 text-green-600"
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
                        <span className="inline-block w-5 h-5 rounded-full border-2 border-gray-300 text-xs text-center leading-4 text-gray-400">
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
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Coverage
              </h3>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${decisionTree.length > 0 ? (visitedSteps.size / decisionTree.length) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-gray-600 font-medium">
                  {visitedSteps.size}/{decisionTree.length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Current Step Detail */}
        <div className="lg:col-span-2 space-y-4">
          {finished ? (
            <div className="bg-white rounded-lg shadow-sm border border-green-200 p-8 text-center">
              <svg
                className="mx-auto h-16 w-16 text-green-500"
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
              <h2 className="mt-4 text-xl font-bold text-gray-900">Test Complete</h2>
              <p className="mt-2 text-gray-500">
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
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700"
                >
                  Run Again
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/editor/${id}`)}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Open in Editor
                </button>
              </div>
            </div>
          ) : currentStep ? (
            <>
              {/* Step Card */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 mb-2">
                      Step {currentStepIndex + 1} of {decisionTree.length}
                    </span>
                    <h2 className="text-xl font-bold text-gray-900">{currentStep.step}</h2>
                  </div>
                </div>

                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap">{currentStep.instruction}</p>
                </div>

                {/* Criteria */}
                {currentStep.criteria && Object.keys(currentStep.criteria).length > 0 && (
                  <div className="mt-4 bg-gray-50 rounded-md p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Criteria</h3>
                    <dl className="space-y-1">
                      {Object.entries(currentStep.criteria).map(([key, value]) => (
                        <div key={key} className="flex gap-2 text-sm">
                          <dt className="font-medium text-gray-600">{key}:</dt>
                          <dd className="text-gray-700">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}

                {/* Tool Suggestions */}
                {currentStep.tool_suggestions && currentStep.tool_suggestions.length > 0 && (
                  <div className="mt-4 bg-green-50 rounded-md p-4">
                    <h3 className="text-sm font-semibold text-green-800 mb-2">Tool Suggestions</h3>
                    <ul className="space-y-1">
                      {currentStep.tool_suggestions.map((tool) => (
                        <li key={tool.name} className="flex items-start gap-2 text-sm">
                          <span className="font-medium text-green-700">{tool.name}</span>
                          <span className="text-green-600">— {tool.when}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                {hasConditions ? (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                      Choose a condition to proceed:
                    </h3>
                    <div className="space-y-2">
                      {Object.entries(currentStep.conditions!).map(([condKey, condValue]) => (
                        <button
                          key={condKey}
                          type="button"
                          onClick={() => handleConditionSelect(condKey, condValue.action)}
                          className="w-full flex items-center justify-between px-4 py-3 border border-gray-200 rounded-lg text-left hover:border-indigo-300 hover:bg-indigo-50 transition-colors group"
                        >
                          <div>
                            <span className="text-sm font-medium text-gray-900 group-hover:text-indigo-700">
                              {condKey}
                            </span>
                            <span className="block text-xs text-gray-500 mt-0.5">
                              Go to: {condValue.action}
                              {condValue.sla_min !== undefined &&
                                ` (SLA: ${condValue.sla_min} min)`}
                            </span>
                          </div>
                          <svg
                            className="w-4 h-4 text-gray-400 group-hover:text-indigo-500"
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
                      className="inline-flex items-center px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
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
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <p className="text-gray-500">No decision tree steps found in this SOP.</p>
            </div>
          )}

          {/* Condition History */}
          {conditionHistory.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Decision History</h3>
              <div className="space-y-2">
                {conditionHistory.map((entry, index) => (
                  <div
                    key={`${entry.stepIndex}-${entry.condition}-${index}`}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                      {index + 1}
                    </span>
                    <span className="text-gray-600">
                      At{" "}
                      <span className="font-medium text-gray-800">
                        {decisionTree[entry.stepIndex]?.step || `Step ${entry.stepIndex + 1}`}
                      </span>
                      , chose <span className="font-medium text-indigo-600">{entry.condition}</span>{" "}
                      &#8594; <span className="font-medium text-gray-800">{entry.action}</span>
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
