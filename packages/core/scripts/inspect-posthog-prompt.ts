/**
 * Dump the raw JSON PostHog returns for a prompt, bypassing our type
 * mapping in posthog-client.ts entirely. Use this to confirm the actual
 * field names/shape before trusting toMeta()/toPrompt()'s guesses.
 *
 * Run: bun run packages/core/scripts/inspect-posthog-prompt.ts <promptName>
 * Reads POSTHOG_PERSONAL_API_KEY / POSTHOG_PROJECT_ID / POSTHOG_HOST
 * from process.env.
 */

const personalApiKey = process.env.POSTHOG_PERSONAL_API_KEY;
const projectId = process.env.POSTHOG_PROJECT_ID;
const host = process.env.POSTHOG_HOST;
const name = process.argv[2];

if (!personalApiKey || !projectId || !host) {
  console.error("Missing POSTHOG_PERSONAL_API_KEY / POSTHOG_PROJECT_ID / POSTHOG_HOST");
  process.exit(1);
}
if (!name) {
  console.error("Usage: bun run inspect-posthog-prompt.ts <promptName>");
  process.exit(1);
}

const headers = { Authorization: `Bearer ${personalApiKey}` };
const base = `${host.replace(/\/$/, "")}/api/projects/${projectId}/llm_prompts/`;

console.log("=== list (search) ===");
const listRes = await fetch(`${base}?search=${encodeURIComponent(name)}`, { headers });
console.log(listRes.status, JSON.stringify(await listRes.json(), null, 2));

console.log("\n=== resolve/name ===");
const resolveRes = await fetch(`${base}resolve/name/${encodeURIComponent(name)}/`, { headers });
console.log(resolveRes.status, JSON.stringify(await resolveRes.json(), null, 2));

console.log("\n=== name (plain get) ===");
const getRes = await fetch(`${base}name/${encodeURIComponent(name)}/`, { headers });
console.log(getRes.status, JSON.stringify(await getRes.json(), null, 2));
