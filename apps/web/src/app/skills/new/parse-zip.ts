import { parseSkillFrontmatter, type SkillFrontmatter } from "@promptflow/core";
import { unzipSync } from "fflate";

/**
 * Client-side ZIP → skill-files parser for the "New skill" form's upload
 * option. Langfuse's own UI supports importing skills from a ZIP (see
 * https://langfuse.com/docs/skill-management/overview#limits), including
 * multiple skill folders in one ZIP with a review/select step; there's no
 * dedicated upload API — Langfuse's web app itself just unzips client-side
 * and calls the normal create-version endpoint per skill, same as we do here.
 */

/** Mirrors Langfuse's documented ZIP-before-extraction cap. */
export const MAX_ZIP_BYTES = 3 * 1024 * 1024;

/** Mirrors Langfuse's documented supported text extensions for skill files. */
const SUPPORTED_EXTENSIONS = new Set(
  (
    ".md .markdown .mdx .txt .rst .adoc .json .jsonc .jsonl .ndjson .yaml .yml .toml .xml .csv " +
    ".tsv .ini .cfg .conf .properties .log .html .htm .css .scss .sass .less .js .jsx .mjs .cjs " +
    ".ts .tsx .py .pyi .sh .bash .zsh .fish .ps1 .rb .go .rs .java .c .h .cc .cpp .hpp .cs .swift " +
    ".kt .kts .lua .r .pl .php .sql .graphql .gql .tex"
  ).split(" "),
);

export interface DetectedSkill {
  /** The SKILL.md's folder path within the zip, used only to group its files — not sent to the API. */
  root: string;
  skillMd: string;
  files: Array<{ path: string; content: string }>;
  /** `null` when SKILL.md's frontmatter is missing/invalid — the skill is still listed, just not importable as-is. */
  frontmatter: SkillFrontmatter | null;
}

export interface ParsedSkillZip {
  skills: DetectedSkill[];
  /** Paths present in the zip but dropped (binary/unsupported extension, unsafe path, or outside any skill folder). */
  skipped: string[];
}

/**
 * Detects every skill folder in a ZIP (one per `SKILL.md` found) and groups
 * each folder's other files under it. A ZIP's root counts as a folder too
 * (a `SKILL.md` with no parent directory).
 */
export function parseSkillZip(buffer: ArrayBuffer): ParsedSkillZip {
  const entries = unzipSync(new Uint8Array(buffer));

  const textEntries = new Map<string, Uint8Array>();
  const skipped: string[] = [];
  for (const [rawPath, data] of Object.entries(entries)) {
    if (rawPath.endsWith("/")) continue; // directory entry
    if (!isSafePath(rawPath) || !hasSupportedExtension(rawPath)) {
      skipped.push(rawPath);
      continue;
    }
    textEntries.set(rawPath, data);
  }

  const skillMdPaths = Array.from(textEntries.keys()).filter(
    (p) => p === "SKILL.md" || p.endsWith("/SKILL.md"),
  );
  if (skillMdPaths.length === 0) {
    throw new Error("No SKILL.md found in this ZIP.");
  }

  // Sort roots longest-first so a nested SKILL.md (e.g. `a/sub/SKILL.md`)
  // claims its own files before the outer `a/` root does.
  const roots = skillMdPaths
    .map((p) => (p === "SKILL.md" ? "" : p.slice(0, -"SKILL.md".length)))
    .sort((a, b) => b.length - a.length);

  const decoder = new TextDecoder("utf-8");
  const bySkill = new Map<string, DetectedSkill>(
    roots.map((root) => [root, { root, skillMd: "", files: [], frontmatter: null }]),
  );

  for (const [path, data] of textEntries) {
    const root = roots.find((r) => path.startsWith(r));
    if (root === undefined) {
      skipped.push(path); // not under any detected skill folder
      continue;
    }
    const relativePath = path.slice(root.length);
    const content = decoder.decode(data);
    const skill = bySkill.get(root);
    if (!skill) continue;
    if (relativePath === "SKILL.md") {
      skill.skillMd = content;
      skill.frontmatter = parseSkillFrontmatter(content);
    } else {
      skill.files.push({ path: relativePath, content });
    }
  }

  // Preserve detection order (shallowest/first-found root first) rather than
  // the longest-first sort used for file assignment above.
  const skills = skillMdPaths.map((p) => {
    const root = p === "SKILL.md" ? "" : p.slice(0, -"SKILL.md".length);
    const skill = bySkill.get(root);
    if (!skill) throw new Error(`Internal error: lost track of skill root "${root}"`);
    return skill;
  });

  return { skills, skipped };
}

function hasSupportedExtension(path: string): boolean {
  const dot = path.lastIndexOf(".");
  if (dot === -1) return false;
  return SUPPORTED_EXTENSIONS.has(path.slice(dot).toLowerCase());
}

/** Rejects absolute paths, backslashes, and `.`/`..` segments — same rules the Langfuse API enforces on file paths. */
function isSafePath(path: string): boolean {
  if (path.startsWith("/") || path.includes("\\")) return false;
  return path.split("/").every((segment) => segment !== "." && segment !== "..");
}
