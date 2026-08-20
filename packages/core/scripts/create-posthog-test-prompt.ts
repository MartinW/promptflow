/**
 * Create a PostHog prompt and leave it in place — unlike smoke-posthog.ts,
 * which archives its test prompt as a cleanup step. Useful for confirming a
 * prompt actually shows up in PromptFlow's /prompts list or PostHog's own
 * dashboard.
 *
 * Run: bun run packages/core/scripts/create-posthog-test-prompt.ts
 * Reads POSTHOG_PERSONAL_API_KEY / POSTHOG_PROJECT_ID / POSTHOG_HOST
 * from process.env.
 */

import { createPostHogClient } from "../src/index";

const personalApiKey = process.env.POSTHOG_PERSONAL_API_KEY;
const projectId = process.env.POSTHOG_PROJECT_ID;
const host = process.env.POSTHOG_HOST;

if (!personalApiKey || !projectId || !host) {
  console.error("Missing POSTHOG_PERSONAL_API_KEY / POSTHOG_PROJECT_ID / POSTHOG_HOST");
  process.exit(1);
}

const client = createPostHogClient({ personalApiKey, projectId, host });
const name = `posthog-demo-prompt-${Date.now()}`;

console.log(`Creating ${name}…`);
const created = await client.createPrompt({
  type: "text",
  name,
  prompt: "Hello {{name}}, welcome to PromptFlow via PostHog.",
  tags: ["demo"],
  labels: ["production"],
});

console.log(`Created v${created.version}. Not archiving — check /prompts (with PostHog active) or your PostHog dashboard.`);
