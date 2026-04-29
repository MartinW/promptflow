/**
 * Verify deletePrompt URL-encodes folder slashes correctly.
 * Uses listPrompts (which doesn't have the URL-encoding issue) for verification
 * instead of getPrompt.
 */
import { createClient } from "../src/index";

const publicKey = process.env.LANGFUSE_PUBLIC_KEY!;
const secretKey = process.env.LANGFUSE_SECRET_KEY!;
const host = process.env.LANGFUSE_BASE_URL;
const client = createClient({ publicKey, secretKey, host });

const name = `smoke/folder-delete-${Date.now()}`;

console.log(`1. Creating ${name}…`);
await client.createPrompt({
  type: "text",
  name,
  prompt: "Folder smoke — safe to delete.",
  tags: ["smoke"],
  labels: [],
});

console.log("2. Confirming via list…");
const before = await client.listPrompts({ name });
const found = before.find((p) => p.name === name);
console.log(`   ${found ? "✓ found" : "✗ not found"} in list`);

console.log("3. Deleting…");
await client.deletePrompt(name);

console.log("4. Confirming via list…");
const after = await client.listPrompts({ name });
const stillThere = after.find((p) => p.name === name);
console.log(`   ${stillThere ? "✗ still present" : "✓ gone from list"}`);
