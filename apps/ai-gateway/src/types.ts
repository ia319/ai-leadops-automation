export type LeadSource =
  | "website_form"
  | "facebook_ad"
  | "missed_call_transcript";

export type LeadType =
  | "Sales Inquiry"
  | "Support Request"
  | "Partnership"
  | "Spam"
  | "Other";

export type LeadIntent =
  | "Book Consultation"
  | "Request Quote"
  | "Ask Question"
  | "Follow Up"
  | "Other";

export type LeadPriority = "High" | "Medium" | "Low";

export interface NormalizedLead {
  readonly lead_id: string;
  readonly source: LeadSource;
  readonly received_at: string;
  readonly contact: {
    readonly name?: string | null | undefined;
    readonly email?: string | null | undefined;
    readonly phone?: string | null | undefined;
    readonly company?: string | null | undefined;
  };
  readonly content: {
    readonly message?: string | null | undefined;
    readonly transcript?: string | null | undefined;
  };
  readonly metadata: {
    readonly campaign: string | null;
    readonly language: string;
    readonly external_id: string | null;
  };
  readonly raw_input: Record<string, unknown>;
}

export interface AIQualificationOutput {
  readonly lead_summary: string;
  readonly lead_type: LeadType;
  readonly intent: LeadIntent;
  readonly priority: LeadPriority;
  readonly lead_score: number;
  readonly service_requested: string | null;
  readonly pain_point: string | null;
  readonly recommended_next_step: string;
  readonly needs_human_followup: boolean;
  readonly suggested_email_reply: string;
  readonly suggested_sms_reply: string;
  readonly crm_fields: {
    readonly pipeline_stage:
      | "New Lead"
      | "New Qualified Lead"
      | "Human Review"
      | "Low Priority"
      | "Spam";
    readonly lead_source: string;
    readonly interest_area: string | null;
    readonly follow_up_status: "Draft Created" | "Needs Review" | "No Action";
  };
}

export interface QualificationResponse {
  readonly provider: string;
  readonly model: string;
  readonly output: AIQualificationOutput;
  readonly usage: {
    readonly input_tokens: number;
    readonly output_tokens: number;
  };
}
