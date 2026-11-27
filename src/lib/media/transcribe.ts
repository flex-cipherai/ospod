/**
 * Transcription of pre-recorded audio from a URL, with speakers. Shared with the processing jobs.
 * Uses ElevenLabs Scribe when ELEVENLABS_API_KEY is set, otherwise Deepgram.
 */

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

export function transcriptionProvider(): "elevenlabs" | "deepgram" | null {
  if (process.env.ELEVENLABS_API_KEY) return "elevenlabs";
  if (process.env.DEEPGRAM_API_KEY) return "deepgram";
  return null;
}

export async function transcribeUrl(audioUrl: string): Promise<Transcript> {
  const provider = transcriptionProvider();
  if (provider === "elevenlabs") return transcribeWithElevenLabs(audioUrl);
  if (provider === "deepgram") return transcribeWithDeepgram(audioUrl);
  throw new Error("No transcription service is configured (ELEVENLABS_API_KEY or DEEPGRAM_API_KEY)");
}

// ---------------------------------------------------------------------------
// ElevenLabs Scribe
// ---------------------------------------------------------------------------

type ScribeWord = { text: string; type: "word" | "spacing" | "audio_event"; start?: number | null; end?: number | null; speaker_id?: string | null };
type ScribeResponse = { language_code?: string; text?: string; words?: ScribeWord[] };

/** Groups Scribe's words into speaker paragraphs: a new segment on a speaker change, a long pause, or a long paragraph. */
export function segmentsFromWords(words: ScribeWord[]): TranscriptSegment[] {
  const out: TranscriptSegment[] = [];
  for (const w of words) {
    if (w.type === "audio_event") continue;
    const speaker = Number(/(\d+)$/.exec(w.speaker_id ?? "")?.[1] ?? 0);
    const last = out[out.length - 1];
    if (w.type === "spacing") {
      if (last) last.text += " ";
      continue;
    }
    const start = w.start ?? last?.end ?? 0;
    const end = w.end ?? start;
    const sentenceEnded = last ? /[.!?]\s*$/.test(last.text) : false;
    if (last && last.speaker === speaker && start - last.end < 2 && !(sentenceEnded && last.text.length > 1200)) {
      last.text += w.text;
      last.end = end;
    } else {
      out.push({ start, end, speaker, text: w.text });
    }
  }
  return out.map((s) => ({ ...s, text: s.text.replace(/\s+/g, " ").trim() })).filter((s) => s.text);
}

async function transcribeWithElevenLabs(audioUrl: string): Promise<Transcript> {
  const form = new FormData();
  form.set("model_id", process.env.ELEVENLABS_STT_MODEL || "scribe_v2");
  form.set("source_url", audioUrl);
  form.set("diarize", "true");
  form.set("timestamps_granularity", "word");
  form.set("tag_audio_events", "false");
  const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY! },
    body: form,
    signal: AbortSignal.timeout(30 * 60 * 1000),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = (await res.json()) as ScribeResponse;
  const segments = segmentsFromWords(json.words ?? []);
  return {
    text: json.text ?? segments.map((s) => s.text).join(" "),
    language: json.language_code ?? null,
    segments,
    speakers: new Set(segments.map((s) => s.speaker)).size,
  };
}

// ---------------------------------------------------------------------------
// Deepgram
// ---------------------------------------------------------------------------

async function transcribeWithDeepgram(audioUrl: string): Promise<Transcript> {
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
