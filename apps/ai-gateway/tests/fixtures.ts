import { readFile } from "node:fs/promises";

import type { NormalizedLead } from "../src/types.js";

export async function readJsonFixture<T>(path: string): Promise<T> {
  const content = await readFile(path, "utf8");
  return JSON.parse(content) as T;
}

export function createNormalizedLead(
  overrides: Partial<NormalizedLead> = {},
): NormalizedLead {
  return {
    lead_id: "lead_test_001",
    source: "website_form",
    received_at: "2026-06-29T19:20:00Z",
    contact: {
      name: "Sarah Lee",
      email: "sarah@example.com",
      phone: "+15551234567",
      company: "GrowthPilot",
    },
    content: {
      message:
        "We need help automating appointment booking and lead follow-up.",
      transcript: null,
    },
    metadata: {
      campaign: null,
      language: "en",
      external_id: null,
    },
    raw_input: {},
    ...overrides,
  };
}
