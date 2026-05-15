import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getClientOrExit } from "../../src/client";
import { diffCommand } from "../../src/commands/diff";
import { CHAT_PROMPT, captureOutput, makeMockClient } from "../helpers";

vi.mock("../../src/client", () => ({
  getClientOrExit: vi.fn(),
  getOpenRouterKeyOrExit: vi.fn(),
}));

const V1 = {
  name: "greeting",
  version: 1,
  type: "text" as const,
  prompt: "Hello, world!\nThis is line two.\n",
  labels: [],
  tags: [],
  commitMessage: null,
  config: {},
};

const V2 = {
  ...V1,
  version: 2,
  prompt: "Hello, world!\nThis is updated line two.\n",
};

describe("prompts diff", () => {
  let client: ReturnType<typeof makeMockClient>;
  let out: ReturnType<typeof captureOutput>;

  beforeEach(() => {
    client = makeMockClient();
    vi.mocked(getClientOrExit).mockReturnValue({
      client: client as never,
      host: "https://example.test",
    });
    out = captureOutput();
    vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches both versions from the client", async () => {
    client.getPrompt.mockResolvedValueOnce(V1).mockResolvedValueOnce(V2);
    await diffCommand.parseAsync(["node", "diff", "greeting", "1", "2"]);

    expect(client.getPrompt).toHaveBeenCalledTimes(2);
    expect(client.getPrompt).toHaveBeenNthCalledWith(1, "greeting", { version: 1 });
    expect(client.getPrompt).toHaveBeenNthCalledWith(2, "greeting", { version: 2 });
  });

  it("shows version header lines", async () => {
    client.getPrompt.mockResolvedValueOnce(V1).mockResolvedValueOnce(V2);
    await diffCommand.parseAsync(["node", "diff", "greeting", "1", "2"]);

    const text = out.allLog();
    expect(text).toContain("greeting v1");
    expect(text).toContain("greeting v2");
  });

  it("shows removed and added lines in the diff", async () => {
    client.getPrompt.mockResolvedValueOnce(V1).mockResolvedValueOnce(V2);
    await diffCommand.parseAsync(["node", "diff", "greeting", "1", "2"]);

    const text = out.allLog();
    expect(text).toContain("- This is line two.");
    expect(text).toContain("+ This is updated line two.");
  });

  it("exits with an error for chat prompts", async () => {
    client.getPrompt.mockResolvedValueOnce(CHAT_PROMPT).mockResolvedValueOnce(CHAT_PROMPT);
    await expect(
      diffCommand.parseAsync(["node", "diff", "support-chat", "1", "2"]),
    ).rejects.toThrow("process.exit");
  });
});
