/** Transcription with Deepgram (pre-recorded audio from a URL). Shared with the processing jobs. */

export type TranscriptSegment = { start: number; end: number; speaker: number; text: string };
export type Transcript = { text: string; language: string | null; segments: TranscriptSegment[]; speakers: number };

type DeepgramResponse = {
  results?: {
    channels?: { detected_language?: string; alternatives?: { transcript?: string }[] }[];
    utterances?: { start: number; end: number; speaker?: number; transcript: string }[];
  };
};

/** Joins consecutive utterances by the same speaker so segments read like paragraphs. */
function mergeSegments(utterances: NonNullable<NonNullable<DeepgramResponse["results"]>["utterances"]>): TranscriptSegment[] {
  const out: TranscriptSegment[] = [];
  for (const u of utterances) {
    const speaker = u.speaker ?? 0;
    const last = out[out.length - 1];
    if (last && last.speaker === speaker && u.start - last.end < 2 && last.text.length < 1200) {
      last.end = u.end;
      last.text = `${last.text} ${u.transcript}`.trim();
    } else {
      out.push({ start: u.start, end: u.end, speaker, text: u.transcript.trim() });
    }
  }
  return out.filter((s) => s.text);
}

export async function transcribeUrl(audioUrl: string): Promise<Transcript> {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) throw new Error("DEEPGRAM_API_KEY is not set");

  const params = new URLSearchParams({
    model: "nova-3",
    smart_format: "true",
    punctuate: "true",
    diarize: "true",
    utterances: "true",
    paragraphs: "true",
    detect_language: "true",
  });
  const res = await fetch(`https://api.deepgram.com/v1/listen?${params}`, {
    method: "POST",
    headers: { Authorization: `Token ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url: audioUrl }),
    signal: AbortSignal.timeout(15 * 60 * 1000),
  });
  if (!res.ok) throw new Error(`Deepgram ${res.status}: ${(await res.text()).slice(0, 300)}`);

  const json = (await res.json()) as DeepgramResponse;
  const channel = json.results?.channels?.[0];
  const segments = mergeSegments(json.results?.utterances ?? []);
  return {
    text: channel?.alternatives?.[0]?.transcript ?? segments.map((s) => s.text).join(" "),
    language: channel?.detected_language ?? null,
    segments,
    speakers: new Set(segments.map((s) => s.speaker)).size,
  };
}

/** "[12:34] Speaker 2: ..." lines, the form the AI writer reads. */
export function transcriptForPrompt(segments: TranscriptSegment[]): string {
  const ts = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
  };
  return segments.map((s) => `[${ts(s.start)}] Speaker ${s.speaker + 1}: ${s.text}`).join("\n");
}
