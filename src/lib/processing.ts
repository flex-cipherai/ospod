/** A queued episode that hasn't started after this long is treated as stuck and can be retried. */
export const STUCK_AFTER_MS = 3 * 60 * 1000;

export function isStuck(stage: string | null, updatedAt: string | null): boolean {
  if (stage !== "queued" || !updatedAt) return false;
  return Date.now() - new Date(updatedAt).getTime() > STUCK_AFTER_MS;
}
