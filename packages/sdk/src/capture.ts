import { evaluateValue } from "./scoring.js";
import type {
  PrivacyLevel,
  ReasoningTrace,
  ReasoningTraceStep,
  Visibility,
} from "./types/knowledge-unit.js";
import { KP_CONTEXT } from "./types/knowledge-unit.js";
import { generateTraceId } from "./utils/id.js";
import { cleanPii } from "./utils/pii-cleaner.js";

export interface CaptureConfig {
  autoCapture?: boolean; // default true
  valueThreshold?: number; // default 0.75
  privacyLevel?: PrivacyLevel; // default "aggregated"
  visibility?: Visibility; // default "network"
  domain: string; // required
  registryUrl?: string; // default https://registry.openknowledgepulse.org
  apiKey?: string;
}

export class KPCapture {
  private config: Required<
    Pick<CaptureConfig, "autoCapture" | "valueThreshold" | "privacyLevel" | "visibility" | "domain">
  > &
    CaptureConfig;

  constructor(config: CaptureConfig) {
    this.config = {
      autoCapture: true,
      valueThreshold: 0.75,
      privacyLevel: "aggregated",
      visibility: "network",
      ...config,
    };
  }

  /**
   * Wrap an agent function to transparently capture knowledge.
   * The wrapper records execution trace, scores it, and async-contributes if above threshold.
   */
  wrap<T extends (...args: unknown[]) => Promise<unknown>>(agentFn: T): T {
    return (async (...args: unknown[]) => {
      if (!this.config.autoCapture) {
        return agentFn(...args);
      }

      const traceId = generateTraceId();
      const startTime = Date.now();
      const steps: ReasoningTraceStep[] = [];

      // Record a thought step with the input
      steps.push({
        step_id: 0,
        type: "thought",
        content: `Executing with args: ${JSON.stringify(args).slice(0, 200)}`,
      });

      let success = true;
      let result: unknown;
      try {
        result = await agentFn(...args);
        steps.push({
          step_id: steps.length,
          type: "observation",
          content: "Execution completed successfully",
          latency_ms: Date.now() - startTime,
        });
      } catch (error) {
        success = false;
        steps.push({
          step_id: steps.length,
          type: "error_recovery",
          content: `Error: ${error instanceof Error ? error.message : String(error)}`,
          latency_ms: Date.now() - startTime,
        });
        throw error;
      } finally {
        // Fire-and-forget: score and contribute asynchronously
        const trace: ReasoningTrace = {
          "@context": KP_CONTEXT,
          "@type": "ReasoningTrace",
          id: traceId,
          metadata: {
            created_at: new Date().toISOString(),
            task_domain: this.config.domain,
            success,
            quality_score: 0, // placeholder, scored below
            visibility: this.config.visibility,
            privacy_level: this.config.privacyLevel,
          },
          task: {
            objective: `Agent execution in ${this.config.domain}`,
          },
          steps,
          outcome: {
            result_summary: success ? "Completed" : "Failed",
            confidence: success ? 0.8 : 0.2,
          },
        };

        // Non-blocking scoring + contribution
        void this.scoreAndContribute(trace).catch(() => {
          // Silently ignore — must not affect agent execution
        });
      }

      return result;
    }) as T;
  }

  private async scoreAndContribute(trace: ReasoningTrace): Promise<void> {
    const score = await evaluateValue(trace);
    trace.metadata.quality_score = score;

    if (score < this.config.valueThreshold) return;

    // Clean PII from trace steps before contributing
    for (const step of trace.steps) {
      if (step.content) {
        step.content = cleanPii(step.content, trace.metadata.privacy_level).cleaned;
      }
      if (step.output_summary) {
        step.output_summary = cleanPii(step.output_summary, trace.metadata.privacy_level).cleaned;
      }
      if (step.input) {
        const inputStr = JSON.stringify(step.input);
        const cleanedInput = cleanPii(inputStr, trace.metadata.privacy_level).cleaned;
        try {
          step.input = JSON.parse(cleanedInput);
        } catch {
          /* keep original if parse fails */
        }
      }
    }

    const url = this.config.registryUrl ?? "https://registry.openknowledgepulse.org";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.config.apiKey) {
      headers.Authorization = `Bearer ${this.config.apiKey}`;
    }

    await fetch(`${url}/v1/knowledge`, {
      method: "POST",
      headers,
      body: JSON.stringify(trace),
    });
  }
}
