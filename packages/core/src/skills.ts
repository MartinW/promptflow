/**
 * PromptFlow Skills client — typed wrapper around Langfuse's Skills API.
 *
 * Skills (`SKILL.md` + supporting files, versioned and labelled) are a
 * separate Langfuse resource from prompts, introduced in the newer
 * `@langfuse/core` SDK (the legacy `langfuse` package used by `client.ts`
 * has no skills support). There is no PostHog equivalent — this client has
 * exactly one implementation, unlike `PromptFlowClient`.
 */

import { LangfuseAPIClient } from "@langfuse/core";
import { wrapError } from "./errors";

export interface SkillsClientConfig {
  publicKey: string;
  secretKey: string;
  /** Defaults to `https://cloud.langfuse.com`. */
  host?: string;
}

export interface ListSkillsFilter {
  /** Filter by exact skill name. */
  name?: string;
  /** Case-insensitive search across skill names and latest-version descriptions. */
  search?: string;
  /** Filter by a shared skill tag. */
  tag?: string;
  page?: number;
  limit?: number;
}

export interface SkillVersionFileInput {
  path: string;
  content: string;
}

export interface CreateSkillVersionInput {
  files: SkillVersionFileInput[];
  commitMessage?: string;
}

export interface SkillsClient {
  /** List skills with metadata from their latest version. */
  listSkills(filter?: ListSkillsFilter): Promise<SkillMeta[]>;

  /**
   * Resolve a skill's version by version number or label.
   *
   * No `version`/`label` → defaults to the `production` label (Langfuse
   * throws a `not_found` if no version carries it — unlike prompts, skills
   * have no `latest` auto-fallback). `version` and `label` are mutually
   * exclusive.
   */
  getSkill(
    name: string,
    opts?: { version?: number; label?: string; includeContent?: boolean },
  ): Promise<SkillVersion>;

  /**
   * Publish a new skill version.
   *
   * The skill's identity is NOT passed explicitly — it's parsed server-side
   * from the `SKILL.md` file's YAML frontmatter `name:` field. Creating a
   * version whose `SKILL.md` names a skill that doesn't exist yet creates it;
   * naming an existing skill adds a new version under it.
   */
  createSkillVersion(input: CreateSkillVersionInput): Promise<SkillVersion>;

  /** Replace the tag set shared across every version of the skill. */
  setSkillTags(name: string, tags: string[]): Promise<SkillVersion>;

  /** Move a label (e.g. `"production"`) onto this version, off any other. */
  setSkillLabels(name: string, version: number, labels: string[]): Promise<SkillVersion>;

  /** Delete one immutable version. There is no whole-skill delete. */
  deleteSkillVersion(name: string, version: number): Promise<void>;
}

export interface SkillMeta {
  name: string;
  description: string;
  tags: string[];
  latestVersion: number;
  latestVersionCreatedAt: string;
  latestVersionLastUpdatedAt: string;
  productionVersion: number | null;
}

export interface SkillFile {
  id: string;
  path: string;
  blobId: string;
  sha256Hash: string;
  contentType: string;
  contentLength: number;
  content?: string;
}

export interface SkillVersion {
  id: string;
  createdAt: string;
  updatedAt: string;
  projectId: string;
  createdBy: string;
  name: string;
  description: string;
  frontmatter?: unknown;
  version: number;
  tags: string[];
  labels: string[];
  commitMessage: string | null;
  files: SkillFile[];
}

export function createSkillsClient(config: SkillsClientConfig): SkillsClient {
  const baseUrl = config.host ?? "https://cloud.langfuse.com";
  const sdk = new LangfuseAPIClient({
    environment: baseUrl,
    baseUrl,
    username: config.publicKey,
    password: config.secretKey,
  });

  return {
    async listSkills(filter?: ListSkillsFilter): Promise<SkillMeta[]> {
      try {
        const result = await sdk.skills.list({
          name: filter?.name,
          search: filter?.search,
          tag: filter?.tag,
          page: filter?.page,
          limit: filter?.limit,
        });
        return (result.data ?? []) as SkillMeta[];
      } catch (err) {
        throw wrapError(err);
      }
    },

    async getSkill(name, opts = {}): Promise<SkillVersion> {
      try {
        const result = await sdk.skills.get(name, {
          version: opts.version,
          label: opts.version === undefined ? opts.label : undefined,
          includeContent: opts.includeContent,
        });
        return result as unknown as SkillVersion;
      } catch (err) {
        throw wrapError(err);
      }
    },

    async createSkillVersion(input: CreateSkillVersionInput): Promise<SkillVersion> {
      try {
        const result = await sdk.skills.createVersion({
          files: input.files,
          commitMessage: input.commitMessage,
        });
        return result as unknown as SkillVersion;
      } catch (err) {
        throw wrapError(err);
      }
    },

    async setSkillTags(name, tags): Promise<SkillVersion> {
      try {
        const result = await sdk.skills.update(name, { tags });
        return result as unknown as SkillVersion;
      } catch (err) {
        throw wrapError(err);
      }
    },

    async setSkillLabels(name, version, labels): Promise<SkillVersion> {
      try {
        const result = await sdk.skills.setLabels(name, version, { labels });
        return result as unknown as SkillVersion;
      } catch (err) {
        throw wrapError(err);
      }
    },

    async deleteSkillVersion(name, version): Promise<void> {
      try {
        await sdk.skills.deleteVersion(name, version);
      } catch (err) {
        throw wrapError(err);
      }
    },
  };
}

export interface SkillFrontmatter {
  name: string;
  description: string;
}

/**
 * Parse the `name`/`description` fields out of a `SKILL.md`-style YAML
 * frontmatter block (`---\nname: ...\ndescription: ...\n---`).
 *
 * Hand-rolled rather than a full YAML parser: the frontmatter contract here
 * is exactly two scalar string fields, so a line-based scan is enough and
 * avoids a new dependency for a contract this narrow.
 *
 * Returns `null` if there's no frontmatter block, or it's missing either
 * required field.
 */
export function parseSkillFrontmatter(content: string): SkillFrontmatter | null {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(content);
  if (!match) return null;

  const block = match[1];
  let name: string | undefined;
  let description: string | undefined;

  for (const line of block.split(/\r?\n/)) {
    const fieldMatch = /^(name|description):\s*(.*)$/.exec(line);
    if (!fieldMatch) continue;
    const [, key, rawValue] = fieldMatch;
    const value = stripQuotes(rawValue.trim());
    if (key === "name") name = value;
    else description = value;
  }

  if (!name || !description) return null;
  return { name, description };
}

/**
 * Strip a leading `---\n...\n---` frontmatter block from `SKILL.md` content,
 * returning just the body. Used when rendering the body on its own (the
 * frontmatter is displayed separately) so it doesn't render as a stray
 * markdown rule + two bare lines.
 */
export function stripSkillFrontmatter(content: string): string {
  const match = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/.exec(content);
  return match ? content.slice(match[0].length) : content;
}

function stripQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}
