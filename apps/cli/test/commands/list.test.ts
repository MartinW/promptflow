import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getClientOrExit } from "../../src/client";
import { listCommand } from "../../src/commands/list";
import { PROMPT_LIST, captureOutput, makeMockClient, resetCmd } from "../helpers";

vi.mock("../../src/client", () => ({
  getClientOrExit: vi.fn(),
  getOpenRouterKeyOrExit: vi.fn(),
}));

describe("prompts list", () => {
  let client: ReturnType<typeof makeMockClient>;
  let out: ReturnType<typeof captureOutput>;

  beforeEach(() => {
    resetCmd(listCommand);
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

  it("renders a table with prompt names, version counts, and tags", async () => {
    client.listPrompts.mockResolvedValue(PROMPT_LIST);
    await listCommand.parseAsync(["node", "list"]);

    const text = out.allLog();
    expect(text).toContain("greeting");
    expect(text).toContain("farewell");
    expect(text).toContain("2 prompts");
  });

  it("passes limit option to the client", async () => {
    client.listPrompts.mockResolvedValue([]);
    await listCommand.parseAsync(["node", "list", "-l", "10"]);
    expect(client.listPrompts).toHaveBeenCalledWith({ limit: 10 });
  });

  it("shows 'No prompts.' when the list is empty", async () => {
    client.listPrompts.mockResolvedValue([]);
    await listCommand.parseAsync(["node", "list"]);
    expect(out.allLog()).toContain("No prompts.");
  });

  it("filters results by tag", async () => {
    client.listPrompts.mockResolvedValue(PROMPT_LIST);
    await listCommand.parseAsync(["node", "list", "-t", "lang:en-GB"]);

    const text = out.allLog();
    expect(text).toContain("farewell");
    expect(text).not.toContain("greeting");
    expect(text).toContain("1 prompt");
  });

  it("outputs a JSON array with --json", async () => {
    client.listPrompts.mockResolvedValue(PROMPT_LIST);
    await listCommand.parseAsync(["node", "list", "--json"]);

    const parsed = JSON.parse(out.allStdout());
    expect(parsed).toHaveLength(2);
    expect(parsed[0].name).toBe("greeting");
    expect(parsed[1].name).toBe("farewell");
  });

  it("respects tag filter in JSON output", async () => {
    client.listPrompts.mockResolvedValue(PROMPT_LIST);
    await listCommand.parseAsync(["node", "list", "--json", "-t", "lang:en-GB"]);

    const parsed = JSON.parse(out.allStdout());
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe("farewell");
  });
});
