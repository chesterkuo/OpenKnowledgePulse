import type { DecisionTreeStep } from "@/lib/sop-to-flow";

export const demoSOP: DecisionTreeStep[] = [
  {
    step: "Receive Ticket",
    instruction:
      "Acknowledge the customer support ticket within 5 minutes. Classify the issue by category (billing, technical, account) and severity level.",
    tool_suggestions: [
      { name: "Ticket Classifier", when: "New ticket arrives in queue" },
    ],
  },
  {
    step: "Assess Severity",
    instruction:
      "Evaluate the severity of the issue based on customer impact, number of affected users, and business criticality. Assign a priority level (P1-P4).",
    criteria: {
      "P1 - Critical": "Service outage affecting >100 users",
      "P2 - High": "Major feature broken for subset of users",
      "P3 - Medium": "Minor issue with available workaround",
    },
    conditions: {
      "P1/P2": { action: "Escalate to Engineering", sla_min: 15 },
      "P3/P4": { action: "Standard Resolution", sla_min: 120 },
    },
  },
  {
    step: "Escalate to Engineering",
    instruction:
      "Page on-call engineer via PagerDuty. Create an incident channel in Slack. Provide a summary of the issue, affected systems, and customer impact.",
    tool_suggestions: [
      { name: "PagerDuty", when: "P1/P2 escalation triggered" },
      { name: "Slack Bot", when: "Incident channel creation needed" },
    ],
  },
  {
    step: "Standard Resolution",
    instruction:
      "Follow the knowledge base playbook for the issue category. Apply the documented fix. If the playbook doesn't cover this scenario, draft a new article.",
    tool_suggestions: [
      { name: "KB Search", when: "Looking up resolution steps" },
    ],
  },
  {
    step: "Close & Follow Up",
    instruction:
      "Confirm resolution with the customer. Send satisfaction survey. Update the ticket with root cause analysis and resolution steps for future reference.",
  },
];
