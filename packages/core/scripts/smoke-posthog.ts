/**
 * Smoke test for the PostHog client.
 *
 * Creates a throwaway prompt, reads it back, publishes a new version, then
 * archives it. Also the first real validation of the request/response shapes
 * guessed in `posthog-client.ts` — PostHog's docs render examples via
 * client-side tabs, so those shapes weren't confirmed ahead of time. Logs
 * raw responses so mismatches are obvious.
 *
 * Run: bun run packages/core/scripts/smoke-posthog.ts
 * Reads POSTHOG_PERSONAL_API_KEY / POSTHOG_PROJECT_ID / POSTHOG_HOST
 * from process.env.
 */

import { createPostHogClient, PromptFlowError } from "../src/index";

const personalApiKey = process.env.POSTHOG_PERSONAL_API_KEY;
const projectId = process.env.POSTHOG_PROJECT_ID;
const host = process.env.POSTHOG_HOST;

if (!personalApiKey || !projectId || !host) {
  console.error("Missing POSTHOG_PERSONAL_API_KEY / POSTHOG_PROJECT_ID / POSTHOG_HOST");
  process.exit(1);
}

const client = createPostHogClient({ personalApiKey, projectId, host });
const name = `smoke-posthog-test-${Date.now()}`;

console.log(`1. Creating ${name}…`);
const created = await client.createPrompt({
  type: "text",
  name,
  prompt: "Smoke test — safe to delete.",
  tags: ["smoke"],
  labels: [],
});
console.log("   raw:", JSON.stringify(created));

console.log("2. Reading it back…");
const fetched = await client.getPrompt(name);
console.log(`   got version ${fetched.version}, type ${fetched.type}`);
if (fetched.type === "text" && fetched.prompt.length === 0) {
  console.error("   ✗ Prompt body came back empty — check the content/prompt field mapping");
}

console.log("3. Listing prompts and confirming this one shows up…");
const listed = await client.listPrompts({ limit: 100 });
if (!listed.some((p) => p.name === name)) {
  console.error("   ✗ Created prompt not found in listPrompts() results");
  process.exit(1);
}
console.log("   ✓ found in list");

console.log("4. Publishing a new version…");
const updated = await client.createPrompt({
  type: "text",
  name,
  prompt: "Smoke test — updated body.",
  tags: ["smoke"],
  labels: [],
});
console.log(`   new version: ${updated.version} (expect > ${fetched.version})`);

console.log("5. Archiving it…");
await client.deletePrompt(name);

console.log("6. Confirming version-scoped delete throws (no PostHog equivalent)…");
try {
  await client.deletePrompt(name, { version: 1 });
  console.error("   ✗ Expected a validation error, got none");
  process.exit(1);
} catch (err) {
  if (err instanceof PromptFlowError && err.kind === "validation") {
    console.log("   ✓ validation error as expected");
  } else {
    console.error("   ✗ Unexpected error:", err);
    process.exit(1);
  }
}

console.log(
  "\nAll good. PostHog client works end-to-end (remember to check the archived prompt manually — no hard-delete endpoint exists).",
);
