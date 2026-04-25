import { describe, expect, it } from "vitest";
import { extractVariables, renderPrompt, validatePromptTemplate } from "../src/template";

describe("validatePromptTemplate", () => {
  it("returns valid for a template with no variables", () => {
    const result = validatePromptTemplate("Hello, world.");
    expect(result.valid).toBe(true);
    expect(result.variables).toEqual([]);
    expect(result.issues).toEqual([]);
  });

  it("extracts simple variables", () => {
    const result = validatePromptTemplate("Hello, {{name}}!");
    expect(result.valid).toBe(true);
    expect(result.variables).toEqual(["name"]);
  });

  it("extracts variables in first-seen order, deduplicated", () => {
    const result = validatePromptTemplate("Hi {{name}}. {{name}} again. Bye {{user}}.");
    expect(result.variables).toEqual(["name", "user"]);
  });

  it("tolerates whitespace inside braces", () => {
    const result = validatePromptTemplate("{{ name }} and {{  city  }}");
    expect(result.valid).toBe(true);
    expect(result.variables).toEqual(["name", "city"]);
  });

  it("flags unclosed `{{`", () => {
    const result = validatePromptTemplate("Hello, {{name");
    expect(result.valid).toBe(false);
    expect(result.issues[0].kind).toBe("unclosed_variable");
  });

  it("flags empty variable name", () => {
    const result = validatePromptTemplate("Hello, {{}}!");
    expect(result.valid).toBe(false);
    expect(result.issues[0].kind).toBe("invalid_variable_name");
  });

  it("flags invalid variable names (digit prefix)", () => {
    const result = validatePromptTemplate("Hello, {{1name}}!");
    expect(result.valid).toBe(false);
    expect(result.issues[0].kind).toBe("invalid_variable_name");
  });

  it("flags invalid variable names (special characters)", () => {
    const result = validatePromptTemplate("Hello, {{first-name}}!");
    expect(result.valid).toBe(false);
    expect(result.issues[0].kind).toBe("invalid_variable_name");
  });

  it("ignores stray single braces in prose", () => {
    const result = validatePromptTemplate("This { is } fine.");
    expect(result.valid).toBe(true);
  });
});

describe("renderPrompt", () => {
  it("substitutes variables", () => {
    expect(renderPrompt("Hello, {{name}}!", { name: "Alice" })).toBe("Hello, Alice!");
  });

  it("substitutes the same variable in multiple places", () => {
    expect(renderPrompt("{{name}} and {{name}} again", { name: "Bob" })).toBe("Bob and Bob again");
  });

  it("tolerates whitespace inside braces", () => {
    expect(renderPrompt("{{ name }}", { name: "Carol" })).toBe("Carol");
  });

  it("leaves missing variables literal in lenient mode", () => {
    expect(renderPrompt("Hello {{name}}", {})).toBe("Hello {{name}}");
  });

  it("throws on missing variables in strict mode", () => {
    expect(() => renderPrompt("Hello {{name}}", {}, { strict: true })).toThrow(
      /missing variable "name"/,
    );
  });

  it("substitutes empty strings", () => {
    expect(renderPrompt("a{{x}}b", { x: "" })).toBe("ab");
  });
});

describe("extractVariables", () => {
  it("returns deduplicated, ordered variable names", () => {
    expect(extractVariables("{{a}} {{b}} {{a}} {{c}}")).toEqual(["a", "b", "c"]);
  });
});
