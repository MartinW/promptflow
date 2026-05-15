import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getClientOrExit } from "../../src/client";
import { pullCommand } from "../../src/commands/pull";
import { TEXT_PROMPT, captureOutput, makeMockClient, resetCmd } from "../helpers";

vi.mock("../../src/client", () => ({
  getClientOrExit: vi.fn(),
  getOpenRouterKeyOrExit: vi.fn(),
}));

vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
  return { ...actual, writeFileSync: vi.fn() };
});

describe("prompts pull", () => {
  let client: ReturnType<typeof makeMockClient>;
  let out: ReturnType<typeof captureOutput>;
  let writeFileSync: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    resetCmd(pullCommand);
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
    writeFileSync = vi.mocked(fs.writeFileSync);
    writeFileSync.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes prompt JSON to <name>.json by default", async () => {
    client.getPrompt.mockResolvedValue(TEXT_PROMPT);
    await pullCommand.parseAsync(["node", "pull", "greeting"]);

    expect(writeFileSync).toHaveBeenCalledOnce();
    const [path, content] = writeFileSync.mock.calls[0] as [string, string];
    expect(path).toBe("greeting.json");
    const parsed = JSON.parse(content);
    expect(parsed.name).toBe("greeting");
    expect(parsed.version).toBe(3);
  });

  it("writes to a custom path with -o", async () => {
    client.getPrompt.mockResolvedValue(TEXT_PROMPT);
    await pullCommand.parseAsync(["node", "pull", "greeting", "-o", "out/my-prompt.json"]);

    const [path] = writeFileSync.mock.calls[0] as [string, string];
    expect(path).toBe("out/my-prompt.json");
  });

  it("sanitises slashes in the default filename", async () => {
    client.getPrompt.mockResolvedValue({ ...TEXT_PROMPT, name: "folder/sub-prompt" });
    await pullCommand.parseAsync(["node", "pull", "folder/sub-prompt"]);

    const [path] = writeFileSync.mock.calls[0] as [string, string];
    expect(path).toBe("folder_sub-prompt.json");
  });

  it("prints a success message with the resolved version", async () => {
    client.getPrompt.mockResolvedValue(TEXT_PROMPT);
    await pullCommand.parseAsync(["node", "pull", "greeting"]);

    expect(out.allLog()).toContain("greeting v3");
  });
});
