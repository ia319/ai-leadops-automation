import { z } from "zod";

const optionalNullableText = z.string().nullable().optional();

export const normalizedLeadSchema = z
  .object({
    lead_id: z.string().min(1),
    source: z.enum(["website_form", "facebook_ad", "missed_call_transcript"]),
    received_at: z.string().datetime(),
    contact: z
      .object({
        name: optionalNullableText,
        email: z.string().email().nullable().optional(),
        phone: optionalNullableText,
        company: optionalNullableText
      })
      .strict()
      .refine((contact) => Boolean(contact.email || contact.phone), {
        message: "Provide at least one contact method"
      }),
    content: z
      .object({
        message: optionalNullableText,
        transcript: optionalNullableText
      })
      .strict()
      .refine((content) => Boolean(content.message || content.transcript), {
        message: "Provide message or transcript content"
      }),
    metadata: z
      .object({
        campaign: z.string().nullable(),
        language: z.string().min(2),
        external_id: z.string().nullable()
      })
      .strict(),
    raw_input: z.record(z.unknown())
  })
  .strict();

export const qualifyLeadRequestSchema = z
  .object({
    lead: normalizedLeadSchema
  })
  .strict();
