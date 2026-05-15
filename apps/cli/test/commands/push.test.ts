import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getClientOrExit } from "../../src/client";
import { pushCommand } from "../../src/commands/push";
import { TEXT_PROMPT, captureOutput, makeMockClient, resetCmd } from "../helpers";

vi.mock("../../src/client", () => ({
  getClientOrExit: vi.fn(),
  getOpenRouterKeyOrExit: vi.fn(),
}));

vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
  return { ...actual, readFileSync: vi.fn() };
});

const CREATED_PROMPT = { ...TEXT_PROMPT, version: 4, labels: [] };

describe("prompts push", () => {
  let client: ReturnType<typeof makeMockClient>;
  let out: ReturnType<typeof captureOutput>;
  let readFileSync: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    resetCmd(pushCommand);
    client = makeMockClient();
    vi.mocked(getClientOrExit).mockReturnValue({
      client: client as never,
      host: "https://example.test",
    });
    out = captureOutput();
    vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
    const fs = await import("node:fs");
    readFileSync = vi.mocked(fs.readFileSync);
    readFileSync.mockClear();
    client.createPrompt.mockResolvedValue(CREATED_PROMPT);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reads the file and calls createPrompt with the prompt data", async () => {
    readFileSync.mockReturnValue(JSON.stringify(TEXT_PROMPT));
    await pushCommand.parseAsync(["node", "push", "greeting.json"]);

    expect(client.createPrompt).toHaveBeenCalledOnce();
    const input = client.createPrompt.mock.calls[0][0];
    expect(input.name).toBe("greeting");
    expect(input.type).toBe("text");
    expect(input.prompt).toBe(TEXT_PROMPT.prompt);
  });

  it("--name overrides the name from the file", async () => {
    readFileSync.mockReturnValue(JSON.stringify(TEXT_PROMPT));
    await pushCommand.parseAsync(["node", "push", "greeting.json", "--name", "greeting-v2"]);

    const input = client.createPrompt.mock.calls[0][0];
    expect(input.name).toBe("greeting-v2");
  });

  it("--commit attaches a commit message", async () => {
    readFileSync.mockReturnValue(JSON.stringify(TEXT_PROMPT));
    await pushCommand.parseAsync(["node", "push", "greeting.json", "--commit", "fix typo"]);

    const input = client.createPrompt.mock.calls[0][0];
    expect(input.commitMessage).toBe("fix typo");
  });

  it("--promote adds the production label", async () => {
    readFileSync.mockReturnValue(JSON.stringify(TEXT_PROMPT));
    client.createPrompt.mockResolvedValue({ ...CREATED_PROMPT, labels: ["production"] });
    await pushCommand.parseAsync(["node", "push", "greeting.json", "--promote"]);

    const input = client.createPrompt.mock.calls[0][0];
    expect(input.labels).toEqual(["production"]);
    expect(out.allLog()).toContain("promoted to production");
  });

  it("marks the version as draft when --promote is not set", async () => {
    readFileSync.mockReturnValue(JSON.stringify(TEXT_PROMPT));
    await pushCommand.parseAsync(["node", "push", "greeting.json"]);

    const input = client.createPrompt.mock.calls[0][0];
    expect(input.labels).toBeUndefined();
    expect(out.allLog()).toContain("draft");
  });

  it("throws when the file has no valid type field", async () => {
    readFileSync.mockReturnValue(JSON.stringify({ name: "bad", prompt: "hello" }));
    await expect(
      pushCommand.parseAsync(["node", "push", "bad.json"]),
    ).rejects.toThrow(/type/);
  });
});
