/**
 * Dedupes concurrent dashboard commentary generations (e.g. React Strict Mode
 * double-mount) so we do not run duplicate LLM calls for the same journey + progress snapshot.
 */
const inflight = new Map<string, Promise<void>>();

export function runDashboardCommentaryOnce(
  key: string,
  run: () => Promise<void>,
): Promise<void> {
  const existing = inflight.get(key);
  if (existing) return existing;
  const p = run().finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, p);
  return p;
}
