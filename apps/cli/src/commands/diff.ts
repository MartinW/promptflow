import { Command } from "commander";
import { diffLines } from "diff";
import kleur from "kleur";
import { getClientOrExit } from "../client";

export const diffCommand = new Command("diff")
  .description("Show the line-by-line diff between two versions of a prompt")
  .argument("<name>", "Prompt name")
  .argument("<v1>", "Older version number")
  .argument("<v2>", "Newer version number")
  .action(async (name: string, v1: string, v2: string) => {
    const { client } = getClientOrExit();
    const a = await client.getPrompt(name, { version: Number.parseInt(v1, 10) });
    const b = await client.getPrompt(name, { version: Number.parseInt(v2, 10) });

    if (a.type !== "text" || b.type !== "text") {
      console.error(kleur.red("diff currently supports text prompts only"));
      process.exit(1);
    }

    console.log(kleur.dim(`--- ${name} v${a.version}`));
    console.log(kleur.dim(`+++ ${name} v${b.version}`));

    for (const part of diffLines(a.prompt, b.prompt)) {
      const lines = part.value.split("\n");
      // Trailing empty entry from terminating newline; drop it so we don't print blank lines.
      if (lines[lines.length - 1] === "") lines.pop();
      const prefix = part.added ? "+" : part.removed ? "-" : " ";
      const colour = part.added ? kleur.green : part.removed ? kleur.red : kleur.dim;
      for (const line of lines) {
        console.log(colour(`${prefix} ${line}`));
      }
    }
  });
