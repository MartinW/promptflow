import { readFileSync } from "node:fs";
import type { CreatePromptInput, Prompt } from "@promptflow/core";
import { Command } from "commander";
import kleur from "kleur";
import { getClientOrExit } from "../client";

export const pushCommand = new Command("push")
  .description("Create a new prompt version from a JSON file")
  .argument("<file>", "Path to a prompt JSON file (typically produced by `pull`)")
  .option("--name <name>", "Override the prompt name from the file")
  .option("--commit <message>", "Commit message for this version")
  .option("--promote", "Apply the production label to the new version")
  .action(async (file: string, opts: { name?: string; commit?: string; promote?: boolean }) => {
    const { client } = getClientOrExit();
    const raw = readFileSync(file, "utf8");
    const parsed = JSON.parse(raw) as Partial<Prompt>;

    if (!parsed.type || (parsed.type !== "text" && parsed.type !== "chat")) {
      throw new Error(`File missing valid \`type\` field (got: ${String(parsed.type)})`);
    }
    if (parsed.prompt === undefined) {
      throw new Error("File missing `prompt` body");
    }

    const name = opts.name ?? parsed.name;
    if (!name) {
      throw new Error("File has no `name`; pass --name explicitly");
    }

    const labels = opts.promote ? ["production"] : undefined;
    const input =
      parsed.type === "text"
        ? ({
            type: "text",
            name,
            prompt: parsed.prompt as string,
            tags: parsed.tags,
            labels,
            commitMessage: opts.commit,
            config: parsed.config,
          } satisfies CreatePromptInput)
        : ({
            type: "chat",
            name,
            prompt: parsed.prompt as Extract<Prompt, { type: "chat" }>["prompt"],
            tags: parsed.tags,
            labels,
            commitMessage: opts.commit,
            config: parsed.config,
          } satisfies CreatePromptInput);

    const result = await client.createPrompt(input);
    console.log(
      kleur.green(
        `Pushed ${result.name} v${result.version}${opts.promote ? " · promoted to production" : " · draft"}`,
      ),
    );
  });
