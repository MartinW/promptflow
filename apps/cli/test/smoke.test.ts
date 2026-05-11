import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { matchesFilter } from "@promptflow/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveCreds } from "../src/config";
import { buildProgram } from "../src/program";

describe("CLI smoke", () => {
  describe("command registration", () => {
    const program = buildProgram();

    it("exposes the auth command at the top level", () => {
      const names = program.commands.map((c) => c.name());
      expect(names).toContain("auth");
    });

    it("exposes every documented prompts subcommand", () => {
      const prompts = program.commands.find((c) => c.name() === "prompts");
      if (!prompts) throw new Error("prompts command not registered");
      const subcommands = prompts.commands.map((c) => c.name()).sort();
      expect(subcommands).toEqual(["diff", "get", "list", "pull", "push", "run"]);
    });

    it("produces non-empty help text for every command", () => {
      const all = [program, ...program.commands];
      const prompts = program.commands.find((c) => c.name() === "prompts");
      if (prompts) all.push(...prompts.commands);
      for (const cmd of all) {
        const help = cmd.helpInformation();
        expect(help, `help for "${cmd.name()}" should be non-empty`).toMatch(/\S/);
      }
    });
  });

  describe("config resolution", () => {
    const ORIGINAL_ENV = { ...process.env };

    beforeEach(() => {
      // Wipe Langfuse-related env so the test isn't affected by the dev shell.
      for (const key of Object.keys(process.env)) {
        if (key.startsWith("LANGFUSE_") || key === "OPENROUTER_API_KEY") {
          delete process.env[key];
        }
      }
      // Point HOME at an empty tmpdir so the on-disk ~/.promptflow/config.json
      // doesn't bleed through (the developer running these tests will have one).
      process.env.HOME = mkdtempSync(join(tmpdir(), "promptflow-cli-test-"));
    });

    afterEach(() => {
      for (const key of Object.keys(process.env)) {
        if (key.startsWith("LANGFUSE_") || key === "OPENROUTER_API_KEY") {
          delete process.env[key];
        }
      }
      Object.assign(process.env, ORIGINAL_ENV);
    });

    it("reads LANGFUSE_HOST (not LANGFUSE_BASE_URL)", () => {
      process.env.LANGFUSE_PUBLIC_KEY = "pk-test";
      process.env.LANGFUSE_SECRET_KEY = "sk-test";
      process.env.LANGFUSE_HOST = "https://example.test";
      process.env.LANGFUSE_BASE_URL = "https://wrong.test";

      const result = resolveCreds();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.creds.host).toBe("https://example.test");
      }
    });

    it("reports missing keys when env + config file are both empty", () => {
      const result = resolveCreds();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.missing).toContain("LANGFUSE_PUBLIC_KEY");
        expect(result.missing).toContain("LANGFUSE_SECRET_KEY");
      }
    });

    it("defaults host to cloud.langfuse.com when nothing is set", () => {
      process.env.LANGFUSE_PUBLIC_KEY = "pk-test";
      process.env.LANGFUSE_SECRET_KEY = "sk-test";
      const result = resolveCreds();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.creds.host).toBe("https://cloud.langfuse.com");
      }
    });
  });

  describe("tag filtering helper from @promptflow/core", () => {
    it("matches a single namespace filter", () => {
      expect(matchesFilter(["voice:greeting", "lang:en-GB"], "voice:greeting")).toBe(true);
      expect(matchesFilter(["voice:greeting"], "image:hero")).toBe(false);
    });

    it("matches comma-separated AND filters", () => {
      expect(matchesFilter(["voice:greeting", "lang:en-GB"], "voice:greeting,lang:en-GB")).toBe(
        true,
      );
      expect(matchesFilter(["voice:greeting"], "voice:greeting,lang:en-GB")).toBe(false);
    });
  });
});
