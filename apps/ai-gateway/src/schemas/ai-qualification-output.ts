import { z } from "zod";

export const aiQualificationOutputSchema = z
  .object({
    lead_summary: z.string().min(1),
    lead_type: z.enum([
      "Sales Inquiry",
      "Support Request",
      "Partnership",
      "Spam",
      "Other",
    ]),
    intent: z.enum([
      "Book Consultation",
      "Request Quote",
      "Ask Question",
      "Follow Up",
      "Other",
    ]),
    priority: z.enum(["High", "Medium", "Low"]),
    lead_score: z.number().int().min(0).max(100),
    service_requested: z.string().nullable(),
    pain_point: z.string().nullable(),
    recommended_next_step: z.string().min(1),
    needs_human_followup: z.boolean(),
    suggested_email_reply: z.string().min(1),
    suggested_sms_reply: z.string().min(1).max(240),
    crm_fields: z
      .object({
        pipeline_stage: z.enum([
          "New Lead",
          "New Qualified Lead",
          "Human Review",
          "Low Priority",
          "Spam",
        ]),
        lead_source: z.string().min(1),
        interest_area: z.string().nullable(),
        follow_up_status: z.enum([
          "Draft Created",
          "Needs Review",
          "No Action",
        ]),
      })
      .strict(),
  })
  .strict();
