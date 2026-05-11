/**
 * Cross-corpus duplicate-block detector.
 *
 * Splits each prompt body on blank lines into paragraphs, normalises
 * whitespace within each, and groups paragraphs that appear verbatim across
 * two or more distinct prompts. The minimum length threshold filters out
 * trivial matches ("Hello.").
 *
 * Pure — no I/O. The caller supplies already-flattened bodies (see
 * `flattenPromptForAnalysis`).
 */

export interface DuplicateOccurrence {
  promptName: string;
  /** Total non-overlapping occurrences of this paragraph in the prompt's body. */
  count: number;
}

export interface DuplicateGroup {
  /** The canonical paragraph text (whitespace-trimmed). */
  text: string;
  /** Prompts where the paragraph appears (distinct names). */
  occurrences: DuplicateOccurrence[];
  /** Sum of all `occurrences[*].count` for quick UI summaries. */
  totalOccurrences: number;
}

export interface DuplicateScanOptions {
  /** Minimum paragraph length (after whitespace trim) to be considered. Default 40. */
  minLength?: number;
  /** Cap on group count returned. Default 50. */
  maxGroups?: number;
}

export interface PromptBodyInput {
  name: string;
  body: string;
}

const DEFAULT_MIN_LENGTH = 40;
const DEFAULT_MAX_GROUPS = 50;

/**
 * Find paragraphs that appear in two or more distinct prompts.
 *
 * Paragraphs are split on one-or-more blank lines and trimmed. The result is
 * sorted by total occurrences descending, so the most-duplicated blocks
 * appear first.
 */
export function findDuplicates(
  prompts: PromptBodyInput[],
  options: DuplicateScanOptions = {},
): DuplicateGroup[] {
  const minLength = options.minLength ?? DEFAULT_MIN_LENGTH;
  const maxGroups = options.maxGroups ?? DEFAULT_MAX_GROUPS;

  // Map<paragraphText, Map<promptName, count>>.
  const index = new Map<string, Map<string, number>>();

  for (const prompt of prompts) {
    const seen = new Map<string, number>();
    for (const para of splitParagraphs(prompt.body)) {
      if (para.length < minLength) continue;
      seen.set(para, (seen.get(para) ?? 0) + 1);
    }
    for (const [para, count] of seen) {
      let entry = index.get(para);
      if (!entry) {
        entry = new Map();
        index.set(para, entry);
      }
      entry.set(prompt.name, count);
    }
  }

  const groups: DuplicateGroup[] = [];
  for (const [text, occurrences] of index) {
    if (occurrences.size < 2) continue;
    const list: DuplicateOccurrence[] = Array.from(occurrences.entries())
      .map(([promptName, count]) => ({ promptName, count }))
      .sort((a, b) => a.promptName.localeCompare(b.promptName));
    const total = list.reduce((sum, o) => sum + o.count, 0);
    groups.push({ text, occurrences: list, totalOccurrences: total });
  }

  groups.sort((a, b) => b.totalOccurrences - a.totalOccurrences || a.text.length - b.text.length);
  return groups.slice(0, maxGroups);
}

/**
 * Split a body into paragraphs on blank-line boundaries. Trims each
 * paragraph and drops empties. Preserves internal newlines so the original
 * formatting (lists, multi-line instructions) survives the round-trip when
 * the paragraph is later extracted to its own prompt.
 */
export function splitParagraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/g)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}
