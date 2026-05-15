import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getClientOrExit, getOpenRouterKeyOrExit } from "../../src/client";
import { runCommand } from "../../src/commands/run";
import { TEXT_PROMPT, captureOutput, makeMockClient, resetCmd } from "../helpers";

vi.mock("../../src/client", () => ({
  getClientOrExit: vi.fn(),
  getOpenRouterKeyOrExit: vi.fn(),
}));

function makeSSEStream(lines: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const line of lines) {
        controller.enqueue(encoder.encode(`${line}\n`));
      }
      controller.close();
    },
  });
}

function mockFetch(chunks: string[], ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    statusText: ok ? "OK" : "Internal Server Error",
    text: () => Promise.resolve("OpenRouter error"),
    body: makeSSEStream(chunks),
  });
}

describe("prompts run", () => {
  let client: ReturnType<typeof makeMockClient>;
  let out: ReturnType<typeof captureOutput>;

  beforeEach(() => {
    resetCmd(runCommand);
    client = makeMockClient();
    vi.mocked(getClientOrExit).mockReturnValue({
      client: client as never,
      host: "https://example.test",
    });
    vi.mocked(getOpenRouterKeyOrExit).mockReturnValue("sk-test");
    out = captureOutput();
    vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("streams content from the OpenRouter SSE response", async () => {
    client.getPrompt.mockResolvedValue(TEXT_PROMPT);
    vi.stubGlobal(
      "fetch",
      mockFetch([
        `data: ${JSON.stringify({ choices: [{ delta: { content: "Hello" } }] })}`,
        `data: ${JSON.stringify({ choices: [{ delta: { content: " world" } }] })}`,
        "data: [DONE]",
      ]),
    );

    await runCommand.parseAsync(["node", "run", "greeting"]);
    expect(out.allStdout()).toContain("Hello world");
  });

  it("applies --vars to the prompt template", async () => {
    client.getPrompt.mockResolvedValue(TEXT_PROMPT);
    const fetchMock = mockFetch([
      `data: ${JSON.stringify({ choices: [{ delta: { content: "ok" } }] })}`,
      "data: [DONE]",
    ]);
    vi.stubGlobal("fetch", fetchMock);

    await runCommand.parseAsync(["node", "run", "greeting", "--vars", "name=Alice"]);

    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.messages[0].content).toContain("Alice");
  });

  it("applies config.defaults for variables not supplied via --vars", async () => {
    client.getPrompt.mockResolvedValue(TEXT_PROMPT);
    const fetchMock = mockFetch([
      `data: ${JSON.stringify({ choices: [{ delta: { content: "ok" } }] })}`,
      "data: [DONE]",
    ]);
    vi.stubGlobal("fetch", fetchMock);

    await runCommand.parseAsync(["node", "run", "greeting", "--vars", "name=Alice"]);

    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    // config.defaults has service=PromptFlow; it should be applied
    expect(body.messages[0].content).toContain("PromptFlow");
  });

  it("exits when OpenRouter returns a non-ok response", async () => {
    client.getPrompt.mockResolvedValue(TEXT_PROMPT);
    vi.stubGlobal("fetch", mockFetch([], false));

    await expect(runCommand.parseAsync(["node", "run", "greeting"])).rejects.toThrow(
      "process.exit",
    );
  });
});
