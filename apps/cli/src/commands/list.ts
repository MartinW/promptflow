import { matchesFilter } from "@promptflow/core";
import { Command } from "commander";
import kleur from "kleur";
import { getClientOrExit } from "../client";

export const listCommand = new Command("list")
  .description("List prompts in the current Langfuse project")
  .option("-t, --tag <filter>", "Comma-separated tag filter (AND semantics)")
  .option("-l, --limit <n>", "Max results", "50")
  .option("--json", "Output as JSON")
  .action(async (opts: { tag?: string; limit: string; json?: boolean }) => {
    const { client } = getClientOrExit();
    const limit = Number.parseInt(opts.limit, 10);

    const all = await client.listPrompts({ limit });
    const tagFilter = opts.tag;
    const filtered = tagFilter ? all.filter((p) => matchesFilter(p.tags, tagFilter)) : all;

    if (opts.json) {
      process.stdout.write(`${JSON.stringify(filtered, null, 2)}\n`);
      return;
    }

    if (filtered.length === 0) {
      console.log(kleur.dim("No prompts."));
      return;
    }

    const nameWidth = Math.min(60, Math.max(...filtered.map((p) => p.name.length), "NAME".length));
    console.log(kleur.bold(`${"NAME".padEnd(nameWidth)}  ${"VERSIONS".padStart(8)}  TAGS`));
    for (const p of filtered) {
      const versions = p.versions.length;
      const tags = p.tags.length > 0 ? kleur.dim(p.tags.join(" ")) : kleur.dim("—");
      console.log(`${p.name.padEnd(nameWidth)}  ${String(versions).padStart(8)}  ${tags}`);
    }
    console.log(kleur.dim(`\n${filtered.length} prompt${filtered.length === 1 ? "" : "s"}`));
  });
