import { describe, expect, it } from "vitest";
import { findDuplicates, splitParagraphs } from "../src/duplicate-scan";

describe("splitParagraphs", () => {
  it("splits on blank lines and trims", () => {
    expect(splitParagraphs("one\n\ntwo\n\n  three  ")).toEqual(["one", "two", "three"]);
  });

  it("collapses multiple blank lines", () => {
    expect(splitParagraphs("a\n\n\n\nb")).toEqual(["a", "b"]);
  });

  it("preserves internal newlines within a paragraph", () => {
    const out = splitParagraphs("line one\nline two\n\nnext");
    expect(out[0]).toBe("line one\nline two");
    expect(out[1]).toBe("next");
  });
});

describe("findDuplicates", () => {
  const SHARED =
    "You are PromptFlow, a careful assistant. Respond in markdown. Cite sources when available.";

  it("returns empty for no duplicates", () => {
    const groups = findDuplicates([
      { name: "a", body: SHARED },
      { name: "b", body: "unique content here." },
    ]);
    expect(groups).toEqual([]);
  });

  it("flags a paragraph that appears in two prompts", () => {
    const groups = findDuplicates([
      { name: "agents/chat", body: `${SHARED}\n\nMore stuff.` },
      { name: "agents/code", body: `${SHARED}\n\nDifferent stuff.` },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].text).toBe(SHARED);
    expect(groups[0].occurrences.map((o) => o.promptName)).toEqual([
      "agents/chat",
      "agents/code",
    ]);
  });

  it("respects the min-length threshold", () => {
    const groups = findDuplicates(
      [
        { name: "a", body: "Hello." },
        { name: "b", body: "Hello." },
      ],
      { minLength: 40 },
    );
    expect(groups).toEqual([]);
  });

  it("counts repeat occurrences inside one prompt", () => {
    const groups = findDuplicates([
      { name: "a", body: `${SHARED}\n\nUnique\n\n${SHARED}` },
      { name: "b", body: SHARED },
    ]);
    expect(groups).toHaveLength(1);
    const a = groups[0].occurrences.find((o) => o.promptName === "a");
    expect(a?.count).toBe(2);
    expect(groups[0].totalOccurrences).toBe(3);
  });

  it("ignores duplicates within a single prompt only", () => {
    const groups = findDuplicates([
      { name: "a", body: `${SHARED}\n\n${SHARED}` },
      { name: "b", body: "unrelated long enough paragraph that meets minimum length." },
    ]);
    expect(groups).toEqual([]);
  });

  it("treats whitespace-normalised paragraphs as identical", () => {
    const groups = findDuplicates([
      { name: "a", body: `  ${SHARED}  ` },
      { name: "b", body: `\n${SHARED}\n` },
    ]);
    expect(groups).toHaveLength(1);
  });

  it("sorts groups by total occurrences descending", () => {
    const LONG_A = "This is duplicate block A and it is sufficiently long enough.";
    const LONG_B = "This is duplicate block B and it is also long enough yes.";
    const groups = findDuplicates([
      { name: "p1", body: `${LONG_A}\n\n${LONG_B}` },
      { name: "p2", body: `${LONG_A}\n\n${LONG_B}` },
      { name: "p3", body: LONG_A },
    ]);
    expect(groups[0].text).toBe(LONG_A);
    expect(groups[1].text).toBe(LONG_B);
  });
});
