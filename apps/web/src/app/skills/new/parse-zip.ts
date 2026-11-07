import { unzipSync } from "fflate";

/**
 * Client-side ZIP → skill-files parser for the "New skill" form's upload
 * option. Langfuse's own UI supports importing skills from a ZIP (see
 * https://langfuse.com/docs/skill-management/overview#limits) but that's a
 * multi-skill import flow with a review/select step; this is the narrower
 * single-skill case — unzip, find the one `SKILL.md`, and hand its folder's
 * contents to the existing create-skill form fields. There's no dedicated
 * upload API — Langfuse's web app itself just unzips client-side and calls
 * the normal create-version endpoint, same as we do here.
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

export interface ParsedSkillZip {
  skillMd: string;
  files: Array<{ path: string; content: string }>;
  /** Paths present in the zip but dropped (binary/unsupported extension, unsafe path). */
  skipped: string[];
}

export function parseSkillZip(buffer: ArrayBuffer): ParsedSkillZip {
  const entries = unzipSync(new Uint8Array(buffer));

  const textEntries = new Map<string, Uint8Array>();
  const skipped: string[] = [];
  for (const [rawPath, data] of Object.entries(entries)) {
    if (rawPath.endsWith("/")) continue; // directory entry
    if (!isSafePath(rawPath)) {
      skipped.push(rawPath);
      continue;
    }
    if (!hasSupportedExtension(rawPath)) {
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
  if (skillMdPaths.length > 1) {
    throw new Error(
      `This ZIP contains ${skillMdPaths.length} SKILL.md files (multi-skill import isn't supported here) — upload a ZIP for a single skill.`,
    );
  }

  const skillMdPath = skillMdPaths[0];
  const root = skillMdPath === "SKILL.md" ? "" : skillMdPath.slice(0, -"SKILL.md".length);

  const decoder = new TextDecoder("utf-8");
  const files: Array<{ path: string; content: string }> = [];
  let skillMd = "";

  for (const [path, data] of textEntries) {
    if (!path.startsWith(root)) {
      // Outside the detected skill's folder (e.g. a sibling skill folder,
      // or loose files alongside it) — not part of this skill.
      skipped.push(path);
      continue;
    }
    const relativePath = path.slice(root.length);
    const content = decoder.decode(data);
    if (relativePath === "SKILL.md") {
      skillMd = content;
    } else {
      files.push({ path: relativePath, content });
    }
  }

  return { skillMd, files, skipped };
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
