/**
 * Smoke test for `deletePrompt`.
 *
 * Creates a throwaway prompt, deletes it, confirms it's gone.
 * Doesn't probe trace-orphan behaviour — that's a manual UI check
 * against a prompt with known trace history.
 *
 * Run: bun run packages/core/scripts/smoke-delete.ts
 * Reads LANGFUSE_PUBLIC_KEY / LANGFUSE_SECRET_KEY / LANGFUSE_BASE_URL
 * from process.env.
 */

import { createClient, PromptFlowError } from "../src/index";

const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
const secretKey = process.env.LANGFUSE_SECRET_KEY;
const host = process.env.LANGFUSE_BASE_URL;

if (!publicKey || !secretKey) {
  console.error("Missing LANGFUSE_PUBLIC_KEY / LANGFUSE_SECRET_KEY");
  process.exit(1);
}

const client = createClient({ publicKey, secretKey, host });
const name = `smoke-delete-test-${Date.now()}`;

console.log(`1. Creating ${name}…`);
await client.createPrompt({
  type: "text",
  name,
  prompt: "Smoke test — safe to delete.",
  tags: ["smoke"],
  labels: [],
});

console.log("2. Reading it back…");
const fetched = await client.getPrompt(name);
console.log(`   got version ${fetched.version}, type ${fetched.type}`);

console.log("3. Deleting it…");
await client.deletePrompt(name);

console.log("4. Confirming it's gone (expect not_found)…");
try {
  await client.getPrompt(name);
  console.error("   ✗ Prompt still resolvable — delete didn't take effect");
  process.exit(1);
} catch (err) {
  if (err instanceof PromptFlowError && err.kind === "not_found") {
    console.log("   ✓ 404 as expected");
  } else {
    console.error("   ✗ Unexpected error:", err);
    process.exit(1);
  }
}

console.log("\nAll good. deletePrompt works end-to-end.");
