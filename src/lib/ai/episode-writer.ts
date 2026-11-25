/**
 * Drafts an episode's titles, show notes, chapters and clip ideas from its transcript,
 * using Claude. Shared with the processing jobs.
 */
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

export const WRITER_MODEL = "claude-opus-5-5";

const DraftSchema = z.object({
  titles: z.array(z.string()).describe("3 to 5 title options, best first. Specific and intriguing, under 80 characters, no clickbait."),
  summary: z.string().describe("One or two sentences describing the episode, for previews and social posts."),
  show_notes: z
    .string()
    .describe(
      "Show notes in Markdown: a short opening paragraph, then a bulleted 'In this episode' list of 4 to 8 key points. No timestamps, no links you weren't given.",
    ),
  chapters: z
    .array(z.object({ start: z.number().describe("Start time in whole seconds"), title: z.string().describe("Short chapter title, under 60 characters") }))
    .describe("Chapters in order. The first starts at 0. Aim for one every 5 to 15 minutes, following real topic changes."),
  keywords: z.array(z.string()).describe("5 to 10 topics or names discussed, for search."),
  clip_ideas: z
    .array(
      z.object({
        start: z.number().describe("Start time in whole seconds"),
        end: z.number().describe("End time in whole seconds, 20 to 90 seconds after start"),
        hook: z.string().describe("The caption or first line that makes someone stop scrolling"),
        why: z.string().describe("One sentence on why this moment works as a clip"),
      }),
    )
    .describe("3 to 8 self-contained moments that would work as short social clips."),
});

export type EpisodeDraft = z.infer<typeof DraftSchema>;

export type WriterContext = {
  showTitle: string;
  showDescription: string | null;
  category: string | null;
  language: string | null;
  durationSeconds: number | null;
  recentTitles: string[];
  hostNames: string | null;
};

const SYSTEM = `You write the publishing copy for podcast episodes: titles, show notes, chapters and clip ideas.

Write for listeners deciding whether to press play. Be specific about what is actually discussed, using the guests' names and concrete details from the transcript. Match the show's voice and language. Never invent facts, guests, links, sponsors or quotes that aren't in the transcript. Speaker labels in the transcript are numbers; use real names only when the transcript makes them clear.`;

/** Plain-text and token usage of one drafting run. */
export type DraftResult = { draft: EpisodeDraft; model: string; inputTokens: number; outputTokens: number };

export async function draftEpisodeCopy(transcript: string, ctx: WriterContext): Promise<DraftResult> {
  const client = new Anthropic();

  const showContext = [
    `Show: ${ctx.showTitle}`,
    ctx.showDescription && `About the show: ${ctx.showDescription.slice(0, 1500)}`,
    ctx.category && `Category: ${ctx.category}`,
    ctx.hostNames && `Host: ${ctx.hostNames}`,
    ctx.language && `Language: ${ctx.language} (write in this language)`,
    ctx.durationSeconds && `Episode length: ${Math.round(ctx.durationSeconds / 60)} minutes (${ctx.durationSeconds} seconds)`,
    ctx.recentTitles.length > 0 && `Recent episode titles, for style:\n${ctx.recentTitles.map((t) => `- ${t}`).join("\n")}`,
  ]
    .filter(Boolean)
    .join("\n");

  const response = await client.beta.messages.parse({
    model: WRITER_MODEL,
    max_tokens: 16000,
    // If a safety classifier declines (e.g. a health show discussing medicine), the API retries on a fallback model.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(DraftSchema) },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `${showContext}\n\n<transcript>\n${transcript}\n</transcript>\n\nWrite the titles, show notes, chapters, keywords and clip ideas for this episode.`,
      },
    ],
  });

  if (response.stop_reason === "refusal") throw new Error("The AI declined to write copy for this episode.");
  if (response.stop_reason === "max_tokens") throw new Error("The AI's draft was cut off.");
  const draft = response.parsed_output;
  if (!draft) throw new Error("The AI's draft couldn't be read.");

  // Keep chapters and clips inside the episode and in order.
  const limit = ctx.durationSeconds ?? Number.MAX_SAFE_INTEGER;
  draft.chapters = draft.chapters
    .map((c) => ({ start: Math.max(0, Math.round(c.start)), title: c.title.trim().slice(0, 120) }))
    .filter((c) => c.start < limit && c.title)
    .sort((a, b) => a.start - b.start);
  if (draft.chapters.length > 0) draft.chapters[0].start = 0;
  draft.clip_ideas = draft.clip_ideas
    .map((c) => ({ ...c, start: Math.max(0, Math.round(c.start)), end: Math.round(c.end) }))
    .filter((c) => c.end > c.start && c.start < limit);

  return {
    draft,
    model: response.model,
    inputTokens: response.usage.input_tokens + (response.usage.cache_read_input_tokens ?? 0) + (response.usage.cache_creation_input_tokens ?? 0),
    outputTokens: response.usage.output_tokens,
  };
}
