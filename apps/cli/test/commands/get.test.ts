import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getClientOrExit } from "../../src/client";
import { getCommand } from "../../src/commands/get";
import { CHAT_PROMPT, TEXT_PROMPT, captureOutput, makeMockClient, resetCmd } from "../helpers";

vi.mock("../../src/client", () => ({
  getClientOrExit: vi.fn(),
  getOpenRouterKeyOrExit: vi.fn(),
}));

describe("prompts get", () => {
  let client: ReturnType<typeof makeMockClient>;
  let out: ReturnType<typeof captureOutput>;

  beforeEach(() => {
    resetCmd(getCommand);
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

  it("displays a text prompt with header and body", async () => {
    client.getPrompt.mockResolvedValue(TEXT_PROMPT);
    await getCommand.parseAsync(["node", "get", "greeting"]);

    const text = out.allLog();
    expect(text).toContain("greeting");
    expect(text).toContain("v3");
    expect(text).toContain("text");
    expect(text).toContain("Hello, {{name}}!");
    expect(text).toContain("Update greeting copy");
  });

  it("displays a chat prompt with [ROLE] headers and message bodies", async () => {
    client.getPrompt.mockResolvedValue(CHAT_PROMPT);
    await getCommand.parseAsync(["node", "get", "support-chat"]);

    const text = out.allLog();
    expect(text).toContain("[SYSTEM]");
    expect(text).toContain("You are a helpful assistant.");
    expect(text).toContain("[USER]");
    expect(text).toContain("{{query}}");
  });

  it("outputs full JSON with --json", async () => {
    client.getPrompt.mockResolvedValue(TEXT_PROMPT);
    await getCommand.parseAsync(["node", "get", "greeting", "--json"]);

    const parsed = JSON.parse(out.allStdout());
    expect(parsed.name).toBe("greeting");
    expect(parsed.version).toBe(3);
    expect(parsed.type).toBe("text");
  });

  it("passes -v version flag to the client", async () => {
    client.getPrompt.mockResolvedValue(TEXT_PROMPT);
    await getCommand.parseAsync(["node", "get", "greeting", "-v", "2"]);
    expect(client.getPrompt).toHaveBeenCalledWith("greeting", { version: 2, label: undefined });
  });

  it("passes -l label flag to the client", async () => {
    client.getPrompt.mockResolvedValue(TEXT_PROMPT);
    await getCommand.parseAsync(["node", "get", "greeting", "-l", "production"]);
    expect(client.getPrompt).toHaveBeenCalledWith("greeting", {
      version: undefined,
      label: "production",
    });
  });
});
