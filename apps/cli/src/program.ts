import { Command } from "commander";
import { authCommand } from "./commands/auth";
import { diffCommand } from "./commands/diff";
import { getCommand } from "./commands/get";
import { listCommand } from "./commands/list";
import { pullCommand } from "./commands/pull";
import { pushCommand } from "./commands/push";
import { runCommand } from "./commands/run";

export function buildProgram(): Command {
  const program = new Command();

  program
    .name("promptflow")
    .description("CLI for PromptFlow — manage Langfuse prompts from the terminal")
    .version("0.0.1");

  program.addCommand(authCommand);

  const prompts = program.command("prompts").description("Manage prompts");
  prompts.addCommand(listCommand);
  prompts.addCommand(getCommand);
  prompts.addCommand(pullCommand);
  prompts.addCommand(pushCommand);
  prompts.addCommand(runCommand);
  prompts.addCommand(diffCommand);

  return program;
}
