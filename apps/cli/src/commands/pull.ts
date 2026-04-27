import { writeFileSync } from "node:fs";
import { Command } from "commander";
import kleur from "kleur";
import { getClientOrExit } from "../client";

export const pullCommand = new Command("pull")
  .description("Save a prompt to a JSON file (round-trips with `push`)")
  .argument("<name>", "Prompt name")
  .option("-v, --version <n>", "Specific version (defaults to latest)")
  .option("-l, --label <label>", "Specific label")
  .option("-o, --out <file>", "Output path (defaults to <name>.json)")
  .action(async (name: string, opts: { version?: string; label?: string; out?: string }) => {
    const { client } = getClientOrExit();
    const prompt = await client.getPrompt(name, {
      version: opts.version ? Number.parseInt(opts.version, 10) : undefined,
      label: opts.label,
    });
    const outPath = opts.out ?? `${name.replace(/[/:]/g, "_")}.json`;
    writeFileSync(outPath, `${JSON.stringify(prompt, null, 2)}\n`);
    console.log(kleur.green(`Wrote ${outPath} · ${prompt.name} v${prompt.version}`));
  });
