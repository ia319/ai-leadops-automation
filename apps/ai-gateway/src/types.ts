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

export interface QualifyLeadRequest {
  readonly lead: NormalizedLead;
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

export interface CrmRecord {
  readonly lead_id: string;
  readonly received_at: string;
  readonly source: LeadSource;
  readonly name: string | null;
  readonly email: string | null;
  readonly phone: string | null;
  readonly company: string | null;
  readonly lead_type: LeadType;
  readonly intent: LeadIntent;
  readonly priority: LeadPriority;
  readonly lead_score: number;
  readonly service_requested: string | null;
  readonly pain_point: string | null;
  readonly lead_summary: string;
  readonly recommended_next_step: string;
  readonly pipeline_stage:
    | "New Lead"
    | "New Qualified Lead"
    | "Human Review"
    | "Low Priority"
    | "Spam";
  readonly follow_up_status: "Draft Created" | "Needs Review" | "No Action";
  readonly email_draft: string | null;
  readonly sms_draft: string | null;
  readonly booking_link: string | null;
  readonly status: "DRAFT_CREATED" | "NEEDS_REVIEW" | "NO_ACTION" | "FAILED";
  readonly error_code:
    | "INVALID_INPUT"
    | "MISSING_CONTACT_METHOD"
    | "MISSING_MESSAGE_CONTENT"
    | "UNSUPPORTED_SOURCE"
    | "AI_GATEWAY_FAILED"
    | "AI_PROVIDER_FAILED"
    | "AI_PARSE_FAILED"
    | "AI_SCHEMA_VALIDATION_FAILED"
    | "CRM_WRITE_FAILED"
    | "SLACK_NOTIFY_FAILED"
    | "GMAIL_DRAFT_FAILED"
    | "UNKNOWN_ERROR"
    | null;
}

export interface ApiErrorResponse {
  readonly status: "error";
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: Record<string, unknown>;
  };
}

export interface TokenUsage {
  readonly input_tokens: number;
  readonly output_tokens: number;
}

export interface QualificationResponse {
  readonly provider: string;
  readonly model: string;
  readonly output: AIQualificationOutput;
  readonly usage: TokenUsage;
}
