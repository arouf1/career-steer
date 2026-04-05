/**
 * Inserts text at the current cursor position in a textarea,
 * adding a space separator when needed.
 */
export function insertTextAtCursor(
  textarea: HTMLTextAreaElement,
  currentValue: string,
  textToInsert: string,
): { newValue: string; newCursorPos: number } {
  const start = textarea.selectionStart ?? currentValue.length;
  const end = textarea.selectionEnd ?? currentValue.length;

  const before = currentValue.slice(0, start);
  const after = currentValue.slice(end);

  const needsSpace = before.length > 0 && !/\s$/.test(before);
  const separator = needsSpace ? " " : "";

  const inserted = separator + textToInsert;
  const newValue = before + inserted + after;
  const newCursorPos = start + inserted.length;

  return { newValue, newCursorPos };
}

/**
 * Tracks a pending (in-progress) text insertion from live transcription.
 * Use `begin` when the first delta arrives to record the insertion point,
 * `apply` on subsequent deltas to replace the pending region, and
 * `finalise` on completion to lock in the text.
 */
export interface PendingInsertion {
  start: number;
  prefix: string;
  prevLen: number;
}

export function beginPendingInsertion(
  textarea: HTMLTextAreaElement | null,
  currentValue: string,
): PendingInsertion {
  const pos = textarea?.selectionStart ?? currentValue.length;
  const before = currentValue.slice(0, pos);
  const needsSpace = before.length > 0 && !/\s$/.test(before);
  return { start: pos, prefix: needsSpace ? " " : "", prevLen: 0 };
}

export function applyPendingInsertion(
  pending: PendingInsertion,
  currentValue: string,
  text: string,
): { newValue: string; pending: PendingInsertion } {
  const before = currentValue.slice(0, pending.start);
  const afterPending = currentValue.slice(pending.start + pending.prevLen);
  const inserted = pending.prefix + text;
  const newValue = before + inserted + afterPending;
  return {
    newValue,
    pending: { ...pending, prevLen: inserted.length },
  };
}
