/**
 * Turns show notes into the small HTML subset podcast apps display:
 * paragraphs, line breaks, **bold**, *italics*, "- " bullet lists and links.
 * Notes that are already HTML (imported from another host) pass through unchanged.
 */

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const looksLikeHtml = (s: string) => /<(p|br|a|ul|ol|li|strong|em|b|i|div|h\d)\b[^>]*>/i.test(s);

function inline(text: string): string {
  let out = escapeHtml(text);
  // [label](https://...)
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, label, url) => `<a href="${url}">${label}</a>`);
  // Bare links (not already inside an href)
  out = out.replace(/(^|[\s(])(https?:\/\/[^\s<)]*[^\s<).,;:!?])/g, (_, pre, url) => `${pre}<a href="${url}">${url}</a>`);
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
  return out;
}

export function showNotesHtml(notes: string | null | undefined): string {
  if (!notes) return "";
  if (looksLikeHtml(notes)) return notes;

  const blocks = notes.replace(/\r\n/g, "\n").trim().split(/\n{2,}/);
  return blocks
    .map((block) => {
      const lines = block.split("\n").filter((l) => l.trim());
      if (lines.length > 0 && lines.every((l) => /^\s*[-*•]\s+/.test(l))) {
        return `<ul>${lines.map((l) => `<li>${inline(l.replace(/^\s*[-*•]\s+/, ""))}</li>`).join("")}</ul>`;
      }
      // A heading-ish first line followed by bullets: "**In this episode**\n- a\n- b"
      const firstBullet = lines.findIndex((l) => /^\s*[-*•]\s+/.test(l));
      if (firstBullet > 0 && lines.slice(firstBullet).every((l) => /^\s*[-*•]\s+/.test(l))) {
        return (
          `<p>${lines.slice(0, firstBullet).map(inline).join("<br>")}</p>` +
          `<ul>${lines.slice(firstBullet).map((l) => `<li>${inline(l.replace(/^\s*[-*•]\s+/, ""))}</li>`).join("")}</ul>`
        );
      }
      return `<p>${lines.map(inline).join("<br>")}</p>`;
    })
    .join("");
}

/** Plain text for fields that don't allow HTML (e.g. itunes:summary). */
export const plainFromNotes = (notes: string | null | undefined) =>
  (notes ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\*\*|\*/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
