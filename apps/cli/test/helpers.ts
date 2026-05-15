import { Command } from "commander";
import { vi } from "vitest";
import type { PromptFlowClient } from "@promptflow/core";

export const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");

/** Reset accumulated Commander option values on a singleton Command instance between tests. */
export function resetCmd(cmd: Command) {
  (cmd as unknown as { _optionValues: object })._optionValues = {};
}

export type MockClient = { [K in keyof PromptFlowClient]: ReturnType<typeof vi.fn> };

export function makeMockClient(): MockClient {
  return {
    listPrompts: vi.fn(),
    getPrompt: vi.fn(),
    getPromptByTag: vi.fn(),
    listByFilter: vi.fn(),
    getProjectName: vi.fn(),
    createPrompt: vi.fn(),
    deletePrompt: vi.fn(),
  };
}

export function captureOutput() {
  const logs: string[] = [];
  const errors: string[] = [];
  const stdout: string[] = [];

  vi.spyOn(console, "log").mockImplementation((...args) => {
    logs.push(args.map(String).join(" "));
  });
  vi.spyOn(console, "error").mockImplementation((...args) => {
    errors.push(args.map(String).join(" "));
  });
  vi.spyOn(process.stdout, "write").mockImplementation((s) => {
    stdout.push(String(s));
    return true;
  });

  return {
    logs,
    errors,
    stdout,
    allLog: () => stripAnsi(logs.join("\n")),
    allStdout: () => stripAnsi(stdout.join("")),
    allErr: () => stripAnsi(errors.join("\n")),
  };
}

export const TEXT_PROMPT = {
  name: "greeting",
  version: 3,
  type: "text" as const,
  prompt: "Hello, {{name}}! Welcome to {{service}}.",
  labels: ["production"],
  tags: ["voice:greeting", "lang:en-GB"],
  commitMessage: "Update greeting copy",
  config: { defaults: { service: "PromptFlow" } },
};

export const CHAT_PROMPT = {
  name: "support-chat",
  version: 1,
  type: "chat" as const,
  prompt: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "{{query}}" },
  ],
  labels: [],
  tags: [],
  commitMessage: null,
  config: {},
};

export const PROMPT_LIST = [
  {
    name: "greeting",
    versions: [1, 2, 3],
    labels: ["production"],
    tags: ["voice:greeting"],
    lastUpdatedAt: "2024-01-01T00:00:00Z",
    lastConfig: null,
  },
  {
    name: "farewell",
    versions: [1],
    labels: [],
    tags: ["voice:farewell", "lang:en-GB"],
    lastUpdatedAt: "2024-01-01T00:00:00Z",
    lastConfig: null,
  },
];
