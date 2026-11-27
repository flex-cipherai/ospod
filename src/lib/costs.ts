/**
 * Estimated unit costs of the services Ospod pays for, used by the admin console to
 * estimate spend. Check them against your invoices and update when prices change.
 */
export const UNIT_COSTS = {
  /** Claude Opus 5.5, per million tokens (Anthropic list price). */
  aiInputPerMillion: 4,
  aiOutputPerMillion: 20,
  /** Transcription per audio minute (ElevenLabs Scribe is billed per hour of audio; check your plan's rate). */
  transcriptionPerMinute: 0.0067,
  /** Cloudflare R2 storage, per GB-month (no download fees). */
  storagePerGbMonth: 0.015,
};

export function estimateCosts(totals: Partial<Record<string, number>>) {
  const ai =
    ((totals.ai_input_tokens ?? 0) / 1e6) * UNIT_COSTS.aiInputPerMillion +
    ((totals.ai_output_tokens ?? 0) / 1e6) * UNIT_COSTS.aiOutputPerMillion;
  const transcription = ((totals.transcription_seconds ?? 0) / 60) * UNIT_COSTS.transcriptionPerMinute;
  return { ai, transcription, total: ai + transcription };
}
