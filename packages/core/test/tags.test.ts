import { describe, expect, it } from "vitest";
import {
  formatTag,
  inNamespace,
  matchesFilter,
  Namespaces,
  parseTag,
  tagsInNamespace,
} from "../src/tags";

describe("parseTag", () => {
  it("returns null namespace for tags without a colon", () => {
    expect(parseTag("greeting")).toEqual({
      namespace: null,
      segments: ["greeting"],
      raw: "greeting",
    });
  });

  it("returns null namespace for unrecognised prefixes", () => {
    expect(parseTag("foo:bar")).toEqual({
      namespace: null,
      segments: ["foo:bar"],
      raw: "foo:bar",
    });
  });

  it("parses voice namespace with single segment", () => {
    expect(parseTag("voice:greeting")).toEqual({
      namespace: "voice",
      segments: ["greeting"],
      raw: "voice:greeting",
    });
  });

  it("parses app namespace with multiple segments", () => {
    expect(parseTag("app:cadence:greeting")).toEqual({
      namespace: "app",
      segments: ["cadence", "greeting"],
      raw: "app:cadence:greeting",
    });
  });

  it("preserves the raw input even after trimming whitespace internally", () => {
    expect(parseTag("  voice:greeting  ").namespace).toBe("voice");
    expect(parseTag("  voice:greeting  ").raw).toBe("  voice:greeting  ");
  });

  it("handles every defined namespace", () => {
    for (const ns of Object.values(Namespaces)) {
      expect(parseTag(`${ns}:x`).namespace).toBe(ns);
    }
  });
});

describe("formatTag", () => {
  it("formats single-segment tags", () => {
    expect(formatTag("voice", "greeting")).toBe("voice:greeting");
  });

  it("formats multi-segment tags", () => {
    expect(formatTag("app", "cadence", "greeting")).toBe("app:cadence:greeting");
  });

  it("throws on empty segment list", () => {
    expect(() => formatTag("voice")).toThrow(/at least one segment/);
  });

  it("throws on empty segment", () => {
    expect(() => formatTag("voice", "greeting", "")).toThrow(/empty segment/);
  });

  it("throws on segment containing a colon", () => {
    expect(() => formatTag("app", "name:with:colons")).toThrow(/cannot contain ":"/);
  });
});

describe("inNamespace", () => {
  it("matches tags in the right namespace", () => {
    expect(inNamespace("voice:greeting", "voice")).toBe(true);
  });

  it("rejects tags from a different namespace", () => {
    expect(inNamespace("app:cadence:greeting", "voice")).toBe(false);
  });

  it("rejects unprefixed tags", () => {
    expect(inNamespace("greeting", "voice")).toBe(false);
  });
});

describe("tagsInNamespace", () => {
  it("filters down to one namespace", () => {
    const tags = ["voice:greeting", "app:cadence:greeting", "env:prod", "voice:reminder"];
    expect(tagsInNamespace(tags, "voice")).toEqual(["voice:greeting", "voice:reminder"]);
  });
});

describe("matchesFilter", () => {
  it("returns true when all filter tags are present (AND semantics)", () => {
    expect(matchesFilter(["voice", "env:prod", "lang:en-GB"], "voice,env:prod")).toBe(true);
  });

  it("returns false when any filter tag is missing", () => {
    expect(matchesFilter(["voice"], "voice,env:prod")).toBe(false);
  });

  it("returns true for an empty filter", () => {
    expect(matchesFilter(["voice"], "")).toBe(true);
  });

  it("trims whitespace inside filter expression", () => {
    expect(matchesFilter(["voice", "env:prod"], " voice ,  env:prod ")).toBe(true);
  });
});
