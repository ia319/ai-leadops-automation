import type { AIQualificationOutput, NormalizedLead } from "../types.js";
import type { AIProvider, AIProviderConfig } from "./types.js";

export class MockProvider implements AIProvider {
  private readonly config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = config;
  }

  async qualifyLead(input: NormalizedLead): Promise<AIQualificationOutput> {
    const text =
      `${input.content.message ?? ""} ${input.content.transcript ?? ""}`.toLowerCase();

    if (containsAny(text, ["spam", "unsubscribe", "crypto giveaway"])) {
      return this.buildLowPriorityOutput(input);
    }

    if (
      containsAny(text, [
        "book",
        "booking",
        "appointment",
        "consultation",
        "quote",
        "call me back",
      ])
    ) {
      return this.buildHighPriorityOutput(input);
    }

    return this.buildMediumPriorityOutput(input);
  }

  get model(): string {
    return this.config.model;
  }

  private buildHighPriorityOutput(
    input: NormalizedLead,
  ): AIQualificationOutput {
    return {
      lead_summary:
        "The lead wants help with booking, quoting, or follow-up automation.",
      lead_type: "Sales Inquiry",
      intent: input.content.transcript ? "Request Quote" : "Book Consultation",
      priority: "High",
      lead_score: 86,
      service_requested: input.content.transcript
        ? "Service quote"
        : "Appointment booking automation",
      pain_point: "Manual scheduling and delayed follow-up",
      recommended_next_step:
        "Send a booking link and ask about current scheduling tools.",
      needs_human_followup: true,
      suggested_email_reply:
        "Hi, thanks for reaching out. I can help review your booking and follow-up process. Could you share what tools you currently use?",
      suggested_sms_reply:
        "Hi, thanks for reaching out. I can help with booking and follow-up automation. Would you like to schedule a quick consultation?",
      crm_fields: {
        pipeline_stage: "New Qualified Lead",
        lead_source: input.source,
        interest_area: "Automation consulting",
        follow_up_status: "Draft Created",
      },
    };
  }

  private buildMediumPriorityOutput(
    input: NormalizedLead,
  ): AIQualificationOutput {
    return {
      lead_summary: "The lead shows general interest in automation.",
      lead_type: "Sales Inquiry",
      intent: "Ask Question",
      priority: "Medium",
      lead_score: 58,
      service_requested: "Customer follow-up automation",
      pain_point: "Manual follow-up process",
      recommended_next_step:
        "Ask about current follow-up volume and target response time.",
      needs_human_followup: false,
      suggested_email_reply:
        "Hi, thanks for reaching out. I can help review your current follow-up process and identify automation opportunities.",
      suggested_sms_reply:
        "Hi, thanks for your interest. Could you share your current lead volume and follow-up process?",
      crm_fields: {
        pipeline_stage: "New Lead",
        lead_source: input.source,
        interest_area: "Automation consulting",
        follow_up_status: "Needs Review",
      },
    };
  }

  private buildLowPriorityOutput(input: NormalizedLead): AIQualificationOutput {
    return {
      lead_summary:
        "The message does not show a clear service request or buying intent.",
      lead_type: "Other",
      intent: "Other",
      priority: "Low",
      lead_score: 22,
      service_requested: null,
      pain_point: null,
      recommended_next_step:
        "Review manually only if additional context appears.",
      needs_human_followup: false,
      suggested_email_reply:
        "Hi, thanks for reaching out. Please send more detail about the service you need so we can route your request correctly.",
      suggested_sms_reply:
        "Thanks for reaching out. Please send more detail about the service you need.",
      crm_fields: {
        pipeline_stage: "Low Priority",
        lead_source: input.source,
        interest_area: null,
        follow_up_status: "No Action",
      },
    };
  }
}

function containsAny(value: string, needles: readonly string[]): boolean {
  return needles.some((needle) => value.includes(needle));
}
