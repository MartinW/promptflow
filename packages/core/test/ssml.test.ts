import { describe, expect, it } from "vitest";
import { validateSSML } from "../src/ssml";

describe("validateSSML", () => {
  it("returns valid for plain text", () => {
    expect(validateSSML("Hello there.").valid).toBe(true);
  });

  it("accepts a balanced known tag", () => {
    expect(validateSSML("<speak>Hello</speak>").valid).toBe(true);
  });

  it("accepts nested known tags", () => {
    expect(validateSSML("<speak><emphasis>Hi</emphasis></speak>").valid).toBe(true);
  });

  it("accepts self-closing break tag with /> syntax", () => {
    expect(validateSSML('<speak>Hi<break time="500ms"/>there</speak>').valid).toBe(true);
  });

  it("accepts implicit self-closing break tag", () => {
    expect(validateSSML('<speak>Hi<break time="500ms">there</speak>').valid).toBe(true);
  });

  it("flags unclosed tags", () => {
    const result = validateSSML("<speak>Hello");
    expect(result.valid).toBe(false);
    expect(result.issues[0].message).toMatch(/Unclosed/);
  });

  it("flags mismatched closing tags", () => {
    const result = validateSSML("<speak>Hi</emphasis>");
    expect(result.valid).toBe(false);
    expect(result.issues[0].message).toMatch(/Mismatched/);
  });

  it("flags closing tag with no opener", () => {
    const result = validateSSML("</speak>");
    expect(result.valid).toBe(false);
    expect(result.issues[0].message).toMatch(/no matching opener/);
  });

  it("flags unknown tags", () => {
    const result = validateSSML("<custom>Hi</custom>");
    expect(result.valid).toBe(false);
    expect(result.issues[0].message).toMatch(/Unknown SSML tag/);
  });

  it("attaches character offsets to issues", () => {
    const result = validateSSML("Hi <speak>incomplete");
    expect(result.issues[0].start).toBe(3);
  });
});
