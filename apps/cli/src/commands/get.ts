import { Command } from "commander";
import kleur from "kleur";
import { getClientOrExit } from "../client";

export const getCommand = new Command("get")
  .description("Show a prompt's content + metadata")
  .argument("<name>", "Prompt name")
  .option("-v, --version <n>", "Specific version (defaults to latest)")
  .option("-l, --label <label>", "Specific label (e.g. production)")
  .option("--json", "Output as JSON")
  .action(async (name: string, opts: { version?: string; label?: string; json?: boolean }) => {
    const { client } = getClientOrExit();
    const prompt = await client.getPrompt(name, {
      version: opts.version ? Number.parseInt(opts.version, 10) : undefined,
      label: opts.label,
    });

    if (opts.json) {
      process.stdout.write(`${JSON.stringify(prompt, null, 2)}\n`);
      return;
    }

    console.log(kleur.bold(prompt.name));
    console.log(
      kleur.dim(
        `v${prompt.version} · ${prompt.type} · labels: ${
          prompt.labels.length > 0 ? prompt.labels.join(", ") : "—"
        } · tags: ${prompt.tags.length > 0 ? prompt.tags.join(", ") : "—"}`,
      ),
    );
    if (prompt.commitMessage) {
      console.log(kleur.italic().dim(`"${prompt.commitMessage}"`));
    }
    console.log("");
    if (prompt.type === "text") {
      console.log(prompt.prompt);
    } else {
      for (const m of prompt.prompt) {
        if ("name" in m && !("role" in m)) {
          console.log(kleur.cyan(`[placeholder: ${m.name}]`));
        } else if ("role" in m && "content" in m) {
          console.log(kleur.cyan(`[${m.role.toUpperCase()}]`));
          console.log(m.content);
          console.log("");
        }
      }
    }
  });
