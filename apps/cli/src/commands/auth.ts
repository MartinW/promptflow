import { Command } from "commander";
import kleur from "kleur";
import { configPath, readConfig, writeConfig } from "../config";

export const authCommand = new Command("auth")
  .description("Configure Langfuse + OpenRouter credentials")
  .option("--public-key <key>", "Langfuse public key")
  .option("--secret-key <key>", "Langfuse secret key")
  .option("--host <url>", "Langfuse host", "https://cloud.langfuse.com")
  .option("--openrouter-key <key>", "OpenRouter API key")
  .option("--clear", "Remove all stored credentials")
  .action(
    (opts: {
      publicKey?: string;
      secretKey?: string;
      host?: string;
      openrouterKey?: string;
      clear?: boolean;
    }) => {
      if (opts.clear) {
        writeConfig({});
        console.log(kleur.dim(`Cleared ${configPath()}`));
        return;
      }

      if (!opts.publicKey && !opts.secretKey && !opts.openrouterKey) {
        const cfg = readConfig();
        console.log(kleur.bold("Current config"));
        console.log(`  ${configPath()}`);
        console.log(
          `  langfuse.publicKey:  ${cfg.langfusePublicKey ? mask(cfg.langfusePublicKey) : kleur.dim("not set")}`,
        );
        console.log(
          `  langfuse.secretKey:  ${cfg.langfuseSecretKey ? mask(cfg.langfuseSecretKey) : kleur.dim("not set")}`,
        );
        console.log(
          `  langfuse.host:       ${cfg.langfuseHost ?? kleur.dim("https://cloud.langfuse.com (default)")}`,
        );
        console.log(
          `  openrouter.apiKey:   ${cfg.openrouterApiKey ? mask(cfg.openrouterApiKey) : kleur.dim("not set")}`,
        );
        console.log("");
        console.log(
          kleur.dim("Pass --public-key / --secret-key / --host / --openrouter-key to update."),
        );
        console.log(kleur.dim("Env vars override file values at runtime."));
        return;
      }

      const next = readConfig();
      if (opts.publicKey) next.langfusePublicKey = opts.publicKey;
      if (opts.secretKey) next.langfuseSecretKey = opts.secretKey;
      if (opts.host && opts.host !== "https://cloud.langfuse.com") next.langfuseHost = opts.host;
      if (opts.openrouterKey) next.openrouterApiKey = opts.openrouterKey;
      writeConfig(next);
      console.log(kleur.green(`Saved to ${configPath()}`));
    },
  );

function mask(s: string): string {
  if (s.length < 8) return "***";
  return `${s.slice(0, 6)}…${s.slice(-3)}`;
}
